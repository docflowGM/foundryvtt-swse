/**
 * Droid Converted-System Reconciliation Service
 *
 * PHASE 4 — Converted-System Reconciliation and Runtime Hardening.
 *
 * Reconciles a droid's published stock `system.droidSystems` source
 * records (see scripts/domain/droids/stock-droid-normalizer.js) into
 * `system.installedSystems`, the canonical Garage-editable ledger
 * established in Phase 1/2, WITHOUT double-applying bonuses already baked
 * into the droid's published statblock totals. This is a distinct,
 * explicit action from scripts/domain/droids/droid-statblock-conversion-service.js's
 * mode conversion — see docs/audits/droid-converted-system-reconciliation-phase-4.md
 * for the full contract and the classification/provenance model this
 * relies on.
 *
 * Reuses existing, already-approved primitives — no new mutation engine,
 * no new snapshot mechanism:
 *   - scripts/domain/droids/droid-converted-system-reconciliation-classifier.js
 *     (pure) for match/ambiguity classification.
 *   - scripts/domain/droids/droid-installed-component-resolver.js (Phase 1)
 *     for reading the actor's current canonical ledger state.
 *   - scripts/data/droid-part-schema.js for canonical id normalization and
 *     part definitions.
 *   - scripts/engine/progression/utils/snapshot-manager.js's
 *     createSnapshot()/restoreSnapshot() for pre-reconciliation snapshot +
 *     rollback (the same store Phase 3's conversion service and
 *     chargen/level-up already use).
 *   - scripts/governance/actor-engine/actor-engine.js's applyMutationPlan()
 *     for the actual ledger/projection mutation.
 *
 * Reconciliation only ever mutates a droid already in playable-derived
 * mode (see resolveDroidCalculationMode() in
 * scripts/actors/droid/droid-mode-adapter.js) — inspection is available in
 * either mode for preview purposes, but applyReconciliation() refuses to
 * run on a droid still in stock-statblock mode. This mirrors
 * docs/audits/droid-converted-system-reconciliation-phase-4.md's explicit
 * requirement that reconciliation never runs automatically and never
 * silently turns descriptive stock-droid text into mechanical parts.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SnapshotManager } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js";
import { resolveDroidCalculationMode, DROID_CALCULATION_MODE } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { resolveInstalledDroidComponents, DROID_SYSTEMS_SOURCE_FIELDS } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";
import { getDroidPartDefinition, getAllDroidPartDefinitions, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import {
  classifyStockSystemSources,
  annotateWeaponCandidatesAgainstExistingItems,
  validateReconciliationSelection,
  RECONCILIATION_CLASSIFICATION
} from "/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-classifier.js";
import { buildDroidReconciliationRevision } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-reconciliation-revision.js";

const RECONCILIATION_SNAPSHOT_LABEL = 'Pre-reconciliation snapshot (Droid Converted-System Reconciliation)';

function canActOnReconciliation(actor) {
  return Boolean(game?.user?.isGM) || actor?.isOwner === true;
}

function itemsArray(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

/**
 * Enumerate every system.droidSystems source record from a droid's
 * immutable, import-time snapshot (flags.swse.stockDroidImport.publishedTotals.droidSystems
 * — NOT the live, Garage-mutable system.droidSystems mirror, which may
 * already contain post-import additions merged into the same object by
 * DroidCustomizationEngine). Reconciling against the frozen import
 * snapshot instead of the live mirror is what keeps "baked into published
 * totals" and "added after import" reliably distinguishable.
 *
 * @param {object} publishedDroidSystems
 * @returns {{sourcePath: string, entry: object}[]}
 */
function enumerateStockSystemSources(publishedDroidSystems) {
  const ds = publishedDroidSystems ?? {};
  const out = [];

  for (const field of DROID_SYSTEMS_SOURCE_FIELDS.single) {
    const entry = ds[field];
    if (entry && typeof entry === 'object' && (entry.id || entry.name)) {
      out.push({ sourcePath: `system.droidSystems.${field}`, entry });
    }
  }

  for (const field of DROID_SYSTEMS_SOURCE_FIELDS.array) {
    const list = Array.isArray(ds[field]) ? ds[field] : [];
    list.forEach((entry, index) => {
      if (entry && typeof entry === 'object' && (entry.id || entry.name)) {
        out.push({ sourcePath: `system.droidSystems.${field}.${index}`, entry });
      }
    });
  }

  return out;
}

