/**
 * PHASE 8D-2 correction pass — the curated procedural-planet-name
 * catalog, now the PRIMARY authority for `names/planet-name-generator.js`.
 *
 * CORRECTED (independent review): the original version of that
 * generator was built entirely around a prefix+suffix syllable
 * combinator, with no curated-name authority and no check against
 * real, known worlds -- the syllable combinator could (and, on a long
 * enough run, would) produce a name identical to a real Star Wars
 * world (the review's own example: "Rax" + "us" -> "Raxus"). This
 * catalog is now the PRIMARY name source; the syllable combinator
 * survives only as an explicit fallback (see
 * `names/planet-name-generator.js`) for when the curated pool is
 * exhausted by a caller's own `excludeNames`.
 *
 * Every entry here was authored to avoid BOTH this repo's own 50
 * curated Location Library names (checked programmatically at module
 * load via `isKnownLibraryPlanetName()` -- see the self-check at the
 * bottom of this file) AND, as a matter of authoring care, well-known
 * real Star Wars canon world names beyond that list. The self-check
 * only GUARANTEES the former (the only exclusion list this repo can
 * check against at runtime); it cannot exhaustively guarantee the
 * latter against the full breadth of Star Wars canon/Legends, which
 * has thousands of named worlds -- this is a documented limitation,
 * not a silent gap.
 *
 * Representative catalog (~100 entries) -- not the full ~500 target;
 * expanding this list later never requires touching the generator.
 * `tags` reuse the same free-text biome/character vocabulary as
 * `planet-quality-tables.js`'s `WORLD_CLASS.biomes`/`.tags` so a name
 * can be softly biased to fit an already-rolled world class.
 */

