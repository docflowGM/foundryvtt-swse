/**
 * PHASE 8D-3C hydration — Job stakes pool for `jobs/job-stake.js`.
 *
 * Hydrated from the Phase 8D-3C wiring pass's 18-entry representative
 * catalog to production scale (55 entries, within the phase spec's
 * documented 50-100 target). Wiring unchanged — `jobs/job-stake.js`'s
 * picker and `job-bundle.js`'s composer are untouched; this file only
 * grows the vocabulary they already consume.
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
  { value: 'nothing much is really riding on this beyond the job itself', weight: 4, tags: [] },
  { value: 'a medical condition worsens with every hour the delay continues', weight: 2, tags: ['rescue', 'delivery'] },
  { value: 'the client\'s cover story unravels if this takes too long', weight: 2, tags: ['infiltration', 'investigation'] },
  { value: 'a season\'s worth of harvest or stock spoils if delivery slips', weight: 2, tags: ['delivery', 'recovery'] },
  { value: 'a second crew is already circling the same opportunity', weight: 2, tags: ['heist', 'bounty', 'recovery'] },
  { value: 'the client\'s marriage or partnership depends on this working out', weight: 1, tags: [] },
  { value: 'a settlement\'s water or power supply fails without this repaired', weight: 3, tags: ['recovery', 'sabotage'] },
  { value: 'the crew\'s own standing with a patron is being quietly tested', weight: 2, tags: [] },
  { value: 'a witness will not survive long enough to testify if this stalls', weight: 3, tags: ['rescue', 'investigation'] },
  { value: 'the target holds information that expires the moment they talk', weight: 2, tags: ['investigation', 'bounty'] },
  { value: 'a shipment this size draws attention the longer it sits exposed', weight: 2, tags: ['smuggling', 'delivery'] },
  { value: 'the client\'s license or permit lapses if the paperwork isn\'t settled in time', weight: 1, tags: ['legal'] },
  { value: 'a rescue this delicate only has one real attempt', weight: 3, tags: ['rescue', 'extraction'] },
  { value: 'a controlling interest in a business changes hands based on the outcome', weight: 1, tags: [] },
  { value: 'the target\'s allies will retaliate hard if this goes wrong', weight: 2, tags: ['assault', 'bounty', 'hunt'] },
  { value: 'an old grudge resurfaces the moment word of this gets out', weight: 1, tags: [] },
  { value: 'the crew\'s ship is put up as collateral against this job\'s success', weight: 2, tags: [] },
  { value: 'a fragile alliance between crews depends on this going smoothly', weight: 1, tags: ['escort', 'delivery'] },
  { value: 'local officials are watching closely enough that one mistake ends the arrangement', weight: 2, tags: ['legal', 'gray-area'] },
  { value: 'the client has already burned every other option before calling the crew', weight: 2, tags: [] },
  { value: 'a data cache this sensitive cannot be recovered a second time', weight: 2, tags: ['recovery', 'investigation'] },
  { value: 'the crew\'s cover identity is blown for good if this is mishandled', weight: 2, tags: ['infiltration'] },
  { value: 'a hostage situation grows more dangerous with every hour of delay', weight: 3, tags: ['rescue'] },
  { value: 'the client\'s only remaining leverage disappears if this fails', weight: 1, tags: [] },
  { value: 'a fragile ceasefire between rival crews depends on quiet handling', weight: 1, tags: ['escort', 'investigation'] },
  { value: 'the last working copy of something irreplaceable is what\'s being moved', weight: 2, tags: ['delivery', 'recovery'] },
  { value: 'the client\'s family will suffer the consequences of failure directly', weight: 2, tags: [] },
  { value: 'a corrupt official\'s cooperation only lasts as long as this stays quiet', weight: 1, tags: ['illegal', 'gray-area'] },
  { value: 'the crew\'s payment is tied up in an asset that can still be seized', weight: 1, tags: [] },
  { value: 'an entire settlement\'s trust in outsiders rides on how this goes', weight: 2, tags: [] },
  { value: 'the opportunity closes the moment a rival organization notices it', weight: 2, tags: ['heist', 'recovery'] },
  { value: 'someone the client loves is directly in harm\'s way', weight: 3, tags: ['rescue', 'extraction'] },
  { value: 'the client\'s freedom is forfeit if this can be traced back to them', weight: 2, tags: ['illegal'] },
  { value: 'a fragile supply line collapses for good if this shipment doesn\'t get through', weight: 2, tags: ['delivery', 'escort'] },
  { value: 'the last chance to make this right before it becomes permanent is now', weight: 2, tags: [] },
  { value: 'a promise made to someone now gone is the only reason this matters at all', weight: 1, tags: [] },
  { value: 'the crew\'s own safety is the only thing actually riding on this', weight: 3, tags: [] },
  { value: 'nobody outside the room can ever know this job happened at all', weight: 2, tags: ['illegal', 'hidden'] },
  { value: 'an entire operation\'s cover is blown if the wrong person notices', weight: 2, tags: ['infiltration', 'smuggling'] }
]);
