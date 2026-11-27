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

import { createProvisionalLedger } from '/systems/foundryvtt-swse/scripts/engine/store/provisional-ledger.js';
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
// parseTransactionCost lives in transaction-helpers.js (re-exported for existing importers).
export { parseTransactionCost } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";

import { assetApprovalLockKey, normalizeTransactionRecord, parseTransactionCost } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";

import { executeCreditAdjustmentImpl, executeCreditTransferImpl } from "/systems/foundryvtt-swse/scripts/engine/store/credit-settlements.js";
import { executeRollbackCorrectionImpl } from "/systems/foundryvtt-swse/scripts/engine/store/rollback-settlement.js";
import { executeAssetCustomizationTransactionImpl, executeAssetApprovalTransactionImpl, executeSaleTransactionImpl, executeAssetSaleTransactionImpl, reconcileAssetSaleImpl } from "/systems/foundryvtt-swse/scripts/engine/store/asset-settlements.js";
import { executeMutationTransactionImpl } from "/systems/foundryvtt-swse/scripts/engine/store/mutation-settlement.js";

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
    'sheet-credit-adjustment',   // an owner's manual wallet adjustment from the character sheet (recorded as a Correction)
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
  /** Draft (provisional) purchasing-power ledger for progression/mannequin builds: pure, persists nothing (see provisional-ledger.js). */
  static createProvisionalLedger() {
    return createProvisionalLedger();
  }

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
    return executeMutationTransactionImpl(this, ...arguments);
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
