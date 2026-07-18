import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import {
  buildDefaultPazaakSideDeckIds,
  buildOpeningHand,
  buildPazaakMainDeck,
  drawMainCard,
  PAZAAK_HAND_SIZE,
  PAZAAK_SETS_TO_WIN,
  PAZAAK_SIDE_DECK_SIZE,
  PAZAAK_TARGET,
  PAZAAK_TABLE_LIMIT,
  validateSideDeck
} from './pazaak-deck.js';
import {
  applyPazaakSideCard,
  comparePazaakInitiativeDraws,
  comparePazaakSet,
  hasFilledPazaakTable,
  resetPazaakPlayerForSet,
  scorePazaakPlayer
} from './pazaak-rules.js';
import { PazaakAi, buildPazaakAiProfile } from './pazaak-ai.js';
import { randomPazaakDialogue } from './pazaak-ai-personalities.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'pz') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return Date.now();
}

function currentUserId() {
  return game?.user?.id ?? null;
}

function actorDisplay(actor) {
  return actor?.name || game?.user?.name || 'Player';
}

function actorImg(actor) {
  return actor?.img || 'icons/svg/mystery-man.svg';
}

function participantIdForActor(actor) {
  if (game?.user?.isGM) return `gm:${game.user.id}`;
  return `player:${game?.user?.id ?? 'unknown'}`;
}

function isAutomatedSeat(seat = {}) {
  return seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile;
}

function playableSeats(seats = []) {
  return (Array.isArray(seats) ? seats : []).filter(seat => !seat.spectator && seat.status !== 'declined' && seat.status !== 'cancelled');
}

function getPlayerOrder(session = {}) {
  return playableSeats(session.seats).map(seat => seat.seatId).filter(Boolean);
}

function findSeat(session, seatId) {
  return playableSeats(session.seats).find(seat => seat.seatId === seatId) ?? null;
}

function seatLabel(session, seatId) {
  return findSeat(session, seatId)?.displayName || 'Unknown Seat';
}

function buildPlayerStateForSeat(seat = {}) {
  const automated = isAutomatedSeat(seat);
  const aiProfile = buildPazaakAiProfile(seat.aiProfile || seat.ai || 'medium');
  const sideDeckIds = automated ? buildDefaultPazaakSideDeckIds(aiProfile.personality || aiProfile.difficulty || 'balanced') : [];
  return {
    seatId: seat.seatId,
    sideDeckIds,
    sideDeckLocked: automated,
    hand: [],
    tableCards: [],
    stood: false,
    bust: false,
    filledTable: false,
    setsWon: 0,
    score: 0,
    lockedScore: null,
    sideCardPlayedThisTurn: false,
    turnDrawn: false,
    turnPhase: 'waiting',
    matchHandDealt: false,
    tiebreakerUsed: false,
    tiebreakerPlayedAt: null,
    lastAction: automated ? 'AI side deck loaded.' : 'Awaiting side deck.'
  };
}

function buildSetupState(session = {}) {
  const seats = playableSeats(session.seats);
  const players = {};
  for (const seat of seats) players[seat.seatId] = buildPlayerStateForSeat(seat);
  return {
    engine: 'pazaak',
    version: 2,
    rulesProfile: 'blackjack-20',
    phase: 'setup',
    statusLabel: 'SIDE DECK SETUP',
    target: PAZAAK_TARGET,
    setsToWin: PAZAAK_SETS_TO_WIN,
    sideDeckSize: PAZAAK_SIDE_DECK_SIZE,
    openingHandSize: PAZAAK_HAND_SIZE,
    tableLimit: PAZAAK_TABLE_LIMIT,
    setNumber: 0,
    firstSeatId: seats[0]?.seatId ?? null,
    activeSeatId: null,
    mainDeck: [],
    discard: [],
    players,
    setHistory: [],
    eventLog: [],
    openingDrawHistory: [],
    openingFirstSeatResolved: false,
    turnSequence: 0,
    debug: { rngLabel: randomId('pazaak_rng'), lastDeckState: null },
    winnerSeatId: null,
    message: 'Build and lock a 10-card side deck before the match begins.'
  };
}

