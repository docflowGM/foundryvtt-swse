import { SABACC_MAX_HAND_SIZE, SABACC_MIN_HAND_SIZE, SABACC_TARGET } from './sabacc-deck.js';



export const SABACC_HAND_HIERARCHY_HELP = [
  { label: 'Pure Sabacc', description: 'Two lone Sylops with no other cards.' },
  { label: 'Rhylet', description: 'Three of a kind and two of a kind equalling zero.' },
  { label: 'Fleet', description: 'A Sylop plus any four of a kind equalling zero.' },
  { label: 'Banthas Wild', description: 'Three same-sign cards plus one or two mixed cards equalling zero.' },
  { label: 'Gee Whiz!', description: '+1/+2/+3/+4/-10 or -1/-2/-3/-4/+10.' },
  { label: 'Squadron', description: 'Four of a kind equalling zero.' },
  { label: 'Straight Khyron', description: 'A four-card straight that totals zero; suited beats mixed at equal count.' },
  { label: 'Rule of Two', description: 'Two positive/negative pairs, with optional fifth mixed card or Sylop.' },
  { label: 'Yee-Haa', description: 'A Sylop plus a matching positive/negative pair.' },
  { label: 'Regular Sabacc / Nulrhek', description: 'Zero wins over non-zero; otherwise closest to zero wins, with positive beating equal negative.' }
];

function safeCards(cards = []) {
  return Array.isArray(cards) ? cards.filter(Boolean) : [];
}

function valueOf(card = {}) { return Number(card.value || 0) || 0; }
function absValueOf(card = {}) { return Math.abs(valueOf(card)); }
function isSylop(card = {}) { return card?.type === 'sylop' || card?.catalogId === 'sylop' || Number(card?.value || 0) === 0; }
function positiveValues(cards = []) { return safeCards(cards).map(valueOf).filter(value => value > 0); }
function highPositiveCard(cards = []) { return Math.max(0, ...positiveValues(cards)); }
function positiveTotal(cards = []) { return positiveValues(cards).reduce((sum, value) => sum + value, 0); }
function sylopCount(cards = []) { return safeCards(cards).filter(isSylop).length; }
function nonSylopCards(cards = []) { return safeCards(cards).filter(card => !isSylop(card)); }

function counts(values = []) {
  const map = new Map();
  for (const value of values) map.set(value, (map.get(value) || 0) + 1);
  return map;
}

function exactValueCounts(cards = []) { return counts(nonSylopCards(cards).map(valueOf)); }
function absoluteValueCounts(cards = []) { return counts(nonSylopCards(cards).map(absValueOf)); }

function isSuited(cards = []) {
  const suits = Array.from(new Set(nonSylopCards(cards).map(card => card.suit).filter(Boolean)));
  return suits.length === 1;
}

function hasPositiveNegativePair(cards = [], absValue = null) {
  const hand = nonSylopCards(cards);
  const values = absValue === null ? Array.from(new Set(hand.map(absValueOf))) : [absValue];
  return values.some(value => hand.some(card => valueOf(card) === value) && hand.some(card => valueOf(card) === -value));
}

function countPositiveNegativePairs(cards = []) {
  return Array.from(new Set(nonSylopCards(cards).map(absValueOf))).filter(value => hasPositiveNegativePair(cards, value)).length;
}

function hasConsecutiveAbsRun(cards = [], length = 4) {
  const unique = Array.from(new Set(nonSylopCards(cards).map(absValueOf).filter(Boolean))).sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    run = unique[i] === unique[i - 1] + 1 ? run + 1 : 1;
    if (run >= length) return true;
  }
  return unique.length >= length && unique.every((value, index) => index === 0 || value === unique[index - 1] + 1);
}

function classifySpecialHand(cards = [], total = 0) {
  const hand = safeCards(cards);
  const nonSylops = nonSylopCards(hand);
  const exactCounts = exactValueCounts(hand);
  const absCounts = absoluteValueCounts(hand);
  const sylops = sylopCount(hand);
  const suited = isSuited(hand);
  const posTotal = positiveTotal(hand);
  const highPos = highPositiveCard(hand);
  const cardCount = hand.length;
  const nonSylopValues = nonSylops.map(valueOf).sort((a, b) => a - b);
  const valueSet = nonSylopValues.join(',');
  const make = (id, label, specialRank, extra = []) => ({ id, label, specialRank, vector: [900, specialRank, ...extra, cardCount, suited ? 1 : 0, posTotal, highPos, sylops] });

  if (cardCount === 2 && sylops === 2) return make('pure-sabacc', 'Pure Sabacc', 1000);
  if (total !== 0) return null;

  const exactCountsSorted = Array.from(exactCounts.values()).sort((a, b) => b - a).join(',');
  if (cardCount === 5 && exactCountsSorted === '3,2') return make('rhylet', 'Rhylet', 990);

  if (sylops >= 1 && Array.from(absCounts.values()).some(count => count >= 4)) return make('fleet', 'Fleet', 980);

  if (Array.from(exactCounts.values()).some(count => count >= 3)) return make('banthas-wild', 'Banthas Wild', 970);

  if (cardCount === 5 && (valueSet === '-10,1,2,3,4' || valueSet === '-4,-3,-2,-1,10')) {
    return make('gee-whiz', 'Gee Whiz!', 960, [suited ? 1 : 0, highPos]);
  }

  if (cardCount >= 4 && Array.from(absCounts.values()).some(count => count >= 4)) return make('squadron', 'Squadron', 950);

  if (cardCount >= 4 && hasConsecutiveAbsRun(hand, 4)) return make('straight-khyron', 'Straight Khyron', 940, [cardCount, suited ? 1 : 0]);

  if (countPositiveNegativePairs(hand) >= 2 && cardCount >= 4) return make('rule-of-two', 'Rule of Two', 930, [cardCount, suited ? 1 : 0]);

  if (sylops >= 1 && countPositiveNegativePairs(hand) >= 1 && cardCount >= 3) return make('yee-haa', 'Yee-Haa', 920, [cardCount, suited ? 1 : 0]);

  if (sylops >= 1 && hand.some(card => valueOf(card) === 2 && card.suit) && hand.some(card => valueOf(card) === 3 && card.suit && card.suit === hand.find(two => valueOf(two) === 2 && two.suit)?.suit)) {
    return make('idiots-array', "Idiot's Array", 910, [suited ? 1 : 0]);
  }

  return null;
}

