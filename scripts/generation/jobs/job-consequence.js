/**
 * PHASE 8D-2 foundation — Job consequence generator. Thin wrapper over
 * `data/job-consequences.js`.
 */

import { JOB_SUCCESS_CONSEQUENCES, JOB_FAILURE_CONSEQUENCES } from '../data/job-consequences.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a single random success-consequence entry. */
export function pickJobSuccessConsequence({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(JOB_SUCCESS_CONSEQUENCES, { rng, preferTags });
}

/** Pick a single random failure-consequence entry. */
export function pickJobFailureConsequence({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(JOB_FAILURE_CONSEQUENCES, { rng, preferTags });
}

/** Roll both: `{ success, failure }`. */
export function generateJobConsequences({ rng, preferTags = [] } = {}) {
  return {
    success: pickJobSuccessConsequence({ rng, preferTags }),
    failure: pickJobFailureConsequence({ rng, preferTags })
  };
}
