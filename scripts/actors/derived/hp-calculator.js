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
 * DROID EXCEPTION:
 * - Droids do NOT gain CON modifier to HP (mechanical construction, not biological)
 * - Droids still gain standard hit die rolls from their class levels
 * - isDroid flag controls CON mod inclusion (see line 31)
 */

import { PROGRESSION_RULES } from '../../progression/data/progression-data.js';
import { swseLogger } from '../../utils/logger.js';

export class HPCalculator {
  /**
   * Calculate max HP from class levels.
   * Synchronous, pure function.
   *
   * Phase 0: Accepts modifier adjustments from ModifierEngine
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
    const conMod = isDroid ? 0 : (actor.system.attributes?.con?.mod || 0);
    let isFirstLevel = true;

    for (const classLevel of classLevels) {
      // Lookup from hardcoded data (should be precompiled for core classes)
      const classData = PROGRESSION_RULES.classes?.[classLevel.class];

      if (!classData) {
        swseLogger.warn(`HPCalculator: Unknown class "${classLevel.class}", assuming hitDie=6`);
      }

      const hitDie = classData?.hitDie || 6;

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