function regularHandVector(cards = [], total = 0) {
  const hand = safeCards(cards);
  const cardCount = hand.length;
  const distance = Math.abs(total - SABACC_TARGET);
  const positiveTie = total > 0 ? 1 : 0;
  const suited = isSuited(hand) ? 1 : 0;
  const posTotal = positiveTotal(hand);
  const highPos = highPositiveCard(hand);
  const sylops = sylopCount(hand);
  if (total === 0) {
    const paired = cardCount === 2 && hasPositiveNegativePair(hand);
    const sabaccTier = paired ? 1 : cardCount;
    return [700, sabaccTier, suited, posTotal, highPos, sylops];
  }
  return [500, -distance, positiveTie, cardCount, suited, posTotal, highPos, sylops];
}

function labelForRegular(cards = [], total = 0) {
  const cardCount = safeCards(cards).length;
  const suited = isSuited(cards);
  if (total === 0) {
    if (cardCount === 2 && hasPositiveNegativePair(cards)) return `Paired Sabacc${suited ? ' (Suited)' : ''}`;
    return `${cardCount}-Card Sabacc${suited ? ' (Suited)' : ''}`;
  }
  return `Nulrhek ${total > 0 ? '+' : ''}${total}`;
}

function compareVectors(a = [], b = []) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const av = Number(a[i] || 0);
    const bv = Number(b[i] || 0);
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

export function scoreSabaccHand(cards = []) {
  return safeCards(cards).reduce((sum, card) => sum + valueOf(card), 0);
}

export function isSabaccBombOut(_total) {
  return false;
}

export function isIdiotsArray(cards = []) {
  return classifySpecialHand(cards, scoreSabaccHand(cards))?.id === 'idiots-array';
}

export function evaluateSabaccHand(cards = []) {
  const hand = safeCards(cards).slice(0, SABACC_MAX_HAND_SIZE);
  const total = scoreSabaccHand(hand);
  const special = classifySpecialHand(hand, total);
  const enoughCards = hand.length >= SABACC_MIN_HAND_SIZE;
  const rankVector = enoughCards
    ? (special?.vector || regularHandVector(hand, total))
    : [0, -999, hand.length];
  const label = !enoughCards ? `Incomplete (${hand.length}/${SABACC_MIN_HAND_SIZE})` : (special?.label || labelForRegular(hand, total));
  const rank = rankVector.reduce((sum, value, index) => sum + Number(value || 0) * (1000000 / Math.pow(10, index)), 0);

  return {
    total,
    target: SABACC_TARGET,
    absoluteValue: Math.abs(total),
    distance: Math.abs(total - SABACC_TARGET),
    bombedOut: false,
    canWin: enoughCards,
    specialWinner: Boolean(special || total === 0),
    claimsSabaccPot: Boolean(enoughCards && total === 0),
    handType: special?.id || (total === 0 ? 'sabacc' : 'nulrhek'),
    handRankLabel: label,
    rank,
    rankVector,
    cardCount: hand.length,
    suited: isSuited(hand),
    positiveTotal: positiveTotal(hand),
    highPositiveCard: highPositiveCard(hand),
    sylopCount: sylopCount(hand),
    label
  };
}

export function labelForSabaccEvaluation(evaluation = {}) {
  return evaluation.label || evaluation.handRankLabel || `${evaluation.total ?? 0}`;
}

export function compareSabaccEvaluations(a = {}, b = {}) {
  return compareVectors(a.rankVector || [], b.rankVector || []);
}

export function compareSabaccHands(entries = []) {
  const evaluated = entries
    .map(entry => ({ ...entry, evaluation: entry.evaluation || evaluateSabaccHand(entry.cards || []) }))
    .filter(entry => entry.evaluation?.canWin)
    .sort((a, b) => -compareSabaccEvaluations(a.evaluation, b.evaluation));

  const winner = evaluated[0] || null;
  if (!winner) {
    return { winnerSeatId: null, winner: null, evaluated, tied: false, tiedSeatIds: [], specialWinner: false, claimsSabaccPot: false, reason: 'No player has a ranked Sabacc hand.' };
  }

  const tiedEntries = evaluated.filter(entry => compareSabaccEvaluations(entry.evaluation, winner.evaluation) === 0);
  const tied = tiedEntries.length > 1;
  if (tied) {
    return {
      winnerSeatId: null,
      winner: null,
      evaluated,
      tied: true,
      tiedSeatIds: tiedEntries.map(entry => entry.seatId).filter(Boolean),
      specialWinner: Boolean(winner.evaluation?.specialWinner),
      claimsSabaccPot: Boolean(winner.evaluation?.claimsSabaccPot),
      reason: `Tied at ${winner.evaluation.label}`
    };
  }

  return {
    winnerSeatId: winner.seatId || null,
    winner,
    evaluated,
    tied: false,
    tiedSeatIds: [],
    specialWinner: Boolean(winner.evaluation?.specialWinner),
    claimsSabaccPot: Boolean(winner.evaluation?.claimsSabaccPot),
    reason: winner.evaluation.label
  };
}
