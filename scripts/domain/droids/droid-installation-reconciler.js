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
 * `repairDroidInstallationDrift` only acts on the specific issues a GM has
 * explicitly selected for one actor at a time — never a blanket "fix
 * everything" sweep.
 *
 * PHASE 2 ADDENDUM (P1-6) — Intent-Based Installation Drift Repair
 * Boundary. `repairDroidInstallationDrift()` used to accept a caller-held
 * list of issue objects (each carrying authoritative embedded Item ids)
 * and delete exactly those ids — a caller could submit fabricated,
 * stale, or cross-Actor Item ids with no verification at all. It now
 * takes reconciliation INTENT ({actorId, selectedIssueIds,
 * inspectionRevision}) instead: the service rereads the actor's current
 * installation state, reruns diagnosis, validates the selection against
 * that fresh diagnosis, and derives every deleted embedded Item id
 * internally. See docs/audits/droid-authority-consolidation-phase-2.md's
 * "P1-6" section for the full contract.
 */

import { resolveDroidCalculationMode } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { resolveInstalledDroidComponents } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";
import { getDroidPartDefinition, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { buildDroidInstallationDriftRevision } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installation-drift-revision.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SnapshotManager } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const ISSUE = Object.freeze({
  ORPHANED_ACTIVE_ITEM: 'orphaned-active-item-without-ledger-entry'
});

// One narrow, named internal repair strategy per issue type — never a
// blanket "delete everything the issue mentions." Only one issue type
// exists today; adding another must add its own case here, not fall
// through to a generic deletion.
const DRIFT_REPAIR_STRATEGY = Object.freeze({
  DELETE_ORPHANED_ITEM: 'delete-orphaned-embedded-item'
});

// Stable issue-id prefixes, keyed by diagnosis issue code. Deliberately
// NOT derived from embedded Item ids — two inspections of the same
// unrepaired drift problem must always produce the same issue id.
const ISSUE_ID_PREFIX = Object.freeze({
  [ISSUE.ORPHANED_ACTIVE_ITEM]: 'orphaned-embedded-item'
});

const DRIFT_REPAIR_SNAPSHOT_LABEL = 'Pre-repair snapshot (Droid Installation Drift Repair)';

function canActOnDriftRepair(actor) {
  return Boolean(game?.user?.isGM) || actor?.isOwner === true;
}

