/**
 * DroidSlotGovernanceEngine — Enforce Slot Domain Rules
 *
 * PHASE 4 STEP 6: Strict domain-level slot governance
 *
 * Responsibilities:
 * - Validate slot compatibility against chassis type
 * - Enforce one-system-per-slot rules (except multi-slot)
 * - Prevent incompatible system combinations
 * - Provide detailed error messages for violations
 *
 * Non-goals:
 * - No mutations
 * - No database access
 * - Pure validation only
 *
 * Slot Categories:
 * - Single-slot: processor, shield, power-core (only one per droid)
 * - Multi-slot: locomotion, appendage (multiple allowed)
 * - Consumable: enhancement, upgrade (temporary effects)
 */

import { DROID_SYSTEM_DEFINITIONS, getDroidSystemDefinition } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-system-definitions.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class DroidSlotGovernanceEngine {
  // Slot categories
  static SLOT_CATEGORIES = {
    single: ['processor', 'shield', 'power_core', 'sensor_array'],
    multi: ['locomotion', 'appendage'],
    consumable: ['enhancement', 'upgrade']
  };

  /**
   * Validate complete slot configuration
   *
   * @param {Array<string>} systemIds - Array of installed system IDs
   * @param {string} chassisType - Droid chassis type (light, medium, heavy)
   * @returns {Object} { valid: boolean, violations: Array<string> }
   */
  static validateConfiguration(systemIds, chassisType) {
    const violations = [];

    if (!Array.isArray(systemIds)) {
      return {
        valid: false,
        violations: ['systemIds must be an array']
      };
    }

    // Track slots used
    const slotUsage = {};
    const usedSystems = [];

    for (const systemId of systemIds) {
      const def = getDroidSystemDefinition(systemId);

      if (!def) {
        violations.push(`System "${systemId}" not found in definitions`);
        continue;
      }

      usedSystems.push({ id: systemId, def });
      const slot = def.slot;

      // Initialize slot tracking
      if (!slotUsage[slot]) {
        slotUsage[slot] = [];
      }
      slotUsage[slot].push(systemId);
    }

    // Validate single-slot rules
    for (const slot of this.SLOT_CATEGORIES.single) {
      if (slotUsage[slot]?.length > 1) {
        violations.push(
          `Slot "${slot}" allows only 1 system, but ${slotUsage[slot].length} are installed`
        );
      }
    }

    // Validate compatibility for each system
    for (const { id, def } of usedSystems) {
      const compat = this.#validateCompatibility(def, chassisType);
      if (!compat.valid) {
        violations.push(
          `System "${id}" incompatible with chassis "${chassisType}": ${compat.reason}`
        );
      }
    }

    // Validate no conflicting system combinations
    const conflicts = this.#validateCombinations(usedSystems);
    violations.push(...conflicts);

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Validate proposed modifications
   *
   * @param {Array<string>} currentSystems - Currently installed system IDs
   * @param {Array<string>} systemsToAdd - System IDs to add
   * @param {Array<string>} systemsToRemove - System IDs to remove
   * @param {string} chassisType - Droid chassis type
   * @returns {Object} { valid: boolean, violations: Array<string> }
   */
  static validateModifications(currentSystems, systemsToAdd, systemsToRemove, chassisType) {
    const violations = [];

    // Check for add/remove conflicts
    const removeSet = new Set(systemsToRemove);
    const addSet = new Set(systemsToAdd);

    for (const id of addSet) {
      if (removeSet.has(id)) {
        violations.push(`Cannot add and remove same system: "${id}"`);
      }
    }

    // Check for non-existent removals
    const currentSet = new Set(currentSystems);
    for (const id of removeSet) {
      if (!currentSet.has(id)) {
        violations.push(`Cannot remove system "${id}": not currently installed`);
      }
    }

    // Build final state
    const finalState = [
      ...currentSystems.filter(id => !removeSet.has(id)),
      ...addSet
    ];

    // Validate final configuration
    const configValidation = this.validateConfiguration(finalState, chassisType);
    violations.push(...configValidation.violations);

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Get allowed systems for a specific slot on a chassis
   *
   * @param {string} slot - Slot name
   * @param {string} chassisType - Chassis type
   * @returns {Array<Object>} Array of compatible system definitions
   */
  static getCompatibleSystemsForSlot(slot, chassisType) {
    const compatible = [];

    for (const [id, def] of Object.entries(DROID_SYSTEM_DEFINITIONS)) {
      if (def.slot !== slot) {
        continue;
      }

      const compat = this.#validateCompatibility(def, chassisType);
      if (compat.valid) {
        compatible.push(def);
      }
    }

    return compatible;
  }

  /**
   * Check if a specific system is compatible with a chassis
   *
   * @param {Object} systemDef - System definition
   * @param {string} chassisType - Chassis type
   * @returns {boolean}
   */
  static isSystemCompatible(systemDef, chassisType) {
    const compat = this.#validateCompatibility(systemDef, chassisType);
    return compat.valid;
  }

  /* ---- PRIVATE HELPERS ---- */

  static #validateCompatibility(systemDef, chassisType) {
    if (!systemDef.compatibility) {
      return { valid: true };
    }

    const { chassis = [] } = systemDef.compatibility;

    if (chassis.length === 0) {
      return { valid: true };
    }

    if (!chassis.includes(chassisType)) {
      return {
        valid: false,
        reason: `requires chassis type in [${chassis.join(', ')}], got ${chassisType}`
      };
    }

    return { valid: true };
  }

  static #validateCombinations(usedSystems) {
    const violations = [];

    // Example: Cannot have both flight and heavy chassis
    // (Flight system only works with light/medium)
    // This would be caught by compatibility check above

    // Future: Add specific combination rules here
    // E.g., "Cannot have both armor types X and Y"

    return violations;
  }
}
