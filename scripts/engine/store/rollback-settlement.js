/**
 * GM rollback / reconciliation settlement (3N-TE.4, extracted verbatim from TransactionEngine.executeRollbackCorrection).
 *
 * TransactionEngine keeps the public method as a thin delegate and remains the single economic-settlement coordinator; the engine is passed as
 * `engine` for its in-flight lock set. Source-rollback refusal, verified restore and replay protection are unchanged (ti4c0-g20/g21 are the
 * parity evidence).
 */
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { sourceRollbackRefusal, emitCommitted, normalizeTransactionRecord } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { restoreVerified } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-recovery.js";

export async function executeRollbackCorrectionImpl(engine, context = {}, options = {}) {
    const {
      actor,
      amount = 0,
      reason = '',
      sourceTransactionId = '',
      removeOwnedItemIds = [],
      audit = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeRollbackCorrection'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!actor) return { success: false, transactionId, error: 'No actor provided' };

    const freshActor = game?.actors?.get?.(actor.id) || actor;
    if (!freshActor) return { success: false, transactionId, error: 'Actor no longer exists' };
    if (freshActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient permissions for transaction' };

    const normalizedAmount = normalizeCredits(amount);
    const itemIds = Array.from(new Set((Array.isArray(removeOwnedItemIds) ? removeOwnedItemIds : [])
      .map(id => String(id || '').trim())
      .filter(Boolean)));

    if ((!Number.isFinite(normalizedAmount) || normalizedAmount === 0) && itemIds.length === 0) {
      return { success: false, transactionId, error: 'Rollback requires a credit adjustment or owned item reconciliation' };
    }

    const lockKey = `${freshActor.id}:store-rollback-reconciliation`;
    if (engine._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (engine._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Rollback correction already in progress' };
    }

    engine._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
      // TI4-C0/G20: the source transaction's authoritative state is checked INSIDE the lock, before any snapshot or mutation.
      const sourceRefusal = sourceRollbackRefusal(freshActor, sourceTransactionId);
      if (sourceRefusal) {
        swseLogger.warn('TransactionEngine: Rollback reconciliation refused', { transactionId, sourceTransactionId, code: sourceRefusal.code });
        return { success: false, transactionId, ...sourceRefusal };
      }

      const creditsBefore = LedgerService.getCurrentCredits(freshActor);
      const creditsAfter = normalizeCredits(creditsBefore + normalizedAmount);
      if (creditsAfter < 0) {
        return {
          success: false,
          transactionId,
          error: `Insufficient credits for rollback correction (have ${creditsBefore}, adjustment ${normalizedAmount})`
        };
      }

      const transactionRecord = {
        id: transactionId,
        context: 'store-rollback-reconciliation',
        type: 'Rollback',
        status: 'Success',
        cost: Math.abs(normalizedAmount),
        amount: normalizedAmount,
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: freshActor.id,
        actorName: freshActor.name,
        userId: game?.user?.id ?? null,
        userName: game?.user?.name ?? null,
        reason,
        source,
        rollbackOf: sourceTransactionId || null,
        audit: {
          ...audit,
          reason,
          creditsBefore,
          creditsAfter,
          rollback: {
            sourceTransactionId: sourceTransactionId || null,
            removedOwnedItemIds: itemIds,
            reason
          }
        }
      };

      const set = {
        'system.credits': creditsAfter,
        [`flags.foundryvtt-swse.transactions.${transactionId}`]: transactionRecord
      };

      if (sourceTransactionId) {
        set[`flags.foundryvtt-swse.transactions.${sourceTransactionId}.status`] = 'Rolled Back';
        set[`flags.foundryvtt-swse.transactions.${sourceTransactionId}.rolledBackByTransactionId`] = transactionId;
        set[`flags.foundryvtt-swse.transactions.${sourceTransactionId}.rollbackReason`] = reason;
        set[`flags.foundryvtt-swse.transactions.${sourceTransactionId}.rolledBackAt`] = Date.now();
      }

      const mutationPlan = {
        set,
        delete: itemIds.length ? { items: itemIds } : {}
      };

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(
          freshActor,
          `store rollback reconciliation (${normalizedAmount} credits, ${itemIds.length} item removals)`
        );
      } catch (snapshotError) {
        swseLogger.warn('TransactionEngine: Rollback reconciliation snapshot failed; continuing without rollback snapshot', {
          transactionId,
          sourceTransactionId,
          error: snapshotError.message
        });
      }

      // TI4-C0/G20: the snapshot above was awaited; re-read the live source record so a rollback that landed meanwhile is not replayed.
      // (Same-client protection only — not compare-and-swap; another client can still race this.)
      const lateRefusal = sourceRollbackRefusal(freshActor, sourceTransactionId);
      if (lateRefusal) {
        swseLogger.warn('TransactionEngine: Rollback reconciliation refused before applying (source changed during preparation)', { transactionId, sourceTransactionId, code: lateRefusal.code });
        return { success: false, transactionId, ...lateRefusal };
      }

      await ActorEngine.applyMutationPlan(freshActor, mutationPlan, {
        validate,
        rederive,
        source: `${source}.store-rollback-reconciliation`
      });

      const presentationError = emitCommitted('swseStoreRollbackCorrectionComplete', () => ({
        transaction: normalizeTransactionRecord(freshActor, transactionRecord),
        actor: freshActor,
        sourceTransactionId,
        removedOwnedItemIds: itemIds,
        success: true
      }));

      swseLogger.info('TransactionEngine: Rollback reconciliation complete', {
        transactionId,
        sourceTransactionId,
        actor: freshActor.id,
        amount: normalizedAmount,
        removedOwnedItems: itemIds.length
      });

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        amount: normalizedAmount,
        removedOwnedItemIds: itemIds,
        ...(presentationError ? { presentationError } : {})
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Rollback reconciliation failed', {
        transactionId,
        sourceTransactionId,
        actor: freshActor?.id,
        error: error.message
      });

      if (snapshotId) {
        const restore = await restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Rollback reconciliation snapshot restore failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Rollback reconciliation failed and snapshot restore failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Rollback reconciliation snapshot restore successful', { transactionId, snapshotId });
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }
