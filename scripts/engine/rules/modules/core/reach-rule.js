/**
 * Reach/Range Validation Rule
 *
 * Validates that the attacker is within reach/range of the target.
 * For melee weapons: checks physical reach + size modifiers.
 * For ranged weapons: checks distance against weapon range.
 * Returns inReach, maxReach, and any reach-related penalties.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const reachRule = {
  id: "core.reach",
  type: RuleCategories.ATTACK,
  priority: 5,  // Very early - check legality before other modifiers

  applies: ({ actor, weapon, target, context }) => {
    return !!actor && !!weapon && !!context;
  },

  apply: (payload, result) => {
    const { actor, weapon, target, context } = payload;
    const distance = context.distance ?? null;

    // Initialize reach object if not already present
    if (!result.reach) {
      result.reach = {
        inReach: true,
        distance: distance,
        maxReach: null,
        penalty: 0
      };
    }

    // Get weapon type and range
    const weaponRange = weapon.system?.range || '';
    const isMelee = !weaponRange || weaponRange.toLowerCase() === 'melee' || weaponRange.toLowerCase() === 'close';
    const isRanged = weaponRange.toLowerCase() === 'ranged' || weaponRange.toLowerCase() === 'distant';

    // Get actor and target reach
    const actorReach = actor.system?.reach ?? 5; // Default 5 feet (Medium creature)
    const actorSize = actor.system?.size || 'Medium';

    // Melee reach calculation
    if (isMelee) {
      // Base melee reach depends on size
      let baseReach = 5; // Medium

      switch (actorSize) {
        case 'Tiny':
          baseReach = 0; // No reach
          break;
        case 'Small':
          baseReach = 5;
          break;
        case 'Medium':
          baseReach = 5;
          break;
        case 'Large':
          baseReach = 10;
          break;
        case 'Huge':
          baseReach = 15;
          break;
        case 'Gargantuan':
          baseReach = 20;
          break;
        default:
          baseReach = 5;
      }

      // Check if weapon has reach property (e.g., polearms)
      const weaponReachBonus = weapon.system?.reachBonus || 0;
      const maxReach = baseReach + weaponReachBonus;

      result.reach.maxReach = maxReach;

      // If distance provided, check if in reach
      if (distance !== null) {
        result.reach.inReach = distance <= maxReach;

        // Add penalty if out of reach but attempting attack
        if (!result.reach.inReach) {
          result.attack.penalties.push(-4); // Out of reach penalty
          result.diagnostics.rulesTriggered.push('core.reach:out-of-reach-penalty');
        }
      }
    }
    // Ranged reach calculation
    else if (isRanged) {
      // Get weapon range bands
      const weaponRanges = weapon.system?.ranges || {};
      const shortRange = weaponRanges.short ?? null;
      const mediumRange = weaponRanges.medium ?? null;
      const longRange = weaponRanges.long ?? null;

      result.reach.maxReach = longRange;

      // If distance provided, check range band
      if (distance !== null) {
        if (shortRange && distance <= shortRange) {
          result.reach.rangeBand = 'short';
          result.reach.inReach = true;
        } else if (mediumRange && distance <= mediumRange) {
          result.reach.rangeBand = 'medium';
          result.reach.inReach = true;
          result.attack.penalties.push(-2); // Medium range penalty
          result.diagnostics.rulesTriggered.push('core.reach:medium-range-penalty');
        } else if (longRange && distance <= longRange) {
          result.reach.rangeBand = 'long';
          result.reach.inReach = true;
          result.attack.penalties.push(-4); // Long range penalty
          result.diagnostics.rulesTriggered.push('core.reach:long-range-penalty');
        } else {
          result.reach.inReach = false;
          result.attack.penalties.push(-10); // Out of maximum range
          result.diagnostics.rulesTriggered.push('core.reach:out-of-range-penalty');
        }
      }
    }

    return result;
  }
};

export default reachRule;
