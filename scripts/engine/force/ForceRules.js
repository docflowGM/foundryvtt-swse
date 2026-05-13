/**
 * Force & Dark Side Rules Adapter
 *
 * Canonical access point for Force family rules.
 * All force/dark-side family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3D MIGRATION: Force family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class ForceRules {
  /**
   * Force Sensitivity & Training Rules
   */

  static getTrainingAttribute() {
    return HouseRuleService.getString('forceTrainingAttribute', 'wisdom');
  }

  static getExecutionAttribute() {
    return HouseRuleService.getString('forceExecutionAttribute', 'charisma');
  }

  static isForceSensitiveJediOnly() {
    return HouseRuleService.getBoolean('forceSensitiveJediOnly', false);
  }

  static allowSuiteReselection() {
    return HouseRuleService.getBoolean('allowSuiteReselection', false);
  }

  /**
   * Block & Deflect Mechanics Rules
   */

  static getBlockDeflectTalents() {
    return HouseRuleService.getString('blockDeflectTalents', 'separate');
  }

  static blockMechanicalAlternative() {
    return HouseRuleService.getBoolean('blockMechanicalAlternative', false);
  }

  static groupDeflectBlock() {
    return HouseRuleService.getBoolean('groupDeflectBlock', false);
  }

  /**
   * Dark Side Mechanics Rules
   */

  static getDarkSideMaxMultiplier() {
    return HouseRuleService.getNumber('darkSideMaxMultiplier', 1);
  }

  static darkSidePowerIncreaseScore() {
    return HouseRuleService.getBoolean('darkSidePowerIncreaseScore', true);
  }

  static getDarkSideTemptationMode() {
    return HouseRuleService.getString('darkSideTemptation', 'strict');
  }

  static darkInspirationEnabled() {
    return HouseRuleService.getBoolean('darkInspirationEnabled', false);
  }

  static enableDarkSideTreeAccess() {
    return HouseRuleService.getBoolean('enableDarkSideTreeAccess', false);
  }

  /**
   * Force Points Rules
   */

  static getForcePointRecovery() {
    return HouseRuleService.getString('forcePointRecovery', 'level');
  }

  static dailyForcePoints() {
    return HouseRuleService.getBoolean('dailyForcePoints', false);
  }
}
