/**
 * Pazaak deck utilities.
 *
 * The MVP assumes every side-deck card is unlocked, but the player must still
 * build a legal side deck before play: exactly 10 unique side-deck cards, of
 * which 4 are randomly selected into the player's match hand.
 */

export const PAZAAK_TARGET = 20;
export const PAZAAK_SETS_TO_WIN = 3;
export const PAZAAK_SIDE_DECK_SIZE = 10;
export const PAZAAK_HAND_SIZE = 4;
export const PAZAAK_TABLE_LIMIT = 9;

const SIDE_CARD_CATALOG = [
  ...[1, 2, 3, 4, 5, 6].map(value => ({
    id: `plus-${value}`,
    label: `+${value}`,
    shortLabel: `+${value}`,
    type: 'plus',
    value,
    tone: 'plus',
    description: `Adds ${value} to your total.`,
    sort: 100 + value
  })),
  ...[1, 2, 3, 4, 5, 6].map(value => ({
    id: `minus-${value}`,
    label: `-${value}`,
    shortLabel: `-${value}`,
    type: 'minus',
    value,
    tone: 'minus',
    description: `Subtracts ${value} from your total.`,
    sort: 200 + value
  })),
  ...[1, 2, 3, 4, 5, 6].map(value => ({
    id: `plus-minus-${value}`,
    label: `+/- ${value}`,
    shortLabel: `±${value}`,
    type: 'plusMinus',
    value,
    tone: 'choice',
    requiresChoice: true,
    choiceKind: 'sign',
    description: `Can add or subtract ${value} when played.`,
    sort: 300 + value
  })),
  {
    id: 'plus-minus-1-2',
    label: '+/- 1 or 2',
    shortLabel: '±1/2',
    type: 'plusMinusRange',
    values: [1, 2],
    tone: 'choice',
    requiresChoice: true,
    choiceKind: 'sign-value',
    description: 'Can become +1, -1, +2, or -2 when played.',
    sort: 401
  },
  {
    id: 'flip-2-4',
    label: 'Flip 2 & 4',
    shortLabel: '2/4↧',
    type: 'flip',
    values: [2, 4],
    tone: 'advanced',
    description: 'Turns your positive 2s and 4s in play into negative cards.',
    sort: 501
  },
  {
    id: 'flip-3-6',
    label: 'Flip 3 & 6',
    shortLabel: '3/6↧',
    type: 'flip',
    values: [3, 6],
    tone: 'advanced',
    description: 'Turns your positive 3s and 6s in play into negative cards.',
    sort: 502
  },
  {
    id: 'double',
    label: 'Double',
    shortLabel: 'x2',
    type: 'double',
    tone: 'advanced',
    description: 'Doubles the value of your last card in play.',
    sort: 601
  },
  {
    id: 'tiebreaker',
    label: 'Tiebreaker',
    shortLabel: 'TB',
    type: 'tiebreaker',
    value: 1,
    tone: 'advanced',
    requiresChoice: true,
    choiceKind: 'sign',
    description: 'Acts as +/-1 and wins the set for you if scores tie.',
    sort: 701
  }
];

const CATALOG_BY_ID = new Map(SIDE_CARD_CATALOG.map(card => [card.id, card]));

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'pz') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

export function getPazaakSideCardCatalog() {
  return SIDE_CARD_CATALOG.map(clone);
}

export function getPazaakSideCard(cardId) {
  const card = CATALOG_BY_ID.get(String(cardId || ''));
  return card ? clone(card) : null;
}

export function normalizeSideDeckIds(cardIds = []) {
  const seen = new Set();
  const normalized = [];
  for (const rawId of Array.isArray(cardIds) ? cardIds : []) {
    const id = String(rawId || '').trim();
    if (!id || seen.has(id) || !CATALOG_BY_ID.has(id)) continue;
    seen.add(id);
    normalized.push(id);
    if (normalized.length >= PAZAAK_SIDE_DECK_SIZE) break;
  }
  return normalized;
}

export function validateSideDeck(cardIds = []) {
  const normalized = normalizeSideDeckIds(cardIds);
  const required = PAZAAK_SIDE_DECK_SIZE;
  const errors = [];
  if (normalized.length !== required) errors.push(`Choose exactly ${required} side-deck cards.`);
  return {
    valid: errors.length === 0,
    errors,
    cardIds: normalized,
    count: normalized.length,
    required
  };
}

export function buildDefaultPazaakSideDeckIds(profile = 'balanced') {
  if (profile === 'aggressive') {
    return normalizeSideDeckIds(['plus-6', 'plus-5', 'plus-4', 'plus-3', 'plus-minus-6', 'plus-minus-5', 'plus-minus-4', 'double', 'tiebreaker', 'minus-6']);
  }
  if (profile === 'cautious') {
    return normalizeSideDeckIds(['minus-6', 'minus-5', 'minus-4', 'minus-3', 'plus-minus-6', 'plus-minus-5', 'plus-minus-4', 'plus-minus-1-2', 'flip-2-4', 'tiebreaker']);
  }
  return normalizeSideDeckIds(['plus-3', 'plus-4', 'plus-5', 'minus-3', 'minus-4', 'minus-5', 'plus-minus-3', 'plus-minus-4', 'plus-minus-5', 'tiebreaker']);
}

export function shuffleCards(cards = []) {
  const deck = clone(cards) || [];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function buildPazaakMainDeck() {
  const cards = [];
  for (let copy = 0; copy < 4; copy += 1) {
    for (let value = 1; value <= 10; value += 1) {
      cards.push({
        instanceId: randomId('main'),
        catalogId: `main-${value}`,
        source: 'main',
        type: 'main',
        label: String(value),
        shortLabel: String(value),
        value,
        baseValue: value,
        tone: 'main'
      });
    }
  }
  return shuffleCards(cards);
}

export function buildOpeningHand(sideDeckIds = []) {
  return shuffleCards(normalizeSideDeckIds(sideDeckIds))
    .slice(0, PAZAAK_HAND_SIZE)
    .map(cardId => ({ ...getPazaakSideCard(cardId), catalogId: cardId, instanceId: randomId('side'), source: 'side' }));
}

export function drawMainCard(mainDeck = []) {
  const deck = Array.isArray(mainDeck) ? mainDeck.slice() : [];
  const card = deck.shift() ?? buildPazaakMainDeck().shift();
  return { card, mainDeck: deck };
}
