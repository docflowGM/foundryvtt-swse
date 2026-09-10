/**
 * PHASE 8D-3C foundation — Job opening-hook generator. Thin wrapper
 * over `data/job-hooks.js`.
 */

import { JOB_HOOKS } from '../data/job-hooks.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a single random opening-hook entry. */
export function pickJobHook({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(JOB_HOOKS, { rng, preferTags });
}
