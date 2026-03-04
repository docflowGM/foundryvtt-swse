/**
 * ACTIVE Execution Model - Contract Validators
 *
 * Enforces strict validation of ACTIVE ability structure.
 * Each subtype must satisfy its contract before runtime registration.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ACTIVE EFFECT SCHEMA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * system.executionModel = "ACTIVE"
 * system.subType = "EFFECT"
 *
 * system.abilityMeta = {
 *   activation: {
 *     actionType: "STANDARD" | "MOVE" | "SWIFT" | "IMMEDIATE" | "FREE"
 *   },
 *   frequency: {
 *     type: "ROUND" | "TURN" | "ENCOUNTER" | "DAY" | "UNLIMITED",
 *     max: 1
 *   },
 *   cost: {
 *     forcePoints: 0,
 *     resource: null,
 *     resourceAmount: 0
 *   },
 *   targeting: {
 *     mode: "SINGLE" | "MULTI" | "AREA",
 *     targetType: "ALLY" | "ENEMY" | "ANY" | "SELF",
 *     range: 6,
 *     selection: {
 *       type: "FIXED" | "FORMULA" | "ALL_IN_AREA",
 *       value: 2,                 // used if FIXED
 *       formula: "CHA_MOD",        // used if FORMULA
 *       minimum: 1,
 *       maximum: null
 *     }
 *   },
 *   effect: {
 *     type: "MODIFIER" | "STATUS" | "HEAL" | "CUSTOM",
 *     payload: {},
 *     duration: {
 *       type: "ROUND" | "TURN" | "ENCOUNTER" | "INSTANT",
 *       value: 1,
 *       expires: "END_OF_SOURCE_TURN"
 *     }
 *   }
 * }
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ACTIVE MODE SCHEMA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * system.executionModel = "ACTIVE"
 * system.subType = "MODE"
 *
 * system.abilityMeta = {
 *   activation: {
 *     actionType: "SWIFT" | "STANDARD"
 *   },
 *   mode: {
 *     exclusiveGroup: "STANCE",
 *     toggle: true
 *   },
 *   persistentEffect: {
 *     type: "MODIFIER" | "RULE",
 *     payload: {}
 *   }
 * }
 */

import { ACTIVE_SUBTYPES } from "./active-types.js";

export class ActiveContractValidator {

  /**
   * Master validation entry point.
   * Validates ability structure and delegates to subtype-specific validators.
   *
   * @param {Object} ability - The ability item
   * @returns {boolean}
   * @throws {Error} If validation fails
   */
  static validate(ability) {
    if (ability.system?.executionModel !== "ACTIVE") return false;

    const subType = ability.system?.subType;
    const meta = ability.system?.abilityMeta;

    if (!subType)
      throw new Error(`ACTIVE ability ${ability.name} missing subType`);

    if (!meta)
      throw new Error(`ACTIVE ability ${ability.name} missing abilityMeta`);

    switch (subType) {
      case ACTIVE_SUBTYPES.EFFECT:
        return this.validateEffect(meta);
      case ACTIVE_SUBTYPES.MODE:
        return this.validateMode(meta);
      default:
        throw new Error(`Unknown ACTIVE subType: ${subType}`);
    }
  }

  /**
   * Validate EFFECT subtype structure.
   * Requires activation and effect blocks.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateEffect(meta) {
    if (!meta.activation)
      throw new Error("ACTIVE EFFECT missing activation block");

    if (!meta.effect)
      throw new Error("ACTIVE EFFECT missing effect block");

    return true;
  }

  /**
   * Validate MODE subtype structure.
   * Requires activation, mode, and persistentEffect blocks.
   *
   * @param {Object} meta
   * @returns {boolean}
   * @throws {Error}
   */
  static validateMode(meta) {
    if (!meta.activation)
      throw new Error("ACTIVE MODE missing activation block");

    if (!meta.mode)
      throw new Error("ACTIVE MODE missing mode block");

    if (!meta.persistentEffect)
      throw new Error("ACTIVE MODE missing persistentEffect block");

    return true;
  }
}
