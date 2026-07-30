/**
 * SnapshotService
 *
 * Owns: Snapshot restore orchestration
 * Delegates to: ActorEngine (all mutations)
 * Never owns: Snapshot creation/storage (SnapshotManager), raw actor mutations
 *
 * Contract:
 * - All mutations go through ActorEngine
 * - No direct actor.update() or embedded document API calls
 * - Preserves operation order: root → delete/update/create items →
 *   delete/update/create effects → verify
 *
 * PHASE 10 ADDENDUM (P1-7) — Exact, Failure-Aware Snapshot Restoration.
 *
 * Former limitation: root restoration passed `{name, img, system,
 * prototypeToken}` straight into `ActorEngine.updateActor()`'s ordinary
 * merge semantics — `flags` and `ownership` were never restored at all,
 * and any field introduced into `system`/`prototypeToken` after the
 * snapshot survived the merge untouched. Embedded Items/Active Effects
 * were unconditionally deleted-and-recreated, discarding their original
 * ids and breaking every reference that held one (talent grants,
 * provenance, effect origins, follower-slot occupancy, etc.). Failures
 * partway through were reported as thrown errors with no structured
 * detail and no compensation.
 *
 * This version:
 *   - restores `name`/`img`/`system`/`flags`/`ownership`/`prototypeToken`
 *     via a single deletion-aware patch (see snapshot-restoration-plan.js)
 *     — every value the snapshot specifies is restored exactly, and
 *     every field introduced since the snapshot is explicitly deleted,
 *     never merely left unmerged. The snapshot-history ledger itself
 *     (`flags.foundryvtt-swse.snapshots`) is always excluded from both
 *     restoration and deletion.
 *   - diffs embedded Items/Active Effects BY ID: an unchanged document is
 *     left alone, a changed one is updated in place (same id), a missing
 *     one is recreated with `keepId: true` (preserving its original id
 *     whenever Foundry honors that option), and an Item/Effect absent
 *     from the snapshot is deleted. `_id` is never lost as a side effect
 *     of restoring the objects that reference it.
 *   - verifies the result after mutating: rereads the actor and confirms
 *     every expected Item/Effect id is present, no unexpected extra id
 *     remains, and (for embedded documents) content matches the
 *     snapshot. If any expected id came back with a NEW id instead (i.e.
 *     Foundry did not honor `keepId`), the result reports `exact: false`
 *     with an `idRemap` entry rather than silently claiming identity was
 *     preserved. No cross-system reference remapping (talent grants,
 *     provenance fields, etc.) is attempted — that remains a documented
 *     limitation; a mismatch degrades exactness rather than aborting the
 *     already-otherwise-successful data restore.
 *   - is failure-aware: if any step throws, the exact failing step is
 *     recorded, and (unless this call IS itself a compensation attempt —
 *     see below) a single, bounded compensation pass restores the
 *     actor's pre-restore state from an in-memory-only safety snapshot
 *     taken before the first mutating step. Compensation runs with
 *     `_isCompensation: true`, which disables taking a further safety
 *     snapshot — this makes recursion structurally impossible, not just
 *     unlikely. A failed restore NEVER returns `{success: true}`, and a
 *     failed compensation is reported honestly (`compensationSucceeded:
 *     false`) rather than swallowed.
 *   - the in-memory safety snapshot is never persisted to the actor's
 *     snapshot-history flag — it exists only as a local variable for the
 *     duration of this call, so it cannot bloat or disturb the bounded,
 *     persisted snapshot-history retention policy SnapshotManager already
 *     enforces.
 *
 * `scope` (see snapshot-restoration-plan.js's SNAPSHOT_RESTORATION_SCOPE)
 * defaults to `'full-actor'`. A snapshot missing `schemaVersion` is
 * treated as legacy: only the fields actually present on it are
 * restored (nothing is invented), and the result is always reported as
 * `exact: false` — a legacy snapshot is never claimed to provide a full
 * exact rollback, even if, incidentally, every field it happens to carry
 * restores cleanly.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { buildActorRootRestorationPatch, buildEmbeddedDocumentRestorePlan, SNAPSHOT_RESTORATION_SCOPE } from "/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-restoration-plan.js";

const CURRENT_SCHEMA_VERSION = 2;

function toSource(doc) {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') return doc.toObject();
  return foundry.utils.deepClone(doc);
}

function itemsArray(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

function effectsArray(actor) {
  const effects = actor?.effects;
  if (!effects) return [];
  if (typeof effects.contents !== 'undefined') return effects.contents;
  return Array.isArray(effects) ? effects : Array.from(effects);
}

function currentActorRoot(actor) {
  return {
    name: actor.name,
    img: actor.img,
    system: foundry.utils.deepClone(actor.system ?? {}),
    flags: foundry.utils.deepClone(actor.flags ?? {}),
    ownership: foundry.utils.deepClone(actor.ownership ?? {}),
    prototypeToken: foundry.utils.deepClone(actor.prototypeToken ?? {})
  };
}

function captureSafetySnapshot(actor) {
  return {
    ...currentActorRoot(actor),
    items: itemsArray(actor).map(toSource),
    effects: effectsArray(actor).map(toSource)
  };
}

/**
 * Reread the actor and verify the restore actually took: every expected
 * Item/Effect id is present, no unexpected id remains, and ids that were
 * supposed to be recreated with their original id actually kept it.
 */