function ensurePazaakState(session = {}) {
  const existing = session.gameState?.engine === 'pazaak' ? clone(session.gameState) : buildSetupState(session);
  const seats = playableSeats(session.seats);
  existing.version = Math.max(2, Number(existing.version || 0));
  existing.rulesProfile = existing.rulesProfile || 'blackjack-20';
  existing.players ??= {};
  existing.setHistory = Array.isArray(existing.setHistory) ? existing.setHistory : [];
  existing.eventLog = Array.isArray(existing.eventLog) ? existing.eventLog : [];
  existing.openingDrawHistory = Array.isArray(existing.openingDrawHistory) ? existing.openingDrawHistory : [];
  existing.openingFirstSeatResolved = Boolean(existing.openingFirstSeatResolved);
  existing.turnSequence = Number(existing.turnSequence || 0) || 0;
  existing.debug = existing.debug && typeof existing.debug === 'object' ? existing.debug : { rngLabel: randomId('pazaak_rng'), lastDeckState: null };
  for (const seat of seats) {
    existing.players[seat.seatId] ??= buildPlayerStateForSeat(seat);
    const player = existing.players[seat.seatId];
    player.seatId = seat.seatId;
    player.hand = Array.isArray(player.hand) ? player.hand.filter(Boolean) : [];
    player.tableCards = Array.isArray(player.tableCards) ? player.tableCards.filter(Boolean) : [];
    player.matchHandDealt = Boolean(player.matchHandDealt || player.hand.length);
    player.turnPhase = player.turnPhase || 'waiting';
    player.lockedScore = player.lockedScore ?? null;
    player.turnDrawn = Boolean(player.turnDrawn);
    if (isAutomatedSeat(seat) && !player.sideDeckLocked) {
      player.sideDeckIds = buildDefaultPazaakSideDeckIds(buildPazaakAiProfile(seat.aiProfile || seat.ai || 'medium').personality || 'balanced');
      player.sideDeckLocked = true;
    }
  }
  updateScores(existing);
  return existing;
}

function allDecksLocked(session, state) {
  return playableSeats(session.seats).every(seat => state.players?.[seat.seatId]?.sideDeckLocked);
}

function effectiveScore(player = {}) {
  return player.lockedScore != null ? Number(player.lockedScore) : scorePazaakPlayer(player);
}

function updateScores(state) {
  for (const player of Object.values(state.players ?? {})) {
    player.hand = Array.isArray(player.hand) ? player.hand.filter(Boolean) : [];
    player.tableCards = Array.isArray(player.tableCards) ? player.tableCards.filter(Boolean) : [];
    player.score = effectiveScore(player);
  }
  return state;
}

function drawPazaakMainCardForState(state) {
  state.mainDeck = Array.isArray(state.mainDeck) ? state.mainDeck.filter(Boolean) : [];
  if (!state.mainDeck.length) state.mainDeck = buildPazaakMainDeck();
  const drawn = drawMainCard(state.mainDeck);
  state.mainDeck = Array.isArray(drawn.mainDeck) ? drawn.mainDeck.filter(Boolean) : [];
  if (!drawn.card) throw new Error('Pazaak main deck could not provide a card.');
  return drawn.card;
}

function pushPazaakEvent(session, state, type, seatId = null, message = '', extra = {}) {
  if (!state) return null;
  state.eventLog = Array.isArray(state.eventLog) ? state.eventLog : [];
  const seat = seatId ? findSeat(session, seatId) : null;
  const entry = {
    id: randomId('pzevt'),
    at: now(),
    type: String(type || 'event'),
    seatId: seatId || null,
    seatLabel: seat?.displayName || null,
    message: String(message || '').trim(),
    gmOnly: Boolean(extra.gmOnly),
    tone: extra.tone || '',
    ...extra
  };
  state.eventLog.push(entry);
  state.eventLog = state.eventLog.slice(-80);
  return entry;
}

function aiDialogueFor(session, seatId, eventType, fallback) {
  const seat = findSeat(session, seatId);
  if (!isAutomatedSeat(seat)) return fallback;
  const profile = buildPazaakAiProfile(seat?.aiProfile || seat?.ai || 'medium');
  return randomPazaakDialogue(profile.personality, eventType, fallback);
}

function sideCardDialogueType(playedCard = {}) {
  const value = Number(playedCard.value || 0);
  if (value > 0) return 'playsPositiveCard';
  if (value < 0) return 'playsNegativeCard';
  return 'playsCard';
}

function nextPazaakSequence(state) {
  state.turnSequence = Number(state.turnSequence || 0) + 1;
  return state.turnSequence;
}

function resetPlayersForSet(session, state) {
  for (const seat of playableSeats(session.seats)) {
    const player = state.players[seat.seatId];
    player.hand = Array.isArray(player.hand) ? player.hand.filter(Boolean) : [];
    if (!player.matchHandDealt) {
      player.hand = buildOpeningHand(player.sideDeckIds);
      player.matchHandDealt = true;
      player.lastAction = `Drew ${PAZAAK_HAND_SIZE} random side-deck cards for the match.`;
    }
    const setsWon = Number(player.setsWon || 0);
    state.players[seat.seatId] = resetPazaakPlayerForSet(player);
    state.players[seat.seatId].setsWon = setsWon;
    state.players[seat.seatId].lockedScore = null;
    state.players[seat.seatId].turnDrawn = false;
    state.players[seat.seatId].turnPhase = 'waiting';
    state.players[seat.seatId].lastAction = `${state.players[seat.seatId].hand.length} match side-deck card${state.players[seat.seatId].hand.length === 1 ? '' : 's'} remain.`;
  }
}

