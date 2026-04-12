/**
 * BAB Calculator — Derived Layer
 *
 * Base Attack Bonus calculation from class levels.
 * Async (loads class data), but called from prepareDerivedData (after mutation).
 *
 * Formula: Sum of BAB from each class at its current level.
 *
 * PHASE 10+ CORRECTNESS NOTE — Cumulative Integer BAB:
 * - Class compendium stores cumulative integer BAB at each class level
 * - NO fractional values exist in actual compendium data
 * - Slow/Medium/Fast metadata are class progression rate labels only
 * - Calculator reads levelProgression[level].bab for each class level (cumulative values)
 * - Sums these cumulative values across all classes
 * - Returns raw integer sum (no flooring per-level)
 *
 * Example (Multiclass):
 * - Scout level 5 (medium BAB): cumulative BAB = 3
 * - Soldier level 5 (fast BAB): cumulative BAB = 5
 * - Total BAB = 3 + 5 = 8
 *
 * Prestige Classes:
 * - Must have level_progression data in compendium or hardcoded fallback
 * - If missing, throws error (fail-fast instead of silent skip)
 * - Prestige classes included in BAB sum (not skipped)
 *
 * NONHEROIC CHARACTERS:
 * - Nonheroic classes use SWSE nonheroic BAB progression (not class-based)
 * - Nonheroic BAB: +0, +1, +2, +3, +3, +4, +5, +6, +6, +7, +8, +9, +9, +10, +11, +12, +12, +13, +14, +15 (levels 1-20)
 * - Heroic and nonheroic BAB stack: total BAB = heroic BAB + nonheroic BAB
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

// SWSE Nonheroic BAB Progression (per nonheroic class level)
const NONHEROIC_BAB_PROGRESSION = [
  0,  // Level 1
  1,  // Level 2
  2,  // Level 3
  3,  // Level 4
  3,  // Level 5
  4,  // Level 6
  5,  // Level 7
  6,  // Level 8
  6,  // Level 9
  7,  // Level 10
  8,  // Level 11
  9,  // Level 12
  9,  // Level 13
  10, // Level 14
  11, // Level 15
  12, // Level 16
  12, // Level 17
  13, // Level 18
  14, // Level 19
  15  // Level 20
];

export class BABCalculator {
  /**
   * Calculate total BAB from class levels.
   * Async (loads compendium data), but only called during recalculation, not mutation.
   *
   * Phase 0: Accepts modifier adjustments from ModifierEngine
   *
   * Handles both heroic and nonheroic classes:
   * - Heroic: uses class-based progression from compendium
   * - Nonheroic: uses SWSE nonheroic progression table
   * - Stacking: total BAB = sum of all class BAB values
   *
   * @param {Array} classLevels - from actor.system.progression.classLevels
   * @param {Object} options - { adjustment: number, actor: Actor } modifier adjustments and context
   * @returns {Promise<number>} total BAB (adjusted)
   */
  static async calculate(classLevels, options = {}) {
    if (!classLevels || classLevels.length === 0) {
      return 0;
    }

    // Lazy-load only when calculating, not at boot time
    const { getClassData } = await import("/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js");

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

      const levelsInClass = classLevel.level || 1;

      // Check if this is a nonheroic class
      const isNonheroic = classData.isNonheroic === true;

      if (isNonheroic) {
        // Use SWSE nonheroic BAB progression table
        if (levelsInClass > 0 && levelsInClass <= NONHEROIC_BAB_PROGRESSION.length) {
          totalBAB += NONHEROIC_BAB_PROGRESSION[levelsInClass - 1];
        }
      } else {
        // Use heroic class progression
        const rawData = classData._raw;
        const levelProgression = rawData?.level_progression || [];

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
    }

    // Apply modifier adjustment (Phase 0)
    const adjustment = options?.adjustment || 0;
    return totalBAB + adjustment;
  }
}
