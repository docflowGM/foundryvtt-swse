/**
 * Encumbrance Engine — Weight & Load Calculation
 *
 * Calculates character encumbrance based on:
 * 1. Total carried weight in kg (all carried gear incl. unworn armor; see calculateCarriedWeight)
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

import { calculateCarryingCapacity } from "/systems/foundryvtt-swse/scripts/utils/math-utils.js";

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
   * SINGLE AUTHORITY for carried weight. Canonical unit: kilograms (system.weight, the equipment schema's unit).
   * Consumers (sheet Gear tab, equipment ledger, derived encumbrance) must read this; none may re-sum item weights.
   * @param {Actor} actor
   * @returns {number} total carried weight in kg (rounded to 2 dp)
   */
  static calculateCarriedWeight(actor) {
    return this._calculateTotalWeight(actor);
  }

  /** Item types that are physical carried gear. Worn and carried-but-unworn armor both count (it is carried either way). */
  static CARRIED_ITEM_TYPES = Object.freeze(['weapon', 'lightsaber', 'armor', 'equipment', 'gear', 'weaponUpgrade', 'poison']);

  /** Unit weight (kg) of one item: canonical system.weight, else system.economics.weight (normalizer fallback); invalid/negative -> 0. */
  static itemUnitWeight(item) {
    const raw = item?.system?.weight ?? item?.system?.economics?.weight;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /**
   * Is the item's weight an explicit, valid recorded value? An explicit 0 is a verified zero; absent, blank, non-numeric or negative is NOT
   * (it contributes 0 to the total but is reported by carriedWeightReport so it is never presented as a verified zero).
   */
  static itemWeightVerified(item) {
    const raw = item?.system?.weight ?? item?.system?.economics?.weight;
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return false;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0;
  }

  /** Carried weight plus the carried items whose weight is not a verified recorded value. */
  static carriedWeightReport(actor) {
    const unverified = [];
    for (const item of (actor?.items ?? [])) {
      if (this.CARRIED_ITEM_TYPES.includes(item?.type) && this.itemQuantity(item) > 0 && !this.itemWeightVerified(item)) unverified.push({ id: item.id, name: item.name ?? '' });
    }
    return { total: this._calculateTotalWeight(actor), unverified, complete: unverified.length === 0 };
  }

  /** Quantity: absent/invalid -> 1 (schema default); an explicit 0 stays 0 (zero units carry zero weight). */
  static itemQuantity(item) {
    const raw = item?.system?.quantity;
    if (raw === undefined || raw === null || raw === '') return 1;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 1;
  }

  /** Total carried weight of one item row (kg) = unit weight x quantity. */
  static itemCarriedWeight(item) {
    return this.itemUnitWeight(item) * this.itemQuantity(item);
  }

  /**
   * Calculate total weight carried by actor (kg).
   * @private
   */
  static _calculateTotalWeight(actor) {
    let total = 0;
    for (const item of (actor?.items ?? [])) {
      if (!this.CARRIED_ITEM_TYPES.includes(item?.type)) continue;
      total += this.itemCarriedWeight(item);
    }
    return Math.round(total * 100) / 100;
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
