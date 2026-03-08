/**
 * Base Attack Bonus Rule — BAB Contribution
 *
 * Adds base attack bonus from actor level and proficiency progression.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const baseAttackBonusRule = {
  id: "core.base-attack-bonus",
  type: RuleCategories.ATTACK,
  priority: 10,  // Very early

  applies: ({ actor }) => {
    return !!actor;
  },

  apply: (payload, result) => {
    const { actor } = payload;

    const bab = actor.system.bab ?? 0;
    if (bab !== 0) {
      result.attack.bonuses.push({
        source: 'Base Attack Bonus',
        value: bab
      });
      result.diagnostics.rulesTriggered.push("core.base-attack-bonus");
    }

    return result;
  }
};

export default baseAttackBonusRule;
