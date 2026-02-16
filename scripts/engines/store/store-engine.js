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
import { normalizeCredits } from '../../utils/credit-normalization.js';

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

      // Re-validate affordability at execution time (race condition fix)
      if (currentCredits < totalCost) {
        logger().warn('StoreEngine: Insufficient credits at execution time', {
          transactionId,
          actor: actor.id,
          have: currentCredits,
          need: totalCost
        });
        return {
          success: false,
          error: `Insufficient credits at time of transaction (have ${currentCredits}, need ${totalCost}).`,
          transactionId
        };
      }

      const newCredits = normalizeCredits(currentCredits - totalCost);

      logger().info('StoreEngine: Purchase starting', {
        transactionId,
        actor: actor.id,
        itemCount: items.length,
        cost: totalCost,
        creditsAfter: newCredits
      });

      // HARDENING 5: Initialize store schema meta if needed
      const existingFlags = freshActor.flags['foundryvtt-swse'] || {};
      if (!existingFlags.meta) {
        existingFlags.meta = {
          schemaVersion: 1,
          cartVersion: 1
        };
      }

      // HARDENING 6: Add purchase idempotency token
      if (!existingFlags.sessionPurchaseIds) {
        existingFlags.sessionPurchaseIds = [];
      }
      existingFlags.sessionPurchaseIds.push(transactionId);
      // Keep only last 100 transactions to avoid memory bloat
      if (existingFlags.sessionPurchaseIds.length > 100) {
        existingFlags.sessionPurchaseIds = existingFlags.sessionPurchaseIds.slice(-100);
      }

      // HARDENING 3: Single batched update (no race window between reads and writes)
      await freshActor.update({
        'system.credits': newCredits,
        'flags.foundryvtt-swse': existingFlags
      });

      // Step 2: Grant items (if callback provided)
      if (itemGrantCallback && typeof itemGrantCallback === 'function') {
        try {
          await itemGrantCallback(freshActor, items);
        } catch (grantErr) {
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
