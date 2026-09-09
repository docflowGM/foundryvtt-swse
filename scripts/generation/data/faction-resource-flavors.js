/**
 * PHASE 8D-2 foundation — Faction resource-flavor pool for
 * `factions/faction-resource-profile.js`. Representative catalog (20
 * entries). Scale (`organization-metadata.js`) already answers HOW
 * MUCH a Faction commands; this pool answers WHAT KIND -- a flavor
 * fact independent of the numeric Scale curve, never a second Scale
 * authority.
 */

export const FACTION_RESOURCE_FLAVORS = Object.freeze([
  { value: 'controls a black-market supply chain', weight: 3, tags: ['crime-syndicate'] },
  { value: 'backed by legitimate business fronts', weight: 3, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'relies heavily on stolen or salvaged equipment', weight: 2, tags: ['crime-syndicate', 'community-tribe'] },
  { value: 'has access to advanced military-grade hardware', weight: 2, tags: ['military-paramilitary'] },
  { value: 'operates on a shoestring budget, resourceful out of necessity', weight: 3, tags: ['community-tribe', 'crime-syndicate'] },
  { value: 'sits on a hidden cache of accumulated wealth', weight: 1, tags: ['noble-house', 'crime-syndicate'] },
  { value: 'funded by outside patrons with their own agenda', weight: 2, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'self-sufficient, produces most of what it needs internally', weight: 2, tags: ['community-tribe'] },
  { value: 'dependent on a single vulnerable trade partner', weight: 2, tags: ['business-professional'] },
  { value: 'well-funded but slow to spend, bureaucratic approval required', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'wealthy in influence and favors, not necessarily credits', weight: 2, tags: ['noble-house', 'business-professional'] },
  { value: 'resource-rich in territory but cash-poor', weight: 2, tags: ['community-tribe', 'noble-house'] },
  { value: 'controls access to a scarce, valuable raw material', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'runs lean, deliberately avoids ostentatious spending', weight: 2, tags: ['military-paramilitary', 'force-tradition'] },
  { value: 'heavily leveraged, resources look better on paper than in practice', weight: 1, tags: ['business-professional'] },
  { value: 'draws resources from many small, loyal contributors', weight: 2, tags: ['community-tribe', 'religion'] },
  { value: 'has extensive but aging infrastructure', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'quietly diverts resources from a larger parent organization', weight: 1, tags: ['military-paramilitary', 'government-bureaucracy'] },
  { value: 'unremarkable, ordinary resources for its size', weight: 3, tags: [] },
  { value: 'controls a small but valuable fleet of ships', weight: 2, tags: ['trade', 'crime-syndicate', 'military-paramilitary'] },
  { value: 'owns and operates its own manufacturing capacity', weight: 2, tags: ['business-professional', 'industrial'] },
  { value: 'holds a deep well of favors owed by influential people', weight: 2, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'maintains a private security/enforcement arm', weight: 2, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'sits on a stockpile of stolen or salvaged goods', weight: 1, tags: ['crime-syndicate'] },
  { value: 'commands significant real estate/territory holdings', weight: 2, tags: ['noble-house', 'business-professional'] },
  { value: 'has access to exclusive, closely-guarded technology', weight: 1, tags: ['research', 'business-professional'] },
  { value: 'relies heavily on a single wealthy benefactor', weight: 1, tags: ['noble-house', 'crime-syndicate'] },
  { value: 'operates on razor-thin margins, resources are always tight', weight: 2, tags: [] },
  { value: 'maintains a hidden emergency reserve few know about', weight: 1, tags: ['crime-syndicate', 'noble-house'] },
  { value: 'has strong informal barter/trade relationships instead of credits', weight: 1, tags: ['community-tribe', 'frontier'] },
  { value: 'benefits from a lucrative but illegal revenue stream', weight: 1, tags: ['crime-syndicate'] },
  { value: 'commands a large, dedicated volunteer base instead of paid staff', weight: 1, tags: ['humanitarian', 'religion', 'community-tribe'] },

  // PHASE 8D-3B FINAL CONTENT HYDRATION PASS -- reviewed under the
  // task's "no documented target" provision. "maintains a private
  // fleet of vessels" was removed above as a near-duplicate of the
  // existing "controls a small but valuable fleet of ships" entry. A
  // small number of genuinely distinct resource flavors were added
  // below.
  { value: 'profits from brokering information rather than goods', weight: 1, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'relies on droid labor to offset a chronic shortage of willing members', weight: 1, tags: ['business-professional', 'industrial'] },
  { value: 'directly controls a piece of vital regional infrastructure', weight: 2, tags: ['government-bureaucracy', 'business-professional'] },
  { value: 'wealth is tied up in illiquid holdings, hard to move quickly', weight: 1, tags: ['noble-house', 'business-professional'] }
]);
