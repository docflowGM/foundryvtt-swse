/**
 * TransactionEngine — Commerce Transaction Coordinator (NOT multi-document atomic)
 *
 * PHASE 4 CONSOLIDATION NOTE:
 * As of Phase 4 consolidation, StoreEngine is the single authority for store operations.
 * TransactionEngine is the shared actor-scoped coordinator for mutation + credit exchange contexts.
 *
 * Status:
 * ├─ StoreEngine.purchase() ............... ACTIVE (single public API)
 * ├─ TransactionEngine.executeMutationTransaction() ACTIVE (contextual mutation exchange)
 * └─ Future: Can be integrated if StoreEngine needs rearchitecture
 *
 * Purpose (when active):
 * - Orchestrate multi-item commerce transactions
 * - Compile factory plans (vehicles, droids, items)
 * - Compile credit plans
 * - Compile placement plans (Phase 6)
 * - Merge all plans
 * - Apply through ActorEngine (sequentially, in bucket order — see "Guarantee" below)
 *
 * Coordinator Pattern:
 * 1️⃣  Validate all inputs (read-only)
 * 2️⃣  Compile factory plans (no mutations)
 * 3️⃣  Compile credit plan (no mutations)
 * 4️⃣  Compile placement plans (no mutations, Phase 6)
 * 5️⃣  Merge all plans (detect conflicts)
 * 6️⃣  Apply once via ActorEngine (one plan, applied SEQUENTIALLY: CREATE, DELETE, SET, UPDATE, ADD)
 *
 * Guarantee (TI-2/TI-3 — what this does and does NOT promise): Foundry has no multi-document transaction, so a failed plan CAN leave earlier writes applied.
 * Recovery is therefore ESTABLISHED first (a purchase/customization is refused without a retrievable snapshot), the restore outcome is OBSERVED (a restore
 * that did not happen is `rollbackFailed`, never "rolled back"), the charge is VERIFIED after the write (otherwise `indeterminate`), and a post-commit
 * presentation failure never undoes a committed change. Same client only (L1): another client, or a writer outside this engine, is not coordinated.
 * Whole-actor snapshot restore is the existing recovery mechanism; it can revert unrelated concurrent changes in the failure window.
 */

import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { VehicleFactory } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-factory.js";
import { DroidFactory } from "/systems/foundryvtt-swse/scripts/engine/droids/droid-factory.js";
import { PlacementRouter } from "/systems/foundryvtt-swse/scripts/engine/store/placement-router.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";