function determineOpeningFirstSeat(session, state) {
  const order = getPlayerOrder(session);
  if (!order.length) return null;
  if (state.openingFirstSeatResolved && state.firstSeatId && order.includes(state.firstSeatId)) return state.firstSeatId;

  let contenders = order.slice();
  let deck = buildPazaakMainDeck();
  const drawHistory = [];
  for (let attempt = 1; attempt <= 12 && contenders.length > 1; attempt += 1) {
    const draws = contenders.map(seatId => {
      if (!deck.length) deck = buildPazaakMainDeck();
      const drawn = drawMainCard(deck);
      deck = Array.isArray(drawn.mainDeck) ? drawn.mainDeck : [];
      return { seatId, value: Number(drawn.card?.value || 0), label: drawn.card?.label || String(drawn.card?.value || '') };
    });
    const result = comparePazaakInitiativeDraws(draws);
    drawHistory.push({ attempt, draws: result.draws, highValue: result.highValue, tiedSeatIds: result.tiedSeatIds });
    contenders = result.winnerSeatId ? [result.winnerSeatId] : (result.tiedSeatIds.length ? result.tiedSeatIds : contenders);
  }

  const firstSeatId = contenders[0] || order[0];
  state.firstSeatId = firstSeatId;
  state.openingFirstSeatResolved = true;
  state.openingDrawHistory = drawHistory;
  const summary = drawHistory[0]?.draws?.map(entry => `${seatLabel(session, entry.seatId)} ${entry.label}`).join(' · ') || 'Opening high-card draw completed.';
  pushPazaakEvent(session, state, 'opening-high-card', firstSeatId, `${seatLabel(session, firstSeatId)} wins the opening high-card draw. ${summary}`, { tone: 'setup', drawHistory });
  return firstSeatId;
}

function dealOpeningMainCardsForSet(session, state) {
  for (const seatId of getPlayerOrder(session)) {
    const player = state.players?.[seatId];
    if (!player) continue;
    const card = drawPazaakMainCardForState(state);
    player.tableCards.push(card);
    player.score = scorePazaakPlayer(player);
    player.lastAction = `Opening draw: ${card?.label || card?.value || 'card'}.`;
    pushPazaakEvent(session, state, 'opening-main-card', seatId, `${seatLabel(session, seatId)} draws an opening ${card?.label || card?.value || 'card'}.`, { cardLabel: card?.label || String(card?.value || ''), tone: 'draw' });
  }
  updateScores(state);
}

function finalizeTurnStatus(session, state, seatId, { allowSafe = true } = {}) {
  const player = state.players?.[seatId];
  if (!player) return 'missing';
  const rawScore = scorePazaakPlayer(player);
  player.score = player.lockedScore != null ? Number(player.lockedScore) : rawScore;

  if (rawScore > PAZAAK_TARGET) {
    player.bust = true;
    player.stood = false;
    player.turnPhase = 'bust';
    player.lastAction = aiDialogueFor(session, seatId, 'busts', 'Busted.');
    pushPazaakEvent(session, state, 'bust', seatId, player.lastAction, { tone: 'danger' });
    return 'bust';
  }

  if (rawScore === PAZAAK_TARGET) {
    player.stood = true;
    player.lockedScore = PAZAAK_TARGET;
    player.score = PAZAAK_TARGET;
    player.turnPhase = 'stood';
    player.lastAction = aiDialogueFor(session, seatId, 'hits20', 'Reached 20 and stood automatically.');
    pushPazaakEvent(session, state, 'hit-twenty', seatId, player.lastAction, { tone: 'success' });
    return 'twenty';
  }

  if (hasFilledPazaakTable(player)) {
    player.filledTable = true;
    player.stood = true;
    player.lockedScore = PAZAAK_TARGET;
    player.score = PAZAAK_TARGET;
    player.turnPhase = 'stood';
    player.lastAction = 'Filled nine cards without busting and locked to 20.';
    pushPazaakEvent(session, state, 'filled-table', seatId, player.lastAction, { tone: 'success' });
    return 'filled';
  }

  player.score = rawScore;
  if (!allowSafe) return 'safe';
  player.turnPhase = 'post-draw';
  return 'safe';
}

function allPlayersDone(session, state) {
  return getPlayerOrder(session).every(seatId => {
    const player = state.players?.[seatId];
    return !player || player.stood || player.bust || player.filledTable;
  });
}

function chooseNextFirstSeat(session, state, winnerSeatId, tied) {
  const order = getPlayerOrder(session);
  if (!order.length) return null;
  if (winnerSeatId && order.includes(winnerSeatId)) return winnerSeatId;
  if (tied && state.firstSeatId && order.length > 1) {
    const index = order.indexOf(state.firstSeatId);
    return order[(index + 1) % order.length];
  }
  return state.firstSeatId || order[0];
}

