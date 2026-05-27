import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import { buildGameAiProfile } from '../../ai/game-ai-profile-service.js';
import { evaluateHintaroRoll, rollHintaroDie, rollHintaroPlayerDice, rollHintaroRegularDieSymbols, compareHintaroEvaluations } from './hintaro-rules.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'hin') { return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`; }
function now() { return Date.now(); }
function currentUserId() { return game?.user?.id ?? null; }
function actorDisplay(actor) { return actor?.name || game?.user?.name || 'Player'; }
function actorImg(actor) { return actor?.img || 'icons/svg/mystery-man.svg'; }
function participantIdForActor(actor) { return game?.user?.isGM ? `gm:${game.user.id}` : `player:${game?.user?.id ?? 'unknown'}`; }
function safeAmount(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= 0 ? n : fallback; }
function isAutomatedSeat(seat = {}) { return seat?.type === 'ai' || seat?.type === 'npc' || Boolean(seat?.aiProfile); }
function playableSeats(seats = []) { return (Array.isArray(seats) ? seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status)); }
function getOrder(session = {}) { return playableSeats(session.seats).map(seat => seat.seatId).filter(Boolean); }
function findSeat(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId === seatId) ?? null; }
function seatLabel(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }
function sessionLogEntry(type, by, data = {}) { return { id: randomId('log'), at: now(), type, by: by ?? null, data }; }
function activeSeatIds(session, state) { return getOrder(session).filter(seatId => !state.players?.[seatId]?.dropped); }

function buildPlayerState(seat = {}) {
  return {
    seatId: seat.seatId,
    dice: [],
    symbols: [],
    evaluation: null,
    dropped: false,
    rerolled: false,
    kept: false,
    contribution: 0,
    roundContribution: 0,
    tableCredits: null,
    wins: 0,
    lastAction: isAutomatedSeat(seat) ? 'Dealer droid watches the cubes.' : 'Waiting at the Hintaro table.'
  };
}

function buildState(session = {}) {
  const seats = playableSeats(session.seats);
  const players = {};
  for (const seat of seats) players[seat.seatId] = buildPlayerState(seat);
  return {
    engine: 'hintaro',
    version: 1,
    phase: 'ready',
    statusLabel: 'READY',
    round: 0,
    hintaronSeatId: seats[0]?.seatId || null,
    hintaronMode: session.metadata?.hintaronMode || (session.rulesMode === 'casino' ? 'casino' : 'rotating'),
    activeSeatId: null,
    pot: 0,
    carriedPot: 0,
    ante: Number(session.metadata?.hintaroAnte || 10) || 10,
    betting: null,
    hintaroDie: null,
    players,
    roundHistory: [],
    eventLog: [],
    winnerSeatIds: [],
    message: 'Start a Hintaro round when the table is ready.'
  };
}

function isCreditWager(session = {}) { return GameCreditEscrowService.isCreditWager(session); }
function tableBuyIn(session = {}) {
  const escrow = session.escrow?.credits || {};
  return safeAmount(escrow.buyIn ?? session.wagerProfile?.buyIn ?? session.wagerProfile?.creditBuyIn ?? session.metadata?.creditBuyIn ?? 0, 0);
}
function practiceBankroll(session = {}) { return safeAmount(session.metadata?.practiceBankroll ?? 500, 500); }
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
    if (player.tableCredits === null || player.tableCredits === undefined || Number.isNaN(Number(player.tableCredits))) player.tableCredits = initialCreditsForSeat(session, seat);
    else player.tableCredits = safeAmount(player.tableCredits, initialCreditsForSeat(session, seat));
  }
}
function ensureState(session = {}) {
  const state = session.gameState?.engine === 'hintaro' ? clone(session.gameState) : buildState(session);
  state.players ??= {};
  state.hintaronMode ||= session.metadata?.hintaronMode || (session.rulesMode === 'casino' ? 'casino' : 'rotating');
  state.pendingReceipts = Array.isArray(state.pendingReceipts) ? state.pendingReceipts : [];
  state.roundHistory = Array.isArray(state.roundHistory) ? state.roundHistory : [];
  state.eventLog = Array.isArray(state.eventLog) ? state.eventLog : [];
  for (const seat of playableSeats(session.seats)) {
    state.players[seat.seatId] ??= buildPlayerState(seat);
    state.players[seat.seatId].seatId = seat.seatId;
  }
  ensureTableCredits(session, state);
  return state;
}
function pushEvent(session, state, type, seatId, message, data = {}) {
  state.eventLog.unshift({ id: randomId('hin_evt'), at: now(), type, seatId: seatId || null, seatLabel: seatId ? seatLabel(session, seatId) : null, message: String(message || ''), tone: data.tone || 'neutral', ...data });
  state.eventLog = state.eventLog.slice(0, 40);
}


