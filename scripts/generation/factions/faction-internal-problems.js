/**
 * PHASE 8D-2 foundation — Faction internal-problem generator. Thin
 * wrapper over `data/faction-internal-problems.js`.
 */

import { FACTION_INTERNAL_PROBLEMS } from '../data/faction-internal-problems.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct internal-problem entries (default 1). */
export function pickFactionInternalProblems({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(FACTION_INTERNAL_PROBLEMS, count, { rng, preferTags });
}
