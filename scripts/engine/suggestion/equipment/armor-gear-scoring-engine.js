/**
 * Armor & Gear Scoring Engine
 *
 * Extends dual-axis philosophy to armor and general equipment.
 * Note: This is a sketch/outline for future full implementation.
 *
 * Armor follows dual-axis:
 *   Axis A: Protection Value (soak/DR provided)
 *   Axis B: Mobility Cost (penalty to movement/action economy)
 *
 * Gear follows dual-axis:
 *   Axis A: Utility Value (mechanical benefit)
 *   Axis B: Action Cost (action economy to activate/use)
 */

import { assignTier, scaleNormalizedTo100, clampScore } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";

export class ArmorGearScoringEngine {
  /**
   * Score armor piece for character
   * @param {Object} armor - The armor item
   * @param {Object} character - The character actor
   * @returns {Object} Armor score
   */
  static scoreArmor(armor, character) {
    const charContext = this._extractCharacterContext(character);

    // Axis A: Protection value (soak amount)
    const axisA = this._computeProtectionAxis(armor);

    // Axis B: Mobility cost (armor category penalty)
    const axisB = this._computeMobilityCostAxis(armor, charContext);

    // Resolve tradeoff
    const combined = this._resolveArmorTradeoff(axisA, axisB, charContext);

    // Convert to 0-100 scale
    const axisAScore100 = scaleNormalizedTo100(axisA.normalizedScore);
    const axisBScore100 = scaleNormalizedTo100(axisB.normalizedScore);
    let finalScore = scaleNormalizedTo100(combined.finalScore);

    // NaN protection
    if (!Number.isFinite(finalScore)) finalScore = 0;
    finalScore = clampScore(finalScore, 0, 100);

    // Assign canonical tier
    const tier = assignTier(finalScore);

    return {
      armorId: armor.id,
      armorName: armor.name,

      axisA: {
        label: 'Protection Value',
        score: axisAScore100,
        soak: axisA.soakAmount,
        band: axisA.band
      },

      axisB: {
        label: 'Mobility Cost',
        score: axisBScore100,
        category: axisB.category,
        mobilityPenalty: axisB.penalty
      },

      combined: {
        finalScore,
        tier,
        tradeoffType: combined.tradeoffType
      },

      explanations: combined.explanations,

      meta: {
        characterLevel: charContext.level,
        characterRole: charContext.primaryRole,
        computedAt: Date.now()
      }
    };
  }

  /**
   * Score equipment item
   * @param {Object} gear - The equipment item
   * @param {Object} character - The character actor
   * @returns {Object} Gear score
   */
  static scoreGear(gear, character) {
    const charContext = this._extractCharacterContext(character);

    // Axis A: Utility value (mechanical benefit)
    const axisA = this._computeUtilityAxis(gear, charContext);

    // Axis B: Action cost (to activate/use)
    const axisB = this._computeActionCostAxis(gear);

    // Resolve tradeoff
    const combined = this._resolveGearTradeoff(axisA, axisB, charContext);

    // Convert to 0-100 scale
    const axisAScore100 = scaleNormalizedTo100(axisA.normalizedScore);
    const axisBScore100 = scaleNormalizedTo100(axisB.normalizedScore);
    let finalScore = scaleNormalizedTo100(combined.finalScore);

    // NaN protection
    if (!Number.isFinite(finalScore)) finalScore = 0;
    finalScore = clampScore(finalScore, 0, 100);

    // Assign canonical tier
    const tier = assignTier(finalScore);

    return {
      gearId: gear.id,
      gearName: gear.name,

      axisA: {
        label: 'Utility Value',
        score: axisAScore100,
        benefit: axisA.benefit,
        category: axisA.utilityCategory
      },

      axisB: {
        label: 'Action Cost',
        score: axisBScore100,
        actionCost: axisB.actionCost,
        upfront: axisB.upfrontCost
      },

      combined: {
        finalScore,
        tier,
        tradeoffType: combined.tradeoffType
      },

      explanations: combined.explanations,

      meta: {
        characterLevel: charContext.level,
        characterRole: charContext.primaryRole,
        computedAt: Date.now()
      }
    };
  }

  /**
   * Compute armor's protection value
   * @private
   */
  static _computeProtectionAxis(armor) {
    const category = armor.system?.category || 'light';
    const soakAmount = armor.system?.soak || 0;

    const bands = {
      light: { low: 2, medium: 5, high: 8 },
      medium: { low: 4, medium: 7, high: 10 },
      heavy: { low: 6, medium: 9, high: 12 }
    };

    const bandThresholds = bands[category] || bands.light;

    let band, score;
    if (soakAmount <= bandThresholds.low) {
      band = 'light';
      score = (soakAmount / bandThresholds.low) * 0.33;
    } else if (soakAmount <= bandThresholds.medium) {
      band = 'medium';
      score = 0.33 + ((soakAmount - bandThresholds.low) / (bandThresholds.medium - bandThresholds.low)) * 0.33;
    } else {
      band = 'heavy';
      score = 0.66 + ((soakAmount - bandThresholds.medium) / (bandThresholds.high - bandThresholds.medium)) * 0.27;
    }

    return {
      normalizedScore: Math.min(1.0, score),
      soakAmount,
      band,
      category
    };
  }