function maybeResolveSet(session, state) {
  updateScores(state);
  const players = getPlayerOrder(session).map(seatId => state.players[seatId]).filter(Boolean);
  const immediateFill = players.find(player => player.filledTable && !player.bust);
  if (!immediateFill && !allPlayersDone(session, state)) return false;

  const result = immediateFill
    ? { winnerSeatId: immediateFill.seatId, tied: false, reason: 'Filled nine cards and locked to 20.' }
    : comparePazaakSet(players);

  state.setHistory.push({
    id: randomId('set'),
    setNumber: state.setNumber,
    winnerSeatId: result.winnerSeatId,
    winnerLabel: result.winnerSeatId ? seatLabel(session, result.winnerSeatId) : null,
    tied: Boolean(result.tied),
    reason: result.reason,
    scores: players.map(player => ({ seatId: player.seatId, score: effectiveScore(player), bust: Boolean(player.bust), filledTable: Boolean(player.filledTable) })),
    at: now()
  });
  pushPazaakEvent(session, state, result.winnerSeatId ? 'set-won' : 'set-tied', result.winnerSeatId, result.winnerSeatId ? `${seatLabel(session, result.winnerSeatId)} wins set ${state.setNumber}: ${result.reason}` : `Set ${state.setNumber} tied: ${result.reason}`, { setNumber: state.setNumber, tone: result.winnerSeatId ? 'success' : 'neutral' });

  if (result.winnerSeatId && state.players[result.winnerSeatId]) state.players[result.winnerSeatId].setsWon = Number(state.players[result.winnerSeatId].setsWon || 0) + 1;

  const matchWinner = Object.values(state.players).find(player => Number(player.setsWon || 0) >= PAZAAK_SETS_TO_WIN);
  if (matchWinner) {
    state.phase = 'complete';
    state.statusLabel = 'MATCH COMPLETE';
    state.activeSeatId = null;
    state.winnerSeatId = matchWinner.seatId;
    state.message = `${seatLabel(session, matchWinner.seatId)} wins the match.`;
    pushPazaakEvent(session, state, 'match-won', matchWinner.seatId, state.message, { tone: 'success' });
    return true;
  }

  const nextFirst = chooseNextFirstSeat(session, state, result.winnerSeatId, result.tied);
  state.message = result.winnerSeatId
    ? `${seatLabel(session, result.winnerSeatId)} wins set ${state.setNumber} (${result.reason}) and starts the next set.`
    : `Set ${state.setNumber} tied. ${seatLabel(session, nextFirst)} starts the next set.`;
  startNextSet(session, state, nextFirst);
  return true;
}

function nextSeatId(session, state, afterSeatId) {
  const order = getPlayerOrder(session);
  if (!order.length) return null;
  const start = Math.max(0, order.indexOf(afterSeatId));
  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidate = order[(start + offset) % order.length];
    const player = state.players?.[candidate];
    if (player && !player.stood && !player.bust && !player.filledTable) return candidate;
  }
  return null;
}

function beginTurn(session, state, seatId) {
  const player = state.players?.[seatId];
  if (!player || player.stood || player.bust || player.filledTable) return state;
  state.activeSeatId = seatId;
  player.turnPhase = 'draw';
  player.turnDrawn = false;
  player.sideCardPlayedThisTurn = false;

  if (player.tableCards.length >= PAZAAK_TABLE_LIMIT) {
    finalizeTurnStatus(session, state, seatId);
    maybeResolveSet(session, state);
    return state;
  }

  const card = drawPazaakMainCardForState(state);
  player.tableCards.push(card);
  player.turnDrawn = true;
  player.turnPhase = 'post-draw';
  player.lastAction = aiDialogueFor(session, seatId, 'drawsCard', `Drew ${card?.label || card?.value || 'a card'}.`);
  pushPazaakEvent(session, state, 'draw-main-card', seatId, player.lastAction, { cardLabel: card?.label || String(card?.value || ''), tone: 'draw' });

  const status = finalizeTurnStatus(session, state, seatId);
  if (['bust', 'twenty', 'filled'].includes(status)) advanceTurn(session, state, seatId);
  return state;
}

function advanceTurn(session, state, fromSeatId) {
  if (state.phase !== 'playing') return state;
  if (maybeResolveSet(session, state)) return state;
  const nextId = nextSeatId(session, state, fromSeatId);
  if (!nextId) {
    maybeResolveSet(session, state);
    return state;
  }
  beginTurn(session, state, nextId);
  return state;
}

function startNextSet(session, state, firstSeatId = null) {
  state.phase = 'playing';
  state.statusLabel = 'PLAYING';
  state.setNumber = Number(state.setNumber || 0) + 1;
  state.mainDeck = buildPazaakMainDeck();
  state.discard = [];
  state.debug = state.debug && typeof state.debug === 'object' ? state.debug : { rngLabel: randomId('pazaak_rng') };
  state.debug.lastDeckState = { setNumber: state.setNumber, mainDeckCount: state.mainDeck.length, discardCount: 0, at: now() };
  resetPlayersForSet(session, state);
  const order = getPlayerOrder(session);
  const chosenFirst = state.setNumber === 1 && !state.openingFirstSeatResolved
    ? determineOpeningFirstSeat(session, state)
    : (firstSeatId && order.includes(firstSeatId) ? firstSeatId : (state.firstSeatId && order.includes(state.firstSeatId) ? state.firstSeatId : order[0]));
  state.firstSeatId = chosenFirst;
  state.activeSeatId = chosenFirst;
  dealOpeningMainCardsForSet(session, state);
  state.message = `Set ${state.setNumber}: ${seatLabel(session, chosenFirst)} acts first after opening cards are dealt.`;
  pushPazaakEvent(session, state, 'set-started', chosenFirst, state.message, { setNumber: state.setNumber, tone: 'setup', rngLabel: state.debug?.rngLabel, mainDeckCount: state.mainDeck.length, gmOnly: true });
  pushPazaakEvent(session, state, 'set-public-started', chosenFirst, state.message, { setNumber: state.setNumber, tone: 'setup' });
  beginTurn(session, state, chosenFirst);
  return state;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms || 0) || 0)));
}

