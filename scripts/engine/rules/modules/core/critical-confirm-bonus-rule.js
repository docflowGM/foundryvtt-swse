/**
 * Critical Confirmation Bonus Rule — Bonus to Crit Confirmation Rolls
 *
 * Applies CRITICAL_CONFIRM_BONUS rules to critical confirmation rolls.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";
import { ResolutionContext } from "/systems/foundryvtt-swse/scripts/engine/resolution/resolution-context.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";

export const criticalConfirmBonusRule = {
  id: "core.critical-confirm-bonus",
  type: RuleCategories.CRITICAL,
  priority: 60,  // After threat range/multiplier

  applies: ({ actor, weapon }) => {
    return !!actor && !!weapon;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;
    const ctx = new ResolutionContext(actor);
    const weaponProf = weapon.system?.proficiency;

    let confirmBonus = 0;
    const confirmRules = ctx.getRuleInstances(RULES.CRITICAL_CONFIRM_BONUS);

    for (const rule of confirmRules) {
      if (rule.proficiency === weaponProf && rule.bonus) {
        confirmBonus += rule.bonus || 0;
      }
    }

    if (confirmBonus !== 0) {
      // Store confirmation bonus in result for later use
      result.critical.confirmBonus = confirmBonus;
      result.diagnostics.rulesTriggered.push("core.critical-confirm-bonus");

      for (const rule of confirmRules) {
        result.diagnostics.rulesTriggered.push(
          `CRITICAL_CONFIRM_BONUS:${rule.proficiency}:${rule.bonus}`
        );
      }
    }

    return result;
  }
};

export default criticalConfirmBonusRule;
