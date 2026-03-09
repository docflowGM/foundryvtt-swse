/**
 * scripts/engine/store/store-engine.js
 *
 * Contract API for Store Engine — Single Authority for Store Logic
 * SSOT → Engine → UI
 *
 * Public API:
 *   - getInventory(options)       : Load from compendiums + apply pricing
 *   - canPurchase(context)        : Validate actor eligibility
 *   - purchase(context)           : Execute atomic transaction
 */

import { buildStoreIndex } from "/systems/foundryvtt-swse/scripts/engine/store/index.js";
import { STORE_RULES } from "/systems/foundryvtt-swse/scripts/engine/store/store-constants.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const logger = () => SWSELogger || globalThis.swseLogger || console;

export class StoreEngine {
  // Atomic purchase lock: prevents concurrent purchase execution on same engine instance
  static _purchasingActors = new Set();

  /**
   * Get store inventory from SSOT (compendiums)
   * Returns fully normalized, categorized, and priced inventory
   *
   * @param {Object} opts
   * @param {Boolean} opts.useCache - use cached data (default true)
   * @param {Boolean} opts.ignorePolicies - skip legality/availability filters (default false)
   * @returns {Promise<Object>} { success, inventory, error }
   */
  static async getInventory(opts = {}) {
    try {
      const { useCache = true, ignorePolicies = false } = opts;

      logger().info('StoreEngine: Loading inventory', { useCache, ignorePolicies });

      // Load and process inventory through full pipeline
      const index = await buildStoreIndex({ useCache });

      if (!ignorePolicies) {
        // Apply legality/availability policies (future extensibility)
        this._applyPolicies(index);
      }

      logger().info('StoreEngine: Inventory loaded', {
        itemCount: index.allItems.length,
        categories: index.byCategory.size
      });

      return {
        success: true,
        inventory: index,
        error: null
      };
    } catch (err) {
      logger().error('StoreEngine.getInventory failed', { error: err.message, stack: err.stack });
      return {
        success: false,
        inventory: null,
        error: err.message
      };
    }
  }

  /**
   * Check if actor is eligible to purchase items
   * Validates:
   *   - Actor exists and has credits field
   *   - Actor has sufficient credits for total cost
   *   - No business logic violations (future: legality checks, availability)
   *
   * @param {Object} context
   * @param {Actor} context.actor - purchasing actor (required)
   * @param {Array<Object>} context.items - items to purchase (for logging)
   * @param {Number} context.totalCost - total cost (required)
   * @returns {Object} { success, canPurchase, reason }
   */
  static canPurchase(context) {
    const { actor, items = [], totalCost = 0 } = context;

    if (!actor || typeof actor !== 'object') {
      logger().warn('StoreEngine.canPurchase: Invalid actor', { actor });
      return {
        success: false,
        canPurchase: false,
        reason: 'Actor not found or invalid'
      };
    }

    if (typeof totalCost !== 'number' || totalCost < 0) {
      logger().warn('StoreEngine.canPurchase: Invalid cost', { totalCost, actor: actor.id });
      return {
        success: false,
        canPurchase: false,
        reason: 'Invalid cost calculation'
      };
    }

    // PHASE 3: Delegate to LedgerService
    const validation = LedgerService.validateFunds(actor, totalCost);

    if (!validation.ok) {
      logger().warn('StoreEngine: Funds validation failed', {
        actor: actor.id,
        reason: validation.reason,
        have: validation.current,
        need: validation.required
      });
      return {
        success: true,
        canPurchase: false,
        reason: `Insufficient credits (have ${validation.current}, need ${validation.required})`
      };
    }

    logger().debug('StoreEngine.canPurchase: OK', {
      actor: actor.id,
      itemCount: items.length,
      totalCost
    });

    return {
      success: true,
      canPurchase: true,
      reason: null
    };
  }