function queueHintaroReceipt(state, receipt = {}) {
  state.pendingReceipts ??= [];
  state.pendingReceipts.push({ id: randomId('hin_receipt'), at: now(), game: 'Hintaro', ...receipt });
}

function drainHintaroReceipts(state) {
  const receipts = Array.isArray(state.pendingReceipts) ? [...state.pendingReceipts] : [];
  state.pendingReceipts = [];
  return receipts;
}

async function emitHintaroReceipts(session, receipts = []) {
  for (const receipt of receipts) {
    await GameNotificationService.emitGameReceipt(session, {
      title: receipt.title || 'Hintaro Receipt',
      eventType: receipt.eventType || 'hintaro-receipt',
      amount: receipt.amount ?? null,
      lines: receipt.lines || []
    });
  }
}

function aiProfileForSeat(seat = {}) {
  return buildGameAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium', { personality: 'methodical' });
}
function updateEvaluations(state) {
  for (const player of Object.values(state.players ?? {})) {
    if ((!Array.isArray(player.symbols) || !player.symbols.length) && Array.isArray(player.dice)) player.symbols = player.dice.flat();
    player.evaluation = evaluateHintaroRoll(player.symbols || [], state.hintaroDie);
  }
}
function nextSeatId(session, state, afterSeatId, predicate = null) {
  const order = getOrder(session);
  if (!order.length) return null;
  const index = Math.max(0, order.indexOf(afterSeatId));
  for (let i = 1; i <= order.length; i += 1) {
    const candidate = order[(index + i) % order.length];
    const player = state.players?.[candidate];
    if (!player) continue;
    if (predicate ? predicate(candidate, player) : !player.dropped) return candidate;
  }
  return null;
}
function firstSeatLeftOfHintaron(session, state, predicate = null) {
  return nextSeatId(session, state, state.hintaronSeatId, predicate) || getOrder(session).find(id => predicate ? predicate(id, state.players?.[id]) : true) || null;
}
function moveCreditsToPot(session, state, seatId, amount) {
  const player = state.players?.[seatId];
  const value = safeAmount(amount, 0);
  if (!player || value <= 0) return { ok: true, amount: 0 };
  ensureTableCredits(session, state);
  if (player.tableCredits < value) return { ok: false, error: `${seatLabel(session, seatId)} does not have enough table credits.` };
  player.tableCredits -= value;
  player.contribution = safeAmount(player.contribution, 0) + value;
  player.roundContribution = safeAmount(player.roundContribution, 0) + value;
  state.pot = safeAmount(state.pot, 0) + value;
  return { ok: true, amount: value };
}
function awardTableCredits(state, seatId, amount) {
  const player = state.players?.[seatId];
  const value = safeAmount(amount, 0);
  if (player && value > 0) player.tableCredits = safeAmount(player.tableCredits, 0) + value;
}
function rotateHintaron(session, state) {
  const order = getOrder(session);
  if (state.hintaronMode === 'casino') return state.hintaronSeatId || order[0] || null;
  if (!order.length) return null;
  if (!state.hintaronSeatId) return order[0];
  const index = order.indexOf(state.hintaronSeatId);
  return order[(Math.max(0, index) + 1) % order.length] || order[0];
}
function openBettingRound(session, state) {
  const minBet = Math.max(1, safeAmount(state.ante, 10));
  state.phase = 'betting';
  state.statusLabel = 'BETTING';
  state.betting = { currentBet: 0, minBet, minRaise: minBet, actedSeatIds: [], contributions: {}, lastAggressorSeatId: null };
  state.activeSeatId = firstSeatLeftOfHintaron(session, state, (_id, player) => !player.dropped);
  state.message = 'Initial cubes are down. Betting starts to the left of the hintaron.';
}
function bettingClosed(session, state) {
  const active = activeSeatIds(session, state);
  if (active.length <= 1) return true;
  const acted = new Set(state.betting?.actedSeatIds || []);
  const currentBet = safeAmount(state.betting?.currentBet, 0);
  return active.every(id => acted.has(id) && safeAmount(state.betting?.contributions?.[id], 0) >= currentBet);
}
function advanceBetting(session, state, fromSeatId) {
  if (bettingClosed(session, state)) {
    state.phase = 'reroll';
    state.statusLabel = 'REROLL';
    state.betting = null;
    state.activeSeatId = firstSeatLeftOfHintaron(session, state, (_id, player) => !player.dropped && !player.rerolled && !player.kept);
    state.message = state.activeSeatId ? `${seatLabel(session, state.activeSeatId)} may reroll one cube or keep.` : 'No rerolls remain.';
    if (!state.activeSeatId) resolveRound(session, state);
    return;
  }
  state.activeSeatId = nextSeatId(session, state, fromSeatId, (_id, player) => !player.dropped);
}
function beginRound(session, state) {
  ensureTableCredits(session, state);
  state.round += 1;
  state.hintaronMode ||= session.metadata?.hintaronMode || (session.rulesMode === 'casino' ? 'casino' : 'rotating');
  state.hintaronSeatId = state.round === 1 ? (state.hintaronSeatId || getOrder(session)[0] || null) : rotateHintaron(session, state);
  state.hintaroDie = null;
  state.winnerSeatIds = [];
  state.pot = safeAmount(state.carriedPot, 0);
  state.carriedPot = 0;
  for (const seatId of getOrder(session)) {
    const player = state.players[seatId] ??= buildPlayerState(findSeat(session, seatId));
    const rolled = rollHintaroPlayerDice();
    player.dice = rolled.dice;
    player.symbols = rolled.symbols;
    player.dropped = false;
    player.rerolled = false;
    player.kept = false;
    player.roundContribution = 0;
    player.evaluation = evaluateHintaroRoll(player.symbols, null);
    player.lastAction = 'Rolls two chance cubes.';
    const ante = moveCreditsToPot(session, state, seatId, state.ante);
    if (!ante.ok) {
      player.dropped = true;
      player.lastAction = 'Could not cover the ante and dropped.';
    }
  }
  pushEvent(session, state, 'round-start', state.hintaronSeatId, `Round ${state.round} begins. ${seatLabel(session, state.hintaronSeatId)} is hintaron (${state.hintaronMode}).`, { tone: 'credits', hintaronMode: state.hintaronMode });
  openBettingRound(session, state);
  updateEvaluations(state);
}
function applyBettingAction(session, state, seat, action, payload = {}) {
  if (state.phase !== 'betting') return { ok: false, error: 'Hintaro is not in a betting phase.' };
  if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s betting turn.' };
  const player = state.players?.[seat.seatId];
  if (!player || player.dropped) return { ok: false, error: 'This seat is out of the round.' };
  const currentBet = safeAmount(state.betting.currentBet, 0);
  const paid = safeAmount(state.betting.contributions?.[seat.seatId], 0);
  const toCall = Math.max(0, currentBet - paid);
  const amount = safeAmount(payload.amount, 0);
  state.betting.actedSeatIds = Array.from(new Set([...(state.betting.actedSeatIds || []), seat.seatId]));
  if (action === 'check') {
    if (toCall > 0) return { ok: false, error: 'There is a live bet to meet.' };
    player.lastAction = 'Checks.';
    pushEvent(session, state, 'check', seat.seatId, `${seat.displayName} checks.`, { tone: 'credits' });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }
  if (action === 'bet') {
    const bet = amount || state.betting.minBet;
    if (currentBet > 0) return { ok: false, error: 'Call or raise the live bet instead.' };
    if (bet < state.betting.minBet) return { ok: false, error: `Minimum bet is ${state.betting.minBet}.` };
    const moved = moveCreditsToPot(session, state, seat.seatId, bet);
    if (!moved.ok) return moved;
    state.betting.currentBet = bet;
    state.betting.contributions[seat.seatId] = bet;
    state.betting.lastAggressorSeatId = seat.seatId;
    player.lastAction = `Bets ${bet} credits.`;
    pushEvent(session, state, 'bet', seat.seatId, `${seat.displayName} bets ${bet}.`, { tone: 'credits', amount: bet });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }
  if (action === 'call-bet') {
    if (toCall <= 0) return { ok: false, error: 'There is no live bet to call.' };
    const moved = moveCreditsToPot(session, state, seat.seatId, toCall);
    if (!moved.ok) return moved;
    state.betting.contributions[seat.seatId] = paid + toCall;
    player.lastAction = `Calls ${toCall} credits.`;
    pushEvent(session, state, 'call-bet', seat.seatId, `${seat.displayName} calls ${toCall}.`, { tone: 'credits', amount: toCall });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }
  if (action === 'raise') {
    const raiseBy = amount || state.betting.minRaise;
    if (currentBet <= 0) return { ok: false, error: 'Open with a bet first.' };
    if (raiseBy < state.betting.minRaise) return { ok: false, error: `Minimum raise is ${state.betting.minRaise}.` };
    const moved = moveCreditsToPot(session, state, seat.seatId, toCall + raiseBy);
    if (!moved.ok) return moved;
    state.betting.currentBet = currentBet + raiseBy;
    state.betting.contributions[seat.seatId] = paid + toCall + raiseBy;
    state.betting.lastAggressorSeatId = seat.seatId;
    state.betting.actedSeatIds = [seat.seatId];
    player.lastAction = `Raises by ${raiseBy} credits.`;
    pushEvent(session, state, 'raise', seat.seatId, `${seat.displayName} raises by ${raiseBy}.`, { tone: 'credits', amount: raiseBy });
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }
  if (action === 'drop') {
    player.dropped = true;
    player.lastAction = 'Drops out of the round.';
    pushEvent(session, state, 'drop', seat.seatId, `${seat.displayName} drops out.`, { tone: 'danger' });
    if (activeSeatIds(session, state).length === 1) {
      const winner = activeSeatIds(session, state)[0];
      const pot = safeAmount(state.pot, 0);
      awardTableCredits(state, winner, pot);
      state.pot = 0;
      state.winnerSeatIds = [winner];
      state.phase = 'round-complete';
      state.statusLabel = 'ROUND COMPLETE';
      state.activeSeatId = null;
      state.message = `${seatLabel(session, winner)} wins the Hintaro pot after all other players drop.`;
      state.roundHistory.unshift({ id: randomId('hin_round'), round: state.round, at: now(), winnerSeatIds: [winner], hintaroDie: null, potAwarded: pot, carriedPot: 0, rankLabel: 'Won by Drop' });
      state.roundHistory = state.roundHistory.slice(0, 20);
      pushEvent(session, state, 'round-winner-by-drop', winner, state.message, { tone: 'success', potAwarded: pot });
      return { ok: true };
    }
    advanceBetting(session, state, seat.seatId);
    return { ok: true };
  }
  return { ok: false, error: 'Unknown Hintaro betting action.' };
}
function expectedRankForDie(player, index) {
  const faces = [['tukar', 'tukar'], ['tukar', 'kulro'], ['kulro', 'tukar'], ['kulro', 'kulro']];
  let total = 0;
  for (const face of faces) {
    const dice = Array.isArray(player.dice) && player.dice.length ? player.dice.map(die => [...die]) : [player.symbols?.slice(0, 2) || [], player.symbols?.slice(2, 4) || []];
    dice[index] = face;
    const symbols = dice.flat();
    total += evaluateHintaroRoll(symbols, null).rank;
  }
  return total / faces.length;
}
function chooseAiReroll(player) {
  const current = evaluateHintaroRoll(player.symbols || [], null).rank;
  let best = { index: -1, score: current };
  const diceCount = Array.isArray(player.dice) && player.dice.length ? player.dice.length : 2;
  for (let i = 0; i < diceCount; i += 1) {
    const score = expectedRankForDie(player, i);
    if (score > best.score + 0.1) best = { index: i, score };
  }
  return best.index;
}
function advanceReroll(session, state, fromSeatId) {
  const next = nextSeatId(session, state, fromSeatId, (_id, player) => !player.dropped && !player.rerolled && !player.kept);
  if (next) {
    state.activeSeatId = next;
    state.message = `${seatLabel(session, next)} may reroll one cube or keep.`;
  } else resolveRound(session, state);
}
function applyRerollAction(session, state, seat, action, payload = {}) {
  if (state.phase !== 'reroll') return { ok: false, error: 'Hintaro is not in the reroll phase.' };
  if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s reroll choice.' };
  const player = state.players?.[seat.seatId];
  if (!player || player.dropped) return { ok: false, error: 'This seat is out of the round.' };
  if (player.rerolled || player.kept) return { ok: false, error: 'This seat already made a reroll choice.' };
  if (action === 'reroll-die') {
    const dice = Array.isArray(player.dice) && player.dice.length ? player.dice : [player.symbols?.slice(0, 2) || [], player.symbols?.slice(2, 4) || []];
    const index = Math.max(0, Math.min(dice.length - 1, Math.floor(Number(payload.dieIndex ?? 0))));
    dice[index] = rollHintaroRegularDieSymbols();
    player.dice = dice;
    player.symbols = dice.flat();
    player.rerolled = true;
    player.lastAction = `Rerolls chance cube ${index + 1}.`;
    player.evaluation = evaluateHintaroRoll(player.symbols, null);
    pushEvent(session, state, 'reroll', seat.seatId, `${seat.displayName} rerolls one cube.`, { tone: 'roll' });
    advanceReroll(session, state, seat.seatId);
    return { ok: true };
  }
  if (action === 'keep-roll') {
    player.kept = true;
    player.lastAction = 'Keeps their roll.';
    pushEvent(session, state, 'keep-roll', seat.seatId, `${seat.displayName} keeps their cubes.`, { tone: 'neutral' });
    advanceReroll(session, state, seat.seatId);
    return { ok: true };
  }
  return { ok: false, error: 'Unknown Hintaro reroll action.' };
}
function resolveRound(session, state) {
  state.hintaroDie = rollHintaroDie();
  updateEvaluations(state);
  const candidates = activeSeatIds(session, state)
    .map(seatId => ({ seatId, evaluation: state.players?.[seatId]?.evaluation }))
    .filter(entry => entry.evaluation?.canWin);
  candidates.sort((a, b) => -compareHintaroEvaluations(a.evaluation, b.evaluation));
  const best = candidates[0] || null;
  const winners = best ? candidates.filter(entry => compareHintaroEvaluations(entry.evaluation, best.evaluation) === 0).map(entry => entry.seatId) : [];
  state.winnerSeatIds = winners;
  const pot = safeAmount(state.pot, 0);
  if (!winners.length) {
    state.carriedPot = pot;
    state.pot = 0;
    state.message = 'No ranked roll won. The pot carries to the next round.';
    pushEvent(session, state, 'no-winner', null, state.message, { tone: 'danger' });
  } else {
    const share = Math.floor(pot / winners.length);
    const remainder = pot - share * winners.length;
    for (const winner of winners) {
      awardTableCredits(state, winner, share);
      state.players[winner].wins = safeAmount(state.players[winner].wins, 0) + 1;
    }
    state.carriedPot = remainder;
    state.pot = 0;
    state.message = winners.length > 1 ? `The round ties; ${share} credits split between winners${remainder ? ` and ${remainder} credit${remainder === 1 ? '' : 's'} carry forward` : ''}.` : `${seatLabel(session, winners[0])} wins the Hintaro pot.`;
    pushEvent(session, state, 'round-winner', winners[0] || null, state.message, { tone: 'success', winners, share, remainder });
  }
  queueHintaroReceipt(state, {
    title: 'Hintaro Round Receipt',
    eventType: 'hintaro-round-receipt',
    amount: winners.length ? pot - state.carriedPot : 0,
    lines: [
      `Round ${state.round}: ${winners.length ? winners.map(id => seatLabel(session, id)).join(', ') : 'No winner'}`,
      `Rank: ${best?.evaluation?.rankLabel || 'No Rank'}`,
      `Pot awarded: ${winners.length ? pot - state.carriedPot : 0}`,
      state.carriedPot ? `Carryover: ${state.carriedPot}` : ''
    ].filter(Boolean)
  });
  state.roundHistory.unshift({ id: randomId('hin_round'), round: state.round, at: now(), winnerSeatIds: winners, hintaroDie: state.hintaroDie, potAwarded: pot, carriedPot: state.carriedPot, rankLabel: best?.evaluation?.rankLabel || 'No Rank' });
  state.roundHistory = state.roundHistory.slice(0, 20);
  state.phase = 'round-complete';
  state.statusLabel = 'ROUND COMPLETE';
  state.activeSeatId = null;
}
async function processAi(session, state) {
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const seat = findSeat(session, state.activeSeatId);
    if (!seat || !isAutomatedSeat(seat)) break;
    if (state.phase === 'betting') {
      const player = state.players?.[seat.seatId];
      const profile = aiProfileForSeat(seat);
      const rank = evaluateHintaroRoll(player?.symbols || [], null).rank;
      const currentBet = safeAmount(state.betting?.currentBet, 0);
      const paid = safeAmount(state.betting?.contributions?.[seat.seatId], 0);
      const toCall = Math.max(0, currentBet - paid);
      const bold = ['aggressive', 'reckless', 'showboat', 'desperate'].includes(profile.personality);
      const cautious = ['cautious', 'grinder', 'methodical'].includes(profile.personality);
      let action = toCall > 0 ? (rank <= 0 && toCall > state.ante && !bold ? 'drop' : 'call-bet') : 'check';
      if (toCall <= 0 && rank >= (cautious ? 4 : 3) && currentBet <= 0) action = 'bet';
      if (toCall > 0 && rank <= 0 && cautious && toCall >= Math.max(state.ante, player.tableCredits / 4)) action = 'drop';
      const result = applyBettingAction(session, state, seat, action, { amount: state.betting?.minBet || state.ante, ai: { difficulty: profile.difficulty, fairness: profile.fairness, personality: profile.personality, rank } });
      if (!result.ok) break;
      continue;
    }
    if (state.phase === 'reroll') {
      const player = state.players?.[seat.seatId];
      const profile = aiProfileForSeat(seat);
      const index = chooseAiReroll(player);
      if (profile.gmControlled) break;
      const result = index >= 0 ? applyRerollAction(session, state, seat, 'reroll-die', { dieIndex: index }) : applyRerollAction(session, state, seat, 'keep-roll');
      if (!result.ok) break;
      continue;
    }
    break;
  }
}
async function persist(session, state, status = 'active', logEntry = null) {
  const next = { ...session, status, gameState: state };
  if (logEntry) next.log = [...(session.log || []), logEntry];
  return GameSessionStore.upsertSession(next);
}
function buildWagerProfileForHintaro(rulesMode, creditBuyIn) {
  const settings = getGameSettingsSnapshot();
  const normalizedBuyIn = safeAmount(creditBuyIn, 0);
  const safeRulesMode = rulesMode === 'wagered' && settings.allowWagers && settings.allowCreditWagers && normalizedBuyIn > 0 ? 'wagered' : 'republic-senate';
  const capped = Math.min(normalizedBuyIn, safeAmount(settings.maxCreditWager, normalizedBuyIn) || normalizedBuyIn);
  return {
    rulesMode: safeRulesMode,
    wagerProfile: safeRulesMode === 'wagered' ? GameCreditEscrowService.buildCreditWagerProfile({ buyIn: capped, houseStake: capped }) : { mode: 'none' },
    creditBuyIn: capped
  };
}
function tableLeaderSeatId(session, state) {
  return getOrder(session).slice().sort((a, b) => safeAmount(state.players?.[b]?.tableCredits, 0) - safeAmount(state.players?.[a]?.tableCredits, 0))[0] || null;
}
function tableCreditBalances(session, state) {
  const balances = {};
  for (const seat of playableSeats(session.seats)) balances[seat.seatId] = safeAmount(state.players?.[seat.seatId]?.tableCredits, 0);
  return balances;
}

