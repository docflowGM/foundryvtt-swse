/**
 * PHASE 8D-2 foundation — intel/clue concept pool for
 * `jobs/intel-clue-concept.js`. Representative catalog (22 entries).
 * Conceptually related to (but never calling into) the existing
 * Holonet Intel/Bulletin system -- this generates a GENERIC clue TYPE
 * a mission briefing can reference, never a real Holonet Intel record
 * or a link into that system.
 */

export const INTEL_CLUE_CONCEPTS = Object.freeze([
  { value: 'an overheard conversation in a cantina', weight: 3, tags: ['investigation'] },
  { value: 'an intercepted comm transmission', weight: 3, tags: ['investigation', 'infiltration'] },
  { value: 'physical evidence left at a scene', weight: 3, tags: ['investigation'] },
  { value: 'a tip from a paid informant', weight: 3, tags: ['investigation', 'bounty'] },
  { value: 'financial records showing an unusual transaction', weight: 2, tags: ['investigation'] },
  { value: 'a ship\'s travel manifest', weight: 2, tags: ['investigation', 'recovery'] },
  { value: 'security footage from a nearby facility', weight: 2, tags: ['investigation', 'infiltration'] },
  { value: 'a partially decrypted data file', weight: 2, tags: ['investigation', 'heist'] },
  { value: 'a witness account, possibly unreliable', weight: 2, tags: ['investigation'] },
  { value: 'a discarded piece of correspondence', weight: 1, tags: ['investigation'] },
  { value: 'a distinctive item left behind', weight: 1, tags: ['investigation'] },
  { value: 'a pattern noticed across multiple incidents', weight: 2, tags: ['investigation'] },
  { value: 'a rumor circulating among smugglers', weight: 2, tags: ['investigation', 'smuggling'] },
  { value: 'an official record that doesn\'t add up', weight: 1, tags: ['investigation'] },
  { value: 'a coded message intercepted mid-transit', weight: 1, tags: ['investigation', 'infiltration'] },
  { value: 'testimony obtained under duress', weight: 1, tags: ['investigation', 'bounty'] },
  { value: 'an anonymous tip left at a drop point', weight: 2, tags: ['investigation'] },
  { value: 'a maintenance log with a suspicious gap', weight: 1, tags: ['investigation'] },
  { value: 'a recovered black box / flight recorder', weight: 1, tags: ['investigation', 'recovery'] },
  { value: 'a defector\'s account of internal operations', weight: 1, tags: ['investigation'] },
  { value: 'a pattern in shipping/cargo manifests', weight: 2, tags: ['investigation', 'smuggling'] },
  { value: 'a cryptic warning from an unknown source', weight: 1, tags: ['investigation'] }
]);
