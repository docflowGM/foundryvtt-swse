/**
 * PHASE 8D-2 foundation — Faction institutional-character trait pool
 * for `factions/faction-institutional-character.js`. Representative
 * catalog (25 entries): HOW an organization operates/feels, distinct
 * from what it IS (`organization-metadata.js`'s family/archetype) or
 * WHY it exists (`faction-goals.js`). `tags` loosely reuse
 * `ORGANIZATION_FAMILY` values for soft biasing.
 */

export const FACTION_INSTITUTIONAL_CHARACTERS = Object.freeze([
  { value: 'rigidly hierarchical, chain of command respected absolutely', weight: 3, tags: ['military-paramilitary', 'government-bureaucracy'] },
  { value: 'organized as loosely affiliated, semi-independent cells', weight: 2, tags: ['crime-syndicate'] },
  { value: 'meritocratic -- advancement earned, not inherited', weight: 2, tags: ['military-paramilitary', 'business-professional'] },
  { value: 'nepotistic, family and personal ties matter more than skill', weight: 2, tags: ['noble-house', 'crime-syndicate'] },
  { value: 'secretive and compartmentalized -- few know the full picture', weight: 3, tags: ['crime-syndicate', 'force-tradition'] },
  { value: 'publicly transparent about its structure and aims', weight: 2, tags: ['government-bureaucracy', 'community-tribe'] },
  { value: 'ruthlessly pragmatic, ends justify means', weight: 3, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'bound by an old code of honor, rarely broken', weight: 2, tags: ['noble-house', 'military-paramilitary'] },
  { value: 'opportunistic, shifts allegiance when convenient', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'fiercely traditional, resistant to change', weight: 2, tags: ['noble-house', 'religion'] },
  { value: 'innovation-driven, always chasing the next advantage', weight: 2, tags: ['business-professional'] },
  { value: 'insular, deeply distrustful of outsiders', weight: 3, tags: ['community-tribe', 'crime-syndicate'] },
  { value: 'highly bureaucratic -- everything requires paperwork and approval', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'organized around a cult of personality centered on its leader', weight: 1, tags: ['crime-syndicate', 'religion'] },
  { value: 'decentralized, no single leader truly controls it', weight: 1, tags: ['crime-syndicate', 'community-tribe'] },
  { value: 'disciplined and drilled, expects total obedience', weight: 2, tags: ['military-paramilitary', 'enforcement'] },
  { value: 'consensus-driven, decisions take time but hold firm', weight: 2, tags: ['community-tribe', 'government-bureaucracy'] },
  { value: 'competitive internally -- members jockey openly for standing', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'paternalistic, leadership genuinely looks after its people', weight: 2, tags: ['community-tribe', 'noble-house'] },
  { value: 'expansionist, always looking to grow its reach', weight: 2, tags: ['military-paramilitary', 'business-professional'] },
  { value: 'isolationist, content to hold what it already has', weight: 2, tags: ['community-tribe', 'noble-house'] },
  { value: 'zealous, devoted beyond mere professional loyalty', weight: 1, tags: ['religion', 'force-tradition'] },
  { value: 'mercenary at heart, loyalty follows payment', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'egalitarian, rank matters less than contribution', weight: 1, tags: ['community-tribe'] },
  { value: 'unremarkable in its internal culture', weight: 2, tags: [] }
]);
