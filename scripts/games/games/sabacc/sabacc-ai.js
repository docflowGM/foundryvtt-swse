import { buildSabaccDeck, SABACC_TARGET } from './sabacc-deck.js';
import { evaluateSabaccHand, compareSabaccHands } from './sabacc-rules.js';
import { buildGameAiProfile, labelForGameAiDifficulty } from '../../ai/game-ai-profile-service.js';
import { GameMonteCarloService } from '../../ai/game-monte-carlo-service.js';

const PERSONALITY_RISK = Object.freeze({
  cautious: -0.22,
  aggressive: 0.18,
  reckless: 0.36,
  methodical: 0,
  opportunist: 0.1,
  showboat: 0.16,
  grinder: -0.1,
  desperate: 0.3,
  deceptive: 0.06,
  forceTouched: 0.04
});

const PERSONALITY_CALL_BIAS = Object.freeze({
  cautious: -0.14,
  aggressive: 0.08,
  reckless: 0.18,
  methodical: 0,
  opportunist: 0.06,
  showboat: 0.1,
  grinder: -0.06,
  desperate: 0.14,
  deceptive: -0.02,
  forceTouched: 0.03
});

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomChoice(values = []) {
  if (!Array.isArray(values) || !values.length) return null;
  return values[Math.floor(Math.random() * values.length)] ?? values[0] ?? null;
}

function cloneCard(card = {}) {
  return { ...(card || {}) };
}

function cloneHand(cards = []) {
  return (Array.isArray(cards) ? cards : []).filter(Boolean).map(cloneCard);
}

function cardKey(card = {}) {
  return `${card.catalogId || card.label || 'card'}:${safeNumber(card.value, 0)}:${card.suit || ''}`;
}

function currentEvaluation(player = {}) {
  return player.evaluation || evaluateSabaccHand(player.hand || []);
}

function activeOpponents(state = {}, seatId = null) {
  return Object.values(state.players || {}).filter(player => player?.seatId && player.seatId !== seatId && !player.folded);
}

function potValue(state = {}) {
  return safeNumber(state.handPot, 0) + safeNumber(state.sabaccPot, 0);
}

function visibleKnownCards(state = {}, player = {}, profile = {}) {
  const known = [...cloneHand(player.hand), ...cloneHand(state.discard)];
  if (profile.canUseHiddenInfo || profile.cheating) {
    for (const opponent of activeOpponents(state, player.seatId)) known.push(...cloneHand(opponent.hand));
  }
  return known;
}

function removeKnownCards(deck = [], knownCards = []) {
  const remaining = cloneHand(deck);
  const counts = new Map();
  for (const card of knownCards) counts.set(cardKey(card), safeNumber(counts.get(cardKey(card)), 0) + 1);
  return remaining.filter(card => {
    const key = cardKey(card);
    const count = safeNumber(counts.get(key), 0);
    if (count <= 0) return true;
    counts.set(key, count - 1);
    return false;
  });
}

function fairDrawPool(state = {}, player = {}, profile = {}) {
  if ((profile.canPeekRandomness || profile.cheating) && Array.isArray(state.deck) && state.deck.length) return cloneHand(state.deck);
  return removeKnownCards(buildSabaccDeck(), visibleKnownCards(state, player, profile));
}

function scoreCardForTarget(card = {}, baseHand = []) {
  const next = [...cloneHand(baseHand), cloneCard(card)];
  const evaluation = evaluateSabaccHand(next);
  if (evaluation.handType === 'idiots-array') return 100000;
  if (evaluation.specialWinner) return 90000 + (evaluation.total > 0 ? 1200 : 0);
  if (evaluation.bombedOut) return -50000 - Math.abs(evaluation.total || 0) * 80;
  return (evaluation.absoluteValue * 550) - (evaluation.distance * 900) + (evaluation.total > 0 ? 150 : 0);
}

