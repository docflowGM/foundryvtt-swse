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
import { ImplantRules } from "/systems/foundryvtt-swse/scripts/engine/implants/ImplantRules.js";

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

  /**
   * Returns the maximum condition step for the active conditionCapVariant house rule.
   * STANDARD→5, VARIANT_6→6, VARIANT_UNLIMITED→999.
   */
  static getConditionStepCap() {
    const variant = HouseRuleService.getAll()?.conditionCapVariant?.value ?? 'STANDARD';
    const caps = { STANDARD: 5, VARIANT_6: 6, VARIANT_UNLIMITED: 999 };
    return caps[variant?.toUpperCase?.()] ?? 5;
  }

  static conditionTrackAutoApplyEnabled() {
    return HouseRuleService.getBoolean('conditionTrackAutoApply', false);
  }

  /**
   * Resolves a condition track shift for an actor.
   *
   * Owns cap calculation, implant adjustment, and effective shift computation.
   *
   * @param {Actor} actor - target actor
   * @param {number} direction - +1 (worse) or -1 (better)
   * @returns {{ next: number, implantExtraStep: number, appliedShift: number }}
   */
  static resolveConditionShift(actor, direction) {
    const conditionCap = ConditionTrackRules.getConditionStepCap();
    const currentCondition = Number(actor.system.conditionTrack?.current || 0);
    const implantExtraStep = ImplantRules.getConditionTrackExtraStep(actor, direction);
    const effectiveDirection = direction > 0 ? direction + implantExtraStep : direction;
    const next = Math.min(conditionCap, Math.max(0, currentCondition + effectiveDirection));

    return {
      next,
      implantExtraStep,
      appliedShift: next - currentCondition
    };
  }

  /**
   * Resolves the condition track recovery step when healing revives an actor.
   *
   * RAW: Any healing while at 0 HP / disabled revives and moves +1 step up the CT.
   *
   * @param {number} currentHP - actor HP prior to healing
   * @param {number} currentCT - actor condition track step prior to healing
   * @returns {number|null} the recovered condition step, or null if no recovery applies
   */
  static resolveHealingConditionRecovery(currentHP, currentCT) {
    if (currentHP <= 0 && currentCT > 0) {
      return Math.max(0, currentCT - 1);
    }
    return null;
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
