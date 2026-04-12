/**
 * Defense Calculator — Derived Layer (HARDENED)
 *
 * Calculates Fortitude, Reflex, and Will defense bonuses.
 * PHASE 4: Includes PASSIVE/STATE predicate evaluation
 *
 * Formula (SWSE):
 *   Defense = 10 + heroic level + class bonus + ability mod + [state modifiers]
 *
 * NONHEROIC:
 *   Only heroic levels contribute.
 *
 * DROID EXCEPTION:
 *   Fortitude = STR only
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { getClassData } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js"; // STATIC import (no dynamic)
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";

export class DefenseCalculator {

  /**
   * Calculate defense bonuses.
   * PHASE 4: Includes state-dependent modifiers
   *
   * @param {Actor} actor
   * @param {Array} classLevels
   * @param {Object} options
   * @param {Object} context - Optional context for state predicates (attackType, attacker, etc.)
   */
  static async calculate(actor, classLevels = [], options = {}, context = {}) {

    if (!actor?.system) {
      swseLogger.error('DefenseCalculator: Invalid actor provided');
      return this._emptyResult();
    }

    const derivedAttrs = actor.system.derived?.attributes ?? {};

    const strMod = derivedAttrs.str?.mod ?? 0;
    const dexMod = derivedAttrs.dex?.mod ?? 0;
    const conMod = derivedAttrs.con?.mod ?? 0;
    const wisMod = derivedAttrs.wis?.mod ?? 0;

    const heroicLevel = getHeroicLevel(actor) ?? 0;

    const safeClassLevels = Array.isArray(classLevels) ? classLevels : [];

    const [fortBonus, refBonus, willBonus] = await Promise.all([
      this._getSaveBonus(safeClassLevels, 'fort'),
      this._getSaveBonus(safeClassLevels, 'ref'),
      this._getSaveBonus(safeClassLevels, 'will')
    ]);

    const isDroidActor = !!actor.system?.isDroid;
    const fortAbility = isDroidActor ? strMod : conMod;

    const adjustments = options?.adjustments ?? {};
    const fortAdjust = adjustments.fort ?? 0;
    const refAdjust = adjustments.ref ?? 0;
    const willAdjust = adjustments.will ?? 0;

    // PHASE 4: Get state-dependent modifiers
    const fortStateBonus = await this._getStateModifiers(actor, 'fortitude', context);
    const refStateBonus = await this._getStateModifiers(actor, 'reflex', context);
    const willStateBonus = await this._getStateModifiers(actor, 'will', context);

    const calcDefense = (classBonus, abilityMod, adjustment, stateBonus) => {
      const base = 10 + heroicLevel + classBonus + abilityMod;
      const total = Math.max(1, base + adjustment + stateBonus);
      return { base, total, adjustment, stateBonus };
    };

    return {
      fortitude: calcDefense(fortBonus, fortAbility, fortAdjust, fortStateBonus),
      reflex: calcDefense(refBonus, dexMod, refAdjust, refStateBonus),
      will: calcDefense(willBonus, wisMod, willAdjust, willStateBonus)
    };
  }

  /**
   * Get state-dependent modifiers from PASSIVE/STATE abilities.
   * PHASE 4: Evaluates predicates and sums applicable modifiers.
   *
   * @param {Actor} actor
   * @param {string} defenseType - 'fortitude', 'reflex', or 'will'
   * @param {Object} context - Attack context with attackType, etc.
   * @returns {Promise<number>} - Sum of state-dependent modifiers
   */
  static async _getStateModifiers(actor, defenseType, context = {}) {
    try {
      if (!actor?.items) return 0;

      let stateBonus = 0;

      // Check all items for PASSIVE/STATE abilities
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') {
          continue;
        }

        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
          continue;
        }

        // Apply each modifier in the PASSIVE/STATE item
        for (const modifier of meta.modifiers) {
          // Check if this modifier applies to the current defense type
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToDefense = targets.some(t => t === `defense.${defenseType}` || t === 'defense');

          if (!appliesToDefense) continue;

          // Evaluate predicates (all must be true)
          const predicates = modifier.predicates || [];
          const predicatesMatch = evaluateStatePredicates(actor, predicates, context);

          if (predicatesMatch && modifier.value) {
            stateBonus += modifier.value;
          }
        }
      }

      return stateBonus;
    } catch (err) {
      swseLogger.error('DefenseCalculator._getStateModifiers:', err);
      return 0;
    }
  }

  /**
   * Determine highest class defense bonus.
   */
  static async _getSaveBonus(classLevels, saveType) {

    if (!Array.isArray(classLevels) || classLevels.length === 0) {
      return 0;
    }

    const saveKey =
      saveType === 'fort' ? 'fortitude' :
      saveType === 'ref' ? 'reflex' :
      'will';

    const uniqueClasses = [
      ...new Set(
        classLevels
          .map(cl => cl?.class)
          .filter(Boolean)
      )
    ];

    if (uniqueClasses.length === 0) {
      return 0;
    }

    const classDataList = await Promise.all(
      uniqueClasses.map(className => getClassData(className))
    );

    let maxBonus = 0;

    for (let i = 0; i < uniqueClasses.length; i++) {
      const className = uniqueClasses[i];
      const classData = classDataList[i];

      if (!classData) {
        swseLogger.warn(`DefenseCalculator: Unknown class "${className}"`);
        continue;
      }

      const classBonus = classData.defenses?.[saveKey] ?? 0;
      maxBonus = Math.max(maxBonus, classBonus);
    }

    return maxBonus;
  }

  static _emptyResult() {
    return {
      fortitude: { base: 0, total: 0, adjustment: 0 },
      reflex: { base: 0, total: 0, adjustment: 0 },
      will: { base: 0, total: 0, adjustment: 0 }
    };
  }
}