function drawSampleCard(pool = [], profile = {}, baseHand = []) {
  const source = Array.isArray(pool) && pool.length ? pool : buildSabaccDeck();
  if ((profile.canPeekRandomness || profile.cheating) && source[0]) return cloneCard(source[0]);
  if (profile.houseEdge) {
    const sampleCount = profile.difficulty === 'grandmaster' ? 5 : profile.difficulty === 'pro' ? 4 : 3;
    const samples = Array.from({ length: Math.min(sampleCount, source.length) }, () => randomChoice(source)).filter(Boolean);
    return cloneCard(samples.sort((a, b) => scoreCardForTarget(b, baseHand) - scoreCardForTarget(a, baseHand))[0] || randomChoice(source));
  }
  return cloneCard(randomChoice(source) || buildSabaccDeck()[0]);
}

function drawMultiple(pool = [], count = 0, profile = {}, baseHand = []) {
  const drawn = [];
  const remaining = cloneHand(pool);
  for (let i = 0; i < count; i += 1) {
    const card = drawSampleCard(remaining, profile, baseHand);
    drawn.push(card);
    const index = remaining.findIndex(candidate => cardKey(candidate) === cardKey(card));
    if (index >= 0) remaining.splice(index, 1);
  }
  return drawn;
}

function legalSabaccActions(player = {}, state = {}, profile = {}) {
  const hand = Array.isArray(player.hand) ? player.hand : [];
  const evaluation = currentEvaluation(player);
  const actions = [];

  if (!evaluation.bombedOut) actions.push({ type: 'call-hand' });
  if (hand.length) actions.push(...hand.map(card => ({ type: 'shift-card', cardId: card.id })));
  if (hand.length > 1) actions.push(...hand.map(card => ({ type: 'discard-card', cardId: card.id })));
  actions.push({ type: 'draw-card' });
  actions.push({ type: 'fold' });

  if (profile.difficulty === 'easy') {
    return actions.filter(action => {
      if (action.type === 'discard-card') return Math.random() < 0.45;
      if (action.type === 'shift-card') return Math.random() < 0.75;
      return true;
    });
  }
  return actions;
}

function applySimulatedSabaccAction(player = {}, state = {}, action = {}, profile = {}) {
  const hand = cloneHand(player.hand);
  const drawPool = fairDrawPool(state, player, profile);
  const originalEvaluation = evaluateSabaccHand(hand);

  if (action.type === 'fold') return { folded: true, hand, evaluation: originalEvaluation, drawPool };
  if (action.type === 'draw-card') {
    hand.push(drawSampleCard(drawPool, profile, hand));
  } else if (action.type === 'shift-card') {
    const index = hand.findIndex(card => card.id === action.cardId);
    if (index >= 0) {
      const replacementBase = hand.filter((_, cardIndex) => cardIndex !== index);
      const shifted = drawSampleCard(buildSabaccDeck(), profile, replacementBase);
      hand[index] = { ...shifted, id: hand[index].id, shiftedFrom: { catalogId: hand[index].catalogId, label: hand[index].label, value: hand[index].value } };
    }
  } else if (action.type === 'discard-card') {
    const index = hand.findIndex(card => card.id === action.cardId);
    if (index >= 0) hand.splice(index, 1);
  }

  return { folded: false, hand, evaluation: evaluateSabaccHand(hand), drawPool };
}

function evaluateOpponentHand(opponent = {}, state = {}, player = {}, profile = {}, pool = []) {
  if (opponent.bombedOut) return opponent.evaluation || evaluateSabaccHand(opponent.hand || []);
  if (profile.canUseHiddenInfo || profile.cheating) return opponent.evaluation || evaluateSabaccHand(opponent.hand || []);
  const handSize = Math.max(0, Array.isArray(opponent.hand) ? opponent.hand.length : 0);
  return evaluateSabaccHand(drawMultiple(pool, handSize, { ...profile, houseEdge: false, canPeekRandomness: false, cheating: false }, []));
}

