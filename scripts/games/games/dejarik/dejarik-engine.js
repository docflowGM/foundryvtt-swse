import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import { buildDejarikBoard, defaultStartingSpaces } from './dejarik-board.js';
import { defaultDejarikTeam, getDejarikPiece } from './dejarik-pieces.js';
import { adjacentSpaces, boardDistance, parseSpaceId } from './dejarik-board.js';
import { canAttackPiece, canMovePiece, legalAttackTargets, legalMoveSpaceIds, occupiedSpaces, winnerSeatId } from './dejarik-rules.js';
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

function buildPiece(pieceId, ownerSeatId, spaceId) {
  const def = getDejarikPiece(pieceId);
  return { id: randomId('piece'), creatureId: def.id, label: def.label, ownerSeatId, spaceId, previousSpaceId: null, atk: def.atk, hp: def.hp, maxHp: def.hp, rng: def.rng, mov: def.mov, classic: clone(def.classic || {}), attack: Number(def.classic?.attack || def.atk || 0), defense: Number(def.classic?.defense || def.hp || 0), movement: Number(def.classic?.movement || def.mov || 0), ability: def.ability, abilityLabel: def.abilityLabel, abilityDescription: def.abilityDescription, image: def.image, defeated: false, activated: false };
}

function buildState(session = {}) {
  const seats = playableSeats(session.seats).slice(0, 2);
  const pieces = {};
  seats.forEach((seat, seatIndex) => {
    const team = defaultDejarikTeam(seatIndex * 4);
    const spaces = defaultStartingSpaces(seatIndex === 0 ? 'alpha' : 'beta');
    team.forEach((pieceId, index) => {
      const piece = buildPiece(pieceId, seat.seatId, spaces[index]);
      pieces[piece.id] = piece;
    });
  });
  return { engine: 'dejarik', version: 2, actionModel: 'single-action', phase: 'playing', statusLabel: 'PLAYING', board: buildDejarikBoard(), activeSeatId: seats[0]?.seatId || null, initiativeSeatId: seats[0]?.seatId || null, pieces, eventLog: [], winnerSeatId: null, message: `${seatLabel(session, seats[0]?.seatId)} has initiative.` };
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
  state.actionModel ||= 'single-action';
  state.eventLog = Array.isArray(state.eventLog) ? state.eventLog : [];
  return state;
}

function pushEvent(session, state, type, seatId, message, data = {}) {
  state.eventLog ??= [];
  state.eventLog.unshift({ id: randomId('dej_evt'), at: now(), type, seatId: seatId || null, seatLabel: seatId ? seatLabel(session, seatId) : null, message: String(message || ''), tone: data.tone || 'neutral', ...data });
  state.eventLog = state.eventLog.slice(0, 30);
}


function adjustedDejarikDamage(attacker = {}, defender = {}, distance = 1) {
  let damage = Math.max(1, Number(attacker.atk || 1));
  if (attacker.ability === 'maul' && Number(defender.hp || 0) < Number(defender.maxHp || 0)) damage += 1;
  if (attacker.ability === 'rend' && Number(defender.hp || 0) < Number(defender.maxHp || 0)) damage += 1;
  if (attacker.ability === 'snap' && Number(distance || 0) > 1) damage += 1;
  if (defender.ability === 'guard' && attacker.ability !== 'spit') damage = Math.max(1, damage - 1);
  return damage;
}

function preferredPushSpace(state = {}, attacker = {}, defender = {}) {
  if (!attacker?.spaceId || !defender?.spaceId || defender.ability === 'anchor') return null;
  const occupied = occupiedSpaces(state, defender.id);
  const currentDistance = boardDistance(attacker.spaceId, defender.spaceId);
  return adjacentSpaces(defender.spaceId)
    .filter(id => !occupied.has(id))
    .filter(id => (state.board || []).some(space => space.id === id))
    .map(id => ({ id, distance: boardDistance(attacker.spaceId, id) }))
    .filter(entry => Number.isFinite(entry.distance) && entry.distance > currentDistance)
    .sort((a, b) => b.distance - a.distance)[0]?.id || null;
}