/** H7: a cost is a finite number or a non-empty numeric string; anything else is NaN (refused by the caller). An omitted cost defaults to 0 upstream. */
export function parseTransactionCost(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";

export class TransactionEngine {
  static _mutationLocks = new Set();
  // TI-2 (review TI2-R4): actor ids whose credits are being RECONCILED right now (a compensation is reading, comparing and writing). While an id is in this set,
  // every TransactionEngine credit operation for that actor is refused instead of interleaving with the compensation. Same client only (L1).
  static _creditReconciliations = new Set();

  static _allowedMutationContexts = new Set([
    'owned-customization',
    'store-purchase',
    'store-customization-checkout'
  ]);

  static _blockedMutationContexts = new Set([
    'store-customization-stage'
  ]);

  static _allowedCreditAdjustmentContexts = new Set([
    'store-credit-adjustment',
    'store-rollback-correction',
    'store-custom-approval',
    'store-custom-approval-refund',
    'gm-credit-adjustment',
    'gm-credit-refund',
    'store-rollback-reconciliation',
    'game-credit-escrow',
    'game-credit-payout',
    'game-credit-refund',
    'holonet-credit-transfer',
    'holonet-credit-transfer-refund',
    'holonet-credit-request',
    'holonet-item-trade',
    'holonet-asset-trade',
    'holonet-item-counter-offer',
    'holonet-asset-counter-offer',
    'holonet-gm-grant',
    'holonet-job-payout',
    'holonet-party-fund-contribution',
    'holonet-party-fund-payout'
  ]);

  static _allowedSaleContexts = new Set([
    'store-sale',
    'store-sale-approval',
    'store-haggle-sale'
  ]);

  /**
   * Read TransactionEngine audit entries from one actor.
   *
   * These actor flags are the canonical TransactionEngine ledger for actor-scoped
   * credit movement. Legacy purchaseHistory can mirror this for old UI, but it
   * must not be treated as the credit SSOT.
   */
  static getActorTransactions(actor, options = {}) {
    const { includeZeroCost = false, contexts = null } = options;
    if (!actor) return [];

    let records = {};
    try {
      records = actor.getFlag?.('foundryvtt-swse', 'transactions') || actor.flags?.['foundryvtt-swse']?.transactions || {};
    } catch (_err) {
      records = actor.flags?.['foundryvtt-swse']?.transactions || {};
    }

    const contextSet = Array.isArray(contexts) && contexts.length ? new Set(contexts) : null;
    return Object.values(records || {})
      .filter(record => record && typeof record === 'object')
      .filter(record => !contextSet || contextSet.has(record.context))
      .map(record => this.#normalizeTransactionRecord(actor, record))
      .filter(record => includeZeroCost || Number(record.amount || 0) !== 0)
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }

  /** Read all actor-scoped TransactionEngine audit entries. */
  static getAllTransactions(options = {}) {
    const actors = Array.from(game?.actors ?? []);
    return actors
      .flatMap(actor => this.getActorTransactions(actor, options))
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }

  static #normalizeTransactionRecord(actor, record) {
    const audit = record.audit || {};
    const amount = Number.isFinite(Number(record.amount))
      ? Number(record.amount)
      : (Number(record.cost) > 0 ? -normalizeCredits(record.cost) : 0);
    const cost = Number.isFinite(Number(record.cost))
      ? normalizeCredits(record.cost)
      : Math.abs(normalizeCredits(amount));
    const auditItems = Array.isArray(audit.items) ? audit.items.filter(item => item && typeof item === 'object') : [];
    const itemNames = Array.isArray(audit.itemNames)
      ? audit.itemNames.filter(Boolean)
      : auditItems.map(item => item?.name).filter(Boolean);
    const rollback = audit.rollback || {};

    return {
      id: record.id || record.transactionId || '',
      transactionId: record.id || record.transactionId || '',
      context: record.context || 'unknown',
      timestamp: record.createdAt || record.timestamp || 0,
      actorId: record.actorId || actor?.id || '',
      actorName: record.actorName || actor?.name || 'Unknown Actor',
      userId: record.userId || audit.userId || null,
      userName: record.userName || audit.userName || game?.users?.get?.(record.userId || audit.userId)?.name || '—',
      amount,
      cost,
      creditsBefore: record.creditsBefore ?? audit.creditsBefore ?? null,
      creditsAfter: record.creditsAfter ?? audit.creditsAfter ?? null,
      status: record.status || 'Success',
      reason: record.reason || audit.reason || record.error || '',
      source: record.source || audit.source || 'TransactionEngine',
      type: record.type || this.#deriveTransactionType(record.context, amount),
      itemNames,
      itemName: record.itemName || audit.itemName || (itemNames.length ? itemNames.join(', ') : audit.label || 'Credit Transaction'),
      itemCount: Number(audit.itemCount ?? auditItems.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) ?? itemNames.length ?? 0) || 0,
      itemIds: auditItems.map(item => item?.id || item?.itemId).filter(Boolean),
      rollbackOf: record.rollbackOf || audit.rollbackOf || rollback.sourceTransactionId || null,
      rolledBackByTransactionId: record.rolledBackByTransactionId || audit.rolledBackByTransactionId || null,
      rollbackReason: record.rollbackReason || audit.rollbackReason || rollback.reason || '',
      audit
    };
  }

  static #deriveTransactionType(context = '', amount = 0) {
    const key = String(context || '').toLowerCase();
    if (key.includes('refund') || key.includes('grant')) return 'Refund';
    if (key.includes('rollback') || key.includes('correction') || key.includes('adjustment')) return 'Correction';
    if (key.includes('sell') || key.includes('sale')) return 'Sell';
    if (key.includes('custom-approval')) return 'Approval Purchase';
    if (key.includes('purchase') || Number(amount) < 0) return 'Buy';
    if (Number(amount) > 0) return 'Credit';
    return 'Transaction';
  }

  /**
   * TI-2 (review TI2-R2): completion hooks are PRESENTATION. They run only after the transaction committed, a throwing listener must never be
   * mistaken for a failed transaction (the old inline calls sat inside the transaction's `try`, so a throwing listener triggered the rollback of a
   * committed change). Returns null, or a short description of the listener failure for the caller to report as `presentationError`.
   */
  static #emitCommitted(name, build) {
    try {
      Hooks.callAll?.(name, build());
      return null;
    } catch (error) {
      swseLogger.error(`TransactionEngine: ${name} failed after the transaction committed; the transaction is NOT undone`, { error: error?.message });
      return `${name}: ${error?.message ?? error}`;
    }
  }

  /** Reconciliation evidence for one leg of a multi-leg operation. */
  static #legSummary(leg = {}) {
    return { transactionId: leg.transactionId ?? null, success: leg.success === true, error: leg.error ?? null, rollbackFailed: leg.rollbackFailed === true, indeterminate: leg.indeterminate === true };
  }

  /**
   * TI-2 (review TI2-R1): the caller's own proof that the change landed ran and FAILED after the charge was committed. Compensation is targeted, never a
   * whole-actor restore: the credits are put back with ONE write only if the live balance is still exactly the post-charge value (read-compare-restore),
   * and the audit record is marked Compensated in the same write. Anything else — the balance moved, the write failed, the write did not take — is
   * `indeterminate` with evidence and is never retried.
   */
  static async #compensateUnverified(actor, { transactionId, source, normalizedCost, creditsBefore, creditsAfter, reason, ownLockKey }) {
    const base = { success: false, verificationFailed: true, transactionId };
    const what = `the change could not be verified (${reason})`;
    if (!(normalizedCost > 0)) {return { ...base, compensated: true, error: `Transaction failed: ${what}; nothing was charged.` };}
    // TI2-R4: the read, the comparison and the write below are one decision. Another TransactionEngine operation for this actor that is ALREADY running may be
    // mid-write, so the refund is not attempted (unresolved, with evidence); one that STARTS meanwhile is refused by the reconciliation guard. Writers outside
    // the commerce authority (a sheet edit, a talent) cannot be coordinated here: the final balance is verified instead, and a mismatch is unresolved.
    const inFlight = [...this._mutationLocks].filter((key) => key.startsWith(`${actor.id}:`) && key !== ownLockKey);
    const evidence = { creditsBefore, expectedCredits: creditsAfter, observedCredits: LedgerService.getCurrentCredits(actor), inFlight };
    if (inFlight.length > 0) {
      swseLogger.error('TransactionEngine: unverified change not compensated; another operation on this actor is in flight', { transactionId, ...evidence });
      return { ...base, indeterminate: true, error: `Transaction unresolved: ${what}, and another credit operation for this actor is in flight, so the refund was NOT attempted. Reconcile transaction ${transactionId}.`, evidence };
    }
    this._creditReconciliations.add(actor.id);
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
      this._creditReconciliations.delete(actor.id);
    }
  }

  /**
   * TI-2 (TX-08): recovery must be ESTABLISHED, not assumed. A snapshot counts only when it was created AND is retrievable from the actor afterwards
   * (createSnapshot resolving is not proof that anything was stored) AND is a full-actor v2 snapshot, the only kind the exact restore can verify.
   * Resolves { ok:true, snapshot } or { ok:false, error }. It never mutates anything but the snapshot history (the existing SnapshotManager write).
   */
  static async #establishRecovery(actor, label) {
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
  static async #restoreVerified(actor, snapshot) {
    try {
      const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
      const restored = await SnapshotManager.restoreSnapshot(actor, snapshot?.timestamp ?? snapshot);
      return restored === true ? { restored: true } : { restored: false, error: new Error('the snapshot restore reported failure (not restored, or not identity-exact)') };
    } catch (error) {
      return { restored: false, error };
    }
  }

  /**
   * Execute one actor-scoped contextual mutation transaction.
   *
   * This is the required path when credits and actor/item mutation must succeed
   * or fail as one operation. Store customization staging is intentionally not a
   * mutating context and is rejected here.
   *
   * @param {Object} context
   * @param {Actor} context.actor
   * @param {Object|Object[]} context.mutationPlan
   * @param {number} context.cost
   * @param {string} context.transactionContext
   * @param {Object} context.audit
   * @param {Object} options
   * @returns {Promise<{success:boolean, transactionId:string, error?:string}>}
   */
  static async executeMutationTransaction(context = {}, options = {}) {
    const {
      actor,
      mutationPlan = {},
      cost = 0,
      transactionContext = 'store-purchase',
      audit = {},
      verify = null
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeMutationTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (this._blockedMutationContexts.has(transactionContext)) {
      return {
        success: false,
        transactionId,
        error: `${transactionContext} is a staging context and must not mutate actor state`
      };
    }

    if (!this._allowedMutationContexts.has(transactionContext)) {
      return {
        success: false,
        transactionId,
        error: `Unsupported transaction context: ${transactionContext}`
      };
    }

    if (!actor) {
      return { success: false, transactionId, error: 'No actor provided' };
    }

    const freshActor = game?.actors?.get?.(actor.id) || actor;
    if (!freshActor) {
      return { success: false, transactionId, error: 'Actor no longer exists' };
    }

    if (freshActor.isOwner === false) {
      return { success: false, transactionId, error: 'Insufficient permissions for transaction' };
    }

    // H7: a malformed cost (null, '', non-numeric, NaN, an object) is refused, never treated as a free transaction. Only an omitted cost means 0.
    const normalizedCost = parseTransactionCost(cost);
    if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
      return { success: false, transactionId, error: 'Invalid transaction cost' };
    }

    const lockKey = `${freshActor.id}:${transactionContext}`;
    if (this._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Transaction already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
      const funds = LedgerService.validateFunds(freshActor, normalizedCost);
      if (!funds.ok) {
        return {
          success: false,
          transactionId,
          error: `Insufficient credits (have ${funds.current}, need ${funds.required})`
        };
      }

      // TI-2: recovery is established FIRST (D1); the balance is read AFTER the (slow) snapshot, immediately before the plan is built, so the credit write
      // is computed from the freshest balance this client can see.
      const recovery = await this.#establishRecovery(freshActor, `${transactionContext} transaction (${normalizedCost} credits)`);
      if (!recovery.ok) {
        swseLogger.error('TransactionEngine: Transaction refused; recovery could not be established', { transactionId, context: transactionContext, error: recovery.error?.message });
        return { success: false, transactionId, refused: 'recovery-unavailable', error: `Transaction refused: recovery could not be established (${recovery.error?.message ?? 'unknown'}). Nothing was changed.` };
      }
      snapshotId = recovery.snapshot;
      const funds2 = LedgerService.validateFunds(freshActor, normalizedCost);
      if (!funds2.ok) {
        return { success: false, transactionId, error: `Insufficient credits (have ${funds2.current}, need ${funds2.required})` };
      }
      const creditsBefore = LedgerService.getCurrentCredits(freshActor);
      const creditsAfter = normalizeCredits(creditsBefore - normalizedCost);
      const rawPlans = Array.isArray(mutationPlan) ? mutationPlan : [mutationPlan];
      const preparedAcquisition = this.#prepareStoreAcquisitionPlans({
        actor: freshActor,
        plans: rawPlans,
        transactionId,
        transactionContext,
        audit,
        source
      });
      const plans = preparedAcquisition.plans;
      const creditPlan = normalizedCost > 0 ? LedgerService.buildCreditDelta(freshActor, normalizedCost) : null;

      const transactionAudit = {
        set: {
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: {
            id: transactionId,
            context: transactionContext,
            type: transactionContext.includes('approval') ? 'Approval Purchase' : 'Buy',
            status: 'Success',
            cost: normalizedCost,
            amount: normalizedCost > 0 ? -normalizedCost : 0,
            creditsBefore,
            creditsAfter,
            createdAt: Date.now(),
            actorId: freshActor.id,
            actorName: freshActor.name,
            userId: game?.user?.id ?? null,
            userName: game?.user?.name ?? null,
            source,
            audit: {
              ...audit,
              creditsBefore,
              creditsAfter,
              acquiredActors: preparedAcquisition.acquiredActors
            }
          }
        }
      };

      const mergedPlan = mergeMutationPlans(...plans, ...(creditPlan ? [creditPlan] : []), transactionAudit);

      await ActorEngine.applyMutationPlan(freshActor, mergedPlan, {
        validate,
        rederive,
        source: `${source}.${transactionContext}`
      });

      // TI-2: success is claimed only after the charge is OBSERVED. Credits are read-modify-write with no compare-and-swap, so a concurrent writer can
      // still win inside the write itself (INTENTIONAL_LIMITATION); what this detects is a charge that is not what was planned. It does not restore
      // (a whole-actor restore here could revert the other writer's change): the result is `indeterminate` with evidence.
      const observedCredits = LedgerService.getCurrentCredits(freshActor);
      if (normalizedCost > 0 && observedCredits !== creditsAfter) {
        swseLogger.error('TransactionEngine: Mutation transaction could not be verified', { transactionId, context: transactionContext, expected: creditsAfter, observed: observedCredits });
        return { success: false, indeterminate: true, transactionId, error: `Transaction could not be verified: expected ${creditsAfter} credits after the charge, found ${observedCredits}. Check the actor's credits and items before retrying.`, evidence: { creditsBefore, expectedCredits: creditsAfter, observedCredits } };
      }

      // TI2-R1: the caller's proof that its own change landed runs INSIDE the transaction, before success is claimed.
      if (typeof verify === 'function') {
        let verdict;
        try { verdict = await verify(freshActor); } catch (verifyError) { verdict = { ok: false, reason: `verification threw: ${verifyError?.message ?? verifyError}` }; }
        if (verdict?.ok !== true) {
          swseLogger.error('TransactionEngine: Mutation transaction failed verification', { transactionId, context: transactionContext, reason: verdict?.reason });
          return await this.#compensateUnverified(freshActor, { transactionId, source: `${source}.${transactionContext}`, normalizedCost, creditsBefore, creditsAfter, reason: verdict?.reason ?? 'the change is not present', ownLockKey: lockKey });
        }
      }

      swseLogger.info('TransactionEngine: Mutation transaction complete', {
        transactionId,
        context: transactionContext,
        actor: freshActor.id,
        cost: normalizedCost
      });

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        acquiredActors: preparedAcquisition.acquiredActors
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Mutation transaction failed', {
        transactionId,
        context: transactionContext,
        actor: freshActor?.id,
        error: error.message
      });

      if (snapshotId) {
        const restore = await this.#restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Rollback failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Transaction failed and rollback failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Rollback successful', { transactionId, snapshotId });
        return { success: false, transactionId, rolledBack: true, error: error.message };
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
  }

  static #prepareStoreAcquisitionPlans({ actor, plans = [], transactionId, transactionContext, audit = {}, source = '' } = {}) {
    const normalizedContext = String(transactionContext || '').toLowerCase();
    const isStoreAcquisition = normalizedContext === 'store-purchase'
      || normalizedContext === 'store-customization-checkout'
      || normalizedContext === 'store-custom-approval';

    if (!isStoreAcquisition || !actor || !Array.isArray(plans) || plans.length === 0) {
      return { plans, acquiredActors: [] };
    }

    const prepared = StoreAcquisitionService.prepareCreateActorPlans(plans, {
      ownerActor: actor,
      ownerUserId: audit.ownerPlayerId || audit.ownerUserId || audit.userId || null,
      transactionId,
      transactionContext,
      audit,
      source
    });

    const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(actor, prepared.createdSpecs, {
      ownerActor: actor,
      ownerUserId: audit.ownerPlayerId || audit.ownerUserId || audit.userId || null,
      transactionId,
      transactionContext,
      audit,
      source
    });

    const preparedPlans = linkPlan ? [...prepared.plans, linkPlan] : prepared.plans;
    return {
      plans: preparedPlans,
      acquiredActors: StoreAcquisitionService.summarizeAssetSpecs(prepared.createdSpecs, {
        ownerActor: actor,
        ownerUserId: audit.ownerPlayerId || audit.ownerUserId || audit.userId || null,
        transactionId,
        transactionContext,
        audit,
        source
      })
    };
  }

  /**
   * Execute a GM/store credit adjustment through the TransactionEngine ledger.
   *
   * Positive amount grants credits. Negative amount deducts credits. This is the
   * canonical path for store rollback/correction credit movement so GM tools do
   * not directly mutate system.credits.
   */
  static async executeCreditAdjustment(context = {}, options = {}) {
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

    if (!this._allowedCreditAdjustmentContexts.has(transactionContext)) {
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
    if (this._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Credit adjustment already in progress' };
    }

    this._mutationLocks.add(lockKey);

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
            type: this.#deriveTransactionType(transactionContext, normalizedAmount),
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

      const presentationError = this.#emitCommitted('swseCreditAdjustmentComplete', () => ({
        transaction: this.#normalizeTransactionRecord(freshActor, transactionAudit.set[`flags.foundryvtt-swse.transactions.${transactionId}`]),
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
        ? await this.#restoreVerified(freshActor, snapshotId)
        : { restored: false, error: new Error('no rollback snapshot exists') };
      if (!restore.restored) {
        swseLogger.error('TransactionEngine: Credit adjustment rollback failed', { transactionId, snapshotId: Boolean(snapshotId), error: restore.error?.message });
        return { success: false, transactionId, rollbackFailed: true, indeterminate: true, partialMutationPossible: true, error: `Credit adjustment failed and rollback failed: ${error.message}` };
      }
      swseLogger.info('TransactionEngine: Credit adjustment rollback successful', { transactionId });

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
  }

  /**
   * Transfer credits between two actors through TransactionEngine audit records.
   * This is the canonical boundary for Holonet player-to-player credit movement:
   * debit first, credit second, and compensate the debit if the credit leg fails.
   */
  static async executeCreditTransfer(context = {}, options = {}) {
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
    if (!this._allowedCreditAdjustmentContexts.has(transactionContext)) {
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
    const debit = await this.executeCreditAdjustment({
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
        ...(debit.rollbackFailed || debit.indeterminate ? { evidence: { debit: this.#legSummary(debit) } } : {})
      };
    }
    swseLogger.debug('[TransactionEngine.creditTransfer] debit leg complete', { ...logContext, debitTransactionId: debit.transactionId });

    swseLogger.debug('[TransactionEngine.creditTransfer] credit leg starting', { ...logContext, debitTransactionId: debit.transactionId });
    const credit = await this.executeCreditAdjustment({
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
          evidence: { debit: this.#legSummary(debit), credit: this.#legSummary(credit) }
        };
      }
      swseLogger.error('[TransactionEngine.creditTransfer] credit leg failed; refunding debit', {
        ...logContext,
        debitTransactionId: debit.transactionId,
        failedCreditTransactionId: credit.transactionId,
        error: credit.error
      });
      const refund = await this.executeCreditAdjustment({
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
        if (fromSnapshot) {restores.push({ actor: 'sender', ...(await this.#restoreVerified(fromActor, fromSnapshot)) });}
        if (toSnapshot) {restores.push({ actor: 'recipient', ...(await this.#restoreVerified(toActor, toSnapshot)) });}
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
          debit: this.#legSummary(debit),
          credit: this.#legSummary(credit),
          refund: this.#legSummary(refund),
          restores: restores.map((r) => ({ actor: r.actor, restored: r.restored, error: r.error?.message ?? null })),
          snapshotsAvailable: !!(fromSnapshot || toSnapshot)
        }
      };
    }
    swseLogger.debug('[TransactionEngine.creditTransfer] credit leg complete', { ...logContext, debitTransactionId: debit.transactionId, creditTransactionId: credit.transactionId });

    const presentationError = this.#emitCommitted('swseCreditTransferComplete', () => ({
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


  /**
   * Execute an owned asset customization transaction.
   *
   * This is the cross-actor commerce boundary used by Shipyard modify-existing:
   * - walletActor receives the credit mutation and TransactionEngine audit
   * - assetActor receives the vehicle mutation and a matching audit shadow
   * - both actors are snapshotted first and restored if either leg fails
   *
   * @param {Object} context
   * @param {Actor} context.actor - Wallet/owner actor whose credits pay/refund the work
   * @param {Actor} context.assetActor - Existing droid/vehicle actor being modified
   * @param {Object|Object[]} context.assetMutationPlan - MutationPlan(s) for the asset actor
   * @param {number} context.cost - Gross installation cost
   * @param {number} context.resaleCredit - Gross resale/refund credit from removed systems
   * @param {string} context.transactionContext - Usually "owned-customization"
   * @param {Object} context.audit - Additional audit metadata
   */
  static async executeAssetCustomizationTransaction(context = {}, options = {}) {
    const {
      actor,
      assetActor,
      assetMutationPlan = {},
      cost = 0,
      resaleCredit = 0,
      reason = '',
      transactionContext = 'owned-customization',
      audit = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeAssetCustomizationTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!this._allowedMutationContexts.has(transactionContext)) {
      return { success: false, transactionId, error: `Unsupported transaction context: ${transactionContext}` };
    }
    if (!actor) return { success: false, transactionId, error: 'No wallet actor provided' };
    if (!assetActor) return { success: false, transactionId, error: 'No asset actor provided' };

    const walletActor = game?.actors?.get?.(actor.id) || actor;
    const targetAsset = game?.actors?.get?.(assetActor.id) || assetActor;
    if (!walletActor) return { success: false, transactionId, error: 'Wallet actor no longer exists' };
    if (!targetAsset) return { success: false, transactionId, error: 'Asset actor no longer exists' };
    if (walletActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient wallet actor permissions' };
    if (targetAsset.isOwner === false) return { success: false, transactionId, error: 'Insufficient asset actor permissions' };

    // H7: malformed amounts are refused, not floored to 0
    const strictCredits = (v) => { const n = parseTransactionCost(v); return Number.isFinite(n) ? normalizeCredits(n) : NaN; };
    const grossCost = strictCredits(cost);
    const grossResale = strictCredits(resaleCredit);
    if (!Number.isFinite(grossCost) || grossCost < 0) {
      return { success: false, transactionId, error: 'Invalid customization cost' };
    }
    if (!Number.isFinite(grossResale) || grossResale < 0) {
      return { success: false, transactionId, error: 'Invalid customization resale credit' };
    }

    const netCost = normalizeCredits(grossCost - grossResale);
    let creditsBefore = LedgerService.getCurrentCredits(walletActor);
    let creditsAfter = normalizeCredits(creditsBefore - netCost);
    if (!Number.isFinite(creditsBefore) || creditsBefore < 0) {
      return { success: false, transactionId, error: 'Invalid wallet credit state' };
    }
    if (creditsAfter < 0) {
      return {
        success: false,
        transactionId,
        error: `Insufficient credits (have ${creditsBefore}, need ${netCost})`
      };
    }

    const lockKey = `${walletActor.id}:${targetAsset.id}:${transactionContext}`;
    if (this._creditReconciliations.has(walletActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Asset customization already in progress' };
    }
    this._mutationLocks.add(lockKey);

    let walletSnapshot = null;
    let assetSnapshot = null;
    try {
      // TI-2 (D1): a customization is refused unless recovery is established for every actor it will change (wallet, and the asset when distinct).
      const walletRecovery = await this.#establishRecovery(walletActor, `${transactionContext} wallet transaction (${netCost} net credits)`);
      const assetRecovery = walletRecovery.ok && targetAsset.id !== walletActor.id
        ? await this.#establishRecovery(targetAsset, `${transactionContext} asset mutation (${targetAsset.name})`)
        : { ok: true, snapshot: null };
      if (!walletRecovery.ok || !assetRecovery.ok) {
        const why = (walletRecovery.error ?? assetRecovery.error)?.message ?? 'unknown';
        swseLogger.error('TransactionEngine: Asset customization refused; recovery could not be established', { transactionId, context: transactionContext, error: why });
        return { success: false, transactionId, refused: 'recovery-unavailable', error: `Customization refused: recovery could not be established (${why}). Nothing was changed.` };
      }
      walletSnapshot = walletRecovery.snapshot;
      assetSnapshot = assetRecovery.snapshot;
      // TI-2 (TX-08c): the balance is re-read after the (slow) snapshots, immediately before the plan is built.
      creditsBefore = LedgerService.getCurrentCredits(walletActor);
      creditsAfter = normalizeCredits(creditsBefore - netCost);
      if (!Number.isFinite(creditsBefore) || creditsBefore < 0 || creditsAfter < 0) {
        return { success: false, transactionId, error: `Insufficient credits (have ${creditsBefore}, need ${netCost})` };
      }

      const walletAudit = {
        id: transactionId,
        context: transactionContext,
        type: netCost < 0 ? 'Refund' : netCost > 0 ? 'Buy' : 'Customization',
        status: 'Success',
        cost: Math.abs(netCost),
        amount: netCost > 0 ? -netCost : Math.abs(netCost),
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: walletActor.id,
        actorName: walletActor.name,
        assetActorId: targetAsset.id,
        assetActorName: targetAsset.name,
        userId: game?.user?.id ?? null,
        userName: game?.user?.name ?? null,
        reason,
        source,
        audit: {
          ...audit,
          reason,
          creditsBefore,
          creditsAfter,
          grossCost,
          resaleCredit: grossResale,
          netCost,
          assetActorId: targetAsset.id,
          assetActorName: targetAsset.name
        }
      };

      const walletPlan = {
        set: {
          'system.credits': creditsAfter,
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: walletAudit
        }
      };

      const assetPlans = Array.isArray(assetMutationPlan) ? assetMutationPlan : [assetMutationPlan];
      const sameActorCustomization = targetAsset.id === walletActor.id;
      const assetAuditPlan = sameActorCustomization
        ? null
        : {
            set: {
              [`flags.foundryvtt-swse.transactions.${transactionId}`]: {
                ...walletAudit,
                actorId: targetAsset.id,
                actorName: targetAsset.name,
                walletActorId: walletActor.id,
                walletActorName: walletActor.name,
                source: `${source}.asset`,
                audit: {
                  ...walletAudit.audit,
                  walletActorId: walletActor.id,
                  walletActorName: walletActor.name
                }
              }
            }
          };
      const mergedAssetPlan = assetAuditPlan
        ? mergeMutationPlans(...assetPlans, assetAuditPlan)
        : mergeMutationPlans(...assetPlans);

      if (sameActorCustomization) {
        await ActorEngine.applyMutationPlan(walletActor, mergeMutationPlans(walletPlan, mergedAssetPlan), {
          validate,
          rederive,
          source: `${source}.${transactionContext}`
        });
      } else {
        await ActorEngine.applyMutationPlan(walletActor, walletPlan, {
          validate,
          rederive,
          source: `${source}.${transactionContext}.wallet`
        });
        await ActorEngine.applyMutationPlan(targetAsset, mergedAssetPlan, {
          validate,
          rederive,
          source: `${source}.${transactionContext}.asset`
        });
      }

      // TI-2: the wallet charge is observed before success is claimed (otherwise `indeterminate`; no blind whole-actor restore that could revert another writer).
      const observedWallet = LedgerService.getCurrentCredits(walletActor);
      if (netCost !== 0 && observedWallet !== creditsAfter) {
        swseLogger.error('TransactionEngine: Asset customization could not be verified', { transactionId, context: transactionContext, expected: creditsAfter, observed: observedWallet });
        return { success: false, indeterminate: true, transactionId, error: `Customization could not be verified: expected ${creditsAfter} credits after the charge, found ${observedWallet}. Check the actor's credits and the asset before retrying.`, evidence: { creditsBefore, expectedCredits: creditsAfter, observedCredits: observedWallet } };
      }

      // Owner ruling Q4 (TI-2): completion hooks are non-transactional. Once the customization is mechanically committed and verified, a failing listener
      // is reported as `presentationError` and never reverses it (no snapshot restore). Mechanical / persistence failures above still roll back both actors.
      const presentationError = this.#emitCommitted('swseAssetCustomizationTransactionComplete', () => ({
        transaction: this.#normalizeTransactionRecord(walletActor, walletAudit),
        actor: walletActor,
        assetActor: targetAsset,
        success: true
      }));

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        grossCost,
        resaleCredit: grossResale,
        netCost,
        ...(presentationError ? { presentationError } : {})
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Asset customization failed', {
        transactionId,
        context: transactionContext,
        walletActor: walletActor?.id,
        assetActor: targetAsset?.id,
        error: error.message
      });

      if (walletSnapshot || assetSnapshot) {
        const restores = [];
        if (assetSnapshot && targetAsset.id !== walletActor.id) {restores.push(await this.#restoreVerified(targetAsset, assetSnapshot));}
        if (walletSnapshot) {restores.push(await this.#restoreVerified(walletActor, walletSnapshot));}
        if (restores.some((r) => !r.restored)) {
          swseLogger.error('TransactionEngine: Asset customization rollback failed', { transactionId, error: restores.find((r) => !r.restored)?.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Asset customization failed and rollback failed: ${error.message}` };
        }
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
  }

  /**
   * Approve an existing draft droid/vehicle actor as a store acquisition.
   *
   * This is the canonical path for GM-approved custom droids/ships/vehicles:
   * the credit deduction, owner actor linkage, TransactionEngine audit, and
   * draft actor ownership transfer are coordinated from one commerce boundary.
   */
  /** The lock that serializes every DECISION about one (owner, draft asset) pair: the approval transaction and a denial take the same key. */
  static #assetApprovalLockKey(ownerActorId, assetActorId, transactionContext = 'store-custom-approval') {
    return `${ownerActorId}:${assetActorId}:${transactionContext}:asset-approval`;
  }

  /**
   * TI-3 (review TI3-R2): acquire the decision lock for an (owner, draft asset) pair. Returns a release function, or null when an approval (or another
   * decision) for that pair is already running. Same client only (L1); it makes a denial's check-and-delete exclusive with an approval of the same asset.
   */
  static acquireAssetDecisionLock(ownerActorId, assetActorId, transactionContext = 'store-custom-approval') {
    const key = this.#assetApprovalLockKey(ownerActorId, assetActorId, transactionContext);
    if (this._mutationLocks.has(key)) return null;
    this._mutationLocks.add(key);
    return () => { this._mutationLocks.delete(key); };
  }

  static async executeAssetApprovalTransaction(context = {}, options = {}) {
    const {
      actor,
      assetActor,
      cost = 0,
      reason = '',
      transactionContext = 'store-custom-approval',
      audit = {},
      assetUpdates = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeAssetApprovalTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!this._allowedCreditAdjustmentContexts.has(transactionContext)) {
      return { success: false, transactionId, error: `Unsupported asset approval context: ${transactionContext}` };
    }

    if (!actor) return { success: false, transactionId, error: 'No owner actor provided' };
    if (!assetActor) return { success: false, transactionId, error: 'No asset actor provided' };

    const ownerActor = game?.actors?.get?.(actor.id) || actor;
    const freshAsset = game?.actors?.get?.(assetActor.id) || assetActor;
    if (!ownerActor) return { success: false, transactionId, error: 'Owner actor no longer exists' };
    if (!freshAsset) return { success: false, transactionId, error: 'Asset actor no longer exists' };
    if (ownerActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient permissions for owner actor transaction' };
    if (!StoreAcquisitionService.isAssetActorType(freshAsset.type)) {
      return { success: false, transactionId, error: 'Approved asset must be a droid or vehicle actor' };
    }

    // H7: same strict parse as mutation transactions; a malformed approval cost is refused, not floored to 0
    const parsedCost = parseTransactionCost(cost);
    const normalizedCost = Number.isFinite(parsedCost) ? normalizeCredits(parsedCost) : NaN;
    if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
      return { success: false, transactionId, error: 'Invalid approval cost' };
    }

    const lockKey = this.#assetApprovalLockKey(ownerActor.id, freshAsset.id, transactionContext);
    if (this._creditReconciliations.has(ownerActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Asset approval transaction already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let ownerSnapshot = null;
    let assetSnapshot = null;
    try {
      // TI-3 (TX-10): the asset-state check is part of the transaction, inside the lock and before any write. An asset that already carries a store-acquisition
      // record has been approved: a second approval (a stale queue entry, a double click on another client, a retry after an unrelated post-commit failure)
      // would charge the owner again and re-link the asset. Refused with nothing changed.
      const acquired = freshAsset.system?.storeAcquisition?.transactionId
        ?? freshAsset.flags?.['foundryvtt-swse']?.storeAcquisition?.transactionId
        ?? freshAsset.getFlag?.('foundryvtt-swse', 'storeAcquisition')?.transactionId
        ?? null;
      if (acquired) {
        return { success: false, transactionId, refused: 'already-acquired', acquiredTransactionId: acquired, error: `${freshAsset.name} has already been approved (transaction ${acquired}); nothing was charged.` };
      }

      const funds = LedgerService.validateFunds(ownerActor, normalizedCost);
      if (!funds.ok) {
        return {
          success: false,
          transactionId,
          error: `Insufficient credits (have ${funds.current}, need ${funds.required})`
        };
      }

      const creditsBefore = LedgerService.getCurrentCredits(ownerActor);
      const creditsAfter = normalizeCredits(creditsBefore - normalizedCost);
      const assetSpec = {
        type: freshAsset.type,
        temporaryId: freshAsset.id,
        data: freshAsset.toObject?.(false) || foundry.utils.deepClone(freshAsset)
      };

      const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(ownerActor, [assetSpec], {
        ownerActor,
        ownerUserId: audit.ownerPlayerId || audit.ownerUserId || null,
        transactionId,
        transactionContext,
        audit,
        source
      }) || {};

      const transactionRecord = {
        id: transactionId,
        context: transactionContext,
        type: 'Approval Purchase',
        status: 'Success',
        cost: normalizedCost,
        amount: normalizedCost > 0 ? -normalizedCost : 0,
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: ownerActor.id,
        actorName: ownerActor.name,
        userId: game?.user?.id ?? null,
        userName: game?.user?.name ?? null,
        reason,
        source,
        itemName: freshAsset.name,
        audit: {
          ...audit,
          reason,
          creditsBefore,
          creditsAfter,
          acquiredActors: StoreAcquisitionService.summarizeAssetSpecs([assetSpec], {
            ownerActor,
            ownerUserId: audit.ownerPlayerId || audit.ownerUserId || null,
            transactionId,
            transactionContext,
            audit,
            source
          }),
          items: [{
            id: freshAsset.id,
            itemId: freshAsset.id,
            name: freshAsset.name,
            type: freshAsset.type,
            quantity: 1,
            cost: normalizedCost,
            actorUuid: freshAsset.uuid
          }]
        }
      };

      const ownerMutationPlan = mergeMutationPlans(
        {
          set: {
            'system.credits': creditsAfter,
            [`flags.foundryvtt-swse.transactions.${transactionId}`]: transactionRecord
          }
        },
        linkPlan
      );

      const assetUpdate = StoreAcquisitionService.buildExistingAssetUpdate(freshAsset, {
        ownerActor,
        ownerUserId: audit.ownerPlayerId || audit.ownerUserId || null,
        transactionId,
        transactionContext,
        audit,
        source
      });

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        ownerSnapshot = await SnapshotManager.createSnapshot(ownerActor, `${transactionContext} owner before asset approval`);
        assetSnapshot = await SnapshotManager.createSnapshot(freshAsset, `${transactionContext} asset before approval`);
      } catch (snapshotError) {
        swseLogger.warn('TransactionEngine: Asset approval snapshot failed; continuing without rollback snapshot', {
          transactionId,
          error: snapshotError.message
        });
      }

      // Merge any caller-supplied asset-specific updates (e.g. droid FINALIZED
      // state) so they apply atomically with the credit debit and ownership link.
      const mergedAssetUpdate = { ...(assetUpdate || {}), ...(assetUpdates || {}) };
      await ActorEngine.updateActor(freshAsset, mergedAssetUpdate, {
        source: `${source}.${transactionContext}.asset`,
        skipValidation: false
      });

      await ActorEngine.applyMutationPlan(ownerActor, ownerMutationPlan, {
        validate,
        rederive,
        source: `${source}.${transactionContext}.owner`
      });

      const presentationError = this.#emitCommitted('swseStoreAssetAcquired', () => ({
        transaction: this.#normalizeTransactionRecord(ownerActor, transactionRecord),
        actor: ownerActor,
        assetActor: freshAsset,
        cost: normalizedCost,
        success: true
      }));

      swseLogger.info('TransactionEngine: Asset approval transaction complete', {
        transactionId,
        context: transactionContext,
        ownerActor: ownerActor.id,
        assetActor: freshAsset.id,
        cost: normalizedCost
      });

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        amount: normalizedCost > 0 ? -normalizedCost : 0,
        assetActorId: freshAsset.id,
        ...(presentationError ? { presentationError } : {})
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Asset approval transaction failed', {
        transactionId,
        context: transactionContext,
        actor: ownerActor?.id,
        assetActor: freshAsset?.id,
        error: error.message
      });

      if (ownerSnapshot || assetSnapshot) {
        const restores = [];
        if (assetSnapshot) {restores.push(await this.#restoreVerified(freshAsset, assetSnapshot));}
        if (ownerSnapshot) {restores.push(await this.#restoreVerified(ownerActor, ownerSnapshot));}
        if (restores.some((r) => !r.restored)) {
          swseLogger.error('TransactionEngine: Asset approval rollback failed', { transactionId, error: restores.find((r) => !r.restored)?.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Asset approval failed and rollback failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Asset approval rollback successful', { transactionId });
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
  }

  /**
   * Execute a player item sale through the TransactionEngine.
   *
   * Store/selling UI calls this as the public commerce boundary. ActorEngine
   * remains underneath it as the atomic mutation executor, so deleting the sold
   * owned item and granting credits succeed or fail together.
   */
  static async executeSaleTransaction(context = {}, options = {}) {
    const {
      actor,
      itemId,
      salePrice = 0,
      reason = '',
      transactionContext = 'store-sale',
      audit = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeSaleTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!this._allowedSaleContexts.has(transactionContext)) {
      return { success: false, transactionId, error: `Unsupported sale transaction context: ${transactionContext}` };
    }

    if (!actor) return { success: false, transactionId, error: 'No actor provided' };

    const freshActor = game?.actors?.get?.(actor.id) || actor;
    if (!freshActor) return { success: false, transactionId, error: 'Actor no longer exists' };
    if (freshActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient permissions for transaction' };

    const ownedItemId = String(itemId || '').trim();
    if (!ownedItemId) return { success: false, transactionId, error: 'No owned item id provided' };

    const ownedItem = freshActor.items?.get?.(ownedItemId);
    if (!ownedItem) return { success: false, transactionId, error: 'Sold item is no longer owned by this actor' };

    const normalizedSalePrice = normalizeCredits(salePrice);
    if (!Number.isFinite(normalizedSalePrice) || normalizedSalePrice <= 0) {
      return { success: false, transactionId, error: 'Sale price must be greater than zero credits' };
    }

    const lockKey = `${freshActor.id}:${transactionContext}:sale:${ownedItemId}`;
    if (this._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Sale transaction already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
      const creditsBefore = LedgerService.getCurrentCredits(freshActor);
      const creditsAfter = normalizeCredits(creditsBefore + normalizedSalePrice);
      const itemData = ownedItem.toObject?.() || globalThis.foundry?.utils?.deepClone?.(ownedItem) || { id: ownedItem.id, name: ownedItem.name, type: ownedItem.type };
      const itemName = ownedItem.name || audit.itemName || 'Sold item';

      const saleRecord = {
        id: transactionId,
        context: transactionContext,
        type: 'Sell',
        status: 'Success',
        cost: normalizedSalePrice,
        amount: normalizedSalePrice,
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: freshActor.id,
        actorName: freshActor.name,
        userId: game?.user?.id ?? null,
        userName: game?.user?.name ?? null,
        reason,
        source,
        itemName,
        audit: {
          ...audit,
          reason,
          creditsBefore,
          creditsAfter,
          itemName,
          itemCount: 1,
          items: [{
            id: ownedItem.id,
            itemId: ownedItem.id,
            name: itemName,
            type: ownedItem.type,
            quantity: 1,
            salePrice: normalizedSalePrice,
            itemData
          }]
        }
      };

      const mutationPlan = mergeMutationPlans(
        { delete: { items: [ownedItem.id] } },
        {
          set: {
            'system.credits': creditsAfter,
            [`flags.foundryvtt-swse.transactions.${transactionId}`]: saleRecord
          }
        }
      );

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(
          freshActor,
          `${transactionContext} sale (${normalizedSalePrice} credits)`
        );
      } catch (snapshotError) {
        swseLogger.warn('TransactionEngine: Sale snapshot failed; continuing without rollback snapshot', {
          transactionId,
          context: transactionContext,
          error: snapshotError.message
        });
      }

      await ActorEngine.applyMutationPlan(freshActor, mutationPlan, {
        validate,
        rederive,
        source: `${source}.${transactionContext}`
      });

      const presentationError = this.#emitCommitted('swseStoreSaleComplete', () => ({
        transaction: this.#normalizeTransactionRecord(freshActor, saleRecord),
        actor: freshActor,
        itemData,
        salePrice: normalizedSalePrice,
        success: true
      }));

      swseLogger.info('TransactionEngine: Sale transaction complete', {
        transactionId,
        context: transactionContext,
        actor: freshActor.id,
        item: itemName,
        salePrice: normalizedSalePrice
      });

      return { success: true, transactionId, error: null, creditsBefore, creditsAfter, amount: normalizedSalePrice, ...(presentationError ? { presentationError } : {}) };
    } catch (error) {
      swseLogger.error('TransactionEngine: Sale transaction failed', {
        transactionId,
        context: transactionContext,
        actor: freshActor?.id,
        itemId: ownedItemId,
        error: error.message
      });

      if (snapshotId) {
        const restore = await this.#restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Sale rollback failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Sale failed and rollback failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Sale rollback successful', { transactionId, snapshotId });
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
  }

  /**
   * TI4-C0/G20 — inspect the CURRENT, authoritative state of a rollback's source transaction on the live actor.
   * Returns null when the rollback may proceed, otherwise a refusal `{ code, error, ... }`. Never throws. Reads the actor's flags (the stored record),
   * never a caller-supplied transaction object or UI flag such as `canRollback`.
   *
   * - empty/absent `sourceTransactionId`: nothing to check (legitimate source-less correction).
   * - id that is not a plain string, or that contains '.', or is a prototype property: `SOURCE_TRANSACTION_ID_INVALID`
   *   (the id becomes part of a flag path; a '.' would nest it and a missing record would be silently materialised as a stub).
   * - no record / non-object record: `SOURCE_TRANSACTION_NOT_FOUND` / `SOURCE_TRANSACTION_MALFORMED` (fail closed: the engine would otherwise create a
   *   stub source record when marking it).
   * - record already `Rolled Back`: `SOURCE_TRANSACTION_ALREADY_ROLLED_BACK` (its first rollback's id is reported, never overwritten).
   * Same-client only; this is not compare-and-swap.
   */
  static #sourceRollbackRefusal(actor, sourceTransactionId) {
    if (sourceTransactionId === undefined || sourceTransactionId === null || sourceTransactionId === '') return null;
    if (typeof sourceTransactionId !== 'string' || !sourceTransactionId.trim() || sourceTransactionId.includes('.') || sourceTransactionId !== sourceTransactionId.trim()
      || ['__proto__', 'constructor', 'prototype'].includes(sourceTransactionId)) {
      return { code: 'SOURCE_TRANSACTION_ID_INVALID', error: 'Rollback refused: the source transaction id is not valid.' };
    }
    let records;
    try {
      records = actor.getFlag?.('foundryvtt-swse', 'transactions') || actor.flags?.['foundryvtt-swse']?.transactions || {};
    } catch (_err) {
      records = actor.flags?.['foundryvtt-swse']?.transactions || {};
    }
    if (!records || typeof records !== 'object' || !Object.prototype.hasOwnProperty.call(records, sourceTransactionId)) {
      return { code: 'SOURCE_TRANSACTION_NOT_FOUND', error: `Rollback refused: source transaction ${sourceTransactionId} was not found on this actor.` };
    }
    const record = records[sourceTransactionId];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return { code: 'SOURCE_TRANSACTION_MALFORMED', error: `Rollback refused: source transaction ${sourceTransactionId} has a malformed record.` };
    }
    if (String(record.status ?? '').trim().toLowerCase() === 'rolled back') {
      return {
        code: 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK',
        alreadyRolledBack: true,
        rolledBackByTransactionId: record.rolledBackByTransactionId ?? null,
        error: `Rollback refused: source transaction ${sourceTransactionId} was already rolled back${record.rolledBackByTransactionId ? ` by ${record.rolledBackByTransactionId}` : ''}.`
      };
    }
    return null;
  }

  /**
   * Execute a GM rollback/reconciliation through the TransactionEngine.
   *
   * This is the canonical rollback path for store credit movement. It can also
   * reconcile owned embedded Items in the same actor mutation plan, so a GM
   * rollback does not split credits and item cleanup into unrelated writes.
   * Quantity policy restoration is world-setting state and should happen after
   * this method succeeds.
   */
  static async executeRollbackCorrection(context = {}, options = {}) {
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
    if (this._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Rollback correction already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
      // TI4-C0/G20: the source transaction's authoritative state is checked INSIDE the lock, before any snapshot or mutation.
      const sourceRefusal = this.#sourceRollbackRefusal(freshActor, sourceTransactionId);
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
      const lateRefusal = this.#sourceRollbackRefusal(freshActor, sourceTransactionId);
      if (lateRefusal) {
        swseLogger.warn('TransactionEngine: Rollback reconciliation refused before applying (source changed during preparation)', { transactionId, sourceTransactionId, code: lateRefusal.code });
        return { success: false, transactionId, ...lateRefusal };
      }

      await ActorEngine.applyMutationPlan(freshActor, mutationPlan, {
        validate,
        rederive,
        source: `${source}.store-rollback-reconciliation`
      });

      const presentationError = this.#emitCommitted('swseStoreRollbackCorrectionComplete', () => ({
        transaction: this.#normalizeTransactionRecord(freshActor, transactionRecord),
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
        const restore = await this.#restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Rollback reconciliation snapshot restore failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Rollback reconciliation failed and snapshot restore failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Rollback reconciliation snapshot restore successful', { transactionId, snapshotId });
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
  }

  /**
   * Execute atomic commerce transaction
   * @param {Object} context
   * @param {Actor} context.purchaser - Actor making purchase
   * @param {Array<Object>} context.cartItems - Array of items with cost/payload
   * @param {Object} options
   * @param {boolean} options.validate - Validate before executing (default: true)
   * @returns {Object} { success, transactionId, result }
   */
  static async execute(context, options = {}) {
    const {
      validate = true
    } = options;

    const {
      purchaser,
      cartItems = []
    } = context;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      swseLogger.info('TransactionEngine: Starting', {
        transactionId,
        purchaser: purchaser?.id,
        itemCount: cartItems.length
      });

      // ============================================================
      // PHASE 1: VALIDATION (READ-ONLY)
      // ============================================================

      if (!purchaser) {
        throw new Error('purchaser required');
      }

      if (!Array.isArray(cartItems)) {
        throw new Error('cartItems must be an array');
      }

      // Validate affordability
      const totalCost = LedgerService.calculateTotal(cartItems);
      const fundValidation = LedgerService.validateFunds(purchaser, totalCost);
      if (!fundValidation.ok) {
        throw new Error(`Insufficient funds: have ${fundValidation.current}, need ${fundValidation.required}`);
      }

      swseLogger.debug('TransactionEngine: Validation passed', {
        transactionId,
        totalCost,
        purchaser: purchaser.id
      });

      // ============================================================
      // PHASE 2: COMPILE FACTORY PLANS
      // ============================================================

      let factoryPlans = [];

      for (const item of cartItems) {
        if (!item || !item.type) {
          continue;
        }

        swseLogger.debug('TransactionEngine: Compiling item', {
          type: item.type,
          payload: item.payload ? Object.keys(item.payload).slice(0, 3) : []
        });

        // Compile based on item type
        const itemPlan = await this._compileCartItem(item);
        if (itemPlan) {
          factoryPlans.push(itemPlan);
        }
      }

      const preparedLegacyAcquisition = StoreAcquisitionService.prepareCreateActorPlans(factoryPlans, {
        ownerActor: purchaser,
        ownerUserId: game?.user?.id || null,
        transactionId,
        transactionContext: 'store-purchase',
        audit: {},
        source: 'TransactionEngine.execute'
      });
      factoryPlans = preparedLegacyAcquisition.plans;

      swseLogger.debug('TransactionEngine: Factory plans compiled', {
        transactionId,
        planCount: factoryPlans.length,
        acquiredActorCount: preparedLegacyAcquisition.createdSpecs?.length || 0
      });

      // ============================================================
      // PHASE 3: COMPILE CREDIT PLAN
      // ============================================================

      const creditPlan = LedgerService.buildCreditDelta(purchaser, totalCost);

      swseLogger.debug('TransactionEngine: Credit plan compiled', {
        transactionId,
        totalCost
      });

      // ============================================================
      // PHASE 4: MERGE ALL PLANS
      // ============================================================

      let mergedPlan = {};

      // Merge all factory plans
      for (const plan of factoryPlans) {
        mergedPlan = mergeMutationPlans([mergedPlan, plan]);
      }

      // Merge credit plan
      mergedPlan = mergeMutationPlans([mergedPlan, creditPlan]);

      // ============================================================
      // PHASE 4b: COMPILE PLACEMENT PLANS (Phase 6)
      // ============================================================

      // PHASE 6: Route created assets to placement locations
      if (mergedPlan.create?.actors && mergedPlan.create.actors.length > 0) {
        const placementPlans = [];

        for (const createdSpec of mergedPlan.create.actors) {
          // Find the corresponding cart item to determine asset type
          let assetType = 'item'; // default
          for (const item of cartItems) {
            if (item.payload?.template?.id === createdSpec.data.system?.buildMetadata?.templateId) {
              assetType = 'vehicle';
              break;
            }
          }

          try {
            const placementPlan = PlacementRouter.route({
              purchaser,
              createdTempId: createdSpec.temporaryId,
              assetType: assetType,
              createdSpec,
              transactionId
            });

            swseLogger.debug('TransactionEngine: Placement plan compiled', {
              tempId: createdSpec.temporaryId,
              assetType,
              purchaserType: purchaser.type
            });

            placementPlans.push(placementPlan);
          } catch (err) {
            swseLogger.error('TransactionEngine: Failed to route placement', {
              error: err.message,
              tempId: createdSpec.temporaryId
            });
            throw err;
          }
        }

        // Merge placement plans
        for (const plan of placementPlans) {
          mergedPlan = mergeMutationPlans([mergedPlan, plan]);
        }
      }

      swseLogger.info('TransactionEngine: Plans merged', {
        transactionId,
        hasCreates: !!mergedPlan.create,
        hasSets: !!mergedPlan.set,
        hasAdds: !!mergedPlan.add,
        hasDeletes: !!mergedPlan.delete
      });

      // ============================================================
      // PHASE 5: APPLY ATOMICALLY
      // ============================================================

      await ActorEngine.applyMutationPlan(purchaser, mergedPlan, {
        validate: validate,
        rederive: true,
        source: 'TransactionEngine.execute'
      });

      swseLogger.info('TransactionEngine: Transaction complete', {
        transactionId,
        purchaser: purchaser.id,
        itemCount: cartItems.length,
        totalCost
      });

      return {
        success: true,
        transactionId,
        result: {
          purchaser: purchaser.id,
          itemCount: cartItems.length,
          totalCost
        }
      };

    } catch (error) {
      swseLogger.error('TransactionEngine: Transaction failed', {
        transactionId,
        purchaser: purchaser?.id,
        error: error.message
      });

      return {
        success: false,
        transactionId,
        error: error.message
      };
    }
  }

  /**
   * Compile a single cart item into MutationPlan
   * @private
   */
  static async _compileCartItem(item) {
    const { type, payload } = item;

    if (!type) {
      return null;
    }

    try {
      switch (type) {
        case 'vehicle':
          // PHASE 5: Use VehicleFactory for vehicle creation
          return VehicleFactory.buildMutationPlan(payload);

        case 'droid':
          // PHASE 7: Use DroidFactory for droid creation
          return DroidFactory.buildMutationPlan(payload);

        case 'item':
          // Regular items use ADD bucket (embedded docs)
          return {
            add: {
              items: payload && payload.itemData ? [payload.itemData] : []
            }
          };

        default:
          swseLogger.warn('TransactionEngine: Unknown cart item type', { type });
          return null;
      }
    } catch (err) {
      swseLogger.error('TransactionEngine: Failed to compile item', {
        type,
        error: err.message
      });
      throw err;
    }
  }
}