function setAiThinkingState(session, state, seat, profile) {
  const delayMs = PazaakAi.thinkingDelayMs(profile);
  const message = randomPazaakDialogue(profile.personality, 'thinking', 'Considers the next Pazaak move.');
  state.aiThinking = { active: true, seatId: seat.seatId, seatLabel: seat.displayName || seatLabel(session, seat.seatId), intensity: 'normal', difficulty: profile.difficulty, delayMs, startedAt: now(), message };
  if (state.players?.[seat.seatId]) state.players[seat.seatId].lastAction = message;
  pushPazaakEvent(session, state, 'ai-thinking', seat.seatId, message, { tone: 'thinking', intensity: 'normal', delayMs });
  return state.aiThinking;
}

function clearAiThinkingState(state) {
  if (state) state.aiThinking = null;
}

function applyAutomatedTurnChoice(session, state, seat, player, profile, choice) {
  if (choice.type === 'play-side-card') return applySeatSideCard(session, state, seat, player, choice.cardInstanceId, choice.choice || {}, profile);
  if (choice.type === 'stand') return applySeatStand(session, state, seat, player, profile, choice);
  return applySeatEndTurn(session, state, seat, player, profile, choice);
}

async function processAutomatedTurns(session, state) {
  let workingSession = session;
  let guard = 0;
  while (state.phase === 'playing' && state.activeSeatId && guard < 30) {
    guard += 1;
    const seat = findSeat(workingSession, state.activeSeatId);
    if (!isAutomatedSeat(seat)) break;
    const player = state.players[state.activeSeatId];
    if (!player || player.stood || player.bust || player.filledTable) {
      advanceTurn(workingSession, state, state.activeSeatId);
      continue;
    }
    const profile = buildPazaakAiProfile(seat?.aiProfile || seat?.ai || 'medium');
    const thinking = setAiThinkingState(workingSession, state, seat, profile);
    const thinkingSession = await persistPazaakSession(workingSession, state, 'active', sessionLogEntry('pazaak-ai-thinking', seat.recipientId || seat.seatId, { seatId: seat.seatId, delayMs: thinking.delayMs }));
    workingSession = thinkingSession || workingSession;
    GameNotificationService.emitSessionUpdated(workingSession, { pazaakPhase: state.phase, action: 'pazaak-ai-thinking' });
    await sleep(Math.max(0, Math.min(Number(thinking.delayMs || 0), 5000)));
    clearAiThinkingState(state);
    const choice = PazaakAi.chooseTurn(player, profile, { nextMainCard: Array.isArray(state.mainDeck) ? state.mainDeck[0] : null, state, session: workingSession });
    applyAutomatedTurnChoice(workingSession, state, seat, player, profile, choice);
  }
  clearAiThinkingState(state);
  return { session: workingSession, state };
}

function sessionLogEntry(type, by, extra = {}) {
  return { id: randomId('log'), at: now(), type, by, ...extra };
}

function otherPlayableSeat(session, seatId) {
  return playableSeats(session.seats).find(seat => seat.seatId !== seatId && seat.status !== 'forfeited') ?? null;
}

async function persistPazaakSession(session, state, status, logEntry) {
  return GameSessionStore.upsertSession({
    ...session,
    status,
    gameState: state,
    log: [...(session.log ?? []), logEntry].filter(Boolean)
  });
}

function applySeatSideCard(session, state, seat, player, cardInstanceId, choice = {}, profile = null) {
  const currentScore = scorePazaakPlayer(player);
  if (currentScore > PAZAAK_TARGET) {
    player.bust = true;
    player.lastAction = aiDialogueFor(session, seat.seatId, 'busts', 'Busted before a side card could be played.');
    pushPazaakEvent(session, state, 'bust', seat.seatId, player.lastAction, { tone: 'danger' });
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }
  if (player.sideCardPlayedThisTurn) return { ok: false, error: 'Only one side card can be played after the mandatory draw.' };

  const result = applyPazaakSideCard(player, String(cardInstanceId || ''), choice);
  if (!result.ok) return result;
  state.players[seat.seatId] = result.player;
  const next = state.players[seat.seatId];
  next.sideCardPlayedThisTurn = true;
  next.turnPhase = 'action-spent';
  if (result.playedCard?.tiebreaker) next.tiebreakerPlayedAt = nextPazaakSequence(state);
  const eventType = sideCardDialogueType(result.playedCard);
  const label = result.playedCard?.label || 'a side card';
  next.lastAction = profile ? randomPazaakDialogue(profile.personality, eventType, `Played ${label}.`) : aiDialogueFor(session, seat.seatId, eventType, `Played ${label}.`);
  pushPazaakEvent(session, state, 'play-side-card', seat.seatId, next.lastAction, { cardLabel: label, tone: result.playedCard?.tone || 'card' });

  finalizeTurnStatus(session, state, seat.seatId);
  if (!next.stood && !next.bust && !next.filledTable) {
    next.lastAction = 'Played a side card and ended the turn.';
    pushPazaakEvent(session, state, 'end-turn', seat.seatId, next.lastAction, { tone: 'turn' });
  }
  advanceTurn(session, state, seat.seatId);
  return { ok: true };
}

