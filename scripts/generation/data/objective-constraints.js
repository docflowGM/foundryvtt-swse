/**
 * PHASE 8D-2 foundation — objective constraint pool for
 * `jobs/objective-constraint.js`. Representative catalog (22 entries).
 * A constraint is a GENERATE-tier flavor condition layered onto an
 * already-chosen `objective-template.js` template ("no witnesses",
 * "time limit") -- narrative color a GM can enforce loosely, never a
 * mechanical rule this system adjudicates itself.
 */

export const OBJECTIVE_CONSTRAINTS = Object.freeze([
  { value: 'no lethal force permitted', weight: 3, tags: ['legal', 'rescue'] },
  { value: 'no witnesses can be left behind', weight: 2, tags: ['illegal', 'sabotage', 'heist'] },
  { value: 'a strict time limit before the situation worsens', weight: 4, tags: ['rescue', 'extraction'] },
  { value: 'stealth required -- detection ends the mission', weight: 3, tags: ['infiltration', 'sabotage'] },
  { value: 'the target must be taken alive', weight: 3, tags: ['bounty', 'hunt'] },
  { value: 'avoid collateral damage to nearby civilians', weight: 3, tags: ['assault', 'sabotage'] },
  { value: 'the client demands total deniability', weight: 3, tags: ['illegal', 'heist'] },
  { value: 'a specific method or tool must be used', weight: 1, tags: [] },
  { value: 'the objective must appear to be an accident', weight: 1, tags: ['sabotage', 'illegal'] },
  { value: 'only a small crew is permitted on-site', weight: 2, tags: ['infiltration'] },
  { value: 'no communication with outside contacts during the operation', weight: 1, tags: ['heist', 'infiltration'] },
  { value: 'the cargo/asset must remain undamaged', weight: 3, tags: ['delivery', 'recovery'] },
  { value: 'local authorities must never be involved', weight: 2, tags: ['illegal', 'gray-area'] },
  { value: 'the mission must conclude before a specific event occurs', weight: 3, tags: [] },
  { value: 'a hostile rival must not learn of the operation', weight: 2, tags: ['heist', 'sabotage'] },
  { value: 'the true purpose of the mission must stay hidden from allies', weight: 1, tags: ['illegal'] },
  { value: 'minimal resources -- the client cannot supply extra support', weight: 2, tags: [] },
  { value: 'the operation must not be traceable back to the client', weight: 2, tags: ['illegal', 'gray-area'] },
  { value: 'a specific NPC must not be harmed under any circumstances', weight: 2, tags: ['rescue', 'escort'] },
  { value: 'evidence of the operation must be left behind as a message', weight: 1, tags: ['assault', 'sabotage'] },
  { value: 'the operation must be completed in a single uninterrupted push', weight: 1, tags: [] },
  { value: 'no meaningful constraints beyond the objective itself', weight: 3, tags: [] }
]);
