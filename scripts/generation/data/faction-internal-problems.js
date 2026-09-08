/**
 * PHASE 8D-2 foundation — Faction internal-problem pool for
 * `factions/faction-internal-problems.js`. Representative catalog (25
 * entries). A GM-facing complication INSIDE the organization -- never
 * automatically surfaced to players, purely a narrative hook.
 */

export const FACTION_INTERNAL_PROBLEMS = Object.freeze([
  { value: 'a bitter rivalry between two senior leaders', weight: 3, tags: [] },
  { value: 'chronic funding shortages', weight: 3, tags: ['business-professional'] },
  { value: 'a leadership succession crisis looming', weight: 2, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'an informant leaking secrets to a rival', weight: 2, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'a schism forming over ideological differences', weight: 2, tags: ['religion', 'government-bureaucracy'] },
  { value: 'corruption quietly eating away at the ranks', weight: 3, tags: ['government-bureaucracy', 'crime-syndicate'] },
  { value: 'overextended -- too many commitments, too few resources', weight: 2, tags: ['military-paramilitary', 'business-professional'] },
  { value: 'a recent, embarrassing failure damaging morale', weight: 2, tags: [] },
  { value: 'growing dissent among the rank and file', weight: 2, tags: [] },
  { value: 'an aging leadership badly out of touch with newer members', weight: 2, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'a talented member being courted by a rival organization', weight: 1, tags: ['business-professional'] },
  { value: 'unresolved blame over who caused a recent disaster', weight: 1, tags: [] },
  { value: 'a dangerous overreliance on one irreplaceable specialist', weight: 1, tags: ['business-professional', 'military-paramilitary'] },
  { value: 'internal factions quietly working against each other', weight: 2, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'a scandal that could become public at any time', weight: 2, tags: ['noble-house', 'business-professional'] },
  { value: 'equipment and infrastructure falling into disrepair', weight: 2, tags: ['crime-syndicate', 'community-tribe'] },
  { value: 'a debt owed to a dangerous outside creditor', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'members questioning whether leadership still believes the cause', weight: 1, tags: ['religion', 'military-paramilitary'] },
  { value: 'a recent defection that took valuable knowledge with it', weight: 1, tags: [] },
  { value: 'two departments/cells refusing to cooperate with each other', weight: 2, tags: ['government-bureaucracy', 'crime-syndicate'] },
  { value: 'an over-reliance on a single, vulnerable supply line', weight: 2, tags: ['business-professional', 'military-paramilitary'] },
  { value: 'a well-liked leader privately losing their nerve', weight: 1, tags: [] },
  { value: 'internal discipline breaking down after recent losses', weight: 1, tags: ['military-paramilitary'] },
  { value: 'a promising initiative quietly failing behind closed doors', weight: 1, tags: ['business-professional'] },
  { value: 'no significant internal problems at the moment', weight: 2, tags: [] },
  { value: 'two senior members locked in a quiet power struggle', weight: 2, tags: [] },
  { value: 'a critical piece of equipment/infrastructure is failing', weight: 2, tags: ['business-professional', 'industrial'] },
  { value: 'funding is drying up faster than expected', weight: 2, tags: ['business-professional'] },
  { value: 'a founding member is threatening to walk away', weight: 1, tags: [] },
  { value: 'younger members are chafing against old traditions', weight: 1, tags: ['noble-house', 'community-tribe', 'religion'] },
  { value: 'a trusted lieutenant is secretly working for a rival', weight: 1, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'the organization has expanded faster than it can manage', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'a costly legal or diplomatic entanglement is unresolved', weight: 1, tags: ['government-bureaucracy', 'business-professional'] },
  { value: 'morale is low after a string of small failures', weight: 2, tags: [] },
  { value: 'a key supplier/patron is wavering on their commitment', weight: 2, tags: ['business-professional'] },
  { value: 'an old grudge between two factions within the org festers', weight: 1, tags: ['crime-syndicate', 'noble-house'] },
  { value: 'a scandal involving a senior member is close to breaking', weight: 1, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'recruitment has stalled and the ranks are thinning', weight: 1, tags: [] },
  { value: 'a rival has successfully poached several key members', weight: 1, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'the current leadership is widely seen as out of touch', weight: 1, tags: [] },
  { value: 'a secret is at serious risk of coming to light', weight: 1, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'the organization is quietly running a deficit it can\'t admit to', weight: 1, tags: ['business-professional'] },
  { value: 'a faction elder\'s failing health threatens a succession crisis', weight: 1, tags: ['noble-house', 'community-tribe'] },
  { value: 'a well-meaning reform effort has backfired badly', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'internal communications have been compromised', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'] }
]);
