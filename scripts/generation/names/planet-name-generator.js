/**
 * PHASE 8D-2 foundation — procedural planet-name generator.
 *
 * CORRECTED (Phase 8D-2 independent review, round 1): the original
 * version of this generator was built entirely around the
 * prefix+suffix syllable combinator below, with no curated-name
 * authority and no check against real, known worlds. The PRIMARY
 * authority is now `data/procedural-planet-names.js`'s curated
 * `PROCEDURAL_PLANET_NAMES` pool (checked at its own module load
 * against `isKnownLibraryPlanetName()` -- see that file's header). The
 * syllable combinator (unchanged internally) survives as an explicit
 * FALLBACK: `getRandomPlanetName()` only reaches for it when the
 * curated pool is exhausted by the caller's own `excludeNames` (e.g.
 * generating many planets in one session and not wanting repeats), and
 * even then every syllable-combined candidate is checked against
 * `isKnownLibraryPlanetName()` before being returned, so the syllable
 * path can never silently hand back a name that collides with a real
 * known world (the review's own example: "Rax" + "us" -> "Raxus").
 */

import { PROCEDURAL_PLANET_NAMES } from '../data/procedural-planet-names.js';
import { PLANET_NAME_PREFIXES, PLANET_NAME_SUFFIXES } from '../data/planet-name-syllables.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';
import { isKnownLibraryPlanetName } from '../../locations/location-library-seeds.js';

function excludeSetOf(excludeNames) {
  return new Set((Array.isArray(excludeNames) ? excludeNames : []).map((n) => String(n ?? '').toLowerCase().trim()));
}

/** Pick a random curated-pool entry (the full `{value, weight, tags}` record), optionally excluding already-used names. */
export function pickCuratedPlanetName({ rng, preferTags = [], excludeNames = [] } = {}) {
  const excluded = excludeSetOf(excludeNames);
  const pool = PROCEDURAL_PLANET_NAMES.filter((entry) => !excluded.has(entry.value.toLowerCase()));
  return pool.length ? weightedPickWithPreference(pool, { rng, preferTags }) : null;
}

/**
 * FALLBACK ONLY (see module header): generate a name by combining a
 * prefix+suffix syllable, retrying up to `maxAttempts` times if the
 * combined name collides with a real known Library world or one of
 * `excludeNames`. On the (astronomically unlikely, given 55x50
 * combinations) exhaustion of every attempt, appends a disambiguating
 * numeral rather than silently returning a colliding/duplicate name.
 */
export function generateSyllablePlanetName({ rng, preferTags = [], excludeNames = [], maxAttempts = 20 } = {}) {
  const excluded = excludeSetOf(excludeNames);
  const roll = rng ?? Math.random;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = weightedPickWithPreference(PLANET_NAME_PREFIXES, { rng, preferTags });
    const suffix = weightedPickWithPreference(PLANET_NAME_SUFFIXES, { rng, preferTags });
    const name = `${prefix?.value ?? 'Vor'}${suffix?.value ?? 'an'}`;
    if (!isKnownLibraryPlanetName(name) && !excluded.has(name.toLowerCase())) {
      return { name, prefix, suffix, source: 'syllable' };
    }
  }
  const prefix = weightedPickWithPreference(PLANET_NAME_PREFIXES, { rng, preferTags });
  const suffix = weightedPickWithPreference(PLANET_NAME_SUFFIXES, { rng, preferTags });
  const name = `${prefix?.value ?? 'Vor'}${suffix?.value ?? 'an'} ${Math.floor(roll() * 900 + 100)}`;
  return { name, prefix, suffix, source: 'syllable-disambiguated' };
}

/**
 * Generate a full planet-name draft: `{ name, entry, source }` where
 * `source` is `'curated'` (the normal case) or `'syllable'`/
 * `'syllable-disambiguated'` (fallback, only when the curated pool is
 * exhausted by `excludeNames`).
 *
 * @param {object} [options]
 * @param {() => number} [options.rng] - injectable RNG; defaults to `Math.random()`.
 * @param {string[]} [options.preferTags] - soft biome-tone preference (e.g. `['desert','arid']`).
 * @param {string[]} [options.excludeNames] - names already used this session (e.g. by a prior `getRandomPlanetName()` call) -- never reselected; triggers the syllable fallback once the curated pool is exhausted.
 */
export function getRandomPlanetName({ rng, preferTags = [], excludeNames = [] } = {}) {
  const entry = pickCuratedPlanetName({ rng, preferTags, excludeNames });
  if (entry) return { name: entry.value, entry, source: 'curated' };
  return generateSyllablePlanetName({ rng, preferTags, excludeNames });
}

/** Reroll the whole name (curated pool first, syllable fallback if exhausted) -- there is no sub-component to preserve once a curated name is picked, unlike the old syllable-only API. */
export function rerollPlanetName(draft, { rng, preferTags = [], excludeNames = [] } = {}) {
  const excluded = draft?.name ? [...excludeNames, draft.name] : excludeNames;
  return getRandomPlanetName({ rng, preferTags, excludeNames: excluded });
}
