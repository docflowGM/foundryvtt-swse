/**
 * PHASE 8D-2 foundation — Job complication generator. Thin wrapper
 * over `data/job-complications.js`.
 */

import { JOB_COMPLICATIONS } from '../data/job-complications.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct complication entries (default 1). */
export function pickJobComplications({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(JOB_COMPLICATIONS, count, { rng, preferTags });
}
