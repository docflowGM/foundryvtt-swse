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
   * PHASE 2 (Wave 2): Support singular condition object with strict enum validation.
   * - Only one condition per modifier
   * - Allowed types: action, attack_type, defense_vs, damage_type
   * - Strict enum values (no arbitrary strings)
   * - No nesting, no arrays
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateModifier(meta) {
    if (!meta?.modifiers) throw new Error("PASSIVE MODIFIER missing modifiers array");

    // Allowed Wave 2 condition types
    const allowedConditionTypes = ['action', 'attack_type', 'defense_vs', 'damage_type'];

    // Strict enums for each condition type
    const conditionEnums = {
      action: ['charge', 'fight_defensively', 'full_attack', 'standard_action'],
      attack_type: ['melee', 'ranged'],
      defense_vs: ['fear', 'poison', 'mind_affecting', 'disease'],
      damage_type: ['fire', 'cold', 'electricity', 'acid', 'sonic', 'energy']
    };

    // Validate modifiers
    if (Array.isArray(meta.modifiers)) {
      for (const modifier of meta.modifiers) {
        // PHASE 2 (Wave 2): Validate singular condition (new)
        if (modifier.condition) {
          if (typeof modifier.condition !== 'object' || Array.isArray(modifier.condition)) {
            throw new Error(
              "PASSIVE MODIFIER condition must be a single object, not an array"
            );
          }

          if (!modifier.condition.type || typeof modifier.condition.type !== 'string') {
            throw new Error(
              "PASSIVE MODIFIER condition missing required 'type' field"
            );
          }

          if (modifier.condition.value === undefined || modifier.condition.value === null) {
            throw new Error(
              "PASSIVE MODIFIER condition missing required 'value' field"
            );
          }

          // Validate condition type is allowed
          if (!allowedConditionTypes.includes(modifier.condition.type)) {
            throw new Error(
              `PASSIVE MODIFIER condition type '${modifier.condition.type}' not allowed. ` +
              `Allowed types: ${allowedConditionTypes.join(', ')}`
            );
          }

          // Validate condition value against enum
          const enumValues = conditionEnums[modifier.condition.type];
          if (enumValues && !enumValues.includes(modifier.condition.value)) {
            throw new Error(
              `PASSIVE MODIFIER condition value '${modifier.condition.value}' not allowed for type '${modifier.condition.type}'. ` +
              `Allowed values: ${enumValues.join(', ')}`
            );
          }

          // Reject old-style conditions array if condition is present
          if (modifier.conditions && Array.isArray(modifier.conditions)) {
            throw new Error(
              "PASSIVE MODIFIER cannot have both 'condition' and 'conditions'. Use singular 'condition' for Wave 2."
            );
          }
        }

        // PHASE 2 (legacy): Support conditions array (for backward compatibility with RULE types)
        if (modifier.conditions && Array.isArray(modifier.conditions)) {
          for (const condition of modifier.conditions) {
            if (!condition.type || typeof condition.type !== "string") {
              throw new Error(
                "PASSIVE MODIFIER legacy conditions array: condition missing required 'type' field"
              );
            }
            if (condition.value === undefined || condition.value === null) {
              throw new Error(
                "PASSIVE MODIFIER legacy conditions array: condition missing required 'value' field"
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
   * Rules are declarative boolean capability tokens.
   * No numeric injection, no mutation, no side effects.
   *
   * PHASE 4: Legacy rules array format (single rule per ability)
   * PHASE 4E: Structured rule objects with params
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateRule(meta) {
    // Import locally to avoid circular dependency
    const { RULES, isValidRule } = require("/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js");
    const { hasRuleDefinition, getRuleDefinition } = require("/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-definitions.js");

    if (!meta?.rules) {
      throw new Error("PASSIVE RULE missing rules array");
    }

    if (!Array.isArray(meta.rules)) {
      throw new Error("PASSIVE RULE rules must be an array");
    }

    if (meta.rules.length === 0) {
      throw new Error("PASSIVE RULE rules array cannot be empty");
    }

    // Validate each rule
    for (const rule of meta.rules) {
      if (!rule || typeof rule !== 'object') {
        throw new Error("PASSIVE RULE rule is not an object");
      }

      // Validate rule identifier
      if (!rule.type || typeof rule.type !== 'string') {
        throw new Error(
          "PASSIVE RULE rule missing required 'type' field"
        );
      }

      // PHASE 4E: Validate rule type is in enum
      if (!isValidRule(rule.type)) {
        throw new Error(
          `PASSIVE RULE type '${rule.type}' not in RULES enum. ` +
          `Supported rules: ${Object.values(RULES).join(', ')}`
        );
      }

      // Validate rule definition exists
      if (!hasRuleDefinition(rule.type)) {
        throw new Error(
          `PASSIVE RULE type '${rule.type}' has no definition in RULE_DEFINITIONS`
        );
      }

      const definition = getRuleDefinition(rule.type);

      // REJECT all numeric fields
      if (rule.value !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'value' field. ` +
          `Rules are boolean, not numeric. Use MODIFIER for numeric effects.`
        );
      }

      if (rule.amount !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'amount' field. Rules are boolean, not numeric.`
        );
      }

      if (rule.operation !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'operation' field. Use DERIVED_OVERRIDE for augmentation.`
        );
      }

      // REJECT complex fields
      if (rule.modifiers !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'modifiers' field. Use MODIFIER subtype instead.`
        );
      }

      if (rule.target !== undefined) {
        throw new Error(
          `PASSIVE RULE cannot have 'target' field. Rules are not numeric injection.`
        );
      }

      // PHASE 4E: Validate params against definition
      if (definition.params === null) {
        // No params allowed
        if (rule.params !== undefined && rule.params !== null) {
          throw new Error(
            `PASSIVE RULE ${rule.type} does not accept params, but params were provided`
          );
        }
      } else {
        // Params required/allowed
        if (rule.params === undefined || rule.params === null) {
          if (definition.required) {
            throw new Error(
              `PASSIVE RULE ${rule.type} requires params: ${definition.required.join(', ')}`
            );
          }
        } else {
          // Validate params structure
          if (typeof rule.params !== 'object' || Array.isArray(rule.params)) {
            throw new Error(
              `PASSIVE RULE ${rule.type} params must be an object, not ${typeof rule.params}`
            );
          }

          // Validate required params
          if (definition.required) {
            for (const requiredKey of definition.required) {
              if (rule.params[requiredKey] === undefined) {
                throw new Error(
                  `PASSIVE RULE ${rule.type} missing required param '${requiredKey}'`
                );
              }
            }
          }

          // Validate param types
          for (const [paramKey, paramValue] of Object.entries(rule.params)) {
            if (!definition.params[paramKey]) {
              throw new Error(
                `PASSIVE RULE ${rule.type} has unknown param '${paramKey}'. ` +
                `Allowed params: ${Object.keys(definition.params).join(', ')}`
              );
            }

            const expectedType = definition.params[paramKey];
            const actualType = typeof paramValue;

            if (actualType !== expectedType) {
              throw new Error(
                `PASSIVE RULE ${rule.type} param '${paramKey}' must be ${expectedType}, got ${actualType}`
              );
            }
          }
        }
      }

      // Validate optional conditions (legacy, may be used for rule activation)
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
