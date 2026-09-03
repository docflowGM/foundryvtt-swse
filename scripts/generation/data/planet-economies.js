/**
 * PHASE 8D-2 foundation — procedural planet economic-focus pool for
 * `planets/planet-economy.js`. Representative catalog (28 entries).
 * `tags` reuse the same free-text biome/character vocabulary as
 * `planet-quality-tables.js`'s `WORLD_CLASS` so an economy can be
 * softly biased to fit an already-rolled world class (e.g. "mining"
 * fits "volcanic"/"barren-rock").
 */

export const PLANET_ECONOMIES = Object.freeze([
  { value: 'agriculture', weight: 4, tags: ['forest', 'grassland', 'rural'] },
  { value: 'mining', weight: 4, tags: ['volcanic', 'mountain', 'desert'] },
  { value: 'manufacturing', weight: 3, tags: ['urban', 'trade'] },
  { value: 'trade hub', weight: 4, tags: ['urban', 'trade', 'coastal'] },
  { value: 'tourism', weight: 2, tags: ['ocean', 'coastal', 'civilian'] },
  { value: 'black market / smuggling', weight: 3, tags: ['criminal', 'trade'] },
  { value: 'military-industrial', weight: 2, tags: ['military', 'urban'] },
  { value: 'technology / research', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'subsistence farming', weight: 3, tags: ['rural', 'frontier'] },
  { value: 'energy production', weight: 2, tags: ['volcanic', 'void'] },
  { value: 'fishing / aquaculture', weight: 2, tags: ['ocean', 'coastal'] },
  { value: 'starship repair / salvage', weight: 2, tags: ['urban', 'trade'] },
  { value: 'spice trade', weight: 2, tags: ['criminal', 'trade'] },
  { value: 'bacta / medical production', weight: 1, tags: ['swamp', 'jungle'] },
  { value: 'shipbuilding', weight: 2, tags: ['urban', 'trade'] },
  { value: 'livestock ranching', weight: 2, tags: ['grassland', 'rural'] },
  { value: 'gemstone / mineral export', weight: 2, tags: ['mountain', 'desert'] },
  { value: 'refugee resettlement economy', weight: 1, tags: ['frontier', 'rural'] },
  { value: 'pilgrimage / religious tourism', weight: 1, tags: ['religion', 'civilian'] },
  { value: 'droid manufacturing', weight: 2, tags: ['urban', 'trade'] },
  { value: 'weapons manufacturing', weight: 2, tags: ['military', 'urban'] },
  { value: 'gas harvesting', weight: 1, tags: ['void', 'mysterious'] },
  { value: 'logging / lumber', weight: 2, tags: ['forest', 'jungle'] },
  { value: 'textiles', weight: 1, tags: ['rural', 'urban'] },
  { value: 'financial services', weight: 2, tags: ['urban', 'trade'] },
  { value: 'archaeological / relic trade', weight: 1, tags: ['desert', 'mysterious'] },
  { value: 'penal / labor colony economy', weight: 1, tags: ['frontier', 'military'] },
  { value: 'no meaningful economy', weight: 2, tags: [] }
]);
