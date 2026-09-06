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
 *
 * PHASE 8D-3A correction pass: `pickPlanetStability()` never accepted
 * `preferTags` at all -- a genuine gap caught on re-check against the
 * phase spec's own preset schema (§33's `stabilityWeights`), which
 * meant a planet preset (e.g. "Post-Cataclysmic World," "Military
 * Garrison World") had ZERO ability to skew this field despite the
 * preset system existing specifically to do that. Each entry now
 * carries `tags` (reusing the SAME free-text vocabulary every other
 * Phase 8D pool tags with -- `ORGANIZATION_FAMILY` values, biome/
 * character words, and the stability value itself), and
 * `pickPlanetStability()` takes an optional `preferTags` exactly like
 * `pickPlanetGovernment()`/`pickPlanetWorldClass()` already do.
 */

import { weightedPickWithPreference } from '../lib/weighted-random.js';

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
  { value: PLANET_STABILITY.STABLE, weight: 5, tags: ['stable', 'prosperous'] },
  { value: PLANET_STABILITY.PROSPEROUS, weight: 3, tags: ['prosperous', 'trade'] },
  { value: PLANET_STABILITY.TENSE, weight: 4, tags: ['tense'] },
  { value: PLANET_STABILITY.CORRUPT, weight: 2, tags: ['corrupt', 'crime-syndicate'] },
  { value: PLANET_STABILITY.AUTHORITARIAN, weight: 2, tags: ['authoritarian', 'government-bureaucracy'] },
  { value: PLANET_STABILITY.DECLINING, weight: 2, tags: ['declining', 'economic-crisis'] },
  { value: PLANET_STABILITY.UNSTABLE, weight: 2, tags: ['unstable'] },
  { value: PLANET_STABILITY.FRACTURED, weight: 1, tags: ['fractured'] },
  { value: PLANET_STABILITY.CIVIL_UNREST, weight: 2, tags: ['civil unrest', 'popular-unrest'] },
  { value: PLANET_STABILITY.POPULAR_UNREST, weight: 2, tags: ['popular-unrest'] },
  { value: PLANET_STABILITY.REBELLIOUS, weight: 1, tags: ['rebellious', 'military-paramilitary'] },
  { value: PLANET_STABILITY.CIVIL_WAR, weight: 1, tags: ['civil-war', 'military-paramilitary', 'post-war'] },
  { value: PLANET_STABILITY.OCCUPIED, weight: 1, tags: ['occupied', 'military-paramilitary', 'post-war'] },
  { value: PLANET_STABILITY.CONTESTED, weight: 2, tags: ['contested'] },
  { value: PLANET_STABILITY.LAWLESS, weight: 1, tags: ['lawless', 'crime-syndicate', 'frontier'] },
  { value: PLANET_STABILITY.RECENTLY_LIBERATED, weight: 1, tags: ['recently-liberated', 'post-war'] },
  { value: PLANET_STABILITY.RECOVERING, weight: 2, tags: ['recovering', 'post-war'] },
  { value: PLANET_STABILITY.ISOLATED, weight: 2, tags: ['isolated', 'frontier'] },
  { value: PLANET_STABILITY.UNDER_BLOCKADE, weight: 1, tags: ['under-blockade', 'contested'] },
  { value: PLANET_STABILITY.SUCCESSION_CRISIS, weight: 1, tags: ['succession-crisis', 'noble-house'] },
  { value: PLANET_STABILITY.ECONOMIC_CRISIS, weight: 2, tags: ['economic-crisis'] },
  { value: PLANET_STABILITY.POLITICAL_REFORM, weight: 1, tags: ['political-reform'] }
]);

const STABILITY_VALUES = Object.freeze(Object.values(PLANET_STABILITY));

export function isPlanetStability(value) {
  return STABILITY_VALUES.includes(value);
}

/** Pick a random stability entry: `{ value, weight, tags }`, optionally softly biased by `preferTags` (e.g. a planet preset's `preferTags`, or the world's own context tags). */
export function pickPlanetStability({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(STABILITY_ENTRIES, { rng, preferTags });
}
