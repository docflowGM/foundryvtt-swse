/**
 * PASSIVE Execution Model - Contract Validators
 *
 * Enforces strict validation of PASSIVE ability structure.
 * Each subtype must satisfy its contract before runtime registration.
 */

import { PASSIVE_SUBTYPES } from "./passive-types.js";
import { validateRuleType } from "./rule-types.js";

export class PassiveContractValidator {

  /**
   * Master validation entry point.
   * Validates ability structure and delegates to subtype-specific validators.
   *
   * PHASE 4: Support MODIFIER, DERIVED_OVERRIDE, and RULE subtypes.
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

    // PHASE 4: Support MODIFIER, DERIVED_OVERRIDE, and RULE
    if (subType === PASSIVE_SUBTYPES.MODIFIER) {
      return this.validateModifier(meta);
    } else if (subType === 'DERIVED_OVERRIDE') {
      return this.validateDerivedOverride(meta);
    } else if (subType === 'RULE') {
      return this.validateRule(meta);
    } else {
      throw new Error(
        `PASSIVE ${subType} not supported in Phase 4. ` +
        `Supported: MODIFIER, DERIVED_OVERRIDE, RULE. Got: ${subType} on ${ability.name}`
      );
    }
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

  /**
   * Validate DERIVED_OVERRIDE subtype structure.
   * Requires overrides array with valid operations.
   *
   * PHASE 3: Only ADD operations supported (no REPLACE).
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateDerivedOverride(meta) {
    if (!meta?.overrides) {
      throw new Error("PASSIVE DERIVED_OVERRIDE missing overrides array");
    }

    if (!Array.isArray(meta.overrides)) {
      throw new Error("PASSIVE DERIVED_OVERRIDE overrides must be an array");
    }

    // PHASE 3: Validate each override
    for (const override of meta.overrides) {
      if (!override || typeof override !== 'object') {
        throw new Error("PASSIVE DERIVED_OVERRIDE override is not an object");
      }

      // Validate target
      if (!override.target || typeof override.target !== 'string') {
        throw new Error(
          "PASSIVE DERIVED_OVERRIDE override missing required 'target' field"
        );
      }

      // Validate operation (ADD only in Phase 3)
      if (!override.operation || typeof override.operation !== 'string') {
        throw new Error(
          "PASSIVE DERIVED_OVERRIDE override missing required 'operation' field"
        );
      }

      if (override.operation !== 'ADD') {
        throw new Error(
          `PASSIVE DERIVED_OVERRIDE Phase 3 only supports ADD operation. ` +
          `Got: ${override.operation} on target ${override.target}`
        );
      }

      // Validate value specification
      if (!override.value || typeof override.value !== 'object') {
        throw new Error(
          `PASSIVE DERIVED_OVERRIDE override missing required 'value' field on ${override.target}`
        );
      }

      // Validate value type
      if (!override.value.type || typeof override.value.type !== 'string') {
        throw new Error(
          `PASSIVE DERIVED_OVERRIDE value missing required 'type' field on ${override.target}`
        );
      }

      const validTypes = ['ABILITY_MOD', 'HALF_LEVEL', 'STATIC'];
      if (!validTypes.includes(override.value.type)) {
        throw new Error(
          `PASSIVE DERIVED_OVERRIDE invalid value type '${override.value.type}'. ` +
          `Must be one of: ${validTypes.join(', ')}`
        );
      }

      // Type-specific validation
      if (override.value.type === 'ABILITY_MOD') {
        if (!override.value.ability || typeof override.value.ability !== 'string') {
          throw new Error(
            `PASSIVE DERIVED_OVERRIDE ABILITY_MOD value missing 'ability' field on ${override.target}`
          );
        }
        const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        if (!validAbilities.includes(override.value.ability)) {
          throw new Error(
            `PASSIVE DERIVED_OVERRIDE invalid ability '${override.value.ability}'. ` +
            `Must be one of: ${validAbilities.join(', ')}`
          );
        }
      } else if (override.value.type === 'STATIC') {
        if (typeof override.value.amount !== 'number') {
          throw new Error(
            `PASSIVE DERIVED_OVERRIDE STATIC value missing numeric 'amount' field on ${override.target}`
          );
        }
      }

      // Validate conditions if present
      if (override.conditions && Array.isArray(override.conditions)) {
        for (const condition of override.conditions) {
          if (!condition.type || typeof condition.type !== 'string') {
            throw new Error(
              "PASSIVE DERIVED_OVERRIDE condition missing required 'type' field"
            );
          }
          if (condition.value === undefined || condition.value === null) {
            throw new Error(
              "PASSIVE DERIVED_OVERRIDE condition missing required 'value' field"
            );
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate RULE subtype structure.
   * Rules are declarative boolean capabilities, not numeric or mutation logic.
   *
   * PHASE 4: Rules must have type, optional conditions.
   * Rules CANNOT have: value, overrides, grants, formulas.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateRule(meta) {
    if (!meta?.rules) {
      throw new Error("PASSIVE RULE missing rules array");
    }

    if (!Array.isArray(meta.rules)) {
      throw new Error("PASSIVE RULE rules must be an array");
    }

    if (meta.rules.length === 0) {
      throw new Error("PASSIVE RULE rules array cannot be empty");
    }

    // PHASE 4: Validate each rule
    for (const rule of meta.rules) {
      if (!rule || typeof rule !== 'object') {
        throw new Error("PASSIVE RULE rule is not an object");
      }

      // Validate rule type
      if (!rule.type || typeof rule.type !== 'string') {
        throw new Error(
          "PASSIVE RULE rule missing required 'type' field"
        );
      }

      // Validate against whitelist
      try {
        validateRuleType(rule.type);
      } catch (err) {
        throw new Error(
          `PASSIVE RULE invalid rule type: ${err.message}`
        );
      }

      // REJECT numeric fields
      if (rule.value !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'value' field. ` +
          `Rules are boolean, not numeric. Use MODIFIER for numeric effects.`
        );
      }

      if (rule.amount !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'amount' field. ` +
          `Rules are boolean, not numeric.`
        );
      }

      if (rule.operation !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'operation' field. ` +
          `Use DERIVED_OVERRIDE for augmentation logic.`
        );
      }

      // PHASE 4E: Skill-scoped rule validation
      if (rule.type === 'TREAT_SKILL_AS_TRAINED') {
        if (!rule.skill || typeof rule.skill !== 'string') {
          throw new Error(
            `PASSIVE RULE TREAT_SKILL_AS_TRAINED requires 'skill' property. ` +
            `Example: { type: "TREAT_SKILL_AS_TRAINED", skill: "useTheForce" }`
          );
        }
      }

      // Validate optional conditions
      if (rule.conditions && Array.isArray(rule.conditions)) {
        for (const condition of rule.conditions) {
          if (!condition.type || typeof condition.type !== 'string') {
            throw new Error(
              "PASSIVE RULE condition missing required 'type' field"
            );
          }
          if (condition.value === undefined || condition.value === null) {
            throw new Error(
              "PASSIVE RULE condition missing required 'value' field"
            );
          }
        }
      }
    }

    return true;
  }
}
