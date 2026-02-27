/**
 * Defense Calculator — Derived Layer (HARDENED)
 *
 * Calculates Fortitude, Reflex, and Will defense bonuses.
 *
 * Formula (SWSE):
 *   Defense = 10 + heroic level + class bonus + ability mod
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

export class DefenseCalculator {

  /**
   * Calculate defense bonuses.
   * @param {Actor} actor
   * @param {Array} classLevels
   * @param {Object} options
   */
  static async calculate(actor, classLevels = [], options = {}) {

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
    const fortAbility = isDroidActor ? strMod : Math.max(strMod, conMod);

    const adjustments = options?.adjustments ?? {};
    const fortAdjust = adjustments.fort ?? 0;
    const refAdjust = adjustments.ref ?? 0;
    const willAdjust = adjustments.will ?? 0;

    const calcDefense = (classBonus, abilityMod, adjustment) => {
      const base = 10 + heroicLevel + classBonus + abilityMod;
      const total = Math.max(1, base + adjustment);
      return { base, total, adjustment };
    };

    return {
      fortitude: calcDefense(fortBonus, fortAbility, fortAdjust),
      reflex: calcDefense(refBonus, dexMod, refAdjust),
      will: calcDefense(willBonus, wisMod, willAdjust)
    };
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