import { boardDistance } from './dejarik-board.js';
import { alivePieces, canAttackPiece, canMovePiece, resolveDejarikAttack, winnerSeatId } from './dejarik-rules.js';
import { buildGameAiProfile, labelForGameAiDifficulty } from '../../ai/game-ai-profile-service.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function playableSeats(seats = []) {
  return (Array.isArray(seats) ? seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status));
}

function getOrder(session = {}) {
  return playableSeats(session.seats).map(seat => seat.seatId).filter(Boolean);
}

function nextSeatId(session = {}, fromSeatId = null) {
  const order = getOrder(session);
  if (!order.length) return null;
  const index = Math.max(0, order.indexOf(fromSeatId));
  return order[(index + 1) % order.length] || order[0];
}

function pieceValue(piece = {}) {
  return (Number(piece.maxHp || piece.hp || 0) * 120)
    + (Number(piece.hp || 0) * 85)
    + (Number(piece.atk || 0) * 190)
    + (Number(piece.rng || 0) * 65)
    + (Number(piece.mov || 0) * 55);
}

function effectiveHp(piece = {}) {
  return Math.max(0, Number(piece.hp || 0));
}

function piecesFor(state = {}, seatId = null) {
  return alivePieces(state).filter(piece => piece.ownerSeatId === seatId);
}

function enemiesFor(state = {}, seatId = null) {
  return alivePieces(state).filter(piece => piece.ownerSeatId !== seatId);
}

function reachableMoveCount(state = {}, piece = {}) {
  let count = 0;
  for (const space of Array.isArray(state.board) ? state.board : []) {
    if (canMovePiece(state, piece, space.id).ok) count += 1;
  }
  return count;
}

function nearestEnemyDistance(state = {}, piece = {}, enemies = []) {
  if (!piece?.spaceId || !enemies.length) return 8;
  return enemies.reduce((best, enemy) => Math.min(best, boardDistance(piece.spaceId, enemy.spaceId)), Infinity);
}

function simulateAttack(state = {}, attacker = {}, defender = {}) {
  const next = clone(state);
  const simAttacker = next.pieces?.[attacker.id] || { ...attacker };
  const simDefender = next.pieces?.[defender.id] || { ...defender };
  const check = canAttackPiece(simAttacker, simDefender, next);
  if (!check.ok) return { ok: false, next, resolved: null, attacker: simAttacker, defender: simDefender };
  const resolved = resolveDejarikAttack(next, simAttacker, simDefender, check, { randomize: false });
  return { ok: true, next, resolved, attacker: simAttacker, defender: simDefender };
}

function attackScore(state = {}, attacker = {}, defender = {}) {
  const sim = simulateAttack(state, attacker, defender);
  if (!sim.ok) return -999999;
  const resolved = sim.resolved || {};
  const damage = Math.min(Number(resolved.damage || 0), effectiveHp(defender));
  const lethal = resolved.defeated ? 900 + Math.round(pieceValue(defender) / 3) : 0;
  const attackerLoss = resolved.attackerDefeated ? 900 + Math.round(pieceValue(attacker) / 3) : 0;
  const pushPressure = resolved.pushedTo ? 160 : 0;
  const classicPressure = resolved.mode === 'classic-holochess' ? Math.max(-240, Math.min(360, Number(resolved.margin || 0) * 28)) : 0;
  const woundPressure = Math.max(0, Number(defender.maxHp || 0) - effectiveHp(defender)) * 20;
  return (damage * 180) + lethal + pushPressure + classicPressure + Math.round(pieceValue(defender) / 12) + woundPressure - attackerLoss;
}

function threatProfile(state = {}, seatId = null) {
  const own = piecesFor(state, seatId);
  const enemies = enemiesFor(state, seatId);
  let pressure = 0;
  let exposure = 0;
  let lethalThreats = 0;

  for (const piece of own) {
    for (const enemy of enemies) {
      if (canAttackPiece(piece, enemy, state).ok) pressure += attackScore(state, piece, enemy);
      if (canAttackPiece(enemy, piece, state).ok) {
        const incoming = attackScore(state, enemy, piece);
        exposure += incoming;
        if (simulateAttack(state, enemy, piece).resolved?.defeated) lethalThreats += 1;
      }
    }
  }

  return { pressure, exposure, lethalThreats };
}