function applySeatStand(session, state, seat, player, profile = null, choice = {}) {
  const status = finalizeTurnStatus(session, state, seat.seatId);
  if (status === 'bust') {
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }
  if (!player.stood) {
    player.stood = true;
    player.turnPhase = 'stood';
    player.score = scorePazaakPlayer(player);
    player.lastAction = choice.forceIntuition?.line || (profile ? randomPazaakDialogue(profile.personality, 'stand', 'Stood.') : aiDialogueFor(session, seat.seatId, 'stand', 'Stood.'));
    if (choice.forceIntuition) pushPazaakEvent(session, state, 'force-nudge', seat.seatId, choice.forceIntuition.line, { feeling: choice.forceIntuition.feeling, tone: 'force' });
    pushPazaakEvent(session, state, 'stand', seat.seatId, player.lastAction, { tone: 'stand' });
  }
  advanceTurn(session, state, seat.seatId);
  return { ok: true };
}

function applySeatEndTurn(session, state, seat, player, profile = null, choice = {}) {
  const status = finalizeTurnStatus(session, state, seat.seatId);
  if (status === 'safe') {
    player.turnPhase = 'waiting';
    player.lastAction = choice.forceIntuition?.line || (profile ? randomPazaakDialogue(profile.personality, 'drawsCard', 'Ended turn.') : aiDialogueFor(session, seat.seatId, 'stay', 'Ended turn.'));
    if (choice.forceIntuition) pushPazaakEvent(session, state, 'force-nudge', seat.seatId, choice.forceIntuition.line, { feeling: choice.forceIntuition.feeling, tone: 'force' });
    pushPazaakEvent(session, state, 'end-turn', seat.seatId, player.lastAction, { tone: 'turn' });
  }
  advanceTurn(session, state, seat.seatId);
  return { ok: true };
}

export class PazaakEngine {
  static isPazaakSession(session = {}) {
    return session?.gameId === 'pazaak';
  }

  static getState(session = {}) {
    return ensurePazaakState(session);
  }

  static findSeatForActor(session = {}, actor = null, participantId = null) {
    const userId = currentUserId();
    const preferredParticipantId = participantId || participantIdForActor(actor);
    return playableSeats(session.seats).find(seat => {
      if (preferredParticipantId && seat.recipientId === preferredParticipantId) return true;
      if (actor?.id && seat.actorId === actor.id) return true;
      if (userId && seat.userId === userId) return true;
      return false;
    }) ?? null;
  }

