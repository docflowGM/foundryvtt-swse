/**
 * Healing & Recovery Rules Adapter
 *
 * Canonical access point for healing and recovery house rules.
 * All healing/recovery family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3B MIGRATION: Second family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class HealingRules {
  /**
   * Recovery Rules — HP and Vitality recovery during rest
   */

  static recoveryEnabled() {
    return HouseRuleService.getBoolean('recoveryEnabled', false);
  }

  static getRecoveryHPType() {
    return HouseRuleService.getString('recoveryHPType', 'standard');
  }

  static getCustomRecoveryHP() {
    return HouseRuleService.getNumber('customRecoveryHP', 0);
  }

  static recoveryVitalityEnabled() {
    return HouseRuleService.getBoolean('recoveryVitality', false);
  }

  static getRecoveryVitalityAmount() {
    return HouseRuleService.getNumber('recoveryVitalityAmount', 5);
  }

  static getRecoveryTiming() {
    return HouseRuleService.getString('recoveryTiming', 'afterRest');
  }

  static recoveryRequiresFullRest() {
    return HouseRuleService.getBoolean('recoveryRequiresFullRest', true);
  }

  /**
   * Healing Skill Rules — Treat Injury skill-based healing actions
   */

  static healingSkillEnabled() {
    return HouseRuleService.getBoolean('healingSkillEnabled', false);
  }

  /**
   * First Aid Rules — DC 15, Full-Round Action
   */

  static firstAidEnabled() {
    return HouseRuleService.getBoolean('firstAidEnabled', true);
  }

  static getFirstAidHealingType() {
    return HouseRuleService.getString('firstAidHealingType', 'levelPlusDC');
  }

  static getFirstAidFixedAmount() {
    return HouseRuleService.getNumber('firstAidFixedAmount', 10);
  }

  /**
   * Long-Term Care Rules — 8-hour continuous care
   */

  static longTermCareEnabled() {
    return HouseRuleService.getBoolean('longTermCareEnabled', true);
  }

  static getLongTermCareHealing() {
    return HouseRuleService.getString('longTermCareHealing', 'characterLevel');
  }

  static getLongTermCareFixedAmount() {
    return HouseRuleService.getNumber('longTermCareFixedAmount', 5);
  }

  static getLongTermCareMultipleTargets() {
    return HouseRuleService.getNumber('longTermCareMultipleTargets', 1);
  }

  /**
   * Surgery Rules — Requires Surgery Kit, DC 20
   */

  static performSurgeryEnabled() {
    return HouseRuleService.getBoolean('performSurgeryEnabled', true);
  }

  static getPerformSurgeryHealing() {
    return HouseRuleService.getString('performSurgeryHealing', 'conBonus');
  }

  static getPerformSurgeryFixedAmount() {
    return HouseRuleService.getNumber('performSurgeryFixedAmount', 20);
  }

  static surgeryFailureDamageEnabled() {
    return HouseRuleService.getBoolean('surgeryFailureDamage', true);
  }

  /**
   * Revivify Rules — Resurrection spell application
   */

  static revivifyEnabled() {
    return HouseRuleService.getBoolean('revivifyEnabled', true);
  }

  /**
   * Critical Care Rules — Advanced healing after stabilization
   */

  static criticalCareEnabled() {
    return HouseRuleService.getBoolean('criticalCareEnabled', false);
  }

  static getCriticalCareHealing() {
    return HouseRuleService.getString('criticalCareHealing', 'levelPlusDC');
  }

  static getCriticalCareFixedAmount() {
    return HouseRuleService.getNumber('criticalCareFixedAmount', 15);
  }
}
