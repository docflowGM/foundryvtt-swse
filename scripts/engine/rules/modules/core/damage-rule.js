/**
 * Damage Rule — Base Weapon Damage and Properties
 *
 * Establishes base damage dice and damage type from weapon.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const damageRule = {
  id: "core.damage",
  type: RuleCategories.DAMAGE,
  priority: 10,  // Very early

  applies: ({ weapon }) => {
    return !!weapon;
  },

  apply: (payload, result) => {
    const { weapon } = payload;

    // Get base damage dice
    const baseDamage = weapon.system?.damage ?? '1d6';
    const match = baseDamage.match(/(\d+)d(\d+)/);
    if (match) {
      result.dice.push({
        count: parseInt(match[1]),
        size: parseInt(match[2]),
        type: 'weapon-base'
      });
    }

    // Get damage type and armor piercing
    result.damageType = weapon.system?.damageType ?? 'kinetic';
    result.armorPiercing = weapon.system?.armorPiercing ?? 0;

    result.diagnostics.rulesTriggered.push("core.damage");

    return result;
  }
};

export default damageRule;
