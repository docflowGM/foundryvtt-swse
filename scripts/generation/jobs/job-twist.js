/**
 * PHASE 8D-2 foundation — Job twist generator. Thin wrapper over
 * `data/job-twists.js`.
 */

import { JOB_TWISTS } from '../data/job-twists.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a single random twist entry (a Job generator should treat this as a rare, optional roll -- see `data/job-twists.js`'s header). */
export function pickJobTwist({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(JOB_TWISTS, { rng, preferTags });
}
