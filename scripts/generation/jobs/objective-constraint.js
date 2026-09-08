/**
 * PHASE 8D-2 foundation — objective constraint generator. Thin wrapper
 * over `data/objective-constraints.js`.
 */

import { OBJECTIVE_CONSTRAINTS } from '../data/objective-constraints.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct constraint entries (default 1). */
export function pickObjectiveConstraints({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(OBJECTIVE_CONSTRAINTS, count, { rng, preferTags });
}
