/**
 * Progression & Leveling Rules Adapter
 *
 * Canonical access point for Progression/Leveling family rules.
 * All progression family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3E MIGRATION: Progression family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class ProgressionRules {
  /**
   * Ability Score & Advancement Rules
   */

  static getAbilityScoreMethod() {
    return HouseRuleService.getString('abilityScoreMethod', '4d6drop');
  }

  static getAbilityIncreaseMethod() {
    return HouseRuleService.getString('abilityIncreaseMethod', 'flexible');
  }

  /**
   * HP Generation Rules
   */

  static getHPGeneration() {
    return HouseRuleService.getString('hpGeneration', 'average');
  }

  static getMaxHPLevels() {
    return HouseRuleService.getNumber('maxHPLevels', 1);
  }

  /**
   * Multiclass Policy Rules
   */

  static isMulticlassEnhancedEnabled() {
    return HouseRuleService.getBoolean('multiclassEnhancedEnabled', false);
  }

  static multiclassRetrainingEnabled() {
    return HouseRuleService.getBoolean('multiclassRetraining', false);
  }

  static multiclassExtraStartingFeatsEnabled() {
    return HouseRuleService.getBoolean('multiclassExtraStartingFeats', false);
  }

  static multiclassBonusSkillDeltaEnabled() {
    return HouseRuleService.getBoolean('multiclassBonusSkillDelta', false);
  }

  static getMulticlassBonusChoice() {
    return HouseRuleService.getString('multiclassBonusChoice', 'single_feat');
  }

  /**
   * Talent Access & Configuration Rules
   */

  static getTalentTreeRestriction() {
    return HouseRuleService.getString('talentTreeRestriction', 'current');
  }

  static groupDeflectBlockEnabled() {
    return HouseRuleService.getBoolean('groupDeflectBlock', false);
  }

  static getBlockDeflectTalents() {
    return HouseRuleService.getString('blockDeflectTalents', 'separate');
  }

  /**
   * Droid Construction Rules
   */

  static droidOverflowEnabled() {
    return HouseRuleService.getBoolean('allowDroidOverflow', false);
  }

  static getDroidConstructionCredits() {
    return HouseRuleService.getNumber('droidConstructionCredits', 1000);
  }

  /**
   * Character Creation Access Rules
   */

  static allowPlayersNonheroic() {
    return HouseRuleService.getBoolean('allowPlayersNonheroic', false);
  }

  /**
   * Force Suite Reselection Rule
   */

  static suiteReselectionAllowed() {
    return HouseRuleService.getBoolean('allowSuiteReselection', false);
  }
}
