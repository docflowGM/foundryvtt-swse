/**
 * PHASE 8D-2 foundation — NPC secret pool for
 * `npc/npc-narrative-generator.js`. Representative catalog (25
 * entries). A secret is a private fact the NPC is actively hiding --
 * never revealed automatically, purely a GM-facing hook.
 */

export const NPC_SECRETS = Object.freeze([
  { value: 'secretly working as an informant for a rival organization', weight: 2, tags: ['criminal', 'military'] },
  { value: 'operating under an assumed identity', weight: 2, tags: ['criminal', 'mysterious'] },
  { value: 'has a criminal record erased under a different name', weight: 2, tags: ['criminal'] },
  { value: 'owes a life debt to someone genuinely dangerous', weight: 2, tags: ['criminal', 'military'] },
  { value: 'was once on the opposing side of the current conflict', weight: 2, tags: ['military'] },
  { value: 'is quietly hiding a Force-sensitive relative', weight: 1, tags: ['force', 'community'] },
  { value: 'has been embezzling from their own organization', weight: 2, tags: ['business', 'criminal'] },
  { value: 'is secretly informing for local law enforcement', weight: 2, tags: ['criminal', 'government'] },
  { value: 'faked their own death years ago', weight: 1, tags: ['mysterious'] },
  { value: 'is not actually related to the family they claim', weight: 1, tags: [] },
  { value: 'holds a grudge against someone close to them', weight: 2, tags: [] },
  { value: 'is deeply in debt to a dangerous creditor', weight: 3, tags: ['criminal', 'business'] },
  { value: 'has been secretly sabotaging a rival\'s operation', weight: 1, tags: ['business', 'criminal'] },
  { value: 'once betrayed someone who trusted them completely', weight: 2, tags: [] },
  { value: 'is planning to leave everything behind without warning', weight: 2, tags: [] },
  { value: 'harbors a forbidden romantic entanglement', weight: 1, tags: [] },
  { value: 'is secretly loyal to a cause their employer would condemn', weight: 2, tags: ['military', 'religion'] },
  { value: 'has been forging official documents', weight: 1, tags: ['criminal', 'government'] },
  { value: 'knows the location of something many people are looking for', weight: 2, tags: ['mysterious'] },
  { value: 'is being blackmailed over a past mistake', weight: 2, tags: ['criminal'] },
  { value: 'secretly doubts the cause they publicly champion', weight: 1, tags: ['military', 'religion'] },
  { value: 'is a deserter hiding from their former unit', weight: 1, tags: ['military'] },
  { value: 'has a hidden stash few people know about', weight: 2, tags: ['criminal', 'business'] },
  { value: 'is reporting on this operation to an outside party', weight: 1, tags: ['criminal', 'military'] },
  { value: 'has no notable secret worth hiding', weight: 3, tags: [] }
]);
