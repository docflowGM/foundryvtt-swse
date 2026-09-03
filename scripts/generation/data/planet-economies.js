/**
 * PHASE 8D-2 foundation — procedural planet economic-focus pool for
 * `planets/planet-economy.js`. Representative catalog (28 entries).
 * `tags` reuse the same free-text biome/character vocabulary as
 * `planet-quality-tables.js`'s `WORLD_CLASS` so an economy can be
 * softly biased to fit an already-rolled world class (e.g. "mining"
 * fits "volcanic"/"barren-rock").
 *
 * `sector` (added in the Phase 8D-2 correction pass) is a short,
 * STABLE identifier for this economy focus, distinct from `value`
 * (the display string, unchanged) -- `data/galactic-commodities.js`'s
 * commodity entries reference these exact slugs in their own
 * `producedBy`/`demandedBy` arrays, so a Trade Resolver
 * (`planets/planet-trade.js`) can match a world's rolled economy
 * sectors against the shared commodity catalog without parsing display
 * strings.
 */

export const PLANET_ECONOMIES = Object.freeze([
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
  { value: 'no meaningful economy', sector: 'none', weight: 2, tags: [] }
]);
