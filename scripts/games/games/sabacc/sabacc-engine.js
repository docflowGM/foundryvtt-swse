import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import { buildSabaccDeck, drawSabaccCard, drawSabaccCards, shiftSabaccCard, SABACC_STARTING_HAND_SIZE, SABACC_TARGET } from './sabacc-deck.js';
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
function isAutomatedSeat(seat = {}) { return seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile; }
function playableSeats(seats = []) { return (Array.isArray(seats) ? seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status)); }
function seatLabel(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }
function getOrder(session = {}) { return playableSeats(session.seats).map(seat => seat.seatId).filter(Boolean); }
function findSeat(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId === seatId) ?? null; }
function otherPlayableSeat(session, seatId) { return playableSeats(session.seats).find(seat => seat.seatId !== seatId) ?? null; }

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
    version: 1,
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
  for (const seat of playableSeats(session.seats)) {
    state.players[seat.seatId] ??= buildPlayerState(seat);
    state.players[seat.seatId].seatId = seat.seatId;
  }
  return state;
}

function pushEvent(session, state, type, seatId, message, data = {}) {
  state.eventLog ??= [];
  state.eventLog.unshift({ id: randomId('sab_evt'), at: now(), type, seatId: seatId || null, seatLabel: seatId ? seatLabel(session, seatId) : null, message: String(message || ''), tone: data.tone || 'neutral', ...data });
  state.eventLog = state.eventLog.slice(0, 30);
}

function publicCardActionMessage(seat = {}, verb = 'acts') {
  return `${seat.displayName || 'Seat'} ${verb} a card.`;
}

function attachAiDecision(player = {}, payload = {}) {
  if (payload?.ai) player.lastAiDecision = payload.ai;
}

function updateEvaluations(state) {
  for (const player of Object.values(state.players ?? {})) {
    player.evaluation = evaluateSabaccHand(player.hand || []);
    player.bombedOut = Boolean(player.evaluation.bombedOut);
  }
  return state;
}

function nextSeatId(session, state, afterSeatId) {
  const order = getOrder(session);
  if (!order.length) return null;
  const index = Math.max(0, order.indexOf(afterSeatId));
  for (let i = 1; i <= order.length; i += 1) {
    const candidate = order[(index + i) % order.length];
    const player = state.players?.[candidate];
    if (player && !player.called && !player.folded) return candidate;
  }
  return null;
}

function allCalledOrOut(session, state) {
  return getOrder(session).every(seatId => {
    const player = state.players?.[seatId];
    return !player || player.called || player.folded || player.bombedOut;
  });
}

function beginHand(session, state) {
  state.phase = 'drawing';
  state.statusLabel = 'DRAWING';
  state.round = Number(state.round || 0) + 1;
  state.deck = buildSabaccDeck();
  state.discard = [];
  state.winnerSeatId = null;
  state.handPot = Number(state.handPot || 0);
  state.sabaccPot = Number(state.sabaccPot || 0);
  for (const seat of playableSeats(session.seats)) {
    const player = state.players[seat.seatId] ?? buildPlayerState(seat);
    const drawn = drawSabaccCards(state.deck, SABACC_STARTING_HAND_SIZE);
    state.deck = drawn.deck;
    player.hand = drawn.cards;
    player.called = false;
    player.folded = false;
    player.bombedOut = false;
    player.contribution = Number(player.contribution || 0) + Number(state.ante || 0) + Number(state.sabaccAnte || 0);
    player.lastAction = `Anted ${Number(state.ante || 0)} to the hand pot and ${Number(state.sabaccAnte || 0)} to the Sabacc pot.`;
    player.lastAiDecision = null;
    state.handPot += Number(state.ante || 0);
    state.sabaccPot += Number(state.sabaccAnte || 0);
    state.players[seat.seatId] = player;
  }
  updateEvaluations(state);
  const order = getOrder(session);
  state.activeSeatId = order.find(id => id !== state.dealerSeatId) || order[0] || null;
  state.message = `Round ${state.round}: cards dealt. ${seatLabel(session, state.activeSeatId)} acts first.`;
  pushEvent(session, state, 'hand-started', state.activeSeatId, state.message, { tone: 'setup' });
  return state;
}

