import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import { buildSabaccDeck, drawSabaccCard, drawSabaccCards, shuffleSabaccDeck, SABACC_MAX_HAND_SIZE, SABACC_MIN_HAND_SIZE, SABACC_STARTING_HAND_SIZE, SABACC_TARGET } from './sabacc-deck.js';
import { compareSabaccHands, evaluateSabaccHand } from './sabacc-rules.js';
import { SabaccAi, buildSabaccAiProfile } from './sabacc-ai.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'sab') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

function now() { return Date.now(); }
function currentUserId() { return game?.user?.id ?? null; }
function actorDisplay(actor) { return actor?.name || game?.user?.name || 'Player'; }
function actorImg(actor) { return actor?.img || 'icons/svg/mystery-man.svg'; }
function participantIdForActor(actor) { return game?.user?.isGM ? `gm:${game.user.id}` : `player:${game?.user?.id ?? 'unknown'}`; }
function isAutomatedSeat(seat = {}) { return seat?.type === 'ai' || seat?.type === 'npc' || Boolean(seat?.aiProfile); }
function playableSeats(seats = []) { return (Array.isArray(seats) ? seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status)); }
function seatLabel(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }
function getOrder(session = {}) { return playableSeats(session.seats).map(seat => seat.seatId).filter(Boolean); }
function findSeat(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId === seatId) ?? null; }
function ensureCardArray(cards) { return Array.isArray(cards) ? cards.filter(Boolean) : []; }
function safeAmount(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= 0 ? n : fallback; }
function activeSabaccSeatIds(session, state) {
  return getOrder(session).filter(seatId => {
    const player = state.players?.[seatId];
    return player && !player.folded && !player.bombedOut;
  });
}
function canResolveSabaccHand(session, state) {
  return activeSabaccSeatIds(session, state).length <= 1 || allCalledOrOut(session, state);
}
function drawSabaccCardForState(state) {
  state.deck = ensureCardArray(state.deck);
  state.discard = ensureCardArray(state.discard);
  if (!state.deck.length && state.discard.length) {
    state.deck = shuffleSabaccDeck(state.discard);
    state.discard = [];
  }
  if (!state.deck.length) state.deck = buildSabaccDeck();
  const drawn = drawSabaccCard(state.deck);
  state.deck = ensureCardArray(drawn.deck);
  if (!drawn.card) throw new Error('Sabacc deck could not provide a card.');
  return drawn.card;
}
function canDiscardSabaccCard(player = {}) { return ensureCardArray(player.hand).length > SABACC_MIN_HAND_SIZE; }
function canDrawSabaccCard(player = {}) { return ensureCardArray(player.hand).length < SABACC_MAX_HAND_SIZE; }

function sessionLogEntry(type, by, data = {}) {
  return { id: randomId('log'), at: now(), type, by: by ?? null, data };
}

function buildPlayerState(seat = {}) {
  return {
    seatId: seat.seatId,
    hand: [],
    called: false,
    folded: false,
    bombedOut: false,
    contribution: 0,
    roundContribution: 0,
    tableCredits: null,
    wins: 0,
    lastAction: isAutomatedSeat(seat) ? 'Dealer droid waits for the shift.' : 'Waiting at the Sabacc table.',
    evaluation: null,
    lastAiDecision: null
  };
}

function buildState(session = {}) {
  const seats = playableSeats(session.seats);
  const players = {};
  for (const seat of seats) players[seat.seatId] = buildPlayerState(seat);
  return {
    engine: 'sabacc',
    version: 2,
    phase: 'ready',
    statusLabel: 'READY',
    target: SABACC_TARGET,
    handSize: SABACC_STARTING_HAND_SIZE,
    round: 0,
    dealerSeatId: seats[1]?.seatId || seats[0]?.seatId || null,
    activeSeatId: null,
    deck: [],
    discard: [],
    handPot: 0,
    sabaccPot: 0,
    ante: Number(session.metadata?.sabaccAnte || 10) || 10,
    sabaccAnte: Number(session.metadata?.sabaccPotAnte || 5) || 5,
    betting: null,
    players,
    handHistory: [],
    eventLog: [],
    winnerSeatId: null,
    message: 'Start a Sabacc hand when the table is ready.'
  };
}

function ensureState(session = {}) {
  const state = session.gameState?.engine === 'sabacc' ? clone(session.gameState) : buildState(session);
  state.players ??= {};
  state.handHistory = Array.isArray(state.handHistory) ? state.handHistory : [];
  state.eventLog = Array.isArray(state.eventLog) ? state.eventLog : [];
  state.betting ??= null;
  for (const seat of playableSeats(session.seats)) {
    state.players[seat.seatId] ??= buildPlayerState(seat);
    state.players[seat.seatId].seatId = seat.seatId;
    state.players[seat.seatId].roundContribution = safeAmount(state.players[seat.seatId].roundContribution, 0);
    if (state.players[seat.seatId].tableCredits !== null) state.players[seat.seatId].tableCredits = safeAmount(state.players[seat.seatId].tableCredits, 0);
  }
  ensureTableCredits(session, state);
  return state;
}

