/**
 * PROGRESSION Execution Model - Runtime Adapter
 *
 * Registers PROGRESSION abilities on an actor.
 * Scaffolds idempotency guard (_progressionHistory).
 *
 * PHASE 2: Schema definition and registration
 * PHASE 5: Idempotency guard scaffolding
 *
 * IMPORTANT: No effect processing - infrastructure only
 */

import { PROGRESSION_EXECUTION_MODEL } from "./progression-types.js";
import { ProgressionContractValidator } from "./progression-contract.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * PROGRESSION Execution Model Schema
 *
 * system.executionModel = "PROGRESSION"
 * system.abilityMeta = {
 *   trigger: "LEVEL_UP" | "CLASS_LEVEL_GAIN" | "FIRST_ACQUIRED",
 *   effect: {
 *     type: "GRANT_CREDITS" | "GRANT_XP" | "GRANT_ITEM" | "CUSTOM",
 *     formula?: string (e.g., "5000 * CLASS_LEVEL"),
 *     value?: number (fixed amount),
 *     itemUuid?: string (for GRANT_ITEM),
 *     oncePerLevel?: boolean (default: false)
 *   }
 * }
 *
 * Example - Wealth (500 credits per level):
 * {
 *   executionModel: "PROGRESSION",
 *   abilityMeta: {
 *     trigger: "LEVEL_UP",
 *     effect: {
 *       type: "GRANT_CREDITS",
 *       formula: "500 * CLASS_LEVEL"
 *     }
 *   }
 * }
 *
 * Example - Starting item (first acquired):
 * {
 *   executionModel: "PROGRESSION",
 *   abilityMeta: {
 *     trigger: "FIRST_ACQUIRED",
 *     effect: {
 *       type: "GRANT_ITEM",
 *       itemUuid: "Compendium.foundryvtt-swse.equipment.Item.xxx"
 *     }
 *   }
 * }
 */
export class ProgressionAdapter {

  /**
   * Register a PROGRESSION ability on an actor.
   *
   * PHASE 2: Validates contract
   * PHASE 5: Scaffolds idempotency tracking
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @throws {Error} If validation fails
   */
  static register(actor, ability) {
    if (ability.system?.executionModel !== PROGRESSION_EXECUTION_MODEL) return;

    // Validate contract
    try {
      ProgressionContractValidator.validate(ability);
    } catch (err) {
      throw new Error(
        `Failed to register PROGRESSION ability ${ability.name}: ${err.message}`
      );
    }

    swseLogger.debug(
      `[ProgressionAdapter] Registering PROGRESSION ability: ${ability.name}`,
      ability.system.abilityMeta
    );

    // PHASE 5: Initialize idempotency scaffolding
    this._initializeProgressionTracking(actor, ability);
  }

  /**
   * Initialize progression history tracking for idempotency guard.
   *
   * PHASE 5: Scaffolding only
   * - Tracking structure is created but not used yet
   * - Future phases will check this to prevent double-grants
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static _initializeProgressionTracking(actor, ability) {
    // PHASE 5: Create tracking structure (scaffolding)
    if (!actor._progressionHistory) {
      actor._progressionHistory = {};
    }

    // Initialize tracking for this ability if not already present
    if (!actor._progressionHistory[ability.id]) {
      actor._progressionHistory[ability.id] = {
        levelsTriggered: [],  // Will track which levels triggered this ability
        lastTriggeredAt: null // For time-based duplicate detection
      };

      swseLogger.debug(
        `[ProgressionAdapter] Initialized progression tracking for ${ability.name}`,
        actor._progressionHistory[ability.id]
      );
    }
  }

  /**
   * Get the progression history for an ability
   *
   * FUTURE: Used in Phase 4+ to prevent duplicate grants
   *
   * @param {Object} actor - The actor document
   * @param {string} abilityId - The ability ID
   * @returns {Object|null} Tracking object or null
   */
  static getProgressionHistory(actor, abilityId) {
    return actor._progressionHistory?.[abilityId] || null;
  }

  /**
   * Check if an ability was already triggered at a given level
   *
   * FUTURE: Used in Phase 4+ to implement oncePerLevel logic
   *
   * @param {Object} actor - The actor document
   * @param {string} abilityId - The ability ID
   * @param {number} level - The character level
   * @returns {boolean} True if already triggered at this level
   */
  static wasTriggeredAtLevel(actor, abilityId, level) {
    const history = this.getProgressionHistory(actor, abilityId);
    return history?.levelsTriggered.includes(level) || false;
  }
}
