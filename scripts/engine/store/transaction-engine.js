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

      const plans = Array.isArray(mutationPlan) ? mutationPlan : [mutationPlan];
      const creditPlan = normalizedCost > 0 ? LedgerService.buildCreditDelta(freshActor, normalizedCost) : null;

      const transactionAudit = {
        set: {
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: {
            id: transactionId,
            context: transactionContext,
            cost: normalizedCost,
            createdAt: Date.now(),
            actorId: freshActor.id,
            audit
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

      return { success: true, transactionId, error: null };
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
          await SnapshotManager.restoreSnapshot(freshActor, snapshotId);
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

      const factoryPlans = [];

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

      swseLogger.debug('TransactionEngine: Factory plans compiled', {
        transactionId,
        planCount: factoryPlans.length
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
              assetType: assetType
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
