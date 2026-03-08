/**
 * Weapon Specialization Rule
 *
 * Applies flat damage bonus to attacks with specialized weapon groups.
 * Soldiers and other classes get +2 damage per specialization feat for specific weapon group.
 * Weapon Specialization 1: +2 damage
 * Greater Weapon Specialization: +4 damage (replaces WS, not stacking)
 *
 * Proficiency-gated: Only applies to weapons matching the specialization's weapon group.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";
import { ResolutionContext } from "/systems/foundryvtt-swse/scripts/engine/resolution/resolution-context.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";

export const weaponSpecializationRule = {
  id: "talent.weapon-specialization",
  type: RuleCategories.DAMAGE,
  priority: 25,  // After ability modifiers, before critical effects

  applies: ({ actor, weapon }) => {
    // Check if actor has any weapon specialization talent
    const hasWS = actor?.items?.some(item =>
      item.type === 'talent' &&
      (item.name === 'Weapon Specialization' ||
       item.name === 'Greater Weapon Specialization')
    );
    return !!actor && !!weapon && hasWS;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;
    const ctx = new ResolutionContext(actor);

    // Query all WEAPON_SPECIALIZATION rules from resolved rules
    const specializations = ctx.getRuleInstances(RULES.WEAPON_SPECIALIZATION);

    if (!specializations || specializations.length === 0) {
      return result;
    }

    // Find matching specialization for this weapon's proficiency group
    const weaponProficiency = weapon.system?.proficiency;
    let maxBonus = 0;

    for (const spec of specializations) {
      // Check if this specialization matches the weapon's proficiency
      if (spec.proficiency === weaponProficiency) {
        // Take the highest bonus (Greater WS = +4 replaces WS = +2)
        if (spec.bonus > maxBonus) {
          maxBonus = spec.bonus;
        }
      }
    }

    // Apply the bonus
    if (maxBonus > 0) {
      result.flatBonus = (result.flatBonus || 0) + maxBonus;
      result.diagnostics.rulesTriggered.push(
        `talent.weapon-specialization:${weaponProficiency}:+${maxBonus}`
      );
    }

    return result;
  }
};

export default weaponSpecializationRule;
