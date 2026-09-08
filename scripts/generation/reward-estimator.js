/**
 * PHASE 8D-1 — pure, testable suggested-compensation estimator.
 *
 * Produces a TOTAL COMPENSATION VALUE with a full breakdown — not a
 * reward package (see `reward-package.js` for splitting the total into
 * credits/items/vehicles). Every input is explicit; nothing here reads
 * `game.*` or calls another service — a caller resolves party capability
 * (`party-capability.js`), issuer resource multiplier
 * (`organization-metadata.js`), and asset values (a future Store
 * adapter, `buildStoreIndex()`/`resolveStoreCost()`) and passes plain
 * numbers/strings in.
 *
 * Centralized, configurable economy constants live in
 * `REWARD_ECONOMY` — tuning the curve later never requires touching the
 * calculation logic itself.
 *
 * HARD RULES this module enforces:
 *  - More objectives, and harder objectives, MUST increase the
 *    suggested total (via `objective-economy.js`'s
 *    `objectiveRewardWeight()`).
 *  - Objective Difficulty and Faction Scale are separate inputs,
 *    multiplied together, never merged into one number (§7 of the phase
 *    spec) — this module never derives one from the other.
 *  - An acquisition-type asset objective (steal-and-deliver, hijack) adds
 *    a percentage of the asset's value; a keep-the-target objective adds
 *    NO separate acquisition component (the asset itself is the reward —
 *    see `reward-package.js` for how that's expressed) — this is the
 *    "avoid double-counting asset value" rule from the phase spec §11.
 *  - Organization Score/standing is a SMALL bounded adjustment,
 *    never a substitute for Scale (`organization-metadata.js`'s own
 *    header comment; `RELATIONSHIP_REWARD_ADJUSTMENT` stays within
 *    0.90-1.10 except `hostile`, which signals "do not generate a
 *    normal Job" rather than a multiplier).
 */

import { objectiveRewardWeight, TIER_REWARD_WEIGHT, OBJECTIVE_TIER } from './objective-economy.js';
import { ISSUER_TYPE, ISSUER_TYPE_RESOURCE_MULTIPLIER, RELATIONSHIP_REWARD_ADJUSTMENT, scaleResourceMultiplier } from './organization-metadata.js';

/** Centralized, tunable economy constants — not an official SWSE rule. */
export const REWARD_ECONOMY = Object.freeze({
  // Credits of suggested compensation per unit of "objective weight"
  // (see objective-economy.js) at one point of party capability
  // (average party level). A single Standard-difficulty Primary
  // objective (weight 1.00) for a level-1 party capability therefore
  // contributes BASE_CREDITS_PER_CAPABILITY_POINT credits before any
  // issuer/relationship/variance adjustment.
  BASE_CREDITS_PER_CAPABILITY_POINT: 1500,
  // Default acquisition-value percentage for a "steal and deliver to
  // the employer" or "hijack for a buyer" ship/vehicle objective.
  ACQUISITION_ASSET_PERCENT: 0.30,
  // Lower default for "recover this vehicle and return it to its
  // rightful owner" — recovering existing property, not procuring
  // something illegally.
  RECOVERY_ASSET_PERCENT: 0.20,
  // Bounded random variance applied to the final total.
  VARIANCE_MIN: 0.90,
  VARIANCE_MAX: 1.10,
  // If a targeted acquisition asset's raw value exceeds this many times
  // the issuer's BASELINE payout scale (party component x resource
  // multiplier, deliberately independent of the asset's own value --
  // comparing against the final total would be circular, since the
  // total already includes a percentage of the asset itself), the
  // estimate is flagged as an issuer-resource-mismatch diagnostic (§12
  // of the phase spec) rather than silently produced. E.g. a Scale-3
  // organization (baseline payout scale in the low thousands)
  // commissioning theft/delivery of a 300,000-credit starship trips
  // this; a Scale-16 organization affording the same ship does not.
  ISSUER_RESOURCE_MISMATCH_ASSET_MULTIPLE: 20
});

/** How an objective relates to a valued asset (ship/vehicle/item). */
export const ASSET_OBJECTIVE_TYPE = Object.freeze({
  STEAL_AND_DELIVER: 'steal-and-deliver',
  HIJACK_FOR_BUYER: 'hijack-for-buyer',
  RECOVER_FOR_OWNER: 'recover-for-owner',
  SABOTAGE_OR_DESTROY: 'sabotage-or-destroy',
  KEEP_THE_TARGET: 'keep-the-target'
});

export const DIAGNOSTIC = Object.freeze({
  ISSUER_RESOURCE_MISMATCH: 'issuer-resource-mismatch',
  HOSTILE_RELATIONSHIP_NO_NORMAL_JOB: 'hostile-relationship-no-normal-job'
});

/**
 * Resolve the objective-asset component of compensation. Returns
 * `{ component, keepsTarget, targetValue }`. `component` is the CREDIT
 * value the asset contributes to total compensation (0 for
 * keep-the-target and sabotage/destroy, per the no-double-counting
 * rule); `targetValue` is the asset's own raw value, surfaced so
 * `reward-package.js` can express "keep the ship" as the material
 * reward itself rather than a cash figure.
 */