function existingWeaponCanonicalIds(actor) {
  return itemsArray(actor)
    .filter(item => item?.flags?.swse?.stockDroidAttack)
    .map(item => normalizeDroidPartId(item.system?.droidPartId ?? item.flags?.swse?.droidPartId ?? item.name))
    .filter(Boolean);
}

/**
 * Non-mutating classification of every stock system source record for a
 * droid, for a GM to review before applying reconciliation. Available in
 * either calculation mode (a stock-mode droid may still preview what
 * reconciliation would eventually do once converted); `canApply` is only
 * ever true once the droid is in playable-derived mode.
 *
 * @param {Actor} actor
 * @returns {Promise<object>}
 */
export async function inspectReconciliation(actor) {
  const warnings = [];
  const calculationMode = resolveDroidCalculationMode(actor);

  if (!actor || actor.type !== 'droid') {
    return { actorId: actor?.id ?? null, calculationMode, candidates: [], conflicts: [], warnings: ['Not a droid actor'], canApply: false, inspectionRevision: null };
  }

  const stockImport = actor.flags?.swse?.stockDroidImport ?? null;
  if (!stockImport) {
    return {
      actorId: actor.id,
      calculationMode,
      stockImport: null,
      publishedSystems: {},
      canonicalLedger: actor.system?.installedSystems ?? {},
      candidates: [],
      conflicts: [],
      warnings: ['This droid was never stock-imported; there is nothing to reconcile.'],
      canApply: false,
      inspectionRevision: buildDroidReconciliationRevision(actor)
    };
  }

  const publishedSystems = stockImport.publishedTotals?.droidSystems ?? {};
  const canonicalLedger = actor.system?.installedSystems ?? {};

  const sourceEntries = enumerateStockSystemSources(publishedSystems);
  const context = {
    normalizeId: normalizeDroidPartId,
    getDefinition: (id) => getDroidPartDefinition(id),
    allDefinitions: getAllDroidPartDefinitions(),
    existingLedger: canonicalLedger
  };

  let candidates = classifyStockSystemSources(sourceEntries, context);
  candidates = annotateWeaponCandidatesAgainstExistingItems(candidates, existingWeaponCanonicalIds(actor));

  for (const candidate of candidates) {
    for (const w of candidate.warnings) warnings.push(`${candidate.canonicalId ?? candidate.sourcePaths[0]}: ${w}`);
  }

  const alreadyReconciled = Boolean(actor.flags?.swse?.stockDroidReconciliation);
  if (alreadyReconciled) {
    warnings.push('This droid has already been reconciled at least once; re-inspecting shows only currently-unreconciled candidates.');
  }
  if (calculationMode.mode !== DROID_CALCULATION_MODE.PLAYABLE_DERIVED) {
    warnings.push('Reconciliation cannot be applied while this droid is still in stock-statblock mode — convert it first.');
  }

  return {
    actorId: actor.id,
    calculationMode,
    stockImport: { sourceId: stockImport.sourceId, sourceName: stockImport.sourceName, importedAt: stockImport.importedAt },
    publishedSystems,
    canonicalLedger,
    candidates,
    conflicts: [],
    warnings,
    canApply: calculationMode.mode === DROID_CALCULATION_MODE.PLAYABLE_DERIVED,
    // P1-5 — a fingerprint of every actor field this inspection depended
    // on. applyReconciliation() recomputes this at apply time and rejects
    // a mismatch as a stale review rather than silently trusting a
    // possibly-outdated candidate list.
    inspectionRevision: buildDroidReconciliationRevision(actor)
  };
}

/**
 * Build a mutation plan for a caller-selected subset of reconciliation
 * candidates, entirely from the actor's CURRENT live state — reruns
 * inspectReconciliation(actor) itself and derives the new
 * `installedSystems` ledger from `actor.system?.installedSystems` as it
 * is right now, never from a cached/caller-held copy. Never invoked
 * implicitly by applyReconciliation() with "everything selectedByDefault"
 * unless the caller explicitly asks for that (options.selectDefaults) —
 * ambiguous/descriptive/unsupported candidates are never included
 * regardless.
 *
 * P1-5 — this function is an internal rebuilding primitive, not a plan
 * for a caller to hold and submit later: applyReconciliation() calls it
 * itself, immediately after validating the caller's intent, so the plan
 * it returns is always built from state no older than the current call.
 * It remains exported (and used directly by tests) because it is pure
 * with respect to trust — it never accepts a plan, only a selection of
 * ids to re-derive against current state — but no production caller
 * should hold onto its return value across an await boundary and later
 * hand it to applyReconciliation().
 *
 * @param {Actor} actor
 * @param {string[]} selections - canonical ids to reconcile (must appear
 *   in the candidate list as canonical-match/alias-match and not already
 *   installed).
 * @param {object} [options]
 * @param {boolean} [options.selectDefaults] - if true, ignore `selections`
 *   and use every candidate.selectedByDefault === true instead.
 * @returns {Promise<{success: boolean, error?: string, plan?: object, applied?: object[], skipped?: object[]}>}
 */
