/**
 * PHASE 8D-2 foundation — procedural planet economic-focus pool for
 * `planets/planet-economy.js`. `tags` reuse the same free-text biome/
 * character vocabulary as `planet-quality-tables.js`'s `WORLD_CLASS` so
 * an economy can be softly biased to fit an already-rolled world class
 * (e.g. "mining" fits "volcanic"/"barren-rock").
 *
 * `sector` (added in the Phase 8D-2 correction pass) is a short,
 * STABLE identifier for this economy focus, distinct from `value`
 * (the display string, unchanged) -- `data/galactic-commodities.js`'s
 * commodity entries reference these exact slugs in their own
 * `producedBy`/`demandedBy` arrays, so a Trade Resolver
 * (`planets/planet-trade.js`) can match a world's rolled economy
 * sectors against the shared commodity catalog without parsing display
 * strings.
 *
 * PHASE 8D-3A production expansion: grown from 28 representative
 * entries to a ~62-entry production catalog covering the full spread
 * of sectors the phase spec named. New `sector` slugs introduced here
 * (`entertainment`/`luxury`/`research`/`education`/`salvage`/
 * `security`) are cross-referenced into `data/galactic-commodities.js`'s
 * `producedBy`/`demandedBy` arrays in that same production pass -- no
 * sector exists here with zero matching commodities.
 */