export function computeAssetComponent({ value = 0, objectiveType } = {}) {
  const assetValue = Math.max(0, Number(value) || 0);
  switch (objectiveType) {
    case ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER:
    case ASSET_OBJECTIVE_TYPE.HIJACK_FOR_BUYER:
      return { component: assetValue * REWARD_ECONOMY.ACQUISITION_ASSET_PERCENT, keepsTarget: false, targetValue: 0 };
    case ASSET_OBJECTIVE_TYPE.RECOVER_FOR_OWNER:
      return { component: assetValue * REWARD_ECONOMY.RECOVERY_ASSET_PERCENT, keepsTarget: false, targetValue: 0 };
    case ASSET_OBJECTIVE_TYPE.KEEP_THE_TARGET:
      return { component: 0, keepsTarget: true, targetValue: assetValue };
    case ASSET_OBJECTIVE_TYPE.SABOTAGE_OR_DESTROY:
    default:
      // Not an acquisition objective: the asset's value does not
      // directly scale compensation here; mission importance is
      // already carried by the objective's own tier/difficulty.
      return { component: 0, keepsTarget: false, targetValue: 0 };
  }
}

/** Issuer resource multiplier: Faction issuers use Scale; others use a fixed category multiplier. */
export function issuerResourceMultiplier(issuer = {}) {
  if (issuer?.type === ISSUER_TYPE.FACTION) return scaleResourceMultiplier(issuer.scale);
  return ISSUER_TYPE_RESOURCE_MULTIPLIER[issuer?.type] ?? ISSUER_TYPE_RESOURCE_MULTIPLIER[ISSUER_TYPE.ORDINARY_INDIVIDUAL];
}

/**
 * Relationship/standing multiplier — a SMALL bounded adjustment.
 * `'hostile'` resolves to `null` (not a multiplier): callers should
 * treat that as "do not generate a normal Job," matching
 * `organization-metadata.js`'s own documented semantics.
 */
export function relationshipRewardMultiplier(relationship) {
  if (!relationship) return 1;
  const value = RELATIONSHIP_REWARD_ADJUSTMENT[relationship];
  return value === undefined ? 1 : value;
}

/**
 * Estimate suggested total compensation.
 *
 * @param {object} options
 * @param {number} options.partyCapability - from `party-capability.js`'s `computePartyCapability().capability`.
 * @param {{tier:string, difficulty:string}[]} [options.objectives] - at least one entry expected; an empty array is treated as one Standard Primary objective so a caller never accidentally gets a zero-weight estimate.
 * @param {{type:string, scale?:number}} [options.issuer] - see `ISSUER_TYPE`.
 * @param {string} [options.relationship] - one of `RELATIONSHIP_REWARD_ADJUSTMENT`'s keys.
 * @param {{value:number, objectiveType:string}} [options.asset] - optional valued asset objective (ship/vehicle/item).
 * @param {() => number} [options.rng] - injectable RNG for the variance roll; defaults to `Math.random`.
 * @param {boolean} [options.applyVariance] - set false for a deterministic estimate (variance factor pinned to 1).
 */
export function estimateReward({
  partyCapability = 1,
  objectives = [],
  issuer = { type: ISSUER_TYPE.ORDINARY_INDIVIDUAL },
  relationship = 'neutral',
  asset = null,
  rng = Math.random,
  applyVariance = true
} = {}) {
  const diagnostics = [];

  const effectiveObjectives = Array.isArray(objectives) && objectives.length
    ? objectives
    : [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: 'standard' }];
  const objectiveWeight = effectiveObjectives.reduce((sum, objective) => sum + objectiveRewardWeight(objective), 0);

  const partyComponent = Math.max(0, Number(partyCapability) || 0) * REWARD_ECONOMY.BASE_CREDITS_PER_CAPABILITY_POINT;
  const objectiveComponent = partyComponent * objectiveWeight;

  const resourceMultiplier = issuerResourceMultiplier(issuer);

  const relationshipRaw = relationship ? RELATIONSHIP_REWARD_ADJUSTMENT[relationship] : 1;
  if (relationshipRaw === null) diagnostics.push(DIAGNOSTIC.HOSTILE_RELATIONSHIP_NO_NORMAL_JOB);
  const relationshipMultiplier = relationshipRaw === null || relationshipRaw === undefined ? 1 : relationshipRaw;

  const assetResolution = asset ? computeAssetComponent(asset) : { component: 0, keepsTarget: false, targetValue: 0 };

  const subtotalBeforeVariance = (objectiveComponent + assetResolution.component) * resourceMultiplier * relationshipMultiplier;
  const varianceFactor = applyVariance
    ? REWARD_ECONOMY.VARIANCE_MIN + rng() * (REWARD_ECONOMY.VARIANCE_MAX - REWARD_ECONOMY.VARIANCE_MIN)
    : 1;
  const total = Math.max(0, Math.round(subtotalBeforeVariance * varianceFactor));

  const rawAssetValue = Math.max(0, Number(asset?.value) || 0);
  const baselinePayoutScale = partyComponent * resourceMultiplier;
  if (rawAssetValue > 0 && !assetResolution.keepsTarget && rawAssetValue > baselinePayoutScale * REWARD_ECONOMY.ISSUER_RESOURCE_MISMATCH_ASSET_MULTIPLE) {
    diagnostics.push(DIAGNOSTIC.ISSUER_RESOURCE_MISMATCH);
  }

  return {
    total,
    keepsTarget: assetResolution.keepsTarget,
    targetValue: assetResolution.targetValue,
    breakdown: {
      partyCapability: Math.max(0, Number(partyCapability) || 0),
      partyComponent,
      objectiveWeight,
      objectiveComponent,
      assetComponent: assetResolution.component,
      resourceMultiplier,
      relationshipMultiplier,
      varianceFactor,
      subtotalBeforeVariance
    },
    diagnostics
  };
}
