/**
 * PHASE 8D-2 foundation — settlement-name component pools for
 * `names/settlement-name-generator.js`.
 *
 * Same combinatorial contract as `ship-name-adjectives.js`/`-nouns.js`
 * and `planet-name-syllables.js`: small, reviewable, tagged pools
 * combined at generation time rather than a hand-written list of full
 * settlement names. `SETTLEMENT_NAME_ROOTS` reuses the same short-root
 * flavor as planet names (a settlement is usually named for or after its
 * world) but is kept as its own pool since settlement names skew shorter
 * and more pronounceable than full planet names. `tags` reuse the
 * Location Library's own free-text biome/character vocabulary
 * (`urban`/`rural`/`frontier`/`trade`/`military`/...).
 */

export const SETTLEMENT_NAME_PREFIXES = Object.freeze([
  { value: 'New', weight: 5, tags: ['urban', 'civilian'] },
  { value: 'Port', weight: 4, tags: ['trade', 'coastal'] },
  { value: 'Fort', weight: 4, tags: ['military', 'frontier'] },
  { value: 'Lake', weight: 3, tags: ['rural', 'coastal'] },
  { value: 'North', weight: 3, tags: ['rural', 'frontier'] },
  { value: 'South', weight: 3, tags: ['rural', 'frontier'] },
  { value: 'Old', weight: 3, tags: ['rural', 'mysterious'] },
  { value: 'Outer', weight: 3, tags: ['frontier', 'void'] },
  { value: 'Upper', weight: 2, tags: ['urban', 'mountain'] },
  { value: 'Lower', weight: 2, tags: ['urban', 'trade'] },
  { value: 'West', weight: 2, tags: ['rural', 'frontier'] },
  { value: 'East', weight: 2, tags: ['rural', 'frontier'] }
]);

export const SETTLEMENT_NAME_ROOTS = Object.freeze([
  { value: 'Kal', weight: 3, tags: ['arid', 'trade'] },
  { value: 'Bren', weight: 3, tags: ['rural', 'forest'] },
  { value: 'Ash', weight: 3, tags: ['desert', 'frontier'] },
  { value: 'Ther', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'Mal', weight: 3, tags: ['swamp', 'frontier'] },
  { value: 'Ren', weight: 3, tags: ['rural', 'trade'] },
  { value: 'Sul', weight: 3, tags: ['coastal', 'trade'] },
  { value: 'Tor', weight: 3, tags: ['mountain', 'military'] },
  { value: 'Ver', weight: 3, tags: ['forest', 'rural'] },
  { value: 'Xan', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Cor', weight: 3, tags: ['urban', 'trade'] },
  { value: 'Fen', weight: 3, tags: ['swamp', 'rural'] },
  { value: 'Hal', weight: 3, tags: ['rural', 'civilian'] },
  { value: 'Jov', weight: 3, tags: ['urban', 'trade'] },
  { value: 'Lor', weight: 3, tags: ['forest', 'rural'] },
  { value: 'Mor', weight: 3, tags: ['mountain', 'military'] },
  { value: 'Nal', weight: 3, tags: ['coastal', 'trade'] },
  { value: 'Pol', weight: 3, tags: ['frozen', 'frontier'] },
  { value: 'Rax', weight: 3, tags: ['desert', 'frontier'] },
  { value: 'Sen', weight: 3, tags: ['rural', 'civilian'] },
  { value: 'Trel', weight: 3, tags: ['forest', 'mountain'] },
  { value: 'Val', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'Wyn', weight: 3, tags: ['forest', 'rural'] },
  { value: 'Yar', weight: 3, tags: ['desert', 'frontier'] },
  { value: 'Bok', weight: 3, tags: ['swamp', 'rural'] },
  { value: 'Farr', weight: 3, tags: ['desert', 'trade'] },
  { value: 'Gann', weight: 3, tags: ['mountain', 'rural'] },
  { value: 'Jara', weight: 3, tags: ['rural', 'civilian'] },
  { value: 'Opar', weight: 3, tags: ['desert', 'frontier'] },
  { value: 'Pryn', weight: 3, tags: ['forest', 'rural'] }
]);

export const SETTLEMENT_NAME_SUFFIXES = Object.freeze([
  { value: 'town', weight: 4, tags: ['urban', 'civilian'] },
  { value: 'ford', weight: 3, tags: ['rural', 'coastal'] },
  { value: 'haven', weight: 4, tags: ['trade', 'civilian'] },
  { value: 'reach', weight: 3, tags: ['frontier', 'void'] },
  { value: 'hold', weight: 3, tags: ['military', 'mountain'] },
  { value: 'landing', weight: 4, tags: ['trade', 'frontier'] },
  { value: 'station', weight: 4, tags: ['trade', 'military'] },
  { value: 'city', weight: 4, tags: ['urban', 'trade'] },
  { value: 'post', weight: 3, tags: ['military', 'frontier'] },
  { value: 'watch', weight: 2, tags: ['military', 'mountain'] },
  { value: 'gate', weight: 3, tags: ['trade', 'urban'] },
  { value: 'crossing', weight: 3, tags: ['rural', 'trade'] },
  { value: 'hollow', weight: 2, tags: ['rural', 'forest'] },
  { value: 'ridge', weight: 3, tags: ['mountain', 'rural'] },
  { value: 'wharf', weight: 2, tags: ['coastal', 'trade'] }
]);
