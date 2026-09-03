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
 */

import { GALACTIC_COMMODITIES } from '../data/galactic-commodities.js';
import { mergeTags } from '../lib/tag-utils.js';
import { weightedPick, weightedPickUniqueN, pickRandom } from '../lib/weighted-random.js';
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
 * Resolve a full trade profile: `{ exports, imports, shortages, illicitTrade }`.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {object} options.primarySector - a `planet-economy.js` sector entry.
 * @param {object[]} [options.secondarySectors]
 * @param {object} options.worldClass - the rolled `WORLD_CLASS` entry (`planet-quality-tables.js`), for biome-driven scarcity/production matching.
 * @param {string} options.populationScale - a `POPULATION_SCALE` value.
 * @param {string} options.settlementPattern - a `SETTLEMENT_PATTERN` value.
 * @param {string} [options.stabilityValue] - the rolled `planet-stability.js` value; `'unstable'`/`'lawless'`/`'contested'` raise the illicit-trade chance.
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

  const shortageCandidates = importsEntries.filter((entry) => entry.scarcityOn.some((tag) => scarcityTags.includes(tag)));
  const shortages = shortageCandidates.length ? [pickRandom(shortageCandidates, { rng }).id] : [];

  const illicitChance = ['unstable', 'lawless', 'contested'].includes(stabilityValue) || sectors.includes('black-market') || sectors.includes('spice') ? 0.5 : 0.15;
  const illicitTrade = (rng ?? Math.random)() < illicitChance
    ? (() => {
        const illicitPool = GALACTIC_COMMODITIES.filter((entry) => entry.legality === 'illegal');
        const picked = weightedPick(illicitPool, { rng, weightOf: weightOfCommodity });
        return picked ? [picked.id] : [];
      })()
    : [];

  return { exports, imports, shortages, illicitTrade };
}
