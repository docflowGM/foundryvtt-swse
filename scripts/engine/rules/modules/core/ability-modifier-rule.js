/**
 * Ability Modifier Rule — Ability Score Contribution to Attacks
 *
 * Adds ability modifier (STR/DEX) to attack rolls based on weapon configuration.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const abilityModifierRule = {
  id: "core.ability-modifier",
  type: RuleCategories.ATTACK,
  priority: 40,  // After proficiency check

  applies: ({ actor, weapon }) => {
    return !!actor && !!weapon;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;

    // Get ability modifier from weapon config
    const attr = weapon.system?.attackAttribute ?? 'str';
    const abilityMod = actor.system.attributes?.[attr]?.mod ?? 0;

    if (abilityMod !== 0) {
      result.attack.bonuses.push({
        source: `${attr.toUpperCase()} Modifier`,
        value: abilityMod
      });
      result.diagnostics.rulesTriggered.push("core.ability-modifier");
    }

    return result;
  }
};

export default abilityModifierRule;
