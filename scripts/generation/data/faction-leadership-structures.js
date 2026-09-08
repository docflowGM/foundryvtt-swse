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
  { value: 'an appointed governor answering to a higher external authority', weight: 2, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'a hereditary lineage of succession within one family', weight: 2, tags: ['noble-house'] },
  { value: 'a rotating chairmanship among senior members', weight: 1, tags: ['business-professional', 'government-bureaucracy'] },
  { value: 'a strict military-style rank hierarchy', weight: 2, tags: ['military-paramilitary'] },
  { value: 'a single, unchallenged supreme leader', weight: 2, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'a triumvirate of co-equal leaders who must agree unanimously', weight: 1, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'elected leadership, subject to periodic votes by the membership', weight: 2, tags: ['government-bureaucracy', 'community-tribe'] },
  { value: 'leadership earned through trial or proven skill', weight: 1, tags: ['force-tradition', 'military-paramilitary'] },
  { value: 'a spiritual leader whose authority is unquestioned', weight: 1, tags: ['religion', 'force-tradition'] },
  { value: 'a board of directors balancing competing interests', weight: 2, tags: ['business-professional'] },
  { value: 'informal leadership -- whoever speaks loudest at the moment', weight: 1, tags: ['crime-syndicate', 'community-tribe'] },
  { value: 'a council of elders whose word is final', weight: 2, tags: ['community-tribe', 'noble-house'] },
  { value: 'leadership passed by mentorship, chosen by the outgoing leader', weight: 1, tags: ['force-tradition', 'business-professional'] },
  { value: 'a puppet leader controlled by unseen backers', weight: 1, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'a franchise model -- semi-independent local cells under a shared banner', weight: 1, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'joint command shared uneasily between former rivals', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'] }
]);
