/**
 * BAB Calculator — Derived Layer
 *
 * Base Attack Bonus calculation from class levels.
 * Async (loads class data), but called from prepareDerivedData (after mutation).
 *
 * Formula: Sum of BAB from each class at its current level.
 */

import { swseLogger } from '../../utils/logger.js';

export class BABCalculator {
  /**
   * Calculate total BAB from class levels.
   * Async (loads compendium data), but only called during recalculation, not mutation.
   *
   * @param {Array} classLevels - from actor.system.progression.classLevels
   * @returns {Promise<number>} total BAB
   */
  static async calculate(classLevels) {
    if (!classLevels || classLevels.length === 0) {
      return 0;
    }

    // Lazy-load only when calculating, not at boot time
    const { getClassData } = await import('../../progression/utils/class-data-loader.js');

    let totalBAB = 0;

    for (const classLevel of classLevels) {
      const classData = await getClassData(classLevel.class);

      if (!classData) {
        swseLogger.warn(`BABCalculator: Unknown class "${classLevel.class}", skipping`);
        continue;
      }

      const rawData = classData._raw;
      const levelProgression = rawData?.level_progression || [];
      const levelsInClass = classLevel.level || 1;

      if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
        const finalLevelData = levelProgression[levelsInClass - 1];
        totalBAB += finalLevelData.bab || 0;
      }
    }

    return totalBAB;
  }
}
