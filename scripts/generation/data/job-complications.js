/**
 * PHASE 8D-2 foundation — Job mid-mission complication pool for
 * `jobs/job-complication.js`. Representative catalog (30 entries) --
 * not the full ~100-200 target the wider design discussion mentioned;
 * expanding this list later never requires touching generator code.
 */

export const JOB_COMPLICATIONS = Object.freeze([
  { value: 'a rival crew is after the same target/objective', weight: 3, tags: ['bounty', 'heist', 'recovery'] },
  { value: 'local authorities are more vigilant than briefed', weight: 3, tags: ['illegal', 'infiltration'] },
  { value: 'the target has more security than expected', weight: 3, tags: ['heist', 'assault'] },
  { value: 'a storm or environmental hazard delays the operation', weight: 2, tags: [] },
  { value: 'the informant\'s information turns out to be stale', weight: 2, tags: ['investigation'] },
  { value: 'the client is not being fully honest about the stakes', weight: 3, tags: [] },
  { value: 'equipment malfunctions at a critical moment', weight: 2, tags: [] },
  { value: 'an unexpected third party is also involved', weight: 2, tags: [] },
  { value: 'the objective has already been moved/changed location', weight: 2, tags: ['recovery', 'extraction'] },
  { value: 'a trusted contact goes suddenly silent', weight: 1, tags: ['investigation'] },
  { value: 'the deadline moves up unexpectedly', weight: 2, tags: ['delivery', 'rescue'] },
  { value: 'the target recognizes the crew from a past encounter', weight: 1, tags: ['bounty'] },
  { value: 'reinforcements arrive earlier than anticipated', weight: 2, tags: ['assault', 'sabotage'] },
  { value: 'a witness threatens to expose the operation', weight: 2, tags: ['illegal'] },
  { value: 'the crew\'s cover story starts to unravel', weight: 2, tags: ['infiltration'] },
  { value: 'a piece of key intel was wrong', weight: 2, tags: ['investigation'] },
  { value: 'an ally is captured or compromised mid-operation', weight: 1, tags: ['rescue', 'extraction'] },
  { value: 'the objective is guarded by an unexpected faction', weight: 2, tags: [] },
  { value: 'local sentiment turns hostile toward outsiders', weight: 1, tags: [] },
  { value: 'a mechanical failure strands the crew\'s transport', weight: 1, tags: [] },
  { value: 'the payment is suddenly at risk (client can\'t/won\'t pay)', weight: 1, tags: [] },
  { value: 'a double-cross from within the client\'s own organization', weight: 1, tags: ['illegal'] },
  { value: 'the crew is being followed without realizing it', weight: 2, tags: ['infiltration', 'investigation'] },
  { value: 'a bureaucratic obstacle blocks the planned approach', weight: 1, tags: ['legal'] },
  { value: 'the target has allies the crew didn\'t know about', weight: 2, tags: ['bounty', 'assault'] },
  { value: 'communications are jammed or unreliable on-site', weight: 1, tags: [] },
  { value: 'an old enemy of the crew shows up unexpectedly', weight: 1, tags: [] },
  { value: 'the operation draws unwanted media/public attention', weight: 1, tags: ['heist', 'sabotage'] },
  { value: 'supplies run short mid-operation', weight: 1, tags: [] },
  { value: 'the mission proceeds smoothly, no significant complications', weight: 3, tags: [] }
]);
