/**
 * Proficiency Rule — Base Attack Rules Module
 *
 * Determines if weapon is proficient.
 * Non-proficient weapons suffer -5 penalty.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const proficiencyRule = {
  id: "core.proficiency",
  type: RuleCategories.ATTACK,
  priority: 30,  // Early in pipeline

  applies: ({ actor, weapon }) => {
    return !!weapon && !!actor;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;
    const proficient = weapon.system?.proficient ?? true;

    if (!proficient) {
      result.attack.penalties.push({
        source: "Non-Proficient",
        value: -5
      });
      result.diagnostics.rulesTriggered.push("core.proficiency");
    }

    return result;
  }
};

export default proficiencyRule;
