/**
 * PHASE 8D-3C foundation — Job opening-hook pool for `jobs/job-hook.js`.
 *
 * Representative catalog (18 entries) — see `job-stakes.js`'s header for
 * why this and `job-stakes.js` are the two genuinely new primitive
 * vocabularies this phase adds; production-scale hydration (150-250
 * entries per the phase spec) is explicitly deferred past this wiring
 * pass.
 *
 * A hook is HOW the party first learns about or is approached for a
 * Job — narrative color describing the moment of contact, distinct from
 * `briefing`/`instructions` (what the Job actually asks them to do).
 */

export const JOB_HOOKS = Object.freeze([
  { value: 'a cautious message arrives through a trusted intermediary', weight: 3, tags: [] },
  { value: 'the job is posted openly, with no attempt at discretion', weight: 4, tags: ['posted'] },
  { value: 'someone approaches the crew directly in a public place', weight: 3, tags: [] },
  { value: 'a old contact calls in a favor out of nowhere', weight: 2, tags: [] },
  { value: 'word reaches the crew secondhand, through a chain of contacts', weight: 3, tags: ['word-of-mouth'] },
  { value: 'the client tracks the crew down after hearing about their reputation', weight: 2, tags: [] },
  { value: 'a coded transmission is waiting when the crew checks in', weight: 2, tags: ['discreet', 'hidden'] },
  { value: 'the offer comes wrapped in a legitimate-looking cover story', weight: 2, tags: ['gray-area', 'illegal'] },
  { value: 'a desperate client corners the crew with nowhere else to turn', weight: 2, tags: ['rescue'] },
  { value: 'a rival crew turns the job down first, and it lands on their table instead', weight: 1, tags: [] },
  { value: 'the crew stumbles into the situation before anyone formally hires them', weight: 2, tags: [] },
  { value: 'an anonymous bounty notice simply appears with no explanation', weight: 2, tags: ['bounty', 'hunt'] },
  { value: 'a formal invitation arrives, signed and official', weight: 2, tags: ['legal'] },
  { value: 'someone the crew trusts vouches for the client personally', weight: 2, tags: [] },
  { value: 'the client tests the crew with a small favor before making the real offer', weight: 1, tags: [] },
  { value: 'a middleman handles everything, and the real client stays hidden', weight: 2, tags: ['gray-area', 'illegal', 'black-market'] },
  { value: 'the crew overhears the opportunity and has to pursue it themselves', weight: 1, tags: [] },
  { value: 'a standing arrangement with a regular employer simply continues', weight: 3, tags: [] }
]);
