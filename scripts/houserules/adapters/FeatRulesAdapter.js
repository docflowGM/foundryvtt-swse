/**
 * Feat Rules Adapter
 *
 * Canonical access point for feat/talent house rules.
 * All feat-family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3A PILOT: First family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class FeatRulesAdapter {
  /**
   * Combat Feat Defaults — Feats granted automatically to all characters
   */

  static weaponFinesseDefaultEnabled() {
    return HouseRuleService.getBoolean('weaponFinesseDefault', false);
  }

  static pointBlankShotDefaultEnabled() {
    return HouseRuleService.getBoolean('pointBlankShotDefault', false);
  }

  static powerAttackDefaultEnabled() {
    return HouseRuleService.getBoolean('powerAttackDefault', false);
  }

  static preciseShotDefaultEnabled() {
    return HouseRuleService.getBoolean('preciseShotDefault', false);
  }

  static dodgeDefaultEnabled() {
    return HouseRuleService.getBoolean('dodgeDefault', false);
  }

  /**
   * Talent Cadence Rules — How talents are granted as characters level
   */

  static talentEveryLevelEnabled() {
    return HouseRuleService.getBoolean('talentEveryLevel', false);
  }

  static talentExtraAtLevel1() {
    return HouseRuleService.getBoolean('talentEveryLevelExtraL1', true);
  }

  /**
   * Helper: Get all default combat feats that are enabled
   * Used by houserule-feat-grants.js to iterate enabled defaults
   */
  static getEnabledDefaultFeats() {
    return {
      weaponFinesseDefault: this.weaponFinesseDefaultEnabled(),
      pointBlankShotDefault: this.pointBlankShotDefaultEnabled(),
      powerAttackDefault: this.powerAttackDefaultEnabled(),
      preciseShotDefault: this.preciseShotDefaultEnabled(),
      dodgeDefault: this.dodgeDefaultEnabled()
    };
  }
}
