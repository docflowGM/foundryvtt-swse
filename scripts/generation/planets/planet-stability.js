/**
 * PHASE 8D-2 foundation — procedural planet political/social stability
 * generator. Small enough to keep its table inline rather than a
 * separate `data/` file (matching `location-draft.js`'s own precedent
 * of an inline mode enum for a small closed vocabulary). Feeds directly
 * into `description-composer.js`'s `composeLocationSummary({stability})`
 * field.
 *
 * PHASE 8D-3A production expansion: grown from 7 to 22 political-
 * condition states, covering the full spread the phase spec named.
 * This influences illicit-trade likelihood (`planets/planet-trade.js`)
 * and, later, Job/Faction hooks -- narrative flavor only, never a
 * mechanical modifier.
 */

import { weightedPick } from '../lib/weighted-random.js';

export const PLANET_STABILITY = Object.freeze({
  STABLE: 'stable',
  PROSPEROUS: 'prosperous',
  TENSE: 'tense',
  CORRUPT: 'corrupt',
  AUTHORITARIAN: 'authoritarian',
  DECLINING: 'declining',
  UNSTABLE: 'unstable',
  FRACTURED: 'fractured',
  CIVIL_UNREST: 'civil unrest',
  POPULAR_UNREST: 'popular-unrest',
  REBELLIOUS: 'rebellious',
  CIVIL_WAR: 'civil-war',
  OCCUPIED: 'occupied',
  CONTESTED: 'contested',
  LAWLESS: 'lawless',
  RECENTLY_LIBERATED: 'recently-liberated',
  RECOVERING: 'recovering',
  ISOLATED: 'isolated',
  UNDER_BLOCKADE: 'under-blockade',
  SUCCESSION_CRISIS: 'succession-crisis',
  ECONOMIC_CRISIS: 'economic-crisis',
  POLITICAL_REFORM: 'political-reform'
});

const STABILITY_ENTRIES = Object.freeze([
  { value: PLANET_STABILITY.STABLE, weight: 5 },
  { value: PLANET_STABILITY.PROSPEROUS, weight: 3 },
  { value: PLANET_STABILITY.TENSE, weight: 4 },
  { value: PLANET_STABILITY.CORRUPT, weight: 2 },
  { value: PLANET_STABILITY.AUTHORITARIAN, weight: 2 },
  { value: PLANET_STABILITY.DECLINING, weight: 2 },
  { value: PLANET_STABILITY.UNSTABLE, weight: 2 },
  { value: PLANET_STABILITY.FRACTURED, weight: 1 },
  { value: PLANET_STABILITY.CIVIL_UNREST, weight: 2 },
  { value: PLANET_STABILITY.POPULAR_UNREST, weight: 2 },
  { value: PLANET_STABILITY.REBELLIOUS, weight: 1 },
  { value: PLANET_STABILITY.CIVIL_WAR, weight: 1 },
  { value: PLANET_STABILITY.OCCUPIED, weight: 1 },
  { value: PLANET_STABILITY.CONTESTED, weight: 2 },
  { value: PLANET_STABILITY.LAWLESS, weight: 1 },
  { value: PLANET_STABILITY.RECENTLY_LIBERATED, weight: 1 },
  { value: PLANET_STABILITY.RECOVERING, weight: 2 },
  { value: PLANET_STABILITY.ISOLATED, weight: 2 },
  { value: PLANET_STABILITY.UNDER_BLOCKADE, weight: 1 },
  { value: PLANET_STABILITY.SUCCESSION_CRISIS, weight: 1 },
  { value: PLANET_STABILITY.ECONOMIC_CRISIS, weight: 2 },
  { value: PLANET_STABILITY.POLITICAL_REFORM, weight: 1 }
]);

const STABILITY_VALUES = Object.freeze(Object.values(PLANET_STABILITY));

export function isPlanetStability(value) {
  return STABILITY_VALUES.includes(value);
}

/** Pick a random stability entry: `{ value, weight }`. */
export function pickPlanetStability({ rng } = {}) {
  return weightedPick(STABILITY_ENTRIES, { rng });
}
