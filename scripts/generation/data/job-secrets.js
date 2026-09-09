/**
 * PHASE 8D-3C correction round 2 — Job secret pool for `jobs/job-secret.js`.
 * Representative catalog (20 entries).
 *
 * A secret is GM-only information about who is really behind the job or
 * what they are really hiding -- distinct from a twist (`job-twists.js`),
 * which recontextualizes the mission's true nature or objective. A secret
 * is about a PERSON or PARTY's hidden motive/knowledge; a twist is about
 * the JOB itself turning out to be something else. Compare:
 *   Twist:  "the target has already moved"
 *   Secret: "the client arranged the target's disappearance"
 * Rolled far less often than the hook/stakes -- see job-bundle.js's own
 * ~20% roll rate for the sibling twist pool, which this mirrors.
 */

export const JOB_SECRETS = Object.freeze([
  { value: 'the client arranged the target\'s current situation and is paying to have it "resolved"', weight: 2, tags: ['bounty', 'hunt', 'rescue'] },
  { value: 'the employer already knows how this job ends and is testing the crew', weight: 1, tags: [] },
  { value: 'the person who hired the crew is not who they claim to be', weight: 2, tags: [] },
  { value: 'the client has a personal, unstated grudge against the target', weight: 2, tags: ['bounty', 'hunt', 'assault'] },
  { value: 'the "recovered" asset was stolen by the client in the first place', weight: 1, tags: ['recovery', 'heist'] },
  { value: 'a member of the client\'s own organization is quietly working against them', weight: 1, tags: [] },
  { value: 'the client intends to stiff the crew on payment once the job is done', weight: 2, tags: [] },
  { value: 'the job is being funded by someone other than the person who hired the crew', weight: 1, tags: [] },
  { value: 'the client knows the job is illegal in ways they never disclosed', weight: 1, tags: ['illegal', 'smuggling'] },
  { value: 'the cargo\'s true owner has no idea it is being moved', weight: 1, tags: ['delivery', 'smuggling'] },
  { value: 'the client has already hired a second crew as a contingency, unbeknownst to the first', weight: 1, tags: [] },
  { value: 'the employer\'s public reason for the job is a cover story for a private one', weight: 2, tags: [] },
  { value: 'someone inside the client\'s organization tipped off the opposition', weight: 1, tags: ['assault', 'sabotage', 'investigation'] },
  { value: 'the client is being coerced into hiring the crew by a third party', weight: 1, tags: [] },
  { value: 'the target of the job is secretly an informant for the client', weight: 1, tags: ['bounty', 'hunt', 'investigation'] },
  { value: 'the client has a prior, undisclosed relationship with the opposition', weight: 1, tags: [] },
  { value: 'the reward being offered is smaller than what the client actually has to spend', weight: 1, tags: [] },
  { value: 'the client\'s risk assessment of this job is a deliberate understatement', weight: 1, tags: [] },
  { value: 'part of the crew\'s payment is being diverted before it ever reaches them', weight: 1, tags: [] },
  { value: 'no known secret -- the client\'s stated motives check out', weight: 4, tags: [] }
]);