export async function buildReconciliationPlan(actor, selections = [], options = {}) {
  const inspection = await inspectReconciliation(actor);
  if (!inspection.canApply) {
    return { success: false, error: 'Reconciliation cannot be applied to this droid right now (see inspection warnings).', inspection };
  }

  const wanted = new Set(
    options.selectDefaults
      ? inspection.candidates.filter(c => c.selectedByDefault).map(c => c.canonicalId)
      : (Array.isArray(selections) ? selections : [])
  );

  const applied = [];
  const skipped = [];
  const installedSystems = { ...(actor.system?.installedSystems ?? {}) };
  const timestamp = Date.now();

  for (const candidate of inspection.candidates) {
    if (!candidate.canonicalId || !wanted.has(candidate.canonicalId)) continue;
    if (candidate.alreadyInstalled) {
      skipped.push({ canonicalId: candidate.canonicalId, reason: 'already represented in the canonical ledger or an existing weapon Item' });
      continue;
    }
    if (candidate.classification !== RECONCILIATION_CLASSIFICATION.CANONICAL_MATCH && candidate.classification !== RECONCILIATION_CLASSIFICATION.ALIAS_MATCH) {
      skipped.push({ canonicalId: candidate.canonicalId, reason: `classification "${candidate.classification}" requires manual resolution and cannot be auto-applied` });
      continue;
    }

    const definition = getDroidPartDefinition(candidate.canonicalId);
    installedSystems[candidate.canonicalId] = {
      id: candidate.canonicalId,
      name: definition?.name ?? candidate.canonicalId,
      category: definition?.category ?? null,
      slot: definition?.slot ?? null,
      cost: 0,
      installedAt: timestamp,
      // Recommended policy (docs/audits/droid-converted-system-reconciliation-phase-4.md):
      // reconciliation only ever runs on an already playable-derived droid,
      // whose published totals are no longer authoritative — so a
      // reconciled component becomes an ordinary mechanical component and
      // applies modifiers normally, exactly like ordinary Garage
      // installs. bakedIntoPublishedTotals is kept true for audit/history
      // (it WAS part of the original published statblock), but that no
      // longer suppresses its modifiers once the droid has converted.
      provenance: {
        origin: 'stock-import',
        sourcePath: candidate.sourcePaths[0],
        importedAt: inspection.stockImport?.importedAt ?? null,
        bakedIntoPublishedTotals: true,
        reconciledAt: timestamp
      },
      mechanicalState: { applyModifiers: true }
    };
    applied.push({ canonicalId: candidate.canonicalId, sourcePaths: candidate.sourcePaths, classification: candidate.classification });
  }

  if (applied.length === 0) {
    return { success: false, error: 'No selected candidate was eligible for reconciliation.', skipped, inspection };
  }

  return {
    success: true,
    plan: { set: { 'system.installedSystems': installedSystems } },
    applied,
    skipped,
    inspection
  };
}