  /**
   * Compute armor's mobility cost
   * Heavy armor restricts movement/DEX
   * @private
   */
  static _computeMobilityCostAxis(armor, charContext) {
    const category = armor.system?.category || 'light';

    let penalty = 0;
    let score = 1.0; // Start at 1.0 (no penalty) and reduce

    if (category === 'medium') {
      penalty = 2; // Standard medium armor penalty
      score = 0.85; // 15% reduction in mobility value
    } else if (category === 'heavy') {
      penalty = 5; // Standard heavy armor penalty
      score = 0.7; // 30% reduction in mobility value
    }
    // Light armor has 0 penalty

    // If character has high DEX, armor cost is higher
    if (charContext.attributes?.dex > 2 && category === 'heavy') {
      score -= 0.1; // Additional penalty for high-DEX characters
    }

    // Normalize so 0 = best mobility, 1 = worst
    const normalizedScore = 1.0 - score;

    return {
      normalizedScore, // Inverted: lower is better for mobility
      penalty,
      category,
      charDex: charContext.attributes?.dex || 0
    };
  }

  /**
   * Compute equipment's utility value
   * @private
   */
  static _computeUtilityAxis(gear, charContext) {
    // Very simplified - real implementation would examine item tags
    const utility = gear.system?.utility || 0;
    const rarity = gear.system?.rarity || 'common';

    let utilityCategory = 'basic';
    if (gear.system?.tags?.includes('survival')) utilityCategory = 'survival';
    if (gear.system?.tags?.includes('medical')) utilityCategory = 'medical';
    if (gear.system?.tags?.includes('tech')) utilityCategory = 'tech';

    // Placeholder: simple linear scale
    let score = Math.min(1.0, utility / 10);

    // Rarity bonus
    if (rarity === 'rare') score *= 1.1;
    if (rarity === 'unique') score *= 1.2;

    return {
      normalizedScore: Math.min(1.0, score),
      benefit: utility,
      utilityCategory,
      rarity
    };
  }

  /**
   * Compute equipment's action cost
   * Lower action cost = more available
   * @private
   */
  static _computeActionCostAxis(gear) {
    const actionCost = gear.system?.actionCost || 'passive'; // passive, reaction, action, full
    const upfrontCost = gear.system?.setupCost || 0;

    let score = 1.0; // Passive is 1.0 (no cost)

    if (actionCost === 'reaction') score = 0.8;
    if (actionCost === 'action') score = 0.6;
    if (actionCost === 'full-action') score = 0.3;

    // Upfront setup cost reduces score
    if (upfrontCost > 0) {
      score *= Math.max(0.3, 1.0 - (upfrontCost * 0.1));
    }

    return {
      normalizedScore: score,
      actionCost,
      upfrontCost
    };
  }

  /**
   * Resolve armor tradeoff (protection vs mobility)
   * @private
   */
  static _resolveArmorTradeoff(axisA, axisB, charContext) {
    // If character values mobility (high DEX, mobile playstyle)
    let pWeight = 0.5;
    let mWeight = 0.5;

    if (charContext.playstyleHints?.includes('mobile')) {
      mWeight = 0.7; // Mobility is more important
      pWeight = 0.3;
    }

    if (charContext.playstyleHints?.includes('tank')) {
      pWeight = 0.7; // Protection is more important
      mWeight = 0.3;
    }

    const finalScore = pWeight * axisA.normalizedScore + mWeight * (1.0 - axisB.normalizedScore);

    return {
      finalScore: Math.min(1.0, finalScore),
      tradeoffType: axisA.normalizedScore > 0.7 ? 'heavy-protection' : 'light-mobile',
      explanations: [
        `${axisA.band} protection (soak ${axisA.soak})`,
        `${axisB.category} armor${axisB.penalty > 0 ? ` (-${axisB.penalty} mobility)` : ''}`
      ]
    };
  }

  /**
   * Resolve gear tradeoff (utility vs action cost)
   * @private
   */
  static _resolveGearTradeoff(axisA, axisB, charContext) {
    let uWeight = 0.5;
    let aWeight = 0.5;

    // Characters with tactical focus value utilities more
    if (charContext.primaryRole?.includes('caster') || charContext.primaryRole?.includes('leader')) {
      uWeight = 0.7;
      aWeight = 0.3;
    }

    const finalScore = uWeight * axisA.normalizedScore + aWeight * axisB.normalizedScore;

    return {
      finalScore: Math.min(1.0, finalScore),
      tradeoffType: axisA.normalizedScore > 0.7 ? 'high-utility' : 'specialized',
      explanations: [
        `${axisA.utilityCategory} equipment`,
        `Requires ${axisB.actionCost}${axisB.upfrontCost > 0 ? ` (+${axisB.upfrontCost} setup)` : ''}`
      ]
    };
  }


  /**
   * Extract character context (minimal version)
   * @private
   */
  static _extractCharacterContext(character) {
    return {
      characterId: character.id,
      level: character.system?.level?.value ?? 1,
      primaryRole: this._inferRole(character),
      playstyleHints: this._inferPlaystyle(character),
      attributes: {
        str: character.system?.abilities?.str?.mod ?? 0,
        dex: character.system?.abilities?.dex?.mod ?? 0
      }
    };
  }

  /**
   * Infer primary role
   * @private
   */
  static _inferRole(character) {
    const className = character.system?.class?.name || '';
    if (className.includes('Jedi')) return 'caster';
    if (className.includes('Scout')) return 'striker';
    if (className.includes('Soldier')) return 'tank';
    return 'generalist';
  }

  /**
   * Infer playstyle
   * @private
   */
  static _inferPlaystyle(character) {
    const hints = [];
    const dex = character.system?.abilities?.dex?.mod ?? 0;
    const str = character.system?.abilities?.str?.mod ?? 0;

    if (dex > str + 1) hints.push('mobile');
    if (str > dex + 1) hints.push('tank');

    return hints;
  }
}

export default ArmorGearScoringEngine;