function estimateCallWinRate({ hand = [], state = {}, player = {}, profile = {}, samples = 8, pool = null } = {}) {
  const opponents = activeOpponents(state, player.seatId);
  if (!opponents.length) return 1;
  const ownEvaluation = evaluateSabaccHand(hand);
  if (ownEvaluation.bombedOut) return 0;
  const iterations = Math.max(1, Math.floor(samples));
  let wins = 0;
  let ties = 0;
  const sourcePool = pool || fairDrawPool(state, player, profile);

  for (let i = 0; i < iterations; i += 1) {
    const entries = [{ seatId: player.seatId, cards: hand, evaluation: ownEvaluation }];
    let mutablePool = cloneHand(sourcePool);
    for (const opponent of opponents) {
      const evaluation = evaluateOpponentHand(opponent, state, player, profile, mutablePool);
      if (!(profile.canUseHiddenInfo || profile.cheating)) {
        const handSize = Math.max(0, Array.isArray(opponent.hand) ? opponent.hand.length : 0);
        mutablePool = mutablePool.slice(handSize);
      }
      entries.push({ seatId: opponent.seatId, cards: opponent.hand || [], evaluation });
    }
    const result = compareSabaccHands(entries);
    if (result.winnerSeatId === player.seatId) wins += 1;
    else if (!result.winnerSeatId) ties += 1;
  }
  return clamp((wins + ties * 0.5) / iterations, 0, 1);
}

function handQualityScore(evaluation = {}) {
  if (evaluation.handType === 'idiots-array') return 150000;
  if (evaluation.handType === 'pure-sabacc-positive') return 132000;
  if (evaluation.handType === 'pure-sabacc-negative') return 126000;
  if (evaluation.bombedOut) return -38000 - Math.abs(evaluation.total || 0) * 160;
  return (safeNumber(evaluation.absoluteValue, 0) * 640) - (safeNumber(evaluation.distance, 0) * 1050) + (evaluation.total > 0 ? 220 : 0);
}

function pressureSamplesFor(profile = {}) {
  if (profile.difficulty === 'grandmaster') return 16;
  if (profile.difficulty === 'pro') return 12;
  if (profile.difficulty === 'hard') return 9;
  if (profile.difficulty === 'medium') return 6;
  return 3;
}

function scoreSabaccOutcome({ player = {}, state = {}, action = {}, simulated = {}, profile = {} } = {}) {
  const originalEval = currentEvaluation(player);
  const evaluation = simulated.evaluation || evaluateSabaccHand(simulated.hand || []);
  const pot = potValue(state);
  const potPressure = clamp(pot * 0.22, 0, 1800);
  const riskMod = PERSONALITY_RISK[profile.personality] ?? 0;
  const callBias = PERSONALITY_CALL_BIAS[profile.personality] ?? 0;
  const winRate = estimateCallWinRate({
    hand: simulated.hand || [],
    state,
    player,
    profile,
    samples: pressureSamplesFor(profile),
    pool: simulated.drawPool
  });
  const houseEdge = profile.houseEdge ? 300 : 0;

  if (simulated.folded) {
    if (originalEval.bombedOut) return 7600 + potPressure;
    const currentWinRate = estimateCallWinRate({ hand: player.hand || [], state, player, profile, samples: pressureSamplesFor(profile) });
    if (currentWinRate < 0.18) return 1200 + potPressure - handQualityScore(originalEval) * 0.04;
    if (currentWinRate < 0.32 && pot > 200) return 450 + potPressure * 0.35;
    return -5200 - potPressure - currentWinRate * 1500;
  }

  let score = handQualityScore(evaluation) + (winRate - 0.5) * 9000 + houseEdge;

  if (action.type === 'call-hand') {
    const callThreshold = 0.56 - callBias - (pot > 300 ? 0.04 : 0);
    score += (winRate - callThreshold) * 15500 + potPressure;
    if (evaluation.specialWinner) score += 40000;
    if (!evaluation.specialWinner && evaluation.absoluteValue < 18) score -= 2800 + potPressure;
  }

  if (action.type === 'draw-card') {
    score += riskMod * 1800;
    if (originalEval.absoluteValue >= 21) score -= 2600 - riskMod * 1400;
    if (originalEval.absoluteValue <= 14) score += 900;
    if (evaluation.bombedOut) score -= 18000;
  }

  if (action.type === 'shift-card') {
    score += 360 + (profile.difficulty === 'grandmaster' ? 180 : 0);
    if (evaluation.distance < originalEval.distance) score += 1150;
    if (evaluation.distance > originalEval.distance) score -= 900;
  }

  if (action.type === 'discard-card') {
    score -= profile.personality === 'grinder' ? 20 : 180;
    if (evaluation.distance < originalEval.distance) score += 900;
    if ((simulated.hand || []).length < 2) score -= 1400;
  }

  if (profile.forceSensitive && Math.random() < safeNumber(profile.forceSensitivityChance, 0.05)) score += 180;
  return score;
}

