/**
 * MutationAdapter
 *
 * Canonical mutation interface for all actor/item updates.
 *
 * ARCHITECTURAL PRINCIPLES:
 * - This adapter is NOT a mutation authority
 * - ActorEngine is the ONLY mutation authority
 * - This adapter is a standardized front door to ActorEngine
 * - Zero wrappers on Actor/Item prototypes
 * - Zero direct Foundry mutations (no actor.update, item.update, etc)
 * - All mutations route through ActorEngine for governance
 *
 * USAGE:
 * - Import: import { MutationAdapter } from '.../mutation-adapter.js'
 * - Call: await MutationAdapter.methodName(...)
 *
 * All mutations are observabilit-enabled with optional source tracking.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function _requireActor(actor, methodName) {
  if (!actor) {
    throw new Error(`MutationAdapter.${methodName}() requires actor`);
  }
}

function _requireArray(value, methodName, argName) {
  if (!Array.isArray(value)) {
    throw new Error(`MutationAdapter.${methodName}() requires ${argName} array`);
  }
}

function _requireObject(value, methodName, argName) {
  if (!value || typeof value !== 'object') {
    throw new Error(`MutationAdapter.${methodName}() requires ${argName} object`);
  }
}

function _stripIds(documents) {
  return documents.map(doc => {
    const copy = { ...doc };
    delete copy._id;
    return copy;
  });
}

function _withAdapterMeta(options, sourceTag) {
  return {
    ...options,
    meta: {
      source: `MutationAdapter.${sourceTag}`,
      ...options?.meta
    }
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const MutationAdapter = {
  /**
   * Update actor fields.
   *
   * The canonical way to mutate actor data. Routes to ActorEngine.updateActor.
   *
   * @param {Actor} actor - The actor to update
   * @param {Object} changes - Flat update object (e.g., { 'system.hp.value': 10 })
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<Actor>} Updated actor
   *
   * @example
   * await MutationAdapter.updateActorFields(actor, {
   *   'system.hp.value': 15,
   *   'system.xp.total': 2000
   * });
   */
  async updateActorFields(actor, changes, options = {}) {
    _requireActor(actor, 'updateActorFields');
    _requireObject(changes, 'updateActorFields', 'changes');

    SWSELogger.debug('[MutationAdapter] updateActorFields', {
      actor: actor.name,
      fieldCount: Object.keys(changes).length,
      source: options.source
    });

    return ActorEngine.updateActor(actor, changes, _withAdapterMeta(options, 'updateActorFields'));
  },

  /**
   * Create items on an actor.
   *
   * The canonical way to add items. Routes to ActorEngine.createEmbeddedDocuments.
   *
   * @param {Actor} actor - The actor to add items to
   * @param {Object|Object[]} items - Item data object(s)
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<Item[]>} Created items
   *
   * @example
   * await MutationAdapter.createItems(actor, {
   *   name: 'Blaster Pistol',
   *   type: 'weapon',
   *   system: { ... }
   * });
   */
  async createItems(actor, items, options = {}) {
    _requireActor(actor, 'createItems');
    if (!items) {
      throw new Error('MutationAdapter.createItems() requires items');
    }

    const itemsArray = Array.isArray(items) ? items : [items];
    const cleaned = _stripIds(itemsArray);

    SWSELogger.debug('[MutationAdapter] createItems', {
      actor: actor.name,
      count: cleaned.length,
      types: cleaned.map(i => i.type || 'unknown'),
      source: options.source
    });

    return ActorEngine.createEmbeddedDocuments(
      actor,
      'Item',
      cleaned,
      _withAdapterMeta(options, 'createItems')
    );
  },

  /**
   * Update items on an actor.
   *
   * The canonical way to modify items. Routes to ActorEngine.updateEmbeddedDocuments.
   *
   * @param {Actor} actor - The actor owning the items
   * @param {Object|Object[]} updates - Update object(s) with _id
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<Item[]>} Updated items
   *
   * @example
   * await MutationAdapter.updateItems(actor, {
   *   _id: 'itemId123',
   *   'system.quantity': 5
   * });
   */
  async updateItems(actor, updates, options = {}) {
    _requireActor(actor, 'updateItems');
    if (!updates) {
      throw new Error('MutationAdapter.updateItems() requires updates');
    }

    const updatesArray = Array.isArray(updates) ? updates : [updates];

    // Validate _id presence
    for (const update of updatesArray) {
      if (!update._id) {
        throw new Error('MutationAdapter.updateItems() — all updates require _id');
      }
    }

    SWSELogger.debug('[MutationAdapter] updateItems', {
      actor: actor.name,
      count: updatesArray.length,
      source: options.source
    });

    return ActorEngine.updateEmbeddedDocuments(
      actor,
      'Item',
      updatesArray,
      _withAdapterMeta(options, 'updateItems')
    );
  },

  /**
   * Delete items from an actor.
   *
   * The canonical way to remove items. Routes to ActorEngine.deleteEmbeddedDocuments.
   *
   * @param {Actor} actor - The actor to remove items from
   * @param {string|string[]} ids - Item ID(s) to delete
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<Item[]>} Deleted items
   *
   * @example
   * await MutationAdapter.deleteItems(actor, 'itemId123');
   * await MutationAdapter.deleteItems(actor, ['id1', 'id2']);
   */
  async deleteItems(actor, ids, options = {}) {
    _requireActor(actor, 'deleteItems');
    if (!ids) {
      throw new Error('MutationAdapter.deleteItems() requires ids');
    }

    const idsArray = Array.isArray(ids) ? ids : [ids];

    SWSELogger.debug('[MutationAdapter] deleteItems', {
      actor: actor.name,
      count: idsArray.length,
      source: options.source
    });

    return ActorEngine.deleteEmbeddedDocuments(
      actor,
      'Item',
      idsArray,
      _withAdapterMeta(options, 'deleteItems')
    );
  },

  /**
   * Replace items on an actor.
   *
   * Atomic convenience helper: deletes old items, creates new ones.
   * Both operations routed through ActorEngine.
   *
   * @param {Actor} actor - The actor
   * @param {Object} payload - { deleteIds: string[], createItems: Object[] }
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<Object>} { deleted: Item[], created: Item[] }
   *
   * @example
   * await MutationAdapter.replaceItems(actor, {
   *   deleteIds: ['oldItemId'],
   *   createItems: [{ name: 'New Item', type: 'weapon', ... }]
   * });
   */
  async replaceItems(actor, payload, options = {}) {
    _requireActor(actor, 'replaceItems');
    _requireObject(payload, 'replaceItems', 'payload');

    const { deleteIds = [], createItems: itemsToCreate = [] } = payload;

    SWSELogger.debug('[MutationAdapter] replaceItems', {
      actor: actor.name,
      deleteCount: deleteIds.length,
      createCount: itemsToCreate.length,
      source: options.source
    });

    const deleted = deleteIds.length > 0
      ? await this.deleteItems(actor, deleteIds, options)
      : [];

    const created = itemsToCreate.length > 0
      ? await this.createItems(actor, itemsToCreate, options)
      : [];

    return { deleted, created };
  },

  /**
   * Transfer items between actors.
   *
   * Atomic transfer: deletes from source, creates on target.
   * Both operations routed through ActorEngine.
   *
   * @param {Actor} sourceActor - Actor to take items from
   * @param {Actor} targetActor - Actor to give items to
   * @param {string|string[]} ids - Item ID(s) to transfer
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<Object>} { deleted: Item[], created: Item[] }
   *
   * @example
   * await MutationAdapter.moveItems(source, target, 'itemId123');
   */
  async moveItems(sourceActor, targetActor, ids, options = {}) {
    if (!sourceActor) {
      throw new Error('MutationAdapter.moveItems() requires sourceActor');
    }
    if (!targetActor) {
      throw new Error('MutationAdapter.moveItems() requires targetActor');
    }
    if (!ids) {
      throw new Error('MutationAdapter.moveItems() requires ids');
    }

    const idsArray = Array.isArray(ids) ? ids : [ids];

    try {
      // Get items to transfer
      const itemsToMove = sourceActor.items.filter(item => idsArray.includes(item.id));
      if (itemsToMove.length === 0) {
        throw new Error(`No items found to move from ${sourceActor.name}`);
      }

      // Prepare item data for creation
      const itemsForCreation = itemsToMove.map(item => {
        const data = item.toObject();
        delete data._id;
        return data;
      });

      SWSELogger.debug('[MutationAdapter] moveItems', {
        source: sourceActor.name,
        target: targetActor.name,
        count: idsArray.length
      });

      // Delete from source
      const deleted = await this.deleteItems(sourceActor, idsArray, options);

      // Create on target
      const created = await this.createItems(targetActor, itemsForCreation, options);

      return { deleted, created };
    } catch (err) {
      SWSELogger.error('[MutationAdapter] moveItems failed', {
        source: sourceActor?.name ?? 'unknown',
        target: targetActor?.name ?? 'unknown',
        error: err.message
      });
      throw err;
    }
  },

  // ========================================================================
  // ACTIVEEFFECT MUTATIONS
  // ========================================================================

  /**
   * Create active effects on an actor.
   *
   * The canonical way to apply effects. Routes to ActorEngine.createActiveEffects.
   *
   * @param {Actor} actor - The actor to apply effects to
   * @param {Object|Object[]} effects - Effect data object(s)
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<ActiveEffect[]>} Created effects
   *
   * @example
   * await MutationAdapter.createEffects(actor, {
   *   label: 'Buffs',
   *   icon: '...',
   *   changes: [ ... ]
   * });
   */
  async createEffects(actor, effects, options = {}) {
    _requireActor(actor, 'createEffects');
    if (!effects) {
      throw new Error('MutationAdapter.createEffects() requires effects');
    }

    const effectsArray = Array.isArray(effects) ? effects : [effects];
    const cleaned = _stripIds(effectsArray);

    SWSELogger.debug('[MutationAdapter] createEffects', {
      actor: actor.name,
      count: cleaned.length,
      source: options.source
    });

    return ActorEngine.createActiveEffects(
      actor,
      cleaned,
      _withAdapterMeta(options, 'createEffects')
    );
  },

  /**
   * Update active effects on an actor.
   *
   * The canonical way to modify effects. Routes to ActorEngine.updateActiveEffects.
   *
   * @param {Actor} actor - The actor owning the effects
   * @param {Object|Object[]} updates - Update object(s) with _id
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<ActiveEffect[]>} Updated effects
   *
   * @example
   * await MutationAdapter.updateEffects(actor, {
   *   _id: 'effectId',
   *   disabled: true
   * });
   */
  async updateEffects(actor, updates, options = {}) {
    _requireActor(actor, 'updateEffects');
    if (!updates) {
      throw new Error('MutationAdapter.updateEffects() requires updates');
    }

    const updatesArray = Array.isArray(updates) ? updates : [updates];

    // Validate _id presence
    for (const update of updatesArray) {
      if (!update._id) {
        throw new Error('MutationAdapter.updateEffects() — all updates require _id');
      }
    }

    SWSELogger.debug('[MutationAdapter] updateEffects', {
      actor: actor.name,
      count: updatesArray.length,
      source: options.source
    });

    return ActorEngine.updateActiveEffects(
      actor,
      updatesArray,
      _withAdapterMeta(options, 'updateEffects')
    );
  },

  /**
   * Delete active effects from an actor.
   *
   * The canonical way to remove effects. Routes to ActorEngine.deleteActiveEffects.
   *
   * @param {Actor} actor - The actor to remove effects from
   * @param {string|string[]} ids - Effect ID(s) to delete
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<ActiveEffect[]>} Deleted effects
   *
   * @example
   * await MutationAdapter.deleteEffects(actor, 'effectId123');
   */
  async deleteEffects(actor, ids, options = {}) {
    _requireActor(actor, 'deleteEffects');
    if (!ids) {
      throw new Error('MutationAdapter.deleteEffects() requires ids');
    }

    const idsArray = Array.isArray(ids) ? ids : [ids];

    SWSELogger.debug('[MutationAdapter] deleteEffects', {
      actor: actor.name,
      count: idsArray.length,
      source: options.source
    });

    return ActorEngine.deleteActiveEffects(
      actor,
      idsArray,
      _withAdapterMeta(options, 'deleteEffects')
    );
  },

  // ========================================================================
  // METADATA FLAG MUTATIONS (NON-AUTHORITATIVE ONLY)
  // ========================================================================

  /**
   * Set a metadata flag on an actor.
   *
   * ⚠️ METADATA ONLY — NOT for gameplay state
   * Routes to ActorEngine.updateActorFlags.
   *
   * Valid uses:
   * - UI state (collapsed sections, etc)
   * - Session tracking (cooldowns, temporary state)
   * - Dialogue/encounter context
   *
   * Invalid uses:
   * - HP, AC, stats, progression
   * - Inventory or item state
   * - Anything affecting mechanics
   *
   * @param {Actor} actor - The actor
   * @param {string} scope - Flag scope (e.g., 'foundryvtt-swse')
   * @param {string} key - Flag key
   * @param {*} value - Flag value (any serializable type)
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<*>} Flag value
   *
   * @example
   * // ✅ CORRECT: UI state
   * await MutationAdapter.setMetadataFlag(actor, 'foundryvtt-swse', 'uiExpanded', true);
   *
   * @example
   * // ❌ WRONG: Gameplay state
   * // await MutationAdapter.setMetadataFlag(actor, 'foundryvtt-swse', 'hp', 50); // NO!
   */
  async setMetadataFlag(actor, scope, key, value, options = {}) {
    _requireActor(actor, 'setMetadataFlag');
    if (!scope || typeof scope !== 'string') {
      throw new Error('MutationAdapter.setMetadataFlag() requires scope string');
    }
    if (!key || typeof key !== 'string') {
      throw new Error('MutationAdapter.setMetadataFlag() requires key string');
    }

    SWSELogger.debug('[MutationAdapter] setMetadataFlag', {
      actor: actor.name,
      scope,
      key,
      valueType: typeof value,
      source: options.source
    });

    return ActorEngine.updateActorFlags(
      actor,
      scope,
      key,
      value,
      _withAdapterMeta(options, `setMetadataFlag[${scope}.${key}]`)
    );
  },

  /**
   * Remove a metadata flag from an actor.
   *
   * ⚠️ METADATA ONLY — See setMetadataFlag documentation
   * Routes to ActorEngine.unsetActorFlag.
   *
   * @param {Actor} actor - The actor
   * @param {string} scope - Flag scope
   * @param {string} key - Flag key
   * @param {Object} [options={}] - Options for ActorEngine
   * @returns {Promise<*>} Flag value (before removal)
   *
   * @example
   * await MutationAdapter.unsetMetadataFlag(actor, 'foundryvtt-swse', 'uiExpanded');
   */
  async unsetMetadataFlag(actor, scope, key, options = {}) {
    _requireActor(actor, 'unsetMetadataFlag');
    if (!scope || typeof scope !== 'string') {
      throw new Error('MutationAdapter.unsetMetadataFlag() requires scope string');
    }
    if (!key || typeof key !== 'string') {
      throw new Error('MutationAdapter.unsetMetadataFlag() requires key string');
    }

    SWSELogger.debug('[MutationAdapter] unsetMetadataFlag', {
      actor: actor.name,
      scope,
      key,
      source: options.source
    });

    return ActorEngine.unsetActorFlag(
      actor,
      scope,
      key,
      _withAdapterMeta(options, `unsetMetadataFlag[${scope}.${key}]`)
    );
  },

  // ========================================================================
  // CONVENIENCE WRAPPERS (OPTIONAL)
  // ========================================================================

  /**
   * Update a single item by ID (convenience wrapper).
   *
   * @param {Actor} actor - The actor
   * @param {string} itemId - Item ID
   * @param {Object} changes - Field changes
   * @param {Object} [options={}] - Options
   * @returns {Promise<Item>} Updated item
   *
   * @example
   * await MutationAdapter.updateSingleItem(actor, 'itemId', { 'system.quantity': 5 });
   */
  async updateSingleItem(actor, itemId, changes, options = {}) {
    if (!itemId) {
      throw new Error('MutationAdapter.updateSingleItem() requires itemId');
    }

    const result = await this.updateItems(actor, {
      _id: itemId,
      ...changes
    }, options);

    return Array.isArray(result) ? result[0] : result;
  },

  /**
   * Delete a single item by ID (convenience wrapper).
   *
   * @param {Actor} actor - The actor
   * @param {string} itemId - Item ID
   * @param {Object} [options={}] - Options
   * @returns {Promise<Item>} Deleted item
   *
   * @example
   * await MutationAdapter.deleteSingleItem(actor, 'itemId');
   */
  async deleteSingleItem(actor, itemId, options = {}) {
    if (!itemId) {
      throw new Error('MutationAdapter.deleteSingleItem() requires itemId');
    }

    const result = await this.deleteItems(actor, [itemId], options);
    return Array.isArray(result) ? result[0] : result;
  },

  /**
   * Find and update a single item by criteria.
   *
   * Useful for stack merging or conditional updates.
   *
   * @param {Actor} actor - The actor
   * @param {Function} matcher - Function that returns true for target item
   * @param {Object} changes - Field changes
   * @param {Object} [options={}] - Options
   * @returns {Promise<Item|null>} Updated item or null if not found
   *
   * @example
   * await MutationAdapter.upsertSingleItem(
   *   actor,
   *   item => item.name === 'Credits' && item.type === 'currency',
   *   { 'system.quantity': newQuantity }
   * );
   */
  async upsertSingleItem(actor, matcher, changes, options = {}) {
    _requireActor(actor, 'upsertSingleItem');
    if (typeof matcher !== 'function') {
      throw new Error('MutationAdapter.upsertSingleItem() requires matcher function');
    }
    _requireObject(changes, 'upsertSingleItem', 'changes');

    const item = actor.items.find(matcher);
    if (!item) {
      SWSELogger.debug('[MutationAdapter] upsertSingleItem - no match found', {
        actor: actor.name
      });
      return null;
    }

    return this.updateSingleItem(actor, item.id, changes, options);
  }
};