function isCreditWager(session = {}) {
  return GameCreditEscrowService.isCreditWager(session);
}

function tableBuyIn(session = {}) {
  const escrow = session.escrow?.credits || {};
  return safeAmount(escrow.buyIn ?? session.wagerProfile?.buyIn ?? session.wagerProfile?.creditBuyIn ?? session.metadata?.creditBuyIn ?? 0, 0);
}

function practiceBankroll(session = {}) {
  return safeAmount(session.metadata?.practiceBankroll ?? 1000, 1000);
}

function initialCreditsForSeat(session = {}, seat = {}) {
  if (isCreditWager(session)) {
    const buyIn = tableBuyIn(session);
    if (isAutomatedSeat(seat)) return safeAmount(session.wagerProfile?.houseStake ?? buyIn, buyIn);
    return buyIn;
  }
  return practiceBankroll(session);
}

function ensureTableCredits(session, state) {
  for (const seat of playableSeats(session.seats)) {
    const player = state.players?.[seat.seatId];
    if (!player) continue;
    if (player.tableCredits === null || player.tableCredits === undefined || Number.isNaN(Number(player.tableCredits))) {
      player.tableCredits = initialCreditsForSeat(session, seat);
    } else {
      player.tableCredits = safeAmount(player.tableCredits, initialCreditsForSeat(session, seat));
    }
  }
  return state;
}

function pushEvent(session, state, type, seatId, message, data = {}) {
  state.eventLog ??= [];
  state.eventLog.unshift({ id: randomId('sab_evt'), at: now(), type, seatId: seatId || null, seatLabel: seatId ? seatLabel(session, seatId) : null, message: String(message || ''), tone: data.tone || 'neutral', ...data });
  state.eventLog = state.eventLog.slice(0, 40);
}

function publicCardActionMessage(seat = {}, verb = 'acts') {
  return `${seat.displayName || 'Seat'} ${verb} a card.`;
}

function attachAiDecision(player = {}, payload = {}) {
  if (payload?.ai) player.lastAiDecision = payload.ai;
}

function updateEvaluations(state) {
  for (const player of Object.values(state.players ?? {})) {
    player.hand = ensureCardArray(player.hand);
    player.evaluation = evaluateSabaccHand(player.hand || []);
    player.bombedOut = Boolean(player.evaluation.bombedOut);
  }
  return state;
}

function nextSeatId(session, state, afterSeatId, predicate = null) {
  const order = getOrder(session);
  if (!order.length) return null;
  const index = Math.max(0, order.indexOf(afterSeatId));
  for (let i = 1; i <= order.length; i += 1) {
    const candidate = order[(index + i) % order.length];
    const player = state.players?.[candidate];
    if (!player) continue;
    if (predicate ? predicate(candidate, player) : (!player.called && !player.folded && !player.bombedOut)) return candidate;
  }
  return null;
}

function allCalledOrOut(session, state) {
  return getOrder(session).every(seatId => {
    const player = state.players?.[seatId];
    return !player || player.called || player.folded || player.bombedOut;
  });
}

function moveCreditsToPot(session, state, seatId, amount, potKey = 'handPot') {
  const player = state.players?.[seatId];
  const value = safeAmount(amount, 0);
  if (!player || value <= 0) return { ok: true, amount: 0 };
  ensureTableCredits(session, state);
  if (player.tableCredits < value) return { ok: false, error: `${seatLabel(session, seatId)} does not have enough table credits.` };
  player.tableCredits -= value;
  player.contribution = safeAmount(player.contribution, 0) + value;
  if (potKey === 'handPot') player.roundContribution = safeAmount(player.roundContribution, 0) + value;
  state[potKey] = safeAmount(state[potKey], 0) + value;
  return { ok: true, amount: value };
}

function awardTableCredits(state, seatId, amount) {
  const player = state.players?.[seatId];
  const value = safeAmount(amount, 0);
  if (!player || value <= 0) return;
  player.tableCredits = safeAmount(player.tableCredits, 0) + value;
}

function firstActionSeatId(session, state) {
  const order = getOrder(session);
  return order.find(id => id !== state.dealerSeatId && !state.players?.[id]?.folded && !state.players?.[id]?.bombedOut) || order.find(id => !state.players?.[id]?.folded && !state.players?.[id]?.bombedOut) || null;
}

