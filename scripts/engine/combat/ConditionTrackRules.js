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

  /**
   * Resolve a condition-track shift without mutating the actor.
   *
   * Positive shifts can be increased by implant rules. Negative shifts are applied
   * as requested. The final step is clamped to the active house-rule cap.
   */
  static resolveConditionShift(actor, direction) {
    const current = Number(actor?.system?.conditionTrack?.current || 0);
    const cap = this.getConditionStepCap();
    const implantExtraStep = ImplantRules.getConditionTrackExtraStep(actor, direction);
    const effectiveDirection = direction > 0 ? direction + implantExtraStep : direction;
    const next = Math.min(cap, Math.max(0, current + effectiveDirection));

    return {
      current,
      next,
      cap,
      requestedShift: direction,
      implantExtraStep,
      effectiveDirection,
      appliedShift: next - current,
      changed: next !== current,
    };
  }

  /**
   * RAW revive helper: any healing while at 0 HP / disabled improves condition by 1 step.
   * Returns null when no condition-track update should be applied.
   */
  static resolveHealingConditionRecovery(currentHP, currentCondition) {
    const hp = Number(currentHP ?? 0);
    const current = Math.max(0, Number(currentCondition ?? 0));
    if (hp > 0 || current <= 0) return null;
    return Math.max(0, current - 1);
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
