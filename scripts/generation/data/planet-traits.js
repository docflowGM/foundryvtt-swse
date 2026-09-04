/**
 * PHASE 8D-2 foundation — procedural planet notable-trait pool for
 * `planets/planet-traits.js`. A trait is a short GENERATE-tier flavor
 * fact distinct from a hazard (danger/risk) or a history hook (past
 * event) — it describes something notable about the world AS IT IS NOW.
 *
 * PHASE 8D-3A production expansion: grown from 26 representative
 * entries to a ~120-entry production catalog, covering the five
 * categories the phase spec named — astronomy, geography, environment,
 * civilization, and mystery/history-adjacent traits (a PRESENT-tense
 * notable feature, e.g. "unexplained ruins," is a trait; the actual
 * past EVENT behind it is a `planet-history-hooks.js` concern). No
 * mechanical claims attach to any entry unless a later system
 * independently resolves one -- these stay narrative flavor only.
 */

export const PLANET_TRAITS = Object.freeze([
  // --- original representative entries (unchanged) ---
  { value: 'rich mineral deposits', weight: 3, tags: ['mountain', 'volcanic', 'desert'] },
  { value: 'unusually strong Force presence', weight: 1, tags: ['force-tradition', 'mysterious'] },
  { value: 'strategic hyperspace lane junction', weight: 3, tags: ['trade', 'military-paramilitary'] },
  { value: 'famous for a unique local delicacy or export good', weight: 2, tags: ['trade', 'civilian'] },
  { value: 'home to a distinctive native species', weight: 3, tags: ['community-tribe'] },
  { value: 'known for extreme climate swings', weight: 2, tags: [] },
  { value: 'heavily fortified border world', weight: 2, tags: ['military-paramilitary'] },
  { value: 'famous ancient ruins/archaeological site', weight: 2, tags: ['mysterious', 'desert'] },
  { value: 'a bustling multi-species melting pot', weight: 3, tags: ['urban', 'cosmopolitan'] },
  { value: 'strict local laws/customs unfamiliar to outsiders', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'renowned shipyards', weight: 2, tags: ['urban', 'trade'] },
  { value: 'famous scenic/tourist destination', weight: 1, tags: ['ocean', 'civilian'] },
  { value: 'isolated -- few visitors, insular culture', weight: 3, tags: ['frontier', 'rural'] },
  { value: 'heavy corporate presence and influence', weight: 3, tags: ['business-professional'] },
  { value: 'known criminal safe haven', weight: 2, tags: ['crime-syndicate'] },
  { value: 'strong local pride / distinct regional identity', weight: 2, tags: [] },
  { value: 'notable for its unusual native wildlife', weight: 2, tags: ['jungle', 'forest'] },
  { value: 'religious pilgrimage destination', weight: 1, tags: ['religion'] },
  { value: 'famous underground/subterranean settlements', weight: 1, tags: ['mountain', 'desert'] },
  { value: 'heavily industrialized and polluted', weight: 2, tags: ['urban', 'volcanic'] },
  { value: 'sparse population spread across vast distances', weight: 2, tags: ['frontier'] },
  { value: 'a hotly contested political flashpoint', weight: 2, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'home to a renowned academy or training institution', weight: 1, tags: ['business-professional', 'force-tradition'] },
  { value: 'unusually advanced local technology', weight: 1, tags: ['urban'] },
  { value: 'famously lawless frontier territory', weight: 2, tags: ['frontier', 'crime-syndicate'] },
  { value: 'unremarkable in most respects', weight: 3, tags: [] },

  // --- astronomy ---
  { value: 'twin suns cast double shadows at midday', weight: 2, tags: ['desert', 'arid'] },
  { value: 'orbits an unstable, flickering star', weight: 1, tags: ['mysterious'] },
  { value: 'multiple moons visible in the night sky', weight: 2, tags: [] },
  { value: 'a massive, easily visible ring system', weight: 1, tags: ['mysterious'] },
  { value: 'a captured asteroid serves as an irregular moon', weight: 1, tags: ['asteroid', 'mysterious'] },
  { value: 'unusually bright and frequent auroras', weight: 1, tags: ['polar', 'ice'] },
  { value: 'frequent solar or lunar eclipses', weight: 1, tags: ['mysterious'] },
  { value: 'a binary companion star dominates the horizon', weight: 1, tags: [] },
  { value: 'an unusually short orbital year', weight: 1, tags: [] },
  { value: 'an unusually long, slow orbital year', weight: 1, tags: [] },
  { value: 'tidally locked, with a permanent day and night side', weight: 1, tags: ['mysterious'] },
  { value: 'a visible debris field from an ancient cataclysm still orbits overhead', weight: 1, tags: ['mysterious', 'void'] },

  // --- geography ---
  { value: 'enormous canyon systems visible from orbit', weight: 2, tags: ['desert', 'canyon'] },
  { value: 'floating islands drift over the lowlands', weight: 1, tags: ['mysterious', 'jungle'] },
  { value: 'a planet-spanning mountain range', weight: 2, tags: ['mountain'] },
  { value: 'a shallow global sea covers most of the surface', weight: 1, tags: ['ocean', 'water'] },
  { value: 'vast subterranean continent-scale cave networks', weight: 1, tags: ['cave', 'mountain'] },
  { value: 'giant salt flats stretch to the horizon', weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'vast fungal forests dominate the biosphere', weight: 1, tags: ['fungal', 'jungle'] },
  { value: 'towering megaflora reshapes the local ecosystem', weight: 1, tags: ['jungle', 'forest'] },
  { value: 'a single, world-spanning supercontinent', weight: 1, tags: [] },
  { value: 'countless small archipelagos dot the oceans', weight: 1, tags: ['ocean', 'island'] },
  { value: 'a deep rift valley splits a continent in two', weight: 1, tags: ['canyon', 'mountain'] },
  { value: 'vast glacial fields carve the landscape', weight: 1, tags: ['ice', 'polar'] },
  { value: 'towering natural rock spires dominate the skyline', weight: 1, tags: ['mountain', 'desert'] },
  { value: 'a labyrinth of natural sinkholes riddles the crust', weight: 1, tags: ['sinkhole', 'mysterious'] },
  { value: 'active volcanic peaks reshape the terrain regularly', weight: 1, tags: ['lava', 'volcanic'] },

  // --- environment ---
  { value: 'permanent electrical storms wrack the upper atmosphere', weight: 1, tags: ['storm', 'hazardous'] },
  { value: 'exceptionally long nights strain local ecosystems', weight: 1, tags: [] },
  { value: 'severe tidal cycles reshape the coastline daily', weight: 1, tags: ['ocean', 'coastal'] },
  { value: 'dramatic seasonal atmospheric changes', weight: 1, tags: [] },
  { value: 'periodic radiation storms sweep the surface', weight: 1, tags: ['hazard', 'irradiated'] },
  { value: 'localized magnetic anomalies disrupt instruments', weight: 1, tags: ['mysterious'] },
  { value: 'bioluminescent flora lights the nights', weight: 1, tags: ['jungle', 'swamp'] },
  { value: 'a permanent haze of airborne dust or ash', weight: 1, tags: ['desert', 'volcanic'] },
  { value: 'unusually clear skies famous for stargazing', weight: 1, tags: ['civilian'] },
  { value: 'chronic low-level seismic tremors', weight: 1, tags: ['unstable', 'volcanic'] },
  { value: 'strange atmospheric acoustics carry sound for kilometers', weight: 1, tags: ['mysterious'] },
  { value: 'a thick, ever-present fog blankets the lowlands', weight: 1, tags: ['swamp', 'mysterious'] },

  // --- civilization ---
  { value: 'an abandoned orbital elevator still looms overhead', weight: 1, tags: ['mysterious', 'industrial'] },
  { value: 'a planetwide rail network connects every major settlement', weight: 1, tags: ['trade', 'industrial'] },
  { value: 'the remnants of an ancient terraforming system still function', weight: 1, tags: ['mysterious', 'terraformed'] },
  { value: 'massive orbital shipyards visible from the surface', weight: 2, tags: ['trade', 'shipbuilding'] },
  { value: 'sprawling underground cities shelter most of the population', weight: 1, tags: ['mountain', 'urban'] },
  { value: 'floating settlements drift above hazardous terrain', weight: 1, tags: ['mysterious', 'industrial'] },
  { value: 'a network of sealed arcologies houses the population', weight: 1, tags: ['urban', 'artificial'] },
  { value: 'famous for its distinctive local architecture', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'an extensive network of ancient aqueducts still supplies water', weight: 1, tags: ['rural', 'ancient'] },
  { value: 'a single mega-city dominates the entire landscape', weight: 1, tags: ['urban', 'ecumenopolis'] },
  { value: 'renowned for its public transit and infrastructure', weight: 1, tags: ['urban', 'civilian'] },
  { value: 'home to a famous planetary defense grid', weight: 1, tags: ['military-paramilitary'] },
  { value: 'known for elaborate public art and monuments', weight: 1, tags: ['urban', 'civilian'] },
  { value: 'a strict caste or class system shapes daily life', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'famous for its droid-integrated infrastructure', weight: 1, tags: ['urban', 'industrial'] },

  // --- mystery / history-adjacent (present-tense notable features) ---
  { value: 'unexplained ancient ruins dot the landscape', weight: 2, tags: ['mysterious', 'ancient'] },
  { value: 'home to a small, struggling lost colony', weight: 1, tags: ['frontier', 'mysterious'] },
  { value: 'ancient navigation beacons still broadcast on old frequencies', weight: 1, tags: ['mysterious', 'ancient'] },
  { value: 'a buried megastructure has never been fully excavated', weight: 1, tags: ['mysterious', 'ancient'] },
  { value: 'abandoned planetary defenses still stand, mostly dormant', weight: 1, tags: ['mysterious', 'military-paramilitary'] },
  { value: 'a mysterious no-fly zone that authorities won\'t explain', weight: 1, tags: ['mysterious', 'government-bureaucracy'] },
  { value: 'the fate of a missing archaeological expedition remains unknown', weight: 1, tags: ['mysterious'] },
  { value: 'strange, untranslated inscriptions found throughout the region', weight: 1, tags: ['mysterious', 'ancient'] },
  { value: 'local legends persist about a vanished precursor civilization', weight: 1, tags: ['mysterious', 'ancient'] },
  { value: 'an eerie, permanently empty district no one will settle', weight: 1, tags: ['mysterious', 'urban'] },
  { value: 'strange signal disruptions plague the same region every cycle', weight: 1, tags: ['mysterious'] },
  { value: 'a sealed vault of unknown origin has never been opened', weight: 1, tags: ['mysterious', 'ancient'] },

  // --- flora/fauna and culture (rounding out variety) ---
  { value: 'famous for a unique domesticated beast of burden', weight: 1, tags: ['rural', 'agriculture'] },
  { value: 'home to a globally renowned culinary tradition', weight: 1, tags: ['civilian', 'trade'] },
  { value: 'famous for its textiles and woven goods', weight: 1, tags: ['trade', 'manufacturing'] },
  { value: 'known for a unique local musical or artistic tradition', weight: 1, tags: ['civilian'] },
  { value: 'a distinctive local dialect sets residents apart', weight: 1, tags: [] },
  { value: 'famous for producing skilled pilots', weight: 1, tags: ['military-paramilitary', 'trade'] },
  { value: 'renowned dueling or martial-arts tradition', weight: 1, tags: ['military-paramilitary'] },
  { value: 'famous for its brewers, vintners, or distillers', weight: 1, tags: ['trade', 'civilian'] },
  { value: 'a globally famous sporting tradition', weight: 1, tags: ['civilian'] },
  { value: 'known for elaborate seasonal festivals', weight: 1, tags: ['civilian', 'religion'] },
  { value: 'a strong tradition of craftsmanship and artisanal goods', weight: 1, tags: ['trade', 'civilian'] },
  { value: 'famous for its healers and medical traditions', weight: 1, tags: ['medical'] },
  { value: 'home to a well-regarded shipwright tradition', weight: 1, tags: ['shipbuilding', 'trade'] },
  { value: 'renowned for producing elite soldiers or mercenaries', weight: 1, tags: ['military-paramilitary'] },
  { value: 'famous for a rare, prized gemstone found nowhere else', weight: 1, tags: ['mining', 'trade'] },

  // --- politics / economy flavor (present-tense) ---
  { value: 'divided into rival city-states with an uneasy peace', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'a single powerful corporation dominates local politics', weight: 2, tags: ['business-professional'] },
  { value: 'famous for its independent, stubborn streak', weight: 1, tags: ['frontier'] },
  { value: 'known for welcoming refugees and outsiders', weight: 1, tags: ['community-tribe'] },
  { value: 'notoriously difficult bureaucracy and red tape', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'famous for strict neutrality in galactic conflicts', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'a hotbed of underground political dissent', weight: 1, tags: ['government-bureaucracy', 'crime-syndicate'] },
  { value: 'home to an unusually powerful labor movement', weight: 1, tags: ['business-professional'] },
  { value: 'known for progressive social policies', weight: 1, tags: ['government-bureaucracy', 'civilian'] },
  { value: 'famous for harsh, zealously enforced local law', weight: 1, tags: ['enforcement', 'government-bureaucracy'] },
  { value: 'a thriving black market operates in plain sight', weight: 1, tags: ['criminal', 'trade'] },
  { value: 'known as a haven for smugglers and free traders', weight: 2, tags: ['criminal', 'trade'] },
  { value: 'famous for its shrewd, hard-bargaining merchants', weight: 1, tags: ['trade', 'business-professional'] },
  { value: 'notable for near-total automation of daily labor', weight: 1, tags: ['industrial', 'urban'] },
  { value: 'famous for its skilled slicers and technicians', weight: 1, tags: ['technology', 'criminal'] }
]);
