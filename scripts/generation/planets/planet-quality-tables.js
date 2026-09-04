/**
 * PHASE 8D-2 foundation — procedural planet quality tables (world class,
 * size, gravity, atmosphere).
 *
 * CORRECTED (Phase 8D-2 independent review, round 1): the original
 * version of this file used a made-up `tags` vocabulary (`arid`,
 * `ocean`, `void`, ...) as `WORLD_CLASS`'s ONLY tag field and
 * `planet-draft.js` then wrote that field straight into the draft's
 * `biomes` — a parallel biome vocabulary the Library's own real
 * `LOCATION_LIBRARY_BIOMES` (`location-library-seeds.js`, 86 curated
 * values) was specifically supposed to prevent. Every `WORLD_CLASS`
 * entry now carries TWO separate arrays:
 *
 *  - `biomes`: values drawn ONLY from `LOCATION_LIBRARY_BIOMES` — this
 *    IS the Location's canonical biome vocabulary, single source of
 *    truth, checked below via `isLocationLibraryBiome()`.
 *  - `tags`: procedural-only descriptive words (`arid`, `mysterious`,
 *    `trade`, `coastal`, ...) used purely for soft preference-matching
 *    across the OTHER planet pools (economy/hazard/trait/name); never
 *    written into a Location's `biomes` field by any caller.
 *
 * `locationType` also corrects a second finding from the same review:
 * `planet-draft.js` previously hardcoded `type: 'planet'` even for the
 * `asteroid-field` world class, which the real Location Library would
 * never call a "planet". Every entry defaults to `'planet'`;
 * `asteroid-field` is the one exception, matching the Library's own
 * `type: 'region'` vocabulary (used for `Dxun`-style sub-areas) instead.
 *
 * PHASE 8D-3A production expansion: grown from 12 representative
 * entries to a ~35-entry production catalog covering the world-class
 * variety a GM actually wants when generating many worlds in a row
 * (forest/grassland/canyon/archipelago/mountain/storm/toxic/irradiated/
 * high- and low-gravity/industrial/agricultural/mining/terraformed/
 * failed-terraforming/post-cataclysmic/fungal/artificial-habitat/
 * research/trade-hub/penal/sacred/crystal/frontier/ancient-ruin worlds).
 * `artificial-habitat` is the one OTHER exception to `locationType:
 * 'planet'` (a constructed ring/hab station, not a natural body) --
 * matching the same "use canonical Location type semantics, don't force
 * a non-planet into `type: 'planet'`" discipline `asteroid-field`
 * already established.
 *
 * `tags` IS the "economy/hazard/POI weighting hint" mechanism the phase
 * asked for -- no separate hint fields were added. `planet-draft.js`'s
 * `worldClassPreferenceTags()` already merges `biomes`+`tags` into
 * `preferTags`, which every sibling pool (economy/hazard/trait/name/
 * climate/hydrosphere) AND `poi-generator.js`'s context-tag merge
 * already read via `weightedPickWithPreference()` -- adding a second,
 * parallel "hint" field would just be the same mechanism under a new
 * name (schema bloat this phase's own POI-environment-mode guidance
 * explicitly warns against). The ONE genuinely new hint is
 * `populationBias` (`'dense'` / `'sparse'` / `''`) -- population-scale
 * weighting was previously keyed ONLY on the coarse `habitable`
 * boolean, with no way for e.g. an `urban-ecumenopolis` class to skew
 * denser than a `frontier-outpost` class among worlds that are BOTH
 * habitable. `planet-population.js`'s `pickPopulationScale()` now
 * accepts this as an optional soft skew (never a hard requirement,
 * matching the phase's "context-sensitive weighting, not deterministic
 * stereotypes" instruction -- an `urban-ecumenopolis` world can still
 * occasionally roll `outpost`, just less often).
 */

import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';
import { isLocationLibraryBiome } from '../../locations/location-library-seeds.js';
import { mergeTags } from '../lib/tag-utils.js';

