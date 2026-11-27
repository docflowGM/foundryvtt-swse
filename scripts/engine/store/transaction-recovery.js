/**
 * TransactionEngine recovery helpers (3N-TE.5, extracted verbatim from transaction-engine.js).
 *
 * Establishing a verified recovery snapshot, restoring it with an honest outcome, and the targeted (read-compare-restore) compensation of an
 * unverified committed charge. They persist only through ActorEngine / SnapshotManager exactly as before; TransactionEngine remains the single
 * economic-settlement coordinator and passes itself as `engine` where the in-flight lock and reconciliation sets are needed.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";


/**
 * TI-2 (review TI2-R1): the caller's own proof that the change landed ran and FAILED after the charge was committed. Compensation is targeted, never a
 * whole-actor restore: the credits are put back with ONE write only if the live balance is still exactly the post-charge value (read-compare-restore),
 * and the audit record is marked Compensated in the same write. Anything else — the balance moved, the write failed, the write did not take — is
 * `indeterminate` with evidence and is never retried.
 */
export async function compensateUnverified(engine, actor, { transactionId, source, normalizedCost, creditsBefore, creditsAfter, reason, ownLockKey }) {
  const base = { success: false, verificationFailed: true, transactionId };
  const what = `the change could not be verified (${reason})`;
  if (!(normalizedCost > 0)) {return { ...base, compensated: true, error: `Transaction failed: ${what}; nothing was charged.` };}
  // TI2-R4: the read, the comparison and the write below are one decision. Another TransactionEngine operation for this actor that is ALREADY running may be
  // mid-write, so the refund is not attempted (unresolved, with evidence); one that STARTS meanwhile is refused by the reconciliation guard. Writers outside
  // the commerce authority (a sheet edit, a talent) cannot be coordinated here: the final balance is verified instead, and a mismatch is unresolved.
  const inFlight = [...engine._mutationLocks].filter((key) => key.startsWith(`${actor.id}:`) && key !== ownLockKey);
  const evidence = { creditsBefore, expectedCredits: creditsAfter, observedCredits: LedgerService.getCurrentCredits(actor), inFlight };
  if (inFlight.length > 0) {
    swseLogger.error('TransactionEngine: unverified change not compensated; another operation on this actor is in flight', { transactionId, ...evidence });
    return { ...base, indeterminate: true, error: `Transaction unresolved: ${what}, and another credit operation for this actor is in flight, so the refund was NOT attempted. Reconcile transaction ${transactionId}.`, evidence };
  }
  engine._creditReconciliations.add(actor.id);
  try {
    const observed = LedgerService.getCurrentCredits(actor);
    evidence.observedCredits = observed;
    if (observed !== creditsAfter) {
      swseLogger.error('TransactionEngine: unverified change could not be compensated; the balance changed after the charge', { transactionId, ...evidence });
      return { ...base, indeterminate: true, error: `Transaction unresolved: ${what}, and the balance changed after the charge, so it was NOT refunded automatically. Reconcile transaction ${transactionId}.`, evidence };
    }
    try {
      await ActorEngine.applyMutationPlan(actor, { set: {
        'system.credits': creditsBefore,
        [`flags.foundryvtt-swse.transactions.${transactionId}.status`]: 'Compensated',
        [`flags.foundryvtt-swse.transactions.${transactionId}.compensatedReason`]: reason
      } }, { validate: true, rederive: false, source: `${source}.compensation` });
    } catch (error) {
      swseLogger.error('TransactionEngine: compensation write failed', { transactionId, error: error?.message });
      return { ...base, indeterminate: true, error: `Transaction unresolved: ${what}, and the refund write failed (${error?.message}). Reconcile transaction ${transactionId}.`, evidence: { ...evidence, compensationError: error?.message ?? String(error) } };
    }
    const afterRefund = LedgerService.getCurrentCredits(actor);
    if (afterRefund !== creditsBefore) {
      return { ...base, indeterminate: true, error: `Transaction unresolved: ${what}, and the refund could not be confirmed (balance ${afterRefund}). Reconcile transaction ${transactionId}.`, evidence: { ...evidence, observedAfterRefund: afterRefund } };
    }
    return { ...base, compensated: true, rolledBack: true, error: `Transaction failed: ${what}; the charge of ${normalizedCost} credits was refunded.` };
  } finally {
    engine._creditReconciliations.delete(actor.id);
  }
}


/**
 * TI-2 (TX-08): recovery must be ESTABLISHED, not assumed. A snapshot counts only when it was created AND is retrievable from the actor afterwards
 * (createSnapshot resolving is not proof that anything was stored) AND is a full-actor v2 snapshot, the only kind the exact restore can verify.
 * Resolves { ok:true, snapshot } or { ok:false, error }. It never mutates anything but the snapshot history (the existing SnapshotManager write).
 */
export async function establishRecovery(actor, label) {
  try {
    const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
    const snapshot = await SnapshotManager.createSnapshot(actor, label);
    const stored = snapshot?.timestamp !== undefined ? SnapshotManager.getSnapshot(actor, snapshot.timestamp) : null;
    if (!stored || stored.schemaVersion !== 2 || stored.scope !== 'full-actor') {
      return { ok: false, error: new Error('the recovery snapshot was not found in the actor after it was created') };
    }
    return { ok: true, snapshot };
  } catch (error) {
    return { ok: false, error };
  }
}


/**
 * TI-2 (TX-08): a restore is reported as done ONLY when SnapshotManager.restoreSnapshot returned true (exact and identity-verified). The wrapper's
 * documented failure is a non-throwing `false`, which callers previously ignored while logging "rollback successful". Whole-actor restore is the
 * EXISTING mechanism and is not extended here (it can revert unrelated concurrent changes — TX-07b); this only makes its outcome honest.
 */
export async function restoreVerified(actor, snapshot) {
  try {
    const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
    const restored = await SnapshotManager.restoreSnapshot(actor, snapshot?.timestamp ?? snapshot);
    return restored === true ? { restored: true } : { restored: false, error: new Error('the snapshot restore reported failure (not restored, or not identity-exact)') };
  } catch (error) {
    return { restored: false, error };
  }
}
