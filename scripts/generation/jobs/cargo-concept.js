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
 *
 * CORRECTED (round 3): two more foundation-contract gaps, matching the
 * round-2-style dead-affinity bug already fixed once for POIs:
 *
 *  1. `preferTags` was matched only against `commodity.tags`, never
 *     `producedBy`/`demandedBy` -- but a commodity's actual economic/
 *     environmental affinity mostly lives in THOSE two fields (e.g.
 *     `iron-ore` carries `tags: ['raw-materials']` but
 *     `producedBy: ['mining', 'mountain']`), so passing
 *     `preferTags: ['mining', 'mountain']` never actually biased
 *     anything. `commodityPreferenceWeight()` now boosts against
 *     `tags`+`producedBy`+`demandedBy` merged together.
 *  2. The old `legality` parameter compared directly against
 *     `commodity.legality` (`legal`/`restricted`/`illegal`), but a Job
 *     caller thinks in `JOB_LEGALITY` terms
 *     (`legal`/`gray-area`/`illegal`/`black-market` --
 *     `jobs/job-legality-visibility.js`). The two vocabularies aren't
 *     the same: `gray-area`/`black-market` have no matching commodity
 *     legality at all, so a caller passing either silently emptied the
 *     filtered pool and fell back to the FULL unfiltered catalog with
 *     no signal anything went wrong. `pickCommodityCargo()`/
 *     `pickNarrativeCargo()`/`pickCargoConcept()` now take an explicit
 *     `jobLegality` (a real `JOB_LEGALITY` value) and translate it via
 *     `JOB_LEGALITY_TO_COMMODITY_LEGALITY`/
 *     `JOB_LEGALITY_TO_NARRATIVE_LEGALITY` rather than comparing two
 *     different vocabularies as if they were secretly identical.
 *     `pickCargoConcept()` also now actually forwards `jobLegality` to
 *     `pickNarrativeCargo()` -- previously dropped entirely on the
 *     narrative branch, so a `legal`-only Job could still roll an
 *     "unmarked crate -- contents unknown" narrative object tagged
 *     `illegal`.
 */

import { GALACTIC_COMMODITIES, COMMODITY_RARITY, COMMODITY_LEGALITY } from '../data/galactic-commodities.js';
import { NARRATIVE_CARGO_CONCEPTS } from '../data/cargo-concepts.js';
import { JOB_LEGALITY } from './job-legality-visibility.js';
import { mergeTags } from '../lib/tag-utils.js';
import { weightedPick } from '../lib/weighted-random.js';

const RARITY_PICK_WEIGHT = Object.freeze({
  [COMMODITY_RARITY.COMMON]: 4,
  [COMMODITY_RARITY.UNCOMMON]: 2,
  [COMMODITY_RARITY.RARE]: 1,
  [COMMODITY_RARITY.VERY_RARE]: 0.3
});

/**
 * A Job's `legality` and a commodity's `legality` are different
 * vocabularies (see module doc) -- this translates a `JOB_LEGALITY`
 * value into the SET of `COMMODITY_LEGALITY` values acceptable for it,
 * rather than pretending the two are interchangeable strings.
 * `ILLEGAL` accepts both `illegal` and `restricted` (a Job that's
 * flatly illegal can still plausibly move merely-restricted goods);
 * `BLACK_MARKET` is narrowed to `illegal` only -- the most severe tier.
 */
const JOB_LEGALITY_TO_COMMODITY_LEGALITY = Object.freeze({
  [JOB_LEGALITY.LEGAL]: Object.freeze([COMMODITY_LEGALITY.LEGAL]),
  [JOB_LEGALITY.GRAY_AREA]: Object.freeze([COMMODITY_LEGALITY.RESTRICTED]),
  [JOB_LEGALITY.ILLEGAL]: Object.freeze([COMMODITY_LEGALITY.ILLEGAL, COMMODITY_LEGALITY.RESTRICTED]),
  [JOB_LEGALITY.BLACK_MARKET]: Object.freeze([COMMODITY_LEGALITY.ILLEGAL])
});

