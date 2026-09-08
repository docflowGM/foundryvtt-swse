/**
 * PHASE 8D-1 — reward package accounting.
 *
 * Splits a `reward-estimator.js` TOTAL COMPENSATION VALUE into a
 * concrete package (credits + material reward assets), enforcing the
 * one accounting rule the phase spec is explicit about:
 *
 *   total compensation value = credits + canonical value of material
 *   reward assets + other explicitly valued compensation
 *
 * A material REWARD asset (e.g. "payment includes a 20,000-credit
 * speeder") is different from an OBJECTIVE asset (e.g. "steal the
 * Silent Horizon and deliver it" — the ship itself is not a reward, its
 * value only informed `estimateReward()`'s total via
 * `computeAssetComponent()`). This module only ever deals with the
 * former. It does not select candidate items/vehicles itself — a future
 * adapter reads real prices through the existing Store authority
 * (`buildStoreIndex()`/`StoreEngine.getInventory()`/
 * `resolveStoreCost()`, confirmed by reconnaissance) and passes already-
 * priced candidates in; this module only does the accounting.
 */

/** Reward composition styles (jobDefaults.rewardStyle may bias which is chosen — Phase 8D-2+ scope). */
export const REWARD_COMPOSITION_STYLE = Object.freeze({
  CASH_HEAVY: 'cash-heavy',
  MIXED: 'mixed',
  EQUIPMENT_HEAVY: 'equipment-heavy',
  ASSET_REWARD: 'asset-reward'
});

/**
 * Build an empty reward package for a given total compensation value.
 * `remainingBudget` starts equal to `totalValue` and is drawn down by
 * `addMaterialReward()` — `credits` fills whatever remains, never the
 * other way around, so cash is always the accounting remainder, not a
 * separately-rolled figure that could double-pay alongside assets.
 */
export function createRewardPackage(totalValue) {
  const total = Math.max(0, Math.round(Number(totalValue) || 0));
  return { totalValue: total, credits: total, materialRewards: [], remainingBudget: total };
}

/**
 * Add one priced material reward (an item/weapon/armor/droid/vehicle —
 * anything with a canonical credit value) to a package. Reduces
 * `credits` by the same amount so the package's total never exceeds
 * `totalValue` (phase spec's explicit 42,000 example: 20,000 credits +
 * a 12,000 weapon + a 10,000 vehicle = 42,000, never 64,000). A reward
 * whose value exceeds the remaining budget is CLAMPED to the remaining
 * budget's worth of credit-equivalent value in the returned entry's
 * `value`, but the caller's `name`/`referenceId` are preserved — this
 * module does not silently drop an over-budget reward, it reports the
 * clamp via the returned package's `warnings`.
 */
export function addMaterialReward(pkg, { name = '', value = 0, referenceId = '', category = '' } = {}) {
  const base = pkg && typeof pkg === 'object' ? pkg : createRewardPackage(0);
  const rawValue = Math.max(0, Math.round(Number(value) || 0));
  const warnings = Array.isArray(base.warnings) ? [...base.warnings] : [];
  const appliedValue = Math.min(rawValue, base.remainingBudget);
  if (appliedValue < rawValue) warnings.push('material-reward-clamped-to-remaining-budget');

  return {
    totalValue: base.totalValue,
    credits: Math.max(0, base.credits - appliedValue),
    materialRewards: [...base.materialRewards, { name: String(name || '').trim(), value: appliedValue, referenceId: String(referenceId || '').trim(), category: String(category || '').trim() }],
    remainingBudget: Math.max(0, base.remainingBudget - appliedValue),
    warnings
  };
}

/**
 * Structural accounting check: does `credits + sum(materialRewards.value)`
 * equal `totalValue`? Used by tests and by a future UI to prove a
 * BUDGETED package (built via `addMaterialReward()`) never silently
 * over- or under-pays. Deliberately NOT used for a keep-the-target
 * package — see `verifyKeepTheTargetPackageAccounting()` below, since a
 * kept asset is a bonus reward outside the normal compensation budget
 * by design, not one more line drawn from it.
 */
export function verifyRewardPackageAccounting(pkg) {
  if (!pkg || typeof pkg !== 'object') return false;
  const materialTotal = (pkg.materialRewards || []).filter((reward) => !reward.isKeptTarget).reduce((sum, reward) => sum + (Number(reward.value) || 0), 0);
  return pkg.credits + materialTotal === pkg.totalValue;
}

/**
 * Accounting check for a keep-the-target package: cash stays exactly at
 * the estimator's total (the kept asset was never added to that total —
 * `estimateReward()`'s `computeAssetComponent()` returns `component: 0`
 * for `KEEP_THE_TARGET`), and exactly one `isKeptTarget` material reward
 * exists whose value matches the estimator's own `targetValue`. This is
 * the "do not double-pay the ship" proof.
 */
export function verifyKeepTheTargetPackageAccounting(pkg, estimateResult) {
  if (!pkg || typeof pkg !== 'object' || !estimateResult?.keepsTarget) return false;
  if (pkg.credits !== estimateResult.total) return false;
  const keptEntries = (pkg.materialRewards || []).filter((reward) => reward.isKeptTarget);
  return keptEntries.length === 1 && keptEntries[0].value === estimateResult.targetValue;
}

/**
 * Express a "keep the target" reward (phase spec: stealing a ship and
 * being allowed to keep it IS the material reward — no separate
 * acquisition cash component was added by `estimateReward()`, so this
 * function builds a package whose sole material reward is the kept
 * asset, with the small remaining `objectiveComponent`-derived total as
 * cash). `targetValue`/`assetName` come straight from
 * `estimateReward()`'s `targetValue`/a caller-supplied name.
 */
export function createKeepTheTargetPackage(estimateResult, { assetName = '', referenceId = '', category = '' } = {}) {
  const pkg = createRewardPackage(estimateResult?.total ?? 0);
  if (!estimateResult?.keepsTarget || !(estimateResult.targetValue > 0)) return pkg;
  // The kept asset is reported at its own value for transparency, but is
  // NOT drawn from the cash budget (it was never added to totalValue by
  // the estimator) -- credits stays at the full suggested total.
  return {
    ...pkg,
    materialRewards: [...pkg.materialRewards, { name: assetName, value: estimateResult.targetValue, referenceId, category: category || 'kept-target', isKeptTarget: true }]
  };
}
