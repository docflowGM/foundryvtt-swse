/**
 * PHASE 8D-2 correction pass — additional structural planet facts
 * (region, sector, climate, hydrosphere, technology/development,
 * settlement pattern).
 *
 * Added per independent review: the original `createProceduralPlanetDraft()`
 * covered world class/size/gravity/atmosphere/population/government/
 * stability/economy/hazards/history/traits but omitted several
 * structural fields later Faction/Job generation needs. `region` reuses
 * the real galactic-region vocabulary `location-library-seeds.js`
 * already uses (`Core Worlds`/`Colonies`/`Inner Rim`/`Mid Rim`/
 * `Outer Rim`/`Wild Space`/`Unknown Regions`) rather than inventing a
 * second one. `settlementPattern` is explicitly informed by
 * `planet-population.js`'s `POPULATION_SCALE` (an uninhabited world
 * always has `none`; a hyper-urbanized world is always an
 * `ecumenopolis`) so the two facts can never contradict each other.
 */

import { weightedPick, weightedPickWithPreference, weightedPickUniqueN } from '../lib/weighted-random.js';
import { PLANET_NAME_PREFIXES } from '../data/planet-name-syllables.js';
import { POPULATION_SCALE } from './planet-population.js';
import { TECHNOLOGY_SPECIALTIES } from '../data/technology-specialties.js';

export const PLANET_REGION = Object.freeze({
  CORE_WORLDS: 'Core Worlds',
  COLONIES: 'Colonies',
  INNER_RIM: 'Inner Rim',
  MID_RIM: 'Mid Rim',
  OUTER_RIM: 'Outer Rim',
  WILD_SPACE: 'Wild Space',
  UNKNOWN_REGIONS: 'Unknown Regions'
});

const REGION_ENTRIES = Object.freeze([
  { value: PLANET_REGION.CORE_WORLDS, weight: 2 },
  { value: PLANET_REGION.COLONIES, weight: 2 },
  { value: PLANET_REGION.INNER_RIM, weight: 3 },
  { value: PLANET_REGION.MID_RIM, weight: 4 },
  { value: PLANET_REGION.OUTER_RIM, weight: 5 },
  { value: PLANET_REGION.WILD_SPACE, weight: 2 },
  { value: PLANET_REGION.UNKNOWN_REGIONS, weight: 1 }
]);

const REGION_VALUES = Object.freeze(Object.values(PLANET_REGION));

export function isPlanetRegion(value) {
  return REGION_VALUES.includes(value);
}

/** Pick a random galactic region -- the same 7 canonical values `location-library-seeds.js` uses for its own worlds. */
export function pickPlanetRegion({ rng } = {}) {
  return weightedPick(REGION_ENTRIES, { rng })?.value ?? PLANET_REGION.OUTER_RIM;
}

/** Generate a procedural sector name (`"<Root> sector"`), reusing `planet-name-syllables.js`'s existing prefix pool rather than a third name-component pool. */
export function pickSectorName({ rng } = {}) {
  const prefix = weightedPick(PLANET_NAME_PREFIXES, { rng });
  return `${prefix?.value ?? 'Outer'} sector`;
}

/**
 * PHASE 8D-3A production expansion: grown from 7 to 20 categories.
 * Purely descriptive flavor -- never a mechanical survival penalty, per
 * the phase's own instruction.
 */
export const PLANET_CLIMATE = Object.freeze({
  ARID: 'arid',
  TEMPERATE: 'temperate',
  TROPICAL: 'tropical',
  FRIGID: 'frigid',
  VARIABLE: 'variable',
  HARSH: 'harsh',
  NONE: 'none',
  FROZEN: 'frozen',
  POLAR: 'polar',
  COLD: 'cold',
  COOL: 'cool',
  WARM: 'warm',
  HUMID: 'humid',
  MONSOON: 'monsoon',
  HOT: 'hot',
  SCORCHING: 'scorching',
  STORM_PRONE: 'storm-prone',
  SEASONALLY_EXTREME: 'seasonally-extreme',
  HIGHLY_VARIABLE: 'highly-variable',
  ARTIFICIALLY_REGULATED: 'artificially-regulated'
});