function evaluateState(state = {}, perspectiveSeatId = null) {
  const winner = winnerSeatId(state);
  if (winner) return winner === perspectiveSeatId ? 1000000 : -1000000;

  const own = piecesFor(state, perspectiveSeatId);
  const enemies = enemiesFor(state, perspectiveSeatId);
  const ownThreats = threatProfile(state, perspectiveSeatId);
  const enemySeatId = enemies[0]?.ownerSeatId || null;
  const enemyThreats = enemySeatId ? threatProfile(state, enemySeatId) : { pressure: 0, exposure: 0, lethalThreats: 0 };

  let score = 0;
  for (const piece of own) {
    const healthRatio = Number(piece.maxHp || 0) > 0 ? effectiveHp(piece) / Number(piece.maxHp || 1) : 1;
    score += pieceValue(piece);
    score += reachableMoveCount(state, piece) * 18;
    score -= Math.max(0, 4 - nearestEnemyDistance(state, piece, enemies)) * (healthRatio < 0.4 ? 55 : 18);
    if (healthRatio < 0.35) score -= 160;
  }
  for (const piece of enemies) {
    const healthRatio = Number(piece.maxHp || 0) > 0 ? effectiveHp(piece) / Number(piece.maxHp || 1) : 1;
    score -= pieceValue(piece);
    score -= reachableMoveCount(state, piece) * 14;
    if (healthRatio < 0.35) score += 130;
  }

  score += ownThreats.pressure * 0.55;
  score -= ownThreats.exposure * 0.7;
  score -= ownThreats.lethalThreats * 320;
  score -= enemyThreats.pressure * 0.35;
  score += enemyThreats.exposure * 0.25;

  const materialLead = own.length - enemies.length;
  score += materialLead * 420;
  return Math.round(score);
}

function buildMoveAction(piece = {}, toSpaceId = '') {
  return { type: 'move', pieceId: piece.id, toSpaceId };
}

function buildAttackAction(piece = {}, target = {}) {
  return { type: 'attack', pieceId: piece.id, targetPieceId: target.id };
}

function legalActions(session = {}, state = {}, seatId = null) {
  const own = piecesFor(state, seatId);
  const enemies = enemiesFor(state, seatId);
  const actions = [];

  for (const piece of own) {
    for (const target of enemies) {
      if (canAttackPiece(piece, target, state).ok) actions.push(buildAttackAction(piece, target));
    }
  }

  for (const piece of own) {
    for (const space of Array.isArray(state.board) ? state.board : []) {
      if (canMovePiece(state, piece, space.id).ok) actions.push(buildMoveAction(piece, space.id));
    }
  }

  if (!actions.length) actions.push({ type: 'end-turn' });
  return orderActions(state, seatId, actions);
}

function actionStaticScore(state = {}, seatId = null, action = {}) {
  if (action.type === 'attack') {
    const attacker = state.pieces?.[action.pieceId];
    const defender = state.pieces?.[action.targetPieceId];
    if (!attacker || !defender) return -999999;
    return 2000 + attackScore(state, attacker, defender);
  }
  if (action.type === 'move') {
    const piece = state.pieces?.[action.pieceId];
    if (!piece) return -999999;
    const enemies = enemiesFor(state, seatId);
    const before = nearestEnemyDistance(state, piece, enemies);
    const trial = { ...piece, spaceId: action.toSpaceId };
    const after = nearestEnemyDistance(state, trial, enemies);
    const canAttackAfter = enemies.some(enemy => canAttackPiece(trial, enemy, state).ok);
    const exposedAfter = enemies.some(enemy => canAttackPiece(enemy, trial, state).ok);
    const wounded = effectiveHp(piece) <= Math.max(2, Number(piece.maxHp || 0) / 3);
    return 600 + ((before - after) * 80) + (canAttackAfter ? 260 : 0) - (exposedAfter && wounded ? 420 : (exposedAfter ? 120 : 0)) + (reachableMoveCount(state, trial) * 8);
  }
  return -1000;
}

function orderActions(state = {}, seatId = null, actions = []) {
  return [...actions].sort((a, b) => actionStaticScore(state, seatId, b) - actionStaticScore(state, seatId, a));
}

function applyActionForSearch(session = {}, state = {}, seatId = null, action = {}) {
  const next = clone(state);
  const piece = next.pieces?.[String(action.pieceId || '')];

  if (action.type === 'attack' && piece) {
    const defender = next.pieces?.[String(action.targetPieceId || '')];
    const check = defender ? canAttackPiece(piece, defender, next) : { ok: false };
    if (defender && check.ok) {
      resolveDejarikAttack(next, piece, defender, check, { randomize: false });
      piece.activated = true;
    }
  } else if (action.type === 'move' && piece) {
    if (canMovePiece(next, piece, String(action.toSpaceId || '')).ok) {
      piece.previousSpaceId = piece.spaceId;
      piece.spaceId = String(action.toSpaceId);
      piece.activated = true;
    }
  }

  const winner = winnerSeatId(next);
  if (winner) {
    next.phase = 'complete';
    next.winnerSeatId = winner;
    next.activeSeatId = null;
  } else {
    next.activeSeatId = nextSeatId(session, next.activeSeatId || seatId);
  }
  return next;
}

