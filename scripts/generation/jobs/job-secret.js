/**
 * PHASE 8D-3C correction round 2 — Job secret generator. Thin wrapper
 * over `data/job-secrets.js`.
 */

import { JOB_SECRETS } from '../data/job-secrets.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a single random secret entry. */
export function pickJobSecret({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(JOB_SECRETS, { rng, preferTags });
}
