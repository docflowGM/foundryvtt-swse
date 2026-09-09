/**
 * PHASE 8D-3C foundation — Job stakes generator. Thin wrapper over
 * `data/job-stakes.js`.
 */

import { JOB_STAKES } from '../data/job-stakes.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a single random stakes entry. */
export function pickJobStakes({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(JOB_STAKES, { rng, preferTags });
}
