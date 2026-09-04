/**
 * PHASE 8D-2 foundation — procedural POI (point-of-interest) template
 * pool for `planets/poi-template.js`. Representative catalog (34
 * entries) — establishing the shape and a genuinely usable starting
 * set, not the full ~150-250 target the wider design discussion
 * mentioned; expanding this list later never requires touching any
 * generator code, only this data file.
 *
 * `type` uses the SAME canonical vocabulary
 * `location-registry-service.js`'s own `LOCATION_TYPES` defines
 * (`poi`/`region`/`base`/`temple`/`facility`/`city`/...) rather than
 * defaulting almost everything to generic `poi` -- a Temple is `temple`
 * (the canonical type is literally labeled "Temple / Ruin", which is
 * also why Ruins uses it), a Military Outpost or a criminal Hideout is
 * `base` ("Base / Safehouse"), an installation like a Research
 * Facility/Mine/Prison/Shipyard/Processing Plant is `facility`, and an
 * actual settlement (a Fishing Village) is `city`.
 *
 * CORRECTED (Phase 8D-2 independent review, round 2): `tags` previously
 * mixed genuine biome/terrain words ("mountain", "desert", "urban")
 * with organization-family/thematic descriptors ("criminal", "trade",
 * "military-paramilitary", "government-bureaucracy",
 * "business-professional") and was written straight into a POI draft's
 * canonical `biomes` field -- the SAME single-source-of-truth violation
 * the planet `WORLD_CLASS` biome fix (round 1) corrected, just not yet
 * applied here. Each entry now carries:
 *
 *  - `biomeAffinities`: ONLY values drawn from the real, curated
 *    `LOCATION_LIBRARY_BIOMES` vocabulary (`location-library-seeds.js`)
 *    -- the sole biome authority, exactly like a planet's
 *    `worldClass.biomes`.
 *  - `tags`: procedural-only descriptors (organization families,
 *    flavor words not in the real vocabulary) -- soft-preference
 *    weighting only, never written into a draft's `biomes` directly.
 *
 * CORRECTED (round 3): round 2 fixed the VOCABULARY (every value real)
 * but not the SEMANTICS -- `createProceduralPoiDraft()` still wrote a
 * template's ENTIRE `biomes` list into the draft's `biomes` field
 * verbatim, so e.g. `ruins` (affinity `['desert', 'jungle']`) declared
 * BOTH biomes simultaneously even on an ice-world parent that has
 * neither. Renamed `biomes` -> `biomeAffinities` to make the field's
 * actual meaning explicit -- "where this KIND of POI is plausible,"
 * never "what biome this SPECIFIC generated POI actually has." A
 * template with an empty `biomeAffinities` (Temple, Prison, Research
 * Facility, ...) is an installation whose environment doesn't depend
 * on outdoor terrain -- correctly contributing nothing either way.
 * `planets/poi-generator.js` derives the actual per-draft `biomes` as
 * the intersection of `biomeAffinities` with the PARENT planet's real
 * biomes when a parent is known (see that file for the derivation and
 * the indoor-installation case).
 *
 * `requiredPlanetTags`/`excludedPlanetTags`/`populationRequirements`/
 * `economyTags`/`governmentTags` (added in round 1) are unchanged by
 * this split; `poi-template.js`'s picker now matches soft preference
 * against `biomeAffinities`+`tags`+`economyTags`+`governmentTags`
 * together (see that file), so `economyTags`/`governmentTags` actually
 * influence selection instead of being dead metadata:
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
 *    mechanism as `tags`/`biomes`, just named for what they match
 *    against) -- never a hard filter, unlike the three fields above.
 */

import { isLocationLibraryBiome } from '../../locations/location-library-seeds.js';

const POPULATED = Object.freeze(['outpost', 'small-settlement', 'settled', 'populous', 'hyper-urbanized']);
const SETTLED_PLUS = Object.freeze(['small-settlement', 'settled', 'populous', 'hyper-urbanized']);
const URBAN_PLUS = Object.freeze(['settled', 'populous', 'hyper-urbanized']);

