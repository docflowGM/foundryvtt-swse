/**
 * Sabacc deck utilities.
 *
 * Custom state only. This intentionally does not use Foundry Cards.
 * The default table now uses a Galaxy/Corellian Spike-style deck:
 * +10 through -10 in three suits, plus two Sylops.
 */

export const SABACC_TARGET = 0;
export const SABACC_STARTING_HAND_SIZE = 2;
export const SABACC_MAX_HAND_SIZE = 5;
export const SABACC_MIN_HAND_SIZE = 2;
export const SABACC_CARD_ASSET_ROOT = '/systems/foundryvtt-swse/assets/cards/sabacc';

export const SABACC_SUITS = Object.freeze([
  { id: 'circles', label: 'Circles', short: 'C', assetCode: 'cir' },
  { id: 'triangles', label: 'Triangles', short: 'T', assetCode: 'tri' },
  { id: 'squares', label: 'Squares', short: 'Q', assetCode: 'sqr' }
]);

function randomId(prefix = 'sab') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function padValue(value) {
  return String(Math.abs(Number(value || 0))).padStart(2, '0');
}

export function sabaccCardImagePath({ suit = null, value = 0, type = 'number' } = {}) {
  if (type === 'sylop' || Number(value || 0) === 0) return `${SABACC_CARD_ASSET_ROOT}/sabacc_sylop_thumb.png`;
  const suitDef = SABACC_SUITS.find(entry => entry.id === suit || entry.assetCode === suit) || SABACC_SUITS[0];
  const sign = Number(value || 0) < 0 ? 'neg' : 'pos';
  return `${SABACC_CARD_ASSET_ROOT}/sabacc_${sign}_${suitDef.assetCode}_${padValue(value)}_thumb.png`;
}

export function buildSabaccNumberCard(suit, value) {
  const numeric = Number(value || 0);
  const signLabel = numeric > 0 ? `+${numeric}` : String(numeric);
  return {
    id: randomId('sab_card'),
    catalogId: `${suit.id}_${numeric > 0 ? 'p' : 'm'}${Math.abs(numeric)}`,
    type: 'number',
    suit: suit.id,
    suitLabel: suit.label,
    suitShort: suit.short,
    rank: Math.abs(numeric),
    value: numeric,
    absValue: Math.abs(numeric),
    sign: numeric > 0 ? 'positive' : 'negative',
    label: `${signLabel} of ${suit.label}`,
    shortLabel: `${signLabel}${suit.short}`,
    image: sabaccCardImagePath({ suit: suit.id, value: numeric, type: 'number' })
  };
}

export function buildSabaccSylopCard(index = 0) {
  return {
    id: randomId('sab_card'),
    catalogId: `sylop_${index + 1}`,
    type: 'sylop',
    suit: null,
    suitLabel: 'Sylop',
    suitShort: '0',
    rank: 0,
    value: 0,
    absValue: 0,
    sign: 'neutral',
    label: 'Sylop',
    shortLabel: 'Sylop',
    image: sabaccCardImagePath({ type: 'sylop', value: 0 }),
    description: 'A zero-value Sabacc card. In non-special ties, a Sylop can act as a trump card.'
  };
}

export function buildSabaccDeck() {
  const cards = [];
  for (const suit of SABACC_SUITS) {
    for (let value = 1; value <= 10; value += 1) {
      cards.push(buildSabaccNumberCard(suit, value));
      cards.push(buildSabaccNumberCard(suit, -value));
    }
  }
  cards.push(buildSabaccSylopCard(0));
  cards.push(buildSabaccSylopCard(1));
  return shuffleSabaccDeck(cards);
}

export function shuffleSabaccDeck(cards = []) {
  const deck = clone(cards) || [];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawSabaccCard(deck = []) {
  const next = Array.isArray(deck) ? [...deck] : [];
  const card = next.shift() ?? buildSabaccDeck().shift();
  return { card, deck: next };
}

export function drawSabaccCards(deck = [], count = SABACC_STARTING_HAND_SIZE) {
  const cards = [];
  let nextDeck = Array.isArray(deck) ? [...deck] : [];
  for (let i = 0; i < count; i += 1) {
    const drawn = drawSabaccCard(nextDeck);
    cards.push(drawn.card);
    nextDeck = drawn.deck;
  }
  return { cards, deck: nextDeck };
}

export function shiftSabaccCard(card = null) {
  const deck = buildSabaccDeck();
  const drawn = drawSabaccCard(deck);
  return {
    ...(drawn.card || card || {}),
    id: card?.id || randomId('sab_shift'),
    shiftedFrom: card ? { catalogId: card.catalogId, label: card.label, value: card.value } : null,
    shiftedAt: Date.now()
  };
}