function resolveDejarikAttack(state = {}, attacker = {}, defender = {}, check = {}) {
  const beforeHp = Number(defender.hp || 0);
  const distance = Number(check.distance || boardDistance(attacker.spaceId, defender.spaceId) || 1);
  const effects = [];

  if (attacker.ability === 'sacrifice' && distance <= 1) {
    defender.hp = 0;
    defender.defeated = true;
    attacker.hp = 0;
    attacker.defeated = true;
    effects.push('sacrifice');
    return { beforeHp, afterHp: 0, damage: beforeHp, defeated: true, effects, pushedTo: null };
  }

  const damage = adjustedDejarikDamage(attacker, defender, distance);
  defender.hp = Math.max(0, beforeHp - damage);
  if (defender.hp <= 0) defender.defeated = true;
  let pushedTo = null;
  if (!defender.defeated && attacker.ability === 'brutal-slam' && distance <= 1) {
    pushedTo = preferredPushSpace(state, attacker, defender);
    if (pushedTo) {
      defender.previousSpaceId = defender.spaceId;
      defender.spaceId = pushedTo;
      effects.push('push');
    }
  }
  return { beforeHp, afterHp: defender.hp, damage, defeated: Boolean(defender.defeated), effects, pushedTo };
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
    const effectText = resolved.effects.includes('sacrifice') ? ` ${piece.label} sacrifices itself.` : (resolved.pushedTo ? ` ${defender.label} is pushed to ${resolved.pushedTo}.` : '');
    const outcomeText = defender.defeated ? ` ${defender.label} is defeated.` : ` ${defender.label} has ${defender.hp}/${defender.maxHp} HP left.`;
    pushEvent(session, state, 'attack', seat.seatId, `${piece.label} hits ${defender.label}${rangeText} for ${resolved.damage}.${effectText}${outcomeText}`, { tone: defender.defeated ? 'danger' : 'attack', attackerId: piece.id, defenderId: defender.id, beforeHp: resolved.beforeHp, afterHp: defender.hp, damage: resolved.damage, defeated: defender.defeated, distance: check.distance, effects: resolved.effects, pushedTo: resolved.pushedTo });
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

  static async createSoloAiSession({ actor, actorId = null, title = '', sessionId = null, requesterId = null } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    const resolvedSessionId = sessionId || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`;
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-solo-dejarik', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const generated = await GameOpponentProfileService.buildPazaakAiOpponentProfile({ difficulty: settings.defaultAiDifficulty || 'medium', fairness: settings.defaultAiFairness || 'fair', personality: settings.defaultAiPersonality || 'random' });
    const hostSeat = { seatId: 'seat_host', type: requester?.isGM ? 'gm' : 'player', userId, actorId: resolvedActor?.id ?? actorId ?? null, recipientId: hostRecipientId, displayName: actorDisplay(resolvedActor), avatar: actorImg(resolvedActor), status: 'host' };
    const aiSeat = { seatId: 'seat_ai', type: 'ai', userId: null, actorId: null, recipientId: null, displayName: generated.name || 'Holochess Droid', avatar: 'icons/commodities/tech/cog-bronze.webp', status: 'accepted', profession: generated.profession || '', tableFact: generated.tableFact || '', aiProfile: generated, aiDifficulty: generated.difficulty, aiFairness: generated.fairness, aiPersonality: generated.personality };
    const shell = { id: resolvedSessionId, gameId: 'dejarik', title: title || `${actorDisplay(resolvedActor)} plays Dejarik`, status: 'active', authorityMode: 'host', hostUserId: userId, hostActorId: resolvedActor?.id ?? actorId ?? null, seats: [hostSeat, aiSeat], rulesMode: 'republic-senate', wagerProfile: { mode: 'none' }, prizeProfile: { enabled: false }, escrow: {}, metadata: { createdBy: hostRecipientId, mode: 'solo-ai', aiProfile: generated }, log: [sessionLogEntry('solo-ai-dejarik-created', hostRecipientId)] };
    shell.gameState = ensureState(shell);
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
