/**
 * PHASE 8D-2 foundation — procedural POI (point-of-interest) template
 * pool for `planets/poi-template.js`. Representative catalog (34
 * entries) — establishing the shape and a genuinely usable starting
 * set, not the full ~150-250 target the wider design discussion
 * mentioned; expanding this list later never requires touching any
 * generator code, only this data file.
 *
 * Each entry's `type` matches the same free-text vocabulary
 * `location-library-seeds.js` already uses for its own child POIs
 * (`"poi"`/`"region"`), and `tags` reuse the shared free-text biome/
 * economy/organization-family vocabulary so a POI can be softly biased
 * to fit its parent planet's world class, economy, and government
 * (contextual weighting — see `poi-generator.js`).
 *
 * CORRECTED (Phase 8D-2 independent review, round 1): `tags` alone
 * could only ever make an incompatible combination LESS likely, never
 * actually excluded (the review's own example: "uninhabited barren
 * world -> Market District" could only be soft-deprioritized, not
 * diagnosed/excluded). Four new fields give `poi-generator.js` a HARD
 * filter to work with, on top of the existing soft `tags` preference:
 *
 *  - `requiredPlanetTags`: the parent planet's biomes+tags must
 *    contain ALL of these (empty = no requirement).
 *  - `excludedPlanetTags`: the parent planet's biomes+tags must
 *    contain NONE of these (empty = no exclusion).
 *  - `populationRequirements`: the parent planet's `populationScale`
 *    (`planets/planet-population.js`) must be one of these values
 *    (empty = any scale, including `uninhabited`, is fine -- true for
 *    e.g. `ruins`/`cave-network`, which make perfect sense on an
 *    uninhabited world). A POI implying active population (a market,
 *    a cantina, a government complex, ...) instead lists the scales
 *    that make sense for it.
 *  - `economyTags`/`governmentTags`: SOFT preference bonuses (same
 *    mechanism as `tags`, just named for what they match against) --
 *    never a hard filter, unlike the three fields above.
 */

const POPULATED = Object.freeze(['outpost', 'small-settlement', 'settled', 'populous', 'hyper-urbanized']);
const SETTLED_PLUS = Object.freeze(['small-settlement', 'settled', 'populous', 'hyper-urbanized']);
const URBAN_PLUS = Object.freeze(['settled', 'populous', 'hyper-urbanized']);

