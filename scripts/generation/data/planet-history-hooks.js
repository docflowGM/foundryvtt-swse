/**
 * PHASE 8D-2 foundation — procedural planet history-hook pool for
 * `planets/planet-history-hooks.js`. Representative catalog (26
 * entries). A history hook is a short GENERATE-tier narrative seed a GM
 * can build a session around ("this world was the site of..."); it is
 * never a citation to real, specific Star Wars canon lore, and never
 * implies a specific statblock, Faction, or NPC — those stay entirely
 * up to the GM (or a later, separate generator) to attach.
 */

export const PLANET_HISTORY_HOOKS = Object.freeze([
  { value: 'site of a forgotten battle from a past galactic conflict', weight: 3, tags: ['military-paramilitary'] },
  { value: 'home to a long-abandoned Force-tradition enclave', weight: 2, tags: ['force-tradition', 'mysterious'] },
  { value: 'recently annexed by a larger power', weight: 3, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'a disputed border world claimed by two factions', weight: 3, tags: ['military-paramilitary'] },
  { value: 'founded by refugees fleeing another conflict', weight: 2, tags: ['community-tribe'] },
  { value: 'once a thriving trade hub now in decline', weight: 2, tags: ['business-professional', 'trade'] },
  { value: 'the site of a natural disaster within living memory', weight: 2, tags: [] },
  { value: 'rumored to hide pre-Republic ruins', weight: 2, tags: ['mysterious'] },
  { value: 'a former penal colony, still shaped by that legacy', weight: 1, tags: ['enforcement', 'frontier'] },
  { value: 'the birthplace of a locally famous historical figure', weight: 2, tags: [] },
  { value: 'devastated by an industrial accident decades ago', weight: 1, tags: [] },
  { value: 'liberated from occupation within the last generation', weight: 2, tags: ['military-paramilitary'] },
  { value: 'the site of a still-unresolved political assassination', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'settled only recently by corporate colonists', weight: 2, tags: ['business-professional'] },
  { value: 'home to a persecuted minority community', weight: 2, tags: ['community-tribe'] },
  { value: 'the location of a famous (or infamous) peace treaty', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'plagued by an unsolved string of disappearances', weight: 1, tags: ['mysterious', 'criminal'] },
  { value: 'a former Separatist or Rebel stronghold', weight: 2, tags: ['military-paramilitary'] },
  { value: 'sacred to the native species, resented by newcomers', weight: 2, tags: ['community-tribe', 'religion'] },
  { value: 'the site of an infamous heist still talked about locally', weight: 1, tags: ['crime-syndicate'] },
  { value: 'a strategic hyperspace lane junction, fought over for generations', weight: 2, tags: ['military-paramilitary', 'trade'] },
  { value: 'home to a reclusive noble house in decline', weight: 1, tags: ['noble-house'] },
  { value: 'recently discovered/opened to outside contact', weight: 2, tags: ['frontier'] },
  { value: 'a graveyard world littered with old starship wreckage', weight: 1, tags: ['mysterious', 'void'] },
  { value: 'the site of a still-simmering labor dispute', weight: 1, tags: ['business-professional'] },
  { value: 'no notable history -- an unremarkable world', weight: 3, tags: [] }
]);