function shouldStopSearch(startedAt, budgetMs) {
  return Date.now() - startedAt >= budgetMs;
}

function alphaBeta(session, state, perspectiveSeatId, depth, alpha, beta, startedAt, budgetMs, candidateLimit) {
  if (depth <= 0 || state.phase === 'complete' || winnerSeatId(state) || shouldStopSearch(startedAt, budgetMs)) {
    return { score: evaluateState(state, perspectiveSeatId) };
  }

  const activeSeatId = state.activeSeatId;
  const maximizing = activeSeatId === perspectiveSeatId;
  let actions = legalActions(session, state, activeSeatId);
  actions = actions.slice(0, Math.max(1, candidateLimit));

  if (maximizing) {
    let bestScore = -Infinity;
    for (const action of actions) {
      const result = alphaBeta(session, applyActionForSearch(session, state, activeSeatId, action), perspectiveSeatId, depth - 1, alpha, beta, startedAt, budgetMs, candidateLimit);
      bestScore = Math.max(bestScore, result.score);
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha || shouldStopSearch(startedAt, budgetMs)) break;
    }
    return { score: bestScore };
  }

  let bestScore = Infinity;
  for (const action of actions) {
    const result = alphaBeta(session, applyActionForSearch(session, state, activeSeatId, action), perspectiveSeatId, depth - 1, alpha, beta, startedAt, budgetMs, candidateLimit);
    bestScore = Math.min(bestScore, result.score);
    beta = Math.min(beta, bestScore);
    if (beta <= alpha || shouldStopSearch(startedAt, budgetMs)) break;
  }
  return { score: bestScore };
}

function randomReasonableAction(actions = [], profile = {}) {
  const pool = actions.slice(0, Math.min(actions.length, profile.difficulty === 'easy' ? 4 : 6));
  return pool[Math.floor(Math.random() * Math.max(1, pool.length))] || actions[0] || { type: 'end-turn' };
}

export function buildDejarikAiProfile(raw = {}) {
  return buildGameAiProfile(raw, { personality: 'methodical' });
}

export class DejarikAi {
  static chooseAction({ session = {}, state = {}, seat = {}, aiProfile = null } = {}) {
    const profile = buildDejarikAiProfile(aiProfile || seat.aiProfile || seat.aiDifficulty || 'medium');
    if (profile.gmControlled) return { type: 'end-turn', gmControlled: true, reason: 'GM-controlled Dejarik seat is waiting for manual action.' };

    const seatId = seat.seatId || state.activeSeatId;
    const actions = legalActions(session, state, seatId);
    if (!actions.length) return { type: 'end-turn' };

    if (profile.mistakeRate > 0 && Math.random() < profile.mistakeRate) {
      return { ...randomReasonableAction(actions, profile), ai: { engine: 'alpha-beta', mistake: true, difficulty: profile.difficulty } };
    }

    const startedAt = Date.now();
    const depth = Math.max(1, Math.min(4, Number(profile.searchDepth || 2)));
    const candidateLimit = Math.max(4, Number(profile.searchCandidateLimit || 12));
    const budgetMs = Math.max(40, Number(profile.searchTimeBudgetMs || 180));
    const scored = [];
    let best = null;

    for (const action of actions.slice(0, candidateLimit)) {
      const trial = applyActionForSearch(session, state, seatId, action);
      const result = alphaBeta(session, trial, seatId, depth - 1, -Infinity, Infinity, startedAt, budgetMs, candidateLimit);
      const staticScore = actionStaticScore(state, seatId, action);
      const score = result.score + (staticScore * 0.05);
      const entry = { action, score, staticScore };
      scored.push(entry);
      if (!best || entry.score > best.score) best = entry;
      if (shouldStopSearch(startedAt, budgetMs)) break;
    }

    const chosen = best?.action || actions[0] || { type: 'end-turn' };
    const ordered = scored.sort((a, b) => b.score - a.score);
    const second = ordered[1];
    const confidence = second ? Math.max(0, Math.min(1, (ordered[0].score - second.score) / (Math.abs(ordered[0].score) + 100))) : 0.8;

    return {
      ...chosen,
      ai: {
        engine: 'alpha-beta',
        difficulty: profile.difficulty,
        fairness: profile.fairness,
        personality: profile.personality,
        depth,
        searchedActions: scored.length,
        candidateLimit,
        confidence,
        elapsedMs: Date.now() - startedAt
      }
    };
  }

  static evaluateState(state = {}, perspectiveSeatId = null) {
    return evaluateState(state, perspectiveSeatId);
  }

  static legalActions(session = {}, state = {}, seatId = null) {
    return legalActions(session, state, seatId);
  }

  static labelForDifficulty(value = 'medium') {
    return labelForGameAiDifficulty(value);
  }
}
