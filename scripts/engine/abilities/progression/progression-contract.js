/**
 * PROGRESSION Execution Model - Contract Validation
 *
 * Enforces strict validation of PROGRESSION ability structure.
 * All PROGRESSION abilities must satisfy this contract before runtime registration.
 *
 * PHASE 6: Contract validation infrastructure (no effect processing yet)
 */

import { PROGRESSION_TRIGGERS, PROGRESSION_EFFECTS, PROGRESSION_EXECUTION_MODEL } from "./progression-types.js";

export class ProgressionContractValidator {

  /**
   * Master validation entry point.
   * Validates that ability is PROGRESSION and has valid schema.
   *
   * @param {Object} ability - The ability item
   * @returns {boolean}
   * @throws {Error} If validation fails
   */
  static validate(ability) {
    const executionModel = ability.system?.executionModel;

    // Only validate PROGRESSION abilities
    if (executionModel !== PROGRESSION_EXECUTION_MODEL) return false;

    // Validate basic structure
    const meta = ability.system?.abilityMeta;
    if (!meta) {
      throw new Error(
        `PROGRESSION ability ${ability.name} missing abilityMeta`
      );
    }

    // Validate trigger
    if (!meta.trigger) {
      throw new Error(
        `PROGRESSION ability ${ability.name} missing trigger`
      );
    }

    const validTriggers = Object.values(PROGRESSION_TRIGGERS);
    if (!validTriggers.includes(meta.trigger)) {
      throw new Error(
        `PROGRESSION ability ${ability.name} has invalid trigger: ${meta.trigger}. ` +
        `Must be one of: ${validTriggers.join(', ')}`
      );
    }

    // Validate effect
    if (!meta.effect) {
      throw new Error(
        `PROGRESSION ability ${ability.name} missing effect`
      );
    }

    if (!meta.effect.type) {
      throw new Error(
        `PROGRESSION ability ${ability.name} effect missing type`
      );
    }

    const validEffects = Object.values(PROGRESSION_EFFECTS);
    if (!validEffects.includes(meta.effect.type)) {
      throw new Error(
        `PROGRESSION ability ${ability.name} has invalid effect type: ${meta.effect.type}. ` +
        `Must be one of: ${validEffects.join(', ')}`
      );
    }

    // Validate effect-specific requirements
    return this._validateEffectSchema(ability, meta.effect);
  }

  /**
   * Validate effect-specific schema requirements
   *
   * @private
   * @param {Object} ability - The ability item
   * @param {Object} effect - The effect object
   * @returns {boolean}
   * @throws {Error} If validation fails
   */
  static _validateEffectSchema(ability, effect) {
    switch (effect.type) {
      case "GRANT_CREDITS":
        // Must have formula or fixed value
        if (!effect.formula && typeof effect.value !== 'number') {
          throw new Error(
            `PROGRESSION ability ${ability.name} GRANT_CREDITS effect ` +
            `missing formula or value`
          );
        }
        return true;

      case "GRANT_XP":
        // Must have formula or fixed value
        if (!effect.formula && typeof effect.value !== 'number') {
          throw new Error(
            `PROGRESSION ability ${ability.name} GRANT_XP effect ` +
            `missing formula or value`
          );
        }
        return true;

      case "GRANT_ITEM":
        // Must have itemUuid
        if (!effect.itemUuid) {
          throw new Error(
            `PROGRESSION ability ${ability.name} GRANT_ITEM effect ` +
            `missing itemUuid`
          );
        }
        return true;

      case "CUSTOM":
        // Custom effects have minimal requirements
        return true;

      default:
        throw new Error(
          `PROGRESSION ability ${ability.name} has unrecognized effect type: ${effect.type}`
        );
    }
  }
}