/**
 * Apply reconciliation from caller-submitted INTENT — never a
 * caller-supplied mutation plan (P1-5 — Intent-Based Reconciliation Apply
 * Boundary; see docs/audits/droid-converted-system-reconciliation-phase-4.md's
 * P1-5 section for the full rationale). The caller submits only which
 * droid, which canonical ids, and which inspection they reviewed —
 * `{actorId, selectedCanonicalIds, inspectionRevision}` — and this
 * function independently rereads the actor's current state, re-verifies
 * every trust boundary, and rebuilds the mutation plan itself:
 *
 *   1. Reject a caller-supplied plan object outright (old-API shape).
 *   2. Verify the actor exists, is type droid, and its id matches
 *      intent.actorId (a plan cannot be silently redirected to another
 *      Actor).
 *   3. Verify the current user has GM/owner permission on THIS actor.
 *   4. Verify the actor is still in playable-derived mode.
 *   5. Recompute the actor's current reconciliation-revision fingerprint
 *      and compare it to intent.inspectionRevision — a mismatch means the
 *      droid's installed systems changed since the review was opened
 *      (another reconciliation, a Garage install/removal, a mode change),
 *      and is rejected rather than merged; the caller must re-open the
 *      review with fresh candidates.
 *   6. Validate the selected canonical ids against a FRESH classification
 *      of the actor's current candidates (not anything cached).
 *   7. Rebuild the mutation plan via buildReconciliationPlan(), which
 *      itself re-derives installedSystems from the actor's current live
 *      ledger — so any unrelated, concurrent installs/removals since the
 *      review was opened are preserved rather than overwritten.
 *
 * Snapshots first (SnapshotManager, same store conversion/level-up
 * already use), applies through ActorEngine.applyMutationPlan(), and
 * rolls back on failure.
 *
 * @param {Actor} actor
 * @param {{actorId: string, selectedCanonicalIds: string[], inspectionRevision: string}} intent
 * @param {object} [options]
 * @returns {Promise<{success: boolean, code?: string, error?: string, actorId?: string, appliedCanonicalIds?: string[], skippedCanonicalIds?: string[], previousRevision?: string, resultingRevision?: string, mutationSummary?: object, snapshotTimestamp?: number}>}
 */
export async function applyReconciliation(actor, intent = {}, options = {}) {
  const actorId = actor?.id ?? null;

  // Fail closed on the old plan-based call shape rather than silently
  // applying it — a full mutation plan (or anything shaped like the old
  // buildReconciliationPlan() result) is never an acceptable second
  // argument here.
  if (intent && typeof intent === 'object' && ('plan' in intent || 'mutationPlan' in intent)) {
    return { success: false, code: 'RECONCILIATION_INVALID_SELECTION', error: 'Caller-supplied reconciliation plans are no longer accepted. Submit reconciliation intent instead.', actorId };
  }

  if (!actor || actor.type !== 'droid') {
    return { success: false, code: 'RECONCILIATION_ACTOR_MISMATCH', error: 'Not a droid actor', actorId };
  }

  if (!intent || typeof intent !== 'object' || !intent.actorId || intent.actorId !== actor.id) {
    return { success: false, code: 'RECONCILIATION_ACTOR_MISMATCH', error: 'This reconciliation intent does not match the target Actor.', actorId: actor.id };
  }

  if (!canActOnReconciliation(actor)) {
    return { success: false, code: 'RECONCILIATION_PERMISSION_DENIED', error: 'Only the GM or an owner may reconcile this droid.', actorId: actor.id };
  }

  const calculationMode = resolveDroidCalculationMode(actor);
  if (calculationMode.mode !== DROID_CALCULATION_MODE.PLAYABLE_DERIVED) {
    return { success: false, code: 'RECONCILIATION_MODE_CHANGED', error: 'Reconciliation can only be applied to a droid already in playable-derived mode.', actorId: actor.id };
  }

  const previousRevision = buildDroidReconciliationRevision(actor);
  if (typeof intent.inspectionRevision !== 'string' || intent.inspectionRevision !== previousRevision) {
    return {
      success: false,
      code: 'RECONCILIATION_STALE',
      error: "The droid's installed systems changed after this reconciliation review was opened. Refresh the review before applying changes.",
      actorId: actor.id
    };
  }

  const freshInspection = await inspectReconciliation(actor);
  if (!freshInspection.canApply) {
    return { success: false, code: 'RECONCILIATION_MODE_CHANGED', error: 'Reconciliation cannot be applied to this droid right now.', actorId: actor.id };
  }

  const selectionResult = validateReconciliationSelection(intent.selectedCanonicalIds, freshInspection.candidates, { normalizeId: normalizeDroidPartId });
  if (!selectionResult.success) {
    return { success: false, code: 'RECONCILIATION_INVALID_SELECTION', error: selectionResult.error, actorId: actor.id };
  }

  const built = await buildReconciliationPlan(actor, selectionResult.canonicalIds, {});
  if (!built.success) {
    return { success: false, code: 'RECONCILIATION_INVALID_SELECTION', error: built.error, actorId: actor.id };
  }

  let snapshot = null;
  try {
    snapshot = await SnapshotManager.createSnapshot(actor, options.snapshotLabel || RECONCILIATION_SNAPSHOT_LABEL);

    const timestamp = Date.now();
    const plan = {
      ...built.plan,
      set: {
        ...(built.plan.set ?? {}),
        // Provenance/mechanicalState for each new ledger entry are already
        // constructed inside buildReconciliationPlan() from canonical part
        // definitions and the current inspection — never from anything in
        // `intent`. These reconciliation-level flags are likewise entirely
        // service-constructed.
        'flags.swse.stockDroidReconciliation.reconciledAt': timestamp,
        'flags.swse.stockDroidReconciliation.snapshotTimestamp': snapshot.timestamp,
        'flags.swse.stockDroidReconciliation.reconciledIds': built.applied.map(a => a.canonicalId)
      }
    };

    await ActorEngine.applyMutationPlan(actor, plan, {
      source: 'DroidConvertedSystemReconciliationService.applyReconciliation',
      validate: true,
      rederive: true
    });

    SWSELogger.log(`[DroidConvertedSystemReconciliationService] Reconciled ${built.applied.length} system(s) for ${actor.name}.`);
    return {
      success: true,
      actorId: actor.id,
      appliedCanonicalIds: built.applied.map(a => a.canonicalId),
      skippedCanonicalIds: built.skipped.map(s => s.canonicalId),
      previousRevision,
      resultingRevision: buildDroidReconciliationRevision(actor),
      mutationSummary: { applied: built.applied, skipped: built.skipped },
      snapshotTimestamp: snapshot.timestamp
    };
  } catch (err) {
    SWSELogger.error('[DroidConvertedSystemReconciliationService] Reconciliation failed; attempting rollback:', err);
    try {
      if (snapshot) await SnapshotManager.restoreSnapshot(actor, snapshot.timestamp);
    } catch (restoreErr) {
      SWSELogger.error('[DroidConvertedSystemReconciliationService] Rollback after failed reconciliation ALSO failed:', restoreErr);
      return { success: false, code: 'RECONCILIATION_ROLLBACK_FAILED', error: `Reconciliation failed and rollback failed: ${err.message}`, actorId: actor.id };
    }
    return { success: false, code: 'RECONCILIATION_APPLY_FAILED', error: err.message, actorId: actor.id };
  }
}

