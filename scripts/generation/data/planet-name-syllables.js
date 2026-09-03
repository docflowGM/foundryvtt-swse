/**
 * PHASE 8D-2 foundation — planet-name syllable pools for
 * `names/planet-name-generator.js`.
 *
 * Confirmed by reconnaissance: this repo has no existing procedural
 * planet-name generator. `location-library-seeds.js` (Phase 8D-1's
 * existing, curated Location Library) hand-writes real names for its
 * ~30 known worlds (Dantooine, Tatooine, ...) — that pool is for KNOWN
 * worlds and stays untouched. This is a SEPARATE, procedural pool for
 * brand-new fictional worlds (`GENERATE_NEW_PLANET*` modes), built the
 * same combinatorial way as `ship-name-adjectives.js`/`-nouns.js`: a
 * small hand-curated set of PREFIX + SUFFIX syllables (each tagged with
 * a biome affinity reusing the Location Library's own free-text biome
 * vocabulary, e.g. "desert"/"forest"/"ice") combined at generation time,
 * rather than a hand-written list of ~500 full names. ~55 prefixes x
 * ~50 suffixes already yields 2,750+ unique combinations from a
 * reviewable, representative pool — deliberately not a giant unreviewed
 * data dump.
 */

export const PLANET_NAME_PREFIXES = Object.freeze([
  { value: 'Kal', weight: 3, tags: ['arid', 'desert'] },
  { value: 'Vor', weight: 3, tags: ['volcanic', 'mountain'] },
  { value: 'Zeth', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'Bren', weight: 3, tags: ['forest', 'grassland'] },
  { value: 'Dra', weight: 3, tags: ['volcanic', 'aggressive'] },
  { value: 'Il', weight: 2, tags: ['frozen', 'ice'] },
  { value: 'Ny', weight: 2, tags: ['ocean', 'aquatic'] },
  { value: 'Ash', weight: 3, tags: ['desert', 'arid'] },
  { value: 'Ther', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'Quor', weight: 2, tags: ['mysterious', 'void'] },
  { value: 'Mal', weight: 3, tags: ['swamp', 'jungle'] },
  { value: 'Ren', weight: 3, tags: ['grassland', 'rural'] },
  { value: 'Sul', weight: 3, tags: ['ocean', 'coastal'] },
  { value: 'Tor', weight: 3, tags: ['mountain', 'rural'] },
  { value: 'Ver', weight: 3, tags: ['forest', 'jungle'] },
  { value: 'Xan', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Yth', weight: 2, tags: ['void', 'frozen'] },
  { value: 'Ost', weight: 3, tags: ['mountain', 'frozen'] },
  { value: 'Cor', weight: 3, tags: ['urban', 'trade'] },
  { value: 'Fen', weight: 3, tags: ['swamp', 'rural'] },
  { value: 'Grav', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'Hal', weight: 3, tags: ['grassland', 'civilian'] },
  { value: 'Ish', weight: 2, tags: ['desert', 'arid'] },
  { value: 'Jov', weight: 3, tags: ['urban', 'trade'] },
  { value: 'Kesh', weight: 2, tags: ['jungle', 'mysterious'] },
  { value: 'Lor', weight: 3, tags: ['forest', 'rural'] },
  { value: 'Mor', weight: 3, tags: ['mountain', 'volcanic'] },
  { value: 'Nal', weight: 3, tags: ['ocean', 'coastal'] },
  { value: 'Or', weight: 2, tags: ['void', 'urban'] },
  { value: 'Pol', weight: 3, tags: ['frozen', 'ice'] },
  { value: 'Quel', weight: 2, tags: ['mysterious', 'jungle'] },
  { value: 'Rax', weight: 3, tags: ['desert', 'volcanic'] },
  { value: 'Sen', weight: 3, tags: ['grassland', 'rural'] },
  { value: 'Trel', weight: 3, tags: ['forest', 'mountain'] },
  { value: 'Um', weight: 2, tags: ['swamp', 'jungle'] },
  { value: 'Val', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'Wyn', weight: 3, tags: ['forest', 'grassland'] },
  { value: 'Xel', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'Yar', weight: 3, tags: ['desert', 'arid'] },
  { value: 'Zorn', weight: 2, tags: ['volcanic', 'aggressive'] },
  { value: 'Ael', weight: 2, tags: ['ocean', 'mysterious'] },
  { value: 'Bok', weight: 3, tags: ['swamp', 'rural'] },
  { value: 'Cess', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Doreth', weight: 3, tags: ['forest', 'grassland'] },
  { value: 'Eldu', weight: 2, tags: ['frozen', 'mountain'] },
  { value: 'Farr', weight: 3, tags: ['desert', 'trade'] },
  { value: 'Gann', weight: 3, tags: ['mountain', 'rural'] },
  { value: 'Hesk', weight: 2, tags: ['ice', 'void'] },
  { value: 'Ith', weight: 2, tags: ['jungle', 'swamp'] },
  { value: 'Jara', weight: 3, tags: ['grassland', 'civilian'] },
  { value: 'Krel', weight: 3, tags: ['volcanic', 'mountain'] },
  { value: 'Lisk', weight: 3, tags: ['ocean', 'coastal'] },
  { value: 'Muun', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Neth', weight: 2, tags: ['mysterious', 'void'] },
  { value: 'Opar', weight: 3, tags: ['desert', 'arid'] },
  { value: 'Pryn', weight: 3, tags: ['forest', 'rural'] }
]);

export const PLANET_NAME_SUFFIXES = Object.freeze([
  { value: 'ak', weight: 3, tags: ['desert', 'arid'] },
  { value: 'an', weight: 4, tags: ['grassland', 'civilian'] },
  { value: 'ar', weight: 4, tags: ['mountain', 'rural'] },
  { value: 'ax', weight: 2, tags: ['volcanic', 'aggressive'] },
  { value: 'dan', weight: 3, tags: ['forest', 'rural'] },
  { value: 'don', weight: 3, tags: ['urban', 'trade'] },
  { value: 'dor', weight: 3, tags: ['mountain', 'frozen'] },
  { value: 'eth', weight: 3, tags: ['mysterious', 'void'] },
  { value: 'ia', weight: 3, tags: ['ocean', 'coastal'] },
  { value: 'ik', weight: 2, tags: ['ice', 'frozen'] },
  { value: 'in', weight: 3, tags: ['forest', 'grassland'] },
  { value: 'ir', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'is', weight: 3, tags: ['desert', 'arid'] },
  { value: 'ith', weight: 2, tags: ['jungle', 'mysterious'] },
  { value: 'ka', weight: 3, tags: ['volcanic', 'mountain'] },
  { value: 'lan', weight: 3, tags: ['grassland', 'rural'] },
  { value: 'lis', weight: 3, tags: ['ocean', 'coastal'] },
  { value: 'loth', weight: 3, tags: ['forest', 'jungle'] },
  { value: 'mar', weight: 3, tags: ['ocean', 'trade'] },
  { value: 'mir', weight: 2, tags: ['mysterious', 'void'] },
  { value: 'mor', weight: 3, tags: ['mountain', 'volcanic'] },
  { value: 'nis', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'oon', weight: 2, tags: ['swamp', 'jungle'] },
  { value: 'or', weight: 4, tags: ['urban', 'trade'] },
  { value: 'os', weight: 3, tags: ['desert', 'arid'] },
  { value: 'rak', weight: 2, tags: ['volcanic', 'aggressive'] },
  { value: 'ran', weight: 3, tags: ['grassland', 'rural'] },
  { value: 'ris', weight: 3, tags: ['forest', 'civilian'] },
  { value: 'ron', weight: 3, tags: ['mountain', 'trade'] },
  { value: 'sia', weight: 2, tags: ['ocean', 'mysterious'] },
  { value: 'ta', weight: 3, tags: ['desert', 'arid'] },
  { value: 'tar', weight: 3, tags: ['mountain', 'rural'] },
  { value: 'tha', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'tis', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'ton', weight: 3, tags: ['urban', 'trade'] },
  { value: 'ula', weight: 2, tags: ['swamp', 'jungle'] },
  { value: 'um', weight: 3, tags: ['forest', 'rural'] },
  { value: 'us', weight: 3, tags: ['desert', 'civilian'] },
  { value: 'val', weight: 3, tags: ['grassland', 'civilian'] },
  { value: 'vek', weight: 2, tags: ['volcanic', 'aggressive'] },
  { value: 'wyn', weight: 3, tags: ['forest', 'grassland'] },
  { value: 'xis', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'yl', weight: 3, tags: ['ice', 'frozen'] },
  { value: 'zar', weight: 2, tags: ['desert', 'trade'] },
  { value: 'zin', weight: 3, tags: ['urban', 'civilian'] },
  { value: 'zor', weight: 2, tags: ['volcanic', 'mountain'] },
  { value: 'ryn', weight: 3, tags: ['forest', 'rural'] },
  { value: 'shen', weight: 2, tags: ['mysterious', 'jungle'] },
  { value: 'thys', weight: 2, tags: ['ice', 'void'] },
  { value: 'vane', weight: 3, tags: ['grassland', 'civilian'] },
  { value: 'wick', weight: 2, tags: ['urban', 'trade'] }
]);