/** Same translation idea for `NARRATIVE_CARGO_CONCEPTS`, whose own `tags` already use a `legal`/`gray-area`/`illegal` flavor vocabulary (no `restricted`/`black-market` distinction at that granularity). */
const JOB_LEGALITY_TO_NARRATIVE_LEGALITY = Object.freeze({
  [JOB_LEGALITY.LEGAL]: Object.freeze(['legal']),
  [JOB_LEGALITY.GRAY_AREA]: Object.freeze(['gray-area']),
  [JOB_LEGALITY.ILLEGAL]: Object.freeze(['illegal']),
  [JOB_LEGALITY.BLACK_MARKET]: Object.freeze(['illegal', 'gray-area'])
});

function narrativeLegality(tags) {
  if (tags.includes('illegal')) return 'illegal';
  if (tags.includes('gray-area')) return 'restricted';
  return 'legal';
}

/** Weight a commodity for `preferTags` matching against its FULL affinity surface (`tags`+`producedBy`+`demandedBy`), not `tags` alone. */
function commodityPreferenceWeight(commodity, preferTags, preferenceBoost) {
  const base = RARITY_PICK_WEIGHT[commodity.rarity] ?? 1;
  if (!preferTags.length) return base;
  const affinitySurface = mergeTags(commodity.tags, commodity.producedBy, commodity.demandedBy);
  return base * (preferTags.some((tag) => affinitySurface.includes(tag)) ? preferenceBoost : 1);
}

/**
 * Pick a COMMODITY cargo concept, resolving by `commodityId` against
 * the shared Galactic Commodity Catalog. Softly biased by `preferTags`
 * against the commodity's full affinity surface (`tags`+`producedBy`+
 * `demandedBy`) -- e.g. a planet's economy-sector/biome tags. When
 * `jobLegality` (a `JOB_LEGALITY` value) is supplied, the pool is
 * restricted to the matching `COMMODITY_LEGALITY` set first (see
 * `JOB_LEGALITY_TO_COMMODITY_LEGALITY`), falling back to the full
 * catalog only if that translation would otherwise empty the pool.
 */
export function pickCommodityCargo({ rng, preferTags = [], jobLegality = '' } = {}) {
  const allowedLegalities = jobLegality ? JOB_LEGALITY_TO_COMMODITY_LEGALITY[jobLegality] ?? null : null;
  const filtered = allowedLegalities ? GALACTIC_COMMODITIES.filter((commodity) => allowedLegalities.includes(commodity.legality)) : GALACTIC_COMMODITIES;
  const pool = filtered.length ? filtered : GALACTIC_COMMODITIES;
  const commodity = weightedPick(pool, { rng, weightOf: (entry) => commodityPreferenceWeight(entry, preferTags, 3) });
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
 * mystery crate, passengers/live cargo, ...). When `jobLegality` is
 * supplied, restricted to entries whose own flavor `tags` intersect
 * the translated narrative-legality set (see
 * `JOB_LEGALITY_TO_NARRATIVE_LEGALITY`), falling back to the full pool
 * only if that would otherwise empty it.
 */
export function pickNarrativeCargo({ rng, preferTags = [], jobLegality = '' } = {}) {
  const allowedNarrativeLegalities = jobLegality ? JOB_LEGALITY_TO_NARRATIVE_LEGALITY[jobLegality] ?? null : null;
  const filtered = allowedNarrativeLegalities
    ? NARRATIVE_CARGO_CONCEPTS.filter((entry) => entry.tags.some((tag) => allowedNarrativeLegalities.includes(tag)))
    : NARRATIVE_CARGO_CONCEPTS;
  const pool = filtered.length ? filtered : NARRATIVE_CARGO_CONCEPTS;
  const entry = weightedPick(pool, { rng, weightOf: (e) => Number(e?.weight ?? 1) * (preferTags.length && e.tags.some((tag) => preferTags.includes(tag)) ? 3 : 1) });
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
 * `jobLegality`, when supplied, is forwarded to WHICHEVER kind gets
 * picked -- CORRECTED (round 3): previously dropped entirely on the
 * narrative branch, so a legal-only Job could still roll an illegal
 * narrative object.
 */
export function pickCargoConcept({ rng, preferTags = [], jobLegality = '', narrativeChance = 0.3 } = {}) {
  const roll = typeof rng === 'function' ? rng() : Math.random();
  return roll < narrativeChance
    ? pickNarrativeCargo({ rng, preferTags, jobLegality })
    : pickCommodityCargo({ rng, preferTags, jobLegality });
}
