/**
 * PHASE 8D-2 foundation — procedural planet history-hook generator.
 * Thin wrapper over `data/planet-history-hooks.js`.
 */

import { PLANET_HISTORY_HOOKS } from '../data/planet-history-hooks.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct history-hook entries (default 1). */
export function pickPlanetHistoryHooks({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(PLANET_HISTORY_HOOKS, count, { rng, preferTags });
}
