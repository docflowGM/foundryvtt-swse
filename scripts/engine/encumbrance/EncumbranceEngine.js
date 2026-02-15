/**
 * EncumbranceEngine — Comprehensive Encumbrance Rules
 *
 * Handles:
 * - State calculation (normal, encumbered, heavy, overloaded)
 * - Skill penalty injection
 * - Speed modification
 * - Defense penalties (Dex to Reflex loss)
 * - Derived data integration
 *
 * Pure functions. No mutations. No side effects.
 */

import { InventoryEngine } from '../inventory/InventoryEngine.js';

// Skills affected by heavy load (–10 penalty)
const HEAVY_LOAD_SKILL_PENALTIES = [
  'acrobatics',
  'climb',
  'endurance',
  'initiative',
  'jump',
  'stealth',
  'swim'
];

export class EncumbranceEngine {
  /**
   * Calculate complete encumbrance state and effects
   * @param {Actor} actor - Character actor
   * @returns {Object} Encumbrance state with all effects
   */
  static calculateEncumbrance(actor) {
    if (!actor?.system) {
      return this._createNormalState();
    }

    // Get STR ability score
    const strScore = actor.system?.abilities?.str?.total ??
                    actor.system?.attributes?.str?.total ?? 10;

    // Get size multiplier (1 for medium, typically)
    const size = actor.system?.size ?? 'medium';
    const sizeMultiplier = this._getSizeMultiplier(size);

    // Calculate total weight
    const allInventory = InventoryEngine.getAllInventory(actor);
    const totalWeight = InventoryEngine.calculateTotalWeight(allInventory);

    // Get thresholds
    const lightLoad = ((0.5 * strScore) ** 2) * sizeMultiplier;
    const mediumLoad = lightLoad * 2;
    const heavyLoad = mediumLoad * 1.5;
    const overloadThreshold = (strScore ** 2) * sizeMultiplier;

    // Determine state
    let state = 'normal';
    let label = 'Unencumbered';
    let skillPenalty = 0;
    let speedMultiplier = 1;
    let runMultiplier = 4; // Normal running multiplier
    let removeDexToReflex = false;

    if (totalWeight >= overloadThreshold) {
      state = 'overloaded';
      label = 'Overloaded';
      skillPenalty = -10;
      speedMultiplier = 0.25; // 1 square (effectively cannot move)
      runMultiplier = 0;
      removeDexToReflex = true;
    } else if (totalWeight >= heavyLoad) {
      state = 'heavy';
      label = 'Heavily Encumbered';
      skillPenalty = -10;
      speedMultiplier = 0.75; // 3/4 speed
      runMultiplier = 3;
    } else if (totalWeight >= mediumLoad) {
      state = 'encumbered';
      label = 'Encumbered';
      skillPenalty = 0; // No penalty, just movement reduced
      speedMultiplier = 1;
      runMultiplier = 4;
    }

    return {
      state,
      label,
      totalWeight: Math.round(totalWeight * 100) / 100,
      lightLoad: Math.round(lightLoad),
      mediumLoad: Math.round(mediumLoad),
      heavyLoad: Math.round(heavyLoad),
      overloadThreshold: Math.round(overloadThreshold),
      skillPenalty,
      speedMultiplier,
      runMultiplier,
      removeDexToReflex,
      affectedSkills: state === 'heavy' || state === 'overloaded' ? HEAVY_LOAD_SKILL_PENALTIES : []
    };
  }

  /**
   * Get size multiplier for carrying capacity
   * @param {string} size - Size category (tiny, small, medium, large, huge, gargantuan)
   * @returns {number} Multiplier
   */
  static _getSizeMultiplier(size) {
    const sizeKey = String(size).toLowerCase();
    const multipliers = {
      'tiny': 0.5,
      'small': 0.75,
      'medium': 1,
      'large': 2,
      'huge': 4,
      'gargantuan': 8
    };
    return multipliers[sizeKey] || 1;
  }

  /**
   * Apply encumbrance penalties to a skill roll total
   * @param {number} skillTotal - Current skill total
   * @param {string} skillKey - Skill key (e.g., 'acrobatics')
   * @param {Object} encumbranceState - Encumbrance state object
   * @returns {number} Adjusted skill total
   */
  static applySkillPenalty(skillTotal, skillKey, encumbranceState) {
    if (!encumbranceState?.affectedSkills?.includes(skillKey)) {
      return skillTotal;
    }
    return skillTotal + (encumbranceState.skillPenalty || 0);
  }

  /**
   * Determine if skill is affected by encumbrance
   * @param {string} skillKey - Skill key
   * @param {Object} encumbranceState - Encumbrance state
   * @returns {boolean} True if skill is affected
   */
  static isSkillAffected(skillKey, encumbranceState) {
    if (!encumbranceState?.affectedSkills) return false;
    return encumbranceState.affectedSkills.includes(String(skillKey).toLowerCase());
  }

  /**
   * Create default "normal" encumbrance state
   * @private
   * @returns {Object} Normal state object
   */
  static _createNormalState() {
    return {
      state: 'normal',
      label: 'Unencumbered',
      totalWeight: 0,
      lightLoad: 0,
      mediumLoad: 0,
      heavyLoad: 0,
      overloadThreshold: 0,
      skillPenalty: 0,
      speedMultiplier: 1,
      runMultiplier: 4,
      removeDexToReflex: false,
      affectedSkills: []
    };
  }

  /**
   * Get skills affected by heavy load
   * @returns {Array} Skill keys affected by heavy encumbrance
   */
  static getAffectedSkills() {
    return [...HEAVY_LOAD_SKILL_PENALTIES];
  }
}
