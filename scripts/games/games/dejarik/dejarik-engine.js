import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import { buildDejarikBoard, defaultStartingSpaces } from './dejarik-board.js';
import { DEJARIK_PIECES, defaultDejarikTeam, getDejarikPiece } from './dejarik-pieces.js';
import { canAttackPiece, canMovePiece, dejarikRulesModeLabel, legalAttackTargets, legalMoveSpaceIds, normalizeDejarikRulesMode, resolveDejarikAttack, winnerSeatId } from './dejarik-rules.js';
import { DejarikAi } from './dejarik-ai.js';

function clone(value) { if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value); return JSON.parse(JSON.stringify(value ?? null)); }
function randomId(prefix = 'dej') { return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`; }
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
function sessionLogEntry(type, by, data = {}) { return { id: randomId('log'), at: now(), type, by: by ?? null, data }; }
function requestedDejarikRulesMode(session = {}) { return normalizeDejarikRulesMode(session.metadata?.dejarikRulesMode || session.dejarikRulesMode || session.rulesMode); }


function allowedDejarikMonsterIds(session = {}, state = {}) {
  const fromState = Array.isArray(state.draft?.allowedMonsterIds) ? state.draft.allowedMonsterIds : [];
  const fromMeta = Array.isArray(session.metadata?.allowedDejarikMonsterIds) ? session.metadata.allowedDejarikMonsterIds : [];
  const allowed = (fromState.length ? fromState : fromMeta.length ? fromMeta : DEJARIK_PIECES.map(piece => piece.id))
    .map(id => String(id || '').trim())
    .filter(id => DEJARIK_PIECES.some(piece => piece.id === id));
  return Array.from(new Set(allowed));
}

function normalizeMonsterSelection(ids = [], allowed = []) {
  const allowedSet = new Set(allowedDejarikMonsterIds({ metadata: { allowedDejarikMonsterIds: allowed } }, { draft: { allowedMonsterIds: allowed } }));
  const selected = [];
  for (const id of (Array.isArray(ids) ? ids : [ids])) {
    const safe = String(id || '').trim();
    if (!safe || !allowedSet.has(safe) || selected.includes(safe)) continue;
    selected.push(safe);
    if (selected.length >= 4) break;
  }
  return selected;
}

function randomDejarikTeam(allowed = [], avoid = []) {
  const pool = allowedDejarikMonsterIds({ metadata: { allowedDejarikMonsterIds: allowed } }, { draft: { allowedMonsterIds: allowed } });
  const avoidSet = new Set((Array.isArray(avoid) ? avoid : []).map(String));
  const preferred = pool.filter(id => !avoidSet.has(id));
  const source = preferred.length >= 4 ? preferred : pool;
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 4);
}

function buildDraftState(session = {}, rulesMode = requestedDejarikRulesMode(session)) {
  const seats = playableSeats(session.seats).slice(0, 2);
  const allowedMonsterIds = allowedDejarikMonsterIds(session);
  const playerSeatId = seats.find(seat => !isAutomatedSeat(seat))?.seatId || seats[0]?.seatId || null;
  return {
    engine: 'dejarik',
    version: 4,
    rulesMode,
    rulesModeLabel: dejarikRulesModeLabel(rulesMode),
    actionModel: rulesMode === 'classic-holochess' ? 'classic-two-action-foundation' : 'single-action',
    phase: 'draft',
    statusLabel: 'DRAFTING',
    board: buildDejarikBoard(),
    activeSeatId: playerSeatId,
    initiativeSeatId: playerSeatId,
    pieces: {},
    draft: {
      playerSeatId,
      allowedMonsterIds,
      selectedMonsterIds: [],
      requiredCount: 4,
      aiSeatId: seats.find(seat => isAutomatedSeat(seat))?.seatId || seats.find(seat => seat.seatId !== playerSeatId)?.seatId || null
    },
    eventLog: [],
    winnerSeatId: null,
    message: 'Choose four holomonsters to deploy to the Dejarik board.'
  };
}

function deployDraftTeam(session = {}, state = {}, seat = {}, selectedMonsterIds = []) {
  if (state.phase !== 'draft') return { ok: false, error: 'This Dejarik board is not in the draft phase.' };
  const order = getOrder(session).slice(0, 2);
  if (!order.includes(seat.seatId)) return { ok: false, error: 'Only a board participant can deploy a Dejarik team.' };
  const allowed = allowedDejarikMonsterIds(session, state);
  const selected = normalizeMonsterSelection(selectedMonsterIds, allowed);
  if (selected.length !== 4) return { ok: false, error: 'Select exactly four Dejarik holomonsters before deploying.' };
  const playerSeatId = seat.seatId;
  const aiSeatId = order.find(id => id !== playerSeatId) || state.draft?.aiSeatId || null;
  if (!aiSeatId) return { ok: false, error: 'No opposing Dejarik seat is available.' };
  const aiTeam = randomDejarikTeam(allowed, selected);
  if (aiTeam.length !== 4) return { ok: false, error: 'The Dejarik AI could not assemble a four-monster team.' };
  const pieces = {};
  const playerSpaces = defaultStartingSpaces('alpha');
  const aiSpaces = defaultStartingSpaces('beta');
  selected.forEach((pieceId, index) => {
    const piece = buildPiece(pieceId, playerSeatId, playerSpaces[index]);
    pieces[piece.id] = piece;
  });
  aiTeam.forEach((pieceId, index) => {
    const piece = buildPiece(pieceId, aiSeatId, aiSpaces[index]);
    pieces[piece.id] = piece;
  });
  state.pieces = pieces;
  state.draft = { ...(state.draft || {}), selectedMonsterIds: selected, deployedMonsterIds: selected, aiMonsterIds: aiTeam, deployedAt: now() };
  state.phase = 'playing';
  state.statusLabel = 'PLAYING';
  state.activeSeatId = playerSeatId;
  state.initiativeSeatId = playerSeatId;
  state.message = `${seatLabel(session, playerSeatId)} deploys four holomonsters. ${seatLabel(session, aiSeatId)} answers with four of their own.`;
  pushEvent(session, state, 'draft-deployed', playerSeatId, state.message, { tone: 'setup', selectedMonsterIds: selected, aiMonsterIds: aiTeam });
  return { ok: true };
}

function buildPiece(pieceId, ownerSeatId, spaceId) {
  const def = getDejarikPiece(pieceId);
  return { id: randomId('piece'), creatureId: def.id, label: def.label, ownerSeatId, spaceId, previousSpaceId: null, atk: def.atk, hp: def.hp, maxHp: def.hp, rng: def.rng, mov: def.mov, classic: clone(def.classic || {}), attack: Number(def.classic?.attack || def.atk || 0), defense: Number(def.classic?.defense || def.hp || 0), movement: Number(def.classic?.movement || def.mov || 0), ability: def.ability, abilityLabel: def.abilityLabel, abilityDescription: def.abilityDescription, image: def.image, defeated: false, activated: false };
}

function buildState(session = {}) {
  const rulesMode = requestedDejarikRulesMode(session);
  return buildDraftState(session, rulesMode);
}

function resetMatchState(session = {}) {
  const fresh = buildState(session);
  fresh.eventLog.unshift({ id: randomId('dej_evt'), at: now(), type: 'rematch', seatId: null, seatLabel: null, message: 'The Dejarik holotable resets for a rematch.', tone: 'setup' });
  return fresh;
}

function ensureState(session = {}) {
  const state = session.gameState?.engine === 'dejarik' ? clone(session.gameState) : buildState(session);
  state.board = Array.isArray(state.board) && state.board.length ? state.board : buildDejarikBoard();
  state.pieces ??= {};
  state.rulesMode = normalizeDejarikRulesMode(state.rulesMode || session.metadata?.dejarikRulesMode || session.dejarikRulesMode || session.rulesMode);
  state.rulesModeLabel = dejarikRulesModeLabel(state.rulesMode);
  state.actionModel ||= state.rulesMode === 'classic-holochess' ? 'classic-two-action-foundation' : 'single-action';
  state.eventLog = Array.isArray(state.eventLog) ? state.eventLog : [];
  if (state.phase === 'draft') {
    state.draft = { ...(state.draft || {}) };
    state.draft.allowedMonsterIds = allowedDejarikMonsterIds(session, state);
    state.draft.selectedMonsterIds = normalizeMonsterSelection(state.draft.selectedMonsterIds || [], state.draft.allowedMonsterIds);
    state.draft.requiredCount = 4;
    state.activeSeatId ||= state.draft.playerSeatId || playableSeats(session.seats).find(seat => !isAutomatedSeat(seat))?.seatId || getOrder(session)[0] || null;
  }
  return state;
}

function pushEvent(session, state, type, seatId, message, data = {}) {
  state.eventLog ??= [];
  state.eventLog.unshift({ id: randomId('dej_evt'), at: now(), type, seatId: seatId || null, seatLabel: seatId ? seatLabel(session, seatId) : null, message: String(message || ''), tone: data.tone || 'neutral', ...data });
  state.eventLog = state.eventLog.slice(0, 30);
}


function nextSeatId(session, state, fromSeatId) {
  const order = getOrder(session);
  if (!order.length) return null;
  const index = Math.max(0, order.indexOf(fromSeatId));
  return order[(index + 1) % order.length] || order[0];
}

function endTurn(session, state, fromSeatId) {
  const winner = winnerSeatId(state);
  if (winner) {
    state.phase = 'complete';
    state.statusLabel = 'GAME COMPLETE';
    state.winnerSeatId = winner;
    state.activeSeatId = null;
    state.message = `${seatLabel(session, winner)} wins Dejarik.`;
    pushEvent(session, state, 'match-won', winner, state.message, { tone: 'success' });
    return state;
  }
  state.activeSeatId = nextSeatId(session, state, fromSeatId);
  state.message = `${seatLabel(session, state.activeSeatId)} activates a holomonster.`;
  return state;
}

function applyAction(session, state, seat, action, payload = {}) {
  if (state.phase !== 'playing') return { ok: false, error: 'This Dejarik match is not in play.' };
  if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s Dejarik turn.' };
  if (action === 'end-turn') { endTurn(session, state, seat.seatId); return { ok: true }; }
  const piece = state.pieces?.[String(payload.pieceId || '')];
  if (!piece || piece.ownerSeatId !== seat.seatId) return { ok: false, error: 'Choose one of your active pieces.' };
  if (action === 'move') {
    const check = canMovePiece(state, piece, String(payload.toSpaceId || ''));
    if (!check.ok) return check;
    piece.previousSpaceId = piece.spaceId;
    piece.spaceId = String(payload.toSpaceId);
    piece.activated = true;
    const attacksFromNewSpace = legalAttackTargets(state, piece).length;
    const movesFromNewSpace = legalMoveSpaceIds(state, piece).length;
    pushEvent(session, state, 'move', seat.seatId, `${piece.label} moves from ${piece.previousSpaceId} to ${piece.spaceId}. ${attacksFromNewSpace} target${attacksFromNewSpace === 1 ? '' : 's'} threatened.`, { tone: 'move', pieceId: piece.id, fromSpaceId: piece.previousSpaceId, toSpaceId: piece.spaceId, attacksFromNewSpace, movesFromNewSpace });
    endTurn(session, state, seat.seatId);
    return { ok: true };
  }
  if (action === 'attack') {
    const defender = state.pieces?.[String(payload.targetPieceId || '')];
    const check = canAttackPiece(piece, defender, state);
    if (!check.ok) return check;
    const resolved = resolveDejarikAttack(state, piece, defender, check);
    piece.activated = true;
    const rangeText = Number(check.distance || 0) > 1 ? ` at range ${check.distance}` : '';
    if (resolved.mode === 'classic-holochess') {
      const contest = `attack ${resolved.attackRoll?.total ?? '?'} vs defense ${resolved.defenseRoll?.total ?? '?'} (${resolved.margin >= 0 ? '+' : ''}${resolved.margin})`;
      const pushedLabel = resolved.pushedPieceId === piece.id ? piece.label : defender.label;
      const pushText = resolved.pushedTo ? ` ${pushedLabel} is pushed to ${resolved.pushedTo}.` : '';
      const outcomeText = resolved.attackerDefeated ? ` ${piece.label} is defeated by the counter.` : (defender.defeated ? ` ${defender.label} is defeated.` : pushText || ' No legal push space is available.');
      pushEvent(session, state, 'attack', `${seat.seatId}`, `${piece.label} contests ${defender.label}${rangeText}: ${contest}.${outcomeText}`, { tone: defender.defeated || resolved.attackerDefeated ? 'danger' : 'attack', attackerId: piece.id, defenderId: defender.id, beforeHp: resolved.beforeHp, afterHp: defender.hp, damage: resolved.damage, defeated: defender.defeated, attackerDefeated: resolved.attackerDefeated, distance: check.distance, effects: resolved.effects, pushedTo: resolved.pushedTo, classic: { attackTotal: resolved.attackRoll?.total, defenseTotal: resolved.defenseRoll?.total, margin: resolved.margin, outcome: resolved.outcome } });
    } else {
      const effectText = resolved.effects.includes('sacrifice') ? ` ${piece.label} sacrifices itself.` : (resolved.pushedTo ? ` ${defender.label} is pushed to ${resolved.pushedTo}.` : '');
      const outcomeText = defender.defeated ? ` ${defender.label} is defeated.` : ` ${defender.label} has ${defender.hp}/${defender.maxHp} HP left.`;
      pushEvent(session, state, 'attack', seat.seatId, `${piece.label} hits ${defender.label}${rangeText} for ${resolved.damage}.${effectText}${outcomeText}`, { tone: defender.defeated ? 'danger' : 'attack', attackerId: piece.id, defenderId: defender.id, beforeHp: resolved.beforeHp, afterHp: defender.hp, damage: resolved.damage, defeated: defender.defeated, distance: check.distance, effects: resolved.effects, pushedTo: resolved.pushedTo });
    }
    endTurn(session, state, seat.seatId);
    return { ok: true };
  }
  return { ok: false, error: 'Unknown Dejarik action.' };
}

async function persist(session, state, status = 'active', logEntry = null) {
  return GameSessionStore.upsertSession({ ...session, status, gameState: state, log: [...(session.log ?? []), logEntry].filter(Boolean) });
}

async function processAi(session, state) {
  let guard = 0;
  while (state.phase === 'playing' && state.activeSeatId && guard < 12) {
    guard += 1;
    const seat = findSeat(session, state.activeSeatId);
    if (!isAutomatedSeat(seat)) break;
    const choice = DejarikAi.chooseAction({ session, state, seat, aiProfile: seat.aiProfile || seat.aiDifficulty || 'medium' });
    if (choice?.gmControlled) break;
    applyAction(session, state, seat, choice.type, choice);
  }
  return { session, state };
}

export class DejarikEngine {
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

  static async createSoloAiSession({ actor, actorId = null, title = '', sessionId = null, requesterId = null, dejarikRulesMode = 'holopad-skirmish' } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    const resolvedSessionId = sessionId || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`;
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-solo-dejarik', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId, dejarikRulesMode });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const generated = await GameOpponentProfileService.buildPazaakAiOpponentProfile({ difficulty: settings.defaultAiDifficulty || 'medium', fairness: settings.defaultAiFairness || 'fair', personality: settings.defaultAiPersonality || 'random' });
    const hostSeat = { seatId: 'seat_host', type: requester?.isGM ? 'gm' : 'player', userId, actorId: resolvedActor?.id ?? actorId ?? null, recipientId: hostRecipientId, displayName: actorDisplay(resolvedActor), avatar: actorImg(resolvedActor), status: 'host' };
    const aiSeat = { seatId: 'seat_ai', type: 'ai', userId: null, actorId: null, recipientId: null, displayName: generated.name || 'Holochess Droid', avatar: 'icons/commodities/tech/cog-bronze.webp', status: 'accepted', profession: generated.profession || '', tableFact: generated.tableFact || '', aiProfile: generated, aiDifficulty: generated.difficulty, aiFairness: generated.fairness, aiPersonality: generated.personality };
    const safeDejarikRulesMode = normalizeDejarikRulesMode(dejarikRulesMode);
    const shell = { id: resolvedSessionId, gameId: 'dejarik', title: title || `${actorDisplay(resolvedActor)} plays Dejarik`, status: 'active', authorityMode: 'host', hostUserId: userId, hostActorId: resolvedActor?.id ?? actorId ?? null, seats: [hostSeat, aiSeat], rulesMode: 'republic-senate', wagerProfile: { mode: 'none' }, prizeProfile: { enabled: false }, escrow: {}, metadata: { createdBy: hostRecipientId, mode: 'solo-ai', aiProfile: generated, dejarikRulesMode: safeDejarikRulesMode }, log: [sessionLogEntry('solo-ai-dejarik-created', hostRecipientId, { dejarikRulesMode: safeDejarikRulesMode })] };
    shell.gameState = ensureState(shell);
    await processAi(shell, shell.gameState);
    const updated = await GameSessionStore.upsertSession(shell);
    GameNotificationService.emitSessionUpdated(updated, { dejarikPhase: updated.gameState?.phase, action: 'create-solo-dejarik' });
    return updated;
  }

  static async submitAction({ sessionId, seatId, action, payload = {}, actorId = null, requesterId = null } = {}) {
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('dejarik-action', { sessionId, seatId, action, payload, actorId, requesterId });
      return { pending: true, requestId, sessionId };
    }
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'dejarik') return { ok: false, error: 'Dejarik session not found.' };
    const state = ensureState(session);
    const normalized = String(action || '').trim();
    if (normalized === 'cancel-session') {
      state.phase = 'cancelled'; state.statusLabel = 'CANCELLED'; state.activeSeatId = null; state.message = payload.reason || 'The Dejarik table was cancelled.'; pushEvent(session, state, 'session-cancelled', null, state.message, { tone: 'danger' });
      const updated = await persist(session, state, 'cancelled', sessionLogEntry('dejarik-cancelled', requesterId || currentUserId(), { reason: state.message }));
      GameNotificationService.emitSessionUpdated(updated, { dejarikPhase: updated.gameState?.phase, action: 'dejarik-cancel-session' });
      return { ok: true, session: updated };
    }
    if (normalized === 'rematch') {
      if (!['complete', 'cancelled'].includes(state.phase)) return { ok: false, error: 'Finish the current Dejarik match before starting a rematch.' };
      const rematchState = resetMatchState(session);
      await processAi(session, rematchState);
      const updated = await persist(session, rematchState, 'active', sessionLogEntry('dejarik-rematch', requesterId || currentUserId()));
      GameNotificationService.emitSessionUpdated(updated, { dejarikPhase: updated.gameState?.phase, action: 'dejarik-rematch' });
      return { ok: true, session: updated };
    }
    const seat = findSeat(session, seatId);
    if (!seat) return { ok: false, error: 'Dejarik seat not found.' };
    const result = applyAction(session, state, seat, normalized, payload || {});
    if (!result.ok) return result;
    await processAi(session, state);
    const status = state.phase === 'complete' ? 'complete' : 'active';
    const updated = await persist(session, state, status, sessionLogEntry(`dejarik-${normalized}`, seat.recipientId || seat.seatId, { seatId: seat.seatId }));
    GameNotificationService.emitSessionUpdated(updated, { dejarikPhase: updated.gameState?.phase, action: `dejarik-${normalized}` });
    return { ok: true, session: updated };
  }
}
