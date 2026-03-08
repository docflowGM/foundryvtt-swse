/**
 * Strength to Damage Rule — Ability Modifier to Damage
 *
 * Adds ability modifier to damage rolls for melee weapons.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const strengthToDamageRule = {
  id: "core.strength-to-damage",
  type: RuleCategories.DAMAGE,
  priority: 30,

  applies: ({ actor, weapon }) => {
    return !!actor && !!weapon;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;

    // Get ability modifier
    const attr = weapon.system?.attackAttribute ?? 'str';
    const abilityMod = actor.system.attributes?.[attr]?.mod ?? 0;

    if (abilityMod !== 0) {
      result.flatBonus += abilityMod;
      result.diagnostics.rulesTriggered.push("core.strength-to-damage");
    }

    return result;
  }
};

export default strengthToDamageRule;
