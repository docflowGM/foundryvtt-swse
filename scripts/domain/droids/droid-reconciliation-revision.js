/**
 * Droid Reconciliation Revision Fingerprint
 *
 * PHASE 4 ADDENDUM (P1-5) — Intent-Based Reconciliation Apply Boundary.
 *
 * Pure, dependency-free construction of a deterministic fingerprint over
 * every actor field a reconciliation apply decision depends on. Used by
 * scripts/domain/droids/droid-converted-system-reconciliation-service.js
 * to detect that a droid's relevant state changed between when a GM opened
 * the reconciliation review (inspectReconciliation()) and when they
 * confirm applying it — the reconciliation service's own apply entry
 * point — a concurrent Garage install/removal, a second reconciliation, a
 * mode change, etc. Two calls
 * with the same relevant state always produce the same fingerprint; any
 * change to a field this module reads changes the fingerprint.
 *
 * Deliberately excludes volatile fields that change constantly but never
 * affect reconciliation eligibility: HP/damage, token position, chat
 * state, sheet/window state, and anything else not explicitly read below.
 */

import { resolveDroidCalculationMode } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { hashRevisionFields } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-revision-hash.js";

function toItemsArray(items) {
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

/**
 * Every embedded droid-part-relevant Item's identity, not its full data —
 * an Item being added/removed/changing canonical id, or a stock weapon's
 * sourceStatblock flag flipping (conversion neutralization), changes the
 * fingerprint; the Item's other fields (name, description, image, etc.)
 * do not.
 */
function droidPartItemIdentities(actor) {
  return toItemsArray(actor?.items)
    .filter(item => item?.flags?.swse?.stockDroidAttack || item?.system?.droidPartId || item?.flags?.swse?.droidPartId)
    .map(item => ({
      id: item.id ?? item._id ?? null,
      canonicalId: item.system?.droidPartId ?? item.flags?.swse?.droidPartId ?? null,
      sourceStatblock: item.flags?.swse?.stockDroidAttack?.sourceStatblock ?? null
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/**
 * Build the deterministic reconciliation-revision fingerprint for an
 * actor's CURRENT state.
 *
 * @param {Actor} actor
 * @returns {string} an 8-character hex fingerprint
 */
export function buildDroidReconciliationRevision(actor) {
  const calculationMode = resolveDroidCalculationMode(actor);
  const stockImport = actor?.flags?.swse?.stockDroidImport ?? null;
  const reconciliation = actor?.flags?.swse?.stockDroidReconciliation ?? null;

  const fields = {
    actorId: actor?.id ?? null,
    calculationMode: calculationMode?.mode ?? null,
    installedSystems: actor?.system?.installedSystems ?? {},
    droidSystems: actor?.system?.droidSystems ?? {},
    droidPartItems: droidPartItemIdentities(actor),
    stockImport: stockImport
      ? { schemaVersion: stockImport.schemaVersion ?? null, sourceId: stockImport.sourceId ?? null, importedAt: stockImport.importedAt ?? null }
      : null,
    reconciliation: reconciliation
      ? {
          reconciledAt: reconciliation.reconciledAt ?? null,
          reconciledIds: reconciliation.reconciledIds ?? null,
          snapshotTimestamp: reconciliation.snapshotTimestamp ?? null,
          rolledBackAt: reconciliation.rolledBackAt ?? null
        }
      : null
  };

  return hashRevisionFields(fields);
}
