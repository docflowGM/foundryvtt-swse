/**
 * Condition Track & Status Effects Rules Adapter
 *
 * Canonical access point for Condition Track / Status Effects family rules.
 * All condition track and status effects rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3G MIGRATION: Condition Track / Status Effects family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class ConditionTrackRules {
  /**
   * Condition Track Rules
   */

  static conditionTrackEnabled() {
    return HouseRuleService.getBoolean('conditionTrackEnabled', false);
  }

  static getConditionTrackVariant() {
    return HouseRuleService.getString('conditionTrackVariant', 'standard');
  }

  static getConditionTrackStartDamage() {
    return HouseRuleService.getNumber('conditionTrackStartDamage', 0);
  }

  static getConditionTrackProgression() {
    return HouseRuleService.getString('conditionTrackProgression', 'standard');
  }

  static getConditionTrackCap() {
    return HouseRuleService.getNumber('conditionTrackCap', 0);
  }

  static conditionTrackAutoApplyEnabled() {
    return HouseRuleService.getBoolean('conditionTrackAutoApply', false);
  }

  /**
   * Status Effects Rules
   */

  static statusEffectsEnabled() {
    return HouseRuleService.getBoolean('statusEffectsEnabled', false);
  }

  static getStatusEffectsList() {
    return HouseRuleService.getString('statusEffectsList', 'combatConditions');
  }

  static autoApplyFromConditionTrackEnabled() {
    return HouseRuleService.getBoolean('autoApplyFromConditionTrack', false);
  }

  static statusEffectDurationTrackingEnabled() {
    return HouseRuleService.getBoolean('statusEffectDurationTracking', false);
  }

  static autoRemoveOnRestEnabled() {
    return HouseRuleService.getBoolean('autoRemoveOnRest', false);
  }
}
