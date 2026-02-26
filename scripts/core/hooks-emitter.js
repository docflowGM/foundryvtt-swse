/**
 * System Event Emitter - Phase 5 Extension Safety
 *
 * Centralizes custom hook firing for system events.
 * Allows third-party modules to hook into critical flows:
 * - Chargen completion
 * - Level-up finalization
 * - Character import
 * - Migration events
 *
 * Usage:
 *   emitChargenComplete(actor, selections)
 *   emitLevelupComplete(actor, levelData)
 *   emitImportComplete(actor)
 *
 * Third-party hook listener:
 *   Hooks.on('swse.chargen.complete', (actor, selections) => {...})
 */

import { log } from "/systems/foundryvtt-swse/scripts/core/foundry-env.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Hook fired when character generation is finalized
 *
 * @hook swse.chargen.complete
 * @param {Actor} actor - Created/updated actor
 * @param {Object} selections - Chargen selections (race, class, talents, etc)
 * @returns {boolean} - Handler can return false to cancel downstream effects
 */
export function emitChargenComplete(actor, selections) {
  if (!actor) return true;

  try {
    log.info(`[${SYSTEM_ID}] Emitting swse.chargen.complete for ${actor.name}`);
    return Hooks.call(`${SYSTEM_ID}.chargen.complete`, actor, selections);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in chargen.complete hook:`, err.message);
    return true; // Allow continuation on hook error
  }
}

/**
 * Hook fired when level-up is finalized
 *
 * @hook swse.levelup.complete
 * @param {Actor} actor - Updated actor
 * @param {number} newLevel - New level after advancement
 * @param {Object} levelupData - Selections made during levelup
 * @returns {boolean} - Handler can return false to cancel
 */
export function emitLevelupComplete(actor, newLevel, levelupData) {
  if (!actor) return true;

  try {
    log.info(`[${SYSTEM_ID}] Emitting swse.levelup.complete for ${actor.name} → level ${newLevel}`);
    return Hooks.call(`${SYSTEM_ID}.levelup.complete`, actor, newLevel, levelupData);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in levelup.complete hook:`, err.message);
    return true;
  }
}

/**
 * Hook fired when character import completes
 *
 * @hook swse.import.complete
 * @param {Actor} actor - Imported actor
 * @param {Object} sourceData - Raw import data
 * @returns {boolean}
 */
export function emitImportComplete(actor, sourceData = {}) {
  if (!actor) return true;

  try {
    log.info(`[${SYSTEM_ID}] Emitting swse.import.complete for ${actor.name}`);
    return Hooks.call(`${SYSTEM_ID}.import.complete`, actor, sourceData);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in import.complete hook:`, err.message);
    return true;
  }
}

/**
 * Hook fired when system migration starts/completes
 *
 * @hook swse.migration.start
 * @hook swse.migration.complete
 * @param {string} fromVersion - Version migrating from
 * @param {string} toVersion - Version migrating to
 * @returns {boolean}
 */
export function emitMigrationStart(fromVersion, toVersion) {
  try {
    log.info(`[${SYSTEM_ID}] Emitting swse.migration.start (${fromVersion} → ${toVersion})`);
    return Hooks.call(`${SYSTEM_ID}.migration.start`, fromVersion, toVersion);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in migration.start hook:`, err.message);
    return true;
  }
}

export function emitMigrationComplete(fromVersion, toVersion, summary = {}) {
  try {
    log.info(`[${SYSTEM_ID}] Emitting swse.migration.complete (${fromVersion} → ${toVersion})`);
    return Hooks.call(`${SYSTEM_ID}.migration.complete`, fromVersion, toVersion, summary);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in migration.complete hook:`, err.message);
    return true;
  }
}

/**
 * Hook fired when combat resolution completes
 *
 * @hook swse.combat.resolved
 * @param {Combat} combat - The combat encounter
 * @param {Object} resolution - Combat resolution data
 * @returns {boolean}
 */
export function emitCombatResolved(combat, resolution = {}) {
  if (!combat) return true;

  try {
    log.debug(`[${SYSTEM_ID}] Emitting swse.combat.resolved`);
    return Hooks.call(`${SYSTEM_ID}.combat.resolved`, combat, resolution);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in combat.resolved hook:`, err.message);
    return true;
  }
}

/**
 * Hook fired when actor is prepared (all data normalized)
 *
 * @hook swse.actor.prepared
 * @param {Actor} actor - Prepared actor
 * @returns {boolean}
 */
export function emitActorPrepared(actor) {
  if (!actor) return true;

  try {
    log.debug(`[${SYSTEM_ID}] Emitting swse.actor.prepared for ${actor.name}`);
    return Hooks.call(`${SYSTEM_ID}.actor.prepared`, actor);
  } catch (err) {
    log.error(`[${SYSTEM_ID}] Error in actor.prepared hook:`, err.message);
    return true;
  }
}

/**
 * Public hook listener registration (for third-party code)
 * Usage: SWSEHooks.on('chargen.complete', handler)
 */
export const SWSEHooks = {
  on(event, handler) {
    return Hooks.on(`${SYSTEM_ID}.${event}`, handler);
  },
  once(event, handler) {
    return Hooks.once(`${SYSTEM_ID}.${event}`, handler);
  },
  off(event, handler) {
    return Hooks.off(`${SYSTEM_ID}.${event}`, handler);
  }
};
