/**
 * VehicleSlotGovernanceEngine — Enforce Vehicle Slot Domain Rules
 * PHASE 5: Strict domain-level slot governance for vehicles
 * Mirrors DroidSlotGovernanceEngine
 */

import { VEHICLE_SYSTEM_DEFINITIONS, getVehicleSystemDefinition } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-system-definitions.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class VehicleSlotGovernanceEngine {
  static SLOT_CATEGORIES = {
    single: ['engine', 'armor', 'sensor'],
    multi: ['weapon_mount'],
    consumable: ['modification']
  };

  /**
   * Validate complete slot configuration for vehicle
   *
   * @param {Array<string>} systemIds - Installed system IDs
   * @param {string} vehicleType - Vehicle type (speeder, transport, fighter, etc)
   * @returns {Object} { valid, violations[] }
   */
  static validateConfiguration(systemIds, vehicleType) {
    const violations = [];

    if (!Array.isArray(systemIds)) {
      return {
        valid: false,
        violations: ['systemIds must be an array']
      };
    }

    const slotUsage = {};
    const usedSystems = [];

    for (const systemId of systemIds) {
      const def = getVehicleSystemDefinition(systemId);

      if (!def) {
        violations.push(`System "${systemId}" not found in definitions`);
        continue;
      }

      usedSystems.push({ id: systemId, def });
      const slot = def.slot;

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

    // Validate compatibility
    for (const { id, def } of usedSystems) {
      const compat = this.#validateCompatibility(def, vehicleType);
      if (!compat.valid) {
        violations.push(
          `System "${id}" incompatible with vehicle type "${vehicleType}": ${compat.reason}`
        );
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Validate proposed modifications
   *
   * @param {Array<string>} currentSystems - Currently installed
   * @param {Array<string>} systemsToAdd - Systems to add
   * @param {Array<string>} systemsToRemove - Systems to remove
   * @param {string} vehicleType - Vehicle type
   * @returns {Object} { valid, violations[] }
   */
  static validateModifications(currentSystems, systemsToAdd, systemsToRemove, vehicleType) {
    const violations = [];

    const removeSet = new Set(systemsToRemove);
    const addSet = new Set(systemsToAdd);

    for (const id of addSet) {
      if (removeSet.has(id)) {
        violations.push(`Cannot add and remove same system: "${id}"`);
      }
    }

    const currentSet = new Set(currentSystems);
    for (const id of removeSet) {
      if (!currentSet.has(id)) {
        violations.push(`Cannot remove system "${id}": not currently installed`);
      }
    }

    const finalState = [
      ...currentSystems.filter(id => !removeSet.has(id)),
      ...addSet
    ];

    const configValidation = this.validateConfiguration(finalState, vehicleType);
    violations.push(...configValidation.violations);

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Get compatible systems for a vehicle type and slot
   *
   * @param {string} slot
   * @param {string} vehicleType
   * @returns {Array}
   */
  static getCompatibleSystemsForSlot(slot, vehicleType) {
    const compatible = [];

    for (const [id, def] of Object.entries(VEHICLE_SYSTEM_DEFINITIONS)) {
      if (def.slot !== slot) continue;

      const compat = this.#validateCompatibility(def, vehicleType);
      if (compat.valid) {
        compatible.push(def);
      }
    }

    return compatible;
  }

  /* ---- PRIVATE ---- */

  static #validateCompatibility(systemDef, vehicleType) {
    if (!systemDef.compatibility) {
      return { valid: true };
    }

    const { type = [] } = systemDef.compatibility;

    if (type.length === 0) {
      return { valid: true };
    }

    if (!type.includes(vehicleType)) {
      return {
        valid: false,
        reason: `requires vehicle type in [${type.join(', ')}]`
      };
    }

    return { valid: true };
  }
}