  /**
   * Execute atomic purchase transaction
   * Changes:
   *   - Deduct credits from actor
   *   - Grant items (if itemGrantCallback provided)
   *   - Emit audit log
   *
   * ATOMIC: Either fully succeeds or fully fails. No partial state.
   * OWNERSHIP ENFORCED: Only actor owner can complete purchases
   * IDEMPOTENT: Session-level duplicate guard prevents double-grants
   *
   * @param {Object} context
   * @param {Actor} context.actor - purchasing actor (required)
   * @param {Array<Object>} context.items - items to grant (required)
   * @param {Number} context.totalCost - total cost (required)
   * @param {Function} context.itemGrantCallback - async function(actor, items) to grant items (optional)
   * @returns {Promise<Object>} { success, error, transactionId }
   */
  static async purchase(context) {
    const {
      actor,
      items = [],
      totalCost = 0,
      itemGrantCallback = null
    } = context;

    if (!actor) {
      logger().error('StoreEngine.purchase: No actor', {});
      return { success: false, error: 'No actor provided', transactionId: null };
    }

    // HARDENING 1: Ownership enforcement
    if (!actor.isOwner) {
      logger().error('StoreEngine.purchase: Insufficient permissions', {
        actor: actor.id,
        isOwner: actor.isOwner
      });
      return {
        success: false,
        error: 'Insufficient permissions to complete purchase.',
        transactionId: null
      };
    }

    // HARDENING 2: Atomic purchase lock per actor (prevent concurrent purchases)
    if (this._purchasingActors.has(actor.id)) {
      logger().error('StoreEngine.purchase: Purchase already in progress', {
        actor: actor.id
      });
      return {
        success: false,
        error: 'Purchase already in progress. Please wait.',
        transactionId: null
      };
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this._purchasingActors.add(actor.id);

    try {
      // HARDENING 3: Re-read fresh actor state immediately before write (closes race window)
      const freshActor = game.actors.get(actor.id);
      if (!freshActor) {
        logger().error('StoreEngine.purchase: Actor no longer exists', {
          transactionId,
          actor: actor.id
        });
        return {
          success: false,
          error: 'Actor no longer exists.',
          transactionId
        };
      }

      // HARDENING 7: Defensive numeric validation
      const currentCredits = Number(freshActor.system?.credits) ?? 0;
      if (!Number.isFinite(currentCredits) || currentCredits < 0) {
        logger().error('StoreEngine.purchase: Invalid credit state', {
          transactionId,
          actor: actor.id,
          currentCredits
        });
        return {
          success: false,
          error: 'Invalid credit state.',
          transactionId
        };
      }

      if (!Number.isFinite(totalCost) || totalCost < 0) {
        logger().error('StoreEngine.purchase: Invalid cart total', {
          transactionId,
          actor: actor.id,
          totalCost
        });
        return {
          success: false,
          error: 'Invalid cart total.',
          transactionId
        };
      }

      // PHASE 3: Validate via LedgerService (pure, no mutations)
      const ledgerValidation = LedgerService.validateFunds(freshActor, totalCost);
      if (!ledgerValidation.ok) {
        logger().warn('StoreEngine: Insufficient credits at execution time', {
          transactionId,
          actor: actor.id,
          reason: ledgerValidation.reason,
          have: ledgerValidation.current,
          need: ledgerValidation.required
        });
        return {
          success: false,
          error: `Insufficient credits at time of transaction (have ${ledgerValidation.current}, need ${ledgerValidation.required}).`,
          transactionId
        };
      }

      // PHASE 2: PRE-VALIDATE ALL GRANT PLANS BEFORE DEDUCTING CREDITS
      // =========================================================
      let grantPlans = [];
      if (itemGrantCallback && typeof itemGrantCallback === 'function') {
        try {
          grantPlans = await itemGrantCallback(freshActor, items) || [];

          // Validate callback return type
          if (!Array.isArray(grantPlans)) {
            throw new Error('itemGrantCallback must return an array of MutationPlans');
          }

          // Validate each plan structure before any mutations
          for (const plan of grantPlans) {
            if (!plan || typeof plan !== 'object') {
              throw new Error('Plan must be a valid object');
            }
            if (!plan.type) {
              throw new Error('Plan missing required field: type');
            }
            // DroidFactory/VehicleFactory should have proper structure
            if (plan.type === 'create' && !plan.data) {
              throw new Error('Creation plan missing required field: data');
            }
          }

          logger().debug('StoreEngine: Pre-validated all grant plans', {
            transactionId,
            planCount: grantPlans.length
          });
        } catch (planErr) {
          logger().error('StoreEngine: Plan validation failed (NO CREDITS DEDUCTED)', {
            transactionId,
            error: planErr.message
          });
          throw planErr;
        }
      }

      // PHASE 3: BUILD CREDIT PLAN & METADATA
      // =====================================
      const creditPlan = LedgerService.buildCreditDelta(freshActor, totalCost);

      // Guard against invalid credit plan
      if (!creditPlan || !creditPlan.set || !Number.isFinite(creditPlan.set['system.credits'])) {
        throw new Error('LedgerService produced invalid credit plan');
      }
      if (creditPlan.set['system.credits'] < 0) {
        throw new Error('Credit deduction would result in negative balance');
      }

      const creditMetadata = LedgerService.buildMetadata(freshActor, totalCost);

      logger().info('StoreEngine: Purchase pre-validated and ready', {
        transactionId,
        ...creditMetadata,
        grantPlanCount: grantPlans.length
      });

      // PHASE 4: CREATE SNAPSHOT FOR ROLLBACK
      // ====================================
      let snapshotId = null;
      try {
        // Import SnapshotManager dynamically to avoid circular deps
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(
          freshActor,
          `Store purchase snapshot (${totalCost} credits, ${grantPlans.length} items)`
        );
        logger().debug('StoreEngine: Snapshot created for rollback', {
          transactionId,
          snapshotId
        });
      } catch (snapErr) {
        logger().warn('StoreEngine: Snapshot creation failed (continuing without rollback)', {
          transactionId,
          error: snapErr.message
        });
        // Non-fatal: continue without rollback capability
      }

      // PHASE 5: INITIALIZE FLAGS BEFORE MUTATIONS
      // ==========================================
      const existingFlags = freshActor.flags['foundryvtt-swse'] || {};
      if (!existingFlags.meta) {
        existingFlags.meta = {
          schemaVersion: 1,
          cartVersion: 1
        };
      }

      // Add purchase idempotency token
      if (!existingFlags.sessionPurchaseIds) {
        existingFlags.sessionPurchaseIds = [];
      }
      existingFlags.sessionPurchaseIds.push(transactionId);
      // Keep only last 100 transactions to avoid memory bloat
      if (existingFlags.sessionPurchaseIds.length > 100) {
        existingFlags.sessionPurchaseIds = existingFlags.sessionPurchaseIds.slice(-100);
      }

      // PHASE 6: DEDUCT CREDITS
      // =======================
      try {
        await ActorEngine.updateActor(freshActor, {
          'system.credits': creditPlan.set['system.credits'],
          'flags.foundryvtt-swse': existingFlags
        });
        logger().debug('StoreEngine: Credits deducted', {
          transactionId,
          newBalance: creditPlan.set['system.credits']
        });
      } catch (creditErr) {
        logger().error('StoreEngine: Credit deduction failed', {
          transactionId,
          error: creditErr.message
        });
        throw creditErr;
      }

      // PHASE 7: APPLY ITEM GRANT PLANS
      // ===============================
      const appliedPlans = [];
      try {
        for (const plan of grantPlans) {
          try {
            await ActorEngine.applyMutationPlan(freshActor, plan);
            appliedPlans.push(plan);
            logger().debug('StoreEngine: Grant plan applied', {
              transactionId,
              planType: plan.type
            });
          } catch (applyErr) {
            logger().error('StoreEngine: Failed to apply grant plan', {
              transactionId,
              planIndex: appliedPlans.length,
              error: applyErr.message
            });
            throw applyErr;
          }
        }
      } catch (grantErr) {
        logger().error('StoreEngine: Item grant failed (attempting rollback)', {
          transactionId,
          appliedCount: appliedPlans.length,
          error: grantErr.message
        });

        // ROLLBACK: Restore from snapshot if available
        if (snapshotId) {
          try {
            const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
            await SnapshotManager.restoreSnapshot(freshActor, snapshotId);
            logger().info('StoreEngine: Rollback successful - actor restored to pre-purchase state', {
              transactionId,
              snapshotId
            });
          } catch (rollbackErr) {
            logger().error('StoreEngine: ROLLBACK FAILED - manual intervention may be required', {
              transactionId,
              rollbackError: rollbackErr.message
            });
            throw new Error(`Item grant failed and rollback failed: ${grantErr.message}`);
          }
        }

        throw grantErr;
      }

      logger().info('StoreEngine: Purchase completed', {
        transactionId,
        actor: actor.id,
        itemCount: items.length,
        costDeducted: totalCost
      });

      return {
        success: true,
        error: null,
        transactionId
      };
    } catch (err) {
      logger().error('StoreEngine.purchase: Transaction failed', {
        transactionId,
        actor: actor.id,
        error: err.message,
        stack: err.stack
      });
      return {
        success: false,
        error: err.message,
        transactionId
      };
    } finally {
      // Always release the lock
      this._purchasingActors.delete(actor.id);
    }
  }

  /**
   * (Internal) Apply business policies to inventory
   * Future extension point for:
   *   - Legality checks (military, restricted, illegal)
   *   - Availability per-faction/per-location
   *   - Dynamic pricing per NPC
   */
  static _applyPolicies(index) {
    // Placeholder for future policy application
    // Currently: no filtering (all items eligible)
    logger().debug('StoreEngine: Policies applied (currently: none)', {});
  }
}
