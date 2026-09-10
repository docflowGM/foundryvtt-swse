/**
 * PHASE 8D-3C correction round 2 — narrative reward-suggestion generator.
 * Thin wrapper over `data/job-reward-suggestions.js`, plus reuse of the
 * EXISTING commodity authority (`cargo-concept.js`'s `pickCommodityCargo()`)
 * for the 'commodity' type -- no new commodity-selection logic, and never
 * a fabricated `commodityId` (see that file's own real-id discipline).
 */

import { JOB_REWARD_SUGGESTIONS } from '../data/job-reward-suggestions.js';
import { pickCommodityCargo } from './cargo-concept.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** ~1-in-6 of any picked suggestion is a real-commodity offer instead of a catalog entry. */
const COMMODITY_SUGGESTION_CHANCE = 1 / 6;

/**
 * Pick up to `count` distinct reward-suggestion entries (default 0).
 * Each returned entry is `{ value, weight, tags, type }` (catalog shape)
 * or, for a commodity roll, `{ value, tags: [], type: 'commodity',
 * commodityId, weight: 1 }` built from a real `galactic-commodities.js`
 * entry. Callers normalize the result through
 * `job-draft.js`'s `createJobRewardSuggestionInstance()` for stable
 * identity, exactly like `pickJobComplications()`'s callers do for
 * complications.
 */
export function pickJobRewardSuggestions({ rng, preferTags = [], jobLegality = '', count = 0 } = {}) {
  const roll = rng ?? Math.random;
  const picks = weightedPickUniqueN(JOB_REWARD_SUGGESTIONS, count, { rng, preferTags });
  return picks.map((entry) => {
    if (entry.type !== 'commodity' && roll() < COMMODITY_SUGGESTION_CHANCE) {
      const commodity = pickCommodityCargo({ rng, preferTags, jobLegality });
      return { value: commodity.value, weight: 1, tags: commodity.tags, type: 'commodity', commodityId: commodity.commodityId };
    }
    return entry;
  });
}
