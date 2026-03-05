/**
 * PASSIVE Execution Model - Contract Validators
 *
 * Enforces strict validation of PASSIVE ability structure.
 * Each subtype must satisfy its contract before runtime registration.
 */

import { PASSIVE_SUBTYPES } from "./passive-types.js";

export class PassiveContractValidator {

  /**
   * Master validation entry point.
   * Validates ability structure and delegates to subtype-specific validators.
   *
   * @param {Object} ability - The ability item
   * @returns {boolean}
   * @throws {Error} If validation fails
   */
  static validate(ability) {
    const meta = ability.system?.abilityMeta;
    const subType = ability.system?.subType;

    if (ability.system?.executionModel !== "PASSIVE") return false;
    if (!subType) throw new Error(`PASSIVE ability ${ability.name} missing subType`);

    // PHASE 1: Enforce strict PASSIVE contract - MODIFIER only
    if (subType !== PASSIVE_SUBTYPES.MODIFIER) {
      throw new Error(
        `PASSIVE Phase 1 only supports MODIFIER subtype. Got: ${subType} on ${ability.name}`
      );
    }

    return this.validateModifier(meta);
  }

  /**
   * Validate MODIFIER subtype structure.
   * Requires modifiers array.
   *
   * PHASE 2: Support optional conditions on each modifier.
   * Each condition must have type and value.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateModifier(meta) {
    if (!meta?.modifiers) throw new Error("PASSIVE MODIFIER missing modifiers array");

    // PHASE 2: Validate conditions if present
    if (Array.isArray(meta.modifiers)) {
      for (const modifier of meta.modifiers) {
        if (modifier.conditions && Array.isArray(modifier.conditions)) {
          for (const condition of modifier.conditions) {
            if (!condition.type || typeof condition.type !== "string") {
              throw new Error(
                "PASSIVE MODIFIER condition missing required 'type' field"
              );
            }
            if (condition.value === undefined || condition.value === null) {
              throw new Error(
                "PASSIVE MODIFIER condition missing required 'value' field"
              );
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate RULE subtype structure.
   * Requires rule block.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateRule(meta) {
    if (!meta?.rule) throw new Error("PASSIVE RULE missing rule block");
    return true;
  }

  /**
   * Validate DERIVED_OVERRIDE subtype structure.
   * Requires targetStat.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateDerived(meta) {
    if (!meta?.targetStat) throw new Error("PASSIVE DERIVED_OVERRIDE missing targetStat");
    return true;
  }

  /**
   * Validate AURA subtype structure.
   * Requires radius and modifiers array.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateAura(meta) {
    if (!meta?.radius || !meta?.modifiers)
      throw new Error("PASSIVE AURA missing radius or modifiers");
    return true;
  }

  /**
   * Validate TRIGGERED subtype structure.
   * Requires trigger and effect.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateTriggered(meta) {
    if (!meta?.trigger || !meta?.effect)
      throw new Error("PASSIVE TRIGGERED missing trigger or effect");
    return true;
  }
}
