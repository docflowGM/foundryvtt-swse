/**
 * PHASE 8D-2 foundation — Job narrative-twist pool for
 * `jobs/job-twist.js`. Representative catalog (22 entries). A twist
 * recontextualizes the mission rather than complicating its execution
 * (see `job-complications.js` for the execution-level pool) -- rolled
 * far less often (a Job generator should treat this as a rare,
 * optional reveal, not a default).
 */

export const JOB_TWISTS = Object.freeze([
  { value: 'the target is actually innocent of what they\'re accused of', weight: 2, tags: ['bounty', 'hunt'] },
  { value: 'the employer is setting the crew up to take the fall', weight: 2, tags: ['illegal'] },
  { value: 'the cargo is not what the client claimed it was', weight: 2, tags: ['delivery', 'smuggling'] },
  { value: 'a trusted contact is secretly the real traitor', weight: 1, tags: ['investigation'] },
  { value: 'the mission is actually a test of the crew\'s loyalty', weight: 1, tags: [] },
  { value: 'the client and the "villain" are working together', weight: 1, tags: [] },
  { value: 'the real objective was never what the briefing said', weight: 2, tags: [] },
  { value: 'the crew has been hired by both sides of the same conflict', weight: 1, tags: [] },
  { value: 'the hostage doesn\'t want to be rescued', weight: 1, tags: ['rescue'] },
  { value: 'the "enemy" faction is actually the more sympathetic side', weight: 1, tags: ['assault', 'sabotage'] },
  { value: 'the client has been dead/gone the whole time -- someone else is paying', weight: 1, tags: [] },
  { value: 'the recovered asset is a decoy', weight: 2, tags: ['recovery', 'heist'] },
  { value: 'the mission was designed to eliminate the crew, not help them', weight: 1, tags: ['illegal'] },
  { value: 'an old ally from the crew\'s past is on the opposing side', weight: 1, tags: [] },
  { value: 'the true threat is someone the crew already trusts', weight: 1, tags: ['investigation'] },
  { value: 'success will unintentionally harm an innocent party', weight: 2, tags: [] },
  { value: 'the reward offered is not what it appears to be', weight: 1, tags: [] },
  { value: 'this job is secretly connected to a much larger operation', weight: 2, tags: [] },
  { value: 'the mission has already failed once before, under different operatives', weight: 1, tags: [] },
  { value: 'the crew is not the first to be hired for this exact job', weight: 1, tags: [] },
  { value: 'the target has been expecting the crew all along', weight: 1, tags: ['bounty', 'assault'] },
  { value: 'no twist -- the mission is exactly what it appears to be', weight: 4, tags: [] }
]);
