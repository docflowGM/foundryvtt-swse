/**
 * ATTACK_OPTION Execution Model - Contract Validators
 *
 * Enforces strict validation of ATTACK_OPTION ability structure.
 * All attack options MUST define primitives array with valid primitive types.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ATTACK_OPTION SCHEMA (Primitive-Based)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * system.executionModel = "ATTACK_OPTION"
 *
 * system.abilityMeta = {
 *   conditions: [
 *     {
 *       type: "WEAPON_CATEGORY",
 *       value: "MELEE" | "RANGED" | "UNARMED"
 *     }
 *   ],
 *
 *   primitives: [
 *
 *     // ATTACK_CONSTRUCTION_MODIFIER
 *     {
 *       type: "ATTACK_CONSTRUCTION_MODIFIER",
 *       data: {
 *         attackBonus: {
 *           type: "STATIC" | "FORMULA" | null,
 *           value: -2,                        // used if STATIC
 *           formula: "BAB + STR_MOD"           // used if FORMULA
 *         },
 *         damageModifier: {
 *           type: "STATIC" | "FORMULA" | null,
 *           value: 4,                         // used if STATIC
 *           formula: "STR_MOD"                // used if FORMULA
 *         }
 *       }
 *     },
 *
 *     // TARGETING_MUTATION
 *     {
 *       type: "TARGETING_MUTATION",
 *       data: {
 *         mode: "SINGLE" | "MULTI" | "AREA",
 *         range: 6,
 *         selection: {
 *           type: "FIXED" | "FORMULA" | "ALL_IN_AREA",
 *           value: 2,                        // used if FIXED
 *           formula: "FLOOR(LEVEL/2)",       // used if FORMULA
 *           minimum: 1,
 *           maximum: null
 *         }
 *       }
 *     },
 *
 *     // ACTION_ECONOMY_MUTATION
 *     {
 *       type: "ACTION_ECONOMY_MUTATION",
 *       data: {
 *         newActionType: "SWIFT" | "STANDARD" | "FULL_ROUND" | "IMMEDIATE",
 *         replacesBaseCost: true
 *       }
 *     },
 *
 *     // EXTRA_ATTACK_GENERATOR
 *     {
 *       type: "EXTRA_ATTACK_GENERATOR",
 *       data: {
 *         trigger: "ON_HIT" | "ON_KILL" | "ALWAYS",
 *         maxExtraAttacks: 1,
 *         attackPenalty: -5
 *       }
 *     },
 *
 *     // RIDER_EFFECT_ATTACHMENT
 *     {
 *       type: "RIDER_EFFECT_ATTACHMENT",
 *       data: {
 *         trigger: "ON_HIT" | "ON_CRIT" | "ON_MISS",
 *         effect: {
 *           type: "STATUS" | "MODIFIER" | "CUSTOM",
 *           payload: {}
 *         }
 *       }
 *     }
 *
 *   ]
 * }
 */

import { ATTACK_PRIMITIVES } from "./attack-primitives.js";

export class AttackOptionContractValidator {

  /**
   * Master validation entry point.
   * Validates ability structure and all primitives.
   *
   * @param {Object} ability - The ability item
   * @returns {boolean}
   * @throws {Error} If validation fails
   */
  static validate(ability) {
    if (ability.system?.executionModel !== "ATTACK_OPTION") return false;

    const meta = ability.system?.abilityMeta;

    if (!meta)
      throw new Error(`ATTACK_OPTION ability ${ability.name} missing abilityMeta`);

    if (!Array.isArray(meta.primitives))
      throw new Error(`ATTACK_OPTION ability ${ability.name} must define primitives array`);

    if (meta.primitives.length === 0)
      throw new Error(`ATTACK_OPTION ability ${ability.name} primitives array cannot be empty`);

    for (const primitive of meta.primitives) {
      this.validatePrimitive(ability, primitive);
    }

    return true;
  }

  /**
   * Validate a single primitive block.
   * Checks type existence and data presence.
   *
   * @param {Object} ability - The ability (for error reporting)
   * @param {Object} primitive - The primitive block
   * @throws {Error}
   */
  static validatePrimitive(ability, primitive) {
    if (!primitive.type)
      throw new Error(`ATTACK_OPTION ${ability.name} primitive missing type`);

    if (!ATTACK_PRIMITIVES[primitive.type])
      throw new Error(`ATTACK_OPTION ${ability.name} invalid primitive type: ${primitive.type}`);

    if (!primitive.data)
      throw new Error(`ATTACK_OPTION ${ability.name} primitive ${primitive.type} missing data block`);
  }
}
