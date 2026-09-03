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

import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';
import { PLANET_NAME_PREFIXES } from '../data/planet-name-syllables.js';
import { POPULATION_SCALE } from './planet-population.js';

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

export const PLANET_CLIMATE = Object.freeze({
  ARID: 'arid',
  TEMPERATE: 'temperate',
  TROPICAL: 'tropical',
  FRIGID: 'frigid',
  VARIABLE: 'variable',
  HARSH: 'harsh',
  NONE: 'none'
});

const CLIMATE_ENTRIES = Object.freeze([
  { value: PLANET_CLIMATE.ARID, weight: 3, tags: ['desert', 'wasteland'] },
  { value: PLANET_CLIMATE.TEMPERATE, weight: 4, tags: ['forest', 'grassland', 'rural'] },
  { value: PLANET_CLIMATE.TROPICAL, weight: 3, tags: ['jungle', 'wilderness', 'swamp'] },
  { value: PLANET_CLIMATE.FRIGID, weight: 3, tags: ['ice', 'polar'] },
  { value: PLANET_CLIMATE.VARIABLE, weight: 2, tags: [] },
  { value: PLANET_CLIMATE.HARSH, weight: 2, tags: ['lava', 'asteroid', 'gas', 'space'] },
  { value: PLANET_CLIMATE.NONE, weight: 1, tags: ['gas', 'space', 'asteroid'] }
]);

const CLIMATE_VALUES = Object.freeze(Object.values(PLANET_CLIMATE));

export function isPlanetClimate(value) {
  return CLIMATE_VALUES.includes(value);
}

/** Pick a random climate entry, softly biased by biome/tag affinity (typically the world class's own `biomes`+`tags`). */
export function pickPlanetClimate({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(CLIMATE_ENTRIES, { rng, preferTags })?.value ?? PLANET_CLIMATE.TEMPERATE;
}

export const PLANET_HYDROSPHERE = Object.freeze({
  NONE: 'none',
  MINIMAL: 'minimal',
  MODERATE: 'moderate',
  EXTENSIVE: 'extensive',
  WORLD_OCEAN: 'world-ocean'
});

const HYDROSPHERE_ENTRIES = Object.freeze([
  { value: PLANET_HYDROSPHERE.NONE, weight: 3, tags: ['desert', 'wasteland', 'gas', 'space', 'asteroid', 'lava'] },
  { value: PLANET_HYDROSPHERE.MINIMAL, weight: 3, tags: ['desert', 'mountain'] },
  { value: PLANET_HYDROSPHERE.MODERATE, weight: 4, tags: ['forest', 'grassland', 'jungle'] },
  { value: PLANET_HYDROSPHERE.EXTENSIVE, weight: 2, tags: ['water', 'swamp', 'island'] },
  { value: PLANET_HYDROSPHERE.WORLD_OCEAN, weight: 1, tags: ['water', 'island'] }
]);

const HYDROSPHERE_VALUES = Object.freeze(Object.values(PLANET_HYDROSPHERE));

export function isPlanetHydrosphere(value) {
  return HYDROSPHERE_VALUES.includes(value);
}

/** Pick a random hydrosphere entry, softly biased by biome/tag affinity. */
export function pickPlanetHydrosphere({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(HYDROSPHERE_ENTRIES, { rng, preferTags })?.value ?? PLANET_HYDROSPHERE.MODERATE;
}

export const PLANET_TECHNOLOGY_LEVEL = Object.freeze({
  PRIMITIVE: 'primitive',
  FRONTIER: 'frontier',
  STANDARD: 'standard',
  ADVANCED: 'advanced',
  CUTTING_EDGE: 'cutting-edge'
});

const TECHNOLOGY_LEVEL_ENTRIES = Object.freeze([
  { value: PLANET_TECHNOLOGY_LEVEL.PRIMITIVE, weight: 1 },
  { value: PLANET_TECHNOLOGY_LEVEL.FRONTIER, weight: 4 },
  { value: PLANET_TECHNOLOGY_LEVEL.STANDARD, weight: 5 },
  { value: PLANET_TECHNOLOGY_LEVEL.ADVANCED, weight: 3 },
  { value: PLANET_TECHNOLOGY_LEVEL.CUTTING_EDGE, weight: 1 }
]);

const TECHNOLOGY_LEVEL_VALUES = Object.freeze(Object.values(PLANET_TECHNOLOGY_LEVEL));

export function isPlanetTechnologyLevel(value) {
  return TECHNOLOGY_LEVEL_VALUES.includes(value);
}

/** Pick a random technology/development level. */
export function pickPlanetTechnologyLevel({ rng } = {}) {
  return weightedPick(TECHNOLOGY_LEVEL_ENTRIES, { rng })?.value ?? PLANET_TECHNOLOGY_LEVEL.STANDARD;
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
