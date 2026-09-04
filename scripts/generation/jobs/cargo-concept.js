/**
 * PHASE 8D-2 correction pass — cargo/mission-object generator.
 *
 * CORRECTED (independent review, round 2): cargo previously owned its
 * own free-text vocabulary (`data/cargo-concepts.js`'s original 24
 * entries), duplicating things the shared Galactic Commodity Catalog
 * already covers -- medical supplies, weapons, agricultural equipment,
 * luxury goods, droid parts, fuel cells, starship parts, and so on.
 * That violated the "one commodity vocabulary" goal the catalog was
 * built for (`data/galactic-commodities.js`'s own header: "Planet
 * Trade / Cargo Jobs / Smuggling all read one catalog, never three
 * drifting copies").
 *
 * Cargo concepts now come in two kinds:
 *  - COMMODITY (`pickCommodityCargo()`) resolves by `commodityId`
 *    against `data/galactic-commodities.js` -- the SAME catalog
 *    `planets/planet-trade.js`'s Trade Resolver reads -- rather than a
 *    second copy of its data. Weighted by `rarity` the same way the
 *    Trade Resolver is, so kyber crystals stay rare cargo, not common.
 *  - NARRATIVE (`pickNarrativeCargo()`) draws from the now-trimmed
 *    `data/cargo-concepts.js`, which keeps ONLY genuinely non-commodity
 *    mission objects: a diplomatic pouch, an evidence locker, an
 *    unmarked/mystery crate, passengers or live cargo, a one-off
 *    prototype, and similar -- things with no stable per-unit market
 *    identity a Trade Resolver could ever price.
 *
 * `pickCargoConcept()` is the orchestrator a caller uses when it
 * doesn't need to care about the distinction: it rolls COMMODITY most
 * of the time and NARRATIVE otherwise (`narrativeChance`, default
 * 0.3), always returning one normalized shape:
 * `{ kind, commodityId, value, name, category, tags, legality, rarity }`.
 */

import { GALACTIC_COMMODITIES, COMMODITY_RARITY } from '../data/galactic-commodities.js';
import { NARRATIVE_CARGO_CONCEPTS } from '../data/cargo-concepts.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

const RARITY_PICK_WEIGHT = Object.freeze({
  [COMMODITY_RARITY.COMMON]: 4,
  [COMMODITY_RARITY.UNCOMMON]: 2,
  [COMMODITY_RARITY.RARE]: 1,
  [COMMODITY_RARITY.VERY_RARE]: 0.3
});

function narrativeLegality(tags) {
  if (tags.includes('illegal')) return 'illegal';
  if (tags.includes('gray-area')) return 'restricted';
  return 'legal';
}

/**
 * Pick a COMMODITY cargo concept, resolving by `commodityId` against
 * the shared Galactic Commodity Catalog. Softly biased by `preferTags`
 * (e.g. a planet's economy sector / biome tags); when `legality` is
 * supplied, the pool is restricted to commodities of that legality
 * first (falling back to the full catalog if that empties the pool).
 */
export function pickCommodityCargo({ rng, preferTags = [], legality = '' } = {}) {
  const filtered = legality ? GALACTIC_COMMODITIES.filter((commodity) => commodity.legality === legality) : GALACTIC_COMMODITIES;
  const pool = filtered.length ? filtered : GALACTIC_COMMODITIES;
  const weighted = pool.map((commodity) => ({ ...commodity, weight: RARITY_PICK_WEIGHT[commodity.rarity] ?? 1 }));
  const commodity = weightedPickWithPreference(weighted, { rng, preferTags });
  return {
    kind: 'commodity',
    commodityId: commodity.id,
    value: `a shipment of ${commodity.name}`,
    name: commodity.name,
    category: commodity.category,
    tags: commodity.tags,
    legality: commodity.legality,
    rarity: commodity.rarity
  };
}

/**
 * Pick a NARRATIVE cargo concept -- a mission-specific object with no
 * stable commodity identity (diplomatic pouch, evidence locker,
 * mystery crate, passengers/live cargo, ...).
 */
export function pickNarrativeCargo({ rng, preferTags = [] } = {}) {
  const entry = weightedPickWithPreference(NARRATIVE_CARGO_CONCEPTS, { rng, preferTags });
  return {
    kind: 'narrative',
    commodityId: null,
    value: entry.value,
    name: entry.value,
    category: '',
    tags: entry.tags,
    legality: narrativeLegality(entry.tags),
    rarity: ''
  };
}

/**
 * Pick a cargo concept: COMMODITY most of the time, NARRATIVE
 * otherwise (`narrativeChance`, default 0.3). Use `pickCommodityCargo()`
 * / `pickNarrativeCargo()` directly when a caller needs one kind
 * specifically (e.g. a Smuggling job that only ever wants commodity
 * cargo, or a mission that specifically wants a narrative object).
 */
export function pickCargoConcept({ rng, preferTags = [], legality = '', narrativeChance = 0.3 } = {}) {
  const roll = typeof rng === 'function' ? rng() : Math.random();
  return roll < narrativeChance
    ? pickNarrativeCargo({ rng, preferTags })
    : pickCommodityCargo({ rng, preferTags, legality });
}
