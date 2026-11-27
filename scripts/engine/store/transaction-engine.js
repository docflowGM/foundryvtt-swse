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
// parseTransactionCost lives in transaction-helpers.js (re-exported for existing importers).
export { parseTransactionCost } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";

import { stampAcquisitions, lotIdFor } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-record.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";

import { sameOwnership } from "/systems/foundryvtt-swse/scripts/engine/store/resale-authority.js";
import { deriveTransactionType, legSummary, assetApprovalLockKey, sourceRollbackRefusal, normalizeTransactionRecord, emitCommitted, parseTransactionCost } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";
import { compensateUnverified, establishRecovery, restoreVerified } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-recovery.js";
import { executeCreditAdjustmentImpl, executeCreditTransferImpl } from "/systems/foundryvtt-swse/scripts/engine/store/credit-settlements.js";
import { executeRollbackCorrectionImpl } from "/systems/foundryvtt-swse/scripts/engine/store/rollback-settlement.js";
import { executeAssetCustomizationTransactionImpl, executeAssetApprovalTransactionImpl, executeSaleTransactionImpl, executeAssetSaleTransactionImpl, reconcileAssetSaleImpl, observeAssetSale, revertAssetDisposition, otherLinkers, playerAccessOn } from "/systems/foundryvtt-swse/scripts/engine/store/asset-settlements.js";

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
    'store-sale',            // automatic canonical resale, executed by the owning player
    'store-sale-approval',   // a GM approves a request (canonical quote or appraisal)
    'store-haggle-sale'      // a GM counteroffer / appraisal
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
      .map(record => normalizeTransactionRecord(actor, record))
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
      const recovery = await establishRecovery(freshActor, `${transactionContext} transaction (${normalizedCost} credits)`);
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
      // Acquisition provenance: delivered Items / Actors get a REFERENCE to this committed transaction (the ledger line below is the evidence).
      const acquiredAtStamp = Date.now();
      // Each purchase line gets a unique lot id in the ledger; delivered assets are allocated to lots one-to-one (see acquisition-record.js).
      const auditLines = Array.isArray(audit?.items) ? audit.items.map((line, index) => ({ ...line, lotId: lotIdFor(transactionId, index) })) : audit?.items;
      const claimedLots = new Set();   // ONE set for the whole transaction: lots are allocated across all plans
      for (const plan of plans) stampAcquisitions(plan, { transactionId, context: transactionContext, at: acquiredAtStamp, lines: Array.isArray(auditLines) ? auditLines : [], claimed: claimedLots });
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
              ...(Array.isArray(auditLines) ? { items: auditLines } : {}),
              creditsBefore,
              creditsAfter,
              acquiredActors: preparedAcquisition.acquiredActors
            }
          }
        }
      };

      const mergedPlan = mergeMutationPlans(...plans, ...(creditPlan ? [creditPlan] : []), transactionAudit);

      // F-STO-001: ActorEngine creates CREATE-bucket world actors (purchased droids/vehicles) FIRST, and removes them on failure ONLY in transactional
      // mode. A plan that creates world actors is therefore applied transactionally; plans that create none keep the existing non-transactional path
      // (no extra snapshot). On failure the engine attaches verified rollback evidence to the thrown error (`error.rollback`), read in the catch below.
      const createsWorldActors = Array.isArray(mergedPlan?.create?.actors) && mergedPlan.create.actors.length > 0;
      await ActorEngine.applyMutationPlan(freshActor, mergedPlan, {
        validate,
        rederive,
        transactional: createsWorldActors,
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
          return await compensateUnverified(this, freshActor, { transactionId, source: `${source}.${transactionContext}`, normalizedCost, creditsBefore, creditsAfter, reason: verdict?.reason ?? 'the change is not present', ownLockKey: lockKey });
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

      // F-STO-001: rollback is claimed only when EVERYTHING the plan changed is verified undone. ActorEngine's transactional mode reports the
      // purchaser restore and the removal of created world actors (verified against the world registry); anything but FAILED_COMPENSATED means a
      // purchased actor and/or the purchaser's changes may remain, so the result is `indeterminate` (the store holds stock for it), never `rolledBack`.
      const planRollback = error?.rollback ?? null;
      const planCleanupUnverified = planRollback != null && planRollback.outcome !== 'FAILED_COMPENSATED';
      const unresolvedCreatedIds = planCleanupUnverified
        ? [...new Set([...(planRollback.created?.stillPresent ?? []), ...(planRollback.created?.unverifiable ?? [])])]
        : [];
      const unresolvedResult = () => ({
        success: false, transactionId, indeterminate: true, rollbackFailed: true,
        createdActorIds: unresolvedCreatedIds,
        rollbackEvidence: { outcome: planRollback?.outcome ?? null, compensation: planRollback?.compensation ?? null, reasons: planRollback?.reasons ?? [] },
        error: `Transaction failed (${error.message}) and could not be fully undone${unresolvedCreatedIds.length ? `: purchased actor(s) ${unresolvedCreatedIds.join(', ')} may still exist` : ''}. A GM must review before retrying.`
      });

      if (snapshotId) {
        const restore = await restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Rollback failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, ...(planCleanupUnverified ? { indeterminate: true, createdActorIds: unresolvedCreatedIds } : {}), error: `Transaction failed and rollback failed: ${error.message}` };
        }
        if (planCleanupUnverified) {
          swseLogger.error('TransactionEngine: Rollback incomplete; created world actors could not be verified removed', { transactionId, createdActorIds: unresolvedCreatedIds, reasons: planRollback.reasons });
          return unresolvedResult();
        }
        swseLogger.info('TransactionEngine: Rollback successful', { transactionId, snapshotId });
        return { success: false, transactionId, rolledBack: true, error: error.message };
      }

      if (planCleanupUnverified) return unresolvedResult();
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
    return executeCreditAdjustmentImpl(this, ...arguments);
  }

  /**
   * Transfer credits between two actors through TransactionEngine audit records.
   * This is the canonical boundary for Holonet player-to-player credit movement:
   * debit first, credit second, and compensate the debit if the credit leg fails.
   */
  static async executeCreditTransfer(context = {}, options = {}) {
    return executeCreditTransferImpl(this, ...arguments);
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
    return executeAssetCustomizationTransactionImpl(this, ...arguments);
  }

  /**
   * Approve an existing draft droid/vehicle actor as a store acquisition.
   *
   * This is the canonical path for GM-approved custom droids/ships/vehicles:
   * the credit deduction, owner actor linkage, TransactionEngine audit, and
   * draft actor ownership transfer are coordinated from one commerce boundary.
   */

  /**
   * TI-3 (review TI3-R2): acquire the decision lock for an (owner, draft asset) pair. Returns a release function, or null when an approval (or another
   * decision) for that pair is already running. Same client only (L1); it makes a denial's check-and-delete exclusive with an approval of the same asset.
   */
  static acquireAssetDecisionLock(ownerActorId, assetActorId, transactionContext = 'store-custom-approval') {
    const key = assetApprovalLockKey(ownerActorId, assetActorId, transactionContext);
    if (this._mutationLocks.has(key)) return null;
    this._mutationLocks.add(key);
    return () => { this._mutationLocks.delete(key); };
  }

  static async executeAssetApprovalTransaction(context = {}, options = {}) {
    return executeAssetApprovalTransactionImpl(this, ...arguments);
  }

  /**
   * Execute an item sale (credit creation) through the TransactionEngine.
   *
   * The caller does NOT supply the payout. The engine re-derives it at this trusted boundary (ResaleService.verifyForCommit):
   *   authority 'canonical-automatic'  payout = floor(canonical source cost x resale policy %) x quantity, from the live owned Item
   *   authority 'gm-appraisal'         an EXECUTING GM supplies an amount and a reason; item identity/ownership/quantity are still re-verified
   * A quote the seller or GM was shown (`shownQuote`) must equal the fresh one, otherwise the sale is refused for renewed confirmation.
   * Removing the sold quantity (delete, or a quantity decrement for a partial stack), the credit and the ledger record are one ActorEngine plan.
   * Replay of a request id that already committed is refused from the actor's own ledger. Same-client lock only (no cross-client CAS).
   */
  static async executeSaleTransaction(context = {}, options = {}) {
    return executeSaleTransactionImpl(this, ...arguments);
  }

  /** Owner-side outcome of an asset sale, OBSERVED on the live actor (never inferred from a resolved/thrown call). */
  

  /** Put a disposed asset back and VERIFY the actual stored state: no pending resale, original owner id, original ownership map. */
  

  /**
   * Sell a WHOLE Droid or Vehicle. Always a GM appraisal (never an automatic payout); the executing user must be a GM.
   *
   * The two documents are two Actors, so this is a COMPENSATING sequence, not an atomic one, and it is ordered so that credit is never
   * created for an asset the seller still holds and the asset is never returned to a seller who may already have been paid:
   *   0. re-verify (GM, ownership both ways, eligibility, appraisal, replay) and ESTABLISH owner recovery (verified snapshot) BEFORE any write
   *   1. dispose the asset as `sale-pending` (kept, stripped of player access, prior state + THIS transaction id recorded)
   *   2. ONE transactional owner plan: credit + unlink + ledger record
   *   3. OBSERVE the owner; only then decide:
   *        paid (even if the call threw)        -> finalize the asset as `sold`; a post-commit error is a warning, never a failure
   *        verified unpaid (ActorEngine verified its rollback AND the owner reads exactly as before) -> revert the asset and verify the revert
   *        anything else                        -> INDETERMINATE: the asset stays GM-held as `sale-pending` (`needsReconciliation`), the owner is NOT
   *                                                refunded or re-credited and the asset is NOT restored; `reconcileAssetSale` resolves it from the ledger
   */
  static async executeAssetSaleTransaction(context = {}, options = {}) {
    return executeAssetSaleTransactionImpl(this, ...arguments);
  }

  /** Every Actor other than `owner` that still links `assetId` as owned (a conflicting transfer/disposition). */
  

  /** Does the asset still grant access to any non-GM user (its disposition did not hold)? */
  

  /**
   * GM reconciliation of an interrupted asset sale. It never infers anything from a single flag or a lone "successful" record:
   *   PAID    requires the ledger record to be THIS pending sale (id, Sell, asset-sale context, Success, owner, asset, payout, wallet transition), the
   *           owner wallet to be consistent with it, the asset unlinked everywhere, GM-held with no player access, and no conflicting disposition.
   *   UNPAID  requires no committed record at all, the wallet exactly at its pre-sale value, the asset still linked to the right owner with consistent
   *           relationships, no conflicting linker, and the restoration is VERIFIED by reading the asset afterwards.
   * Anything else stays `sale-pending` + `needsReconciliation` with the reasons recorded. Two Actors are never written atomically; this only resolves
   * the state after the fact. Executes under a per-asset lock; a second attempt after resolution finds nothing pending.
   */
  static async reconcileAssetSale({ ownerActor, assetActorId } = {}) {
    return reconcileAssetSaleImpl(this, ...arguments);
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
    return executeRollbackCorrectionImpl(this, ...arguments);
  }


}