function itemsArray(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

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
export const DROID_DRIFT_REPAIR_STRATEGY = DRIFT_REPAIR_STRATEGY;

/**
 * Build a deterministic, stable issue id from semantic drift facts (issue
 * type + canonical component id) — never from embedded Item ids, which
 * can change across repeated inspections of the same underlying problem.
 * The same unchanged drift problem always produces the same issue id.
 *
 * @param {{code: string, canonicalId: string}} issue
 * @returns {string}
 */
export function buildDroidDriftIssueId(issue) {
  const prefix = ISSUE_ID_PREFIX[issue?.code] ?? 'unknown-drift-issue';
  const canonicalId = issue?.canonicalId ? String(issue.canonicalId) : 'unknown';
  return `${prefix}:${canonicalId}`;
}

/**
 * Normalize a caller-supplied repair intent's shape: trims/dedupes
 * `selectedIssueIds`, trims `actorId`/`inspectionRevision`. Pure — does
 * not validate the ids against any diagnosis (see
 * validateDriftRepairSelection for that).
 *
 * @param {object} intent
 * @returns {{actorId: string, selectedIssueIds: string[], inspectionRevision: string}}
 */
export function normalizeDriftRepairIntent(intent) {
  const actorId = typeof intent?.actorId === 'string' ? intent.actorId.trim() : '';
  const rawList = Array.isArray(intent?.selectedIssueIds) ? intent.selectedIssueIds : [];
  const seen = new Set();
  const selectedIssueIds = [];
  for (const raw of rawList) {
    const id = typeof raw === 'string' ? raw.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    selectedIssueIds.push(id);
  }
  const inspectionRevision = typeof intent?.inspectionRevision === 'string' ? intent.inspectionRevision.trim() : '';
  return { actorId, selectedIssueIds, inspectionRevision };
}

/**
 * Validate a caller's selected issue ids against a freshly-diagnosed
 * issue map (P1-6). Rejects empty selections, unknown ids, and anything
 * not present in the fresh diagnosis — fails the whole selection closed
 * rather than silently dropping invalid entries.
 *
 * @param {string[]} selectedIssueIds - already normalized (see
 *   normalizeDriftRepairIntent).
 * @param {Map<string, object>} issuesById - from a FRESH diagnosis.
 * @returns {{success: true, validated: {issueId: string, issue: object}[]}|{success: false, code: string, error: string}}
 */
export function validateDriftRepairSelection(selectedIssueIds, issuesById) {
  const rawList = Array.isArray(selectedIssueIds) ? selectedIssueIds : [];
  if (rawList.length === 0) {
    return { success: false, code: 'DRIFT_REPAIR_INVALID_SELECTION', error: 'No drift issues were selected to repair.' };
  }

  const validated = [];
  for (const issueId of rawList) {
    if (!issueId) {
      return { success: false, code: 'DRIFT_REPAIR_INVALID_SELECTION', error: 'Selected issue id is empty or invalid.' };
    }
    const issue = issuesById?.get ? issuesById.get(issueId) : undefined;
    if (!issue) {
      return { success: false, code: 'DRIFT_REPAIR_INVALID_SELECTION', error: `"${issueId}" is not one of this droid's current repairable drift issues. Refresh the drift report before applying repairs.` };
    }
    validated.push({ issueId, issue });
  }

  if (validated.length === 0) {
    return { success: false, code: 'DRIFT_REPAIR_INVALID_SELECTION', error: 'No selected issue was eligible for repair.' };
  }

  return { success: true, validated };
}

/**
 * Independently re-verify every embedded Item id a diagnosed issue names,
 * directly against the target actor's CURRENT embedded Items — never
 * trusting `issue.itemIds` merely because it appeared on a diagnosis
 * object. An id only survives if an Item with that id currently exists on
 * THIS actor and its own resolved canonical id still matches the issue's
 * canonicalId. Anything that fails this check is silently dropped from
 * the returned list (the caller compares the returned list's length
 * against the issue's claimed item count to detect a mismatch and abort).
 *
 * @param {{canonicalId: string, itemIds: string[]}} issue - from a FRESH diagnosis.
 * @param {Actor} actor
 * @returns {string[]} verified embedded Item ids belonging to `actor`.
 */
export function deriveRepairItemIds(issue, actor) {
  const candidateIds = new Set((issue?.itemIds ?? []).filter(Boolean));
  if (candidateIds.size === 0) return [];
  const verified = [];
  for (const item of itemsArray(actor)) {
    const itemId = item?.id ?? item?._id ?? null;
    if (!itemId || !candidateIds.has(itemId)) continue;
    const rawId = item?.system?.droidPartId ?? item?.flags?.swse?.droidPartId ?? item?.system?.droidPart?.id ?? item?.name;
    const canonicalId = normalizeDroidPartId(rawId);
    if (canonicalId !== issue.canonicalId) continue;
    verified.push(itemId);
  }
  return verified;
}

/**
 * One narrow internal repair strategy per issue type. Never "delete
 * everything the issue mentions" as a generic default — an issue type
 * this switch does not recognize deletes nothing.
 *
 * @param {{code: string}} issue
 * @param {string[]} verifiedItemIds
 * @returns {{deleteItemIds: string[]}}
 */
function buildRepairStepsForIssue(issue, verifiedItemIds) {
  switch (issue?.code) {
    case ISSUE.ORPHANED_ACTIVE_ITEM:
      // Delete only the stale, independently-verified orphaned Item(s).
      // installedSystems/droidSystems are untouched — this issue type has
      // no ledger or projection entry to correct, by definition (that is
      // exactly what makes it "orphaned").
      return { deleteItemIds: verifiedItemIds };
    default:
      return { deleteItemIds: [] };
  }
}

/**
 * Build the full internal diagnosis for one actor: resolution, drift
 * issues, an issueId-keyed lookup map, and the current revision
 * fingerprint. Internal only — the itemIds this exposes on each issue are
 * for the repair path's own use, never returned to a caller via the
 * public inspectDroidInstallationDrift() view model.
 *
 * @param {Actor} actor
 * @returns {{resolution: object, diagnosis: {issues: object[]}, issuesById: Map<string, object>, inspectionRevision: string}}
 */
function buildInternalDriftDiagnosis(actor) {
  const resolution = resolveInstalledDroidComponents(actor, {
    normalizeId: normalizeDroidPartId,
    getDefinition: (id) => getDroidPartDefinition(id)
  });
  const diagnosis = diagnoseDroidInstallationDrift(resolution);
  const issuesById = new Map();
  for (const issue of diagnosis.issues) {
    issuesById.set(buildDroidDriftIssueId(issue), issue);
  }
  const inspectionRevision = buildDroidInstallationDriftRevision(actor, resolution, diagnosis, buildDroidDriftIssueId);
  return { resolution, diagnosis, issuesById, inspectionRevision };
}

/**
 * Read-only inspection of a droid's current installation drift, for a GM
 * to review before selecting issues to repair. Never exposes embedded
 * Item ids in the public view model — those are derived and
 * independently re-verified internally by repairDroidInstallationDrift()
 * at apply time, not trusted from this inspection.
 *
 * @param {Actor} actor
 * @returns {{actorId: string|null, actorName: string|null, inspectionRevision: string|null, calculationMode: object, issues: object[], warnings: string[]}}
 */
export function inspectDroidInstallationDrift(actor) {
  const calculationMode = resolveDroidCalculationMode(actor);

  if (!actor || actor.type !== 'droid') {
    return { actorId: actor?.id ?? null, actorName: actor?.name ?? null, inspectionRevision: null, calculationMode, issues: [], warnings: ['Not a droid actor'] };
  }

  const { resolution, diagnosis, issuesById, inspectionRevision } = buildInternalDriftDiagnosis(actor);

  const issues = [...issuesById.entries()].map(([issueId, issue]) => {
    const definition = getDroidPartDefinition(issue.canonicalId);
    return {
      issueId,
      canonicalId: issue.canonicalId,
      name: definition?.name ?? issue.canonicalId,
      issueType: issue.code,
      severity: 'warning',
      repairable: true,
      blockedReason: null,
      sourceSummary: `${issue.itemIds.length} embedded Item(s) with no system.installedSystems ledger entry`,
      recommendedRepair: DRIFT_REPAIR_STRATEGY.DELETE_ORPHANED_ITEM
    };
  });

  return {
    actorId: actor.id,
    actorName: actor.name,
    inspectionRevision,
    calculationMode,
    issues,
    warnings: [...resolution.warnings]
  };
}

const REJECTED_LEGACY_INTENT_KEYS = ['itemIds', 'embeddedItemIds', 'itemUuids', 'uuids'];

function containsLegacyPlanShape(intent) {
  if (!intent || typeof intent !== 'object') return false;
  if (REJECTED_LEGACY_INTENT_KEYS.some(key => Array.isArray(intent[key]))) return true;
  if (intent.mutationPlan || intent.delete || intent.installedSystems || intent.droidSystems) return true;
  return false;
}

/**
 * Repair a droid's installation drift from caller-submitted INTENT —
 * never a caller-supplied list of embedded Item ids or a mutation plan
 * (P1-6). The caller submits only which droid, which drift issue ids,
 * and which inspection they reviewed —
 * `{actorId, selectedIssueIds, inspectionRevision}` — and this function
 * independently rereads the actor's current state, re-verifies every
 * trust boundary, and derives every deleted embedded Item id itself:
 *
 *   1. Reject a caller-supplied Item-id list / mutation plan outright
 *      (old-API shape).
 *   2. Verify the actor exists, is type droid, and its id matches
 *      intent.actorId.
 *   3. Verify the current user has GM/owner permission on THIS actor.
 *   4. Recompute the actor's current drift-repair revision fingerprint
 *      and compare it to intent.inspectionRevision — a mismatch means the
 *      droid's installation state changed since the review was opened,
 *      and is rejected rather than merged.
 *   5. Validate the selected issue ids against a FRESH diagnosis of the
 *      actor's current issues (not anything cached).
 *   6. Immediately before mutating: reread the Actor from `game.actors`
 *      (if available), rerun diagnosis one more time, and re-verify the
 *      selection is still valid — closing the gap opened by the
 *      snapshot-creation await.
 *   7. Independently re-verify every derived embedded Item id against the
 *      actor's current Items before deleting anything.
 *
 * Snapshots first (SnapshotManager, same store the reconciliation/
 * conversion services already use), applies through
 * ActorEngine.applyMutationPlan(), and rolls back on failure. P1-7
 * (snapshot restoration exactness) remains separately deferred — this
 * repair path does not change or improve that guarantee.
 *
 * @param {Actor} actor
 * @param {{actorId: string, selectedIssueIds: string[], inspectionRevision: string}} intent
 * @param {object} [options]
 * @returns {Promise<{success: boolean, code?: string, error?: string, actorId?: string, noOp?: boolean, appliedIssueIds?: string[], deletedItemIds?: string[], repairedCanonicalIds?: string[], previousRevision?: string, resultingRevision?: string, mutationSummary?: object}>}
 */
export async function repairDroidInstallationDrift(actor, intent = {}, options = {}) {
  const actorId = actor?.id ?? null;

  if (containsLegacyPlanShape(intent)) {
    return { success: false, code: 'DRIFT_REPAIR_INVALID_SELECTION', error: 'Caller-supplied drift-repair Item IDs and mutation plans are no longer accepted. Submit repair intent instead.', actorId };
  }

  if (!actor || actor.type !== 'droid') {
    return { success: false, code: 'DRIFT_REPAIR_WRONG_ACTOR_TYPE', error: 'Not a droid actor', actorId };
  }

  const normalized = normalizeDriftRepairIntent(intent);
  if (!normalized.actorId || normalized.actorId !== actor.id) {
    return { success: false, code: 'DRIFT_REPAIR_ACTOR_MISMATCH', error: 'This repair intent does not match the target Actor.', actorId: actor.id };
  }

  if (!canActOnDriftRepair(actor)) {
    return { success: false, code: 'DRIFT_REPAIR_PERMISSION_DENIED', error: "Only the GM or an owner may repair this droid's installation drift.", actorId: actor.id };
  }

  const initial = buildInternalDriftDiagnosis(actor);
  if (!normalized.inspectionRevision || normalized.inspectionRevision !== initial.inspectionRevision) {
    return {
      success: false,
      code: 'DRIFT_REPAIR_STALE',
      error: "The droid's installation state changed after this repair review was opened. Refresh the drift report before applying repairs.",
      actorId: actor.id
    };
  }

  const selectionResult = validateDriftRepairSelection(normalized.selectedIssueIds, initial.issuesById);
  if (!selectionResult.success) {
    return { success: false, code: selectionResult.code, error: selectionResult.error, actorId: actor.id };
  }

  // TOCTOU protection: reread the Actor from the world (if a world
  // registry is available — always true in a live Foundry client) and
  // rerun diagnosis one more time, immediately before mutating, so a
  // change that happened during the snapshot-creation await below cannot
  // slip an approved-but-now-stale repair through.
  const hasWorldRegistry = typeof game?.actors?.get === 'function';
  if (hasWorldRegistry && !game.actors.get(actor.id)) {
    return { success: false, code: 'DRIFT_REPAIR_ACTOR_MISMATCH', error: 'This Actor is no longer present in the world.', actorId: actor.id };
  }
  const liveActor = hasWorldRegistry ? (game.actors.get(actor.id) ?? actor) : actor;

  const final = buildInternalDriftDiagnosis(liveActor);
  if (final.inspectionRevision !== initial.inspectionRevision) {
    return {
      success: false,
      code: 'DRIFT_REPAIR_STALE',
      error: "The droid's installation state changed after this repair review was opened. Refresh the drift report before applying repairs.",
      actorId: actor.id
    };
  }

  const deletedItemIds = [];
  const appliedIssueIds = [];
  const repairedCanonicalIds = [];
  for (const { issueId } of selectionResult.validated) {
    const freshIssue = final.issuesById.get(issueId);
    if (!freshIssue) {
      return {
        success: false,
        code: 'DRIFT_REPAIR_STALE',
        error: "The droid's installation state changed after this repair review was opened. Refresh the drift report before applying repairs.",
        actorId: actor.id
      };
    }
    const verifiedItemIds = deriveRepairItemIds(freshIssue, liveActor);
    if (verifiedItemIds.length !== (freshIssue.itemIds?.length ?? 0)) {
      return {
        success: false,
        code: 'DRIFT_REPAIR_ITEM_VALIDATION_FAILED',
        error: `One or more Items for "${issueId}" could not be independently verified against the current Actor state.`,
        actorId: actor.id
      };
    }
    const { deleteItemIds } = buildRepairStepsForIssue(freshIssue, verifiedItemIds);
    deletedItemIds.push(...deleteItemIds);
    appliedIssueIds.push(issueId);
    repairedCanonicalIds.push(freshIssue.canonicalId);
  }

  const uniqueDeleteIds = [...new Set(deletedItemIds)];
  if (uniqueDeleteIds.length === 0) {
    return {
      success: true,
      noOp: true,
      actorId: actor.id,
      appliedIssueIds: [],
      deletedItemIds: [],
      repairedCanonicalIds: [],
      previousRevision: initial.inspectionRevision,
      resultingRevision: final.inspectionRevision,
      mutationSummary: {}
    };
  }

  let snapshot = null;
  try {
    snapshot = await SnapshotManager.createSnapshot(liveActor, options.snapshotLabel || DRIFT_REPAIR_SNAPSHOT_LABEL);

    await ActorEngine.applyMutationPlan(liveActor, { delete: { items: uniqueDeleteIds } }, {
      source: 'DroidInstallationReconciler.repairDroidInstallationDrift',
      validate: true,
      rederive: true
    });

    const resultingRevision = buildInternalDriftDiagnosis(liveActor).inspectionRevision;

    SWSELogger.log(`[DroidInstallationReconciler] Repaired ${appliedIssueIds.length} drift issue(s) for ${liveActor.name}, deleting ${uniqueDeleteIds.length} Item(s).`);
    return {
      success: true,
      actorId: actor.id,
      appliedIssueIds,
      deletedItemIds: uniqueDeleteIds,
      repairedCanonicalIds,
      previousRevision: initial.inspectionRevision,
      resultingRevision,
      mutationSummary: { deletedItemIds: uniqueDeleteIds, appliedIssueIds }
    };
  } catch (err) {
    SWSELogger.error('[DroidInstallationReconciler] Drift repair failed; attempting rollback:', err);
    try {
      if (snapshot) {
        const restored = await SnapshotManager.restoreSnapshotExact(liveActor, snapshot.timestamp);
        if (!restored.success) {
          SWSELogger.error('[DroidInstallationReconciler] Rollback after failed drift repair ALSO failed:', restored);
          return { success: false, code: 'DRIFT_REPAIR_ROLLBACK_FAILED', error: `Drift repair failed and rollback failed: ${err.message}`, actorId: actor.id };
        }
        if (!restored.exact) {
          SWSELogger.warn('[DroidInstallationReconciler] Rollback after failed drift repair restored but is not identity-exact — manual review recommended.', restored);
        }
      }
    } catch (restoreErr) {
      SWSELogger.error('[DroidInstallationReconciler] Rollback after failed drift repair ALSO failed:', restoreErr);
      return { success: false, code: 'DRIFT_REPAIR_ROLLBACK_FAILED', error: `Drift repair failed and rollback failed: ${err.message}`, actorId: actor.id };
    }
    return { success: false, code: 'DRIFT_REPAIR_APPLY_FAILED', error: err.message, actorId: actor.id };
  }
}
