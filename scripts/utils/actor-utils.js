// scripts/utils/actor-utils.js
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { traceLog, actorSummary, payloadSummary, isMutationTraceEnabled } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";

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
 * ⚠️ PHASE 7: INTERNAL USE ONLY
 * This is used internally by ActorEngine. Do NOT call from utilities or sheets.
 * Use ActorEngine.updateActor() instead.
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
  // [MUTATION TRACE] ATOMIC — entry boundary
  traceLog('ATOMIC', 'applyActorUpdateAtomic entry', {
    actor: actorSummary(actor),
    payload: payloadSummary(changes)
  });

  // Validation
  if (!actor) {
    throw new Error('applyActorUpdateAtomic: actor is required');
  }

  if (!changes || typeof changes !== 'object') {
    throw new Error('applyActorUpdateAtomic: changes must be an object');
  }

  // Ensure actor is a valid Foundry Actor instance
  if (!actor.id || typeof actor.update !== 'function') {
    throw new Error(`applyActorUpdateAtomic: actor is not a valid Actor instance (id: ${actor.id}, updateFn: ${typeof actor.update})`);
  }

  // RECOVERY: If actor appears to be synthetic/corrupted, refetch from world
  if (actor.collection === null && actor.id) {
    swseLogger.warn('applyActorUpdateAtomic: actor collection is null, attempting to refetch from world', {
      actorId: actor.id,
      actorName: actor.name
    });
    const worldActor = game.actors?.get?.(actor.id);
    if (worldActor && worldActor.collection !== null) {
      swseLogger.log('applyActorUpdateAtomic: recovered actor from world collection');
      actor = worldActor;
    } else {
      throw new Error(`applyActorUpdateAtomic: actor "${actor.name}" is synthetic/unowned and not recoverable`);
    }
  }

  try {
    // DIAGNOSTIC: Verify actor is valid before update
    const actorDiagnostics = {
      isActorInstance: actor instanceof Actor,
      constructorName: actor.constructor.name,
      actorId: actor.id,
      isSameAsWorldActor: actor === game.actors?.get?.(actor.id),
      collectionType: actor.collection ? 'world' : 'null',
      updatePayloadKeys: Object.keys(changes || {})
    };

    swseLogger.debug('applyActorUpdateAtomic PRE-UPDATE diagnostics:', actorDiagnostics);

    // Log the update for debugging
    if (game.settings?.get('foundryvtt-swse', 'devMode')) {
      swseLogger.debug('Applying atomic actor update:', {
        actor: actor.name,
        actorId: actor.id,
        changes
      });
    }

    const sanitized = coerceSpeedIntegers(actor, changes);

    // [MUTATION TRACE] ATOMIC — immediately before actor.update()
    traceLog('ATOMIC', 'about to call actor.update()', {
      actor: actorSummary(actor),
      payload: payloadSummary(sanitized)
    });

    // DIAGNOSTIC: Check sanitized payload for illegal values
    const flatPayload = foundry.utils.flattenObject(sanitized);
    const problematicKeys = [];
    for (const [key, value] of Object.entries(flatPayload)) {
      if (value instanceof Actor || value instanceof Item) {
        problematicKeys.push(`${key}: contains ${value.constructor.name} instance`);
      }
      if (Array.isArray(value) && value.some(v => v instanceof Actor || v instanceof Item)) {
        problematicKeys.push(`${key}: array contains document instances`);
      }
      if (value && typeof value === 'object' && value.collection) {
        problematicKeys.push(`${key}: appears to be collection-like`);
      }
    }

    if (problematicKeys.length > 0) {
      swseLogger.error('applyActorUpdateAtomic: Detected problematic payload values:', problematicKeys);
    }

    swseLogger.debug('applyActorUpdateAtomic: Sanitized payload keys:', Object.keys(flatPayload));

    // Perform the update
    const result = await actor.update(sanitized, options);

    return result;
  } catch (err) {
    // [MUTATION TRACE] ATOMIC — catch block
    traceLog('ATOMIC', `actor.update() threw: ${err?.message}`, {
      actor: actorSummary(actor),
      errorMessage: err?.message
    });

    // CRITICAL: Handle "You may only push instances of Actor to the Actors collection" error
    // This occurs when the actor reference is invalid during update. Attempt recovery.
    if (err?.message?.includes('You may only push instances of Actor') && actor?.id) {
      swseLogger.warn('applyActorUpdateAtomic: Actors collection error detected, attempting recovery with world actor', {
        actorId: actor.id,
        actorName: actor.name,
        originalError: err.message,
        actorCollection: actor.collection ? 'world' : 'null',
        actorType: actor.type,
        actorOwnership: actor.ownership
      });

      try {
        const worldActor = game.actors?.get?.(actor.id);
        if (worldActor && worldActor !== actor) {
          swseLogger.log('applyActorUpdateAtomic: Recovered stale actor reference, retrying with world actor', {
            actorId: actor.id,
            actorName: actor.name
          });
          // [MUTATION TRACE] RECOVERY — about to retry with world actor
          traceLog('RECOVERY', 'retrying actor.update() with world actor (reference differs)', {
            originalActor: actorSummary(actor),
            worldActor:    actorSummary(worldActor),
            payload:       payloadSummary(changes)
          });
          const sanitized = coerceSpeedIntegers(worldActor, changes);
          const result = await worldActor.update(sanitized, options);
          return result;
        } else if (worldActor && worldActor === actor) {
          // Actor references are the same, so recovery won't help
          // Re-throw with more diagnostic info
          swseLogger.error('applyActorUpdateAtomic: Actor is same reference as world actor, update() still failed', {
            actorId: actor.id,
            actorName: actor.name,
            actorCollection: actor.collection ? 'world' : 'null'
          });
        } else {
          // Actor not found in world collection
          swseLogger.error('applyActorUpdateAtomic: Actor not found in world collection for recovery', {
            actorId: actor.id,
            actorName: actor.name
          });
        }
      } catch (recoveryErr) {
        swseLogger.error('applyActorUpdateAtomic: Recovery attempt failed', {
          actorId: actor.id,
          actorName: actor.name,
          recoveryError: recoveryErr.message
        });
      }
    }

    swseLogger.error('applyActorUpdateAtomic failed:', {
      actor: actor.name,
      actorId: actor.id,
      changes,
      error: err,
      errorMessage: err?.message
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
 * ⚠️ PHASE 7: DEPRECATED — Use ActorEngine.updateActor() instead
 * Utilities must not call actor.update() directly.
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
 * ⚠️ PHASE 7: DEPRECATED — Use ActorEngine methods instead
 * Utilities must not call actor.update() directly.
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