function describeAction(action = {}, player = {}, state = {}, profile = {}, result = {}) {
  const evaluation = currentEvaluation(player);
  const confidence = Math.round(clamp(safeNumber(result.confidence, 0), 0, 1) * 100);
  if (action.type === 'call-hand') return `Calls with ${evaluation.label}; ${confidence}% confidence after ${result.samples || 0} sampled outcomes.`;
  if (action.type === 'draw-card') return `Draws because the current hand is ${evaluation.label} and the sampled upside is better than standing.`;
  if (action.type === 'shift-card') return `Shifts a weak card to chase a stronger Sabacc total.`;
  if (action.type === 'discard-card') return `Discards to reduce distance from ${SABACC_TARGET}.`;
  if (action.type === 'fold') return `Folds because the sampled win rate is too low for the pot pressure.`;
  return `Acts with ${profile.difficultyLabel || profile.difficulty || 'medium'} Sabacc logic.`;
}

export function buildSabaccAiProfile(raw = {}) {
  return buildGameAiProfile(raw, { personality: 'methodical' });
}

export class SabaccAi {
  static chooseAction({ player = {}, state = {}, aiProfile = {} } = {}) {
    const profile = buildSabaccAiProfile(aiProfile);
    if (profile.gmControlled) return { type: 'call-hand', gmControlled: true };

    const evaluation = currentEvaluation(player);
    if (evaluation.specialWinner) {
      return {
        type: 'call-hand',
        ai: {
          engine: 'sabacc-monte-carlo',
          immediate: 'special-winning-hand',
          difficulty: profile.difficulty,
          fairness: profile.fairness,
          personality: profile.personality,
          confidence: 1,
          samples: 0,
          reason: `Calls immediately with ${evaluation.label}.`
        }
      };
    }

    const actions = legalSabaccActions(player, state, profile);
    const explorationRate = clamp(safeNumber(profile.mistakeRate, 0) + Math.max(0, PERSONALITY_RISK[profile.personality] || 0) * 0.22, 0, 0.46);
    const result = GameMonteCarloService.chooseAction({
      actions,
      profile,
      simulationsPerAction: profile.monteCarloSamples,
      timeBudgetMs: profile.monteCarloTimeBudgetMs,
      explorationRate,
      fallbackAction: { type: evaluation.bombedOut ? 'fold' : 'call-hand' },
      simulateAction: action => {
        const simulated = applySimulatedSabaccAction(player, state, action, profile);
        return scoreSabaccOutcome({ player, state, action, simulated, profile });
      }
    });

    const action = result.action || { type: evaluation.bombedOut ? 'fold' : 'call-hand' };
    return {
      ...action,
      ai: {
        engine: 'sabacc-monte-carlo',
        difficulty: profile.difficulty,
        fairness: profile.fairness,
        personality: profile.personality,
        confidence: result.confidence,
        samples: result.samples,
        reason: describeAction(action, player, state, profile, result)
      }
    };
  }

  static estimateCallWinRate(options = {}) {
    return estimateCallWinRate(options);
  }

  static labelForDifficulty(value = 'medium') {
    return labelForGameAiDifficulty(value);
  }
}