export const POI_TEMPLATES = Object.freeze([
  { value: 'cantina', label: 'Cantina', weight: 5, type: 'poi', biomeAffinities: ['urban'], tags: ['civilian', 'criminal', 'trade'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['trade', 'black-market'], governmentTags: [] },
  { value: 'market-district', label: 'Market', weight: 4, type: 'region', biomeAffinities: ['urban'], tags: ['trade', 'civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['trade', 'agriculture'], governmentTags: [] },
  { value: 'starport', label: 'Starport', weight: 4, type: 'facility', biomeAffinities: ['urban'], tags: ['trade', 'void'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['trade', 'shipbuilding'], governmentTags: [] },
  { value: 'ruins', label: 'Ruins', weight: 3, type: 'temple', biomeAffinities: ['desert', 'jungle'], tags: ['mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: [] },
  { value: 'military-outpost', label: 'Outpost', weight: 4, type: 'base', biomeAffinities: ['frontier'], tags: ['military-paramilitary'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['military-industrial'], governmentTags: ['military-paramilitary'] },
  { value: 'residential-district', label: 'District', weight: 3, type: 'region', biomeAffinities: ['urban'], tags: ['civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: [], governmentTags: [] },
  { value: 'temple', label: 'Temple', weight: 2, type: 'temple', biomeAffinities: [], tags: ['religion', 'force-tradition', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['religion'] },
  { value: 'mine', label: 'Mine', weight: 4, type: 'facility', biomeAffinities: ['mountain', 'desert'], tags: ['volcanic', 'business-professional'], requiredPlanetTags: [], excludedPlanetTags: ['gas', 'space'], populationRequirements: POPULATED, economyTags: ['mining'], governmentTags: [] },
  { value: 'junkyard', label: 'Junkyard', weight: 2, type: 'poi', biomeAffinities: ['urban', 'frontier'], tags: ['criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['black-market'], governmentTags: [] },
  { value: 'warehouse-district', label: 'Warehouses', weight: 3, type: 'region', biomeAffinities: ['urban'], tags: ['trade', 'criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['trade', 'manufacturing'], governmentTags: [] },
  { value: 'prison', label: 'Prison', weight: 2, type: 'facility', biomeAffinities: [], tags: ['enforcement', 'military-paramilitary'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: [], governmentTags: ['enforcement', 'government-bureaucracy'] },
  { value: 'research-facility', label: 'Research Facility', weight: 2, type: 'facility', biomeAffinities: ['urban'], tags: ['business-professional'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['technology'], governmentTags: [] },
  { value: 'smugglers-den', label: "Smugglers' Den", weight: 3, type: 'poi', biomeAffinities: ['frontier'], tags: ['criminal', 'void'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['black-market', 'spice'], governmentTags: [] },
  { value: 'farmstead', label: 'Farm', weight: 3, type: 'poi', biomeAffinities: ['rural', 'grassland', 'forest'], tags: [], requiredPlanetTags: [], excludedPlanetTags: ['gas', 'space', 'asteroid', 'lava'], populationRequirements: SETTLED_PLUS, economyTags: ['agriculture'], governmentTags: [] },
  { value: 'medical-clinic', label: 'Clinic', weight: 2, type: 'facility', biomeAffinities: ['urban'], tags: ['civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['medical'], governmentTags: [] },
  { value: 'black-market-bazaar', label: 'Bazaar', weight: 3, type: 'poi', biomeAffinities: ['urban'], tags: ['criminal', 'trade'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['black-market', 'trade'], governmentTags: [] },
  { value: 'shrine', label: 'Shrine', weight: 1, type: 'temple', biomeAffinities: [], tags: ['religion', 'community-tribe'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['religion'] },
  { value: 'training-ground', label: 'Training Grounds', weight: 2, type: 'facility', biomeAffinities: [], tags: ['military-paramilitary', 'force-tradition'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['military-paramilitary'] },
  { value: 'refugee-camp', label: 'Refugee Camp', weight: 2, type: 'poi', biomeAffinities: ['frontier'], tags: ['community-tribe'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: [], governmentTags: [] },
  { value: 'cantina-district', label: 'Entertainment District', weight: 2, type: 'region', biomeAffinities: ['urban'], tags: ['trade', 'criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: URBAN_PLUS, economyTags: ['tourism', 'black-market'], governmentTags: [] },
  { value: 'shipyard', label: 'Shipyard', weight: 3, type: 'facility', biomeAffinities: ['urban'], tags: ['trade', 'business-professional'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['shipbuilding'], governmentTags: [] },
  { value: 'fishing-village', label: 'Fishing Village', weight: 2, type: 'city', biomeAffinities: ['rural'], tags: ['ocean', 'coastal'], requiredPlanetTags: ['water'], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: ['agriculture'], governmentTags: [] },
  { value: 'noble-estate', label: 'Estate', weight: 2, type: 'poi', biomeAffinities: [], tags: ['noble-house', 'civilian'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: SETTLED_PLUS, economyTags: [], governmentTags: ['noble-house'] },
  { value: 'government-complex', label: 'Government Complex', weight: 3, type: 'facility', biomeAffinities: ['urban'], tags: ['government-bureaucracy'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: URBAN_PLUS, economyTags: ['financial-services'], governmentTags: ['government-bureaucracy'] },
  { value: 'trading-post', label: 'Trading Post', weight: 3, type: 'poi', biomeAffinities: ['frontier'], tags: ['trade'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['trade'], governmentTags: [] },
  { value: 'sensor-array', label: 'Sensor Array', weight: 1, type: 'facility', biomeAffinities: [], tags: ['military-paramilitary', 'void'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['military-paramilitary'] },
  { value: 'crime-lord-hideout', label: 'Hideout', weight: 2, type: 'base', biomeAffinities: [], tags: ['criminal', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['black-market'], governmentTags: [] },
  { value: 'cave-network', label: 'Caves', weight: 2, type: 'poi', biomeAffinities: ['mountain'], tags: ['mysterious'], requiredPlanetTags: [], excludedPlanetTags: ['gas', 'space'], populationRequirements: [], economyTags: [], governmentTags: [] },
  { value: 'processing-plant', label: 'Processing Plant', weight: 2, type: 'facility', biomeAffinities: [], tags: ['business-professional', 'volcanic'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: ['mining', 'manufacturing'], governmentTags: [] },
  { value: 'monastery', label: 'Monastery', weight: 1, type: 'temple', biomeAffinities: [], tags: ['religion', 'force-tradition'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: ['religion', 'force-tradition'] },
  { value: 'checkpoint', label: 'Checkpoint', weight: 3, type: 'poi', biomeAffinities: [], tags: ['enforcement', 'military-paramilitary'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: POPULATED, economyTags: [], governmentTags: ['enforcement'] },
  { value: 'archive', label: 'Archive', weight: 1, type: 'facility', biomeAffinities: [], tags: ['business-professional', 'mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: ['technology'], governmentTags: [] },
  { value: 'entertainment-arena', label: 'Arena', weight: 2, type: 'poi', biomeAffinities: ['urban'], tags: ['civilian', 'criminal'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: URBAN_PLUS, economyTags: ['tourism'], governmentTags: [] },
  { value: 'derelict-facility', label: 'Derelict Facility', weight: 2, type: 'facility', biomeAffinities: ['frontier'], tags: ['mysterious'], requiredPlanetTags: [], excludedPlanetTags: [], populationRequirements: [], economyTags: [], governmentTags: [] }
]);

// Self-check at module load: every POI_TEMPLATES.biomeAffinities entry
// must be a real Library biome value -- the same discipline
// `planet-quality-tables.js`'s WORLD_CLASS.biomes self-check enforces.
// Throws immediately (not a silent runtime surprise) if this table and
// the Library's vocabulary ever drift.
for (const entry of POI_TEMPLATES) {
  for (const biome of entry.biomeAffinities) {
    if (!isLocationLibraryBiome(biome)) {
      throw new Error(`poi-templates.js: POI_TEMPLATES entry "${entry.value}" declares biomeAffinities "${biome}", which is not a real LOCATION_LIBRARY_BIOMES value`);
    }
  }
}
