/**
 * PHASE 8D-2 foundation — Faction abstract resource profile.
 *
 * Reuses `organization-metadata.js`'s EXISTING Scale authority
 * (`describeScale()`, `scaleResourceMultiplier()`) rather than
 * inventing a second numeric system: `fundingTier` is a categorical
 * label derived directly from `scaleResourceMultiplier()`'s own fixed
 * multiplier bands (see the lookup below, keyed 1:1 to
 * `SCALE_RESOURCE_MULTIPLIER_BANDS`'s multiplier values), and
 * `reachLabel` is exactly `describeScale()`'s output. `resourceFlavors`
 * (from `data/faction-resource-flavors.js`) is the only genuinely new
 * data this module adds -- WHAT KIND of resources, independent of HOW
 * MUCH.
 */

import { describeScale, scaleResourceMultiplier } from '../organization-metadata.js';
import { FACTION_RESOURCE_FLAVORS } from '../data/faction-resource-flavors.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** `scaleResourceMultiplier()`'s fixed multiplier values -> a categorical funding-tier label. Kept in lockstep with `SCALE_RESOURCE_MULTIPLIER_BANDS` -- if that curve's bands ever change, update this map's keys to match. */
const FUNDING_TIER_BY_MULTIPLIER = Object.freeze({
  0.50: 'meager', 0.70: 'stretched', 0.90: 'modest', 1.00: 'adequate',
  1.35: 'comfortable', 1.60: 'wealthy', 1.90: 'vast', 2.20: 'staggering'
});

/** Categorical funding-tier label for a Faction of the given Scale (1-20). Never a new numeric authority -- purely a label over the existing multiplier curve. */
export function describeFundingTier(scale) {
  const multiplier = scaleResourceMultiplier(scale);
  return FUNDING_TIER_BY_MULTIPLIER[multiplier] ?? 'adequate';
}

/** Pick up to `count` distinct resource-flavor entries (default 1). */
export function pickFactionResourceFlavors({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(FACTION_RESOURCE_FLAVORS, count, { rng, preferTags });
}

/**
 * Build a full resource profile for a Faction of the given Scale:
 * `{ scale, reachLabel, fundingTier, resourceFlavors }`.
 */
export function generateFactionResourceProfile({ scale = 1, rng, preferTags = [], flavorCount = 1 } = {}) {
  return {
    scale,
    reachLabel: describeScale(scale),
    fundingTier: describeFundingTier(scale),
    resourceFlavors: pickFactionResourceFlavors({ rng, preferTags, count: flavorCount })
  };
}
