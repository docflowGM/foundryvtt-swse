/**
 * PHASE 8D-2 foundation — procedural planet quality tables (world class,
 * size, gravity, atmosphere).
 *
 * Confirmed by reconnaissance: `location-library-seeds.js` already uses
 * a free-text `biomes` array (no enum) for its curated worlds — this
 * module deliberately reuses that same free-text vocabulary as each
 * `WORLD_CLASS` entry's `tags` rather than inventing a second biome
 * enum. These tables back `planet-draft.js`'s `GENERATE_NEW_PLANET`
 * path only — they never apply to a known Library world, which keeps
 * its own hand-curated biomes/summary untouched.
 */

import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';

export const WORLD_CLASS = Object.freeze([
  { value: 'temperate', weight: 5, tags: ['forest', 'grassland', 'rural'], habitable: true },
  { value: 'arid', weight: 4, tags: ['desert', 'arid'], habitable: true },
  { value: 'ocean', weight: 3, tags: ['ocean', 'coastal', 'aquatic'], habitable: true },
  { value: 'ice', weight: 3, tags: ['ice', 'frozen', 'tundra'], habitable: true },
  { value: 'volcanic', weight: 2, tags: ['volcanic', 'mountain'], habitable: false },
  { value: 'jungle', weight: 3, tags: ['jungle', 'swamp'], habitable: true },
  { value: 'urban-ecumenopolis', weight: 2, tags: ['urban', 'trade'], habitable: true },
  { value: 'gas-giant', weight: 2, tags: ['void', 'mysterious'], habitable: false },
  { value: 'barren-rock', weight: 3, tags: ['desert', 'mountain'], habitable: false },
  { value: 'swamp', weight: 3, tags: ['swamp', 'jungle', 'rural'], habitable: true },
  { value: 'tundra', weight: 2, tags: ['frozen', 'rural'], habitable: true },
  { value: 'asteroid-field', weight: 1, tags: ['void', 'mysterious'], habitable: false }
]);

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

/** Pick a random world-class entry, optionally biased toward a biome-affinity tag. */
export function pickPlanetWorldClass({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(WORLD_CLASS, { rng, preferTags });
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
