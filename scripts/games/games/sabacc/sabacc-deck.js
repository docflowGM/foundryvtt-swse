/**
 * Sabacc deck utilities.
 *
 * Custom state only. This intentionally does not use Foundry Cards.
 */

export const SABACC_TARGET = 23;
export const SABACC_STARTING_HAND_SIZE = 2;

export const SABACC_SUITS = Object.freeze([
  { id: 'sabers', label: 'Sabers', short: 'S' },
  { id: 'staves', label: 'Staves', short: 'T' },
  { id: 'flasks', label: 'Flasks', short: 'F' },
  { id: 'coins', label: 'Coins', short: 'C' }
]);

export const SABACC_SPECIAL_CARDS = Object.freeze([
  { id: 'idiot', label: 'The Idiot', short: '0', value: 0, type: 'special', copies: 2, description: 'The zero card used in an Idiot\'s Array.' },
  { id: 'queen_air_darkness', label: 'Queen of Air and Darkness', short: '-2', value: -2, type: 'special', copies: 2 },
  { id: 'endurance', label: 'Endurance', short: '-8', value: -8, type: 'special', copies: 2 },
  { id: 'balance', label: 'Balance', short: '-11', value: -11, type: 'special', copies: 2 },
  { id: 'demise', label: 'Demise', short: '-13', value: -13, type: 'special', copies: 2 },
  { id: 'moderation', label: 'Moderation', short: '-14', value: -14, type: 'special', copies: 2 },
  { id: 'evil_one', label: 'The Evil One', short: '-15', value: -15, type: 'special', copies: 2 },
  { id: 'star', label: 'The Star', short: '-17', value: -17, type: 'special', copies: 2 }
]);

function randomId(prefix = 'sab') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

export function buildSabaccNumberCard(suit, value) {
  return {
    id: randomId('sab_card'),
    catalogId: `${suit.id}_${value}`,
    type: 'number',
    suit: suit.id,
    suitLabel: suit.label,
    suitShort: suit.short,
    rank: value,
    value,
    label: `${value} of ${suit.label}`,
    shortLabel: `${value}${suit.short}`
  };
}

export function buildSabaccSpecialCard(special) {
  return {
    id: randomId('sab_card'),
    catalogId: special.id,
    type: 'special',
    suit: null,
    suitLabel: 'Special',
    suitShort: '★',
    rank: special.id,
    value: special.value,
    label: special.label,
    shortLabel: special.short,
    description: special.description || ''
  };
}

export function buildSabaccDeck() {
  const cards = [];
  for (const suit of SABACC_SUITS) {
    for (let value = 1; value <= 15; value += 1) cards.push(buildSabaccNumberCard(suit, value));
  }
  for (const special of SABACC_SPECIAL_CARDS) {
    for (let i = 0; i < Number(special.copies || 2); i += 1) cards.push(buildSabaccSpecialCard(special));
  }
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
