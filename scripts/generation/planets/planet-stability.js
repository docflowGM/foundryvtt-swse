/**
 * PHASE 8D-2 foundation — procedural planet political/social stability
 * generator. Small enough to keep its table inline rather than a
 * separate `data/` file (matching `location-draft.js`'s own precedent
 * of an inline mode enum for a small closed vocabulary). Feeds directly
 * into `description-composer.js`'s `composeLocationSummary({stability})`
 * field.
 */

import { weightedPick } from '../lib/weighted-random.js';

export const PLANET_STABILITY = Object.freeze({
  STABLE: 'stable',
  TENSE: 'tense',
  UNSTABLE: 'unstable',
  CIVIL_UNREST: 'civil unrest',
  OCCUPIED: 'occupied',
  CONTESTED: 'contested',
  LAWLESS: 'lawless'
});

const STABILITY_ENTRIES = Object.freeze([
  { value: PLANET_STABILITY.STABLE, weight: 5 },
  { value: PLANET_STABILITY.TENSE, weight: 4 },
  { value: PLANET_STABILITY.UNSTABLE, weight: 2 },
  { value: PLANET_STABILITY.CIVIL_UNREST, weight: 2 },
  { value: PLANET_STABILITY.OCCUPIED, weight: 1 },
  { value: PLANET_STABILITY.CONTESTED, weight: 2 },
  { value: PLANET_STABILITY.LAWLESS, weight: 1 }
]);

const STABILITY_VALUES = Object.freeze(Object.values(PLANET_STABILITY));

export function isPlanetStability(value) {
  return STABILITY_VALUES.includes(value);
}

/** Pick a random stability entry: `{ value, weight }`. */
export function pickPlanetStability({ rng } = {}) {
  return weightedPick(STABILITY_ENTRIES, { rng });
}
