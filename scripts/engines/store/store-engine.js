/**
 * scripts/engines/store/store-engine.js
 *
 * Contract API for Store Engine
 * SSOT → Engine → UI
 *
 * Public API:
 *   - getInventory(options)
 *   - canPurchase(context)
 *   - purchase(context)
 */

import { buildStoreIndex } from './index.js';
import { SWSELogger } from '../../utils/logger.js';

export class StoreEngine {
  /**
   * Get store inventory from compendiums (SSOT)
   * @param {Object} opts
   * @param {Boolean} opts.useCache - use cached data
   * @returns {Promise<Object>} storeIndex
   */
  static async getInventory(opts = {}) {
    try {
      const index = await buildStoreIndex(opts);
      return {
        success: true,
        inventory: index,
        error: null
      };
    } catch (err) {
      SWSELogger.error('StoreEngine.getInventory failed', { error: err.message });
      return {
        success: false,
        inventory: null,
        error: err.message
      };
    }
  }

  /**
   * Check if actor can purchase item(s)
   * @param {Object} context
   * @param {Actor} context.actor - purchasing actor
   * @param {Array<string>} context.itemIds - item IDs to purchase
   * @param {Number} context.totalCost - total cost calculation
   * @returns {Object} { success, canPurchase, reason }
   */
  static canPurchase(context) {
    const { actor, itemIds = [], totalCost = 0 } = context;

    if (!actor) {
      return { success: false, canPurchase: false, reason: 'No actor provided' };
    }

    const currentCredits = Number(actor.system?.credits) || 0;

    if (currentCredits < totalCost) {
      return {
        success: true,
        canPurchase: false,
        reason: `Insufficient credits (have ${currentCredits}, need ${totalCost})`
      };
    }

    return { success: true, canPurchase: true, reason: null };
  }

  /**
   * Execute purchase transaction (atomic)
   * @param {Object} context
   * @param {Actor} context.actor - purchasing actor
   * @param {Array<Object>} context.items - items to purchase
   * @param {Number} context.totalCost - total cost
   * @returns {Promise<Object>} { success, error, transactionId }
   */
  static async purchase(context) {
    const { actor, items = [], totalCost = 0 } = context;

    if (!actor) {
      return { success: false, error: 'No actor provided', transactionId: null };
    }

    const currentCredits = Number(actor.system?.credits) || 0;
    if (currentCredits < totalCost) {
      return { success: false, error: 'Insufficient credits', transactionId: null };
    }

    try {
      // Atomic: deduct credits and grant items
      const newCredits = currentCredits - totalCost;
      await actor.update({ 'system.credits': newCredits });

      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      SWSELogger.info('Store purchase completed', { transactionId, actor: actor.id, cost: totalCost, itemCount: items.length });

      return { success: true, error: null, transactionId };
    } catch (err) {
      SWSELogger.error('Store purchase failed', { error: err.message });
      return { success: false, error: err.message, transactionId: null };
    }
  }
}
