/**
 * TransactionEngine — Sovereign Atomic Coordinator
 *
 * PHASE 4: Core transaction orchestration
 *
 * Responsibilities:
 * - Orchestrate multi-item commerce transactions
 * - Compile factory plans (vehicles, droids, items)
 * - Compile credit plans
 * - Compile placement plans (Phase 6)
 * - Merge all plans
 * - Apply atomically via ActorEngine
 *
 * Architecture:
 * 1️⃣  Validate all inputs (read-only)
 * 2️⃣  Compile factory plans (no mutations)
 * 3️⃣  Compile credit plan (no mutations)
 * 4️⃣  Compile placement plans (no mutations, Phase 6)
 * 5️⃣  Merge all plans (detect conflicts)
 * 6️⃣  Apply once via ActorEngine (atomic by construction)
 *
 * If ANY step fails: NOTHING is applied
 */

import { mergeMutationPlans } from '../mutation/merge-mutations.js';
import { ActorEngine } from '../actor-engine/actor-engine.js';
import { LedgerService } from './ledger-service.js';
import { VehicleFactory } from '../vehicles/vehicle-factory.js';
import { DroidFactory } from '../droids/droid-factory.js';
import { PlacementRouter } from './placement-router.js';
import { swseLogger } from '../../utils/logger.js';

export class TransactionEngine {
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
