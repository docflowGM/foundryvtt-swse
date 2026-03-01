/**
 * Encumbrance Engine — Weight & Load Calculation
 *
 * Calculates character encumbrance based on:
 * 1. Total carried weight (items + armor)
 * 2. Strength-based carrying capacity
 * 3. Load category (light/medium/heavy/overloaded)
 * 4. Movement and skill penalties from encumbrance
 *
 * SWSE Rules:
 * - Light Load: 0 to capacity (Str×10)
 * - Medium Load: capacity+1 to capacity×2 (Str×20)
 * - Heavy Load: capacity×2+1 to capacity×3 (Str×30)
 * - Overloaded: capacity×3+1 and beyond
 *
 * Effects:
 * - Light/Medium: No penalties
 * - Heavy: -1 speed penalty, remove Dex bonus from Reflex
 * - Overloaded: -2 speed penalty, remove Dex bonus, skill penalties
 *
 * Integration:
 * - Speed penalties register as modifiers to speed.base
 * - Skill penalties register as modifiers to skill.* domains
 * - Reflex Dex removal handled separately
 */

import { calculateCarryingCapacity } from "../../utils/math-utils.js";

export class EncumbranceEngine {
  /**
   * Calculate encumbrance state for an actor
   * @param {Actor} actor - Actor to calculate encumbrance for
   * @returns {Object} Encumbrance state with all calculated values
   */
  static calculateEncumbrance(actor) {
    if (!actor || !actor.system) {
      return this._defaultEncumbranceState();
    }

    // ========================================================================
    // STEP 1: Calculate total weight
    // ========================================================================
    const totalWeight = this._calculateTotalWeight(actor);

    // ========================================================================
    // STEP 2: Calculate carrying capacity
    // ========================================================================
    const strength = actor.system.attributes?.str?.total || 10;
    const size = actor.system.size || 'medium';
    const capacity = calculateCarryingCapacity(strength, size);

    // ========================================================================
    // STEP 3: Determine load category
    // ========================================================================
    const loadCategory = this._determineLoadCategory(totalWeight, capacity);

    // ========================================================================
    // STEP 4: Calculate penalties based on load
    // ========================================================================
    const skillPenalty = this._calculateSkillPenalty(loadCategory);
    const removeDexToReflex = loadCategory === 'heavy' || loadCategory === 'overloaded';

    // ========================================================================
    // STEP 5: Calculate speed multiplier (as decimal: 1.0 = normal speed)
    // SWSE Standard Speed: 30 feet (6 squares)
    // Heavy Load: -10 feet (-1 speed = 0.67x)
    // Overloaded: -20 feet (-2 speed = 0.33x)
    // ========================================================================
    const standardSpeed = 30; // Default SWSE speed
    let speedPenaltyFeet = 0;
    if (loadCategory === 'heavy') {
      speedPenaltyFeet = -10;  // -1 speed
    } else if (loadCategory === 'overloaded') {
      speedPenaltyFeet = -20;  // -2 speed
    }
    const speedMultiplier = 1.0 + (speedPenaltyFeet / standardSpeed);

    // ========================================================================
    // STEP 6: Calculate run multiplier (4× speed as base)
    // ========================================================================
    const runMultiplier = 4; // Standard: can run 4× speed
    let adjustedRunMultiplier = runMultiplier;
    if (loadCategory === 'heavy') {
      adjustedRunMultiplier = 3; // Heavy load: 3× speed
    } else if (loadCategory === 'overloaded') {
      adjustedRunMultiplier = 2; // Overloaded: 2× speed (or slower)
    }

    // ========================================================================
    // STEP 7: For backward compatibility, calculate speedPenalty in feet
    // ========================================================================
    const speedPenalty = speedPenaltyFeet;

    // ========================================================================
    // STEP 7: Determine affected skills
    // ========================================================================
    const affectedSkills = (loadCategory === 'heavy' || loadCategory === 'overloaded')
      ? ['acrobatics', 'climb', 'escapeArtist', 'jump', 'sleightOfHand', 'stealth', 'swim', 'useRope']
      : [];

    // ========================================================================
    // RETURN: Encumbrance state
    // ========================================================================
    return {
      state: loadCategory,
      label: this._getLoadLabel(loadCategory),
      totalWeight: totalWeight,
      lightLoad: capacity.light,
      mediumLoad: capacity.medium,
      heavyLoad: capacity.heavy,
      overloadThreshold: capacity.heavy, // Everything over heavy is overloaded
      skillPenalty: skillPenalty,
      speedMultiplier: speedMultiplier,
      speedPenalty: speedPenalty,
      runMultiplier: adjustedRunMultiplier,
      removeDexToReflex: removeDexToReflex,
      affectedSkills: affectedSkills,
      capacity: capacity
    };
  }

  /**
   * Calculate total weight carried by actor
   * Includes equipped armor + inventory items
   * @private
   */
  static _calculateTotalWeight(actor) {
    let total = 0;

    // Add equipped armor weight
    const armor = actor.items
      ?.filter(i => i.type === 'armor' && i.system?.equipped)
      ?.forEach(armor => {
        total += (armor.system?.weight || 0);
      });

    // Add inventory item weights
    const items = actor.items
      ?.filter(i => !['armor', 'background', 'feat', 'talent', 'class', 'species'].includes(i.type))
      ?.forEach(item => {
        const weight = item.system?.weight || 0;
        const quantity = item.system?.quantity || 1;
        total += weight * quantity;
      });

    return total;
  }

  /**
   * Determine load category based on total weight vs capacity
   * @private
   */
  static _determineLoadCategory(totalWeight, capacity) {
    if (totalWeight <= capacity.light) {
      return 'light';
    } else if (totalWeight <= capacity.medium) {
      return 'medium';
    } else if (totalWeight <= capacity.heavy) {
      return 'heavy';
    } else {
      return 'overloaded';
    }
  }

  /**
   * Calculate skill penalty based on load category
   * @private
   */
  static _calculateSkillPenalty(loadCategory) {
    switch (loadCategory) {
      case 'light':
      case 'medium':
        return 0; // No penalty
      case 'heavy':
        return -1; // -1 skill penalty
      case 'overloaded':
        return -2; // -2 skill penalty
      default:
        return 0;
    }
  }

  /**
   * Get human-readable label for load category
   * @private
   */
  static _getLoadLabel(loadCategory) {
    const labels = {
      'light': 'Light Load',
      'medium': 'Medium Load',
      'heavy': 'Heavy Load',
      'overloaded': 'Overloaded'
    };
    return labels[loadCategory] || 'Unknown';
  }

  /**
   * Default encumbrance state (used when actor data unavailable)
   * @private
   */
  static _defaultEncumbranceState() {
    return {
      state: 'light',
      label: 'Light Load',
      totalWeight: 0,
      lightLoad: 100,
      mediumLoad: 200,
      heavyLoad: 300,
      overloadThreshold: 300,
      skillPenalty: 0,
      speedMultiplier: 1.0,
      speedPenalty: 0,
      runMultiplier: 4,
      removeDexToReflex: false,
      affectedSkills: [],
      capacity: {
        light: 100,
        medium: 200,
        heavy: 300
      }
    };
  }
}

export default EncumbranceEngine;
