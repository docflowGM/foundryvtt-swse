import { adjacentSpaces, boardDistance, parseSpaceId, reachableSpaces, shortestPath, spaceId } from './dejarik-board.js';

export const DEJARIK_RULES_MODES = Object.freeze({
  SKIRMISH: 'holopad-skirmish',
  CLASSIC: 'classic-holochess'
});

export function normalizeDejarikRulesMode(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['classic', 'classic-holochess', 'classic_dejarik', 'classic-dejarik', 'holochess'].includes(normalized)) return DEJARIK_RULES_MODES.CLASSIC;
  return DEJARIK_RULES_MODES.SKIRMISH;
}

export function dejarikRulesModeLabel(value = '') {
  return normalizeDejarikRulesMode(value) === DEJARIK_RULES_MODES.CLASSIC ? 'Classic Holochess' : 'Holopad Skirmish';
}

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
  if (piece.previousSpaceId && destination === piece.previousSpaceId && piece.ability !== 'skitter') return { ok: false, error: 'A piece cannot immediately retreat to the space it just left.' };
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

export function attackRangeForPiece(piece = {}) {
  const base = Math.max(1, Number(piece.rng || 1));
  if (['lunge', 'pounce'].includes(piece.ability)) return base + 1;
  return base;
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
  if (distance > attackRangeForPiece(attacker)) return { ok: false, error: 'Target is out of range.' };
  if (state) {
    const line = hasAttackLineOfSight(state, attacker, defender);
    if (!line.ok) return { ok: false, error: 'Line of sight is blocked.', blockedBy: line.blockedBy, distance, path: line.path };
    return { ok: true, distance, path: line.path };
  }
  return { ok: true, distance };
}

export function adjustedDejarikSkirmishDamage(attacker = {}, defender = {}, distance = 1) {
  let damage = Math.max(1, Number(attacker.atk || 1));
  if (attacker.ability === 'maul' && Number(defender.hp || 0) < Number(defender.maxHp || 0)) damage += 1;
  if (attacker.ability === 'rend' && Number(defender.hp || 0) < Number(defender.maxHp || 0)) damage += 1;
  if (attacker.ability === 'snap' && Number(distance || 0) > 1) damage += 1;
  if (defender.ability === 'guard' && attacker.ability !== 'spit') damage = Math.max(1, damage - 1);
  return damage;
}

export function preferredPushSpace(state = {}, attacker = {}, defender = {}) {
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

function rollDejarikDice(count, { randomize = true } = {}) {
  const dice = Math.max(1, Math.min(12, Number(count || 1)));
  const rolls = [];
  for (let i = 0; i < dice; i += 1) rolls.push(randomize ? 1 + Math.floor(Math.random() * 6) : 3.5);
  return { dice, rolls, total: Math.round(rolls.reduce((sum, value) => sum + value, 0)) };
}

export function resolveDejarikSkirmishAttack(state = {}, attacker = {}, defender = {}, check = {}) {
  const beforeHp = Number(defender.hp || 0);
  const distance = Number(check.distance || boardDistance(attacker.spaceId, defender.spaceId) || 1);
  const effects = [];

  if (attacker.ability === 'sacrifice' && distance <= 1) {
    defender.hp = 0;
    defender.defeated = true;
    attacker.hp = 0;
    attacker.defeated = true;
    effects.push('sacrifice');
    return { mode: DEJARIK_RULES_MODES.SKIRMISH, beforeHp, afterHp: 0, damage: beforeHp, defeated: true, attackerDefeated: true, effects, pushedTo: null };
  }

  const damage = adjustedDejarikSkirmishDamage(attacker, defender, distance);
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
  return { mode: DEJARIK_RULES_MODES.SKIRMISH, beforeHp, afterHp: defender.hp, damage, defeated: Boolean(defender.defeated), attackerDefeated: Boolean(attacker.defeated), effects, pushedTo };
}

export function resolveDejarikClassicAttack(state = {}, attacker = {}, defender = {}, check = {}, options = {}) {
  const distance = Number(check.distance || boardDistance(attacker.spaceId, defender.spaceId) || 1);
  const beforeHp = Number(defender.hp || 0);
  const attackRoll = rollDejarikDice(attacker.attack || attacker.classic?.attack || attacker.atk || 1, options);
  const defenseRoll = rollDejarikDice(defender.defense || defender.classic?.defense || defender.hp || 1, options);
  const margin = attackRoll.total - defenseRoll.total;
  const effects = ['classic-contest'];
  let pushedTo = null;
  let pushedPieceId = null;
  let damage = 0;
  let defeated = false;
  let attackerDefeated = false;
  let outcome = 'defender-push';

  if (margin > 7) {
    defender.hp = 0;
    defender.defeated = true;
    defeated = true;
    damage = beforeHp;
    outcome = 'attack-mortal';
    effects.push('attack-mortal');
  } else if (margin <= -7) {
    attacker.hp = 0;
    attacker.defeated = true;
    attackerDefeated = true;
    outcome = 'defense-mortal';
    effects.push('defense-mortal');
  } else if (margin > 0) {
    pushedTo = preferredPushSpace(state, attacker, defender);
    pushedPieceId = defender.id;
    outcome = 'attacker-push';
    effects.push('attacker-push');
    if (pushedTo) {
      defender.previousSpaceId = defender.spaceId;
      defender.spaceId = pushedTo;
    }
  } else {
    pushedTo = preferredPushSpace(state, defender, attacker);
    pushedPieceId = attacker.id;
    outcome = 'defender-push';
    effects.push('defender-push');
    if (pushedTo) {
      attacker.previousSpaceId = attacker.spaceId;
      attacker.spaceId = pushedTo;
    }
  }

  return {
    mode: DEJARIK_RULES_MODES.CLASSIC,
    beforeHp,
    afterHp: defender.hp,
    damage,
    defeated,
    attackerDefeated,
    effects,
    pushedTo,
    pushedPieceId,
    distance,
    outcome,
    attackRoll,
    defenseRoll,
    margin
  };
}

export function resolveDejarikAttack(state = {}, attacker = {}, defender = {}, check = {}, options = {}) {
  const mode = normalizeDejarikRulesMode(state.rulesMode || state.metadata?.dejarikRulesMode);
  if (mode === DEJARIK_RULES_MODES.CLASSIC) return resolveDejarikClassicAttack(state, attacker, defender, check, options);
  return resolveDejarikSkirmishAttack(state, attacker, defender, check);
}

export function winnerSeatId(state = {}) {
  const owners = Array.from(new Set(alivePieces(state).map(piece => piece.ownerSeatId).filter(Boolean)));
  return owners.length === 1 ? owners[0] : null;
}
