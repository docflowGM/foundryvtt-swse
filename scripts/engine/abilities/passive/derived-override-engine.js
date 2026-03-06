/**
 * PASSIVE Phase 3 - DerivedOverrideEngine
 *
 * Applies derived stat overrides to calculated values.
 * Overrides modify derived calculations in a structured, deterministic way.
 *
 * PHASE 3 CONSTRAINT: ADD-only operations.
 * No structural replacement, no formula changes.
 * Overrides augment calculated values, they don't replace calculation logic.
 *
 * Integration point: After calculators run, before final persistence.
 *
 * Example override:
 * {
 *   target: "defense.reflex",
 *   operation: "ADD",
 *   value: { type: "ABILITY_MOD", ability: "cha" },
 *   conditions: [{ type: "WEAPON_CATEGORY", value: "LIGHTSABER" }]
 * }
 *
 * This adds Charisma modifier to Reflex Defense (if conditions met).
 */

import { ConditionEvaluator } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/condition-evaluator.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class DerivedOverrideEngine {
  /**
   * Whitelist of valid derived override targets.
   * No dynamic resolution - targets must be explicitly enumerated.
   * Prevents typos and schema corruption via silent path creation.
   *
   * @private
   * @type {Set<string>}
   */
  static #VALID_TARGETS = new Set([
    // Defense targets
    'defense.reflex',
    'defense.fortitude',
    'defense.will',
    // HP targets
    'hp.max',
    'hp.total',
    // BAB targets
    'bab.total',
    'bab',
    // Initiative targets
    'initiative.total',
    'initiative',
    // Speed targets
    'speed.base',
    'speed',
    'speed.total'
  ]);

  /**
   * Apply all derived overrides to calculated values.
   * Modifies values in-place in the updates object.
   *
   * @param {Object} actor - The actor
   * @param {Array<Object>} overrides - Override definitions
   * @param {Object} updates - Update object with calculated values (keys like 'system.derived.hp.total')
   * @returns {Object} Same updates object (modified in-place)
   */
  static apply(actor, overrides = [], updates = {}) {
    if (!Array.isArray(overrides) || overrides.length === 0) {
      return updates; // No overrides to apply
    }

    for (const override of overrides) {
      try {
        // Skip if conditions not met
        if (override.conditions?.length) {
          if (!ConditionEvaluator.evaluateAll(actor, override.conditions)) {
            continue; // Conditions not satisfied, skip this override
          }
        }

        // Validate operation (Phase 3: ADD only)
        if (override.operation !== 'ADD') {
          swseLogger.warn(
            `[DerivedOverrideEngine] Phase 3 only supports ADD. Got ${override.operation} on ${override.target}`
          );
          continue;
        }

        // Compute the value to add
        const computedValue = this._computeValue(actor, override.value);

        // Apply to target
        this._applyToTarget(updates, override.target, computedValue);

        swseLogger.debug(
          `[DerivedOverrideEngine] Applied override to ${override.target}: +${computedValue}`
        );
      } catch (err) {
        swseLogger.error(
          `[DerivedOverrideEngine] Error applying override to ${override.target}:`,
          err
        );
      }
    }

    return updates;
  }

  /**
   * Compute the value to add based on value specification.
   *
   * @private
   * @param {Object} actor - The actor
   * @param {Object} valueSpec - Value specification {type, ability?, amount?}
   * @returns {number}
   */
  static _computeValue(actor, valueSpec) {
    if (!valueSpec || typeof valueSpec !== 'object') {
      return 0;
    }

    switch (valueSpec.type) {
      case 'ABILITY_MOD':
        return this._getAbilityMod(actor, valueSpec.ability);

      case 'HALF_LEVEL':
        return this._getHalfLevel(actor);

      case 'STATIC':
        return typeof valueSpec.amount === 'number' ? valueSpec.amount : 0;

      default:
        swseLogger.warn(
          `[DerivedOverrideEngine] Unknown value type: ${valueSpec.type}`
        );
        return 0;
    }
  }

  /**
   * Get ability modifier for an ability.
   *
   * @private
   * @param {Object} actor
   * @param {string} abilityKey - Ability key (str, dex, con, int, wis, cha)
   * @returns {number}
   */
  static _getAbilityMod(actor, abilityKey) {
    if (typeof abilityKey !== 'string') {
      return 0;
    }

    // Try derived first (more accurate)
    const derivedMod = actor?.system?.derived?.attributes?.[abilityKey]?.mod;
    if (typeof derivedMod === 'number') {
      return derivedMod;
    }

    // Fallback to base ability calculation
    const ability = actor?.system?.attributes?.[abilityKey];
    if (ability && typeof ability === 'object') {
      const total = (ability.base || 10) + (ability.racial || 0) + (ability.enhancement || 0) + (ability.temp || 0);
      return Math.floor((total - 10) / 2);
    }

    return 0;
  }

  /**
   * Get half level (rounded down).
   *
   * @private
   * @param {Object} actor
   * @returns {number}
   */
  static _getHalfLevel(actor) {
    const level = actor?.system?.level || 1;
    return Math.floor(level / 2);
  }

  /**
   * Apply a computed value to a target path in updates.
   * Handles both defense paths and other derived paths.
   * Throws on invalid targets (no silent path creation).
   *
   * Supported targets:
   * - "defense.reflex", "defense.fortitude", "defense.will"
   * - "hp.max", "hp.total"
   * - "bab.total", "bab"
   * - "initiative.total", "initiative"
   * - "speed.base", "speed", "speed.total"
   *
   * @private
   * @param {Object} updates - Update object to modify
   * @param {string} target - Target path (must be one of supported types)
   * @param {number} value - Value to add
   * @throws {Error} If target is not supported
   */
  static _applyToTarget(updates, target, value) {
    if (typeof value !== 'number' || value === 0) {
      return; // No change
    }

    // Whitelist validation: fail fast on invalid targets
    if (!this.#VALID_TARGETS.has(target)) {
      throw new Error(
        `[DerivedOverrideEngine] Invalid derived override target: ${target}. ` +
        `Supported targets: ${Array.from(this.#VALID_TARGETS).sort().join(', ')}`
      );
    }

    // Defense targets: defense.reflex, defense.fortitude, defense.will
    if (target.startsWith('defense.')) {
      const defenseType = target.replace('defense.', '');
      const updateKey = `system.derived.defenses.${defenseType}.total`;
      const current = updates[updateKey] ?? 10;
      updates[updateKey] = current + value;
      return;
    }

    // HP target: hp.max, hp.total
    if (target === 'hp.max' || target === 'hp.total') {
      const updateKey = 'system.derived.hp.total';
      const current = updates[updateKey] ?? 1;
      updates[updateKey] = Math.max(1, current + value);
      return;
    }

    // BAB target: bab.total, bab
    if (target === 'bab.total' || target === 'bab') {
      const updateKey = 'system.derived.bab';
      const current = updates[updateKey] ?? 0;
      updates[updateKey] = current + value;
      return;
    }

    // Initiative target: initiative.total, initiative
    if (target === 'initiative.total' || target === 'initiative') {
      const updateKey = 'system.derived.initiative.total';
      const current = updates[updateKey] ?? 0;
      updates[updateKey] = current + value;
      return;
    }

    // Speed target: speed.base, speed, speed.total
    if (target === 'speed.base' || target === 'speed' || target === 'speed.total') {
      const updateKey = 'system.derived.speed.total';
      const current = updates[updateKey] ?? 0;
      updates[updateKey] = Math.max(0, current + value);
      return;
    }

    // Unreachable: whitelist validation above catches all invalid targets
    throw new Error(
      `[DerivedOverrideEngine] Unhandled target (should be caught by whitelist): ${target}`
    );
  }

  /**
   * Collect all DERIVED_OVERRIDE definitions from passive abilities.
   * Returns structured override objects ready for apply().
   *
   * @param {Object} actor
   * @returns {Array<Object>} Array of override definitions
   */
  static collectOverrides(actor) {
    const overrides = [];

    try {
      const items = actor?.items ?? [];
      for (const item of items) {
        // Only process PASSIVE DERIVED_OVERRIDE abilities
        if (item.type !== 'feat' && item.type !== 'talent') continue;
        if (item.system?.executionModel !== 'PASSIVE') continue;
        if (item.system?.subType !== 'DERIVED_OVERRIDE') continue;

        const meta = item.system?.abilityMeta;
        if (!meta?.overrides || !Array.isArray(meta.overrides)) continue;

        overrides.push(...meta.overrides);
      }

      if (overrides.length > 0) {
        swseLogger.debug(
          `[DerivedOverrideEngine] Collected ${overrides.length} derived overrides for ${actor.name}`
        );
      }

      return overrides;
    } catch (err) {
      swseLogger.error(
        `[DerivedOverrideEngine] Error collecting overrides for ${actor?.name}:`,
        err
      );
      return [];
    }
  }
}

export default DerivedOverrideEngine;
