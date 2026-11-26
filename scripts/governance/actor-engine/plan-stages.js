/**
 * Mutation-plan bucket stages, transactional rollback and verified snapshot restore/capture (3N-AE.5, extracted verbatim from ActorEngine).
 *
 * `applyMutationPlan` stays in ActorEngine as the public orchestrator; these stage functions receive the engine as `engine` and persist ONLY
 * through its existing gateway methods. ActorEngine keeps every method name as a thin delegate. Rollback/verification semantics are unchanged
 * (F-ACT-003 and the TI4-C0 G06/G11 certification tests are the parity evidence). No rules changes.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { MutationApplicationError } from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js";

export async function restoreSnapshotVerifiedImpl(engine, actor, snapshot, source = 'ActorEngine.restoreSnapshotVerified') {
    // Recovery-evidence check BEFORE any restoration: SnapshotService defaults a missing `items`/`effects` array to [] and would DELETE the
    // actor's existing embedded documents, and skips id-less ones. An incomplete snapshot is therefore never handed to the restore.
    const recovery = engine._validateRecoverySnapshot(snapshot);
    const identityComplete = recovery.complete;

    const target = { attempted: true, verdict: null, success: null, exact: null, code: null, failedStep: null, partialMutation: null,
      compensationAttempted: null, compensationSucceeded: null, requiresManualReview: null, contentVerified: null, error: null, restoreError: null };
    let result;
    if (!recovery.complete) {
      target.attempted = false;
      target.verdict = 'INVALID_SNAPSHOT';
      target.invalidSnapshot = recovery.problems;
    } else {
      try {
        result = await engine.restoreFromSnapshot(actor, snapshot, { source });
      } catch (restoreErr) {
        target.verdict = 'THREW';
        target.restoreError = restoreErr?.message ?? String(restoreErr);
      }
    }
    if (target.verdict === null) {
      if (result === null || typeof result !== 'object' || Array.isArray(result) || typeof result.success !== 'boolean') {
        target.verdict = 'MALFORMED';
      } else {
        target.success = result.success;
        target.exact = result.exact === true;
        target.code = result.code ?? null;
        target.failedStep = result.failedStep ?? null;
        target.partialMutation = result.partialMutation ?? null;
        target.compensationAttempted = result.compensationAttempted ?? null;
        target.compensationSucceeded = result.compensationSucceeded ?? null;
        target.requiresManualReview = result.requiresManualReview ?? null;
        target.error = result.error ?? null;
        const v = result.verification;
        // Positive evidence only: root, Items and Effects must each be affirmed `=== true`. A missing, malformed or partial verification object is not verification.
        target.contentVerified = (v && typeof v === 'object' && !Array.isArray(v)) ? (v.rootMatched === true && v.itemsMatched === true && v.effectsMatched === true) : null;
        target.verdict = result.success !== true ? 'FAILED' : (result.exact === true ? 'EXACT' : 'INEXACT');
        if (target.verdict === 'EXACT' && (target.contentVerified !== true || !identityComplete)) {
          target.verdict = 'INEXACT';
          target.exactDowngraded = true;
        }
      }
    }
    return target;
  }

export async function captureRecoverySnapshotImpl(engine, actor) {
    const { SnapshotService } = await import('/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-service.js');
    const snapshot = SnapshotService.captureExactSnapshot(actor);
    const recovery = engine._validateRecoverySnapshot(snapshot);
    if (!recovery.complete) {
      throw new Error(`the recovery snapshot is unusable (${recovery.problems.join('; ')})`);
    }
    return snapshot;
  }

export async function rollbackTransactionalPlan(engine, actor, snapshot, tempIdMap = {}, source = 'ActorEngine.applyMutationPlan') {
    const reasons = [];
    const legacySnapshot = !snapshot?.schemaVersion;

    /* ---- target actor ---- */
    const target = await engine.restoreSnapshotVerified(actor, snapshot, `${source}:rollback`);
    const identityComplete = target.verdict !== 'INVALID_SNAPSHOT';
    if (!identityComplete) reasons.push('snapshot-identity-incomplete');
    const targetOk = target.verdict === 'EXACT';
    if (!targetOk) reasons.push(`target-restore-${target.verdict.toLowerCase()}`);

    /* ---- CREATE-bucket world actors ---- */
    const ids = [...new Set(Object.values(tempIdMap).filter(Boolean))];
    const created = { ids, attempted: ids.length > 0, deleteCallReturned: null, returnedIds: null, registryAvailable: null,
      absentIds: [], stillPresent: [], unverifiable: [], registryErrors: [], verifiedAbsent: null, error: null };
    if (ids.length) {
      try {
        const deleted = await Actor.deleteDocuments(ids);
        created.deleteCallReturned = true;
        // DIAGNOSTIC evidence only: the ids the delete API returned are NOT proof that the actors are gone.
        created.returnedIds = Array.isArray(deleted) ? deleted.map((d) => d?.id ?? d?._id).filter(Boolean) : null;
      } catch (createRollbackErr) {
        created.deleteCallReturned = false;
        created.error = createRollbackErr?.message ?? String(createRollbackErr);
      }
      // Verification requires an OBSERVATION of the world after the delete, id by id. Neither the resolved call nor the ids it returned
      // establishes absence. No readable registry ⇒ the cleanup is unverified. A failing registry read is recorded as secondary evidence and
      // never replaces the original mutation error (each lookup is guarded; nothing is re-run).
      let getActor = null;
      try {
        const registry = globalThis.game?.actors;
        if (registry && typeof registry.get === 'function') getActor = (id) => registry.get(id);
      } catch (registryAccessErr) {
        created.registryErrors.push({ id: null, error: registryAccessErr?.message ?? String(registryAccessErr) });
      }
      created.registryAvailable = getActor !== null;
      if (getActor === null) {
        created.unverifiable = [...ids];
      } else {
        for (const id of ids) {
          try {
            if (getActor(id)) created.stillPresent.push(id); else created.absentIds.push(id);
          } catch (lookupErr) {
            created.unverifiable.push(id);
            created.registryErrors.push({ id, error: lookupErr?.message ?? String(lookupErr) });
          }
        }
      }
      created.verifiedAbsent = created.registryAvailable === true && created.stillPresent.length === 0 && created.unverifiable.length === 0;
      if (created.verifiedAbsent !== true) reasons.push(created.error ? 'created-cleanup-failed' : 'created-cleanup-unverified');
    }
    const createdOk = ids.length === 0 || created.verifiedAbsent === true;

    /* ---- verdict over the WHOLE scope ---- */
    const outcome = (targetOk && createdOk) ? 'FAILED_COMPENSATED' : 'INDETERMINATE';
    let compensation;
    if (outcome === 'FAILED_COMPENSATED') compensation = 'EXACT';
    else if (reasons.length === 1 && reasons[0] === 'target-restore-inexact' && ids.length === 0) compensation = 'INEXACT';
    else if ((targetOk && !createdOk) || (!targetOk && ids.length > 0 && createdOk) || target.verdict === 'INEXACT') compensation = 'PARTIAL';
    else compensation = 'FAILED';

    const rollback = { outcome, compensation, level: 'L1', legacySnapshot, reasons, target, created };

    if (outcome === 'FAILED_COMPENSATED') {
      SWSELogger.warn('ActorEngine.applyMutationPlan: rolled back to pre-plan snapshot after failure (verified exact; created actors verified removed)', {
        actor: actor?.id, source, createdActorIds: ids
      });
    } else {
      SWSELogger.error('ActorEngine.applyMutationPlan: rollback NOT verified — outcome INDETERMINATE; the actor and/or created actors may be partially changed', {
        actor: actor?.id, source, compensation, reasons, targetVerdict: target.verdict, targetCode: target.code, legacySnapshot,
        createdActorIds: ids, createdStillPresent: created.stillPresent, createdUnverifiable: created.unverifiable, registryErrors: created.registryErrors
      });
    }
    return rollback;
  }

