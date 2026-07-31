/**
 * Droid Installation Drift Revision Fingerprint
 *
 * PHASE 2 ADDENDUM (P1-6) — Intent-Based Installation Drift Repair
 * Boundary.
 *
 * Pure, dependency-free construction of a deterministic fingerprint over
 * every actor field a drift-repair apply decision depends on. Used by
 * scripts/domain/droids/droid-installation-reconciler.js to detect that a
 * droid's relevant state changed between when a GM opened the drift
 * report (inspectDroidInstallationDrift()) and when they confirm applying
 * a repair — a concurrent Garage install/removal, a second repair, a mode
 * change, a newly-diagnosed or resolved issue, etc.
 *
 * Reuses scripts/domain/droids/droid-revision-hash.js's stable-serialize-
 * then-hash primitive (the same one droid-reconciliation-revision.js/P1-5
 * uses) rather than duplicating it — the field SET here is different
 * (drift-repair cares about diagnosed issue identities; reconciliation
 * cares about stock-import/reconciliation provenance), but the mechanism
 * is identical.
 *
 * Deliberately excludes volatile fields that change constantly but never
 * affect drift-repair eligibility: HP/damage, token position, chat state,
 * sheet/window state, temporary UI selection, and anything else not
 * explicitly read below.
 */

import { resolveDroidCalculationMode } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { hashRevisionFields } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-revision-hash.js";

// Bump only when the shape of a repair issue/plan changes in a way that
// should invalidate every outstanding drift-inspection revision.
export const DRIFT_REPAIR_SCHEMA_VERSION = 1;

function toItemsArray(items) {
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

/**
 * Every embedded droid-part Item's identity relevant to drift diagnosis —
 * an Item being added/removed/changing canonical id changes the
 * fingerprint; the Item's other fields (name, description, image, etc.)
 * do not.
 */
function droidPartItemIdentities(actor) {
  return toItemsArray(actor?.items)
    .filter(item => item?.system?.droidPartId || item?.flags?.swse?.droidPartId || item?.system?.integrated === true || item?.flags?.swse?.integrated === true)
    .map(item => ({
      id: item.id ?? item._id ?? null,
      canonicalId: item.system?.droidPartId ?? item.flags?.swse?.droidPartId ?? null,
      type: item.type ?? null
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/**
 * Build the deterministic drift-repair revision fingerprint for an
 * actor's CURRENT state.
 *
 * @param {Actor} actor
 * @param {{components: object[]}} resolution - output of
 *   resolveInstalledDroidComponents(actor, ...).
 * @param {{issues: object[]}} diagnosis - output of
 *   diagnoseDroidInstallationDrift(resolution).
 * @param {(issue: object) => string} buildIssueId - deterministic issue-id
 *   builder (production: buildDroidDriftIssueId).
 * @returns {string} an 8-character hex fingerprint
 */
export function buildDroidInstallationDriftRevision(actor, resolution, diagnosis, buildIssueId) {
  const calculationMode = resolveDroidCalculationMode(actor);
  const issueIds = (diagnosis?.issues ?? [])
    .map(issue => (typeof buildIssueId === 'function' ? buildIssueId(issue) : null))
    .filter(Boolean)
    .sort();

  const fields = {
    actorId: actor?.id ?? null,
    calculationMode: calculationMode?.mode ?? null,
    installedSystems: actor?.system?.installedSystems ?? {},
    droidSystems: actor?.system?.droidSystems ?? {},
    droidPartItems: droidPartItemIdentities(actor),
    issueIds,
    schemaVersion: DRIFT_REPAIR_SCHEMA_VERSION
  };

  return hashRevisionFields(fields);
}
