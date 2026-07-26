/**
 * Droid Installation Reconciler
 *
 * PHASE 2 — Droid Authority Consolidation ("stale mirror detection and
 * repair").
 *
 * system.installedSystems is the canonical installation ledger (see
 * docs/audits/droid-authority-consolidation-phase-2.md). As of this phase,
 * every live writer (the Garage, the Upgrade Workshop) deletes a matching
 * embedded Item whenever a canonical part is removed through them, so new
 * drift cannot be created going forward. This module diagnoses — and, on
 * explicit request, repairs — drift that already exists on a droid from
 * BEFORE this phase's code ran (e.g. a component removed through the old
 * Upgrade Workshop code, which deleted the ledger entry but never touched
 * the embedded Item, leaving the Item as the new highest-precedence source
 * once the ledger entry was gone).
 *
 * This intentionally does not run automatically and does not migrate every
 * world Actor: `diagnoseDroidInstallationDrift` is pure/read-only, and
 * `repairDroidInstallationDrift` only acts on the specific canonical ids a
 * caller (a GM, or a debug script) explicitly asks it to repair for one
 * actor at a time — never a blanket "fix everything" sweep.
 */

const ISSUE = Object.freeze({
  ORPHANED_ACTIVE_ITEM: 'orphaned-active-item-without-ledger-entry'
});

/**
 * Diagnose drift on one droid actor's already-resolved component list
 * (pass the output of resolveInstalledDroidComponents). Pure, no imports,
 * no actor access beyond what's already in `resolution`.
 *
 * Currently flags one issue shape: a component whose only sources are an
 * embedded Item (and/or a droidSystems record) with no
 * system.installedSystems entry at all, while that Item reports itself
 * active. This is exactly the shape left behind by a pre-Phase-2 removal
 * that deleted the ledger key but never deleted the Item.
 *
 * @param {{components: object[]}} resolution - Output of resolveInstalledDroidComponents.
 * @returns {{issues: object[]}}
 */
export function diagnoseDroidInstallationDrift(resolution) {
  const issues = [];
  for (const component of resolution?.components ?? []) {
    const hasLedgerSource = component.sources.some(s => s.kind === 'installedLedger');
    const itemSources = component.sources.filter(s => s.kind === 'embeddedItem' && s.active);
    if (!hasLedgerSource && itemSources.length > 0) {
      issues.push({
        code: ISSUE.ORPHANED_ACTIVE_ITEM,
        canonicalId: component.canonicalId,
        itemIds: itemSources.map(s => s.itemId).filter(Boolean),
        message: `"${component.canonicalId}" is mechanically active only because of ${itemSources.length} embedded Item(s) with no system.installedSystems ledger entry. If this Item is a remnant of an installation removed before Phase 2's embedded-Item reconciliation existed, repairing it will delete the Item(s). If it was intentionally added directly (e.g. by a GM), no action is needed.`
      });
    }
  }
  return { issues };
}

export const DROID_INSTALLATION_DRIFT_ISSUE = ISSUE;

/**
 * Apply a repair for specific flagged issues on one actor. Only deletes the
 * exact embedded Item ids named by the caller-selected issues — never a
 * blanket sweep, never applied without the caller (GM/debug tooling)
 * explicitly choosing which canonical ids to repair.
 *
 * @param {Actor} actor
 * @param {object[]} issuesToRepair - A subset of diagnoseDroidInstallationDrift(...).issues
 *   (or any object exposing `itemIds`) that the caller has decided to act on.
 * @returns {Promise<{success: boolean, deletedItemIds: string[], error?: string}>}
 */
export async function repairDroidInstallationDrift(actor, issuesToRepair = []) {
  const itemIds = [...new Set(issuesToRepair.flatMap(issue => issue?.itemIds ?? []))].filter(Boolean);
  if (!actor || itemIds.length === 0) {
    return { success: true, deletedItemIds: [] };
  }

  try {
    const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
    await ActorEngine.applyMutationPlan(actor, { delete: { items: itemIds } }, {
      source: 'repairDroidInstallationDrift',
      validate: true,
      rederive: true
    });
    return { success: true, deletedItemIds: itemIds };
  } catch (err) {
    return { success: false, deletedItemIds: [], error: err?.message ?? String(err) };
  }
}
