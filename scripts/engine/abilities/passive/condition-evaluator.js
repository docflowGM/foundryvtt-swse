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
      const conditionType = String(condition.type || '').toUpperCase().replace(/[\s-]+/g, '_');
      switch (conditionType) {
        case "WEAPON_CATEGORY":
          return this._hasWeaponCategory(actor, condition.value);

        case "EQUIPPED_ITEM_TYPE":
          return this._hasEquippedItemType(actor, condition.value);

        case "ARMOR_CATEGORY":
          return this._hasArmorCategory(actor, condition.value);

        case "ACTOR_FLAG":
          return this._checkActorFlag(actor, condition.value);

        case "SKILL_CONTEXT":
          return this._checkSkillContext(actor, condition.value);

        case "UNTRAINED_CHECK":
          return this._checkUntrainedCheck(actor, condition.value);

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


  static _normalizeToken(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static _isEnergyShieldArmor(item) {
    const text = [
      item?.name,
      item?.system?.type,
      item?.system?.armorType,
      item?.system?.category,
      item?.system?.subcategory,
      item?.system?.equipmentType
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes('energy shield') || text.includes('shield generator');
  }

  static _equippedArmor(actor) {
    if (!actor?.items) return null;
    return Array.from(actor.items).find(item =>
      item?.type === 'armor'
      && item?.system?.equipped === true
      && !this._isEnergyShieldArmor(item)
    ) ?? null;
  }

  /**
   * Check current equipped armor category.
   *
   * ARMOR_CATEGORY accepts a string or array. Supported useful values are:
   * - none / unarmored / no-armor
   * - light / medium / heavy
   * - none-or-light / light-or-none
   */
  static _hasArmorCategory(actor, categoryValue) {
    const requested = (Array.isArray(categoryValue) ? categoryValue : [categoryValue])
      .flatMap(value => String(value ?? '').split(/[|,]/g))
      .map(value => this._normalizeToken(value))
      .filter(Boolean);
    if (!requested.length) return false;

    const wantsNone = requested.some(value => ['none', 'unarmored', 'no-armor', 'no-armor-equipped', 'none-or-light', 'light-or-none'].includes(value));
    const wantsLight = requested.some(value => ['light', 'light-armor', 'none-or-light', 'light-or-none'].includes(value));
    const armor = this._equippedArmor(actor);

    if (!armor) return wantsNone;

    const system = armor.system || {};
    const text = [
      armor.name,
      system.armorType,
      system.type,
      system.category,
      system.subcategory,
      system.equipmentType
    ].map(value => this._normalizeToken(value)).join(' ');

    if (wantsLight && text.includes('light')) return true;
    if (requested.some(value => ['medium', 'medium-armor'].includes(value)) && text.includes('medium')) return true;
    if (requested.some(value => ['heavy', 'heavy-armor'].includes(value)) && text.includes('heavy')) return true;
    return false;
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

  static _checkUntrainedCheck(actor, value) {
    const raw = typeof value === 'string' ? value : value?.skill || value?.key || value?.id || '';
    if (!raw) return true;
    const key = String(raw).replace(/[\s-]+/g, '').replace(/^knowledge/i, 'knowledge');
    const skills = actor?.system?.skills || {};
    return !!skills[raw] || !!skills[key] || Object.keys(skills).some((candidate) => {
      const normalized = String(candidate).replace(/[\s-]+/g, '').toLowerCase();
      return normalized === String(key).toLowerCase();
    });
  }
}

export default ConditionEvaluator;