const CLIMATE_ENTRIES = Object.freeze([
  { value: PLANET_CLIMATE.ARID, weight: 3, tags: ['desert', 'wasteland'] },
  { value: PLANET_CLIMATE.TEMPERATE, weight: 4, tags: ['forest', 'grassland', 'rural'] },
  { value: PLANET_CLIMATE.TROPICAL, weight: 3, tags: ['jungle', 'wilderness', 'swamp'] },
  { value: PLANET_CLIMATE.FRIGID, weight: 3, tags: ['ice', 'polar'] },
  { value: PLANET_CLIMATE.VARIABLE, weight: 2, tags: [] },
  { value: PLANET_CLIMATE.HARSH, weight: 2, tags: ['lava', 'asteroid', 'gas', 'space'] },
  { value: PLANET_CLIMATE.NONE, weight: 1, tags: ['gas', 'space', 'asteroid'] },
  { value: PLANET_CLIMATE.FROZEN, weight: 2, tags: ['ice', 'polar'] },
  { value: PLANET_CLIMATE.POLAR, weight: 2, tags: ['ice', 'polar'] },
  { value: PLANET_CLIMATE.COLD, weight: 2, tags: ['ice', 'mountain'] },
  { value: PLANET_CLIMATE.COOL, weight: 2, tags: ['forest', 'rural'] },
  { value: PLANET_CLIMATE.WARM, weight: 2, tags: ['grassland', 'jungle'] },
  { value: PLANET_CLIMATE.HUMID, weight: 2, tags: ['swamp', 'jungle'] },
  { value: PLANET_CLIMATE.MONSOON, weight: 1, tags: ['jungle', 'swamp'] },
  { value: PLANET_CLIMATE.HOT, weight: 2, tags: ['desert', 'lava'] },
  { value: PLANET_CLIMATE.SCORCHING, weight: 1, tags: ['lava', 'desert'] },
  { value: PLANET_CLIMATE.STORM_PRONE, weight: 1, tags: ['storm', 'wasteland'] },
  { value: PLANET_CLIMATE.SEASONALLY_EXTREME, weight: 1, tags: [] },
  { value: PLANET_CLIMATE.HIGHLY_VARIABLE, weight: 1, tags: [] },
  { value: PLANET_CLIMATE.ARTIFICIALLY_REGULATED, weight: 1, tags: ['urban', 'industrial'] }
]);

const CLIMATE_VALUES = Object.freeze(Object.values(PLANET_CLIMATE));

export function isPlanetClimate(value) {
  return CLIMATE_VALUES.includes(value);
}