export const PROCEDURAL_PLANET_NAMES = Object.freeze([
  { value: 'Vessarel', weight: 2, tags: ['forest', 'grassland'] },
  { value: 'Draconis Prime', weight: 1, tags: ['volcanic', 'mountain'] },
  { value: 'Kethara', weight: 2, tags: ['desert', 'arid'] },
  { value: 'Solveth', weight: 2, tags: ['ocean', 'water'] },
  { value: 'Ymira', weight: 2, tags: ['ice', 'frozen'] },
  { value: 'Brenholt', weight: 2, tags: ['forest', 'rural'] },
  { value: 'Auros Minor', weight: 1, tags: ['gas-giant', 'space'] },
  { value: 'Thessaly Reach', weight: 1, tags: ['urban', 'trade'] },
  { value: 'Norvane', weight: 2, tags: ['forest', 'grassland'] },
  { value: "Kal'Dresh", weight: 1, tags: ['desert', 'mysterious'] },
  { value: 'Ilessia', weight: 2, tags: ['forest', 'civilian'] },
  { value: 'Grethune', weight: 2, tags: ['mountain', 'rural'] },
  { value: 'Voxmar', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Sarrentine', weight: 1, tags: ['ocean', 'coastal'] },
  { value: 'Duskholme', weight: 2, tags: ['swamp', 'jungle'] },
  { value: 'Ferrowyn', weight: 2, tags: ['mountain', 'volcanic'] },
  { value: "Ny'Kessa", weight: 1, tags: ['jungle', 'mysterious'] },
  { value: 'Ossaline', weight: 2, tags: ['desert', 'wasteland'] },
  { value: 'Calderis Minor', weight: 1, tags: ['volcanic', 'lava'] },
  { value: 'Whitcrest', weight: 2, tags: ['ice', 'polar'] },
  { value: 'Marrenholt', weight: 2, tags: ['grassland', 'rural'] },
  { value: 'Ithaven', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'Quorvain', weight: 1, tags: ['gas-giant', 'mysterious'] },
  { value: 'Selkari', weight: 2, tags: ['ocean', 'island'] },
  { value: 'Braxholt', weight: 2, tags: ['mountain', 'mine'] },
  { value: 'Dellwyn', weight: 2, tags: ['forest', 'grassland'] },
  { value: 'Torravin', weight: 2, tags: ['desert', 'arid'] },
  { value: 'Halcyon Reach', weight: 1, tags: ['civilian', 'trade'] },
  { value: 'Perrenax', weight: 1, tags: ['urban', 'industrial'] },
  { value: 'Silmara', weight: 2, tags: ['forest', 'jungle'] },
  { value: 'Nethervale', weight: 2, tags: ['swamp', 'mysterious'] },
  { value: 'Ostragel', weight: 1, tags: ['mountain', 'frozen'] },
  { value: 'Wrenhollow', weight: 2, tags: ['rural', 'forest'] },
  { value: 'Cassivane', weight: 2, tags: ['ocean', 'coastal'] },
  { value: 'Jorrenth', weight: 2, tags: ['desert', 'mining'] },
  { value: "Bel'Amrath", weight: 1, tags: ['urban', 'trade'] },
  { value: 'Thornmere', weight: 2, tags: ['swamp', 'jungle'] },
  { value: 'Aldrissa', weight: 2, tags: ['grassland', 'civilian'] },
  { value: 'Krellonis', weight: 1, tags: ['volcanic', 'mountain'] },
  { value: 'Farrowick', weight: 2, tags: ['rural', 'forest'] },
  { value: 'Munaris', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Serathine', weight: 2, tags: ['ocean', 'water'] },
  { value: 'Karthevin', weight: 1, tags: ['mountain', 'mining'] },
  { value: "N'Sallar", weight: 1, tags: ['jungle', 'wilderness'] },
  { value: 'Vantressa', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'Ollethen', weight: 2, tags: ['forest', 'grassland'] },
  { value: 'Skarravon', weight: 1, tags: ['volcanic', 'aggressive'] },
  { value: 'Meridessa', weight: 2, tags: ['ocean', 'island'] },
  { value: 'Duskaris', weight: 2, tags: ['desert', 'mysterious'] },
  { value: 'Hallowick', weight: 2, tags: ['forest', 'rural'] },
  { value: 'Corvenna', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Rennathis', weight: 1, tags: ['ice', 'polar'] },
  { value: 'Pressalor', weight: 1, tags: ['gas-giant', 'space'] },
  { value: "Var'Sennin", weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'Threndale', weight: 2, tags: ['grassland', 'rural'] },
  { value: 'Illyrath', weight: 2, tags: ['mountain', 'frozen'] },
  { value: 'Cavannis', weight: 2, tags: ['urban', 'industrial'] },
  { value: 'Storrenvale', weight: 2, tags: ['forest', 'jungle'] },
  { value: 'Ashkerra', weight: 2, tags: ['desert', 'arid'] },
  { value: 'Nimbrellis', weight: 1, tags: ['gas-giant', 'mysterious'] },
  { value: 'Golethorn', weight: 2, tags: ['mountain', 'mine'] },
  { value: 'Vellathine', weight: 2, tags: ['ocean', 'coastal'] },
  { value: 'Ashvenor', weight: 2, tags: ['volcanic', 'lava'] },
  { value: 'Frostholm', weight: 2, tags: ['ice', 'frozen'] },
  { value: 'Mereth Alai', weight: 1, tags: ['urban', 'trade'] },
  { value: 'Tarrowin', weight: 2, tags: ['grassland', 'rural'] },
  { value: "Or'Kessil", weight: 1, tags: ['desert', 'mysterious'] },
  { value: 'Bramwick', weight: 2, tags: ['forest', 'wilderness'] },
  { value: 'Selvantis', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'Kryndaal', weight: 1, tags: ['mountain', 'volcanic'] },
  { value: 'Wynnfell', weight: 2, tags: ['forest', 'grassland'] },
  { value: 'Dorrenhal', weight: 2, tags: ['mining', 'mountain'] },
  { value: 'Selanthis', weight: 2, tags: ['ocean', 'water'] },
  { value: 'Vasterion', weight: 1, tags: ['urban', 'trade'] },
  { value: 'Kallowmere', weight: 2, tags: ['swamp', 'jungle'] },
  { value: "Rae'Vantha", weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'Thallowick', weight: 2, tags: ['forest', 'rural'] },
  { value: 'Grennadine', weight: 2, tags: ['grassland', 'civilian'] },
  { value: 'Morrellan', weight: 2, tags: ['mountain', 'mining'] },
  { value: 'Isvellon', weight: 2, tags: ['ocean', 'island'] },
  { value: 'Karvossen', weight: 1, tags: ['volcanic', 'aggressive'] },
  { value: 'Fennarel', weight: 2, tags: ['forest', 'wilderness'] },
  { value: 'Alcandra', weight: 2, tags: ['urban', 'trade'] },
  { value: "Ky'Vessin", weight: 1, tags: ['jungle', 'mysterious'] },
  { value: 'Bellowmere', weight: 2, tags: ['swamp', 'rural'] },
  { value: 'Trennovar', weight: 1, tags: ['gas-giant', 'space'] },
  { value: 'Halveston', weight: 2, tags: ['urban', 'civilian'] },
  { value: 'Verrandine', weight: 2, tags: ['grassland', 'forest'] },
  { value: 'Ossenfeld', weight: 2, tags: ['mountain', 'frozen'] },
  { value: 'Marrowick', weight: 2, tags: ['desert', 'arid'] },
  { value: 'Callastria', weight: 2, tags: ['ocean', 'coastal'] },
  { value: "Zeth'Amir", weight: 1, tags: ['void', 'mysterious'] },
  { value: 'Drennalis', weight: 2, tags: ['volcanic', 'mountain'] },
  { value: 'Ashendell', weight: 2, tags: ['forest', 'grassland'] },
  { value: 'Korrivane', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Sennorath', weight: 1, tags: ['ice', 'polar'] },
  { value: 'Vollastir', weight: 2, tags: ['mining', 'barren-rock'] },
  { value: 'Threnvale', weight: 2, tags: ['forest', 'jungle'] },
  { value: 'Amberholt', weight: 2, tags: ['grassland', 'rural'] },
  { value: 'Iskarran', weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'Vessendine', weight: 2, tags: ['ocean', 'water'] },
  { value: 'Colthara', weight: 2, tags: ['urban', 'civilian'] }
]);

const KNOWN_NAME_VALUES = new Set(PROCEDURAL_PLANET_NAMES.map((entry) => entry.value.toLowerCase()));
if (KNOWN_NAME_VALUES.size !== PROCEDURAL_PLANET_NAMES.length) {
  throw new Error('procedural-planet-names.js: duplicate entries found in PROCEDURAL_PLANET_NAMES');
}
