/**
 * PHASE 8D-2 correction pass — the planet Trade Resolver.
 *
 * Reads the SHARED `data/galactic-commodities.js` catalog (never a
 * planet-specific commodity list) and resolves a world's rolled
 * `primarySector`/`secondarySectors` (`planet-economy.js`),
 * `worldClass` (biomes/tags), `populationScale`/`settlementPattern`,
 * and `stability` into a full economy trade profile:
 *
 * ```
 * Planet Environment + Planet Economy + Population Scale
 *   -> Trade Resolver -> exports + imports + shortages + illicitTrade
 * ```
 *
 * `exports`/`imports` are `{ commodityId, importance }` pairs (never
 * the commodity's own name/details duplicated into the draft) — a
 * caller resolves the rest by looking `commodityId` up in
 * `GALACTIC_COMMODITIES`, the single source of truth. `shortages`/
 * `illicitTrade` are plain `commodityId` arrays.
 *
 * An `UNINHABITED` world (see `planet-population.js`) has NO active
 * trade of any kind — empty arrays across the board, the same
 * empty-not-fabricated discipline `POPULATION_SCALE.UNINHABITED`
 * already established for demographics.
 *
 * A commodity can never appear as BOTH an export and an import in the
 * same resolution -- `demandable` explicitly excludes whatever already
 * got picked as an export (`exportIds`) before rolling imports, so
 * "exports and imports never contradict" is a structural guarantee, not
 * a probabilistic one.
 *
 * PHASE 8D-3A production tuning:
 *  - Shortages (`computeShortages()`) previously derived ONLY from an
 *    import's `scarcityOn` matching the world's biome/tag context. Now
 *    also factor in population PRESSURE (a populous/hyper-urbanized
 *    world strains its own supply chains more) and PRODUCTION
 *    capability (a world with only one economy sector has a thinner
 *    production base) and STABILITY (an unstable/lawless/fractured/...
 *    world's supply chains are less reliable) -- under enough combined
 *    pressure, a shortage can occur even without a direct environmental
 *    scarcity match, and up to two shortages can occur at once. An
 *    environmental scarcity match alone still guarantees at least one
 *    shortage, exactly as before -- this is a strict widening, not a
 *    narrowing, of when shortages occur.
 *  - Illicit trade (`illicitChanceFor()`) previously read ONLY
 *    `stabilityValue` (3 values) and the `black-market`/`spice`
 *    sectors. Now also reads the rolled government's own `tags` (a
 *    `crime-syndicate`-tagged government, e.g. "crime-lord fiefdom,"
 *    raises the chance) and whether `trade` is one of the world's
 *    economy sectors ("port/trade context" -- smuggling piggybacks on
 *    legitimate shipping lanes more easily on a trade-hub world), and
 *    covers the FULL expanded `planet-stability.js` vocabulary (round
 *    2/3 only checked 3 of the original 7 stability values; several new
 *    production values -- `fractured`/`civil-war`/`rebellious`/
 *    `occupied`/`under-blockade`/`corrupt` -- clearly belong in the
 *    same "raises illicit trade" bucket and previously wouldn't have
 *    counted at all).
 */

import { GALACTIC_COMMODITIES } from '../data/galactic-commodities.js';
import { mergeTags } from '../lib/tag-utils.js';
import { weightedPick, weightedPickUniqueN } from '../lib/weighted-random.js';
import { POPULATION_SCALE } from './planet-population.js';
import { SETTLEMENT_PATTERN } from './planet-profile.js';

const RARITY_PICK_WEIGHT = Object.freeze({ common: 4, uncommon: 2, rare: 1, 'very-rare': 0.3 });

/** Settlement pattern -> demand-context tags (an ecumenopolis/city demands very differently from scattered frontier outposts). */
const DEMAND_TAGS_BY_SETTLEMENT_PATTERN = Object.freeze({
  [SETTLEMENT_PATTERN.NONE]: [],
  [SETTLEMENT_PATTERN.SCATTERED_OUTPOSTS]: ['frontier'],
  [SETTLEMENT_PATTERN.RURAL_VILLAGES]: ['rural', 'frontier'],
  [SETTLEMENT_PATTERN.SINGLE_MAJOR_CITY]: ['urban'],
  [SETTLEMENT_PATTERN.MULTIPLE_CITIES]: ['urban'],
  [SETTLEMENT_PATTERN.ECUMENOPOLIS]: ['urban', 'ecumenopolis']
});

/** `planet-stability.js` values that raise shortage/illicit-trade likelihood -- a supply chain (legal or not) is less reliable on a world in any of these conditions. */
const STRAINED_STABILITY_VALUES = Object.freeze(new Set([
  'unstable', 'lawless', 'contested', 'fractured', 'civil-war', 'civil unrest',
  'rebellious', 'occupied', 'under-blockade', 'corrupt', 'popular-unrest', 'succession-crisis', 'economic-crisis'
]));

function sectorSlugs(primarySector, secondarySectors) {
  return [primarySector?.sector, ...(secondarySectors || []).map((s) => s?.sector)].filter(Boolean);
}

function weightOfCommodity(entry) {
  return RARITY_PICK_WEIGHT[entry.rarity] ?? 1;
}

