/**
 * MutationAdapter
 *
 * Canonical mutation interface for all actor/item updates.
 * All mutations MUST route through this adapter to ActorEngine.
 *
 * This prevents direct mutations while keeping code clean and readable.
 * No business logic — just delegation to ActorEngine with consistent patterns.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export const MutationAdapter = {
  /**
   * Update actor fields.
   *
   * The canonical way to mutate actor data. Routes to ActorEngine.updateActor.
   *
   * @param {Actor} actor - The actor to update
   * @param {Object} changes - Flat update object (e.g., { 'system.hp.value': 10 })
   * @param {Object} [options={}] - Options for ActorEngine
   * @param {string} [options.source] - Optional: source system/caller name for logging
   * @returns {Promise<Actor>} Updated actor
   *
   * @example
   * await MutationAdapter.updateActorFields(actor, {
   *   'system.hp.value': 15,
   *   'system.xp.total': 2000
   * }, { source: 'level-up-engine' });
   */
  async updateActorFields(actor, changes, options = {}) {
    if (!actor) {
      throw new Error('MutationAdapter.updateActorFields() requires actor');
    }
    if (!changes || typeof changes !== 'object') {
      throw new Error('MutationAdapter.updateActorFields() requires changes object');
    }

    const source = options.source || 'adapter-call';
    SWSELogger.debug('[MutationAdapter] updateActorFields', {
      actor: actor.name,
      source,
      fieldCount: Object.keys(changes).length
    });

    return ActorEngine.updateActor(actor, changes, {
      meta: { guardKey: source, ...options.meta }
    });
  },

  /**
   * Create items on an actor.
   *
   * The canonical way to add items. Routes to ActorEngine.createEmbeddedDocuments.
   *
   * @param {Actor} actor - The actor to add items to
   * @param {Object|Object[]} items - Item data object(s) or array of items
   * @param {Object} [options={}] - Options for ActorEngine
   * @param {string} [options.source] - Optional: source system/caller name for logging
   * @returns {Promise<Item[]>} Created items
   *
   * @example
   * await MutationAdapter.createItems(actor, {
   *   name: 'Blaster Pistol',
   *   type: 'weapon',
   *   system: { ... }
   * });
   *
   * @example
   * await MutationAdapter.createItems(actor, [
   *   { name: 'Item 1', type: 'weapon', system: { ... } },
   *   { name: 'Item 2', type: 'armor', system: { ... } }
   * ]);
   */
  async createItems(actor, items, options = {}) {
    if (!actor) {
      throw new Error('MutationAdapter.createItems() requires actor');
    }
    if (!items) {
      throw new Error('MutationAdapter.createItems() requires items');
    }

    // Normalize to array
    const itemsArray = Array.isArray(items) ? items : [items];

    // Strip _id if present (Foundry will generate new ones)
    const cleaned = itemsArray.map(item => {
      const copy = { ...item };
      delete copy._id;
      return copy;
    });

    const source = options.source || 'adapter-call';
    SWSELogger.debug('[MutationAdapter] createItems', {
      actor: actor.name,
      source,
      count: cleaned.length,
      types: cleaned.map(i => i.type || 'unknown')
    });

    return ActorEngine.createEmbeddedDocuments(actor, 'Item', cleaned, options);
  },

  /**
   * Update items on an actor.
   *
   * The canonical way to modify items. Routes to ActorEngine.updateEmbeddedDocuments.
   *
   * @param {Actor} actor - The actor owning the items
   * @param {Object|Object[]} updates - Update object(s) with _id
   * @param {Object} [options={}] - Options for ActorEngine
   * @param {string} [options.source] - Optional: source system/caller name for logging
   * @returns {Promise<Item[]>} Updated items
   *
   * @example
   * await MutationAdapter.updateItems(actor, {
   *   _id: 'itemId123',
   *   'system.quantity': 5
   * });
   *
   * @example
   * await MutationAdapter.updateItems(actor, [
   *   { _id: 'item1', 'system.quantity': 3 },
   *   { _id: 'item2', 'system.equipped': true }
   * ]);
   */
  async updateItems(actor, updates, options = {}) {
    if (!actor) {
      throw new Error('MutationAdapter.updateItems() requires actor');
    }
    if (!updates) {
      throw new Error('MutationAdapter.updateItems() requires updates');
    }

    // Normalize to array
    const updatesArray = Array.isArray(updates) ? updates : [updates];

    // Validate all have _id
    for (const update of updatesArray) {
      if (!update._id) {
        throw new Error('MutationAdapter.updateItems() — all updates require _id');
      }
    }

    const source = options.source || 'adapter-call';
    SWSELogger.debug('[MutationAdapter] updateItems', {
      actor: actor.name,
      source,
      count: updatesArray.length
    });

    return ActorEngine.updateEmbeddedDocuments(actor, 'Item', updatesArray, options);
  },

  /**
   * Delete items from an actor.
   *
   * The canonical way to remove items. Routes to ActorEngine.deleteEmbeddedDocuments.
   *
   * @param {Actor} actor - The actor to remove items from
   * @param {string|string[]} ids - Item ID(s) to delete
   * @param {Object} [options={}] - Options for ActorEngine
   * @param {string} [options.source] - Optional: source system/caller name for logging
   * @returns {Promise<Item[]>} Deleted items
   *
   * @example
   * await MutationAdapter.deleteItems(actor, 'itemId123');
   *
   * @example
   * await MutationAdapter.deleteItems(actor, ['itemId1', 'itemId2']);
   */
  async deleteItems(actor, ids, options = {}) {
    if (!actor) {
      throw new Error('MutationAdapter.deleteItems() requires actor');
    }
    if (!ids) {
      throw new Error('MutationAdapter.deleteItems() requires ids');
    }

    // Normalize to array
    const idsArray = Array.isArray(ids) ? ids : [ids];

    const source = options.source || 'adapter-call';
    SWSELogger.debug('[MutationAdapter] deleteItems', {
      actor: actor.name,
      source,
      count: idsArray.length
    });

    return ActorEngine.deleteEmbeddedDocuments(actor, 'Item', idsArray, options);
  },

  /**
   * Transfer items from one actor to another.
   *
   * Atomic operation: deletes from source, creates on target.
   * Useful for inventory transfers, lending, etc.
   *
   * @param {Actor} sourceActor - Actor to take items from
   * @param {Actor} targetActor - Actor to give items to
   * @param {string|string[]} ids - Item ID(s) to transfer
   * @param {Object} [options={}] - Options
   * @param {string} [options.source] - Optional: source system/caller name for logging
   * @returns {Promise<Object>} { deleted: Item[], created: Item[] }
   *
   * @example
   * const result = await MutationAdapter.moveItems(
   *   sourceParty,
   *   targetCharacter,
   *   ['itemId1', 'itemId2'],
   *   { source: 'party-inventory' }
   * );
   */
  async moveItems(sourceActor, targetActor, ids, options = {}) {
    if (!sourceActor || !targetActor) {
      throw new Error('MutationAdapter.moveItems() requires both sourceActor and targetActor');
    }
    if (!ids) {
      throw new Error('MutationAdapter.moveItems() requires ids');
    }

    // Normalize to array
    const idsArray = Array.isArray(ids) ? ids : [ids];

    try {
      // Get items to transfer (for data)
      const itemsToMove = sourceActor.items.filter(item => idsArray.includes(item.id));
      if (itemsToMove.length === 0) {
        throw new Error(`No items found to move from ${sourceActor.name}`);
      }

      // Prepare item data for creation (strip _id, keep system data)
      const itemsForCreation = itemsToMove.map(item => {
        const data = item.toObject();
        delete data._id;
        return data;
      });

      const source = options.source || 'adapter-call';
      SWSELogger.debug('[MutationAdapter] moveItems', {
        source,
        from: sourceActor.name,
        to: targetActor.name,
        count: idsArray.length
      });

      // Delete from source
      const deleted = await this.deleteItems(sourceActor, idsArray, {
        ...options,
        source: `${source}[delete]`
      });

      // Create on target
      const created = await this.createItems(targetActor, itemsForCreation, {
        ...options,
        source: `${source}[create]`
      });

      return { deleted, created };
    } catch (err) {
      SWSELogger.error('[MutationAdapter] moveItems failed', {
        from: sourceActor?.name ?? 'unknown',
        to: targetActor?.name ?? 'unknown',
        error: err.message
      });
      throw err;
    }
  }
};
