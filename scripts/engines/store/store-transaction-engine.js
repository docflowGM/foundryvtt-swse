/**
 * Store Transaction Engine
 *
 * Domain-level transaction coordinator for multi-actor store operations.
 *
 * Architecture:
 * - Phase 1: Validate (read-only, no mutations)
 * - Phase 2: Execute (coordinated ActorEngine calls)
 * - Phase 3: Rollback (best-effort if any step fails)
 *
 * CRITICAL: This is NOT Sentinel-level atomicity.
 * Foundry has no cross-actor transaction support.
 * This provides "domain semantics" — best-effort coordination.
 *
 * Each ActorEngine call is individually governed by Sentinel.
 * You WILL see multiple transactions in logs.
 * That is correct and expected.
 *
 * Non-goals:
 * - Atomic across Foundry actors (impossible)
 * - Bypass Sentinel governance (never)
 * - Special rollback semantics (use snapshots)
 * - Cross-actor invariant enforcement (Foundry limitation)
 */

import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { swseLogger } from '../../utils/logger.js';

export class StoreTransactionEngine {
  /**
   * ============================================================
   * PURCHASE ITEM FROM SELLER TO BUYER
   * ============================================================
   *
   * Atomic at domain level:
   * 1. Deduct buyer credits
   * 2. Add seller credits
   * 3. Delete item from seller
   * 4. Create item on buyer
   *
   * If any step fails, rollback previous steps.
   */
  static async purchaseItem({
    buyer,
    seller,
    itemId,
    price,
    metadata = {}
  }) {
    // ============================================================
    // PHASE 1: PRE-VALIDATION (NO MUTATIONS)
    // ============================================================

    if (!buyer || !seller) {
      throw new Error('purchaseItem: buyer and seller are required');
    }

    if (!itemId || typeof itemId !== 'string') {
      throw new Error('purchaseItem: itemId must be a valid string');
    }

    if (typeof price !== 'number' || price < 0) {
      throw new Error('purchaseItem: price must be a non-negative number');
    }

    // Find item on seller
    const item = seller.items.get(itemId);
    if (!item) {
      throw new Error(`purchaseItem: Item ${itemId} not found on seller ${seller.name}`);
    }

    // Verify buyer has sufficient credits
    const buyerCredits = Number(buyer.system.credits ?? 0);
    if (buyerCredits < price) {
      throw new Error(
        `purchaseItem: ${buyer.name} has insufficient credits (${buyerCredits} < ${price})`
      );
    }

    // Create snapshot for rollback
    const snapshot = this._createSnapshot(buyer, seller);

    swseLogger.log('[StoreTransactionEngine] purchaseItem validated', {
      buyer: buyer.name,
      seller: seller.name,
      itemId,
      itemName: item.name,
      price,
      buyerCredits,
      buyerWillHave: buyerCredits - price
    });

    try {
      // ============================================================
      // PHASE 2: COORDINATED MUTATIONS (EACH GOVERNED BY SENTINEL)
      // ============================================================

      // Step 1: Deduct buyer credits
      await ActorEngine.updateActor(buyer, {
        'system.credits': buyerCredits - price
      });

      swseLogger.log('[StoreTransactionEngine] Step 1 complete: buyer debited', {
        buyer: buyer.name,
        newBalance: buyerCredits - price
      });

      // Step 2: Add seller credits
      const sellerCredits = Number(seller.system.credits ?? 0);
      await ActorEngine.updateActor(seller, {
        'system.credits': sellerCredits + price
      });

      swseLogger.log('[StoreTransactionEngine] Step 2 complete: seller credited', {
        seller: seller.name,
        newBalance: sellerCredits + price
      });

      // Step 3: Delete item from seller
      await ActorEngine.deleteEmbeddedDocuments(seller, 'Item', [itemId]);

      swseLogger.log('[StoreTransactionEngine] Step 3 complete: item deleted from seller', {
        itemId,
        itemName: item.name
      });

      // Step 4: Create item on buyer
      const itemData = item.toObject();
      const created = await ActorEngine.createEmbeddedDocuments(buyer, 'Item', [itemData]);

      swseLogger.log('[StoreTransactionEngine] Step 4 complete: item created on buyer', {
        itemId,
        itemName: item.name,
        createdId: created?.[0]?.id
      });

      // ============================================================
      // SUCCESS
      // ============================================================

      const result = {
        success: true,
        buyerId: buyer.id,
        buyerName: buyer.name,
        sellerId: seller.id,
        sellerName: seller.name,
        itemId,
        itemName: item.name,
        price,
        timestamp: Date.now(),
        metadata
      };

      swseLogger.log('[StoreTransactionEngine] purchaseItem completed successfully', result);
      return result;
    } catch (err) {
      // ============================================================
      // PHASE 3: ROLLBACK (BEST-EFFORT)
      // ============================================================

      swseLogger.error('[StoreTransactionEngine] purchaseItem failed, attempting rollback', {
        error: err.message,
        buyer: buyer.name,
        seller: seller.name,
        itemId
      });

      try {
        await this._rollback(snapshot);
        swseLogger.log('[StoreTransactionEngine] Rollback completed');
      } catch (rollbackErr) {
        swseLogger.error('[StoreTransactionEngine] Rollback failed', {
          error: rollbackErr.message,
          originalError: err.message
        });
        // Re-throw original error, log rollback failure
        throw new Error(
          `purchaseItem failed and rollback encountered error: ${err.message} | Rollback error: ${rollbackErr.message}`
        );
      }

      throw err;
    }
  }

