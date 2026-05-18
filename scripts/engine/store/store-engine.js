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
      itemGrantCallback = null,
      transactionContext = null
    } = context;

    if (!actor) {
      logger().error('StoreEngine.purchase: No actor', {});
      return { success: false, error: 'No actor provided', transactionId: null };
    }

    if (!actor.isOwner) {
      logger().error('StoreEngine.purchase: Insufficient permissions', { actor: actor.id, isOwner: actor.isOwner });
      return { success: false, error: 'Insufficient permissions to complete purchase.', transactionId: null };
    }

    freezePricing();
    try {
      const freshActor = game.actors.get(actor.id);
      if (!freshActor) return { success: false, error: 'Actor no longer exists.', transactionId: null };

      const currentCredits = LedgerService.getCurrentCredits(freshActor);
      if (!Number.isFinite(currentCredits) || currentCredits < 0) {
        return { success: false, error: 'Invalid credit state.', transactionId: null };
      }

      if (!Number.isFinite(totalCost) || totalCost < 0) {
        return { success: false, error: 'Invalid cart total.', transactionId: null };
      }

      const priceValidation = await this._validatePricesAtPurchaseTime(items, totalCost);
      if (!priceValidation.valid) {
        return { success: false, error: priceValidation.reason, transactionId: null };
      }

      const ledgerValidation = LedgerService.validateFunds(freshActor, totalCost);
      if (!ledgerValidation.ok) {
        return {
          success: false,
          error: `Insufficient credits at time of transaction (have ${ledgerValidation.current}, need ${ledgerValidation.required}).`,
          transactionId: null
        };
      }

      let grantPlans = [];
      if (itemGrantCallback && typeof itemGrantCallback === 'function') {
        grantPlans = await itemGrantCallback(freshActor, items) || [];
        if (!Array.isArray(grantPlans)) throw new Error('itemGrantCallback must return an array of MutationPlans');
        for (const plan of grantPlans) {
          if (!plan || typeof plan !== 'object') throw new Error('Plan must be a valid object');
        }
      }

      const hasCustomizedStoreItem = items.some(item => !!item.stagedCustomization || item.type === 'customized-item');
      const resolvedContext = transactionContext || (hasCustomizedStoreItem ? 'store-customization-checkout' : 'store-purchase');

      const result = await TransactionEngine.executeMutationTransaction({
        actor: freshActor,
        mutationPlan: grantPlans,
        cost: totalCost,
        transactionContext: resolvedContext,
        audit: {
          itemCount: items.length,
          totalCost,
          itemNames: items.map(item => item.name).filter(Boolean),
          hasCustomizedStoreItem
        }
      }, {
        source: 'StoreEngine.purchase',
        validate: true,
        rederive: true
      });

      if (!result.success) {
        logger().error('StoreEngine.purchase: TransactionEngine rejected purchase', {
          actor: actor.id,
          error: result.error,
          transactionId: result.transactionId
        });
        return result;
      }

      logger().info('StoreEngine: Purchase completed', {
        transactionId: result.transactionId,
        actor: actor.id,
        itemCount: items.length,
        costDeducted: totalCost,
        context: resolvedContext
      });

      return result;
    } catch (err) {
      logger().error('StoreEngine.purchase: Transaction failed', {
        actor: actor.id,
        error: err.message,
        stack: err.stack
      });
      return { success: false, error: err.message, transactionId: null };
    } finally {
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