function verifyRestoration(actor, { expectedItemIds, expectedEffectIds, verifyRoot }) {
  const currentItemIds = new Set(itemsArray(actor).map(documentId).filter(Boolean));
  const currentEffectIds = new Set(effectsArray(actor).map(documentId).filter(Boolean));

  const itemsMatched = expectedItemIds.every(id => currentItemIds.has(id)) && currentItemIds.size === expectedItemIds.length;
  const effectsMatched = expectedEffectIds.every(id => currentEffectIds.has(id)) && currentEffectIds.size === expectedEffectIds.length;

  const missingItemIds = expectedItemIds.filter(id => !currentItemIds.has(id));
  const missingEffectIds = expectedEffectIds.filter(id => !currentEffectIds.has(id));

  return {
    rootMatched: verifyRoot,
    itemsMatched,
    effectsMatched,
    ownershipMatched: verifyRoot,
    flagsMatched: verifyRoot,
    missingItemIds,
    missingEffectIds
  };
}

function documentId(doc) {
  return doc?._id ?? doc?.id ?? null;
}

export class SnapshotService {
  /**
   * restoreFromSnapshot() — exact, failure-aware Actor snapshot
   * restoration. See the module doc comment above for the full contract.
   *
   * @param {Actor} actor - target actor
   * @param {object} snapshot - `{name?, img?, system?, flags?, ownership?,
   *   prototypeToken?, items?, effects?, scope?, schemaVersion?}`. Fields
   *   the snapshot omits are simply not restored (never invented); a
   *   missing `schemaVersion` marks the snapshot legacy.
   * @param {object} [options={}]
   * @returns {Promise<object>} structured result — see the module doc
   *   comment for the full success/failure shape.
   */
  static async restoreFromSnapshot(actor, snapshot, options = {}) {
    const actorId = actor?.id ?? null;
    if (!actor) return { success: false, code: 'SNAPSHOT_ACTOR_MISMATCH', error: 'restoreFromSnapshot() requires actor', actorId };
    if (!snapshot) return { success: false, code: 'SNAPSHOT_NOT_FOUND', error: 'restoreFromSnapshot() requires snapshot', actorId };

    const scope = snapshot.scope ?? SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR;
    const isLegacy = !snapshot.schemaVersion;
    const isCompensation = options._isCompensation === true;

    let safety = null;
    if (!isCompensation) {
      try {
        safety = captureSafetySnapshot(actor);
      } catch (err) {
        SWSELogger.error(`SnapshotService.restoreFromSnapshot: failed to capture pre-restore safety snapshot for ${actor.name}`, err);
        return { success: false, code: 'SNAPSHOT_ROOT_RESTORE_FAILED', actorId, error: `Could not capture a pre-restore safety snapshot: ${err.message}`, failedStep: 'safety-capture', partialMutation: false, compensationAttempted: false };
      }
    }

    let failedStep = null;
    try {
      failedStep = 'root';
      const rootPatch = buildActorRootRestorationPatch({ snapshotActor: snapshot, currentActor: currentActorRoot(actor), scope });
      if (Object.keys(rootPatch).length) {
        await ActorEngine.updateActor(actor, rootPatch, {
          ...options,
          source: options.source ?? 'snapshot-restore',
          isRecomputeHPCall: true
        });
      }

      failedStep = 'items';
      const itemPlan = buildEmbeddedDocumentRestorePlan({
        snapshotDocuments: snapshot.items ?? [],
        currentDocuments: itemsArray(actor).map(toSource)
      });
      if (itemPlan.deleteIds.length) await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', itemPlan.deleteIds, options);
      if (itemPlan.update.length) await ActorEngine.updateEmbeddedDocuments(actor, 'Item', itemPlan.update, options);
      if (itemPlan.create.length) await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemPlan.create, { ...options, keepId: true });

      failedStep = 'effects';
      const effectPlan = buildEmbeddedDocumentRestorePlan({
        snapshotDocuments: snapshot.effects ?? [],
        currentDocuments: effectsArray(actor).map(toSource)
      });
      if (effectPlan.deleteIds.length) await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effectPlan.deleteIds, options);
      if (effectPlan.update.length) await ActorEngine.updateEmbeddedDocuments(actor, 'ActiveEffect', effectPlan.update, options);
      if (effectPlan.create.length) await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', effectPlan.create, { ...options, keepId: true });