/** Pick a random climate entry, softly biased by biome/tag affinity (typically the world class's own `biomes`+`tags`). */
export function pickPlanetClimate({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(CLIMATE_ENTRIES, { rng, preferTags })?.value ?? PLANET_CLIMATE.TEMPERATE;
}

/** PHASE 8D-3A production expansion: grown from 5 to 12 categories, never mechanically authoritative -- flavor only. */
export const PLANET_HYDROSPHERE = Object.freeze({
  NONE: 'none',
  TRACE: 'trace',
  SCARCE: 'scarce',
  LIMITED: 'limited',
  MODERATE: 'moderate',
  ABUNDANT: 'abundant',
  EXTENSIVE: 'extensive',
  OCEANIC: 'oceanic',
  WORLD_OCEAN: 'world-ocean',
  SUBSURFACE: 'subsurface',
  FROZEN: 'frozen',
  ARTIFICIAL: 'artificial'
});

const HYDROSPHERE_ENTRIES = Object.freeze([
  { value: PLANET_HYDROSPHERE.NONE, weight: 3, tags: ['desert', 'wasteland', 'gas', 'space', 'asteroid', 'lava'] },
  { value: PLANET_HYDROSPHERE.TRACE, weight: 2, tags: ['desert', 'wasteland'] },
  { value: PLANET_HYDROSPHERE.SCARCE, weight: 3, tags: ['desert', 'mountain'] },
  { value: PLANET_HYDROSPHERE.LIMITED, weight: 3, tags: ['desert', 'rural'] },
  { value: PLANET_HYDROSPHERE.MODERATE, weight: 4, tags: ['forest', 'grassland', 'jungle'] },
  { value: PLANET_HYDROSPHERE.ABUNDANT, weight: 2, tags: ['forest', 'jungle', 'swamp'] },
  { value: PLANET_HYDROSPHERE.EXTENSIVE, weight: 2, tags: ['water', 'swamp', 'island'] },
  { value: PLANET_HYDROSPHERE.OCEANIC, weight: 2, tags: ['water', 'island', 'coastal'] },
  { value: PLANET_HYDROSPHERE.WORLD_OCEAN, weight: 1, tags: ['water', 'island'] },
  { value: PLANET_HYDROSPHERE.SUBSURFACE, weight: 1, tags: ['cave', 'mountain', 'ice'] },
  { value: PLANET_HYDROSPHERE.FROZEN, weight: 2, tags: ['ice', 'polar'] },
  { value: PLANET_HYDROSPHERE.ARTIFICIAL, weight: 1, tags: ['urban', 'industrial'] }
]);

const HYDROSPHERE_VALUES = Object.freeze(Object.values(PLANET_HYDROSPHERE));

export function isPlanetHydrosphere(value) {
  return HYDROSPHERE_VALUES.includes(value);
}

/**
 * Pick a random hydrosphere entry, softly biased by biome/tag affinity.
 * PHASE 8D-3A correction pass (finding #3): `allowedValues`, when
 * supplied non-empty, restricts the pool to ONLY those values before
 * picking -- a DEFINITIONAL constraint (e.g. an `ocean` world class
 * requires `extensive`/`oceanic`/`world-ocean`), distinct from the
 * ordinary soft `preferTags` weighting every other world class still
 * uses. See `planet-quality-tables.js`'s `WORLD_CLASS_DEFINITIONAL_CONSTRAINTS`.
 */
export function pickPlanetHydrosphere({ rng, preferTags = [], allowedValues } = {}) {
  const pool = Array.isArray(allowedValues) && allowedValues.length ? HYDROSPHERE_ENTRIES.filter((e) => allowedValues.includes(e.value)) : HYDROSPHERE_ENTRIES;
  return weightedPickWithPreference(pool.length ? pool : HYDROSPHERE_ENTRIES, { rng, preferTags })?.value ?? PLANET_HYDROSPHERE.MODERATE;
}

/**
 * PHASE 8D-3A R2 fix 10 (technology production refinement): expanded from
 * 5 to 7 values for finer-grained worldbuilding resolution. Ranked
 * (see `planet-draft.js`'s `TECHNOLOGY_LEVEL_RANK`) primitive <
 * pre-industrial < industrial < frontier < galactic-standard < advanced
 * < cutting-edge -- `galactic-standard` replaces the old `standard` as
 * the baseline/most-common value, and `frontier` (a world with real,
 * working modern tech that is nonetheless patchy/rugged/hand-me-down)
 * now sits ABOVE `industrial` rather than being the second-lowest tier,
 * matching how the term is actually used describing SWSE frontier worlds.
 *
 * `technologyLevel` describes the civilization's GENERAL capability only
 * -- deliberately never used to derive combat mechanics. Distinct from
 * `technologyAccess` (how broadly galactic technology reaches this
 * world, independent of local capability) and `technologySpecialties`
 * (specific areas of notable capability), both defined further below.
 */
export const PLANET_TECHNOLOGY_LEVEL = Object.freeze({
  PRIMITIVE: 'primitive',
  PRE_INDUSTRIAL: 'pre-industrial',
  INDUSTRIAL: 'industrial',
  FRONTIER: 'frontier',
  GALACTIC_STANDARD: 'galactic-standard',
  ADVANCED: 'advanced',
  CUTTING_EDGE: 'cutting-edge'
});

/**
 * PHASE 8D-3A correction pass: `tags` added and `pickPlanetTechnologyLevel()`
 * now accepts `preferTags` -- a genuine gap caught on re-check (it
 * previously had NO soft-preference input at all, so a preset like
 * "High-Tech World" or a research/manufacturing economy context had
 * zero ability to skew this field, despite the phase spec explicitly
 * naming `technologyWeights` in its preset schema, §33).
 */
const TECHNOLOGY_LEVEL_ENTRIES = Object.freeze([
  { value: PLANET_TECHNOLOGY_LEVEL.PRIMITIVE, weight: 1, tags: ['frontier', 'isolated'] },
  { value: PLANET_TECHNOLOGY_LEVEL.PRE_INDUSTRIAL, weight: 2, tags: ['frontier', 'isolated', 'rural'] },
  { value: PLANET_TECHNOLOGY_LEVEL.INDUSTRIAL, weight: 3, tags: ['industrial', 'manufacturing'] },
  { value: PLANET_TECHNOLOGY_LEVEL.FRONTIER, weight: 4, tags: ['frontier'] },
  { value: PLANET_TECHNOLOGY_LEVEL.GALACTIC_STANDARD, weight: 5, tags: [] },
  { value: PLANET_TECHNOLOGY_LEVEL.ADVANCED, weight: 3, tags: ['technology', 'research', 'industrial'] },
  { value: PLANET_TECHNOLOGY_LEVEL.CUTTING_EDGE, weight: 1, tags: ['technology', 'research'] }
]);

const TECHNOLOGY_LEVEL_VALUES = Object.freeze(Object.values(PLANET_TECHNOLOGY_LEVEL));

export function isPlanetTechnologyLevel(value) {
  return TECHNOLOGY_LEVEL_VALUES.includes(value);
}

/** Pick a random technology/development level, optionally softly biased by `preferTags` (region/world-class/economy-sector context -- see `planet-draft.js`'s `rollCivilization()`). */
export function pickPlanetTechnologyLevel({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(TECHNOLOGY_LEVEL_ENTRIES, { rng, preferTags })?.value ?? PLANET_TECHNOLOGY_LEVEL.GALACTIC_STANDARD;
}

/**
 * PHASE 8D-3A R2 fix 10: `technologyAccess` describes how broadly
 * GALACTIC technology reaches this world -- distinct from
 * `technologyLevel`'s "how capable is the civilization" question. An
 * `isolated` world can still be `industrial`-level (self-sufficient,
 * cut off from galactic supply lines); a `ubiquitous`-access world need
 * not be `cutting-edge` (a well-connected Mid Rim world with ordinary
 * `galactic-standard` tech that is simply never hard to buy).
 */
export const PLANET_TECHNOLOGY_ACCESS = Object.freeze({
  ISOLATED: 'isolated',
  SCARCE: 'scarce',
  LIMITED: 'limited',
  COMMON: 'common',
  UBIQUITOUS: 'ubiquitous'
});

const TECHNOLOGY_ACCESS_ENTRIES = Object.freeze([
  { value: PLANET_TECHNOLOGY_ACCESS.ISOLATED, weight: 1, tags: ['isolated', 'remote', 'frontier'] },
  { value: PLANET_TECHNOLOGY_ACCESS.SCARCE, weight: 2, tags: ['frontier', 'rural'] },
  { value: PLANET_TECHNOLOGY_ACCESS.LIMITED, weight: 3, tags: [] },
  { value: PLANET_TECHNOLOGY_ACCESS.COMMON, weight: 5, tags: [] },
  { value: PLANET_TECHNOLOGY_ACCESS.UBIQUITOUS, weight: 2, tags: ['urban', 'trade', 'technology', 'industrial'] }
]);

const TECHNOLOGY_ACCESS_VALUES = Object.freeze(Object.values(PLANET_TECHNOLOGY_ACCESS));

export function isPlanetTechnologyAccess(value) {
  return TECHNOLOGY_ACCESS_VALUES.includes(value);
}

/** Pick a random technology-access level, optionally softly biased by `preferTags`. `common` is the baseline/most-common value. */
export function pickPlanetTechnologyAccess({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(TECHNOLOGY_ACCESS_ENTRIES, { rng, preferTags })?.value ?? PLANET_TECHNOLOGY_ACCESS.COMMON;
}

export function isPlanetTechnologySpecialty(value) {
  return TECHNOLOGY_SPECIALTIES.some((entry) => entry.value === value);
}

/**
 * Pick up to `count` distinct technology specialties (see
 * `data/technology-specialties.js`), softly biased by `preferTags`.
 * Returns plain value strings (unlike `pickPlanetTraits()`/
 * `pickPlanetHazards()`, which return full entry objects) -- the phase
 * spec's own contract for this field is `technologySpecialties: string[]`.
 * `count: 0` (the common case -- most worlds have no notable specialty)
 * returns `[]` without consulting the RNG at all.
 */
export function pickPlanetTechnologySpecialties({ rng, preferTags = [], count = 0 } = {}) {
  if (!count) return [];
  return weightedPickUniqueN(TECHNOLOGY_SPECIALTIES, count, { rng, preferTags }).map((entry) => entry.value);
}

/**
 * CORRECTED (independent review, round 2): a planet's droid prevalence
 * previously reused `population-profile.js`'s Faction living/droid
 * COMPOSITION model (`LIVING_DROID_COMPOSITION_MODE`) -- but that model
 * describes what SHARE of a group's living members are organic vs.
 * droid, which is the wrong concept for a world. `DROID_ONLY` gave a
 * world a `livingWeight` of 0 while `planet-population.js` went right
 * ahead and generated an ordinary organic species distribution anyway
 * -- the two facts couldn't help but contradict.
 *
 * `PLANET_DROID_PREVALENCE` is the Location-specific concept instead:
 * how automated a world's economy/society is, entirely INDEPENDENT of
 * its organic population. A `very-high` (or fully `automated`) droid
 * prevalence and a Human-majority organic population are perfectly
 * coherent together -- a highly industrialized, heavily droid-staffed
 * world is still full of people. Rolled unconditionally (including for
 * an `UNINHABITED` world -- a fully `automated` derelict mine or an
 * abandoned world of `rare` droid activity are both coherent; see
 * `planets/planet-draft.js`).
 */
export const PLANET_DROID_PREVALENCE = Object.freeze({
  RARE: 'rare',
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  VERY_HIGH: 'very-high',
  AUTOMATED: 'automated'
});

const DROID_PREVALENCE_ENTRIES = Object.freeze([
  { value: PLANET_DROID_PREVALENCE.RARE, weight: 3 },
  { value: PLANET_DROID_PREVALENCE.LOW, weight: 4 },
  { value: PLANET_DROID_PREVALENCE.NORMAL, weight: 5 },
  { value: PLANET_DROID_PREVALENCE.HIGH, weight: 3 },
  { value: PLANET_DROID_PREVALENCE.VERY_HIGH, weight: 1.5 },
  { value: PLANET_DROID_PREVALENCE.AUTOMATED, weight: 0.5 }
]);

const DROID_PREVALENCE_VALUES = Object.freeze(Object.values(PLANET_DROID_PREVALENCE));

export function isPlanetDroidPrevalence(value) {
  return DROID_PREVALENCE_VALUES.includes(value);
}

/** `PLANET_DROID_PREVALENCE` ordered sparsest (0) to most-automated (5), for the context-sensitive soft skew below. */
const DROID_PREVALENCE_INDEX = Object.freeze({
  [PLANET_DROID_PREVALENCE.RARE]: 0,
  [PLANET_DROID_PREVALENCE.LOW]: 1,
  [PLANET_DROID_PREVALENCE.NORMAL]: 2,
  [PLANET_DROID_PREVALENCE.HIGH]: 3,
  [PLANET_DROID_PREVALENCE.VERY_HIGH]: 4,
  [PLANET_DROID_PREVALENCE.AUTOMATED]: 5
});

// PHASE 8D-3A R2 fix 10: rescaled for the 7-value PLANET_TECHNOLOGY_LEVEL --
// the three lowest tiers (primitive/pre-industrial/industrial) push droid
// prevalence down, the two highest (advanced/cutting-edge) push it up;
// frontier/galactic-standard stay neutral (frontier now sits ABOVE
// industrial and is no longer itself a low-tech tier -- see
// `PLANET_TECHNOLOGY_LEVEL`'s own doc).
const DROID_PREVALENCE_TECH_UP = Object.freeze(['advanced', 'cutting-edge']);
const DROID_PREVALENCE_TECH_DOWN = Object.freeze(['primitive', 'pre-industrial', 'industrial']);
const DROID_PREVALENCE_ECONOMY_TAGS = Object.freeze(['industrial', 'manufacturing', 'technology', 'shipbuilding', 'droids', 'military-industrial', 'mining']);

/**
 * PHASE 8D-3A production tuning: a world's `technologyLevel` and
 * economy-sector `tags` now softly skew droid-prevalence weighting --
 * a high-tech industrial/manufacturing/shipbuilding world is somewhat
 * MORE likely to roll `high`/`very-high`/`automated`, a primitive/
 * frontier world somewhat LESS likely to. This is a SOFT skew only
 * (every level stays reachable regardless of context, matching the
 * phase's "context-sensitive weighting, not deterministic stereotypes"
 * instruction: a high-tech world can still roll `rare` droid presence,
 * just less often) -- droid prevalence remains otherwise entirely
 * independent of organic Species demographics, unchanged from round 2.
 *
 * R2 fix 10: `technologyAccess` (how broadly galactic tech reaches this
 * world) now also softly skews this same score -- `ubiquitous` access
 * pushes up, `isolated` access pushes down -- independent of
 * `technologyLevel`'s own contribution (a `galactic-standard`,
 * `ubiquitous`-access world is somewhat more droid-staffed than an
 * equally `galactic-standard` but `isolated` one).
 */
function droidContextScore({ technologyLevel = '', technologyAccess = '', economyTags = [] } = {}) {
  let score = 0;
  if (DROID_PREVALENCE_TECH_UP.includes(technologyLevel)) score += 1;
  if (DROID_PREVALENCE_TECH_DOWN.includes(technologyLevel)) score -= 1;
  if (technologyAccess === PLANET_TECHNOLOGY_ACCESS.UBIQUITOUS) score += 1;
  if (technologyAccess === PLANET_TECHNOLOGY_ACCESS.ISOLATED) score -= 1;
  if (economyTags.some((tag) => DROID_PREVALENCE_ECONOMY_TAGS.includes(tag))) score += 1;
  return score;
}

function applyDroidContextBias(entries, score) {
  if (!score) return entries;
  const direction = score > 0 ? 1 : -1;
  const magnitude = Math.min(Math.abs(score), 2);
  return entries.map((entry) => {
    const distanceFromMid = DROID_PREVALENCE_INDEX[entry.value] - 2.5;
    const multiplier = 1 + Math.max(0, direction * distanceFromMid) * 0.3 * magnitude;
    return { value: entry.value, weight: entry.weight * multiplier };
  });
}

/**
 * Pick a random droid-prevalence level, independent of organic
 * population. Optionally softly skewed by `technologyLevel`/
 * `technologyAccess`/`economyTags` (see `droidContextScore()`) -- all
 * optional; omitting any (or all) falls back to the original
 * context-free weighting.
 */
export function pickPlanetDroidPrevalence({ rng, technologyLevel = '', technologyAccess = '', economyTags = [] } = {}) {
  const score = droidContextScore({ technologyLevel, technologyAccess, economyTags });
  const entries = applyDroidContextBias(DROID_PREVALENCE_ENTRIES, score);
  return weightedPick(entries, { rng })?.value ?? PLANET_DROID_PREVALENCE.NORMAL;
}

export const SETTLEMENT_PATTERN = Object.freeze({
  NONE: 'none',
  SCATTERED_OUTPOSTS: 'scattered-outposts',
  RURAL_VILLAGES: 'rural-villages',
  SINGLE_MAJOR_CITY: 'single-major-city',
  MULTIPLE_CITIES: 'multiple-cities',
  ECUMENOPOLIS: 'ecumenopolis'
});

const SETTLEMENT_PATTERN_VALUES = Object.freeze(Object.values(SETTLEMENT_PATTERN));

export function isSettlementPattern(value) {
  return SETTLEMENT_PATTERN_VALUES.includes(value);
}

/**
 * `populationScale` -> the settlement-pattern entries that could
 * plausibly go with it (deterministic single-entry tables at both
 * extremes -- an uninhabited world is always `none`, a
 * hyper-urbanized world is always an `ecumenopolis` -- so the two
 * facts can never contradict each other on a generated draft).
 */
const SETTLEMENT_PATTERN_ENTRIES_BY_SCALE = Object.freeze({
  [POPULATION_SCALE.UNINHABITED]: Object.freeze([{ value: SETTLEMENT_PATTERN.NONE, weight: 1 }]),
  [POPULATION_SCALE.OUTPOST]: Object.freeze([{ value: SETTLEMENT_PATTERN.SCATTERED_OUTPOSTS, weight: 1 }]),
  [POPULATION_SCALE.SMALL_SETTLEMENT]: Object.freeze([
    { value: SETTLEMENT_PATTERN.SCATTERED_OUTPOSTS, weight: 2 },
    { value: SETTLEMENT_PATTERN.RURAL_VILLAGES, weight: 3 }
  ]),
  [POPULATION_SCALE.SETTLED]: Object.freeze([
    { value: SETTLEMENT_PATTERN.RURAL_VILLAGES, weight: 3 },
    { value: SETTLEMENT_PATTERN.SINGLE_MAJOR_CITY, weight: 3 },
    { value: SETTLEMENT_PATTERN.MULTIPLE_CITIES, weight: 2 }
  ]),
  [POPULATION_SCALE.POPULOUS]: Object.freeze([
    { value: SETTLEMENT_PATTERN.SINGLE_MAJOR_CITY, weight: 2 },
    { value: SETTLEMENT_PATTERN.MULTIPLE_CITIES, weight: 4 },
    { value: SETTLEMENT_PATTERN.ECUMENOPOLIS, weight: 1 }
  ]),
  [POPULATION_SCALE.HYPER_URBANIZED]: Object.freeze([{ value: SETTLEMENT_PATTERN.ECUMENOPOLIS, weight: 1 }])
});

/** Pick a settlement pattern CONSISTENT with the given `populationScale` -- never an independent roll, so the two facts can't contradict. */
export function pickSettlementPattern({ rng, populationScale } = {}) {
  const entries = SETTLEMENT_PATTERN_ENTRIES_BY_SCALE[populationScale] ?? SETTLEMENT_PATTERN_ENTRIES_BY_SCALE[POPULATION_SCALE.SETTLED];
  return weightedPick(entries, { rng })?.value ?? SETTLEMENT_PATTERN.RURAL_VILLAGES;
}
