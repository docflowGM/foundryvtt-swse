/**
 * Credit-only settlements (3N-TE.4, extracted verbatim from TransactionEngine): GM/system credit adjustment and credit transfer.
 *
 * TransactionEngine keeps both public methods as thin delegates and remains the single economic-settlement coordinator; these functions receive the
 * engine as `engine` for its in-flight lock and reconciliation sets and persist only through ActorEngine / SnapshotManager exactly as before.
 * Outcome semantics (success / verified rollback / compensation / refusal / indeterminate) are unchanged.
 */
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { deriveTransactionType, emitCommitted, normalizeTransactionRecord, legSummary } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { restoreVerified } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-recovery.js";

export async function executeCreditAdjustmentImpl(engine, context = {}, options = {}) {
    const {
      actor,
      amount = 0,
      reason = '',
      transactionContext = 'store-credit-adjustment',
      audit = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeCreditAdjustment'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!engine._allowedCreditAdjustmentContexts.has(transactionContext)) {
      return { success: false, transactionId, error: `Unsupported credit adjustment context: ${transactionContext}` };
    }

    if (!actor) return { success: false, transactionId, error: 'No actor provided' };

    const freshActor = game?.actors?.get?.(actor.id) || actor;
    if (!freshActor) return { success: false, transactionId, error: 'Actor no longer exists' };
    if (freshActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient permissions for transaction' };

    const normalizedAmount = normalizeCredits(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
      return { success: false, transactionId, error: 'Credit adjustment amount must be a non-zero number' };
    }

    const lockKey = `${freshActor.id}:${transactionContext}:credit-adjustment`;
    if (engine._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (engine._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Credit adjustment already in progress' };
    }

    engine._mutationLocks.add(lockKey);

    let snapshotId = null;
    let mutationStarted = false;
    try {
      const creditsBefore = LedgerService.getCurrentCredits(freshActor);
      const creditsAfter = normalizeCredits(creditsBefore + normalizedAmount);
      if (creditsAfter < 0) {
        return {
          success: false,
          transactionId,
          error: `Insufficient credits for correction (have ${creditsBefore}, adjustment ${normalizedAmount})`
        };
      }

      const transactionAudit = {
        set: {
          'system.credits': creditsAfter,
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: {
            id: transactionId,
            context: transactionContext,
            type: deriveTransactionType(transactionContext, normalizedAmount),
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
            audit: {
              ...audit,
              reason,
              creditsBefore,
              creditsAfter
            }
          }
        }
      };

      // TI4-C0 (credit-adjustment safety): the rollback snapshot is a PRECONDITION, not best effort. If it cannot be established, the adjustment is refused
      // BEFORE any credit mutation begins, so a later failure can always be compensated (or honestly reported as unverified) instead of silently
      // leaving moved credits behind an ordinary `success:false`.
      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(
          freshActor,
          `${transactionContext} credit adjustment (${normalizedAmount} credits)`
        );
      } catch (snapshotError) {
        swseLogger.error('TransactionEngine: Credit adjustment refused; rollback snapshot could not be created', {
          transactionId,
          context: transactionContext,
          error: snapshotError?.message
        });
        return { success: false, transactionId, error: `Credit adjustment refused: the rollback snapshot could not be created (${snapshotError?.message ?? snapshotError}); no credits were changed.` };
      }
      if (!snapshotId) {
        swseLogger.error('TransactionEngine: Credit adjustment refused; rollback snapshot was not produced', { transactionId, context: transactionContext });
        return { success: false, transactionId, error: 'Credit adjustment refused: no rollback snapshot was produced; no credits were changed.' };
      }

      mutationStarted = true;
      await ActorEngine.applyMutationPlan(freshActor, transactionAudit, {
        validate,
        rederive,
        source: `${source}.${transactionContext}`
      });

      swseLogger.info('TransactionEngine: Credit adjustment complete', {
        transactionId,
        context: transactionContext,
        actor: freshActor.id,
        amount: normalizedAmount,
        creditsBefore,
        creditsAfter
      });

      const presentationError = emitCommitted('swseCreditAdjustmentComplete', () => ({
        transaction: normalizeTransactionRecord(freshActor, transactionAudit.set[`flags.foundryvtt-swse.transactions.${transactionId}`]),
        actor: freshActor,
        success: true
      }));

      return { success: true, transactionId, error: null, creditsBefore, creditsAfter, amount: normalizedAmount, ...(presentationError ? { presentationError } : {}) };
    } catch (error) {
      swseLogger.error('TransactionEngine: Credit adjustment failed', {
        transactionId,
        context: transactionContext,
        actor: freshActor?.id,
        error: error.message
      });

      // Failed before the credit mutation began: nothing was written, so this is a definitive failure.
      if (!mutationStarted) return { success: false, transactionId, error: error.message };

      // The mutation was attempted. A failure is only reported as definitive when the pre-adjustment state is VERIFIED restored; otherwise the
      // credits may have moved and the outcome is `indeterminate` (never an ordinary failure a caller could safely retry).
      const restore = snapshotId
        ? await restoreVerified(freshActor, snapshotId)
        : { restored: false, error: new Error('no rollback snapshot exists') };
      if (!restore.restored) {
        swseLogger.error('TransactionEngine: Credit adjustment rollback failed', { transactionId, snapshotId: Boolean(snapshotId), error: restore.error?.message });
        return { success: false, transactionId, rollbackFailed: true, indeterminate: true, partialMutationPossible: true, error: `Credit adjustment failed and rollback failed: ${error.message}` };
      }
      swseLogger.info('TransactionEngine: Credit adjustment rollback successful', { transactionId });

      return { success: false, transactionId, error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

export async function executeCreditTransferImpl(engine, context = {}, options = {}) {
    const {
      fromActor,
      toActor,
      amount = 0,
      reason = '',
      transactionContext = 'holonet-credit-transfer',
      audit = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeCreditTransfer'
    } = options;

    const value = normalizeCredits(amount);
    const transferId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const logContext = {
      transferId,
      transactionContext,
      source,
      fromActorId: fromActor?.id ?? null,
      fromActorName: fromActor?.name ?? null,
      toActorId: toActor?.id ?? null,
      toActorName: toActor?.name ?? null,
      amount: value,
      auditSource: audit?.source ?? null,
      holonetThreadId: audit?.threadId ?? null,
      holonetTransferId: audit?.transferId ?? null,
      validate,
      rederive
    };
    swseLogger.debug('[TransactionEngine.creditTransfer] requested', logContext);

    if (!fromActor || !toActor) {
      const error = 'Credit transfer requires source and target actors';
      swseLogger.error('[TransactionEngine.creditTransfer] rejected: missing actor', { ...logContext, error });
      return { success: false, transactionId: transferId, error };
    }
    if (!Number.isFinite(value) || value <= 0) {
      const error = 'Credit transfer amount must be positive';
      swseLogger.error('[TransactionEngine.creditTransfer] rejected: invalid amount', { ...logContext, error });
      return { success: false, transactionId: transferId, error };
    }
    if (!engine._allowedCreditAdjustmentContexts.has(transactionContext)) {
      const error = `Unsupported credit transfer context: ${transactionContext}`;
      swseLogger.error('[TransactionEngine.creditTransfer] rejected: unsupported context', { ...logContext, error });
      return { success: false, transactionId: transferId, error };
    }

    // Capture pre-transfer snapshots so both actors can be restored if a leg
    // fails and the compensating refund cannot complete (two-actor atomicity).
    let fromSnapshot = null;
    let toSnapshot = null;
    try {
      const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
      fromSnapshot = await SnapshotManager.createSnapshot(fromActor, `${transactionContext} sender before transfer ${transferId}`);
      toSnapshot = await SnapshotManager.createSnapshot(toActor, `${transactionContext} recipient before transfer ${transferId}`);
    } catch (snapErr) {
      swseLogger.warn('[TransactionEngine.creditTransfer] snapshot failed; falling back to compensating-refund rollback only', { ...logContext, error: snapErr.message });
    }

    swseLogger.debug('[TransactionEngine.creditTransfer] debit leg starting', logContext);
    const debit = await engine.executeCreditAdjustment({
      actor: fromActor,
      amount: -value,
      reason: reason || `Transfer credits to ${toActor.name}`,
      transactionContext,
      audit: {
        ...audit,
        transferId,
        transferLeg: 'debit',
        toActorId: toActor.id,
        toActorName: toActor.name
      }
    }, { source: `${source}.debit`, validate, rederive });

    if (!debit.success) {
      swseLogger.error('[TransactionEngine.creditTransfer] debit leg failed', { ...logContext, debitTransactionId: debit.transactionId, error: debit.error });
      // TI-2 (TI2-R3): the leg's own unresolved state is carried through (a debit whose rollback failed may have left the sender charged).
      return {
        success: false,
        transactionId: transferId,
        debitTransactionId: debit.transactionId,
        error: debit.error,
        ...(debit.rollbackFailed ? { rollbackFailed: true } : {}),
        ...(debit.indeterminate ? { indeterminate: true } : {}),
        ...(debit.rollbackFailed || debit.indeterminate ? { evidence: { debit: legSummary(debit) } } : {})
      };
    }
    swseLogger.debug('[TransactionEngine.creditTransfer] debit leg complete', { ...logContext, debitTransactionId: debit.transactionId });

    swseLogger.debug('[TransactionEngine.creditTransfer] credit leg starting', { ...logContext, debitTransactionId: debit.transactionId });
    const credit = await engine.executeCreditAdjustment({
      actor: toActor,
      amount: value,
      reason: reason || `Received credits from ${fromActor.name}`,
      transactionContext,
      audit: {
        ...audit,
        transferId,
        transferLeg: 'credit',
        fromActorId: fromActor.id,
        fromActorName: fromActor.name,
        debitTransactionId: debit.transactionId
      }
    }, { source: `${source}.credit`, validate, rederive });

    if (!credit.success) {
      // TI-2 (TI2-R3): the recipient leg is itself UNRESOLVED (its own rollback failed or its outcome is unknown): the recipient may already hold the
      // credits, so refunding the sender automatically could create credits. Report it; do not guess, retry or restore.
      if (credit.rollbackFailed === true || credit.indeterminate === true) {
        swseLogger.error('[TransactionEngine.creditTransfer] credit leg UNRESOLVED; the debit is NOT refunded automatically', {
          ...logContext, debitTransactionId: debit.transactionId, failedCreditTransactionId: credit.transactionId, error: credit.error
        });
        return {
          success: false,
          transactionId: transferId,
          debitTransactionId: debit.transactionId,
          failedCreditTransactionId: credit.transactionId,
          indeterminate: true,
          ...(credit.rollbackFailed ? { rollbackFailed: true } : {}),
          error: `Credit transfer could not be reconciled: the recipient leg is unresolved (${credit.error}). The sender was debited ${value} and was NOT refunded automatically because the recipient may already hold the credits. Reconcile transactions ${debit.transactionId} and ${credit.transactionId}.`,
          evidence: { debit: legSummary(debit), credit: legSummary(credit) }
        };
      }
      swseLogger.error('[TransactionEngine.creditTransfer] credit leg failed; refunding debit', {
        ...logContext,
        debitTransactionId: debit.transactionId,
        failedCreditTransactionId: credit.transactionId,
        error: credit.error
      });
      const refund = await engine.executeCreditAdjustment({
        actor: fromActor,
        amount: value,
        reason: `Refund failed transfer to ${toActor.name}`,
        transactionContext: 'holonet-credit-transfer-refund',
        audit: {
          ...audit,
          transferId,
          failedCreditTransactionId: credit.transactionId,
          debitTransactionId: debit.transactionId,
          toActorId: toActor.id,
          toActorName: toActor.name
        }
      }, { source: `${source}.refundDebit`, validate, rederive });
      const ids = {
        transactionId: transferId,
        debitTransactionId: debit.transactionId,
        failedCreditTransactionId: credit.transactionId,
        refundTransactionId: refund.transactionId
      };
      if (refund.success) {
        swseLogger.warn('[TransactionEngine.creditTransfer] debit refunded after credit leg failure', { ...logContext, ...ids });
        return { success: false, ...ids, compensated: true, error: credit.error || 'Credit leg failed' };
      }
      swseLogger.error('[TransactionEngine.creditTransfer] debit refund failed after credit leg failure', { ...logContext, ...ids, error: refund.error });
      // Last-resort (EXISTING behavior, not extended): restore both actors to their pre-transfer snapshots. It is NOT attempted when the refund itself is
      // unresolved (its outcome is unknown, so the actor's state cannot be assumed), and it only counts when every restore was observed to succeed.
      const refundUnresolved = refund.rollbackFailed === true || refund.indeterminate === true;
      const restores = [];
      if (!refundUnresolved) {
        if (fromSnapshot) {restores.push({ actor: 'sender', ...(await restoreVerified(fromActor, fromSnapshot)) });}
        if (toSnapshot) {restores.push({ actor: 'recipient', ...(await restoreVerified(toActor, toSnapshot)) });}
      }
      if (restores.length > 0 && restores.every((r) => r.restored)) {
        swseLogger.warn('[TransactionEngine.creditTransfer] restored both actors from snapshot after refund failure', logContext);
        return { success: false, ...ids, compensated: true, recovery: 'snapshot-restore', error: credit.error || 'Credit leg failed' };
      }
      swseLogger.error('[TransactionEngine.creditTransfer] recovery FAILED after refund failure; manual reconciliation required', { ...logContext, ...ids });
      return {
        success: false,
        ...ids,
        rollbackFailed: true,
        ...(refundUnresolved ? { indeterminate: true } : {}),
        error: `Credit transfer could not be reconciled: the recipient leg failed (${credit.error}), the sender's refund failed (${refund.error}), and ${refundUnresolved ? 'the refund outcome is unresolved' : (restores.length ? 'the snapshot restore did not succeed' : 'no snapshot was available to restore')}. The sender may still be debited ${value}. Reconcile transactions ${ids.debitTransactionId}, ${ids.failedCreditTransactionId} and ${ids.refundTransactionId}.`,
        evidence: {
          debit: legSummary(debit),
          credit: legSummary(credit),
          refund: legSummary(refund),
          restores: restores.map((r) => ({ actor: r.actor, restored: r.restored, error: r.error?.message ?? null })),
          snapshotsAvailable: !!(fromSnapshot || toSnapshot)
        }
      };
    }
    swseLogger.debug('[TransactionEngine.creditTransfer] credit leg complete', { ...logContext, debitTransactionId: debit.transactionId, creditTransactionId: credit.transactionId });

    const presentationError = emitCommitted('swseCreditTransferComplete', () => ({
      transaction: {
        id: transferId,
        transactionId: transferId,
        fromActorId: fromActor.id,
        fromActorName: fromActor.name,
        toActorId: toActor.id,
        toActorName: toActor.name,
        amount: value,
        context: transactionContext,
        debitTransactionId: debit.transactionId,
        creditTransactionId: credit.transactionId,
        audit
      },
      fromActor,
      toActor,
      success: true
    }));

    swseLogger.info('[TransactionEngine.creditTransfer] complete', {
      ...logContext,
      debitTransactionId: debit.transactionId,
      creditTransactionId: credit.transactionId
    });
    return {
      success: true,
      transactionId: transferId,
      debitTransactionId: debit.transactionId,
      creditTransactionId: credit.transactionId,
      amount: value,
      error: null,
      ...(presentationError ? { presentationError } : {})
    };
  }