export async function applyCreateOps(engine, actorSpecs, tempIdMap, source) {
    if (!Array.isArray(actorSpecs) || actorSpecs.length === 0) {
      return;
    }

    try {
      for (const spec of actorSpecs) {
        if (!spec || !spec.temporaryId || !spec.data) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyCreateOps', {
          temporaryId: spec.temporaryId,
          type: spec.type || 'unknown'
        });

        // Create actor from spec data
        try {
          const created = await Actor.create(spec.data);
          if (created) {
            // Map temporary ID to real ID
            tempIdMap[spec.temporaryId] = created.id;
            SWSELogger.info('ActorEngine: Created actor', {
              temporaryId: spec.temporaryId,
              realId: created.id,
              type: spec.type
            });
          }
        } catch (createErr) {
          const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
          throw new MutationApplicationError(
            `Failed to create actor ${spec.temporaryId}: ${createErr.message}`,
            { temporaryId: spec.temporaryId, type: spec.type }
          );
        }
      }
    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to apply CREATE operations: ${error.message}`,
        { specCount: actorSpecs.length }
      );
    }
  }

export async function applyDeleteOps(engine, actor, deleteOps, source) {
    if (!deleteOps || Object.keys(deleteOps).length === 0) {
      return;
    }

    try {
      for (const [collection, ids] of Object.entries(deleteOps)) {
        if (!Array.isArray(ids) || ids.length === 0) {
          continue;
        }

        const embeddedName = collection === 'items' || collection === 'item' || collection === 'Item'
          ? 'Item'
          : collection === 'effects' || collection === 'activeEffects' || collection === 'ActiveEffect'
            ? 'ActiveEffect'
            : collection;

        SWSELogger.debug('ActorEngine._applyDeleteOps', {
          actor: actor.id,
          collection,
          embeddedName,
          count: ids.length
        });

        await engine.deleteEmbeddedDocuments(actor, embeddedName, ids, { source });
      }
    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to delete from ${Object.keys(deleteOps)[0]}: ${error.message}`,
        {
          operation: 'delete',
          collection: Object.keys(deleteOps)[0],
          underlyingError: error
        }
      );
    }
  }

export async function applySetOps(engine, actor, setOps, source) {
    if (!setOps || Object.keys(setOps).length === 0) {
      return;
    }

    try {
      SWSELogger.debug('ActorEngine._applySetOps', {
        actor: actor.id,
        paths: Object.keys(setOps)
      });

      // Batch all set operations into a single actor.update() call.
      // Progression/chargen finalization is the authoritative source for level-1
      // HP initialization, so allow system.hp.max when it appears in a validated
      // mutation plan instead of tripping the recompute-only guard.
      const flatSetOps = foundry.utils.flattenObject(setOps || {});
      const writesHpMax = Object.prototype.hasOwnProperty.call(flatSetOps, 'system.hp.max');
      await engine.updateActor(actor, setOps, { source, isRecomputeHPCall: writesHpMax });

    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to apply set operations: ${error.message}`,
        {
          operation: 'set',
          paths: Object.keys(setOps),
          underlyingError: error
        }
      );
    }
  }

export async function applyUpdateOps(engine, actor, updateOps, source) {
    if (!updateOps || Object.keys(updateOps).length === 0) {
      return;
    }

    try {
      for (const [collection, updates] of Object.entries(updateOps)) {
        if (!Array.isArray(updates) || updates.length === 0) continue;

        const embeddedName = collection === 'items'
          ? 'Item'
          : collection === 'effects'
            ? 'ActiveEffect'
            : collection.charAt(0).toUpperCase() + collection.slice(1, -1);

        const normalizedUpdates = updates.map(update => {
          const clone = foundry.utils.deepClone(update);
          if (!clone._id && clone.id) {
            clone._id = clone.id;
            delete clone.id;
          }
          return clone;
        });

        SWSELogger.debug('ActorEngine._applyUpdateOps', {
          actor: actor.id,
          collection,
          embeddedName,
          count: normalizedUpdates.length
        });

        await engine.updateEmbeddedDocuments(actor, embeddedName, normalizedUpdates, {
          source,
          skipRecalc: true
        });
      }
    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to apply update operations: ${error.message}`,
        {
          operation: 'update',
          collections: Object.keys(updateOps),
          underlyingError: error
        }
      );
    }
  }

export async function applyAddOps(engine, actor, addOps, source) {
    if (!addOps || Object.keys(addOps).length === 0) {
      return;
    }

    try {
      for (const [collection, documents] of Object.entries(addOps)) {
        if (!Array.isArray(documents) || documents.length === 0) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyAddOps', {
          actor: actor.id,
          collection,
          count: documents.length
        });

        try {
          const embeddedName =
            collection.charAt(0).toUpperCase() + collection.slice(1, -1);

          await engine.createEmbeddedDocuments(actor, embeddedName, documents, { source });
        } catch (err) {
          throw new MutationApplicationError(
            `Failed to add documents to ${collection}: ${err.message}`,
            { operation: 'add', collection }
          );
        }
      }
    } catch (error) {
      throw new MutationApplicationError(
        `Failed to add items: ${error.message}`,
        {
          operation: 'add',
          collections: Object.keys(addOps),
          underlyingError: error
        }
      );
    }
  }
