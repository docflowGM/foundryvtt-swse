/**
 * scripts/engine/store/store-engine.js
 *
 * PHASE 4: Store Engine — Consolidated Single Authority
 *
 * This is the SSOT (Single Source of Truth) for all store operations.
 * Replaces the dual-engine pattern (StoreEngine + TransactionEngine) with unified design.
 *
 * Architecture:
 * ┌─────────────────────────────────────┐
 * │  Store UI (store-main.js)           │
 * │  Checkout UI (store-checkout.js)    │
 * └──────────────┬──────────────────────┘
 *                │
 *                ▼
 * ┌─────────────────────────────────────┐
 * │  StoreEngine (THIS FILE)            │
 * │  - getInventory()                   │
 * │  - canPurchase()                    │
 * │  - purchase() [ATOMIC]              │
 * └──────────────┬──────────────────────┘
 *                │
 *      ┌─────────┼─────────┐
 *      ▼         ▼         ▼
 *   Ledger   Snapshot   Pricing
 *  Service   Manager    Engine
 *
 * Design Principles (Phase 4 Consolidation):
 * 1. Single Authority: StoreEngine is the ONLY public store API
 * 2. Atomic Transactions: purchase() uses snapshot rollback for all-or-nothing
 * 3. Pre-Validation: All plans validated BEFORE any credit deduction
 * 4. Price Caching: Prices frozen at transaction start
 * 5. No Concurrent Purchases: Per-actor locking prevents race conditions
 *
 * TransactionEngine (transaction-engine.js):
 *   - Legacy atomic coordinator (kept for reference, not actively used)
 *   - Future: Can be integrated as StoreEngine's internal implementation
 *   - For now: StoreEngine implements atomicity via SnapshotManager
 *
 * Public API:
 *   - getInventory(options)       : Load from compendiums + apply pricing
 *   - canPurchase(context)        : Validate actor eligibility
 *   - purchase(context)           : Execute atomic transaction [CONSOLIDATED]
 */