function resolveHand(session, state) {
  updateEvaluations(state);
  const entries = getOrder(session).map(seatId => ({ seatId, cards: state.players[seatId]?.hand || [], evaluation: state.players[seatId]?.evaluation })).filter(entry => !state.players[entry.seatId]?.folded);
  const result = compareSabaccHands(entries);
  state.phase = result.specialWinner ? 'complete' : 'hand-complete';
  state.statusLabel = result.specialWinner ? 'GAME COMPLETE' : 'HAND COMPLETE';
  state.activeSeatId = null;
  state.winnerSeatId = result.winnerSeatId;
  const potWon = Number(state.handPot || 0) + (result.specialWinner ? Number(state.sabaccPot || 0) : 0);
  if (result.winnerSeatId && state.players[result.winnerSeatId]) {
    state.players[result.winnerSeatId].wins = Number(state.players[result.winnerSeatId].wins || 0) + 1;
    state.players[result.winnerSeatId].lastAction = result.specialWinner ? `Claims the hand pot and Sabacc pot with ${result.reason}.` : `Claims the hand pot with ${result.reason}.`;
  }
  state.handHistory.unshift({ id: randomId('sab_hand'), round: state.round, winnerSeatId: result.winnerSeatId, winnerLabel: result.winnerSeatId ? seatLabel(session, result.winnerSeatId) : null, reason: result.reason, specialWinner: result.specialWinner, handPot: Number(state.handPot || 0), sabaccPot: Number(state.sabaccPot || 0), potWon, at: now() });
  state.handHistory = state.handHistory.slice(0, 12);
  state.message = result.winnerSeatId ? `${seatLabel(session, result.winnerSeatId)} wins the hand with ${result.reason}.` : 'No one wins the hand.';
  if (result.specialWinner && result.winnerSeatId) state.message = `${seatLabel(session, result.winnerSeatId)} wins the game with ${result.reason} and takes both pots.`;
  pushEvent(session, state, result.specialWinner ? 'special-win' : 'hand-won', result.winnerSeatId, state.message, { tone: result.specialWinner ? 'success' : 'neutral', potWon });
  state.handPot = 0;
  if (result.specialWinner) state.sabaccPot = 0;
  return state;
}

function advanceTurn(session, state, fromSeatId) {
  updateEvaluations(state);
  if (allCalledOrOut(session, state)) return resolveHand(session, state);
  const next = nextSeatId(session, state, fromSeatId);
  if (!next) return resolveHand(session, state);
  state.activeSeatId = next;
  state.message = `${seatLabel(session, next)} is deciding whether to draw, shift, or call.`;
  return state;
}

async function persist(session, state, status = 'active', logEntry = null) {
  return GameSessionStore.upsertSession({ ...session, status, gameState: state, log: [...(session.log ?? []), logEntry].filter(Boolean) });
}

async function processAi(session, state) {
  let guard = 0;
  while (state.phase === 'drawing' && state.activeSeatId && guard < 20) {
    guard += 1;
    const seat = findSeat(session, state.activeSeatId);
    if (!isAutomatedSeat(seat)) break;
    const player = state.players[seat.seatId];
    const choice = SabaccAi.chooseAction({ player, state, aiProfile: seat.aiProfile || seat.aiDifficulty || 'medium' });
    if (choice?.gmControlled) break;
    applyActionToState(session, state, seat, choice.type, choice);
  }
  return { session, state };
}