  /**
   * ============================================================
   * SELL ITEM (TO STORE, NO SELLER ACTOR)
   * ============================================================
   *
   * Atomic at domain level:
   * 1. Delete item from seller
   * 2. Add credits to seller
   *
   * Used when selling to a merchant (not a player actor).
   */
  static async sellItem({
    seller,
    itemId,
    price,
    metadata = {}
  }) {
    // ============================================================
    // PHASE 1: PRE-VALIDATION
    // ============================================================

    if (!seller) {
      throw new Error('sellItem: seller is required');
    }

    if (!itemId || typeof itemId !== 'string') {
      throw new Error('sellItem: itemId must be a valid string');
    }

    if (typeof price !== 'number' || price < 0) {
      throw new Error('sellItem: price must be a non-negative number');
    }

    const item = seller.items.get(itemId);
    if (!item) {
      throw new Error(`sellItem: Item ${itemId} not found on seller ${seller.name}`);
    }

    const snapshot = this._createSnapshot(seller);

    swseLogger.log('[StoreTransactionEngine] sellItem validated', {
      seller: seller.name,
      itemId,
      itemName: item.name,
      price
    });

    try {
      // ============================================================
      // PHASE 2: COORDINATED MUTATIONS
      // ============================================================

      // Step 1: Delete item
      await ActorEngine.deleteEmbeddedDocuments(seller, 'Item', [itemId]);

      swseLogger.log('[StoreTransactionEngine] Step 1 complete: item deleted', {
        itemId,
        itemName: item.name
      });

      // Step 2: Add credits
      const sellerCredits = Number(seller.system.credits ?? 0);
      await ActorEngine.updateActor(seller, {
        'system.credits': sellerCredits + price
      });

      swseLogger.log('[StoreTransactionEngine] Step 2 complete: credits added', {
        seller: seller.name,
        newBalance: sellerCredits + price
      });

      // ============================================================
      // SUCCESS
      // ============================================================

      const result = {
        success: true,
        sellerId: seller.id,
        sellerName: seller.name,
        itemId,
        itemName: item.name,
        price,
        timestamp: Date.now(),
        metadata
      };

      swseLogger.log('[StoreTransactionEngine] sellItem completed successfully', result);
      return result;
    } catch (err) {
      // ============================================================
      // PHASE 3: ROLLBACK
      // ============================================================

      swseLogger.error('[StoreTransactionEngine] sellItem failed, attempting rollback', {
        error: err.message,
        seller: seller.name,
        itemId
      });

      try {
        await this._rollback(snapshot);
        swseLogger.log('[StoreTransactionEngine] Rollback completed');
      } catch (rollbackErr) {
        swseLogger.error('[StoreTransactionEngine] Rollback failed', {
          error: rollbackErr.message
        });
        throw new Error(
          `sellItem failed: ${err.message} | Rollback error: ${rollbackErr.message}`
        );
      }

      throw err;
    }
  }

