/**
 * Defense Calculator — Derived Layer
 *
 * Calculates Fortitude, Reflex, and Will defense bonuses.
 * Async (loads class data), but called from prepareDerivedData (after mutation).
 *
 * Formula (SWSE): Defense = 10 + heroic level + class bonus + ability mod
 * Where class bonus = highest bonus from all classes.
 *
 * NONHEROIC CHARACTERS:
 * - Nonheroic characters do NOT add their nonheroic level to defense
 * - Only heroic levels count toward defense
 * - Formula: Defense = 10 + heroic_level + class bonus + ability mod
 *
 * DROID EXCEPTION:
 * - Fortitude defense: Uses STR mod only (no CON mod, droids are mechanical)
 * - Reflex defense: Uses DEX mod (same as living creatures)
 * - Will defense: Uses WIS mod (same as living creatures)
 * See line 37-38 for isDroid check and conditional ability mod selection.
 */

import { swseLogger } from '../../utils/logger.js';
import { getHeroicLevel } from './level-split.js';

export class DefenseCalculator {
  /**
   * Calculate defense bonuses for all three defense types.
   * Async, but called during recalculation, not mutation.
   *
   * Phase 0: Accepts modifier adjustments from ModifierEngine
   *
   * Only heroic levels are added to defense calculations.
   * Nonheroic levels do NOT contribute to defense.
   *
   * @param {Actor} actor - for ability modifier access
   * @param {Array} classLevels - from actor.system.progression.classLevels
   * @param {Object} options - { adjustments: {fort, ref, will} } modifier adjustments
   * @returns {Promise<Object>} { fortitude, reflex, will }
   */
  static async calculate(actor, classLevels, options = {}) {
    // Read derived attributes (computed in DerivedCalculator)
    const derivedAttrs = actor.system.derived?.attributes || {};

    // Get ability modifiers from derived layer (SOVEREIGNTY: single authority)
    const strMod = derivedAttrs.str?.mod || 0;
    const dexMod = derivedAttrs.dex?.mod || 0;
    const conMod = derivedAttrs.con?.mod || 0;
    const wisMod = derivedAttrs.wis?.mod || 0;

    // Get heroic level only (nonheroic does NOT add to defense)
    const heroicLevel = getHeroicLevel(actor);

    // Calculate class bonuses (highest from all classes)
    const fortBonus = await this._getSaveBonus(classLevels, 'fort');
    const refBonus = await this._getSaveBonus(classLevels, 'ref');
    const willBonus = await this._getSaveBonus(classLevels, 'will');

    // Fortitude uses STR or CON (whichever is higher) for living, STR only for droids
    const isDroidActor = actor.system.isDroid || false;
    const fortAbility = isDroidActor ? strMod : Math.max(strMod, conMod);

    // Get modifier adjustments (Phase 0)
    const adjustments = options?.adjustments || {};
    const fortAdjust = adjustments.fort || 0;
    const refAdjust = adjustments.ref || 0;
    const willAdjust = adjustments.will || 0;

    // Calculate base and total for each defense
    // Formula: 10 + heroic_level + class_bonus + ability_mod
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
   * Get the highest save bonus a character gets from their classes.
   * @private
   */
  static async _getSaveBonus(classLevels, saveType) {
    const { getClassData } = await import('../../progression/utils/class-data-loader.js');

    let maxBonus = 0;
    const uniqueClasses = new Set(classLevels.map(cl => cl.class));

    for (const className of uniqueClasses) {
      const classData = await getClassData(className);

      if (!classData) {
        swseLogger.warn(`DefenseCalculator: Unknown class "${className}", skipping`);
        continue;
      }

      const saveKey =
        saveType === 'fort' ? 'fortitude' :
        saveType === 'ref' ? 'reflex' :
        'will';

      const classBonus = classData.defenses?.[saveKey] || 0;
      maxBonus = Math.max(maxBonus, classBonus);
    }

    return maxBonus;
  }
}