export class HintaroEngine {
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
      const requestId = HolonetSocketService.emitRequest('create-solo-hintaro', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId, rulesMode, creditBuyIn });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const wager = buildWagerProfileForHintaro(rulesMode, creditBuyIn);
    const generated = await GameOpponentProfileService.buildPazaakAiOpponentProfile({ difficulty: settings.defaultAiDifficulty || 'medium', fairness: settings.defaultAiFairness || 'fair', personality: settings.defaultAiPersonality || 'random' });
    const aiProfile = aiProfileForSeat({ aiProfile: { ...generated, difficulty: settings.defaultAiDifficulty || 'medium', fairness: settings.defaultAiFairness || 'fair', personality: generated.personality || 'methodical' } });
    const hostSeat = { seatId: 'seat_host', type: requester?.isGM ? 'gm' : 'player', userId, actorId: resolvedActor?.id ?? actorId ?? null, recipientId: hostRecipientId, displayName: actorDisplay(resolvedActor), avatar: actorImg(resolvedActor), status: 'host' };
    const aiSeat = { seatId: 'seat_ai', type: 'ai', userId: null, actorId: null, recipientId: null, displayName: aiProfile.name || 'Hintaro Regular', avatar: 'icons/commodities/currency/coin-engraved-sun-smile-copper.webp', status: 'accepted', profession: aiProfile.profession || '', tableFact: aiProfile.tableFact || '', aiProfile };
    let shell = { id: resolvedSessionId, gameId: 'hintaro', title: title || `${actorDisplay(resolvedActor)} at the Hintaro Table`, status: 'active', authorityMode: wager.rulesMode === 'wagered' ? 'gm' : 'host', hostUserId: userId, hostActorId: resolvedActor?.id ?? actorId ?? null, seats: [hostSeat, aiSeat], rulesMode: wager.rulesMode, wagerProfile: wager.wagerProfile, prizeProfile: { enabled: false }, escrow: {}, metadata: { createdBy: hostRecipientId, mode: 'solo-ai', hintaroAnte: 10, creditBuyIn: wager.creditBuyIn, hintaronMode: 'rotating', aiProfile }, log: [sessionLogEntry('solo-ai-hintaro-created', hostRecipientId)] };
    shell.gameState = ensureState(shell);
    if (GameCreditEscrowService.isCreditWager(shell)) {
      const escrowed = await GameCreditEscrowService.prepareEscrow(shell, { by: hostRecipientId });
      shell = escrowed.session || shell;
      if (!escrowed.ok) return shell;
    } else shell = await GameSessionStore.upsertSession(shell);
    const state = ensureState(shell);
    beginRound(shell, state);
    await processAi(shell, state);
    shell.gameState = state;
    const updated = await GameSessionStore.upsertSession(shell);
    GameNotificationService.emitSessionUpdated(updated, { hintaroPhase: updated.gameState?.phase, action: 'create-solo-hintaro' });
    return updated;
  }

  static async submitAction({ sessionId, seatId, action, payload = {}, actorId = null, requesterId = null } = {}) {
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('hintaro-action', { sessionId, seatId, action, payload, actorId, requesterId });
      return { pending: true, requestId, sessionId };
    }
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'hintaro') return { ok: false, error: 'Hintaro session not found.' };
    const state = ensureState(session);
    const normalized = String(action || '').trim();
    if (normalized === 'cancel-session') {
      state.phase = 'cancelled';
      state.statusLabel = 'CANCELLED';
      state.activeSeatId = null;
      state.message = payload.reason || 'The Hintaro table was cancelled.';
      pushEvent(session, state, 'session-cancelled', null, state.message, { tone: 'danger' });
      let updated = await persist(session, state, 'cancelled', sessionLogEntry('hintaro-cancelled', requesterId || currentUserId(), { reason: state.message }));
      if (GameCreditEscrowService.isCreditWager(updated) && ['escrowed', 'payout-failed'].includes(updated.escrow?.credits?.status)) {
        const refunded = await GameCreditEscrowService.refundSession(updated, state.message);
        updated = refunded.session || updated;
      }
      GameNotificationService.emitSessionUpdated(updated, { hintaroPhase: updated.gameState?.phase, action: 'hintaro-cancel-session' });
      return { ok: true, session: updated };
    }
    if (normalized === 'cash-out') {
      state.phase = 'complete';
      state.statusLabel = 'COMPLETE';
      state.activeSeatId = null;
      state.winnerSeatIds = [tableLeaderSeatId(session, state)].filter(Boolean);
      state.message = state.winnerSeatIds.length ? `${seatLabel(session, state.winnerSeatIds[0])} leaves the Hintaro table ahead.` : 'Hintaro table closed.';
      const balances = tableCreditBalances(session, state);
      queueHintaroReceipt(state, { title: 'Hintaro Table Cash-Out', eventType: 'hintaro-cashout-receipt', lines: Object.entries(balances).map(([id, amount]) => `${seatLabel(session, id)} cashed out ${amount} table credits`) });
      const receipts = drainHintaroReceipts(state);
      let updated = await persist(session, state, 'complete', sessionLogEntry('hintaro-cash-out', requesterId || currentUserId(), { winnerSeatId: state.winnerSeatIds[0] || null, balances }));
      if (GameCreditEscrowService.isCreditWager(updated)) {
        const settled = await GameCreditEscrowService.settleTableCreditBalances(updated, { balances: tableCreditBalances(updated, state), reason: `${updated.title || 'Hintaro'} table-credit cashout` });
        updated = settled.session || updated;
      }
      await emitHintaroReceipts(updated, receipts);
      GameNotificationService.emitSessionUpdated(updated, { hintaroPhase: updated.gameState?.phase, action: 'hintaro-cash-out' });
      return { ok: true, session: updated };
    }
    if (normalized === 'next-round') {
      if (!['ready', 'round-complete'].includes(state.phase)) return { ok: false, error: 'A Hintaro round is already in progress.' };
      beginRound(session, state);
      await processAi(session, state);
      const receipts = drainHintaroReceipts(state);
      const updated = await persist(session, state, 'active', sessionLogEntry('hintaro-next-round', requesterId || currentUserId()));
      await emitHintaroReceipts(updated, receipts);
      GameNotificationService.emitSessionUpdated(updated, { hintaroPhase: updated.gameState?.phase, action: 'hintaro-next-round' });
      return { ok: true, session: updated };
    }
    const seat = findSeat(session, seatId);
    if (!seat) return { ok: false, error: 'Hintaro seat not found.' };
    let result = { ok: false, error: 'Unknown Hintaro action.' };
    if (['check', 'bet', 'call-bet', 'raise', 'drop'].includes(normalized)) result = applyBettingAction(session, state, seat, normalized, payload || {});
    else if (['reroll-die', 'keep-roll'].includes(normalized)) result = applyRerollAction(session, state, seat, normalized, payload || {});
    if (!result.ok) return result;
    await processAi(session, state);
    const receipts = drainHintaroReceipts(state);
    const status = state.phase === 'complete' ? 'complete' : 'active';
    const updated = await persist(session, state, status, sessionLogEntry(`hintaro-${normalized}`, seat.recipientId || seat.seatId, { seatId: seat.seatId }));
    await emitHintaroReceipts(updated, receipts);
    GameNotificationService.emitSessionUpdated(updated, { hintaroPhase: updated.gameState?.phase, action: `hintaro-${normalized}` });
    return { ok: true, session: updated };
  }
}
