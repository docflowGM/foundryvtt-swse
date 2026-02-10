/**
 * Mutation Safety Module - v13 hardening
 *
 * Enforces strict rules for actor/item mutations:
 * - Ownership assertions before changes
 * - State snapshots for rollback capability
 * - Centralized mutation tracking
 * - Prevention of cascading mutations
 */

import { log, isGameMaster } from './foundry-env.js';

const SYSTEM_ID = 'foundryvtt-swse';
const FLAG_MUTATION_LOCK = 'mutationLocked';
const FLAG_SNAPSHOT = 'preUpdateSnapshot';

/**
 * Lock actor mutations during critical operations
 * Prevents concurrent mutations that could cause data corruption
 */
export async function lockActorMutations(actor, reason = 'critical-operation') {
  if (!actor) return false;

  try {
    await actor.setFlag(SYSTEM_ID, FLAG_MUTATION_LOCK, {
      locked: true,
      reason,
      timestamp: Date.now()
    });
    log.debug(`Actor ${actor.name} mutations locked:`, reason);
    return true;
  } catch (err) {
    log.error(`Failed to lock actor mutations for ${actor.name}:`, err.message);
    return false;
  }
}

/**
 * Unlock actor mutations
 */
export async function unlockActorMutations(actor) {
  if (!actor) return false;

  try {
    await actor.unsetFlag(SYSTEM_ID, FLAG_MUTATION_LOCK);
    log.debug(`Actor ${actor.name} mutations unlocked`);
    return true;
  } catch (err) {
    log.error(`Failed to unlock actor mutations for ${actor.name}:`, err.message);
    return false;
  }
}

/**
 * Check if actor mutations are locked
 */
export function areMutationsLocked(actor) {
  if (!actor) return true;
  try {
    const lock = actor.getFlag?.(SYSTEM_ID, FLAG_MUTATION_LOCK);
    return lock?.locked === true;
  } catch {
    return false;
  }
}

/**
 * Take immutable snapshot of actor before mutation
 * Allows safe rollback if something goes wrong
 */
export async function snapshotActorBeforeMutation(actor, operation = 'unknown') {
  if (!actor) return false;

  try {
    // Check if snapshot already exists (prevent overwrites during recursive operations)
    const existing = actor.getFlag?.(SYSTEM_ID, FLAG_SNAPSHOT);
    if (existing) {
      log.debug(`Snapshot already exists for ${actor.name}, skipping`);
      return true;
    }

    const snapshot = {
      uuid: actor.uuid,
      id: actor.id,
      name: actor.name,
      type: actor.type,
      operation,
      timestamp: Date.now(),
      data: foundry.utils.deepClone(actor.toObject())
    };

    await actor.setFlag(SYSTEM_ID, FLAG_SNAPSHOT, snapshot);
    log.debug(`Snapshot created for ${actor.name} before ${operation}`);
    return true;
  } catch (err) {
    log.warn(`Failed to snapshot actor ${actor.name}:`, err.message);
    return false;
  }
}

/**
 * Restore actor from pre-mutation snapshot
 * Use only in error recovery scenarios
 */
export async function restoreActorFromSnapshot(actor) {
  if (!actor) return false;

  try {
    const snapshot = actor.getFlag?.(SYSTEM_ID, FLAG_SNAPSHOT);
    if (!snapshot) {
      log.warn(`No snapshot found for ${actor.name}`);
      return false;
    }

    // Restore from snapshot
    const updates = foundry.utils.deepClone(snapshot.data);
    delete updates._id;
    delete updates.name;

    await actor.update(updates, { [SYSTEM_ID]: { skipHooks: true } });
    await actor.unsetFlag(SYSTEM_ID, FLAG_SNAPSHOT);

    log.info(`Actor ${actor.name} restored from snapshot (operation: ${snapshot.operation})`);
    return true;
  } catch (err) {
    log.error(`Failed to restore actor ${actor.name} from snapshot:`, err.message);
    return false;
  }
}