/**
 * Roll back a previous reconciliation using the snapshot taken at
 * reconciliation time. Restores the canonical ledger, droidSystems
 * projection, embedded Items, and reconciliation metadata to their exact
 * pre-reconciliation state via SnapshotManager's full-actor restore (see
 * scripts/engine/progression/utils/snapshot-manager.js and
 * scripts/governance/snapshot/snapshot-service.js — restoreFromSnapshot()
 * replaces root actor data AND deletes/recreates every Item/effect from
 * the snapshot, not a narrow field patch).
 *
 * @param {Actor} actor
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rollbackReconciliation(actor) {
  if (!actor || actor.type !== 'droid') {
    return { success: false, error: 'Not a droid actor' };
  }
  if (!canActOnReconciliation(actor)) {
    return { success: false, error: 'Only the GM or an owner may roll back this reconciliation.' };
  }
  const snapshotTimestamp = actor.flags?.swse?.stockDroidReconciliation?.snapshotTimestamp;
  if (!Number.isFinite(snapshotTimestamp)) {
    return { success: false, error: 'No reconciliation snapshot found on this actor — nothing to roll back.' };
  }

  try {
    const restored = await SnapshotManager.restoreSnapshot(actor, snapshotTimestamp);
    if (!restored) {
      return { success: false, error: 'Reconciliation snapshot could not be found or restored.' };
    }
    // restoreFromSnapshot() replaces system/items/effects but never
    // touches actor.flags (confirmed by reading
    // scripts/governance/snapshot/snapshot-service.js — see the matching
    // note in droid-statblock-conversion-service.js#rollbackConversion) —
    // stamp the rollback so stale reconciliation metadata doesn't linger.
    await ActorEngine.applyMutationPlan(actor, {
      set: { 'flags.swse.stockDroidReconciliation.rolledBackAt': Date.now() }
    }, { source: 'DroidConvertedSystemReconciliationService.rollbackReconciliation', validate: false, rederive: true });
    SWSELogger.log(`[DroidConvertedSystemReconciliationService] Rolled back reconciliation for ${actor.name}.`);
    return { success: true };
  } catch (err) {
    SWSELogger.error('[DroidConvertedSystemReconciliationService] Rollback failed:', err);
    return { success: false, error: err.message };
  }
}