function openBettingRound(session, state, reason = 'Opening betting round.') {
  const minBet = Math.max(1, safeAmount(state.ante, 10));
  state.phase = 'betting';
  state.statusLabel = 'BETTING';
  state.betting = {
    round: safeAmount(state.betting?.round, 0) + 1,
    currentBet: 0,
    minBet,
    minRaise: minBet,
    actedSeatIds: [],
    contributions: {},
    lastAggressorSeatId: null,
    openedAt: now()
  };
  for (const seatId of getOrder(session)) {
    if (state.players?.[seatId]) {
      state.players[seatId].roundContribution = 0;
      state.betting.contributions[seatId] = 0;
    }
  }
  state.activeSeatId = firstActionSeatId(session, state);
  state.message = `${reason} ${seatLabel(session, state.activeSeatId)} may check, bet, or fold.`;
  pushEvent(session, state, 'betting-opened', state.activeSeatId, state.message, { tone: 'credits' });
  return state;
}

function activeBettingSeatIds(session, state) {
  return getOrder(session).filter(seatId => {
    const player = state.players?.[seatId];
    return player && !player.folded && !player.bombedOut;
  });
}

function bettingContribution(state, seatId) {
  return safeAmount(state.betting?.contributions?.[seatId] ?? state.players?.[seatId]?.roundContribution ?? 0, 0);
}

function hasBettingClosed(session, state) {
  const active = activeBettingSeatIds(session, state);
  if (active.length <= 1) return true;
  const acted = new Set(state.betting?.actedSeatIds || []);
  const currentBet = safeAmount(state.betting?.currentBet, 0);
  return active.every(seatId => acted.has(seatId) && bettingContribution(state, seatId) >= currentBet);
}

function closeBettingRound(session, state) {
  state.phase = 'drawing';
  state.statusLabel = 'DRAWING';
  state.betting = { ...(state.betting || {}), closedAt: now(), closed: true };
  state.activeSeatId = firstActionSeatId(session, state);
  state.message = `${seatLabel(session, state.activeSeatId)} is deciding whether to draw, shift, discard, call, or fold.`;
  pushEvent(session, state, 'betting-closed', state.activeSeatId, 'Betting round closed. Cards are live.', { tone: 'credits' });
  return state;
}

function advanceBetting(session, state, fromSeatId) {
  updateEvaluations(state);
  if (activeBettingSeatIds(session, state).length <= 1) return resolveHand(session, state);
  if (hasBettingClosed(session, state)) return closeBettingRound(session, state);
  const next = nextSeatId(session, state, fromSeatId, (seatId, player) => {
    if (player.folded || player.bombedOut) return false;
    return bettingContribution(state, seatId) < safeAmount(state.betting?.currentBet, 0) || !(state.betting?.actedSeatIds || []).includes(seatId);
  });
  if (!next) return closeBettingRound(session, state);
  state.activeSeatId = next;
  state.message = `${seatLabel(session, next)} is facing the betting round.`;
  return state;
}

function beginHand(session, state) {
  ensureTableCredits(session, state);
  state.phase = 'dealing';
  state.statusLabel = 'DEALING';
  state.round = safeAmount(state.round, 0) + 1;
  state.deck = buildSabaccDeck();
  state.discard = [];
  state.winnerSeatId = null;
  state.handPot = safeAmount(state.handPot, 0);
  state.sabaccPot = safeAmount(state.sabaccPot, 0);
  state.betting = null;
  const ante = safeAmount(state.ante, 0);
  const sabaccAnte = safeAmount(state.sabaccAnte, 0);
  for (const seat of playableSeats(session.seats)) {
    const player = state.players[seat.seatId] ?? buildPlayerState(seat);
    const drawn = drawSabaccCards(state.deck, SABACC_STARTING_HAND_SIZE);
    state.deck = drawn.deck;
    player.hand = drawn.cards;
    player.called = false;
    player.folded = false;
    player.bombedOut = false;
    player.roundContribution = 0;
    player.lastAiDecision = null;
    state.players[seat.seatId] = player;
    const handAnte = moveCreditsToPot(session, state, seat.seatId, ante, 'handPot');
    const sabaccStake = moveCreditsToPot(session, state, seat.seatId, sabaccAnte, 'sabaccPot');
    if (!handAnte.ok || !sabaccStake.ok) {
      player.folded = true;
      player.lastAction = 'Could not cover the Sabacc ante and folded.';
      pushEvent(session, state, 'ante-failed', seat.seatId, player.lastAction, { tone: 'danger' });
    } else {
      player.lastAction = `Anted ${ante} to the hand pot and ${sabaccAnte} to the Sabacc pot.`;
    }
  }
  updateEvaluations(state);
  if (activeSabaccSeatIds(session, state).length <= 1) return resolveHand(session, state);
  openBettingRound(session, state, `Round ${state.round}: cards dealt.`);
  return state;
}

