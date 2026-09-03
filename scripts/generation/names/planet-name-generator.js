/**
 * PHASE 8D-2 foundation — procedural planet-name generator.
 *
 * Same combinatorial contract as `ship-names/ship-name-generator.js`
 * (Phase 8D-1): join two small weighted/tagged syllable pools
 * (`data/planet-name-syllables.js`) rather than picking from a
 * hand-written list of full names. `preferTags` softly biases toward a
 * biome affinity (reusing the Location Library's own free-text biome
 * vocabulary — "desert"/"forest"/"ice"/... — see
 * `location-library-seeds.js`) without hard-filtering the pool, so an
 * "off-biome" name (a green world with a harsh-sounding name) stays
 * possible.
 *
 * This is a GENERATE-tier fact only — a narrative label, never a
 * canonical Location id. This module is deliberately Foundry-independent
 * (plain data + `lib/weighted-random.js`), same as every other Phase
 * 8D-1/8D-2 name generator.
 */

import { PLANET_NAME_PREFIXES, PLANET_NAME_SUFFIXES } from '../data/planet-name-syllables.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random prefix syllable entry (the full `{value, weight, tags}` record). */
export function pickPlanetNamePrefix({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(PLANET_NAME_PREFIXES, { rng, preferTags });
}

/** Pick a random suffix syllable entry. See `pickPlanetNamePrefix()`. */
export function pickPlanetNameSuffix({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(PLANET_NAME_SUFFIXES, { rng, preferTags });
}

/**
 * Generate a full planet-name draft: `{ name, prefix, suffix }`, where
 * `prefix`/`suffix` are the full pool entries (so a caller can reroll
 * just one and re-join) and `name` is `"${prefix.value}${suffix.value}"`
 * (joined with no space — matches real Star Wars planet-naming
 * convention, e.g. "Tatooine", "Dantooine").
 *
 * @param {object} [options]
 * @param {() => number} [options.rng] - injectable RNG; defaults to `Math.random()`.
 * @param {string[]} [options.preferTags] - soft biome-tone preference
 *   shared by both the prefix and suffix roll (e.g. `['desert','arid']`).
 */
export function getRandomPlanetName({ rng, preferTags = [] } = {}) {
  const prefix = pickPlanetNamePrefix({ rng, preferTags });
  const suffix = pickPlanetNameSuffix({ rng, preferTags });
  return {
    name: `${prefix?.value ?? 'Vor'}${suffix?.value ?? 'an'}`,
    prefix,
    suffix
  };
}

/** Reroll ONLY the prefix, preserving the suffix (per-field reroll readiness). */
export function rerollPlanetNamePrefix(draft, { rng, preferTags = [] } = {}) {
  const prefix = pickPlanetNamePrefix({ rng, preferTags });
  const suffix = draft?.suffix ?? pickPlanetNameSuffix({ rng, preferTags });
  return { name: `${prefix?.value ?? 'Vor'}${suffix?.value ?? 'an'}`, prefix, suffix };
}

/** Reroll ONLY the suffix, preserving the prefix. Mirrors the above. */
export function rerollPlanetNameSuffix(draft, { rng, preferTags = [] } = {}) {
  const prefix = draft?.prefix ?? pickPlanetNamePrefix({ rng, preferTags });
  const suffix = pickPlanetNameSuffix({ rng, preferTags });
  return { name: `${prefix?.value ?? 'Vor'}${suffix?.value ?? 'an'}`, prefix, suffix };
}