function applyActionToState(session, state, seat, action, payload = {}) {
  const player = state.players?.[seat.seatId];
  if (!player) return { ok: false, error: 'Sabacc player missing.' };
  if (action === 'start-hand') {
    beginHand(session, state);
    return { ok: true };
  }
  if (state.phase !== 'drawing') return { ok: false, error: 'This Sabacc hand is not accepting actions.' };
  if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s Sabacc turn.' };

  if (action === 'draw-card') {
    const drawn = drawSabaccCard(state.deck);
    state.deck = drawn.deck;
    player.hand.push(drawn.card);
    attachAiDecision(player, payload);
    player.lastAction = 'Draws a card.';
    pushEvent(session, state, 'draw-card', seat.seatId, publicCardActionMessage(seat, 'draws'), { tone: 'draw', ai: payload.ai || null });
    updateEvaluations(state);
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'discard-card') {
    const cardId = String(payload.cardId || payload.cardInstanceId || '');
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
    player.hand[index] = shiftSabaccCard(old);
    attachAiDecision(player, payload);
    player.lastAction = 'Shifts a card.';
    pushEvent(session, state, 'shift-card', seat.seatId, publicCardActionMessage(seat, 'shifts'), { tone: 'shift', ai: payload.ai || null });
    updateEvaluations(state);
    advanceTurn(session, state, seat.seatId);
    return { ok: true };
  }

  if (action === 'call-hand') {
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

  static async createSoloAiSession({ actor, actorId = null, title = '', sessionId = null, requesterId = null, rulesMode = 'republic-senate' } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    const resolvedSessionId = sessionId || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`;
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-solo-sabacc', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId, rulesMode });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const generated = await GameOpponentProfileService.buildPazaakAiOpponentProfile({ difficulty: settings.defaultAiDifficulty || 'medium', fairness: settings.defaultAiFairness || 'fair', personality: settings.defaultAiPersonality || 'random' });
    const aiProfile = buildSabaccAiProfile(generated);
    const hostSeat = { seatId: 'seat_host', type: requester?.isGM ? 'gm' : 'player', userId, actorId: resolvedActor?.id ?? actorId ?? null, recipientId: hostRecipientId, displayName: actorDisplay(resolvedActor), avatar: actorImg(resolvedActor), status: 'host' };
    const aiSeat = { seatId: 'seat_ai', type: 'ai', userId: null, actorId: null, recipientId: null, displayName: aiProfile.name || 'Sabacc Dealer Droid', avatar: 'icons/commodities/tech/cog-bronze.webp', status: 'accepted', profession: aiProfile.profession || '', tableFact: aiProfile.tableFact || '', aiProfile, aiDifficulty: aiProfile.difficulty, aiFairness: aiProfile.fairness, aiPersonality: aiProfile.personality };
    const shell = { id: resolvedSessionId, gameId: 'sabacc', title: title || `${actorDisplay(resolvedActor)} at the Sabacc Table`, status: 'active', authorityMode: 'host', hostUserId: userId, hostActorId: resolvedActor?.id ?? actorId ?? null, seats: [hostSeat, aiSeat], rulesMode: 'republic-senate', wagerProfile: { mode: 'none' }, prizeProfile: { enabled: false }, escrow: {}, metadata: { createdBy: hostRecipientId, mode: 'solo-ai', sabaccAnte: 10, sabaccPotAnte: 5, aiProfile }, log: [sessionLogEntry('solo-ai-sabacc-created', hostRecipientId)] };
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
      const updated = await persist(session, state, 'cancelled', sessionLogEntry('sabacc-cancelled', requesterId || currentUserId(), { reason: state.message }));
      GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: 'sabacc-cancel-session' });
      return { ok: true, session: updated };
    }
    if (normalized === 'next-hand') {
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
    const updated = await persist(session, state, status, sessionLogEntry(`sabacc-${normalized}`, seat.recipientId || seat.seatId, { seatId: seat.seatId }));
    GameNotificationService.emitSessionUpdated(updated, { sabaccPhase: updated.gameState?.phase, action: `sabacc-${normalized}` });
    return { ok: true, session: updated };
  }
}
