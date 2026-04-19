/**
 * Talent Cadence Engine - PHASE 2
 *
 * SINGLE AUTHORITATIVE SOURCE for talent progression rules.
 * Used by both chargen (slot calculation) and levelup (talent grants).
 *
 * Supports:
 * - RAW rule: 1 talent at odd levels (1, 3, 5, 7, ...)
 * - House rule: talentEveryLevel - talents at every level
 * - House rule: talentEveryLevelExtraL1 - extra talent at level 1
 *
 * CRITICAL: This replaces the scattered talent cadence logic that was
 * previously split between chargen and levelup, causing inconsistent
 * progression calculations.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatRulesAdapter } from "/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js";

export class TalentCadenceEngine {
  /**
   * Get house rule settings for talent progression
   * CANONICAL: Only place to read talent house rules (PHASE 3A: routed through FeatRulesAdapter)
   * @returns {Object} {talentEveryLevel: boolean, talentEveryLevelExtraL1: boolean}
   */
  static getHouseRuleSettings() {
    return {
      talentEveryLevel: FeatRulesAdapter.talentEveryLevelEnabled(),
      talentEveryLevelExtraL1: FeatRulesAdapter.talentExtraAtLevel1()
    };
  }

  /**
   * Calculate if a given absolute character level grants a talent
   * CANONICAL: Authoritative for all talent progression calculations
   *
   * RAW: Talents at odd levels (1, 3, 5, 7, ...)
   * House rule (talentEveryLevel): Talents at every level (1, 2, 3, 4, ...)
   *
   * @param {number} level - Absolute level (must be >= 1)
   * @returns {boolean} true if this level grants a talent
   */
  static grantsHeroicTalent(level) {
    if (!level || level < 1) {
      return false;
    }

    const settings = this.getHouseRuleSettings();

    if (settings.talentEveryLevel) {
      // House rule: talent every level
      return true;
    }

    // RAW: talent at odd levels
    return level % 2 === 1;
  }

  /**
   * Calculate number of talents from class progression at a specific class level
   * CANONICAL: Authoritative for class talent grants
   *
   * RAW: 1 talent at odd class levels (1, 3, 5, 7, ...)
   * House rule (talentEveryLevel): 1 talent at every class level (1, 2, 3, 4, ...)
   *
   * NOTE: Nonheroic classes do not grant talents
   *
   * @param {number} classLevel - Class level (must be >= 1)
   * @param {boolean} isNonheroic - If true, return 0 (nonheroic classes don't grant talents)
   * @returns {number} 0 or 1
   */
  static grantsClassTalent(classLevel, isNonheroic = false) {
    if (isNonheroic || !classLevel || classLevel < 1) {
      return 0;
    }

    const settings = this.getHouseRuleSettings();

    if (settings.talentEveryLevel) {
      // House rule: talent every class level
      return 1;
    }

    // RAW: talent at odd class levels
    return (classLevel % 2 === 1) ? 1 : 0;
  }

  /**
   * Calculate total talent grants at a given heroic level (for dual progression)
   * Combines heroic progression + class progression
   *
   * @param {number} heroicLevel - The character's heroic (total) level
   * @param {Object} selectedClass - The class being leveled (with system.isNonheroic)
   * @param {number} classLevel - The level of that specific class (before +1 for new level)
   * @returns {Object} {heroic: 0|1, class: 0|1, total: 0|1|2}
   */
  static calculateTalentGrants(heroicLevel, selectedClass = null, classLevel = 0) {
    const heroic = this.grantsHeroicTalent(heroicLevel) ? 1 : 0;
    const classIsNonheroic = selectedClass?.system?.isNonheroic ?? false;
    const classLevel_NextLevel = (classLevel || 0) + 1; // +1 for pending level
    const classTalent = this.grantsClassTalent(classLevel_NextLevel, classIsNonheroic);

    return {
      heroic,
      class: classTalent,
      total: heroic + classTalent
    };
  }

  /**
   * Calculate number of talents for level 1 chargen
   * Used by TalentSlotCalculator to build initial talent slots
   *
   * RAW: 1 class talent (and NO extra at L1)
   * House rule (talentEveryLevel + talentEveryLevelExtraL1): 2 talents (1 class + 1 heroic)
   * House rule (talentEveryLevel only): 1 talent (class only, no extra at L1)
   *
   * @returns {number} Number of talents for L1 chargen (1 or 2)
   */
  static calculateL1TalentCount() {
    const settings = this.getHouseRuleSettings();

    // RAW: always 1 at L1
    if (!settings.talentEveryLevel) {
      return 1;
    }

    // House rule: talentEveryLevel
    // If talentEveryLevelExtraL1, grant 2 (1 class + 1 heroic)
    // Otherwise, grant 1 (class only, no extra)
    return settings.talentEveryLevelExtraL1 ? 2 : 1;
  }

  /**
   * Calculate talentsRequired flag for chargen (used for display/validation)
   * This is a simplification for L1-only UI purposes
   *
   * NOTE: This should NOT be used for future level calculations.
   * Use calculateTalentGrants() instead for multiclass scenarios.
   *
   * @returns {number} 1 or 2
   */
  static calculateChargenTalentsRequired() {
    return this.calculateL1TalentCount();
  }

  /**
   * Get a human-readable description of talent cadence
   * @returns {string}
   */
  static getDescription() {
    const settings = this.getHouseRuleSettings();
    let desc = 'Talents at odd levels (1, 3, 5, 7, ...)';

    if (settings.talentEveryLevel) {
      desc = 'Talents at every level (1, 2, 3, 4, ...)';
      if (settings.talentEveryLevelExtraL1) {
        desc += ' + extra at level 1';
      }
    }

    return desc;
  }
}

export default TalentCadenceEngine;
