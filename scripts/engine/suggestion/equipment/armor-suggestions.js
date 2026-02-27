/**
 * Armor Suggestions Engine
 *
 * Coordinates armor scoring and produces ranked, curated suggestions.
 * Filters, sorts, and presents top armor recommendations for a character.
 */

import { ArmorScoringEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/armor-scoring-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { assignTier } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";

export class ArmorSuggestions {
  /**
   * Generate armor suggestions for a character
   * @param {Object} character - The character actor
   * @param {Array} armorOptions - Array of armor items to evaluate
   * @param {Object} options - Suggestion options (count, filters, etc.)
   * @returns {Object} Suggestion result with ranked armor and summary
   */
  static generateSuggestions(character, armorOptions = [], options = {}) {
    try {
      if (!character || !character.system) {
        return this._invalidSuggestions('Character data missing');
      }

      // Include "No Armor" as a virtual baseline option
      const allOptions = armorOptions || [];
      const noArmorVirtual = this._generateNoArmorVirtual(character);

      // Score all armor options
      const scored = allOptions
        .map(armor => ArmorScoringEngine.scoreArmor(armor, character, options))
        .filter(result => result.combined); // Filter out invalid scores

      // Always include "No Armor" scoring
      scored.push(noArmorVirtual);

      // Sort by final score (descending)
      scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore);

      // Group by tier
      const byTier = this._groupByTier(scored);

      // Select top recommendations (default 3 for armor, since fewer options)
      const topCount = options.topCount || 3;
      const topArmor = scored.slice(0, topCount);

      // Generate summary
      const summary = this._generateSummary(character, topArmor, byTier);

      return {
        characterId: character.id,
        characterName: character.name,

        // Ranked suggestions
        topSuggestions: topArmor,
        allScored: scored,

        // Summary statistics
        summary,

        // Tier breakdown
        byTier,

        // Metadata
        meta: {
          evaluatedCount: scored.length,
          computedAt: Date.now(),
          engineVersion: '1.0.0'
        }
      };
    } catch (err) {
      SWSELogger.error('[ArmorSuggestions] Generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Get suggestions for a specific armor category
   * (e.g., "Light", "Medium", "Heavy")
   * @param {Object} character - The character actor
   * @param {Array} armorOptions - Armor to filter and score
   * @param {String} category - Armor category to filter
   * @param {Object} options - Suggestion options
   * @returns {Object} Category-specific suggestions
   */
  static generateCategorySuggestions(
    character,
    armorOptions = [],
    category = '',
    options = {}
  ) {
    try {
      // Filter by category
      const categoryLower = category.toLowerCase();
      const filtered = armorOptions.filter(armor => {
        const armorCategory = (armor.system?.category || '').toLowerCase();
        return armorCategory === categoryLower;
      });

      if (filtered.length === 0) {
        return this._invalidSuggestions(`No armor in category: ${category}`);
      }

      // Generate suggestions for this subset
      const result = this.generateSuggestions(character, filtered, options);
      result.category = category;

      return result;
    } catch (err) {
      SWSELogger.error('[ArmorSuggestions] Category generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Compare two specific armor options for a character
   * @param {Object} character - The character actor
   * @param {Object} armorA - First armor to compare
   * @param {Object} armorB - Second armor to compare
   * @returns {Object} Comparison result with scores, winner, analysis
   */
  static compareArmor(character, armorA, armorB) {
    try {
      if (!character || !character.system) {
        return this._invalidComparison('Character data missing');
      }

      if (!armorA || !armorB) {
        return this._invalidComparison('Armor data missing');
      }

      const scoreA = ArmorScoringEngine.scoreArmor(armorA, character);
      const scoreB = ArmorScoringEngine.scoreArmor(armorB, character);

      const delta = scoreA.combined.finalScore - scoreB.combined.finalScore;
      const winner = delta > 0 ? 'A' : delta < 0 ? 'B' : 'tie';

      return {
        characterId: character.id,
        armorA: {
          id: armorA.id,
          name: armorA.name,
          score: scoreA.combined.finalScore,
          tier: scoreA.combined.tier,
          axisA: scoreA.axisA.score,
          axisB: scoreB.axisB.score
        },
        armorB: {
          id: armorB.id,
          name: armorB.name,
          score: scoreB.combined.finalScore,
          tier: scoreB.combined.tier,
          axisA: scoreB.axisA.score,
          axisB: scoreB.axisB.score
        },
        comparison: {
          winner,
          delta: Math.abs(delta).toFixed(2),
          analysis: this._analyzeComparison(scoreA, scoreB)
        },
        meta: {
          computedAt: Date.now(),
          engineVersion: '1.0.0'
        }
      };
    } catch (err) {
      SWSELogger.error('[ArmorSuggestions] Comparison failed:', err);
      return this._invalidComparison(err.message);
    }
  }

  /**
   * Group scored armor by tier
   * @private
   */
  static _groupByTier(scored) {
    const groups = {
      'Perfect': [],
      'Excellent': [],
      'Good': [],
      'Viable': [],
      'Marginal': [],
      'Poor': []
    };

    scored.forEach(armor => {
      const tier = armor.combined.tier || 'Poor';
      if (groups[tier]) {
        groups[tier].push(armor);
      }
    });

    // Remove empty tiers
    return Object.fromEntries(
      Object.entries(groups).filter(([_, armor]) => armor.length > 0)
    );
  }

  /**
   * Generate summary of suggestions
   * @private
   */
  static _generateSummary(character, topArmor, byTier) {
    if (topArmor.length === 0) {
      return { recommendation: 'No viable armor found', topChoice: null };
    }

    const topChoice = topArmor[0];
    const topScore = topChoice.combined.finalScore;

    // Check for tight clustering
    const clustered = topArmor.length > 1
      && Math.abs(topArmor[1].combined.finalScore - topScore) < 3;

    let recommendation = `${topChoice.armorName} is your best choice`;
    if (clustered && topArmor.length > 1) {
      recommendation += ` (or ${topArmor[1].armorName})`;
    }

    return {
      recommendation,
      topChoice,
      tierSummary: Object.entries(byTier)
        .map(([tier, armors]) => `${armors.length} ${tier}`)
        .join(', ')
    };
  }

  /**
   * Analyze comparison between two armor options
   * @private
   */
  static _analyzeComparison(scoreA, scoreB) {
    const delta = scoreA.combined.finalScore - scoreB.combined.finalScore;
    const threshold = 2; // Significant difference threshold for armor

    if (Math.abs(delta) < threshold) {
      return 'Very similar trade-offs; choose based on preference and availability';
    }

    if (delta > 0) {
      // A is better
      const survivalDiff = (scoreA.axisA.score - scoreB.axisA.score).toFixed(1);
      const mobilityCostDiff = (scoreA.axisB.score - scoreB.axisB.score).toFixed(1);

      let reasons = [];
      if (Math.abs(survivalDiff) > 1) {
        reasons.push(`better protection (${survivalDiff})`);
      }
      if (Math.abs(mobilityCostDiff) > 1) {
        reasons.push(`better mobility (${mobilityCostDiff})`);
      }

      return 'Armor A is superior because of: ' + (reasons.length > 0 ? reasons.join(' and ') : 'better overall fit');
    } else {
      // B is better
      return 'Armor B is the stronger choice';
    }
  }

  /**
   * Generate "No Armor" as a virtual option (first-class baseline)
   * Always evaluated, can win, ensures engine says "don't buy anything" if appropriate
   * @private
   */
  static _generateNoArmorVirtual(character) {
    const charLevel = character.system?.level?.value ?? 1;

    // "No Armor" scores very low at low levels (Heroic bonus is small)
    // But at high levels without armor talents, it can be competitive
    const hasArmorTalents = !!(
      character.system?.talents?.armoredDefense ||
      character.system?.talents?.improvedArmoredDefense ||
      character.system?.talents?.armorMastery
    );

    // Base score: Heroic Level only (no soak)
    let score = 5; // Baseline presence

    // If character has armor talents, "No Armor" is penalized (talents are unused)
    if (hasArmorTalents) {
      score = Math.max(0, score - 8); // Strong penalty if talents present
    }

    // Tier assignment (canonical)
    const tier = assignTier(score);

    return {
      armorId: 'NO_ARMOR',
      armorName: 'No Armor',
      armorType: 'virtual',

      components: {
        baseRelevance: 5,
        roleAlignment: hasArmorTalents ? -8 : 0,
        axisA: 0,
        axisB: 0,
        priceBias: 0
      },

      axisA: {
        score: 0,
        band: 'none',
        withTalents: {
          armoredDefense: false,
          improvedArmoredDefense: false
        }
      },

      axisB: {
        score: 0,
        category: 'none',
        cost: 0
      },

      combined: {
        finalScore: score,
        tier
      },

      explanations: this._generateNoArmorExplanations(character, hasArmorTalents),

      meta: {
        isVirtual: true,
        computedAt: Date.now(),
        engineVersion: '1.0.0'
      }
    };
  }

  /**
   * Generate explanations for "No Armor" option
   * @private
   */
  static _generateNoArmorExplanations(character, hasArmorTalents) {
    const explanations = [];

    // Primary: always explain the baseline
    explanations.push('No soak—relies on Heroic Level defense only');

    // Secondary: talent context
    if (hasArmorTalents) {
      explanations.push('Your armor talents are unused without equipped armor');
    }

    // Tertiary: role context
    const primaryRole = character.system?.class?.name || 'generalist';
    if (primaryRole.toLowerCase().includes('defender') || primaryRole.toLowerCase().includes('tank')) {
      explanations.push('Defender role typically benefits from armor');
    }

    return explanations;
  }

  /**
   * Return standardized invalid suggestions result
   * @private
   */
  static _invalidSuggestions(reason) {
    return {
      valid: false,
      reason,
      topSuggestions: [],
      allScored: [],
      summary: { recommendation: `Error: ${reason}` },
      byTier: {},
      meta: { computedAt: Date.now(), engineVersion: '1.0.0' }
    };
  }

  /**
   * Return standardized invalid comparison result
   * @private
   */
  static _invalidComparison(reason) {
    return {
      valid: false,
      reason,
      comparison: null,
      meta: { computedAt: Date.now(), engineVersion: '1.0.0' }
    };
  }
}

export default ArmorSuggestions;
