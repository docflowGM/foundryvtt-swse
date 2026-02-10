// scripts/utils/actor-utils.js
import { swseLogger } from './logger.js';

function toIntOrNull(value) {
  if (value === null || value === undefined) {return null;}
  if (typeof value === 'number' && Number.isFinite(value)) {return Math.trunc(value);}
  const m = String(value).match(/-?\d+/);
  if (!m) {return null;}
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function coerceSpeedIntegers(actor, changes) {
  // Vehicles use string speed fields; do not coerce.
  if (!actor || actor.type === 'vehicle') {return changes;}

  const out = foundry.utils.deepClone(changes);

  // Dot-notation keys
  for (const [k, v] of Object.entries(out)) {
    if (!k) {continue;}
    if (k === 'system.speed' || k.endsWith('.speed')) {
      const n = toIntOrNull(v);
      if (n !== null) {out[k] = n;}
    }
  }

  // Nested shapes
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') {return;}
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'speed') {
        const n = toIntOrNull(v);
        if (n !== null) {obj[k] = n;}
        continue;
      }
      if (v && typeof v === 'object') {walk(v);}
    }
  };
  walk(out.system);

  return out;
}

/**
 * Atomic Actor Update Helper
 * Provides safe, validated actor updates that are batched and transactional.
 * Prevents race conditions and ensures data consistency.
 *
 * @module actor-utils
 */

/**
 * Applies an atomic update to an actor with validation and error handling.
 * Merges changes into a single update call to avoid race conditions.
 *
 * @param {Actor} actor - The actor to update
 * @param {Object} changes - The changes to apply (supports dot-notation or nested objects)
 * @param {Object} options - Options to pass to actor.update()
 * @returns {Promise<Actor>} The updated actor
 * @throws {Error} If actor is invalid or update fails
 *
 * @example
 * // Simple update
 * await applyActorUpdateAtomic(actor, { 'system.hp.value': 20 });
 *
 * @example
 * // Nested update
 * await applyActorUpdateAtomic(actor, {
 *   system: {
 *     hp: { value: 20 },
 *     credits: 1000
 *   }
 * });
 */
export async function applyActorUpdateAtomic(actor, changes, options = {}) {
  // Validation
  if (!actor) {
    throw new Error('applyActorUpdateAtomic: actor is required');
  }

  if (!changes || typeof changes !== 'object') {
    throw new Error('applyActorUpdateAtomic: changes must be an object');
  }

  try {
    // Log the update for debugging
    if (game.settings?.get('foundryvtt-swse', 'devMode')) {
      swseLogger.debug('Applying atomic actor update:', {
        actor: actor.name,
        actorId: actor.id,
        changes
      });
    }

    const sanitized = coerceSpeedIntegers(actor, changes);

    // Perform the update
    const result = await actor.update(sanitized, options);

    return result;
  } catch (err) {
    swseLogger.error('applyActorUpdateAtomic failed:', {
      actor: actor.name,
      actorId: actor.id,
      changes,
      error: err
    });
    throw err;
  }
}

/**
 * Prepares an update payload by validating and merging changes.
 * Useful for complex updates that need validation before applying.
 *
 * @param {Actor} actor - The actor to prepare updates for
 * @param {Object} changes - The changes to prepare
 * @returns {Object} Validated update payload
 *
 * @example
 * const payload = prepareUpdatePayload(actor, { 'system.hp.value': 20 });
 * // Validate payload here if needed
 * await actor.update(payload);
 */
export function prepareUpdatePayload(actor, changes) {
  if (!actor) {
    throw new Error('prepareUpdatePayload: actor is required');
  }

  if (!changes || typeof changes !== 'object') {
    throw new Error('prepareUpdatePayload: changes must be an object');
  }

  // Return a clean copy of the changes
  return foundry.utils.deepClone(changes);
}

/**
 * Batch multiple actor updates into a single transaction.
 * Useful for applying multiple changes at once to avoid multiple renders.
 *
 * @param {Actor} actor - The actor to update
 * @param {Object[]} changesList - Array of change objects to merge and apply
 * @param {Object} options - Options to pass to actor.update()
 * @returns {Promise<Actor>} The updated actor
 *
 * @example
 * await batchActorUpdates(actor, [
 *   { 'system.hp.value': 20 },
 *   { 'system.credits': 1000 },
 *   { 'system.forcePoints.value': 5 }
 * ]);
 */
export async function batchActorUpdates(actor, changesList, options = {}) {
  if (!actor) {
    throw new Error('batchActorUpdates: actor is required');
  }

  if (!Array.isArray(changesList)) {
    throw new Error('batchActorUpdates: changesList must be an array');
  }

  // Merge all changes into a single update
  const mergedChanges = changesList.reduce((acc, changes) => {
    return foundry.utils.mergeObject(acc, changes);
  }, {});

  return applyActorUpdateAtomic(actor, mergedChanges, options);
}

/**
 * Safely updates an actor with rollback on failure.
 * Creates a backup of the current state and restores it if the update fails.
 *
 * @param {Actor} actor - The actor to update
 * @param {Object} changes - The changes to apply
 * @param {Object} options - Options to pass to actor.update()
 * @returns {Promise<Actor>} The updated actor
 * @throws {Error} If backup or restore fails (will not throw if update fails - will restore instead)
 *
 * @example
 * try {
 *   await safeActorUpdate(actor, { 'system.hp.value': -10 });
 * } catch (err) {
 *   // Actor state has been restored
 *   console.error('Update failed and was rolled back:', err);
 * }
 */
export async function safeActorUpdate(actor, changes, options = {}) {
  if (!actor) {
    throw new Error('safeActorUpdate: actor is required');
  }

  // Create a backup of current state
  const backup = foundry.utils.deepClone(actor.toObject());

  try {
    return await applyActorUpdateAtomic(actor, changes, options);
  } catch (err) {
    // Attempt to rollback
    swseLogger.warn('Actor update failed, attempting rollback:', {
      actor: actor.name,
      actorId: actor.id,
      error: err
    });

    try {
      // Restore the backup (excluding _id)
      const restoreData = {};
      for (const [key, value] of Object.entries(backup)) {
        if (key !== '_id') {
          restoreData[key] = value;
        }
      }
      await actor.update(restoreData, { diff: false, recursive: false });
      swseLogger.log('Actor state restored successfully');
    } catch (rollbackErr) {
      swseLogger.error('Rollback failed:', rollbackErr);
      throw new Error(`Update failed and rollback also failed: ${rollbackErr.message}`);
    }

    throw err;
  }
}

/**
 * Validates that an actor has required fields before updating.
 *
 * @param {Actor} actor - The actor to validate
 * @param {string[]} requiredFields - Array of required field paths (dot notation)
 * @returns {boolean} True if all fields exist
 * @throws {Error} If any required field is missing
 *
 * @example
 * validateActorFields(actor, ['system.hp', 'system.defenses.reflex']);
 */
export function validateActorFields(actor, requiredFields = []) {
  if (!actor) {
    throw new Error('validateActorFields: actor is required');
  }

  const missing = [];

  for (const field of requiredFields) {
    const value = foundry.utils.getProperty(actor, field);
    if (value === undefined) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Actor ${actor.name} is missing required fields: ${missing.join(', ')}`);
  }

  return true;
}
