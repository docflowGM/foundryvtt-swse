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
 * Scoring:
 * cost 0 = low restriction, positive mobility-fit score
 * cost 1 = severe restriction, no mobility-fit score
 *
 * The store-level armor benefit simulator applies the actual penalty for bad
 * max-Dex/ACP outcomes; this axis is only a small fit bonus for armor that
 * does not restrict the actor.
 */

import { getArmorProficiencyPenalty, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

export class ArmorAxisBEngine {
  /**
   * Compute mobility cost axis for armor
   * @param {Object} armor - The armor item
   * @param {Object} charContext - Character context with DEX, STR, talents
   * @returns {Object} Axis B result with score, category, withArmorMastery, details
   */
  static computeMobilityCostAxis(armor, charContext) {
    const armorStats = resolveArmorData(armor);
    const category = armorStats.isEnergyShield ? 'light' : (armorStats.armorType || 'light');
    const charDex = charContext.attributes?.dex || 0;
    const charStr = charContext.attributes?.str || 0;
    const proficient = armorStats.isEnergyShield
      ? true
      : !!charContext.proficiencies?.[category];

    const maxDex = Number.isFinite(Number(armorStats.maxDexBonus)) ? Number(armorStats.maxDexBonus) : null;
    const masteryBonus = proficient && charContext.talents?.armorMastery ? 1 : 0;
    const effectiveMaxDex = maxDex === null ? null : maxDex + masteryBonus;
    const dexCapLoss = effectiveMaxDex === null ? 0 : Math.max(0, charDex - effectiveMaxDex);

    // Per current project rule, armor check penalty applies only when the actor
    // lacks proficiency in the armor type.  Category alone is not an ACP.
    const listedAcp = Number(armorStats.armorCheckPenalty || 0) || 0;
    const fallbackAcp = getArmorProficiencyPenalty(category);
    const armorCheckPenalty = proficient ? 0 : Math.abs(listedAcp || fallbackAcp || 0);
    const speedPenalty = Math.abs(Number(armorStats.speedPenalty || 0) || 0);

    // Character-specific modifier: high DEX amplifies max-Dex pain; high STR
    // lightly dampens bulk/speed concerns but never erases an actual Dex cap.
    let cost = dexCapLoss * 0.14 + armorCheckPenalty * 0.05 + speedPenalty * 0.05;
    cost -= Math.max(0, charStr - 1) * 0.015;
    cost = Math.max(0, Math.min(1, cost));

    // Armor Mastery is already reflected by increasing the effective max Dex.
    const categoryBand = this._getCategoryBand(category);

    // Normalize to a small positive fit score. Low-cost armor receives a bonus;
    // restrictive armor receives little or none.
    const score = (1 - cost) * 10;

    return {
      score: Math.max(0, Math.min(10, score)),
      category: categoryBand,
      penalty: armorCheckPenalty,
      cost,
      withArmorMastery: charContext.talents?.armorMastery ?? false,
      charDex,
      charStr,
      dexCapLoss,
      armorCheckPenalty,
      speedPenalty,
      proficient,
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
