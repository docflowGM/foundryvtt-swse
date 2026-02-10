/**
 * Document API v13 Compatibility
 *
 * Provides safe, v13-compatible wrappers for document creation, updates, and deletions.
 * Replaces deprecated patterns:
 * - Actor.create() → Actor.createDocuments()
 * - Item.create() → actor.createEmbeddedDocuments('Item', ...)
 * - ChatMessage.create() → ChatMessage.create()
 * - document.update() → document.update() (unchanged in v13)
 *
 * All methods are async and return null on error.
 */

import { log } from './foundry-env.js';
import { assertEmbeddedDocOwnership, validateItemForCreation } from './mutation-safety.js';

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Create actor(s) - v13 safe
 * @param {Object|Array} actorData
 * @param {Object} options
 */
export async function createActor(actorData, options = {}) {
  if (!actorData || typeof actorData !== 'object') {
    log.error('createActor: Invalid actor data');
    return null;
  }

  const dataArray = Array.isArray(actorData) ? actorData : [actorData];

  try {
    const created = await Actor.createDocuments(dataArray, options);
    if (!created || created.length === 0) {
      log.warn('createActor: No actors created');
      return null;
    }

    return Array.isArray(actorData) ? created : created[0];
  } catch (err) {
    log.error('createActor failed:', err.message);
    return null;
  }
}

/**
 * Create item in actor - v13 safe
 * @param {Actor} actor
 * @param {Object|Array} itemData
 * @param {Object} options
 */
export async function createItemInActor(actor, itemData, options = {}) {
  if (!actor) {
    log.error('createItemInActor: Actor is null');
    return null;
  }

  if (!assertEmbeddedDocOwnership(null, actor, 'create item')) {
    return null;
  }

  const dataArray = Array.isArray(itemData) ? itemData : [itemData];

  // Validate all items before creation
  for (const item of dataArray) {
    const errors = validateItemForCreation(item);
    if (errors.length > 0) {
      log.error(`createItemInActor validation failed:`, errors.join('; '));
      return null;
    }
  }

  try {
    const created = await actor.createEmbeddedDocuments('Item', dataArray, options);
    if (!created || created.length === 0) {
      log.warn(`createItemInActor: No items created in ${actor.name}`);
      return null;
    }

    return Array.isArray(itemData) ? created : created[0];
  } catch (err) {
    log.error(`createItemInActor failed for ${actor.name}:`, err.message);
    return null;
  }
}

/**
 * Update actor - v13 safe
 * @param {Actor} actor
 * @param {Object} updates
 * @param {Object} options
 */
export async function updateActor(actor, updates, options = {}) {
  if (!actor || !updates) {
    log.error('updateActor: Invalid arguments');
    return null;
  }

  if (!actor.isOwner) {
    log.error(`updateActor: Non-owner attempting update on ${actor.name}`);
    return null;
  }

  try {
    return await actor.update(updates, options);
  } catch (err) {
    log.error(`updateActor failed for ${actor.name}:`, err.message);
    return null;
  }
}

/**
 * Delete actor(s) - v13 safe
 * @param {Actor|Array} actors
 * @param {Object} options
 */
export async function deleteActor(actors, options = {}) {
  if (!actors) {
    log.error('deleteActor: Actors is null');
    return null;
  }

  const ids = Array.isArray(actors)
    ? actors.map(a => a?.id).filter(Boolean)
    : [actors?.id];

  if (ids.length === 0) {
    log.warn('deleteActor: No valid actor IDs');
    return null;
  }

  try {
    return await Actor.deleteDocuments(ids, options);
  } catch (err) {
    log.error('deleteActor failed:', err.message);
    return null;
  }
}

/**
 * Delete item in actor - v13 safe
 * @param {Actor} actor
 * @param {Item|Array} items
 * @param {Object} options
 */
export async function deleteItemInActor(actor, items, options = {}) {
  if (!actor || !items) {
    log.error('deleteItemInActor: Invalid arguments');
    return null;
  }

  if (!assertEmbeddedDocOwnership(null, actor, 'delete item')) {
    return null;
  }

  const ids = Array.isArray(items)
    ? items.map(i => i?.id).filter(Boolean)
    : [items?.id];

  if (ids.length === 0) {
    log.warn(`deleteItemInActor: No valid item IDs for ${actor.name}`);
    return null;
  }

  try {
    return await actor.deleteEmbeddedDocuments('Item', ids, options);
  } catch (err) {
    log.error(`deleteItemInActor failed for ${actor.name}:`, err.message);
    return null;
  }
}