function assignImportance(list) {
  const labels = ['major', 'moderate', 'minor'];
  return list.map((entry, index) => ({ commodityId: entry.id, importance: labels[Math.min(index, labels.length - 1)] }));
}

/**
 * Resolve `shortages` from environment (an import's own `scarcityOn`
 * matching the world's biome/tag context), population pressure,
 * production capability, and stability -- see module doc.
 */
function computeShortages({ importsEntries, scarcityTags, populationScale, stabilityValue, sectorCount, rng }) {
  if (!importsEntries.length) return [];
  const scarcityMatches = importsEntries.filter((entry) => entry.scarcityOn.some((tag) => scarcityTags.includes(tag)));

  let pressure = 0;
  if ([POPULATION_SCALE.POPULOUS, POPULATION_SCALE.HYPER_URBANIZED].includes(populationScale)) pressure += 1;
  if (STRAINED_STABILITY_VALUES.has(stabilityValue)) pressure += 1;
  if (sectorCount <= 1) pressure += 1;

  if (!scarcityMatches.length && pressure === 0) return [];

  const pool = pressure > 0 ? importsEntries : scarcityMatches;
  const shortageChance = scarcityMatches.length ? 1 : Math.min(0.85, 0.25 * pressure);
  if ((rng ?? Math.random)() >= shortageChance) return [];

  const count = pressure >= 2 ? Math.min(2, pool.length) : 1;
  return weightedPickUniqueN(pool, count, { rng, weightOf: weightOfCommodity }).map((entry) => entry.id);
}

/** Resolve the illicit-trade chance from stability, government character, black-market/spice sector presence, and trade/port context -- see module doc. */
function illicitChanceFor({ stabilityValue, sectors, governmentTags }) {
  let chance = 0.15;
  if (STRAINED_STABILITY_VALUES.has(stabilityValue)) chance = Math.max(chance, 0.5);
  if (sectors.includes('black-market') || sectors.includes('spice')) chance = Math.max(chance, 0.55);
  if (governmentTags.includes('crime-syndicate')) chance = Math.max(chance, 0.6);
  if (sectors.includes('trade')) chance += 0.1;
  return Math.min(0.9, chance);
}

/**
 * Resolve a full trade profile: `{ exports, imports, shortages, illicitTrade }`.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {object} options.primarySector - a `planet-economy.js` sector entry.
 * @param {object[]} [options.secondarySectors]
 * @param {object} options.worldClass - the rolled `WORLD_CLASS` entry (`planet-quality-tables.js`), for biome-driven scarcity/production matching.
 * @param {string} options.populationScale - a `POPULATION_SCALE` value.
 * @param {string} options.settlementPattern - a `SETTLEMENT_PATTERN` value.
 * @param {string} [options.stabilityValue] - the rolled `planet-stability.js` value.
 * @param {string[]} [options.governmentTags] - the rolled `planet-government.js` entry's own `tags` -- a `crime-syndicate`-tagged government raises the illicit-trade chance.
 * @param {number} [options.exportCount]
 * @param {number} [options.importCount]
 */
export function generatePlanetTrade({
  rng,
  primarySector,
  secondarySectors = [],
  worldClass,
  populationScale,
  settlementPattern,
  stabilityValue = '',
  governmentTags = [],
  exportCount = 2,
  importCount = 2
} = {}) {
  if (populationScale === POPULATION_SCALE.UNINHABITED) {
    return { exports: [], imports: [], shortages: [], illicitTrade: [] };
  }

  const sectors = sectorSlugs(primarySector, secondarySectors);
  const biomes = worldClass?.biomes ?? [];
  const worldTags = worldClass?.tags ?? [];
  const productionTags = mergeTags(sectors, biomes, worldTags);
  const demandTags = mergeTags(sectors, DEMAND_TAGS_BY_SETTLEMENT_PATTERN[settlementPattern] ?? []);
  const scarcityTags = mergeTags(biomes, worldTags);

  const producible = GALACTIC_COMMODITIES.filter((entry) => entry.producedBy.some((tag) => productionTags.includes(tag)));
  const exportsEntries = weightedPickUniqueN(producible, exportCount, { rng, weightOf: weightOfCommodity });
  const exports = assignImportance(exportsEntries);
  const exportIds = new Set(exportsEntries.map((entry) => entry.id));

  const demandable = GALACTIC_COMMODITIES.filter((entry) => !exportIds.has(entry.id) && entry.demandedBy.some((tag) => demandTags.includes(tag)));
  const importsEntries = weightedPickUniqueN(demandable, importCount, { rng, weightOf: weightOfCommodity });
  const imports = assignImportance(importsEntries);

  const shortages = computeShortages({ importsEntries, scarcityTags, populationScale, stabilityValue, sectorCount: sectors.length, rng });

  const illicitChance = illicitChanceFor({ stabilityValue, sectors, governmentTags });
  const illicitTrade = (rng ?? Math.random)() < illicitChance
    ? (() => {
        const illicitPool = GALACTIC_COMMODITIES.filter((entry) => entry.legality === 'illegal');
        const picked = weightedPick(illicitPool, { rng, weightOf: weightOfCommodity });
        return picked ? [picked.id] : [];
      })()
    : [];

  return { exports, imports, shortages, illicitTrade };
}
