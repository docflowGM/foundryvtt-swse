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
  { value: 'maintains a private fleet of vessels', weight: 1, tags: ['military-paramilitary', 'business-professional'] },
  { value: 'controls access to a scarce, valuable raw material', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'runs lean, deliberately avoids ostentatious spending', weight: 2, tags: ['military-paramilitary', 'force-tradition'] },
  { value: 'heavily leveraged, resources look better on paper than in practice', weight: 1, tags: ['business-professional'] },
  { value: 'draws resources from many small, loyal contributors', weight: 2, tags: ['community-tribe', 'religion'] },
  { value: 'has extensive but aging infrastructure', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'quietly diverts resources from a larger parent organization', weight: 1, tags: ['military-paramilitary', 'government-bureaucracy'] },
  { value: 'unremarkable, ordinary resources for its size', weight: 3, tags: [] }
]);