export const POI_TEMPLATES = Object.freeze([
  { value: 'cantina', label: 'Cantina', weight: 5, type: 'poi', tags: ['urban', 'civilian', 'criminal', 'trade'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['trade', 'black-market'], governmentTags: [] },
  { value: 'market-district', label: 'Market', weight: 4, type: 'region', tags: ['urban', 'trade', 'civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['trade', 'agriculture'], governmentTags: [] },
  { value: 'starport', label: 'Starport', weight: 4, type: 'poi', tags: ['urban', 'trade', 'void'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['trade', 'shipbuilding'], governmentTags: [] },
  { value: 'ruins', label: 'Ruins', weight: 3, type: 'poi', tags: ['mysterious', 'desert', 'jungle'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: [] },
  { value: 'military-outpost', label: 'Outpost', weight: 4, type: 'poi', tags: ['military-paramilitary', 'frontier'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['military-industrial'], governmentTags: ['military-paramilitary'] },
  { value: 'residential-district', label: 'District', weight: 3, type: 'region', tags: ['urban', 'civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: [], governmentTags: [] },
  { value: 'temple', label: 'Temple', weight: 2, type: 'poi', tags: ['religion', 'force-tradition', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['religion'] },
  { value: 'mine', label: 'Mine', weight: 4, type: 'poi', tags: ['mountain', 'volcanic', 'desert', 'business-professional'], requiredPlanetTags: [], excludedPlanetTags: ['gas', 'space'], populationRequirements: POPULATED, economyTags: ['mining'], governmentTags: [] },
  { value: 'junkyard', label: 'Junkyard', weight: 2, type: 'poi', tags: ['urban', 'criminal', 'frontier'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['black-market'], governmentTags: [] },
  { value: 'warehouse-district', label: 'Warehouses', weight: 3, type: 'region', tags: ['urban', 'trade', 'criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['trade', 'manufacturing'], governmentTags: [] },
  { value: 'prison', label: 'Prison', weight: 2, type: 'poi', tags: ['enforcement', 'military-paramilitary'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: [], governmentTags: ['enforcement', 'government-bureaucracy'] },
  { value: 'research-facility', label: 'Research Facility', weight: 2, type: 'poi', tags: ['business-professional', 'urban'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['technology'], governmentTags: [] },
  { value: 'smugglers-den', label: "Smugglers' Den", weight: 3, type: 'poi', tags: ['criminal', 'frontier', 'void'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['black-market', 'spice'], governmentTags: [] },
  { value: 'farmstead', label: 'Farm', weight: 3, type: 'poi', tags: ['rural', 'grassland', 'forest'], requiredPlanetTags: [], excludedPlanetTags: ['gas', 'space', 'asteroid', 'lava'], populationRequirements: SETTLED_PLUS, economyTags: ['agriculture'], governmentTags: [] },
  { value: 'medical-clinic', label: 'Clinic', weight: 2, type: 'poi', tags: ['urban', 'civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['medical'], governmentTags: [] },
  { value: 'black-market-bazaar', label: 'Bazaar', weight: 3, type: 'poi', tags: ['criminal', 'trade', 'urban'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['black-market', 'trade'], governmentTags: [] },
  { value: 'shrine', label: 'Shrine', weight: 1, type: 'poi', tags: ['religion', 'community-tribe'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['religion'] },
  { value: 'training-ground', label: 'Training Grounds', weight: 2, type: 'poi', tags: ['military-paramilitary', 'force-tradition'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['military-paramilitary'] },
  { value: 'refugee-camp', label: 'Refugee Camp', weight: 2, type: 'poi', tags: ['frontier', 'community-tribe'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: [], governmentTags: [] },
  { value: 'cantina-district', label: 'Entertainment District', weight: 2, type: 'region', tags: ['urban', 'trade', 'criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: URBAN_PLUS, economyTags: ['tourism', 'black-market'], governmentTags: [] },
  { value: 'shipyard', label: 'Shipyard', weight: 3, type: 'poi', tags: ['urban', 'trade', 'business-professional'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['shipbuilding'], governmentTags: [] },
  { value: 'fishing-village', label: 'Fishing Village', weight: 2, type: 'poi', tags: ['ocean', 'coastal', 'rural'], requiredPlanetTags: ['water'], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['agriculture'], governmentTags: [] },
  { value: 'noble-estate', label: 'Estate', weight: 2, type: 'poi', tags: ['noble-house', 'civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: [], governmentTags: ['noble-house'] },
  { value: 'government-complex', label: 'Government Complex', weight: 3, type: 'poi', tags: ['government-bureaucracy', 'urban'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: URBAN_PLUS, economyTags: ['financial-services'], governmentTags: ['government-bureaucracy'] },
  { value: 'trading-post', label: 'Trading Post', weight: 3, type: 'poi', tags: ['trade', 'frontier'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['trade'], governmentTags: [] },
  { value: 'sensor-array', label: 'Sensor Array', weight: 1, type: 'poi', tags: ['military-paramilitary', 'void'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['military-paramilitary'] },
  { value: 'crime-lord-hideout', label: 'Hideout', weight: 2, type: 'poi', tags: ['criminal', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['black-market'], governmentTags: [] },
  { value: 'cave-network', label: 'Caves', weight: 2, type: 'poi', tags: ['mountain', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: ['gas', 'space'], populationRequirements: [], economyTags: [], governmentTags: [] },
  { value: 'processing-plant', label: 'Processing Plant', weight: 2, type: 'poi', tags: ['business-professional', 'volcanic'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['mining', 'manufacturing'], governmentTags: [] },
  { value: 'monastery', label: 'Monastery', weight: 1, type: 'poi', tags: ['religion', 'force-tradition'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['religion', 'force-tradition'] },
  { value: 'checkpoint', label: 'Checkpoint', weight: 3, type: 'poi', tags: ['enforcement', 'military-paramilitary'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: [], governmentTags: ['enforcement'] },
  { value: 'archive', label: 'Archive', weight: 1, type: 'poi', tags: ['business-professional', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['technology'], governmentTags: [] },
  { value: 'entertainment-arena', label: 'Arena', weight: 2, type: 'poi', tags: ['urban', 'civilian', 'criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: URBAN_PLUS, economyTags: ['tourism'], governmentTags: [] },
  { value: 'derelict-facility', label: 'Derelict Facility', weight: 2, type: 'poi', tags: ['frontier', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: [] }
]);
