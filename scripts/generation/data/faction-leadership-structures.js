/**
 * PHASE 8D-2 foundation — Faction leadership-structure pool for
 * `factions/faction-leadership-structure.js`. Representative catalog
 * (20 entries): the SHAPE of who holds power, distinct from
 * `rank-metadata.js` (the internal rank ladder members climb).
 */

export const FACTION_LEADERSHIP_STRUCTURES = Object.freeze([
  { value: 'a single supreme leader with near-absolute authority', weight: 4, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'a ruling council of equals, decisions by majority', weight: 3, tags: ['government-bureaucracy', 'community-tribe'] },
  { value: 'a triumvirate carefully balancing power between three', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'a hereditary line of succession', weight: 2, tags: ['noble-house'] },
  { value: 'leadership determined by trial of skill or combat', weight: 1, tags: ['community-tribe', 'military-paramilitary'] },
  { value: 'leadership rotates on a fixed schedule', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'a figurehead leader, real power held by advisors', weight: 2, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'leadership actively contested and unstable right now', weight: 2, tags: ['crime-syndicate'] },
  { value: 'collective, consensus-based leadership with no clear head', weight: 1, tags: ['community-tribe'] },
  { value: 'leadership follows whoever controls the most resources', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'a military-style command staff beneath one commanding officer', weight: 3, tags: ['military-paramilitary'] },
  { value: 'a board of directors, decisions by vote and influence', weight: 2, tags: ['business-professional'] },
  { value: 'a spiritual leader whose word is treated as final', weight: 1, tags: ['religion', 'force-tradition'] },
  { value: 'regional leaders operating with significant autonomy', weight: 2, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'a founder still personally directing every major decision', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'an elder council advising a younger, formal leader', weight: 1, tags: ['community-tribe', 'noble-house'] },
  { value: 'leadership by whoever proves most ruthless', weight: 1, tags: ['crime-syndicate'] },
  { value: 'a shared command structure between allied houses/cells', weight: 1, tags: ['noble-house', 'crime-syndicate'] },
  { value: 'no formal leadership -- purely reputation-driven influence', weight: 1, tags: ['crime-syndicate', 'community-tribe'] },
  { value: 'an appointed governor answering to a higher external authority', weight: 2, tags: ['government-bureaucracy', 'military-paramilitary'] }
]);