  static async createSoloAiSession({ actor, actorId = null, title = '', sessionId = null, requesterId = null, rulesMode = 'republic-senate', creditBuyIn = 0 } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    const resolvedSessionId = sessionId || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`;
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-solo-pazaak', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId, rulesMode, creditBuyIn });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    actor = resolvedActor;
    actorId = actor?.id ?? actorId ?? null;
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const normalizedBuyIn = Number(creditBuyIn || 0) || 0;
    const safeRulesMode = rulesMode === 'wagered' && settings.allowWagers && settings.allowCreditWagers && normalizedBuyIn > 0 ? 'wagered' : 'republic-senate';
    const wagerProfile = safeRulesMode === 'wagered'
      ? GameCreditEscrowService.buildCreditWagerProfile({ buyIn: Math.min(normalizedBuyIn, Number(settings.maxCreditWager || 0) || normalizedBuyIn), houseStake: Math.min(normalizedBuyIn, Number(settings.maxCreditWager || 0) || normalizedBuyIn) })
      : { mode: 'none' };
    const hostSeat = { seatId: 'seat_host', type: requester?.isGM ? 'gm' : 'player', userId, actorId, recipientId: hostRecipientId, displayName: actorDisplay(actor), avatar: actorImg(actor), status: 'host' };
    const requestedFairness = settings.defaultAiFairness || 'fair';
    const safeFairness = requestedFairness === 'cheating' && (!settings.allowCheatingAi || settings.requireGmApprovalForCheatingAi)
      ? 'fair'
      : (requestedFairness === 'houseEdge' && !settings.allowHouseEdgeAi ? 'fair' : requestedFairness);
    const generatedOpponent = await GameOpponentProfileService.buildPazaakAiOpponentProfile({ difficulty: settings.defaultAiDifficulty || 'medium', fairness: safeFairness, personality: settings.defaultAiPersonality || 'random' });
    const aiProfile = buildPazaakAiProfile(generatedOpponent);
    const aiSeat = { seatId: 'seat_ai', type: 'ai', userId: null, actorId: null, recipientId: null, displayName: aiProfile.name || 'Dealer Droid RX-44', avatar: aiProfile.kind === 'living' ? 'icons/svg/mystery-man.svg' : 'icons/commodities/tech/cog-bronze.webp', status: 'accepted', profession: aiProfile.profession || '', tableFact: aiProfile.tableFact || '', aiProfile, aiDifficulty: aiProfile.difficulty, aiFairness: aiProfile.fairness, aiPersonality: aiProfile.personality };
    const shell = { id: resolvedSessionId, gameId: 'pazaak', title: title || `${actorDisplay(actor)} vs Dealer Droid`, status: 'active', authorityMode: safeRulesMode === 'wagered' ? 'gm' : 'host', hostUserId: userId, hostActorId: actorId, holonetThreadId: null, holonetMessageId: null, seats: [hostSeat, aiSeat], rulesMode: safeRulesMode, wagerProfile, prizeProfile: { enabled: false }, escrow: {}, metadata: { createdBy: hostRecipientId, mode: 'solo-ai', creditWagerRequested: safeRulesMode === 'wagered', aiProfile }, log: [sessionLogEntry('solo-ai-created', hostRecipientId)] };
    shell.gameState = ensurePazaakState(shell);
    let updated = null;
    if (GameCreditEscrowService.isCreditWager(shell)) updated = (await GameCreditEscrowService.prepareEscrow(shell, { by: hostRecipientId })).session || shell;
    else updated = await GameSessionStore.upsertSession(shell);
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: 'create-solo-pazaak' });
    return updated;
  }

  static async lockSideDeck({ sessionId, seatId, cardIds = [], actor = null, actorId = null, participantId = null } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('lock-pazaak-side-deck', { sessionId, seatId, cardIds, actorId: resolvedActor?.id ?? actorId ?? null, participantId });
      return { pending: true, requestId, sessionId };
    }
    actor = resolvedActor;
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'pazaak') return { ok: false, error: 'Pazaak session not found.' };
    const seat = seatId ? findSeat(session, seatId) : this.findSeatForActor(session, actor, participantId);
    if (!seat) return { ok: false, error: 'No matching seat found for this actor.' };
    if (isAutomatedSeat(seat)) return { ok: false, error: 'Automated seats choose their own side deck.' };
    const validation = validateSideDeck(cardIds);
    if (!validation.valid) return { ok: false, error: validation.errors.join(' ') };
    if (GameCreditEscrowService.isCreditWager(session) && session.escrow?.credits?.status !== 'escrowed') return { ok: false, error: session.escrow?.credits?.error || 'Credit buy-in escrow must complete before side decks can lock.' };

    let workingSession = session;
    const state = ensurePazaakState(session);
    state.players[seat.seatId] ??= buildPlayerStateForSeat(seat);
    state.players[seat.seatId].sideDeckIds = validation.cardIds;
    state.players[seat.seatId].sideDeckLocked = true;
    state.players[seat.seatId].lastAction = 'Side deck locked.';
    state.message = `${seat.displayName} locked a legal ${PAZAAK_SIDE_DECK_SIZE}-card side deck.`;
    pushPazaakEvent(session, state, 'side-deck-locked', seat.seatId, state.message, { tone: 'setup' });

    if (allDecksLocked(session, state)) {
      startNextSet(session, state, state.firstSeatId);
      const processed = await processAutomatedTurns(session, state);
      workingSession = processed.session || session;
    }
    const updated = await GameSessionStore.upsertSession({ ...workingSession, status: 'active', gameState: state, log: [...(workingSession.log ?? []), sessionLogEntry('pazaak-side-deck-locked', seat.recipientId || seat.seatId, { seatId: seat.seatId })] });
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: 'lock-pazaak-side-deck' });
    return { ok: true, session: updated };
  }

  static async submitAction({ sessionId, seatId, action, payload = {}, actorId = null, requesterId = null } = {}) {
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('pazaak-action', { sessionId, seatId, action, payload, actorId, requesterId });
      return { pending: true, requestId, sessionId };
    }
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'pazaak') return { ok: false, error: 'Pazaak session not found.' };
    const state = ensurePazaakState(session);
    const normalizedAction = String(action || '').trim();

    if (normalizedAction === 'cancel-session') return this.#cancelSession(session, state, payload, requesterId);

    const seat = findSeat(session, seatId);
    if (!seat) return { ok: false, error: 'Seat not found.' };
    const player = state.players?.[seat.seatId];
    if (!player) return { ok: false, error: 'Player state missing.' };

    if (normalizedAction === 'forfeit') return this.#forfeit(session, state, seat, player);
    if (state.phase !== 'playing') return { ok: false, error: 'The Pazaak match is not in play.' };
    if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s turn.' };
    if (player.stood || player.bust || player.filledTable) return { ok: false, error: 'This seat has already finished the set.' };
    if (!player.turnDrawn) return { ok: false, error: 'Mandatory draw has not resolved for this turn.' };

    let actionResult = { ok: true };
    if (normalizedAction === 'play-side-card') actionResult = applySeatSideCard(session, state, seat, player, String(payload.cardInstanceId || payload.cardId || ''), payload.choice || {});
    else if (normalizedAction === 'stand') actionResult = applySeatStand(session, state, seat, player, null, payload);
    else if (normalizedAction === 'end-turn') actionResult = applySeatEndTurn(session, state, seat, player, null, payload);
    else return { ok: false, error: 'Unknown Pazaak action.' };
    if (!actionResult.ok) return actionResult;

    const processedAutomated = await processAutomatedTurns(session, state);
    const workingSession = processedAutomated.session || session;
    const updatedStatus = state.phase === 'complete' ? 'complete' : 'active';
    let updated = await persistPazaakSession(workingSession, state, updatedStatus, sessionLogEntry(`pazaak-${normalizedAction}`, seat.recipientId || seat.seatId, { seatId: seat.seatId }));
    if (updatedStatus === 'complete' && GameCreditEscrowService.isCreditWager(updated)) {
      const settled = await GameCreditEscrowService.settleSession(updated, { winnerSeatId: state.winnerSeatId, reason: `${seatLabel(updated, state.winnerSeatId)} wins ${updated.title || 'Pazaak'}` });
      updated = settled.session || updated;
    }
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: `pazaak-${normalizedAction}` });
    return { ok: true, session: updated };
  }

  static async #cancelSession(session, state, payload = {}, requesterId = null) {
    const requestedBy = requesterId || currentUserId();
    const isSocketRelay = Boolean(requesterId && requesterId !== currentUserId());
    const isHost = requestedBy && requestedBy === session.hostUserId;
    if ((isSocketRelay && !isHost) || (!game.user?.isGM && !isHost)) return { ok: false, error: 'Only the host or GM can cancel this Pazaak table.' };
    state.phase = 'cancelled';
    state.statusLabel = 'CANCELLED';
    state.activeSeatId = null;
    state.message = payload.reason || 'The Pazaak table was cancelled.';
    pushPazaakEvent(session, state, 'session-cancelled', null, state.message, { tone: 'danger' });
    let updated = await persistPazaakSession(session, state, 'cancelled', sessionLogEntry('pazaak-cancelled', requestedBy, { reason: state.message }));
    if (GameCreditEscrowService.isCreditWager(updated) && ['escrowed', 'payout-failed'].includes(updated.escrow?.credits?.status)) updated = (await GameCreditEscrowService.refundSession(updated, state.message)).session || updated;
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: 'pazaak-cancel-session' });
    return { ok: true, session: updated };
  }

  static async #forfeit(session, state, seat, player) {
    if (!['setup', 'playing'].includes(state.phase)) return { ok: false, error: 'Only an active or setup Pazaak table can be forfeited.' };
    player.forfeited = true;
    player.bust = true;
    player.stood = false;
    player.lastAction = 'Forfeited the match.';
    const winnerSeat = otherPlayableSeat(session, seat.seatId);
    if (winnerSeat && state.players?.[winnerSeat.seatId]) {
      state.players[winnerSeat.seatId].setsWon = PAZAAK_SETS_TO_WIN;
      state.winnerSeatId = winnerSeat.seatId;
      state.message = `${seat.displayName} forfeited. ${winnerSeat.displayName} wins the match.`;
      pushPazaakEvent(session, state, 'forfeit', seat.seatId, `${seat.displayName} forfeited the match.`, { tone: 'danger' });
      pushPazaakEvent(session, state, 'match-won', winnerSeat.seatId, `${winnerSeat.displayName} wins by forfeit.`, { tone: 'success' });
    } else {
      state.winnerSeatId = null;
      state.message = `${seat.displayName} forfeited. No winner was available.`;
      pushPazaakEvent(session, state, 'forfeit', seat.seatId, state.message, { tone: 'danger' });
    }
    state.phase = 'complete';
    state.statusLabel = 'MATCH COMPLETE';
    state.activeSeatId = null;
    let updated = await persistPazaakSession(session, state, 'complete', sessionLogEntry('pazaak-forfeit', seat.recipientId || seat.seatId, { seatId: seat.seatId, winnerSeatId: state.winnerSeatId }));
    if (GameCreditEscrowService.isCreditWager(updated)) {
      if (state.winnerSeatId) updated = (await GameCreditEscrowService.settleSession(updated, { winnerSeatId: state.winnerSeatId, reason: `${seatLabel(updated, state.winnerSeatId)} wins ${updated.title || 'Pazaak'} by forfeit` })).session || updated;
      else if (['escrowed', 'payout-failed'].includes(updated.escrow?.credits?.status)) updated = (await GameCreditEscrowService.refundSession(updated, 'Pazaak match forfeited without a valid winner.')).session || updated;
    }
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: 'pazaak-forfeit' });
    return { ok: true, session: updated };
  }
}
