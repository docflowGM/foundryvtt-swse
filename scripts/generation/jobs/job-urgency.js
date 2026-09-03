/**
 * PHASE 8D-2 foundation — Job urgency vocabulary. Small enough to keep
 * inline rather than a separate `data/` file (matching
 * `planets/planet-stability.js`'s own precedent for a small closed
 * vocabulary).
 */

import { weightedPick } from '../lib/weighted-random.js';

export const JOB_URGENCY = Object.freeze({
  LOW: 'low',
  MODERATE: 'moderate',
  URGENT: 'urgent',
  CRITICAL: 'critical'
});

const URGENCY_ENTRIES = Object.freeze([
  { value: JOB_URGENCY.LOW, weight: 3 },
  { value: JOB_URGENCY.MODERATE, weight: 5 },
  { value: JOB_URGENCY.URGENT, weight: 3 },
  { value: JOB_URGENCY.CRITICAL, weight: 1 }
]);

const URGENCY_VALUES = Object.freeze(Object.values(JOB_URGENCY));

export function isJobUrgency(value) {
  return URGENCY_VALUES.includes(value);
}

/** Pick a random urgency entry: `{ value, weight }`. */
export function pickJobUrgency({ rng } = {}) {
  return weightedPick(URGENCY_ENTRIES, { rng });
}
