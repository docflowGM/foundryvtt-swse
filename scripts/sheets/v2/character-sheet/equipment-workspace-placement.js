/**
 * Equipment workspace -- placement assessment and submission (presentation glue, no rules).
 *
 * "Can this weapon go in this hand with this grip?" is answered ONLY by the equipment-state coordinator's read-only plan
 * (planEquipmentIntent): the same hypothetical evaluation through the same reader that a real draw uses. This module maps the plan's status to a
 * display verdict and passes the plan's own messages through. It never evaluates anatomy, occupancy, grip, species permission or action cost.
 *
 * Submission goes through InventoryEngine.requestWeaponPosture (the one inventory entry point for posture); the coordinator re-plans, journals,
 * writes, verifies, spends and finalizes. Nothing here writes a document, and the caller must render only AFTER the authoritative result.
 */
import { planEquipmentIntent, OUTCOME, GRIPS } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js';

export const PLACEMENT_VERDICT = Object.freeze({
  AVAILABLE: 'available',          // plan PLANNED: can be applied now
  CURRENT: 'current',              // plan NO_CHANGE: already in this configuration
  REQUIRES_CHANGE: 'requires-change', // plan CONFLICT_UNRESOLVED: another item must be stowed first (explicit, separate intent)
  INCOMPATIBLE: 'incompatible',    // plan refused / not established
  DEFERRED: 'deferred',            // plan DEFERRED_RULES_REVIEW (e.g. EQ-001): no established rule, nothing written
  CHOICE: 'choice',                // plan CHOICE_REQUIRED: the caller must still choose
  UNKNOWN: 'unknown',              // anything else: never presented as legal
});

const VERDICT_LABEL = Object.freeze({
  [PLACEMENT_VERDICT.AVAILABLE]: 'Available',
  [PLACEMENT_VERDICT.CURRENT]: 'Already set',
  [PLACEMENT_VERDICT.REQUIRES_CHANGE]: 'Requires change',
  [PLACEMENT_VERDICT.INCOMPATIBLE]: 'Incompatible',
  [PLACEMENT_VERDICT.DEFERRED]: 'Deferred for rules review',
  [PLACEMENT_VERDICT.CHOICE]: 'Needs a choice',
  [PLACEMENT_VERDICT.UNKNOWN]: 'Not established',
});

const VERDICT_BY_STATUS = Object.freeze({
  [OUTCOME.PLANNED]: PLACEMENT_VERDICT.AVAILABLE,
  [OUTCOME.NO_CHANGE]: PLACEMENT_VERDICT.CURRENT,
  [OUTCOME.CONFLICT_UNRESOLVED]: PLACEMENT_VERDICT.REQUIRES_CHANGE,
  [OUTCOME.DEFERRED_RULES_REVIEW]: PLACEMENT_VERDICT.DEFERRED,
  [OUTCOME.CHOICE_REQUIRED]: PLACEMENT_VERDICT.CHOICE,
  [OUTCOME.NOT_ESTABLISHED]: PLACEMENT_VERDICT.INCOMPATIBLE,
  [OUTCOME.REJECTED_PRECONDITION]: PLACEMENT_VERDICT.INCOMPATIBLE,
  [OUTCOME.UNRESOLVED_TRANSACTION]: PLACEMENT_VERDICT.INCOMPATIBLE,
});

/** Pure: display verdict of a coordinator plan. Reasons are the plan's own messages and codes. */
export function verdictOfPlan(plan) {
  const verdict = VERDICT_BY_STATUS[plan?.status] ?? PLACEMENT_VERDICT.UNKNOWN;
  const issues = Array.isArray(plan?.issues) ? plan.issues : [];
  const reasons = issues.filter((i) => i && i.severity !== 'info').map((i) => ({ code: i.code, message: i.message, details: i.details ?? {} }));
  const reasonCodes = issues.flatMap((i) => Array.isArray(i?.details?.reasons) ? i.details.reasons : []);
  const affectedItemIds = [...new Set(issues.flatMap((i) => Array.isArray(i?.details?.affectedItemIds) ? i.details.affectedItemIds : []))];
  const conflictItemIds = [...new Set((Array.isArray(plan?.conflicts) ? plan.conflicts : []).flatMap((c) => Array.isArray(c?.itemIds) ? c.itemIds : (c?.itemId ? [c.itemId] : [])))];
  return {
    verdict,
    label: VERDICT_LABEL[verdict],
    status: plan?.status ?? null,
    reasons,
    reasonCodes,
    // the items the coordinator says would collide; the user stows them with their own explicit intent
    blockingItemIds: [...new Set([...affectedItemIds, ...conflictItemIds])],
    action: plan?.action?.required ? { actionType: plan.action.actionType, direction: plan.action.direction } : null,
    choices: Array.isArray(plan?.choices) ? plan.choices : [],
    decisionId: issues.map((i) => i?.details?.decisionId).find(Boolean) ?? null,
  };
}

/**
 * Read-only assessment of drawing `itemId` into `appendageIds` with `grip` (or with every grip the coordinator accepts when `grip` is omitted).
 * @returns {Promise<{itemId:string, appendageIds:string[], results:Array<{grip:string, ...verdict}>}>}
 */
export async function assessPlacement(actor, itemId, appendageIds, { grip = null, plan = planEquipmentIntent, deps = undefined } = {}) {
  const grips = grip ? [grip] : [...GRIPS];
  const results = [];
  for (const g of grips) {
    let p;
    try { p = await plan(actor, { type: 'ready', itemId, appendageIds: [...appendageIds], grip: g }, deps); } catch (err) { p = { status: 'ERROR', issues: [{ code: 'plan-failed', severity: 'blocking', message: String(err?.message ?? err) }] }; }
    results.push({ grip: g, ...verdictOfPlan(p) });
  }
  return { itemId, appendageIds: [...appendageIds], results };
}

/** Submit a placement through the inventory entry point. The coordinator decides; this only forwards and returns the authoritative result. */
export async function submitPlacement(actor, itemId, appendageIds, grip, { requestId = null, deps = undefined, engine = null } = {}) {
  const InventoryEngine = engine ?? (await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js')).InventoryEngine;
  return InventoryEngine.requestWeaponPosture(actor, { type: 'ready', itemId, appendageIds: [...appendageIds], grip }, { requestId, deps });
}

export default { PLACEMENT_VERDICT, verdictOfPlan, assessPlacement, submitPlacement };