/**
 * Create chat message - v13 safe
 * @param {Object} messageData
 * @param {Object} options
 */
export async function createChatMessage(messageData, options = {}) {
  if (!messageData || typeof messageData !== 'object') {
    log.error('createChatMessage: Invalid message data');
    return null;
  }

  try {
    return await ChatMessage.create(messageData, options);
  } catch (err) {
    log.error('createChatMessage failed:', err.message);
    return null;
  }
}

/**
 * Create active effect on actor - v13 safe
 * @param {Actor} actor
 * @param {Object|Array} effectData
 * @param {Object} options
 */
export async function createEffectOnActor(actor, effectData, options = {}) {
  if (!actor) {
    log.error('createEffectOnActor: Actor is null');
    return null;
  }

  if (!assertEmbeddedDocOwnership(null, actor, 'create effect')) {
    return null;
  }

  const dataArray = Array.isArray(effectData) ? effectData : [effectData];

  try {
    const created = await actor.createEmbeddedDocuments('ActiveEffect', dataArray, options);
    return Array.isArray(effectData) ? created : created?.[0] ?? null;
  } catch (err) {
    log.error(`createEffectOnActor failed for ${actor.name}:`, err.message);
    return null;
  }
}

/**
 * Delete active effect from actor - v13 safe
 * @param {Actor} actor
 * @param {ActiveEffect|Array} effects
 * @param {Object} options
 */
export async function deleteEffectFromActor(actor, effects, options = {}) {
  if (!actor) {
    log.error('deleteEffectFromActor: Actor is null');
    return null;
  }

  if (!assertEmbeddedDocOwnership(null, actor, 'delete effect')) {
    return null;
  }

  const ids = Array.isArray(effects)
    ? effects.map(e => e?.id).filter(Boolean)
    : [effects?.id];

  if (ids.length === 0) {
    log.warn(`deleteEffectFromActor: No valid effect IDs for ${actor.name}`);
    return null;
  }

  try {
    return await actor.deleteEmbeddedDocuments('ActiveEffect', ids, options);
  } catch (err) {
    log.error(`deleteEffectFromActor failed for ${actor.name}:`, err.message);
    return null;
  }
}

/**
 * Safe document patch - applies partial updates to nested properties
 * This replaces mergeObject patterns for document updates
 */
export async function patchDocument(document, patch, options = {}) {
  if (!document || !patch) {
    log.error('patchDocument: Invalid arguments');
    return null;
  }

  try {
    // Convert flat keys like "system.hp.value" to nested structure
    const updates = {};
    for (const [key, value] of Object.entries(patch)) {
      foundry.utils.setProperty(updates, key, value);
    }

    return await document.update(updates, options);
  } catch (err) {
    log.error(`patchDocument failed:`, err.message);
    return null;
  }
}

/**
 * Create world-level item - v13 safe (not embedded in actor)
 * @param {Object|Array} itemData
 * @param {Object} options
 */
export async function createItem(itemData, options = {}) {
  if (!itemData || typeof itemData !== 'object') {
    log.error('createItem: Invalid item data');
    return null;
  }

  const dataArray = Array.isArray(itemData) ? itemData : [itemData];

  // Validate all items before creation
  for (const item of dataArray) {
    const errors = validateItemForCreation(item);
    if (errors.length > 0) {
      log.error(`createItem validation failed:`, errors.join('; '));
      return null;
    }
  }

  try {
    const created = await Item.createDocuments(dataArray, options);
    if (!created || created.length === 0) {
      log.warn('createItem: No items created');
      return null;
    }

    return Array.isArray(itemData) ? created : created[0];
  } catch (err) {
    log.error('createItem failed:', err.message);
    return null;
  }
}

/**
 * Get or create owned item by name
 * Useful for ensuring required items exist
 */
export async function getOrCreateOwnedItem(actor, itemName, itemData = {}) {
  if (!actor || !itemName) {
    log.error('getOrCreateOwnedItem: Invalid arguments');
    return null;
  }

  // Look for existing
  const existing = actor.items?.find(i => i.name === itemName);
  if (existing) {
    return existing;
  }

  // Create new
  const fullData = {
    name: itemName,
    type: itemData.type || 'equipment',
    ...itemData
  };

  return await createItemInActor(actor, fullData);
}
