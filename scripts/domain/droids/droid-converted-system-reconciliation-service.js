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
  RECONCILIATION_CLASSIFICATION
} from "/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-classifier.js";

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
    return { actorId: actor?.id ?? null, calculationMode, candidates: [], conflicts: [], warnings: ['Not a droid actor'], canApply: false };
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
      canApply: false
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
    canApply: calculationMode.mode === DROID_CALCULATION_MODE.PLAYABLE_DERIVED
  };
}

/**
 * Build a mutation plan for a caller-selected subset of reconciliation
 * candidates. Never invoked implicitly by applyReconciliation() with
 * "everything selectedByDefault" unless the caller explicitly asks for
 * that (options.selectDefaults) — ambiguous/descriptive/unsupported
 * candidates are never included regardless.
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
 * Apply a previously-built reconciliation plan. Snapshots first
 * (SnapshotManager, same store conversion/level-up already use), applies
 * through ActorEngine.applyMutationPlan(), and rolls back on failure.
 * Requires GM or owner permission — re-checked here independent of any
 * sheet-side gating.
 *
 * @param {Actor} actor
 * @param {{plan: object, applied: object[]}} built - the result of
 *   buildReconciliationPlan().
 * @param {object} [options]
 * @returns {Promise<{success: boolean, error?: string, snapshotTimestamp?: number, applied?: object[]}>}
 */
export async function applyReconciliation(actor, built, options = {}) {
  if (!actor || actor.type !== 'droid') {
    return { success: false, error: 'Not a droid actor' };
  }
  if (!canActOnReconciliation(actor)) {
    return { success: false, error: 'Only the GM or an owner may reconcile this droid.' };
  }
  if (!built?.success || !built.plan) {
    return { success: false, error: built?.error ?? 'No valid reconciliation plan was supplied.' };
  }
  const calculationMode = resolveDroidCalculationMode(actor);
  if (calculationMode.mode !== DROID_CALCULATION_MODE.PLAYABLE_DERIVED) {
    return { success: false, error: 'Reconciliation can only be applied to a droid already in playable-derived mode.' };
  }

  let snapshot = null;
  try {
    snapshot = await SnapshotManager.createSnapshot(actor, options.snapshotLabel || RECONCILIATION_SNAPSHOT_LABEL);

    const timestamp = Date.now();
    const plan = {
      ...built.plan,
      set: {
        ...(built.plan.set ?? {}),
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
    return { success: true, snapshotTimestamp: snapshot.timestamp, applied: built.applied };
  } catch (err) {
    SWSELogger.error('[DroidConvertedSystemReconciliationService] Reconciliation failed; attempting rollback:', err);
    try {
      if (snapshot) await SnapshotManager.restoreSnapshot(actor, snapshot.timestamp);
    } catch (restoreErr) {
      SWSELogger.error('[DroidConvertedSystemReconciliationService] Rollback after failed reconciliation ALSO failed:', restoreErr);
      return { success: false, error: `Reconciliation failed and rollback failed: ${err.message}` };
    }
    return { success: false, error: err.message };
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
