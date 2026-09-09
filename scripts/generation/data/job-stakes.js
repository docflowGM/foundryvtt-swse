/**
 * PHASE 8D-3C foundation — Job stakes pool for `jobs/job-stake.js`.
 *
 * Representative catalog (18 entries) — one of the two genuinely new
 * primitive vocabularies this phase adds (the other is `job-hooks.js`);
 * every other Job primitive (archetype/legality/visibility/urgency/
 * complication/consequence/twist/objective constraint/mission subject/
 * opposition request) already existed from Phase 8D-2 and is reused
 * verbatim. Production-scale hydration (50-100 entries per the phase
 * spec) is explicitly deferred past this wiring pass.
 *
 * "Stakes" is what's genuinely at risk beyond the numeric reward if the
 * Job goes wrong — narrative color a GM reads aloud or keeps in mind,
 * never a mechanical rule this system adjudicates itself. Deliberately
 * distinct from `job-consequences.js` (what changes in the world AFTER
 * success/failure) — stakes describe what's on the line DURING the job.
 */

export const JOB_STAKES = Object.freeze([
  { value: 'a life hangs in the balance if this drags on too long', weight: 3, tags: ['rescue', 'extraction'] },
  { value: 'the client\'s reputation will not survive public failure', weight: 2, tags: [] },
  { value: 'a small community depends on this succeeding quietly', weight: 2, tags: ['delivery', 'recovery'] },
  { value: 'failure hands a dangerous advantage to a rival faction', weight: 3, tags: ['sabotage', 'assault'] },
  { value: 'the cargo cannot be replaced if it is lost or damaged', weight: 2, tags: ['delivery', 'smuggling'] },
  { value: 'exposure would mean prison time for everyone involved', weight: 3, tags: ['illegal', 'heist', 'infiltration'] },
  { value: 'a fragile peace between two groups depends on discretion', weight: 2, tags: ['investigation', 'escort'] },
  { value: 'the target will disappear for good if this window is missed', weight: 3, tags: ['bounty', 'hunt'] },
  { value: 'a family\'s only source of income is riding on this', weight: 2, tags: [] },
  { value: 'the wrong outcome tips a local dispute into open violence', weight: 2, tags: ['assault', 'sabotage'] },
  { value: 'the client\'s standing with their own organization is on the line', weight: 2, tags: [] },
  { value: 'evidence this fragile will not survive a second attempt', weight: 2, tags: ['investigation', 'recovery'] },
  { value: 'a debt of honor is being repaid, not just a job', weight: 1, tags: [] },
  { value: 'the window before the target relocates is closing fast', weight: 2, tags: ['bounty', 'hunt', 'extraction'] },
  { value: 'someone innocent gets blamed if this isn\'t handled cleanly', weight: 2, tags: ['sabotage', 'heist'] },
  { value: 'the ship or vehicle involved cannot survive rough handling', weight: 2, tags: ['recovery', 'boarding'] },
  { value: 'the client is risking everything they own on this outcome', weight: 1, tags: [] },
  { value: 'nothing much is really riding on this beyond the job itself', weight: 4, tags: [] }
]);
