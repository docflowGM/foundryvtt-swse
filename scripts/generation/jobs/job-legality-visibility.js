/**
 * PHASE 8D-2 foundation — Job legality/visibility vocabulary.
 *
 * `JOB_VISIBILITY.POSTED` deliberately matches
 * `faction-draft.js`'s `normalizeJobDefaultsDraft()` default
 * (`visibility: cleanString(input.visibility) || 'posted'`) exactly, so
 * a rolled visibility value can be written straight into a Faction
 * draft's `jobDefaults.visibility` without translation.
 */

import { weightedPick } from '../lib/weighted-random.js';

export const JOB_LEGALITY = Object.freeze({
  LEGAL: 'legal',
  GRAY_AREA: 'gray-area',
  ILLEGAL: 'illegal',
  BLACK_MARKET: 'black-market'
});

export const JOB_VISIBILITY = Object.freeze({
  POSTED: 'posted',
  DISCREET: 'discreet',
  HIDDEN: 'hidden',
  WORD_OF_MOUTH: 'word-of-mouth'
});

const LEGALITY_ENTRIES = Object.freeze([
  { value: JOB_LEGALITY.LEGAL, weight: 4 },
  { value: JOB_LEGALITY.GRAY_AREA, weight: 3 },
  { value: JOB_LEGALITY.ILLEGAL, weight: 3 },
  { value: JOB_LEGALITY.BLACK_MARKET, weight: 1 }
]);

const VISIBILITY_ENTRIES = Object.freeze([
  { value: JOB_VISIBILITY.POSTED, weight: 4 },
  { value: JOB_VISIBILITY.DISCREET, weight: 3 },
  { value: JOB_VISIBILITY.HIDDEN, weight: 2 },
  { value: JOB_VISIBILITY.WORD_OF_MOUTH, weight: 2 }
]);

const LEGALITY_VALUES = Object.freeze(Object.values(JOB_LEGALITY));
const VISIBILITY_VALUES = Object.freeze(Object.values(JOB_VISIBILITY));

export function isJobLegality(value) {
  return LEGALITY_VALUES.includes(value);
}

export function isJobVisibility(value) {
  return VISIBILITY_VALUES.includes(value);
}

/** Pick a random legality entry: `{ value, weight }`. */
export function pickJobLegality({ rng } = {}) {
  return weightedPick(LEGALITY_ENTRIES, { rng });
}

/** Pick a random visibility entry: `{ value, weight }`. */
export function pickJobVisibility({ rng } = {}) {
  return weightedPick(VISIBILITY_ENTRIES, { rng });
}
