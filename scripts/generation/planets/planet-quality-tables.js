/**
 * PHASE 8D-2 foundation — procedural planet quality tables (world class,
 * size, gravity, atmosphere).
 *
 * CORRECTED (Phase 8D-2 independent review, round 1): the original
 * version of this file used a made-up `tags` vocabulary (`arid`,
 * `ocean`, `void`, ...) as `WORLD_CLASS`'s ONLY tag field and
 * `planet-draft.js` then wrote that field straight into the draft's
 * `biomes` — a parallel biome vocabulary the Library's own real
 * `LOCATION_LIBRARY_BIOMES` (`location-library-seeds.js`, 86 curated
 * values) was specifically supposed to prevent. Every `WORLD_CLASS`
 * entry now carries TWO separate arrays:
 *
 *  - `biomes`: values drawn ONLY from `LOCATION_LIBRARY_BIOMES` — this
 *    IS the Location's canonical biome vocabulary, single source of
 *    truth, checked below via `isLocationLibraryBiome()`.
 *  - `tags`: procedural-only descriptive words (`arid`, `mysterious`,
 *    `trade`, `coastal`, ...) used purely for soft preference-matching
 *    across the OTHER planet pools (economy/hazard/trait/name); never
 *    written into a Location's `biomes` field by any caller.
 *
 * `locationType` also corrects a second finding from the same review:
 * `planet-draft.js` previously hardcoded `type: 'planet'` even for the
 * `asteroid-field` world class, which the real Location Library would
 * never call a "planet". Every entry defaults to `'planet'`;
 * `asteroid-field` is the one exception, matching the Library's own
 * `type: 'region'` vocabulary (used for `Dxun`-style sub-areas) instead.
 */

import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';
import { isLocationLibraryBiome } from '../../locations/location-library-seeds.js';
import { mergeTags } from '../lib/tag-utils.js';

export const WORLD_CLASS = Object.freeze([
  { value: 'temperate', weight: 5, biomes: ['forest', 'grassland', 'rural'], tags: ['civilian'], habitable: true, locationType: 'planet' },
  { value: 'arid', weight: 4, biomes: ['desert', 'wasteland'], tags: ['arid'], habitable: true, locationType: 'planet' },
  { value: 'ocean', weight: 3, biomes: ['water', 'island'], tags: ['coastal', 'aquatic'], habitable: true, locationType: 'planet' },
  { value: 'ice', weight: 3, biomes: ['ice', 'polar'], tags: ['frozen'], habitable: true, locationType: 'planet' },
  { value: 'volcanic', weight: 2, biomes: ['lava', 'mining'], tags: ['aggressive'], habitable: false, locationType: 'planet' },
  { value: 'jungle', weight: 3, biomes: ['jungle', 'wilderness'], tags: [], habitable: true, locationType: 'planet' },
  { value: 'urban-ecumenopolis', weight: 2, biomes: ['city', 'urban', 'industrial', 'commerce'], tags: ['trade', 'civilian'], habitable: true, locationType: 'planet' },
  { value: 'gas-giant', weight: 2, biomes: ['gas', 'space'], tags: ['mysterious'], habitable: false, locationType: 'planet' },
  { value: 'barren-rock', weight: 3, biomes: ['wasteland', 'asteroid', 'mine'], tags: [], habitable: false, locationType: 'planet' },
  { value: 'swamp', weight: 3, biomes: ['swamp', 'jungle'], tags: ['rural'], habitable: true, locationType: 'planet' },
  { value: 'tundra', weight: 2, biomes: ['polar', 'ice'], tags: ['rural'], habitable: true, locationType: 'planet' },
  { value: 'asteroid-field', weight: 1, biomes: ['asteroid', 'space', 'mobile'], tags: ['mysterious'], habitable: false, locationType: 'region' }
]);

// Self-check at module load: every WORLD_CLASS.biomes entry must be a
// real Library biome value. Throws immediately (not a silent runtime
// surprise) if this table and the Library's vocabulary ever drift.
for (const entry of WORLD_CLASS) {
  for (const biome of entry.biomes) {
    if (!isLocationLibraryBiome(biome)) {
      throw new Error(`planet-quality-tables.js: WORLD_CLASS entry "${entry.value}" declares biome "${biome}", which is not a real LOCATION_LIBRARY_BIOMES value`);
    }
  }
}

export const PLANET_SIZE = Object.freeze([
  { value: 'tiny', weight: 1 },
  { value: 'small', weight: 3 },
  { value: 'medium', weight: 5 },
  { value: 'large', weight: 3 },
  { value: 'huge', weight: 1 }
]);

export const PLANET_GRAVITY = Object.freeze([
  { value: 'low', weight: 2 },
  { value: 'standard', weight: 6 },
  { value: 'high', weight: 2 }
]);

export const PLANET_ATMOSPHERE = Object.freeze([
  { value: 'none-vacuum', weight: 2 },
  { value: 'thin', weight: 2 },
  { value: 'breathable', weight: 6 },
  { value: 'toxic', weight: 2 },
  { value: 'corrosive', weight: 1 }
]);

/**
 * Pick a random world-class entry, optionally biased toward a biome/tag
 * affinity. Matches `preferTags` against BOTH `biomes` and `tags`
 * (merged) -- a caller biasing toward `'desert'` should match
 * `arid`'s `biomes` just as readily as a caller biasing toward
 * `'mysterious'` matches `gas-giant`'s `tags`.
 */
export function pickPlanetWorldClass({ rng, preferTags = [] } = {}) {
  const matchable = WORLD_CLASS.map((entry) => ({ entry, weight: entry.weight, tags: mergeTags(entry.biomes, entry.tags) }));
  const picked = weightedPickWithPreference(matchable, { rng, preferTags, weightOf: (m) => Number(m.weight ?? 1) });
  return picked ? picked.entry : null;
}

/** Pick a random planet size entry. */
export function pickPlanetSize({ rng } = {}) {
  return weightedPick(PLANET_SIZE, { rng });
}

/** Pick a random gravity entry. */
export function pickPlanetGravity({ rng } = {}) {
  return weightedPick(PLANET_GRAVITY, { rng });
}

/** Pick a random atmosphere entry. */
export function pickPlanetAtmosphere({ rng } = {}) {
  return weightedPick(PLANET_ATMOSPHERE, { rng });
}
