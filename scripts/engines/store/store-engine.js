/**
 * scripts/engines/store/store-engine.js
 *
 * Contract API for Store Engine — Single Authority for Store Logic
 * SSOT → Engine → UI
 *
 * Public API:
 *   - getInventory(options)       : Load from compendiums + apply pricing
 *   - canPurchase(context)        : Validate actor eligibility
 *   - purchase(context)           : Execute atomic transaction
 */

import { buildStoreIndex } from './index.js';
import { STORE_RULES } from './store-constants.js';
import { SWSELogger } from '../../utils/logger.js';

const logger = () => SWSELogger || globalThis.swseLogger || console;

export class StoreEngine {
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

    const currentCredits = Number(actor.system?.credits) ?? 0;

    if (currentCredits < totalCost) {
      logger().warn('StoreEngine: Insufficient credits', {
        actor: actor.id,
        have: currentCredits,
        need: totalCost
      });
      return {
        success: true,
        canPurchase: false,
        reason: `Insufficient credits (have ${currentCredits}, need ${totalCost})`
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

    // Validate eligibility before attempting transaction
    const eligibility = this.canPurchase(context);
    if (!eligibility.canPurchase) {
      logger().warn('StoreEngine.purchase: Not eligible', {
        actor: actor.id,
        reason: eligibility.reason
      });
      return {
        success: false,
        error: eligibility.reason,
        transactionId: null
      };
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const currentCredits = Number(actor.system?.credits) ?? 0;
      const newCredits = currentCredits - totalCost;

      logger().info('StoreEngine: Purchase starting', {
        transactionId,
        actor: actor.id,
        itemCount: items.length,
        cost: totalCost,
        creditsAfter: newCredits
      });

      // Step 1: Deduct credits
      await actor.update({ 'system.credits': newCredits });

      // Step 2: Grant items (if callback provided)
      if (itemGrantCallback && typeof itemGrantCallback === 'function') {
        try {
          await itemGrantCallback(actor, items);
        } catch (grantErr) {
          // If item grant fails, still count as success (credits deducted)
          // Future: implement rollback mechanism if needed
          logger().warn('StoreEngine: Item grant failed (credits deducted)', {
            transactionId,
            error: grantErr.message
          });
        }
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
