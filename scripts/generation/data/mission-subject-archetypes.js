/**
 * PHASE 8D-2 foundation — mission-subject archetype pool for
 * `jobs/mission-subject.js`. Representative catalog (22 entries). A
 * mission subject is WHO/WHAT an objective template's `PERSON_OR_DROID`
 * (or similar) slot resolves to conceptually -- the archetype answers
 * "what role does this person/droid play in the mission," distinct
 * from their full narrative identity (`npc-concept.js` +
 * `npc-narrative-generator.js` own that).
 */

export const MISSION_SUBJECT_ARCHETYPES = Object.freeze([
  { value: 'hostage', weight: 3, tags: ['rescue', 'extraction'] },
  { value: 'fugitive', weight: 3, tags: ['bounty', 'hunt'] },
  { value: 'informant', weight: 2, tags: ['investigation', 'infiltration'] },
  { value: 'VIP requiring protection', weight: 3, tags: ['escort'] },
  { value: 'witness to a crime', weight: 2, tags: ['investigation'] },
  { value: 'defector seeking asylum', weight: 1, tags: ['extraction', 'rescue'] },
  { value: 'rival operative', weight: 2, tags: ['sabotage', 'hunt'] },
  { value: 'missing person', weight: 3, tags: ['investigation', 'rescue'] },
  { value: 'kidnap victim', weight: 2, tags: ['rescue', 'extraction'] },
  { value: 'wanted criminal', weight: 3, tags: ['bounty', 'hunt'] },
  { value: 'stranded traveler', weight: 1, tags: ['rescue'] },
  { value: 'undercover agent needing exfiltration', weight: 1, tags: ['extraction'] },
  { value: 'disgraced official in hiding', weight: 1, tags: ['investigation', 'extraction'] },
  { value: 'client\'s estranged family member', weight: 1, tags: ['rescue', 'escort'] },
  { value: 'double agent whose loyalty is unclear', weight: 1, tags: ['investigation', 'sabotage'] },
  { value: 'captured ally awaiting rescue', weight: 2, tags: ['rescue', 'extraction'] },
  { value: 'negotiator for a hostile party', weight: 1, tags: ['escort'] },
  { value: 'scientist/specialist with critical knowledge', weight: 2, tags: ['extraction', 'escort'] },
  { value: 'refugee seeking safe passage', weight: 2, tags: ['escort', 'extraction'] },
  { value: 'target for elimination', weight: 2, tags: ['assault', 'hunt'] },
  { value: 'courier carrying vital information', weight: 2, tags: ['escort', 'delivery'] },
  { value: 'ordinary person caught in the wrong place', weight: 2, tags: ['rescue'] }
]);
