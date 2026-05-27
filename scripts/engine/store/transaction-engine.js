/**
 * TransactionEngine — Legacy Atomic Coordinator
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
 * - Apply atomically via ActorEngine
 *
 * Atomic Coordinator Pattern:
 * 1️⃣  Validate all inputs (read-only)
 * 2️⃣  Compile factory plans (no mutations)
 * 3️⃣  Compile credit plan (no mutations)
 * 4️⃣  Compile placement plans (no mutations, Phase 6)
 * 5️⃣  Merge all plans (detect conflicts)
 * 6️⃣  Apply once via ActorEngine (atomic by construction)
 *
 * If ANY step fails: NOTHING is applied
 *
 * NOTE: StoreEngine achieves atomicity via SnapshotManager.
 * Future refactor can consolidate both approaches.
 */

import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { VehicleFactory } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-factory.js";
import { DroidFactory } from "/systems/foundryvtt-swse/scripts/engine/droids/droid-factory.js";
import { PlacementRouter } from "/systems/foundryvtt-swse/scripts/engine/store/placement-router.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";

export class TransactionEngine {
  static _mutationLocks = new Set();

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
      audit = {}
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

    const normalizedCost = Number(cost) || 0;
    if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
      return { success: false, transactionId, error: 'Invalid transaction cost' };
    }

    const lockKey = `${freshActor.id}:${transactionContext}`;
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

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(
          freshActor,
          `${transactionContext} transaction (${normalizedCost} credits)`
        );
      } catch (snapshotError) {
        swseLogger.warn('TransactionEngine: Snapshot creation failed; continuing without rollback snapshot', {
          transactionId,
          context: transactionContext,
          error: snapshotError.message
        });
      }

      await ActorEngine.applyMutationPlan(freshActor, mergedPlan, {
        validate,
        rederive,
        source: `${source}.${transactionContext}`
      });

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
        try {
          const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
          await SnapshotManager.restoreSnapshot(freshActor, snapshotId?.timestamp ?? snapshotId);
          swseLogger.info('TransactionEngine: Rollback successful', { transactionId, snapshotId });
        } catch (rollbackError) {
          swseLogger.error('TransactionEngine: Rollback failed', {
            transactionId,
            snapshotId,
            error: rollbackError.message
          });
          return {
            success: false,
            transactionId,
            error: `Transaction failed and rollback failed: ${error.message}`
          };
        }
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
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Credit adjustment already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let snapshotId = null;
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

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(
          freshActor,
          `${transactionContext} credit adjustment (${normalizedAmount} credits)`
        );
      } catch (snapshotError) {
        swseLogger.warn('TransactionEngine: Credit adjustment snapshot failed; continuing without rollback snapshot', {
          transactionId,
          context: transactionContext,
          error: snapshotError.message
        });
      }

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

      Hooks.callAll?.('swseCreditAdjustmentComplete', {
        transaction: this.#normalizeTransactionRecord(freshActor, transactionAudit.set[`flags.foundryvtt-swse.transactions.${transactionId}`]),
        actor: freshActor,
        success: true
      });

      return { success: true, transactionId, error: null, creditsBefore, creditsAfter, amount: normalizedAmount };
    } catch (error) {
      swseLogger.error('TransactionEngine: Credit adjustment failed', {
        transactionId,
        context: transactionContext,
        actor: freshActor?.id,
        error: error.message
      });

      if (snapshotId) {
        try {
          const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
          await SnapshotManager.restoreSnapshot(freshActor, snapshotId?.timestamp ?? snapshotId);
          swseLogger.info('TransactionEngine: Credit adjustment rollback successful', { transactionId, snapshotId });
        } catch (rollbackError) {
          return {
            success: false,
            transactionId,
            error: `Credit adjustment failed and rollback failed: ${error.message}`
          };
        }
      }

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
      return { success: false, transactionId: transferId, debitTransactionId: debit.transactionId, error: debit.error };
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
      if (!refund.success) {
        swseLogger.error('[TransactionEngine.creditTransfer] debit refund failed after credit leg failure', {
          ...logContext,
          debitTransactionId: debit.transactionId,
          failedCreditTransactionId: credit.transactionId,
          refundTransactionId: refund.transactionId,
          error: refund.error
        });
      } else {
        swseLogger.warn('[TransactionEngine.creditTransfer] debit refunded after credit leg failure', {
          ...logContext,
          debitTransactionId: debit.transactionId,
          failedCreditTransactionId: credit.transactionId,
          refundTransactionId: refund.transactionId
        });
      }
      return {
        success: false,
        transactionId: transferId,
        debitTransactionId: debit.transactionId,
        failedCreditTransactionId: credit.transactionId,
        refundTransactionId: refund.transactionId,
        error: credit.error || 'Credit leg failed'
      };
    }
    swseLogger.debug('[TransactionEngine.creditTransfer] credit leg complete', { ...logContext, debitTransactionId: debit.transactionId, creditTransactionId: credit.transactionId });

    Hooks.callAll?.('swseCreditTransferComplete', {
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
    });

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
      error: null
    };
  }

  /**
   * Approve an existing draft droid/vehicle actor as a store acquisition.
   *
   * This is the canonical path for GM-approved custom droids/ships/vehicles:
   * the credit deduction, owner actor linkage, TransactionEngine audit, and
   * draft actor ownership transfer are coordinated from one commerce boundary.
   */
  static async executeAssetApprovalTransaction(context = {}, options = {}) {
    const {
      actor,
      assetActor,
      cost = 0,
      reason = '',
      transactionContext = 'store-custom-approval',
      audit = {}
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

    const normalizedCost = normalizeCredits(cost);
    if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
      return { success: false, transactionId, error: 'Invalid approval cost' };
    }

    const lockKey = `${ownerActor.id}:${freshAsset.id}:${transactionContext}:asset-approval`;
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Asset approval transaction already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let ownerSnapshot = null;
    let assetSnapshot = null;
    try {
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

      await ActorEngine.updateActor(freshAsset, assetUpdate, {
        source: `${source}.${transactionContext}.asset`,
        skipValidation: false
      });

      await ActorEngine.applyMutationPlan(ownerActor, ownerMutationPlan, {
        validate,
        rederive,
        source: `${source}.${transactionContext}.owner`
      });

      const normalized = this.#normalizeTransactionRecord(ownerActor, transactionRecord);
      Hooks.callAll?.('swseStoreAssetAcquired', {
        transaction: normalized,
        actor: ownerActor,
        assetActor: freshAsset,
        cost: normalizedCost,
        success: true
      });

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
        assetActorId: freshAsset.id
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
        try {
          const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
          if (assetSnapshot) await SnapshotManager.restoreSnapshot(freshAsset, assetSnapshot.timestamp);
          if (ownerSnapshot) await SnapshotManager.restoreSnapshot(ownerActor, ownerSnapshot.timestamp);
          swseLogger.info('TransactionEngine: Asset approval rollback successful', { transactionId });
        } catch (rollbackError) {
          return {
            success: false,
            transactionId,
            error: `Asset approval failed and rollback failed: ${error.message}`
          };
        }
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

      const normalized = this.#normalizeTransactionRecord(freshActor, saleRecord);
      Hooks.callAll?.('swseStoreSaleComplete', {
        transaction: normalized,
        actor: freshActor,
        itemData,
        salePrice: normalizedSalePrice,
        success: true
      });

      swseLogger.info('TransactionEngine: Sale transaction complete', {
        transactionId,
        context: transactionContext,
        actor: freshActor.id,
        item: itemName,
        salePrice: normalizedSalePrice
      });

      return { success: true, transactionId, error: null, creditsBefore, creditsAfter, amount: normalizedSalePrice };
    } catch (error) {
      swseLogger.error('TransactionEngine: Sale transaction failed', {
        transactionId,
        context: transactionContext,
        actor: freshActor?.id,
        itemId: ownedItemId,
        error: error.message
      });

      if (snapshotId) {
        try {
          const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
          await SnapshotManager.restoreSnapshot(freshActor, snapshotId?.timestamp ?? snapshotId);
          swseLogger.info('TransactionEngine: Sale rollback successful', { transactionId, snapshotId });
        } catch (rollbackError) {
          return {
            success: false,
            transactionId,
            error: `Sale failed and rollback failed: ${error.message}`
          };
        }
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      this._mutationLocks.delete(lockKey);
    }
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
    if (this._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Rollback correction already in progress' };
    }

    this._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
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

      await ActorEngine.applyMutationPlan(freshActor, mutationPlan, {
        validate,
        rederive,
        source: `${source}.store-rollback-reconciliation`
      });

      const normalized = this.#normalizeTransactionRecord(freshActor, transactionRecord);
      Hooks.callAll?.('swseStoreRollbackCorrectionComplete', {
        transaction: normalized,
        actor: freshActor,
        sourceTransactionId,
        removedOwnedItemIds: itemIds,
        success: true
      });

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
        removedOwnedItemIds: itemIds
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Rollback reconciliation failed', {
        transactionId,
        sourceTransactionId,
        actor: freshActor?.id,
        error: error.message
      });

      if (snapshotId) {
        try {
          const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
          await SnapshotManager.restoreSnapshot(freshActor, snapshotId?.timestamp ?? snapshotId);
          swseLogger.info('TransactionEngine: Rollback reconciliation snapshot restore successful', { transactionId, snapshotId });
        } catch (rollbackError) {
          return {
            success: false,
            transactionId,
            error: `Rollback reconciliation failed and snapshot restore failed: ${error.message}`
          };
        }
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