  /**
   * ============================================================
   * TRANSFER ITEM (NO CURRENCY)
   * ============================================================
   *
   * Atomic at domain level:
   * 1. Delete item from source
   * 2. Create item on destination
   *
   * Used for inventory transfers without payment (e.g., sharing, gifting).
   */
  static async transferItem({
    from,
    to,
    itemId,
    metadata = {}
  }) {
    // ============================================================
    // PHASE 1: PRE-VALIDATION
    // ============================================================

    if (!from || !to) {
      throw new Error('transferItem: from and to actors are required');
    }

    if (!itemId || typeof itemId !== 'string') {
      throw new Error('transferItem: itemId must be a valid string');
    }

    const item = from.items.get(itemId);
    if (!item) {
      throw new Error(`transferItem: Item ${itemId} not found on ${from.name}`);
    }

    const snapshot = this._createSnapshot(from, to);

    swseLogger.log('[StoreTransactionEngine] transferItem validated', {
      from: from.name,
      to: to.name,
      itemId,
      itemName: item.name
    });

    try {
      // ============================================================
      // PHASE 2: COORDINATED MUTATIONS
      // ============================================================

      // Step 1: Delete from source
      await ActorEngine.deleteEmbeddedDocuments(from, 'Item', [itemId]);

      swseLogger.log('[StoreTransactionEngine] Step 1 complete: item deleted from source', {
        itemId
      });

      // Step 2: Create on destination
      const itemData = item.toObject();
      const created = await ActorEngine.createEmbeddedDocuments(to, 'Item', [itemData]);

      swseLogger.log('[StoreTransactionEngine] Step 2 complete: item created on destination', {
        itemId,
        createdId: created?.[0]?.id
      });

      // ============================================================
      // SUCCESS
      // ============================================================

      const result = {
        success: true,
        fromId: from.id,
        fromName: from.name,
        toId: to.id,
        toName: to.name,
        itemId,
        itemName: item.name,
        timestamp: Date.now(),
        metadata
      };

      swseLogger.log('[StoreTransactionEngine] transferItem completed successfully', result);
      return result;
    } catch (err) {
      // ============================================================
      // PHASE 3: ROLLBACK
      // ============================================================

      swseLogger.error('[StoreTransactionEngine] transferItem failed, attempting rollback', {
        error: err.message,
        from: from.name,
        to: to.name,
        itemId
      });

      try {
        await this._rollback(snapshot);
        swseLogger.log('[StoreTransactionEngine] Rollback completed');
      } catch (rollbackErr) {
        swseLogger.error('[StoreTransactionEngine] Rollback failed', {
          error: rollbackErr.message
        });
        throw new Error(
          `transferItem failed: ${err.message} | Rollback error: ${rollbackErr.message}`
        );
      }

      throw err;
    }
  }

  /**
   * ============================================================
   * INTERNAL: CREATE SNAPSHOT
   * ============================================================
   *
   * Capture actor state before mutations.
   * Used for rollback if any step fails.
   */
  static _createSnapshot(...actors) {
    return actors.map(actor => ({
      actor,
      system: foundry.utils.deepClone(actor.system),
      items: actor.items.map(i => ({
        id: i.id,
        data: i.toObject()
      }))
    }));
  }

  /**
   * ============================================================
   * INTERNAL: ROLLBACK
   * ============================================================
   *
   * Restore actors to snapshot state.
   * Best-effort: attempts to restore but doesn't guarantee consistency.
   *
   * Strategy:
   * 1. Restore system data
   * 2. Delete all current items
   * 3. Recreate items from snapshot
   */
  static async _rollback(snapshot) {
    for (const entry of snapshot) {
      const { actor, system, items } = entry;

      swseLogger.log('[StoreTransactionEngine] Rolling back actor', {
        actor: actor.name
      });

      try {
        // Restore system state
        await ActorEngine.updateActor(actor, { system });

        // Clear all current items
        const currentItemIds = actor.items.map(i => i.id);
        if (currentItemIds.length > 0) {
          await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', currentItemIds);
        }

        // Restore items from snapshot
        if (items.length > 0) {
          const itemsToRestore = items.map(item => item.data);
          await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToRestore);
        }

        swseLogger.log('[StoreTransactionEngine] Rollback successful for actor', {
          actor: actor.name
        });
      } catch (err) {
        swseLogger.error('[StoreTransactionEngine] Rollback step failed for actor', {
          actor: actor.name,
          error: err.message
        });
        throw err;
      }
    }
  }
}

export default StoreTransactionEngine;
