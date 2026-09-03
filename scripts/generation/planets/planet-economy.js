/**
 * PHASE 8D-2 foundation — procedural planet economic-focus generator.
 * Thin wrapper over `data/planet-economies.js`. A world can have more
 * than one economic focus (e.g. "mining" + "black market"), so this
 * exposes both a single pick and a multi-pick (via the shared
 * `weightedPickUniqueN()`).
 */

import { PLANET_ECONOMIES } from '../data/planet-economies.js';
import { weightedPickWithPreference, weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick a single random economy entry. */
export function pickPlanetEconomy({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(PLANET_ECONOMIES, { rng, preferTags });
}

/** Pick up to `count` distinct economy entries (default 1-2). */
export function pickPlanetEconomies({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(PLANET_ECONOMIES, count, { rng, preferTags });
}