/**
 * Safe mutation with automatic rollback on error
 * Usage: await safeMutateActor(actor, async (a) => { ... }, 'operation-name')
 */
export async function safeMutateActor(actor, mutationFn, operationName = 'mutation') {
  if (!actor) {
    log.error('safeMutateActor: Actor is null');
    return { success: false, error: 'Actor is null' };
  }

  if (areMutationsLocked(actor)) {
    log.warn(`Cannot mutate ${actor.name}: mutations are locked`);
    return { success: false, error: 'Mutations locked' };
  }

  // Take snapshot before mutation
  const snapshotOk = await snapshotActorBeforeMutation(actor, operationName);
  if (!snapshotOk) {
    log.warn(`Could not snapshot ${actor.name} before ${operationName}`);
  }

  // Lock mutations during operation
  await lockActorMutations(actor, operationName);

  try {
    const result = await mutationFn(actor);
    await unlockActorMutations(actor);
    await actor.unsetFlag(SYSTEM_ID, FLAG_SNAPSHOT);

    log.debug(`Safe mutation completed: ${operationName} on ${actor.name}`);
    return { success: true, result };
  } catch (err) {
    log.error(`Safe mutation failed: ${operationName} on ${actor.name}:`, err.message);

    // Attempt rollback
    const rollbackOk = await restoreActorFromSnapshot(actor);
    await unlockActorMutations(actor);

    return {
      success: false,
      error: err.message,
      rolledBack: rollbackOk
    };
  }
}

/**
 * Assert that embedded document ownership is valid
 */
export function assertEmbeddedDocOwnership(embeddedDoc, actor, operation = 'edit') {
  if (!embeddedDoc || !actor) {
    log.warn('assertEmbeddedDocOwnership: Missing arguments');
    return false;
  }

  if (!actor.isOwner) {
    log.error(`Non-owner attempting to ${operation} embedded document in ${actor.name}`);
    return false;
  }

  return true;
}

/**
 * Validate item data before creation
 */
export function validateItemForCreation(itemData) {
  const errors = [];

  if (!itemData || typeof itemData !== 'object') {
    errors.push('Item data must be an object');
    return errors;
  }

  if (!itemData.name || typeof itemData.name !== 'string') {
    errors.push('Item must have a name');
  }

  if (!itemData.type || typeof itemData.type !== 'string') {
    errors.push('Item must have a type');
  }

  // Validate item type is known
  const validTypes = ['weapon', 'armor', 'equipment', 'feat', 'talent', 'forcepower', 'prestige', 'class'];
  if (!validTypes.includes(itemData.type)) {
    errors.push(`Invalid item type: ${itemData.type}`);
  }

  return errors;
}

/**
 * Get mutation audit trail for an actor (GM only)
 */
export function getActorMutationAudit(actor) {
  if (!isGameMaster()) {
    log.warn('getActorMutationAudit: Only GMs can view audit trail');
    return null;
  }

  if (!actor) return null;

  try {
    const snapshot = actor.getFlag?.(SYSTEM_ID, FLAG_SNAPSHOT);
    const lock = actor.getFlag?.(SYSTEM_ID, FLAG_MUTATION_LOCK);

    return {
      actor: actor.name,
      locked: lock?.locked === true,
      lockReason: lock?.reason,
      lastMutationTime: lock?.timestamp,
      hasSnapshot: !!snapshot,
      snapshotOperation: snapshot?.operation,
      snapshotTime: snapshot?.timestamp
    };
  } catch (err) {
    log.error(`Failed to get mutation audit for ${actor.name}:`, err.message);
    return null;
  }
}

/**
 * Register mutation safety diagnostics
 */
export function registerMutationSafety() {
  window.SWSEMutations = {
    lock: (actor, reason) => lockActorMutations(actor, reason),
    unlock: (actor) => unlockActorMutations(actor),
    locked: (actor) => areMutationsLocked(actor),
    snapshot: (actor, op) => snapshotActorBeforeMutation(actor, op),
    restore: (actor) => restoreActorFromSnapshot(actor),
    audit: (actor) => getActorMutationAudit(actor)
  };
}
