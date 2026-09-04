/**
 * PHASE 8D-2 foundation — procedural planet hazard pool for
 * `planets/planet-hazards.js`. A hazard is a GENERATE-tier narrative/
 * environmental flavor fact only — it never implies an actual
 * encounter, statblock, or mechanical effect (that stays SUGGEST/
 * RESOLVE-tier, resolved by a GM or a future encounter system, not
 * minted here). No DCs, no damage values, ever.
 *
 * PHASE 8D-3A production expansion: grown from 26 representative
 * entries to a ~85-entry production catalog covering the five
 * categories the phase spec named — weather, geological, biological,
 * astronomical, and technological hazards — alongside the original
 * social/security hazards (crime, unrest, checkpoints, ...) that
 * predate the phase's category breakdown but remain equally valid
 * narrative risk flavor.
 */

export const PLANET_HAZARDS = Object.freeze([
  // --- original representative entries (unchanged) ---
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
  { value: 'no notable hazards', weight: 3, tags: [] },

  // --- weather ---
  { value: 'frequent electrical storms', weight: 2, tags: ['storm', 'desert'] },
  { value: 'seasonal sandstorms', weight: 2, tags: ['desert', 'arid'] },
  { value: 'sudden, brutal blizzards', weight: 2, tags: ['ice', 'polar'] },
  { value: 'violent monsoon seasons', weight: 2, tags: ['jungle', 'swamp'] },
  { value: 'corrosive acid rain', weight: 1, tags: ['volcanic', 'toxic'] },
  { value: 'extreme heat waves', weight: 2, tags: ['desert', 'volcanic'] },
  { value: 'sudden, deep cold snaps', weight: 2, tags: ['ice', 'tundra'] },
  { value: 'flash hailstorms', weight: 1, tags: ['storm', 'mountain'] },
  { value: 'dust devils and micro-tornadoes', weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'dense, disorienting fog banks', weight: 1, tags: ['swamp', 'mysterious'] },
  { value: 'sudden atmospheric pressure shifts', weight: 1, tags: ['mountain', 'void'] },
  { value: 'lightning-sparked wildfires', weight: 1, tags: ['forest', 'grassland'] },

  // --- geological ---
  { value: 'frequent earthquakes', weight: 2, tags: ['volcanic', 'mountain'] },
  { value: 'active volcanic eruptions', weight: 2, tags: ['volcanic', 'lava'] },
  { value: 'unstable cavern collapses', weight: 1, tags: ['cave', 'mountain'] },
  { value: 'sudden sinkhole formation', weight: 1, tags: ['sinkhole', 'wasteland'] },
  { value: 'frequent landslides', weight: 2, tags: ['mountain', 'canyon'] },
  { value: 'unpredictable geysers and steam vents', weight: 1, tags: ['volcanic', 'lava'] },
  { value: 'shifting dunes that bury structures', weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'crumbling cliff faces', weight: 1, tags: ['mountain', 'canyon'] },
  { value: 'toxic mineral outgassing from the crust', weight: 1, tags: ['volcanic', 'mining'] },
  { value: 'sudden ground fissures', weight: 1, tags: ['canyon', 'wasteland'] },
  { value: 'unstable permafrost causing surface collapse', weight: 1, tags: ['polar', 'tundra'] },

  // --- biological ---
  { value: 'toxic pollen during bloom season', weight: 1, tags: ['jungle', 'forest'] },
  { value: 'dangerous fungal spores', weight: 1, tags: ['fungal', 'swamp'] },
  { value: 'predatory megafauna roaming the wilderness', weight: 2, tags: ['jungle', 'mountain'] },
  { value: 'parasitic organisms in local water sources', weight: 1, tags: ['swamp', 'jungle'] },
  { value: 'aggressive insect or arthropod swarms', weight: 2, tags: ['jungle', 'swamp'] },
  { value: 'poisonous native flora', weight: 2, tags: ['jungle', 'forest'] },
  { value: 'venomous native fauna', weight: 2, tags: ['desert', 'jungle'] },
  { value: 'invasive species disrupting the ecosystem', weight: 1, tags: ['rural', 'agriculture'] },
  { value: 'aggressive territorial pack hunters', weight: 2, tags: ['wilderness', 'forest'] },
  { value: 'contagious local wildlife disease', weight: 1, tags: ['rural', 'wilderness'] },
  { value: 'carnivorous plant life near settlements', weight: 1, tags: ['jungle', 'swamp'] },
  { value: 'aggressive aquatic predators', weight: 2, tags: ['ocean', 'water'] },

  // --- astronomical ---
  { value: 'periodic radiation storms', weight: 1, tags: ['void', 'space'] },
  { value: 'heavy meteor shower activity', weight: 1, tags: ['asteroid', 'space'] },
  { value: 'unstable orbital debris fields', weight: 1, tags: ['asteroid', 'void'] },
  { value: 'frequent solar flare activity', weight: 1, tags: ['space', 'void'] },
  { value: 'gravitational anomalies affecting navigation', weight: 1, tags: ['mysterious', 'void'] },
  { value: 'micrometeorite bombardment', weight: 1, tags: ['asteroid', 'space'] },
  { value: 'severe magnetic storms overhead', weight: 1, tags: ['void', 'mysterious'] },
  { value: 'unpredictable comet debris trails', weight: 1, tags: ['space', 'void'] },

  // --- technological ---
  { value: 'magnetic interference disrupting comms', weight: 1, tags: ['void', 'industrial'] },
  { value: 'ancient automated defense turrets, still active', weight: 1, tags: ['mysterious', 'military'] },
  { value: 'unstable, poorly maintained reactors nearby', weight: 1, tags: ['industrial', 'urban'] },
  { value: 'abandoned industrial contamination zones', weight: 1, tags: ['industrial', 'wasteland'] },
  { value: 'malfunctioning automated systems', weight: 1, tags: ['industrial', 'urban'] },
  { value: 'rogue security droids patrolling old facilities', weight: 1, tags: ['mysterious', 'industrial'] },
  { value: 'unstable minefield left from an old conflict', weight: 1, tags: ['military', 'frontier'] },
  { value: 'derelict starship wreckage littering the area', weight: 1, tags: ['mysterious', 'void'] },
  { value: 'unregulated industrial pollution', weight: 1, tags: ['industrial', 'urban'] },
  { value: 'faulty life-support systems in enclosed habitats', weight: 1, tags: ['artificial', 'urban'] },

  // --- social / security (predates the phase's five categories, kept for coverage) ---
  { value: 'rampant political corruption', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'active gang warfare in urban districts', weight: 2, tags: ['urban', 'criminal'] },
  { value: 'kidnapping-for-ransom rings', weight: 1, tags: ['criminal', 'urban'] },
  { value: 'aggressive customs/security shakedowns', weight: 1, tags: ['enforcement', 'trade'] },
  { value: 'frequent labor strikes disrupting commerce', weight: 1, tags: ['business-professional'] },
  { value: 'roving bandit raiders', weight: 2, tags: ['frontier', 'wasteland'] },
  { value: 'active blockade runners and smugglers', weight: 1, tags: ['void', 'criminal'] },
  { value: 'oppressive martial law', weight: 2, tags: ['military-paramilitary', 'enforcement'] },
  { value: 'widespread black-market weapon trafficking', weight: 1, tags: ['criminal', 'military'] },
  { value: 'entrenched slaver networks', weight: 1, tags: ['criminal', 'frontier'] },
  { value: 'corrupt local enforcement extorting travelers', weight: 1, tags: ['enforcement', 'criminal'] },
  { value: 'active insurgent cells', weight: 1, tags: ['military-paramilitary', 'frontier'] }
]);