function resolveHand(session, state) {
  updateEvaluations(state);
  const entries = getOrder(session)
    .map(seatId => ({ seatId, cards: state.players[seatId]?.hand || [], evaluation: state.players[seatId]?.evaluation }))
    .filter(entry => !state.players[entry.seatId]?.folded);
  const result = compareSabaccHands(entries);
  state.phase = 'hand-complete';
  state.statusLabel = 'HAND COMPLETE';
  state.activeSeatId = null;
  state.winnerSeatId = result.winnerSeatId;

  const handPot = safeAmount(state.handPot, 0);
  const sabaccPot = safeAmount(state.sabaccPot, 0);
  let potWon = 0;
  let sabaccPotWon = 0;
  let splitSeatIds = [];

  if (result.winnerSeatId && state.players[result.winnerSeatId]) {
    potWon = handPot;
    if (result.claimsSabaccPot) sabaccPotWon = sabaccPot;
    awardTableCredits(state, result.winnerSeatId, potWon + sabaccPotWon);
    state.players[result.winnerSeatId].wins = safeAmount(state.players[result.winnerSeatId].wins, 0) + 1;
    state.players[result.winnerSeatId].lastAction = result.claimsSabaccPot
      ? `Claims the hand pot and Sabacc pot with ${result.reason}.`
      : `Claims the hand pot with ${result.reason}.`;
    state.handPot = 0;
    if (result.claimsSabaccPot) state.sabaccPot = 0;
  } else if (result.tied && Array.isArray(result.tiedSeatIds) && result.tiedSeatIds.length) {
    splitSeatIds = result.tiedSeatIds;
    const splitHand = Math.floor(handPot / splitSeatIds.length);
    const handRemainder = handPot - (splitHand * splitSeatIds.length);
    const splitSabacc = result.claimsSabaccPot ? Math.floor(sabaccPot / splitSeatIds.length) : 0;
    const sabaccRemainder = result.claimsSabaccPot ? sabaccPot - (splitSabacc * splitSeatIds.length) : sabaccPot;
    for (const seatId of splitSeatIds) {
      awardTableCredits(state, seatId, splitHand + splitSabacc);
      if (state.players[seatId]) state.players[seatId].lastAction = `Splits the pot with ${result.reason}.`;
    }
    potWon = splitHand * splitSeatIds.length;
    sabaccPotWon = splitSabacc * splitSeatIds.length;
    state.handPot = handRemainder;
    state.sabaccPot = sabaccRemainder;
  }

  state.handHistory.unshift({
    id: randomId('sab_hand'),
    round: state.round,
    winnerSeatId: result.winnerSeatId,
    winnerLabel: result.winnerSeatId ? seatLabel(session, result.winnerSeatId) : null,
    tiedSeatIds: splitSeatIds,
    reason: result.reason,
    specialWinner: result.specialWinner,
    claimsSabaccPot: result.claimsSabaccPot,
    handPot,
    sabaccPot,
    potWon,
    sabaccPotWon,
    at: now()
  });
  state.handHistory = state.handHistory.slice(0, 12);

  if (result.winnerSeatId) {
    state.message = result.claimsSabaccPot
      ? `${seatLabel(session, result.winnerSeatId)} wins the hand and Sabacc pot with ${result.reason}.`
      : `${seatLabel(session, result.winnerSeatId)} wins the hand with ${result.reason}.`;
  } else if (splitSeatIds.length) {
    state.message = `${result.reason}. The hand pot${result.claimsSabaccPot ? ' and Sabacc pot' : ''} split between tied players.`;
  } else {
    state.message = `${result.reason || 'No one wins the hand.'} The hand pot carries forward.`;
  }
  pushEvent(session, state, result.claimsSabaccPot ? 'sabacc-pot-won' : (splitSeatIds.length ? 'hand-tied' : 'hand-won'), result.winnerSeatId, state.message, { tone: result.winnerSeatId || splitSeatIds.length ? 'success' : 'neutral', potWon, sabaccPotWon, splitSeatIds });
  return state;
}

function advanceTurn(session, state, fromSeatId) {
  updateEvaluations(state);
  if (canResolveSabaccHand(session, state)) return resolveHand(session, state);
  const next = nextSeatId(session, state, fromSeatId);
  if (!next) return resolveHand(session, state);
  state.activeSeatId = next;
  state.message = `${seatLabel(session, next)} is deciding whether to draw, shift, discard, call, or fold.`;
  return state;
}

async function persist(session, state, status = 'active', logEntry = null) {
  return GameSessionStore.upsertSession({ ...session, status, gameState: state, log: [...(session.log ?? []), logEntry].filter(Boolean) });
}

