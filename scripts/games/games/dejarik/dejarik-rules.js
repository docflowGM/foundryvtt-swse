import { boardDistance, parseSpaceId, reachableSpaces, shortestPath, spaceId } from './dejarik-board.js';

export function alivePieces(state = {}) {
  return Object.values(state.pieces || {}).filter(piece => piece && !piece.defeated && Number(piece.hp || 0) > 0);
}

export function occupiedSpaces(state = {}, excludePieceId = null) {
  return new Set(alivePieces(state).filter(piece => piece.id !== excludePieceId).map(piece => piece.spaceId).filter(Boolean));
}

export function boardSpaceIds(state = {}) {
  return new Set((Array.isArray(state.board) ? state.board : []).map(space => space?.id).filter(Boolean));
}

export function isBoardSpace(state = {}, spaceId = '') {
  return boardSpaceIds(state).has(String(spaceId || ''));
}

export function legalMoveSpaceIds(state = {}, piece = {}) {
  if (!piece || piece.defeated || !isBoardSpace(state, piece.spaceId)) return [];
  return reachableSpaces(piece.spaceId, piece.mov, occupiedSpaces(state, piece.id))
    .filter(spaceId => isBoardSpace(state, spaceId) && canMovePiece(state, piece, spaceId).ok);
}

export function legalAttackTargets(state = {}, attacker = {}) {
  if (!attacker || attacker.defeated) return [];
  return alivePieces(state).filter(defender => canAttackPiece(attacker, defender, state).ok);
}

export function canMovePiece(state = {}, piece = {}, toSpaceId = '') {
  const destination = String(toSpaceId || '');
  if (!piece || piece.defeated) return { ok: false, error: 'Piece is defeated.' };
  if (!isBoardSpace(state, piece.spaceId)) return { ok: false, error: 'Piece is not on the Dejarik board.' };
  if (!destination || !isBoardSpace(state, destination)) return { ok: false, error: 'Destination is not on the Dejarik board.' };
  if (occupiedSpaces(state, piece.id).has(destination)) return { ok: false, error: 'Destination is occupied.' };
  const reachable = reachableSpaces(piece.spaceId, piece.mov, occupiedSpaces(state, piece.id));
  if (!reachable.includes(destination)) return { ok: false, error: 'Destination is out of movement range.' };
  if (piece.previousSpaceId && destination === piece.previousSpaceId) return { ok: false, error: 'A piece cannot immediately retreat to the space it just left.' };
  return { ok: true };
}

export function attackPathSpaces(state = {}, attacker = {}, defender = {}) {
  if (!attacker?.spaceId || !defender?.spaceId) return [];
  const from = parseSpaceId(attacker.spaceId);
  const to = parseSpaceId(defender.spaceId);
  if (!from || !to) return [];
  const path = [];
  if (from.ray === to.ray) {
    const step = from.ring < to.ring ? 1 : -1;
    for (let ring = from.ring + step; ring !== to.ring; ring += step) path.push(spaceId(ring, from.ray));
    return path;
  }
  if (from.ring === to.ring) {
    const clockwise = (to.ray - from.ray + 8) % 8;
    const counter = (from.ray - to.ray + 8) % 8;
    const step = clockwise <= counter ? 1 : -1;
    let ray = from.ray;
    for (let i = 1; i < Math.min(clockwise, counter); i += 1) {
      ray = (ray + step + 8) % 8;
      path.push(spaceId(from.ring, ray));
    }
    return path;
  }
  return shortestPath(attacker.spaceId, defender.spaceId).slice(1, -1);
}

export function hasAttackLineOfSight(state = {}, attacker = {}, defender = {}) {
  if (!state?.board) return { ok: true, blockedBy: null, path: [] };
  const path = attackPathSpaces(state, attacker, defender);
  const occupied = occupiedSpaces(state, attacker.id);
  occupied.delete(defender.spaceId);
  const blockedBy = path.find(spaceId => occupied.has(spaceId)) || null;
  return { ok: !blockedBy, blockedBy, path };
}

export function canAttackPiece(attacker = {}, defender = {}, state = null) {
  if (!attacker || !defender) return { ok: false, error: 'Missing attacker or defender.' };
  if (!attacker.spaceId || !defender.spaceId) return { ok: false, error: 'Missing attacker or defender space.' };
  if (attacker.defeated || defender.defeated) return { ok: false, error: 'Defeated pieces cannot attack or be attacked.' };
  if (Number(attacker.hp || 0) <= 0 || Number(defender.hp || 0) <= 0) return { ok: false, error: 'Defeated pieces cannot attack or be attacked.' };
  if (attacker.id && defender.id && attacker.id === defender.id) return { ok: false, error: 'A piece cannot attack itself.' };
  if (attacker.ownerSeatId === defender.ownerSeatId) return { ok: false, error: 'Cannot attack allied pieces.' };
  const distance = boardDistance(attacker.spaceId, defender.spaceId);
  if (!Number.isFinite(distance)) return { ok: false, error: 'Target is not reachable on this board.' };
  if (distance > Number(attacker.rng || 1)) return { ok: false, error: 'Target is out of range.' };
  if (state) {
    const line = hasAttackLineOfSight(state, attacker, defender);
    if (!line.ok) return { ok: false, error: 'Line of sight is blocked.', blockedBy: line.blockedBy, distance, path: line.path };
    return { ok: true, distance, path: line.path };
  }
  return { ok: true, distance };
}

export function winnerSeatId(state = {}) {
  const owners = Array.from(new Set(alivePieces(state).map(piece => piece.ownerSeatId).filter(Boolean)));
  return owners.length === 1 ? owners[0] : null;
}
