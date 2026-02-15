/**
 * BAB Calculator — Derived Layer
 *
 * Base Attack Bonus calculation from class levels.
 * Async (loads class data), but called from prepareDerivedData (after mutation).
 *
 * Formula: Sum of BAB from each class at its current level.
 *
 * CRITICAL CORRECTNESS NOTE — Fractional BAB:
 * - Some classes have fractional BAB progression (e.g., 0.75 per level)
 * - SWSE rules: Accumulate all fractional BAB, then floor ONCE at the end
 * - WRONG: floor(0.75) + floor(0.75) + floor(0.75) = 0 + 0 + 0 = 0
 * - RIGHT: floor(0.75 + 0.75 + 0.75) = floor(2.25) = 2
 *
 * This calculator implements the RIGHT behavior:
 * - Accumulates all BAB values (fractional included)
 * - Returns raw sum (no flooring)
 * - Flooring happens at point-of-use if needed
 *
 * Prestige Classes:
 * - Must have level_progression data in compendium or hardcoded fallback
 * - If missing, throws error (fail-fast instead of silent skip)
 */

import { swseLogger } from '../../utils/logger.js';

export class BABCalculator {
  /**
   * Calculate total BAB from class levels.
   * Async (loads compendium data), but only called during recalculation, not mutation.
   *
   * Phase 0: Accepts modifier adjustments from ModifierEngine
   *
   * @param {Array} classLevels - from actor.system.progression.classLevels
   * @param {Object} options - { adjustment: number } modifier adjustments
   * @returns {Promise<number>} total BAB (adjusted)
   */
  static async calculate(classLevels, options = {}) {
    if (!classLevels || classLevels.length === 0) {
      return 0;
    }

    // Lazy-load only when calculating, not at boot time
    const { getClassData } = await import('../../progression/utils/class-data-loader.js');

    let totalBAB = 0;

    for (const classLevel of classLevels) {
      const classData = await getClassData(classLevel.class);

      // CRITICAL: Class data must exist. If missing, it's a configuration error, not a silent skip.
      if (!classData) {
        throw new Error(
          `BABCalculator: Unknown class "${classLevel.class}". ` +
          `Verify class exists in compendium or hardcoded progression data.`
        );
      }

      const rawData = classData._raw;
      const levelProgression = rawData?.level_progression || [];
      const levelsInClass = classLevel.level || 1;

      // Verify level progression data exists (fail-fast on config errors)
      if (!levelProgression || levelProgression.length === 0) {
        throw new Error(
          `BABCalculator: Class "${classLevel.class}" has no level_progression data. ` +
          `Verify class definition includes level progression.`
        );
      }

      if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
        const finalLevelData = levelProgression[levelsInClass - 1];
        totalBAB += finalLevelData.bab || 0;
      }
    }

    // Apply modifier adjustment (Phase 0)
    const adjustment = options?.adjustment || 0;
    return totalBAB + adjustment;
  }
}