function chooseAiBettingAction(session, state, seat) {
  const player = state.players?.[seat.seatId];
  const evaluation = player?.evaluation || evaluateSabaccHand(player?.hand || []);
  const profile = buildSabaccAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium');
  const currentBet = safeAmount(state.betting?.currentBet, 0);
  const paid = bettingContribution(state, seat.seatId);
  const toCall = Math.max(0, currentBet - paid);
  const minRaise = safeAmount(state.betting?.minRaise, safeAmount(state.ante, 5));
  const tableCredits = safeAmount(player?.tableCredits, 0);
  const strong = evaluation.specialWinner || Number(evaluation.distance || 99) <= 1 || Number(evaluation.rank || 0) >= 700000000;
  const weak = !evaluation.canWin || Number(evaluation.distance || 99) >= 7;
  const reckless = ['reckless', 'aggressive', 'showboat', 'desperate'].includes(profile.personality);
  if (currentBet <= 0) {
    if ((strong || reckless) && tableCredits >= minRaise) return { type: 'bet', amount: minRaise, ai: { action: 'bet', reason: 'Opens the betting round from a playable hand.', samples: 0 } };
    return { type: 'check', ai: { action: 'check', reason: 'Checks behind with no live bet.', samples: 0 } };
  }
  if (toCall <= 0) return { type: 'check', ai: { action: 'check', reason: 'No additional stake required.', samples: 0 } };
  if (weak && !reckless && toCall > Math.max(minRaise, tableCredits / 3)) return { type: 'fold', ai: { action: 'fold', reason: 'Folds a weak hand against pressure.', samples: 0 } };
  if (strong && tableCredits >= toCall + minRaise && ['hard', 'pro', 'grandmaster'].includes(profile.difficulty)) return { type: 'raise', amount: minRaise, ai: { action: 'raise', reason: 'Raises with a strong Sabacc holding.', samples: 0 } };
  if (tableCredits >= toCall) return { type: 'call-bet', ai: { action: 'call', reason: 'Calls the live bet.', samples: 0 } };
  return { type: 'fold', ai: { action: 'fold', reason: 'Cannot cover the live bet.', samples: 0 } };
}

async function processAi(session, state) {
  let guard = 0;
  while (['betting', 'drawing'].includes(state.phase) && state.activeSeatId && guard < 40) {
    guard += 1;
    const seat = findSeat(session, state.activeSeatId);
    if (!isAutomatedSeat(seat)) break;
    const player = state.players[seat.seatId];
    const choice = state.phase === 'betting'
      ? chooseAiBettingAction(session, state, seat)
      : SabaccAi.chooseAction({ player, state, aiProfile: seat.aiProfile || seat.aiDifficulty || 'medium' });
    if (choice?.gmControlled) break;
    applyActionToState(session, state, seat, choice.type, choice);
  }
  return { session, state };
}