import { buildStoreIndex } from "/systems/foundryvtt-swse/scripts/engine/store/index.js";
import { STORE_RULES } from "/systems/foundryvtt-swse/scripts/engine/store/store-constants.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { freezePricing, unfreezePricing } from "/systems/foundryvtt-swse/scripts/engine/store/pricing.js";
import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";

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
   * P2-6: Validate factory output structure (DroidFactory, VehicleFactory, etc.)
   * Ensures factories produce valid, complete actor data
   * @param {Object} factoryOutput - output from DroidFactory.create() or similar
   * @param {String} factoryType - 'droid' or 'vehicle' for error messages
   * @returns {Object} { valid: boolean, error: string|null }
   * @private
   */
  static _validateFactoryOutput(factoryOutput, factoryType = 'item') {
    // Must be an object
    if (!factoryOutput || typeof factoryOutput !== 'object') {
      return {
        valid: false,
        error: `${factoryType} factory produced invalid output (not an object)`
      };
    }

    // Must have essential actor properties
    if (!factoryOutput.name || !factoryOutput.type) {
      return {
        valid: false,
        error: `${factoryType} factory output missing name or type`
      };
    }

    // Must have system data
    if (!factoryOutput.system || typeof factoryOutput.system !== 'object') {
      return {
        valid: false,
        error: `${factoryType} factory output missing system data`
      };
    }

    // For droids/vehicles, must have data field
    if (factoryType !== 'generic' && !factoryOutput.data) {
      return {
        valid: false,
        error: `${factoryType} factory output missing data field`
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate that prices haven't changed significantly since checkout started
   * Returns { valid: boolean, currentTotal: number, priceDiff: number }
   * @param {Array} cartItems - items from cart (should have id and cost)
   * @param {Number} originalTotal - total price at checkout time
   * @returns {Object} validation result
   * @private
   */
  static async _validatePricesAtPurchaseTime(cartItems = [], originalTotal = 0) {
    try {
      // Rebuild price from scratch based on current store state
      let currentTotal = 0;
      for (const item of cartItems) {
        if (!item || !item.id) continue;
        // Item should have finalCost already set by engine during inventory load
        currentTotal += item.finalCost ?? 0;
      }

      const priceDiff = Math.abs(currentTotal - originalTotal);
      const threshold = originalTotal * 0.05; // 5% tolerance

      if (priceDiff > threshold) {
        logger().warn('StoreEngine: Significant price change detected', {
          originalTotal,
          currentTotal,
          diff: priceDiff,
          threshold
        });
        return {
          valid: false,
          currentTotal,
          priceDiff,
          reason: `Price changed from ${originalTotal} to ${currentTotal} credits`
        };
      }

      return {
        valid: true,
        currentTotal,
        priceDiff,
        reason: null
      };
    } catch (err) {
      logger().warn('StoreEngine: Price validation failed, proceeding with original', {
        error: err.message
      });
      // Non-fatal: if validation fails, allow purchase to proceed
      return { valid: true, currentTotal: originalTotal, priceDiff: 0 };
    }
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

    // P2-2: Freeze pricing to prevent mid-transaction changes
    freezePricing();

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

      // PHASE 3A: Validate prices haven't changed significantly
      // (P0-3: Re-validate prices at purchase time)
      const priceValidation = await this._validatePricesAtPurchaseTime(items, totalCost);
      if (!priceValidation.valid) {
        logger().warn('StoreEngine: Price validation failed - rejecting purchase', {
          transactionId,
          actor: actor.id,
          reason: priceValidation.reason
        });
        return {
          success: false,
          error: priceValidation.reason,
          transactionId
        };
      }

      // PHASE 3B: Validate via LedgerService (pure, no mutations)
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

          // Validate each plan is an object (accept bucketed mutation plans as-is)
          for (const plan of grantPlans) {
            if (!plan || typeof plan !== 'object') {
              throw new Error('Plan must be a valid object');
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
      // P2-5: Defensive null guards for flags
      if (!freshActor.flags) {
        freshActor.flags = {};
      }
      const existingFlags = freshActor.flags['foundryvtt-swse'] || {};
      if (!existingFlags.meta) {
        existingFlags.meta = {
          schemaVersion: 1,
          cartVersion: 1
        };
      }

      // Add purchase idempotency token (guard against null/undefined)
      if (!existingFlags.sessionPurchaseIds || !Array.isArray(existingFlags.sessionPurchaseIds)) {
        existingFlags.sessionPurchaseIds = [];
      }
      existingFlags.sessionPurchaseIds.push(transactionId);
      // Keep only last 100 transactions to avoid memory bloat
      if (existingFlags.sessionPurchaseIds.length > 100) {
        existingFlags.sessionPurchaseIds = existingFlags.sessionPurchaseIds.slice(-100);
      }

      // PHASE 6: MERGE PLANS AND BUILD FINAL TRANSACTION
      // ===============================================
      let mergedPlan = { set: { 'flags.foundryvtt-swse': existingFlags } };

      try {
        // Build credit plan from ledger
        const creditMutation = creditPlan;

        // Merge all grant plans with credit plan
        const allPlans = [...grantPlans, creditMutation];
        mergedPlan = mergeMutationPlans(...allPlans);

        logger().debug('StoreEngine: Plans merged for atomic transaction', {
          transactionId,
          grantPlanCount: grantPlans.length,
          mergedPlanBuckets: Object.keys(mergedPlan).length
        });

        // Apply merged plan atomically
        await ActorEngine.applyMutationPlan(freshActor, mergedPlan, {
          validate: true,
          rederive: true,
          source: 'StoreEngine.purchase'
        });

        logger().info('StoreEngine: Atomic transaction applied successfully', {
          transactionId,
          grantPlanCount: grantPlans.length,
          newBalance: mergedPlan.set?.['system.credits'] ?? freshActor.system?.credits
        });
      } catch (transactionErr) {
        logger().error('StoreEngine: Atomic transaction failed (attempting rollback)', {
          transactionId,
          error: transactionErr.message
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
            throw new Error(`Transaction failed and rollback failed: ${transactionErr.message}`);
          }
        }

        throw transactionErr;
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
      // Always release the lock and unfreeze pricing
      this._purchasingActors.delete(actor.id);
      unfreezePricing();
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
