/**
 * PHASE 8D-2 foundation — Job narrative-consequence pool for
 * `jobs/job-consequence.js`. Representative catalog (20 entries).
 * Narrative flavor for success/failure BEYOND the numeric
 * `successDelta`/`failureDelta` already in `faction-draft.js`'s
 * `jobDefaults` -- this never replaces or computes those numbers,
 * purely a GM-facing description of what changes in the world.
 */

export const JOB_SUCCESS_CONSEQUENCES = Object.freeze([
  { value: 'the client\'s trust in the crew grows significantly', weight: 3, tags: [] },
  { value: 'a rival organization takes notice of the crew', weight: 2, tags: [] },
  { value: 'word spreads, opening new job opportunities', weight: 3, tags: [] },
  { value: 'a grateful ally offers future assistance', weight: 2, tags: [] },
  { value: 'local authorities quietly note the crew\'s involvement', weight: 1, tags: [] },
  { value: 'the client\'s organization gains a meaningful advantage', weight: 2, tags: [] },
  { value: 'a new potential enemy is made in the process', weight: 2, tags: [] },
  { value: 'the crew\'s reputation in the region improves', weight: 3, tags: [] },
  { value: 'a valuable long-term contact is secured', weight: 2, tags: [] },
  { value: 'no lasting consequences beyond the immediate payoff', weight: 2, tags: [] }
]);

export const JOB_FAILURE_CONSEQUENCES = Object.freeze([
  { value: 'the client loses faith in the crew', weight: 3, tags: [] },
  { value: 'a rival organization gains an advantage instead', weight: 2, tags: [] },
  { value: 'word spreads of the failure, damaging the crew\'s reputation', weight: 3, tags: [] },
  { value: 'an innocent party suffers as a result', weight: 2, tags: [] },
  { value: 'local authorities begin watching the crew more closely', weight: 2, tags: [] },
  { value: 'the client demands compensation for the failure', weight: 2, tags: [] },
  { value: 'a new enemy is made who blames the crew directly', weight: 2, tags: [] },
  { value: 'an ally is lost or compromised as a result', weight: 1, tags: [] },
  { value: 'the situation the crew was hired to fix gets worse', weight: 3, tags: [] },
  { value: 'no lasting consequences -- the failure goes largely unnoticed', weight: 1, tags: [] }
]);