function applyBettingActionToState(session, state, seat, action, payload = {}) {
  const player = state.players?.[seat.seatId];
  if (!player) return { ok: false, error: 'Sabacc player missing.' };
  if (state.phase !== 'betting') return { ok: false, error: 'This Sabacc table is not in a betting round.' };
  if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s betting turn.' };
  if (player.folded || player.bombedOut) return { ok: false, error: 'This Sabacc seat is already out of the hand.' };
  state.betting ??= { currentBet: 0, minBet: safeAmount(state.ante, 5), minRaise: safeAmount(state.ante, 5), actedSeatIds: [], contributions: {} };
  state.betting.actedSeatIds = Array.from(new Set([...(state.betting.actedSeatIds || []), seat.seatId]));
  state.betting.contributions ??= {};
  const currentBet = safeAmount(state.betting.currentBet, 0);
  const paid = bettingContribution(state, seat.seatId);
  const toCall = Math.max(0, currentBet - paid);
  const amount = safeAmount(payload.amount, 0);

  if (action === 'check') {
    if (toCall > 0) return { ok: false, error: `You must call ${toCall}, raise, or fold.` };
    player.lastAction = 'Checks.';
    pushEvent(session, state, 'check', seat.seatId, `${seat.displayName} checks.`, { tone: 'credits', ai: payload.ai || null });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'bet') {
    const bet = amount || safeAmount(state.betting.minBet, 1);
    if (currentBet > 0) return { ok: false, error: 'There is already a live bet. Call or raise instead.' };
    if (bet < safeAmount(state.betting.minBet, 1)) return { ok: false, error: `Minimum Sabacc bet is ${state.betting.minBet}.` };
    const moved = moveCreditsToPot(session, state, seat.seatId, bet, 'handPot');
    if (!moved.ok) return moved;
    state.betting.currentBet = bet;
    state.betting.contributions[seat.seatId] = bet;
    state.betting.lastAggressorSeatId = seat.seatId;
    player.lastAction = `Bets ${bet} credits.`;
    pushEvent(session, state, 'bet', seat.seatId, `${seat.displayName} bets ${bet}.`, { tone: 'credits', amount: bet, ai: payload.ai || null });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'call-bet') {
    if (toCall <= 0) return { ok: false, error: 'There is no live bet to call.' };
    const moved = moveCreditsToPot(session, state, seat.seatId, toCall, 'handPot');
    if (!moved.ok) return moved;
    state.betting.contributions[seat.seatId] = paid + toCall;
    player.lastAction = `Calls ${toCall} credits.`;
    pushEvent(session, state, 'call-bet', seat.seatId, `${seat.displayName} calls ${toCall}.`, { tone: 'credits', amount: toCall, ai: payload.ai || null });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'raise') {
    const raiseBy = amount || safeAmount(state.betting.minRaise, 1);
    if (currentBet <= 0) return { ok: false, error: 'Open the betting with Bet, not Raise.' };
    if (raiseBy < safeAmount(state.betting.minRaise, 1)) return { ok: false, error: `Minimum raise is ${state.betting.minRaise}.` };
    const total = toCall + raiseBy;
    const moved = moveCreditsToPot(session, state, seat.seatId, total, 'handPot');
    if (!moved.ok) return moved;
    state.betting.currentBet = currentBet + raiseBy;
    state.betting.contributions[seat.seatId] = paid + total;
    state.betting.lastAggressorSeatId = seat.seatId;
    state.betting.actedSeatIds = [seat.seatId];
    player.lastAction = `Raises by ${raiseBy} credits.`;
    pushEvent(session, state, 'raise', seat.seatId, `${seat.displayName} raises by ${raiseBy}.`, { tone: 'credits', amount: raiseBy, ai: payload.ai || null });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'fold') {
    player.folded = true;
    player.lastAction = 'Folds out of the betting round.';
    pushEvent(session, state, 'fold', seat.seatId, `${seat.displayName} folds.`, { tone: 'danger', ai: payload.ai || null });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }

  return { ok: false, error: 'Unknown Sabacc betting action.' };
}

