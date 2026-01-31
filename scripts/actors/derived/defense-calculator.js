/**
 * Defense Calculator — Derived Layer
 *
 * Calculates Fortitude, Reflex, and Will defense bonuses.
 * Async (loads class data), but called from prepareDerivedData (after mutation).
 *
 * Formula (SWSE): Defense = 10 + heroic level + class bonus + ability mod
 * Where class bonus = highest bonus from all classes.
 */

import { swseLogger } from '../../utils/logger.js';

export class DefenseCalculator {
  /**
   * Calculate defense bonuses for all three defense types.
   * Async, but called during recalculation, not mutation.
   *
   * @param {Actor} actor - for ability modifier access
   * @param {Array} classLevels - from actor.system.progression.classLevels
   * @returns {Promise<Object>} { fortitude, reflex, will }
   */
  static async calculate(actor, classLevels) {
    const abilities = actor.system.attributes || {};

    // Get ability modifiers
    const strMod = abilities.str?.mod || 0;
    const dexMod = abilities.dex?.mod || 0;
    const conMod = abilities.con?.mod || 0;
    const wisMod = abilities.wis?.mod || 0;

    // Calculate class bonuses (highest from all classes)
    const fortBonus = await this._getSaveBonus(classLevels, 'fort');
    const refBonus = await this._getSaveBonus(classLevels, 'ref');
    const willBonus = await this._getSaveBonus(classLevels, 'will');

    // Fortitude uses STR or CON (whichever is higher) for living, STR only for droids
    const isDroidActor = actor.system.isDroid || false;
    const fortAbility = isDroidActor ? strMod : Math.max(strMod, conMod);

    return {
      fortitude: {
        class: fortBonus,
        ability: fortAbility
      },
      reflex: {
        class: refBonus,
        ability: dexMod
      },
      will: {
        class: willBonus,
        ability: wisMod
      }
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
