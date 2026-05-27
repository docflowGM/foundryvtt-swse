import { boardDistance, reachableSpaces } from './dejarik-board.js';

export function alivePieces(state = {}) {
  return Object.values(state.pieces || {}).filter(piece => piece && !piece.defeated && Number(piece.hp || 0) > 0);
}

export function occupiedSpaces(state = {}, excludePieceId = null) {
  return new Set(alivePieces(state).filter(piece => piece.id !== excludePieceId).map(piece => piece.spaceId).filter(Boolean));
}

export function canMovePiece(state = {}, piece = {}, toSpaceId = '') {
  if (!piece || piece.defeated) return { ok: false, error: 'Piece is defeated.' };
  if (!toSpaceId || occupiedSpaces(state, piece.id).has(toSpaceId)) return { ok: false, error: 'Destination is occupied.' };
  const reachable = reachableSpaces(piece.spaceId, piece.mov, occupiedSpaces(state, piece.id));
  if (!reachable.includes(toSpaceId)) return { ok: false, error: 'Destination is out of movement range.' };
  if (piece.previousSpaceId && toSpaceId === piece.previousSpaceId) return { ok: false, error: 'A piece cannot immediately retreat to the space it just left.' };
  return { ok: true };
}

export function canAttackPiece(attacker = {}, defender = {}) {
  if (!attacker || !defender) return { ok: false, error: 'Missing attacker or defender.' };
  if (attacker.defeated || defender.defeated) return { ok: false, error: 'Defeated pieces cannot attack or be attacked.' };
  if (attacker.ownerSeatId === defender.ownerSeatId) return { ok: false, error: 'Cannot attack allied pieces.' };
  const distance = boardDistance(attacker.spaceId, defender.spaceId);
  if (distance > Number(attacker.rng || 1)) return { ok: false, error: 'Target is out of range.' };
  return { ok: true, distance };
}

export function winnerSeatId(state = {}) {
  const owners = Array.from(new Set(alivePieces(state).map(piece => piece.ownerSeatId).filter(Boolean)));
  return owners.length === 1 ? owners[0] : null;
}