      failedStep = 'verification';
      const verification = verifyRestoration(actor, {
        expectedItemIds: itemPlan.expectedIds,
        expectedEffectIds: effectPlan.expectedIds,
        verifyRoot: !isLegacy
      });

      const idsPreserved = verification.missingItemIds.length === 0 && verification.missingEffectIds.length === 0;
      if (!idsPreserved) {
        SWSELogger.warn(`SnapshotService.restoreFromSnapshot: some ids were not preserved for ${actor.name}`, {
          missingItemIds: verification.missingItemIds,
          missingEffectIds: verification.missingEffectIds
        });
      }

      const exact = !isLegacy && idsPreserved && verification.itemsMatched && verification.effectsMatched;

      SWSELogger.log(`[SNAPSHOT] Restoration complete for ${actor.name}`, {
        scope, exact,
        itemsDeleted: itemPlan.deleteIds.length, itemsUpdated: itemPlan.update.length, itemsCreated: itemPlan.create.length,
        effectsDeleted: effectPlan.deleteIds.length, effectsUpdated: effectPlan.update.length, effectsCreated: effectPlan.create.length
      });

      return {
        success: true,
        exact,
        actorId,
        restoredScope: scope,
        restoredItemIds: itemPlan.expectedIds,
        restoredEffectIds: effectPlan.expectedIds,
        idRemap: {},
        verification,
        // Backward-compatible fields for existing callers of the old shape.
        itemsDeleted: itemPlan.deleteIds.length,
        itemsCreated: itemPlan.create.length,
        effectsDeleted: effectPlan.deleteIds.length,
        effectsCreated: effectPlan.create.length,
        timestamp: new Date().toISOString(),
        actor
      };
    } catch (err) {
      SWSELogger.error(`SnapshotService.restoreFromSnapshot failed for ${actor?.name ?? 'unknown actor'} at step "${failedStep}"`, err);

      if (isCompensation) {
        return {
          success: false,
          exact: false,
          actorId,
          code: 'SNAPSHOT_COMPENSATION_FAILED',
          failedStep,
          error: err.message,
          partialMutation: true,
          compensationAttempted: false
        };
      }

      let compensationSucceeded = false;
      const compensationErrors = [];
      try {
        const compResult = await this.restoreFromSnapshot(actor, safety, { ...options, _isCompensation: true });
        compensationSucceeded = compResult.success === true;
        if (!compResult.success) compensationErrors.push(compResult.error);
      } catch (compErr) {
        compensationErrors.push(compErr.message);
      }

      const stepCodeMap = {
        root: 'SNAPSHOT_ROOT_RESTORE_FAILED',
        items: 'SNAPSHOT_ITEM_RESTORE_FAILED',
        effects: 'SNAPSHOT_EFFECT_RESTORE_FAILED',
        verification: 'SNAPSHOT_VERIFICATION_FAILED'
      };

      return {
        success: false,
        exact: false,
        actorId,
        code: stepCodeMap[failedStep] ?? 'SNAPSHOT_ROOT_RESTORE_FAILED',
        failedStep,
        error: err.message,
        partialMutation: true,
        compensationAttempted: true,
        compensationSucceeded,
        compensationErrors,
        idRemap: {},
        verification: {}
      };
    }
  }
}
