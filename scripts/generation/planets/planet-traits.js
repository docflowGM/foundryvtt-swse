/**
 * PHASE 8D-2 foundation — procedural planet notable-trait generator.
 * Thin wrapper over `data/planet-traits.js`.
 */

import { PLANET_TRAITS } from '../data/planet-traits.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct trait entries (default 1). */
export function pickPlanetTraits({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(PLANET_TRAITS, count, { rng, preferTags });
}
