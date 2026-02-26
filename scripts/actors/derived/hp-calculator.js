/**
 * HP Calculator — Derived Layer
 *
 * Pure calculation of max HP from class levels.
 * No side effects, no async, no actor mutations.
 *
 * Formula (SWSE Core Rulebook):
 * - First level: 3x hit die + CON mod
 * - All other levels: (hit die / 2 + 1) + CON mod
 *
 * NONHEROIC CHARACTERS:
 * - Nonheroic classes use hit die = 4 (1d4)
 * - First level: 3 * 4 + CON = 12 + CON mod
 * - Other levels: 2 + 1 + CON = 3 + CON mod (floor(4/2) + 1)
 * - HP pools for heroic and nonheroic stack additively
 *
 * DROID EXCEPTION:
 * - Droids do NOT gain CON modifier to HP (mechanical construction, not biological)
 * - Droids still gain standard hit die rolls from their class levels
 * - isDroid flag controls CON mod inclusion (see line 31)
 */

import { PROGRESSION_RULES } from "/systems/foundryvtt-swse/scripts/engine/progression/data/progression-data.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

export class HPCalculator {
  /**
   * Calculate max HP from class levels.
   * Synchronous, pure function.
   *
   * Phase 0: Accepts modifier adjustments from ModifierEngine
   *
   * Handles both heroic and nonheroic classes:
   * - Heroic: uses class-defined hit die from PROGRESSION_RULES
   * - Nonheroic: uses hit die = 4 (1d4)
   * - HP pools stack additively
   *
   * @param {Actor} actor - for isDroid, CON mod access
   * @param {Array} classLevels - from actor.system.progression.classLevels
   * @param {Object} options - { adjustment: number } modifier adjustments
   * @returns {Object} { base, max, value, adjustment }
   */
  static calculate(actor, classLevels, options = {}) {
    if (!classLevels || classLevels.length === 0) {
      return { base: 1, max: 1, value: 1, adjustment: 0 };
    }

    let maxHP = 0;
    const isDroid = actor.system.isDroid || false;
    // Read from derived attributes (computed in DerivedCalculator) - SOVEREIGNTY: single authority
    const conMod = isDroid ? 0 : (actor.system.derived?.attributes?.con?.mod || 0);
    let isFirstLevel = true;

    for (const classLevel of classLevels) {
      // Lookup from hardcoded data (should be precompiled for core classes)
      const classData = PROGRESSION_RULES.classes?.[classLevel.class];

      if (!classData) {
        swseLogger.warn(`HPCalculator: Unknown class "${classLevel.class}", assuming hitDie=6`);
      }

      // Determine hit die: nonheroic uses d4, heroic uses class-defined die
      const isNonheroic = classData?.isNonheroic === true;
      const hitDie = isNonheroic ? 4 : (classData?.hitDie || 6);

      // First level: 3x max hit die + CON mod
      if (isFirstLevel) {
        maxHP += (hitDie * 3) + conMod;
        isFirstLevel = false;
      } else {
        // All other levels: average (hit die / 2 + 1) + CON mod
        const avgRoll = Math.floor(hitDie / 2) + 1;
        maxHP += avgRoll + conMod;
      }
    }

    const baseHP = Math.max(1, maxHP);
    const adjustment = options?.adjustment || 0;
    const finalHP = Math.max(1, baseHP + adjustment);

    return {
      base: baseHP,
      max: finalHP,
      value: finalHP,
      adjustment
    };
  }
}
