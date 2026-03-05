/**
 * PASSIVE Phase 2 - Condition Evaluator
 *
 * Evaluates conditions for PASSIVE/MODIFIER abilities.
 * Conditions are checked during modifier aggregation (not registration).
 * Evaluation is stateless and non-mutating.
 *
 * Supported condition types:
 * - WEAPON_CATEGORY: actor has equipped weapon of category
 * - EQUIPPED_ITEM_TYPE: actor has equipped item of type
 * - ACTOR_FLAG: actor has flag set in system.flags.swse
 * - SKILL_CONTEXT: actor has skill proficiency/trained status
 *
 * All evaluation is synchronous and fresh each cycle.
 * No caching, no persistence.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ConditionEvaluator {
  /**
   * Evaluate a single condition against actor state.
   * Returns true if condition is met, false otherwise.
   *
   * @param {Object} actor - The actor document
   * @param {Object} condition - Condition object with type and value
   * @param {string} condition.type - One of: WEAPON_CATEGORY, EQUIPPED_ITEM_TYPE, ACTOR_FLAG, SKILL_CONTEXT
   * @param {string|number} condition.value - Type-specific condition value
   * @returns {boolean}
   * @throws {Error} If condition type is unsupported
   */
  static evaluate(actor, condition) {
    if (!actor || !condition) {
      return false;
    }

    try {
      switch (condition.type) {
        case "WEAPON_CATEGORY":
          return this._hasWeaponCategory(actor, condition.value);

        case "EQUIPPED_ITEM_TYPE":
          return this._hasEquippedItemType(actor, condition.value);

        case "ACTOR_FLAG":
          return this._checkActorFlag(actor, condition.value);

        case "SKILL_CONTEXT":
          return this._checkSkillContext(actor, condition.value);

        default:
          swseLogger.warn(
            `[ConditionEvaluator] Unknown condition type: ${condition.type}`
          );
          return false;
      }
    } catch (err) {
      swseLogger.error(
        `[ConditionEvaluator] Error evaluating condition ${condition.type}:`,
        err
      );
      return false;
    }
  }

  /**
   * Evaluate all conditions with AND logic.
   * Returns true only if ALL conditions are met.
   * Empty conditions array returns true (always apply).
   *
   * @param {Object} actor - The actor document
   * @param {Array<Object>} conditions - Array of condition objects
   * @returns {boolean}
   */
  static evaluateAll(actor, conditions = []) {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return true; // No conditions = always apply
    }

    return conditions.every(cond => this.evaluate(actor, cond));
  }

  /**
   * Check if actor has equipped weapon of given category.
   *
   * WEAPON_CATEGORY values: LIGHTSABER, BLASTER_PISTOL, BLASTER_RIFLE, etc.
   * Checks actor.items for weapons where:
   * - type === "weapon"
   * - system.equipped === true
   * - system.weaponCategory === categoryValue
   *
   * @private
   * @param {Object} actor
   * @param {string} categoryValue
   * @returns {boolean}
   */
  static _hasWeaponCategory(actor, categoryValue) {
    if (!actor?.items || typeof categoryValue !== "string") {
      return false;
    }

    const equippedWeapons = actor.items.filter(i =>
      i.type === "weapon" && i.system?.equipped === true
    );

    return equippedWeapons.some(w =>
      w.system?.weaponCategory === categoryValue
    );
  }

  /**
   * Check if actor has equipped item of given type.
   *
   * EQUIPPED_ITEM_TYPE values: armor, shield, equipment, accessory, etc.
   * Checks actor.items for items where:
   * - type === typeValue
   * - system.equipped === true
   *
   * @private
   * @param {Object} actor
   * @param {string} typeValue
   * @returns {boolean}
   */
  static _hasEquippedItemType(actor, typeValue) {
    if (!actor?.items || typeof typeValue !== "string") {
      return false;
    }

    return actor.items.some(i =>
      i.type === typeValue && i.system?.equipped === true
    );
  }

  /**
   * Check if actor has flag set.
   *
   * ACTOR_FLAG values: custom string identifiers
   * Checks actor.flags.swse[flagName] for truthy value
   *
   * Examples:
   * - "isForceUser" → checks actor.flags.swse.isForceUser
   * - "inCombat" → checks actor.flags.swse.inCombat
   *
   * @private
   * @param {Object} actor
   * @param {string} flagName
   * @returns {boolean}
   */
  static _checkActorFlag(actor, flagName) {
    if (typeof flagName !== "string") {
      return false;
    }

    return !!actor?.flags?.swse?.[flagName];
  }

  /**
   * Check if actor has skill (trained or otherwise).
   *
   * SKILL_CONTEXT values: skill key (acrobatics, piloting, etc.)
   * Checks actor.system.skills[skillKey] exists and is truthy
   *
   * This is a simple existence check; to check TRAINING state,
   * would need separate condition type (not in Phase 2).
   *
   * @private
   * @param {Object} actor
   * @param {string} skillKey
   * @returns {boolean}
   */
  static _checkSkillContext(actor, skillKey) {
    if (typeof skillKey !== "string") {
      return false;
    }

    return !!actor?.system?.skills?.[skillKey];
  }
}

export default ConditionEvaluator;
