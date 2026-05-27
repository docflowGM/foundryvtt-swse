import { SABACC_TARGET } from './sabacc-deck.js';

function safeCards(cards = []) {
  return Array.isArray(cards) ? cards.filter(Boolean) : [];
}

export function scoreSabaccHand(cards = []) {
  return safeCards(cards).reduce((sum, card) => sum + Number(card.value || 0), 0);
}

export function isSabaccBombOut(total) {
  return Number(total || 0) > SABACC_TARGET || Number(total || 0) < -SABACC_TARGET;
}

export function isIdiotsArray(cards = []) {
  const hand = safeCards(cards);
  const hasIdiot = hand.some(card => card.catalogId === 'idiot' || card.label === 'The Idiot' || Number(card.value || 0) === 0);
  if (!hasIdiot) return false;
  const twos = hand.filter(card => card.type === 'number' && Number(card.value || 0) === 2 && card.suit);
  const threes = hand.filter(card => card.type === 'number' && Number(card.value || 0) === 3 && card.suit);
  return twos.some(two => threes.some(three => three.suit === two.suit));
}

export function evaluateSabaccHand(cards = []) {
  const hand = safeCards(cards);
  const total = scoreSabaccHand(hand);
  const bombedOut = isSabaccBombOut(total);
  const idiotArray = isIdiotsArray(hand);
  let handType = 'normal';
  let rank = 0;
  let distance = Math.abs(SABACC_TARGET - Math.abs(total));

  if (idiotArray) {
    handType = 'idiots-array';
    rank = 100000;
    distance = 0;
  } else if (bombedOut) {
    handType = 'bomb-out';
    rank = -100000;
    distance = Math.abs(total) - SABACC_TARGET;
  } else if (total === SABACC_TARGET) {
    handType = 'pure-sabacc-positive';
    rank = 90000;
    distance = 0;
  } else if (total === -SABACC_TARGET) {
    handType = 'pure-sabacc-negative';
    rank = 85000;
    distance = 0;
  } else {
    const abs = Math.abs(total);
    rank = abs * 100 + (total > 0 ? 1 : 0);
  }

  return {
    total,
    absoluteValue: Math.abs(total),
    distance,
    bombedOut,
    specialWinner: idiotArray || total === SABACC_TARGET || total === -SABACC_TARGET,
    handType,
    rank,
    label: labelForSabaccEvaluation({ total, handType, bombedOut })
  };
}

export function labelForSabaccEvaluation(evaluation = {}) {
  if (evaluation.handType === 'idiots-array') return "Idiot's Array";
  if (evaluation.handType === 'pure-sabacc-positive') return '+23 Pure Sabacc';
  if (evaluation.handType === 'pure-sabacc-negative') return '-23 Pure Sabacc';
  if (evaluation.bombedOut || evaluation.handType === 'bomb-out') return `Bombed Out (${evaluation.total})`;
  return `${evaluation.total ?? 0}`;
}

export function compareSabaccHands(entries = []) {
  const evaluated = entries
    .map(entry => ({ ...entry, evaluation: entry.evaluation || evaluateSabaccHand(entry.cards || []) }))
    .sort((a, b) => {
      if (b.evaluation.rank !== a.evaluation.rank) return b.evaluation.rank - a.evaluation.rank;
      if (b.evaluation.absoluteValue !== a.evaluation.absoluteValue) return b.evaluation.absoluteValue - a.evaluation.absoluteValue;
      return Number(b.evaluation.total || 0) - Number(a.evaluation.total || 0);
    });
  const contenders = evaluated.filter(entry => !entry.evaluation.bombedOut);
  const winner = contenders[0] || null;
  if (!winner) {
    return {
      winnerSeatId: null,
      winner: null,
      evaluated,
      tied: false,
      specialWinner: false,
      reason: 'Every player bombed out.'
    };
  }
  const tied = contenders.slice(1).some(entry =>
    entry.evaluation.rank === winner.evaluation.rank
    && entry.evaluation.absoluteValue === winner.evaluation.absoluteValue
    && Number(entry.evaluation.total || 0) === Number(winner.evaluation.total || 0)
  );
  if (tied) {
    return {
      winnerSeatId: null,
      winner: null,
      evaluated,
      tied: true,
      specialWinner: false,
      reason: `Tied at ${winner.evaluation.label}`
    };
  }
  return {
    winnerSeatId: winner.seatId || null,
    winner,
    evaluated,
    tied: false,
    specialWinner: Boolean(winner.evaluation?.specialWinner),
    reason: winner.evaluation.label
  };
}
