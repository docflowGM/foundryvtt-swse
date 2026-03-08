/**
 * Critical Rule — Critical Hit Mechanics Module
 *
 * Applies EXTEND_CRITICAL_RANGE and MODIFY_CRITICAL_MULTIPLIER rules.
 * Centralizes all critical threat and damage multiplier logic.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";
import { ResolutionContext } from "/systems/foundryvtt-swse/scripts/engine/resolution/resolution-context.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";

export const criticalRule = {
  id: "core.critical",
  type: RuleCategories.CRITICAL,
  priority: 50,

  applies: ({ actor, weapon }) => {
    return !!actor && !!weapon;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;
    const ctx = new ResolutionContext(actor);
    const weaponProf = weapon.system?.proficiency;

    // === THREAT RANGE (EXTEND_CRITICAL_RANGE) ===
    let threatRange = weapon.system?.critRange || 20;
    const critRangeRules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);

    for (const rule of critRangeRules) {
      if (rule.proficiency === weaponProf) {
        threatRange -= (rule.by || 0);
      }
    }
    threatRange = Math.max(2, threatRange);

    // === CRITICAL MULTIPLIER (MODIFY_CRITICAL_MULTIPLIER) ===
    let multiplier = weapon.system?.critMultiplier || 2;
    const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);

    for (const rule of multRules) {
      if (rule.proficiency === weaponProf && rule.multiplier) {
        multiplier = Math.max(multiplier, rule.multiplier);
      }
    }

    // Update result
    result.critical.threatRange = threatRange;
    result.critical.multiplier = multiplier;

    if (critRangeRules.length > 0 || multRules.length > 0) {
      result.diagnostics.rulesTriggered.push("core.critical");
      for (const rule of critRangeRules) {
        result.diagnostics.rulesTriggered.push(
          `EXTEND_CRITICAL_RANGE:${rule.proficiency}:${rule.by}`
        );
      }
      for (const rule of multRules) {
        result.diagnostics.rulesTriggered.push(
          `MODIFY_CRITICAL_MULTIPLIER:${rule.proficiency}:${rule.multiplier}`
        );
      }
    }

    return result;
  }
};

export default criticalRule;
