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
  { value: 'unremarkable in its internal culture', weight: 2, tags: [] },
  { value: 'proud and image-conscious, appearances matter deeply', weight: 2, tags: ['noble-house', 'business-professional'] },
  { value: 'pragmatic to a fault, ideals bend to necessity', weight: 2, tags: ['business-professional', 'military-paramilitary'] },
  { value: 'disciplined and hierarchical, orders are rarely questioned', weight: 2, tags: ['military-paramilitary', 'government-bureaucracy'] },
  { value: 'chaotic and improvisational, plans rarely survive contact', weight: 1, tags: ['crime-syndicate'] },
  { value: 'obsessed with secrecy and compartmentalized knowledge', weight: 1, tags: ['crime-syndicate', 'force-tradition'] },
  { value: 'warm and family-like, members genuinely care for one another', weight: 2, tags: ['community-tribe'] },
  { value: 'cutthroat internally, advancement means outmaneuvering peers', weight: 1, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'traditionalist, deeply resistant to changing old ways', weight: 2, tags: ['noble-house', 'religion', 'community-tribe'] },
  { value: 'restless and expansionist, never content with the status quo', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'bureaucratic to a fault, process matters more than outcome', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'fiercely meritocratic, only results earn respect', weight: 1, tags: ['business-professional', 'military-paramilitary'] },
  { value: 'haunted by a past failure it refuses to discuss openly', weight: 1, tags: [] },
  { value: 'welcoming to outsiders who prove themselves useful', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'quietly paranoid, always expecting betrayal', weight: 1, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'idealistic, genuinely believes in its own stated mission', weight: 1, tags: ['humanitarian', 'religion', 'government-bureaucracy'] },
  { value: 'transactional, loyalty is bought and openly understood as such', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'stoic and understated, achievements go unannounced', weight: 1, tags: ['force-tradition', 'military-paramilitary'] },
  { value: 'theatrical, fond of ceremony and public displays', weight: 1, tags: ['noble-house', 'religion'] },
  { value: 'quick to forgive failure if the attempt was earnest', weight: 1, tags: ['community-tribe'] },
  { value: 'unforgiving of failure, mistakes end careers', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'collegial, decisions are debated openly before being made', weight: 1, tags: ['research', 'government-bureaucracy'] },
  { value: 'fiercely protective of its own, an attack on one is an attack on all', weight: 2, tags: ['community-tribe', 'crime-syndicate'] },

  // PHASE 8D-3B FINAL CONTENT HYDRATION PASS -- reviewed under the
  // task's "no documented target" provision; the near-duplicate
  // "insular and suspicious of outsiders" was removed above as a
  // restatement of "insular, deeply distrustful of outsiders", and a
  // small number of genuinely distinct institutional characters were
  // added below where a real conceptual gap was found.
  { value: 'coldly transactional, sentiment never factors into a decision', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'deeply superstitious, decisions are shaped by omens and ritual', weight: 1, tags: ['religion', 'community-tribe'] },
  { value: 'obsessed with public image, appearances are managed carefully', weight: 2, tags: ['noble-house', 'business-professional', 'government-bureaucracy'] },
  { value: 'quietly experimental, willing to test unorthodox methods', weight: 1, tags: ['business-professional', 'research'] },
  { value: 'rigid about outward appearance, lax about internal enforcement', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'run like a family business, even at large scale', weight: 2, tags: ['business-professional', 'noble-house'] }
]);