export const PLANET_ECONOMIES = Object.freeze([
  // --- original representative entries (unchanged) ---
  { value: 'agriculture', sector: 'agriculture', weight: 4, tags: ['forest', 'grassland', 'rural'] },
  { value: 'mining', sector: 'mining', weight: 4, tags: ['volcanic', 'mountain', 'desert'] },
  { value: 'manufacturing', sector: 'manufacturing', weight: 3, tags: ['urban', 'trade'] },
  { value: 'trade hub', sector: 'trade', weight: 4, tags: ['urban', 'trade', 'coastal'] },
  { value: 'tourism', sector: 'tourism', weight: 2, tags: ['ocean', 'coastal', 'civilian'] },
  { value: 'black market / smuggling', sector: 'black-market', weight: 3, tags: ['criminal', 'trade'] },
  { value: 'military-industrial', sector: 'military-industrial', weight: 2, tags: ['military', 'urban'] },
  { value: 'technology / research', sector: 'technology', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'subsistence farming', sector: 'agriculture', weight: 3, tags: ['rural', 'frontier'] },
  { value: 'energy production', sector: 'energy', weight: 2, tags: ['volcanic', 'void'] },
  { value: 'fishing / aquaculture', sector: 'agriculture', weight: 2, tags: ['ocean', 'coastal'] },
  { value: 'starship repair / salvage', sector: 'shipbuilding', weight: 2, tags: ['urban', 'trade'] },
  { value: 'spice trade', sector: 'spice', weight: 2, tags: ['criminal', 'trade'] },
  { value: 'bacta / medical production', sector: 'medical', weight: 1, tags: ['swamp', 'jungle'] },
  { value: 'shipbuilding', sector: 'shipbuilding', weight: 2, tags: ['urban', 'trade'] },
  { value: 'livestock ranching', sector: 'agriculture', weight: 2, tags: ['grassland', 'rural'] },
  { value: 'gemstone / mineral export', sector: 'mining', weight: 2, tags: ['mountain', 'desert'] },
  { value: 'refugee resettlement economy', sector: 'none', weight: 1, tags: ['frontier', 'rural'] },
  { value: 'pilgrimage / religious tourism', sector: 'tourism', weight: 1, tags: ['religion', 'civilian'] },
  { value: 'droid manufacturing', sector: 'droids', weight: 2, tags: ['urban', 'trade'] },
  { value: 'weapons manufacturing', sector: 'military-industrial', weight: 2, tags: ['military', 'urban'] },
  { value: 'gas harvesting', sector: 'energy', weight: 1, tags: ['void', 'mysterious'] },
  { value: 'logging / lumber', sector: 'agriculture', weight: 2, tags: ['forest', 'jungle'] },
  { value: 'textiles', sector: 'manufacturing', weight: 1, tags: ['rural', 'urban'] },
  { value: 'financial services', sector: 'financial-services', weight: 2, tags: ['urban', 'trade'] },
  { value: 'archaeological / relic trade', sector: 'cultural', weight: 1, tags: ['desert', 'mysterious'] },
  { value: 'penal / labor colony economy', sector: 'none', weight: 1, tags: ['frontier', 'military'] },
  { value: 'no meaningful economy', sector: 'none', weight: 2, tags: [] },

  // --- extraction / raw materials ---
  { value: 'rare-mineral extraction', sector: 'mining', weight: 1, tags: ['mountain', 'desert'] },
  { value: 'deep-crust mining', sector: 'mining', weight: 1, tags: ['mountain', 'volcanic'] },
  { value: 'gas extraction', sector: 'energy', weight: 2, tags: ['gas-giant', 'void'] },
  { value: 'fuel production', sector: 'energy', weight: 2, tags: ['volcanic', 'industrial'] },
  { value: 'geothermal power', sector: 'energy', weight: 1, tags: ['volcanic', 'lava'] },
  { value: 'solar power', sector: 'energy', weight: 1, tags: ['desert', 'space'] },

  // --- industry / manufacturing ---
  { value: 'heavy industry', sector: 'manufacturing', weight: 3, tags: ['urban', 'industrial'] },
  { value: 'starfighter manufacturing', sector: 'military-industrial', weight: 1, tags: ['urban', 'shipbuilding'] },
  { value: 'vehicle manufacturing', sector: 'manufacturing', weight: 2, tags: ['urban', 'industrial'] },
  { value: 'electronics manufacturing', sector: 'technology', weight: 2, tags: ['urban', 'technology'] },
  { value: 'salvage and scrap processing', sector: 'salvage', weight: 2, tags: ['frontier', 'industrial'] },
  { value: 'recycling and reclamation', sector: 'salvage', weight: 1, tags: ['urban', 'industrial'] },

  // --- trade / logistics / finance ---
  { value: 'shipping and freight', sector: 'trade', weight: 3, tags: ['urban', 'trade'] },
  { value: 'logistics hub', sector: 'trade', weight: 2, tags: ['urban', 'trade'] },
  { value: 'banking', sector: 'financial-services', weight: 2, tags: ['urban', 'trade'] },

  // --- tourism / entertainment / luxury ---
  { value: 'gambling and casinos', sector: 'entertainment', weight: 1, tags: ['urban', 'tourism'] },
  { value: 'entertainment industry', sector: 'entertainment', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'luxury goods production', sector: 'luxury', weight: 1, tags: ['urban', 'noble-house'] },

  // --- technology / research / medicine ---
  { value: 'scientific research', sector: 'research', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'biotechnology', sector: 'medical', weight: 1, tags: ['urban', 'technology'] },
  { value: 'general medicine', sector: 'medical', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'cloning technology', sector: 'medical', weight: 1, tags: ['urban', 'mysterious'] },
  { value: 'education and academia', sector: 'education', weight: 1, tags: ['urban', 'civilian'] },

  // --- military / security ---
  { value: 'military services', sector: 'military-industrial', weight: 1, tags: ['military', 'urban'] },
  { value: 'mercenary services', sector: 'military-industrial', weight: 1, tags: ['military', 'frontier'] },
  { value: 'private security services', sector: 'security', weight: 1, tags: ['urban', 'enforcement'] },

  // --- culture / heritage ---
  { value: 'archaeology and heritage tourism', sector: 'cultural', weight: 1, tags: ['desert', 'mysterious'] },
  { value: 'art and culture', sector: 'cultural', weight: 1, tags: ['urban', 'civilian'] },

  // --- rounding out coverage ---
  { value: 'subsistence economy', sector: 'agriculture', weight: 2, tags: ['rural', 'frontier'] },
  { value: 'droid parts and components trade', sector: 'droids', weight: 1, tags: ['urban', 'trade'] },
  { value: 'shipwrighting and repair services', sector: 'shipbuilding', weight: 1, tags: ['urban', 'trade'] },
  { value: 'agrotechnology and seed production', sector: 'agriculture', weight: 1, tags: ['rural', 'technology'] },
  { value: 'starport services', sector: 'trade', weight: 2, tags: ['urban', 'trade'] }
]);