export const WORLD_CLASS = Object.freeze([
  { value: 'temperate', weight: 5, biomes: ['forest', 'grassland', 'rural'], tags: ['civilian'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'arid', weight: 4, biomes: ['desert', 'wasteland'], tags: ['arid'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'ocean', weight: 3, biomes: ['water', 'island'], tags: ['coastal', 'aquatic'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'ice', weight: 3, biomes: ['ice', 'polar'], tags: ['frozen'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'volcanic', weight: 2, biomes: ['lava', 'mining'], tags: ['aggressive'], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'jungle', weight: 3, biomes: ['jungle', 'wilderness'], tags: [], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'urban-ecumenopolis', weight: 2, biomes: ['city', 'urban', 'industrial', 'commerce'], tags: ['trade', 'civilian'], habitable: true, locationType: 'planet', populationBias: 'dense' },
  { value: 'gas-giant', weight: 2, biomes: ['gas', 'space'], tags: ['mysterious'], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'barren-rock', weight: 3, biomes: ['wasteland', 'asteroid', 'mine'], tags: [], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'swamp', weight: 3, biomes: ['swamp', 'jungle'], tags: ['rural'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'tundra', weight: 2, biomes: ['polar', 'ice'], tags: ['rural'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'asteroid-field', weight: 1, biomes: ['asteroid', 'space', 'mobile'], tags: ['mysterious'], habitable: false, locationType: 'region', populationBias: 'sparse' },

  // --- Phase 8D-3A production expansion (~23 new classes) ---
  { value: 'forest-world', weight: 3, biomes: ['forest', 'wilderness', 'wildlife'], tags: ['rural'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'grassland-plains', weight: 3, biomes: ['grassland', 'rural', 'wilderness'], tags: ['agriculture'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'desert-canyon', weight: 2, biomes: ['desert', 'canyon', 'wasteland'], tags: ['arid', 'mining'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'archipelago', weight: 2, biomes: ['water', 'island', 'tropical'], tags: ['coastal', 'trade'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'mountainous', weight: 3, biomes: ['mountain', 'wilderness'], tags: ['rural', 'mining'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'storm-world', weight: 1, biomes: ['storm', 'wasteland'], tags: ['hazardous', 'mysterious'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'toxic-world', weight: 1, biomes: ['wasteland', 'hazard'], tags: ['toxic', 'industrial'], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'irradiated-world', weight: 1, biomes: ['wasteland', 'hazard', 'ruin'], tags: ['irradiated', 'mysterious'], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'high-gravity-terrestrial', weight: 2, biomes: ['rural', 'wilderness'], tags: ['high-gravity'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'low-gravity-terrestrial', weight: 2, biomes: ['wilderness', 'rural'], tags: ['low-gravity'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'industrial-world', weight: 2, biomes: ['industrial', 'urban'], tags: ['industrial', 'manufacturing'], habitable: true, locationType: 'planet', populationBias: 'dense' },
  { value: 'agricultural-world', weight: 3, biomes: ['grassland', 'rural', 'forest'], tags: ['agriculture'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'mining-world', weight: 3, biomes: ['mine', 'mining', 'mountain'], tags: ['mining', 'industrial'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'terraformed-world', weight: 1, biomes: ['grassland', 'forest', 'rural'], tags: ['terraformed', 'civilian'], habitable: true, locationType: 'planet', populationBias: '' },
  { value: 'failed-terraformation', weight: 1, biomes: ['wasteland', 'ruin'], tags: ['failed-terraforming', 'mysterious'], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'post-cataclysmic-world', weight: 1, biomes: ['wasteland', 'ruin', 'battlefield'], tags: ['post-war', 'mysterious'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'fungal-world', weight: 1, biomes: ['fungal', 'jungle', 'swamp'], tags: ['mysterious', 'wildlife'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'artificial-habitat', weight: 1, biomes: ['facility', 'mobile', 'industrial'], tags: ['artificial', 'urban'], habitable: true, locationType: 'space-station', populationBias: 'dense' },
  { value: 'geologically-unstable', weight: 1, biomes: ['sinkhole', 'canyon', 'wasteland'], tags: ['unstable', 'hazardous'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'isolated-research-world', weight: 1, biomes: ['research', 'facility', 'remote'], tags: ['research', 'isolated'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'trade-hub-world', weight: 2, biomes: ['commerce', 'urban', 'city'], tags: ['trade', 'cosmopolitan'], habitable: true, locationType: 'planet', populationBias: 'dense' },
  { value: 'penal-world', weight: 1, biomes: ['wasteland', 'remote'], tags: ['penal', 'enforcement'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'sacred-world', weight: 1, biomes: ['sacred', 'holy', 'temple'], tags: ['force-tradition', 'religion'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'crystal-world', weight: 1, biomes: ['crystal', 'cave', 'mountain'], tags: ['mining', 'mysterious'], habitable: false, locationType: 'planet', populationBias: 'sparse' },
  { value: 'frontier-outpost-world', weight: 2, biomes: ['frontier', 'wilderness', 'remote'], tags: ['frontier'], habitable: true, locationType: 'planet', populationBias: 'sparse' },
  { value: 'ancient-ruin-world', weight: 1, biomes: ['ruin', 'ancient', 'wasteland'], tags: ['mysterious', 'archaeological'], habitable: false, locationType: 'planet', populationBias: 'sparse' }
]);

// Self-check at module load: every WORLD_CLASS.biomes entry must be a
// real Library biome value. Throws immediately (not a silent runtime
// surprise) if this table and the Library's vocabulary ever drift.
for (const entry of WORLD_CLASS) {
  for (const biome of entry.biomes) {
    if (!isLocationLibraryBiome(biome)) {
      throw new Error(`planet-quality-tables.js: WORLD_CLASS entry "${entry.value}" declares biome "${biome}", which is not a real LOCATION_LIBRARY_BIOMES value`);
    }
  }
}

export const PLANET_SIZE = Object.freeze([
  { value: 'tiny', weight: 1 },
  { value: 'small', weight: 3 },
  { value: 'medium', weight: 5 },
  { value: 'large', weight: 3 },
  { value: 'huge', weight: 1 }
]);

/**
 * PHASE 8D-3A production tuning: gravity now supports the full
 * `very-low`/`low`/`standard`/`high`/`very-high`/`artificial` spread the
 * phase asked for (was `low`/`standard`/`high` only). `standard` stays
 * the heaviest weight by a wide margin; the two extremes (`very-low`/
 * `very-high`) and `artificial` (an installation-grade gravity plating
 * override -- narratively distinct from a natural extreme) are all
 * comparatively rare. No invented SWSE mechanical modifiers attach to
 * any of these -- this is a GENERATE-tier flavor fact only.
 */
export const PLANET_GRAVITY = Object.freeze([
  { value: 'very-low', weight: 1 },
  { value: 'low', weight: 3 },
  { value: 'standard', weight: 10 },
  { value: 'high', weight: 3 },
  { value: 'very-high', weight: 1 },
  { value: 'artificial', weight: 1 }
]);

/**
 * PHASE 8D-3A production expansion: grown from 5 to 12 categories
 * (breathable is split into standard/thin/dense/low-oxygen/high-oxygen
 * variants, plus polluted/artificially-maintained added alongside the
 * existing toxic/corrosive/trace/unbreathable/none-vacuum). No invented
 * mechanical penalties attach to any entry -- this stays a narrative
 * flavor fact, exactly like the original 5-entry table was.
 */
export const PLANET_ATMOSPHERE = Object.freeze([
  { value: 'standard-breathable', weight: 8 },
  { value: 'thin-breathable', weight: 3 },
  { value: 'dense-breathable', weight: 2 },
  { value: 'low-oxygen', weight: 2 },
  { value: 'high-oxygen', weight: 1 },
  { value: 'polluted', weight: 2 },
  { value: 'toxic', weight: 2 },
  { value: 'corrosive', weight: 1 },
  { value: 'trace', weight: 2 },
  { value: 'unbreathable', weight: 2 },
  { value: 'artificially-maintained', weight: 1 },
  { value: 'none-vacuum', weight: 2 }
]);

/**
 * Pick a random world-class entry, optionally biased toward a biome/tag
 * affinity. Matches `preferTags` against BOTH `biomes` and `tags`
 * (merged) -- a caller biasing toward `'desert'` should match
 * `arid`'s `biomes` just as readily as a caller biasing toward
 * `'mysterious'` matches `gas-giant`'s `tags`.
 */
export function pickPlanetWorldClass({ rng, preferTags = [] } = {}) {
  const matchable = WORLD_CLASS.map((entry) => ({ entry, weight: entry.weight, tags: mergeTags(entry.biomes, entry.tags) }));
  const picked = weightedPickWithPreference(matchable, { rng, preferTags, weightOf: (m) => Number(m.weight ?? 1) });
  return picked ? picked.entry : null;
}

/** Pick a random planet size entry. */
export function pickPlanetSize({ rng } = {}) {
  return weightedPick(PLANET_SIZE, { rng });
}

/** Pick a random gravity entry. */
export function pickPlanetGravity({ rng } = {}) {
  return weightedPick(PLANET_GRAVITY, { rng });
}

/** Pick a random atmosphere entry. */
export function pickPlanetAtmosphere({ rng } = {}) {
  return weightedPick(PLANET_ATMOSPHERE, { rng });
}
