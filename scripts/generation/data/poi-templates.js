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
 */

export const POI_TEMPLATES = Object.freeze([
  { value: 'cantina', label: 'Cantina', weight: 5, type: 'poi', tags: ['urban', 'civilian', 'criminal', 'trade'] },
  { value: 'market-district', label: 'Market', weight: 4, type: 'region', tags: ['urban', 'trade', 'civilian'] },
  { value: 'starport', label: 'Starport', weight: 4, type: 'poi', tags: ['urban', 'trade', 'void'] },
  { value: 'ruins', label: 'Ruins', weight: 3, type: 'poi', tags: ['mysterious', 'desert', 'jungle'] },
  { value: 'military-outpost', label: 'Outpost', weight: 4, type: 'poi', tags: ['military-paramilitary', 'frontier'] },
  { value: 'residential-district', label: 'District', weight: 3, type: 'region', tags: ['urban', 'civilian'] },
  { value: 'temple', label: 'Temple', weight: 2, type: 'poi', tags: ['religion', 'force-tradition', 'mysterious'] },
  { value: 'mine', label: 'Mine', weight: 4, type: 'poi', tags: ['mountain', 'volcanic', 'desert', 'business-professional'] },
  { value: 'junkyard', label: 'Junkyard', weight: 2, type: 'poi', tags: ['urban', 'criminal', 'frontier'] },
  { value: 'warehouse-district', label: 'Warehouses', weight: 3, type: 'region', tags: ['urban', 'trade', 'criminal'] },
  { value: 'prison', label: 'Prison', weight: 2, type: 'poi', tags: ['enforcement', 'military-paramilitary'] },
  { value: 'research-facility', label: 'Research Facility', weight: 2, type: 'poi', tags: ['business-professional', 'urban'] },
  { value: 'smugglers-den', label: "Smugglers' Den", weight: 3, type: 'poi', tags: ['criminal', 'frontier', 'void'] },
  { value: 'farmstead', label: 'Farm', weight: 3, type: 'poi', tags: ['rural', 'grassland', 'forest'] },
  { value: 'medical-clinic', label: 'Clinic', weight: 2, type: 'poi', tags: ['urban', 'civilian'] },
  { value: 'black-market-bazaar', label: 'Bazaar', weight: 3, type: 'poi', tags: ['criminal', 'trade', 'urban'] },
  { value: 'shrine', label: 'Shrine', weight: 1, type: 'poi', tags: ['religion', 'community-tribe'] },
  { value: 'training-ground', label: 'Training Grounds', weight: 2, type: 'poi', tags: ['military-paramilitary', 'force-tradition'] },
  { value: 'refugee-camp', label: 'Refugee Camp', weight: 2, type: 'poi', tags: ['frontier', 'community-tribe'] },
  { value: 'cantina-district', label: 'Entertainment District', weight: 2, type: 'region', tags: ['urban', 'trade', 'criminal'] },
  { value: 'shipyard', label: 'Shipyard', weight: 3, type: 'poi', tags: ['urban', 'trade', 'business-professional'] },
  { value: 'fishing-village', label: 'Fishing Village', weight: 2, type: 'poi', tags: ['ocean', 'coastal', 'rural'] },
  { value: 'noble-estate', label: 'Estate', weight: 2, type: 'poi', tags: ['noble-house', 'civilian'] },
  { value: 'government-complex', label: 'Government Complex', weight: 3, type: 'poi', tags: ['government-bureaucracy', 'urban'] },
  { value: 'trading-post', label: 'Trading Post', weight: 3, type: 'poi', tags: ['trade', 'frontier'] },
  { value: 'sensor-array', label: 'Sensor Array', weight: 1, type: 'poi', tags: ['military-paramilitary', 'void'] },
  { value: 'crime-lord-hideout', label: 'Hideout', weight: 2, type: 'poi', tags: ['criminal', 'mysterious'] },
  { value: 'cave-network', label: 'Caves', weight: 2, type: 'poi', tags: ['mountain', 'mysterious'] },
  { value: 'processing-plant', label: 'Processing Plant', weight: 2, type: 'poi', tags: ['business-professional', 'volcanic'] },
  { value: 'monastery', label: 'Monastery', weight: 1, type: 'poi', tags: ['religion', 'force-tradition'] },
  { value: 'checkpoint', label: 'Checkpoint', weight: 3, type: 'poi', tags: ['enforcement', 'military-paramilitary'] },
  { value: 'archive', label: 'Archive', weight: 1, type: 'poi', tags: ['business-professional', 'mysterious'] },
  { value: 'entertainment-arena', label: 'Arena', weight: 2, type: 'poi', tags: ['urban', 'civilian', 'criminal'] },
  { value: 'derelict-facility', label: 'Derelict Facility', weight: 2, type: 'poi', tags: ['frontier', 'mysterious'] }
]);
