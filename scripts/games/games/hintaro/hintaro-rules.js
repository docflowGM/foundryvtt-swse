/**
 * Hintaro rules helpers.
 *
 * Proper Symbolic Hintaro uses two Tukar/Kulro regular cubes per player plus
 * the hintaron's Hin/Taro cancellation die. This implementation intentionally
 * does not expose the simplified standard chance-cube variant yet.
 */

export const HINTARO_SYMBOLS = Object.freeze({
  TUKAR: 'tukar',
  KULRO: 'kulro',
  HIN: 'hin',
  TARO: 'taro',
  BLANK: 'blank'
});

export const HINTARO_RANKS = Object.freeze({
  NONE: 0,
  KULRO_KULRO: 1,
  TUKAR_TUKAR: 2,
  QUAD_KULRO: 3,
  TUKAR_TO_KULRO: 4
});

export const HINTARO_RANK_LABELS = Object.freeze({
  [HINTARO_RANKS.NONE]: 'No Rank',
  [HINTARO_RANKS.KULRO_KULRO]: 'Kulro Kulro',
  [HINTARO_RANKS.TUKAR_TUKAR]: 'Tukar Tukar',
  [HINTARO_RANKS.QUAD_KULRO]: 'Quad Kulro',
  [HINTARO_RANKS.TUKAR_TO_KULRO]: 'Tukar to Kulro'
});


export const HINTARO_CANCELLATION_RULES = Object.freeze([
  { face: 'Hin', faceSymbol: HINTARO_SYMBOLS.HIN, cancels: 'Tukar', cancelsSymbol: HINTARO_SYMBOLS.TUKAR, description: 'Hin cancels one Tukar symbol from each player roll.' },
  { face: 'Taro', faceSymbol: HINTARO_SYMBOLS.TARO, cancels: 'Kulro', cancelsSymbol: HINTARO_SYMBOLS.KULRO, description: 'Taro cancels one Kulro symbol from each player roll.' }
]);

export const HINTARO_LIFECYCLE_STEPS = Object.freeze([
  { step: 1, label: 'Hintaron', description: 'Designate the hintaron/dealer for this round.' },
  { step: 2, label: 'Ante', description: "Players ante, beginning to the hintaron\'s left." },
  { step: 3, label: 'Cast Cubes', description: 'Each player rolls two regular Tukar/Kulro chance cubes.' },
  { step: 4, label: 'Wager', description: "Betting begins to the hintaron\'s right; players meet, raise, or drop." },
  { step: 5, label: 'Reroll', description: "Players may reroll one regular cube, beginning to the hintaron\'s left." },
  { step: 6, label: 'Hintaro Die', description: 'The hintaron rolls the special die; Hin/Taro cancellations modify all rolls before ranking.' }
]);

export const HINTARO_MODE_LABELS = Object.freeze({
  rotating: 'Rotating table hintaron',
  casino: 'Fixed casino hintaron'
});

export function normalizeHintaronMode(mode = 'rotating') {
  return String(mode || '').trim().toLowerCase() === 'casino' ? 'casino' : 'rotating';
}

export function getHintaroCancellationRules() {
  return HINTARO_CANCELLATION_RULES.map(rule => ({ ...rule }));
}

export function getHintaroLifecycleSteps() {
  return HINTARO_LIFECYCLE_STEPS.map(step => ({ ...step }));
}

const REGULAR_FACES = Object.freeze([
  HINTARO_SYMBOLS.TUKAR,
  HINTARO_SYMBOLS.TUKAR,
  HINTARO_SYMBOLS.TUKAR,
  HINTARO_SYMBOLS.KULRO,
  HINTARO_SYMBOLS.KULRO,
  HINTARO_SYMBOLS.KULRO
]);

const HINTARO_FACES = Object.freeze([
  { label: 'Blank', hin: 0, taro: 0, symbols: [] },
  { label: 'Hin', hin: 1, taro: 0, symbols: [HINTARO_SYMBOLS.HIN] },
  { label: 'Hin', hin: 1, taro: 0, symbols: [HINTARO_SYMBOLS.HIN] },
  { label: 'Taro', hin: 0, taro: 1, symbols: [HINTARO_SYMBOLS.TARO] },
  { label: 'Taro', hin: 0, taro: 1, symbols: [HINTARO_SYMBOLS.TARO] },
  { label: 'Hin/Taro', hin: 1, taro: 1, symbols: [HINTARO_SYMBOLS.HIN, HINTARO_SYMBOLS.TARO] }
]);

function randomIndex(length) {
  return Math.floor(Math.random() * Math.max(1, length));
}

export function rollHintaroRegularDie() {
  return REGULAR_FACES[randomIndex(REGULAR_FACES.length)];
}

export function rollHintaroRegularDice(count = 4) {
  return Array.from({ length: Math.max(1, Number(count) || 4) }, () => rollHintaroRegularDie());
}

export function rollHintaroRegularDieSymbols() {
  return [rollHintaroRegularDie(), rollHintaroRegularDie()];
}

export function rollHintaroPlayerDice() {
  const dice = [rollHintaroRegularDieSymbols(), rollHintaroRegularDieSymbols()];
  return { dice, symbols: dice.flat() };
}

export function rollHintaroDie() {
  const face = HINTARO_FACES[randomIndex(HINTARO_FACES.length)];
  return { ...face, symbols: [...face.symbols] };
}

export function countHintaroSymbols(symbols = []) {
  return symbols.reduce((counts, symbol) => {
    if (symbol === HINTARO_SYMBOLS.TUKAR) counts.tukar += 1;
    if (symbol === HINTARO_SYMBOLS.KULRO) counts.kulro += 1;
    return counts;
  }, { tukar: 0, kulro: 0 });
}

/**
 * Hintaro cancellation mapping used by the Holopad ruleset:
 * Hin cancels Tukar; Taro cancels Kulro.
 */
export function evaluateHintaroRoll(symbols = [], hintaro = null) {
  const base = countHintaroSymbols(symbols);
  const hin = Math.max(0, Number(hintaro?.hin || 0));
  const taro = Math.max(0, Number(hintaro?.taro || 0));
  const tukar = Math.max(0, base.tukar - hin);
  const kulro = Math.max(0, base.kulro - taro);
  let rank = HINTARO_RANKS.NONE;

  if (tukar === 2 && kulro === 2) rank = HINTARO_RANKS.TUKAR_TO_KULRO;
  else if (kulro === 4) rank = HINTARO_RANKS.QUAD_KULRO;
  else if (tukar >= 2) rank = HINTARO_RANKS.TUKAR_TUKAR;
  else if (kulro >= 2) rank = HINTARO_RANKS.KULRO_KULRO;

  return {
    rank,
    rankLabel: HINTARO_RANK_LABELS[rank] || 'No Rank',
    base,
    modified: { tukar, kulro },
    cancelled: { tukar: Math.min(base.tukar, hin), kulro: Math.min(base.kulro, taro) },
    canWin: rank > HINTARO_RANKS.NONE
  };
}

export function compareHintaroEvaluations(a = {}, b = {}) {
  const ar = Number(a.rank || 0);
  const br = Number(b.rank || 0);
  if (ar !== br) return ar > br ? 1 : -1;
  return 0;
}

export function getHintaroRankLabel(rank) {
  return HINTARO_RANK_LABELS[Number(rank || 0)] || 'No Rank';
}
