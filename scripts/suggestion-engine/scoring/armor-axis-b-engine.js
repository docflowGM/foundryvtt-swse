/**
 * Armor Axis B Engine - Mobility & Skill Cost
 *
 * Evaluates how much an armor piece restricts mobility and skill usage.
 *
 * Armor Category Penalties (implicit in SWSE rules):
 * Light:  No penalty
 * Medium: -2 penalty on DEX-based skills, DEX Defense
 * Heavy:  -5 penalty on DEX-based skills, DEX Defense
 *
 * Core Insight:
 * Mobility cost is CHARACTER-SPECIFIC:
 * - High-DEX characters suffer more from penalties
 * - High-STR characters suffer less
 * - Armor Mastery talent softens the penalty by one band
 *
 * Scoring (inverted for Axis B):
 * 0 = no cost (light armor)
 * 1 = maximum cost (heavy armor on high-DEX character)
 *
 * Then normalized to 0-20 scale (matching weapon Axis B cap)
 */

export class ArmorAxisBEngine {
  /**
   * Compute mobility cost axis for armor
   * @param {Object} armor - The armor item
   * @param {Object} charContext - Character context with DEX, STR, talents
   * @returns {Object} Axis B result with score, category, withArmorMastery, details
   */
  static computeMobilityCostAxis(armor, charContext) {
    const category = armor.system?.category || 'light';
    const charDex = charContext.attributes?.dex || 0;
    const charStr = charContext.attributes?.str || 0;

    // Base penalty by category
    const basePenalty = this._getBasePenalty(category);

    // Character-specific modifier: high DEX amplifies penalty, high STR dampens it
    const dexModifier = Math.max(0, charDex - 1); // Each +1 DEX adds 0.05 cost
    const strModifier = Math.max(0, charStr - 1); // Each +1 STR subtracts 0.03 cost

    // Compute cost (0-1, where 1 = maximum cost)
    let cost = basePenalty + dexModifier * 0.05 - strModifier * 0.03;
    cost = Math.max(0, Math.min(1, cost)); // Clamp to 0-1

    // Apply Armor Mastery talent: soft-caps the cost
    if (charContext.talents?.armorMastery) {
      // Armor Mastery reduces effective cost by up to 0.2 (one band)
      cost = Math.max(0, cost - 0.2);
    }

    // Assign category band
    const categoryBand = this._getCategoryBand(category);

    // Normalize to 0-20 scale (matching weapon Axis B cap)
    const score = cost * 20;

    return {
      score: Math.max(0, Math.min(20, score)),
      category: categoryBand,
      penalty: basePenalty,
      cost,
      withArmorMastery: charContext.talents?.armorMastery ?? false,
      charDex,
      charStr,
      details: {
        explanation: this._generateExplanation(categoryBand, cost, charContext.talents)
      }
    };
  }

  /**
   * Get base penalty for armor category
   * @private
   */
  static _getBasePenalty(category) {
    const penalties = {
      light: 0.0,      // No cost
      medium: 0.25,    // Moderate cost
      heavy: 0.5       // Significant cost
    };
    return penalties[category] || 0.0;
  }

  /**
   * Get category band name
   * @private
   */
  static _getCategoryBand(category) {
    if (category === 'light') return 'light';
    if (category === 'medium') return 'medium';
    if (category === 'heavy') return 'heavy';
    return 'unknown';
  }

  /**
   * Generate human explanation for Axis B
   * @private
   */
  static _generateExplanation(categoryBand, cost, talents = {}) {
    let baseText = '';

    if (categoryBand === 'light') {
      baseText = 'No mobility penalty';
    } else if (categoryBand === 'medium') {
      baseText = 'Moderate mobility penalty';
    } else if (categoryBand === 'heavy') {
      baseText = 'Heavy mobility penalty';
    }

    // Add talent context
    if (talents.armorMastery) {
      if (categoryBand === 'heavy') {
        return `${baseText} (reduced by Armor Mastery)`;
      } else if (categoryBand === 'medium') {
        return `${baseText} (Armor Mastery mitigates)`;
      }
    }

    return baseText;
  }
}

export default ArmorAxisBEngine;
