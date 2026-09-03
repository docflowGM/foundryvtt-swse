/**
 * PHASE 8D-2 foundation — procedural planet hazard pool for
 * `planets/planet-hazards.js`. Representative catalog (26 entries).
 * A hazard is a GENERATE-tier narrative/environmental flavor fact only
 * — it never implies an actual encounter, statblock, or mechanical
 * effect (that stays SUGGEST/RESOLVE-tier, resolved by a GM or a future
 * encounter system, not minted here).
 */

export const PLANET_HAZARDS = Object.freeze([
  { value: 'extreme weather (storms/sandstorms)', weight: 3, tags: ['desert', 'arid', 'ocean'] },
  { value: 'hostile wildlife', weight: 4, tags: ['jungle', 'forest', 'swamp'] },
  { value: 'pirate activity nearby', weight: 3, tags: ['trade', 'frontier'] },
  { value: 'ambient radiation', weight: 2, tags: ['volcanic', 'void'] },
  { value: 'seismic instability', weight: 2, tags: ['volcanic', 'mountain'] },
  { value: 'toxic atmosphere pockets', weight: 2, tags: ['volcanic', 'desert'] },
  { value: 'organized-crime territory', weight: 3, tags: ['urban', 'criminal'] },
  { value: 'minefields (old war leftovers)', weight: 1, tags: ['military', 'frontier'] },
  { value: 'extreme cold / exposure risk', weight: 2, tags: ['ice', 'frozen', 'tundra'] },
  { value: 'quicksand / unstable terrain', weight: 2, tags: ['swamp', 'desert'] },
  { value: 'flash flooding', weight: 2, tags: ['jungle', 'ocean'] },
  { value: 'pirate/raider blockade', weight: 2, tags: ['void', 'trade'] },
  { value: 'unstable local government / civil unrest', weight: 3, tags: ['urban', 'government-bureaucracy'] },
  { value: 'plague / disease outbreak', weight: 1, tags: ['urban', 'rural'] },
  { value: 'territorial predators', weight: 3, tags: ['jungle', 'forest', 'mountain'] },
  { value: 'sensor-blinding ion storms', weight: 1, tags: ['void', 'mysterious'] },
  { value: 'ancient automated defenses', weight: 1, tags: ['mysterious', 'desert'] },
  { value: 'smuggler turf war', weight: 2, tags: ['criminal', 'urban'] },
  { value: 'crumbling/derelict infrastructure', weight: 2, tags: ['urban', 'frontier'] },
  { value: 'corrosive atmosphere', weight: 1, tags: ['volcanic', 'desert'] },
  { value: 'low-gravity hazards', weight: 1, tags: ['void', 'mysterious'] },
  { value: 'native insurgency against off-worlders', weight: 2, tags: ['military-paramilitary', 'frontier'] },
  { value: 'slaver activity', weight: 1, tags: ['criminal', 'frontier'] },
  { value: 'resource scarcity (water/food)', weight: 2, tags: ['desert', 'frontier'] },
  { value: 'imperial/military checkpoints', weight: 2, tags: ['military-paramilitary', 'enforcement'] },
  { value: 'no notable hazards', weight: 3, tags: [] }
]);