function applyActionToState(session, state, seat, action, payload = {}) {
  const player = state.players?.[seat.seatId];
  if (!player) return { ok: false, error: 'Sabacc player missing.' };
  if (action === 'start-hand') {
    if (!['ready', 'hand-complete'].includes(state.phase)) return { ok: false, error: 'A Sabacc hand is already in progress.' };
    beginHand(session, state);
    return { ok: true };
  }
  if (['check', 'bet', 'call-bet', 'raise'].includes(action) || (action === 'fold' && state.phase === 'betting')) return applyBettingActionToState(session, state, seat, action, payload);
  if (state.phase !== 'drawing') return { ok: false, error: 'This Sabacc hand is not accepting card actions.' };
  if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s Sabacc turn.' };
  if (player.called || player.folded || player.bombedOut) return { ok: false, error: 'This Sabacc seat has already finished the hand.' };
  player.hand = ensureCardArray(player.hand);

  if (action === 'draw-card') {
    if (!canDrawSabaccCard(player)) return { ok: false, error: `A Sabacc hand cannot hold more than ${SABACC_MAX_HAND_SIZE} cards.` };
    const card = drawSabaccCardForState(state);
    player.hand.push(card);
    attachAiDecision(player, payload);
    player.lastAction = 'Draws a card.';
    pushEvent(session, state, 'draw-card', seat.seatId, publicCardActionMessage(seat, 'draws'), { tone: 'draw', ai: payload.ai || null });
    updateEvaluations(state);
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'discard-card') {
    const cardId = String(payload.cardId || payload.cardInstanceId || '');
    if (!canDiscardSabaccCard(player)) return { ok: false, error: `You must keep at least ${SABACC_MIN_HAND_SIZE} Sabacc cards in hand.` };
    const index = player.hand.findIndex(card => card.id === cardId);
    if (index < 0) return { ok: false, error: 'Card not found in hand.' };
    const [removed] = player.hand.splice(index, 1);
    state.discard.push(removed);
    attachAiDecision(player, payload);
    player.lastAction = 'Discards a card.';
    pushEvent(session, state, 'discard-card', seat.seatId, publicCardActionMessage(seat, 'discards'), { tone: 'card', ai: payload.ai || null });
    updateEvaluations(state);
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'shift-card') {
    const cardId = String(payload.cardId || payload.cardInstanceId || '');
    const index = player.hand.findIndex(card => card.id === cardId);
    if (index < 0) return { ok: false, error: 'Card not found in hand.' };
    const old = player.hand[index];
    state.discard = ensureCardArray(state.discard);
    state.discard.push(old);
    const replacement = drawSabaccCardForState(state);
    player.hand[index] = {
      ...replacement,
      id: old.id,
      shiftedFrom: { catalogId: old.catalogId, label: old.label, value: old.value },
      shiftedAt: now()
    };
    attachAiDecision(player, payload);
    player.lastAction = 'Shifts a card.';
    pushEvent(session, state, 'shift-card', seat.seatId, publicCardActionMessage(seat, 'shifts'), { tone: 'shift', ai: payload.ai || null });
    updateEvaluations(state);
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'call-hand') {
    updateEvaluations(state);
    if (player.hand.length < SABACC_MIN_HAND_SIZE) return { ok: false, error: `You need at least ${SABACC_MIN_HAND_SIZE} cards to call a Sabacc hand.` };
    player.called = true;
    attachAiDecision(player, payload);
    player.lastAction = 'Calls the hand.';
    pushEvent(session, state, 'call-hand', seat.seatId, `${seat.displayName} calls the hand.`, { tone: 'stand', ai: payload.ai || null });
    updateEvaluations(state);
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'fold') {
    player.folded = true;
    attachAiDecision(player, payload);
    player.lastAction = 'Folds out of the hand.';
    pushEvent(session, state, 'fold', seat.seatId, `${seat.displayName} folds.`, { tone: 'danger', ai: payload.ai || null });
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  return { ok: false, error: 'Unknown Sabacc action.' };
}

function tableCreditBalances(session, state) {
  const balances = {};
  for (const seat of playableSeats(session.seats)) {
    balances[seat.seatId] = safeAmount(state.players?.[seat.seatId]?.tableCredits, 0);
  }
  return balances;
}

function buildWagerProfileForSabacc(rulesMode, creditBuyIn) {
  const settings = getGameSettingsSnapshot();
  const normalizedBuyIn = safeAmount(creditBuyIn, 0);
  const safeRulesMode = rulesMode === 'wagered' && settings.allowWagers && settings.allowCreditWagers && normalizedBuyIn > 0 ? 'wagered' : 'republic-senate';
  const capped = Math.min(normalizedBuyIn, safeAmount(settings.maxCreditWager, normalizedBuyIn) || normalizedBuyIn);
  return {
    rulesMode: safeRulesMode,
    wagerProfile: safeRulesMode === 'wagered'
      ? GameCreditEscrowService.buildCreditWagerProfile({ buyIn: capped, houseStake: capped })
      : { mode: 'none' },
    creditBuyIn: capped
  };
}

export class SabaccEngine {
  static getState(session = {}) { return ensureState(session); }

  static findSeatForActor(session = {}, actor = null, participantId = null) {
    const userId = currentUserId();
    const preferred = participantId || participantIdForActor(actor);
    return playableSeats(session.seats).find(seat => {
      if (preferred && seat.recipientId === preferred) return true;
      if (actor?.id && seat.actorId === actor.id) return true;
      if (userId && seat.userId === userId) return true;
      return false;
    }) ?? null;
  }

  static async createSoloAiSession({ actor, actorId = null, title = '', sessionId = null, requesterId = null, rulesMode = 'republic-senate', creditBuyIn = 0 } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    const resolvedSessionId = sessionId || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`;
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-solo-sabacc', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId, rulesMode, creditBuyIn });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const wager = buildWagerProfileForSabacc(rulesMode, creditBuyIn);
    const requestedFairness = settings.defaultAiFairness || 'fair';
    const safeFairness = requestedFairness === 'cheating' && (!settings.allowCheatingAi || settings.requireGmApprovalForCheatingAi)
      ? 'fair'
      : (requestedFairness === 'houseEdge' && !settings.allowHouseEdgeAi ? 'fair' : requestedFairness);
    const generated = await GameOpponentProfileService.buildPazaakAiOpponentProfile({ difficulty: settings.defaultAiDifficulty || 'medium', fairness: safeFairness, personality: settings.defaultAiPersonality || 'random' });
    const aiProfile = buildSabaccAiProfile(generated);
    const hostSeat = { seatId: 'seat_host', type: requester?.isGM ? 'gm' : 'player', userId, actorId: resolvedActor?.id ?? actorId ?? null, recipientId: hostRecipientId, displayName: actorDisplay(resolvedActor), avatar: actorImg(resolvedActor), status: 'host' };
    const aiSeat = { seatId: 'seat_ai', type: 'ai', userId: null, actorId: null, recipientId: null, displayName: aiProfile.name || 'Sabacc Dealer Droid', avatar: 'icons/commodities/tech/cog-bronze.webp', status: 'accepted', profession: aiProfile.profession || '', tableFact: aiProfile.tableFact || '', aiProfile, aiDifficulty: aiProfile.difficulty, aiFairness: aiProfile.fairness, aiPersonality: aiProfile.personality };
    let shell = { id: resolvedSessionId, gameId: 'sabacc', title: title || `${actorDisplay(resolvedActor)} at the Sabacc Table`, status: 'active', authorityMode: wager.rulesMode === 'wagered' ? 'gm' : 'host', hostUserId: userId, hostActorId: resolvedActor?.id ?? actorId ?? null, seats: [hostSeat, aiSeat], rulesMode: wager.rulesMode, wagerProfile: wager.wagerProfile, prizeProfile: { enabled: false }, escrow: {}, metadata: { createdBy: hostRecipientId, mode: 'solo-ai', sabaccAnte: 10, sabaccPotAnte: 5, creditBuyIn: wager.creditBuyIn, aiProfile }, log: [sessionLogEntry('solo-ai-sabacc-created', hostRecipientId)] };
    shell.gameState = ensureState(shell);
    if (GameCreditEscrowService.isCreditWager(shell)) {
      const escrowed = await GameCreditEscrowService.prepareEscrow(shell, { by: hostRecipientId });
      shell = escrowed.session || shell;
      if (!escrowed.ok) return shell;
    } else {
      shell = await GameSessionStore.upsertSession(shell);
    }
    const state = ensureState(shell);
    beginHand(shell, state);
    await processAi(shell, state);
    shell.gameState = state;
    const updated = await GameSessionStore.upsertSession(shell);
    GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: 'create-solo-sabacc' });
    return updated;
  }

  static async submitAction({ sessionId, seatId, action, payload = {}, actorId = null, requesterId = null } = {}) {
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('sabacc-action', { sessionId, seatId, action, payload, actorId, requesterId });
      return { pending: true, requestId, sessionId };
    }
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'sabacc') return { ok: false, error: 'Sabacc session not found.' };
    const state = ensureState(session);
    const normalized = String(action || '').trim();
    if (normalized === 'cancel-session') {
      state.phase = 'cancelled';
      state.statusLabel = 'CANCELLED';
      state.activeSeatId = null;
      state.message = payload.reason || 'The Sabacc table was cancelled.';
      pushEvent(session, state, 'session-cancelled', null, state.message, { tone: 'danger' });
      let updated = await persist(session, state, 'cancelled', sessionLogEntry('sabacc-cancelled', requesterId || currentUserId(), { reason: state.message }));
      if (GameCreditEscrowService.isCreditWager(updated) && ['escrowed', 'payout-failed'].includes(updated.escrow?.credits?.status)) {
        const refunded = await GameCreditEscrowService.refundSession(updated, state.message);
        updated = refunded.session || updated;
      }
      GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: 'sabacc-cancel-session' });
      return { ok: true, session: updated };
    }
    if (normalized === 'cash-out') {
      if (['betting', 'drawing', 'dealing'].includes(state.phase)) return { ok: false, error: 'Finish the current Sabacc hand before cashing out.' };
      state.phase = 'complete';
      state.statusLabel = 'COMPLETE';
      state.activeSeatId = null;
      state.message = 'Sabacc table closed. Table credits are being cashed out.';
      pushEvent(session, state, 'cash-out', null, state.message, { tone: 'credits' });
      let updated = await persist(session, state, 'complete', sessionLogEntry('sabacc-cash-out', requesterId || currentUserId(), { balances: tableCreditBalances(session, state) }));
      if (GameCreditEscrowService.isCreditWager(updated)) {
        const settled = await GameCreditEscrowService.settleTableCreditBalances(updated, { balances: tableCreditBalances(updated, state), reason: `${updated.title || 'Sabacc'} table-credit cashout` });
        updated = settled.session || updated;
      }
      GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: 'sabacc-cash-out' });
      return { ok: true, session: updated };
    }
    if (normalized === 'next-hand') {
      if (!['ready', 'hand-complete'].includes(state.phase)) return { ok: false, error: 'A Sabacc hand is already in progress.' };
      beginHand(session, state);
      await processAi(session, state);
      const updated = await persist(session, state, 'active', sessionLogEntry('sabacc-next-hand', requesterId || currentUserId()));
      GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: 'sabacc-next-hand' });
      return { ok: true, session: updated };
    }
    const seat = findSeat(session, seatId);
    if (!seat) return { ok: false, error: 'Sabacc seat not found.' };
    const result = applyActionToState(session, state, seat, normalized, payload || {});
    if (!result.ok) return result;
    await processAi(session, state);
    const status = state.phase === 'complete' ? 'complete' : 'active';
    let updated = await persist(session, state, status, sessionLogEntry(`sabacc-${normalized}`, seat.recipientId || seat.seatId, { seatId: seat.seatId }));
    GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: `sabacc-${normalized}` });
    return { ok: true, session: updated };
  }
}
