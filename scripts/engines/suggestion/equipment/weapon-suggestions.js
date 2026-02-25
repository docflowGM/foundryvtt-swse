/**
 * Weapon Suggestions Engine
 *
 * Coordinates weapon scoring and produces ranked, curated suggestions.
 * Filters, sorts, and presents top recommendations for a character.
 */

import { WeaponScoringEngine } from './weapon-scoring-engine.js';
import { SWSELogger } from '../../../utils/logger.js';

export class WeaponSuggestions {
  /**
   * Generate weapon suggestions for a character
   * @param {Object} character - The character actor
   * @param {Array} weaponOptions - Array of weapon items to evaluate
   * @param {Object} options - Suggestion options (count, filters, etc.)
   * @returns {Object} Suggestion result with ranked weapons and summary
   */
  static generateSuggestions(character, weaponOptions = [], options = {}) {
    try {
      if (!character || !character.system) {
        return this._invalidSuggestions('Character data missing');
      }

      if (!weaponOptions || weaponOptions.length === 0) {
        return this._invalidSuggestions('No weapons to evaluate');
      }

      // Score all weapons
      const scored = weaponOptions
        .map(weapon => WeaponScoringEngine.scoreWeapon(weapon, character, options))
        .filter(result => result.combined); // Filter out invalid scores

      // Sort by final score (descending)
      scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore);

      // Group by tier
      const byTier = this._groupByTier(scored);

      // Select top recommendations (default 5, configurable)
      const topCount = options.topCount || 5;
      const topWeapons = scored.slice(0, topCount);

      // Generate summary
      const summary = this._generateSummary(character, topWeapons, byTier);

      return {
        characterId: character.id,
        characterName: character.name,

        // Ranked suggestions
        topSuggestions: topWeapons,
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
      SWSELogger.error('[WeaponSuggestions] Generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Get suggestions for a specific weapon category
   * (e.g., "Blaster Pistols", "Vibroweapons")
   * @param {Object} character - The character actor
   * @param {Array} weaponOptions - Weapons to filter and score
   * @param {String} category - Weapon category/group to filter
   * @param {Object} options - Suggestion options
   * @returns {Object} Category-specific suggestions
   */
  static generateCategorySuggestions(
    character,
    weaponOptions = [],
    category = '',
    options = {}
  ) {
    try {
      // Filter by category
      const filtered = weaponOptions.filter(weapon => {
        const weaponGroup = (weapon.system?.group || '').toLowerCase();
        const weaponName = (weapon.name || '').toLowerCase();
        const categoryLower = category.toLowerCase();

        return weaponGroup.includes(categoryLower) || weaponName.includes(categoryLower);
      });

      if (filtered.length === 0) {
        return this._invalidSuggestions(`No weapons in category: ${category}`);
      }

      // Generate suggestions for this subset
      const result = this.generateSuggestions(character, filtered, options);
      result.category = category;

      return result;
    } catch (err) {
      SWSELogger.error('[WeaponSuggestions] Category generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Compare two specific weapons for a character
   * (e.g., "Should I use Blaster Pistol A or B?")
   * @param {Object} character - The character actor
   * @param {Object} weaponA - First weapon to compare
   * @param {Object} weaponB - Second weapon to compare
   * @returns {Object} Comparison result with scores, winner, analysis
   */
  static compareWeapons(character, weaponA, weaponB) {
    try {
      if (!character || !character.system) {
        return this._invalidComparison('Character data missing');
      }

      if (!weaponA || !weaponB) {
        return this._invalidComparison('Weapon data missing');
      }

      const scoreA = WeaponScoringEngine.scoreWeapon(weaponA, character);
      const scoreB = WeaponScoringEngine.scoreWeapon(weaponB, character);

      const delta = scoreA.combined.finalScore - scoreB.combined.finalScore;
      const winner = delta > 0 ? 'A' : delta < 0 ? 'B' : 'tie';

      return {
        characterId: character.id,
        weaponA: {
          id: weaponA.id,
          name: weaponA.name,
          score: scoreA.combined.finalScore,
          tier: scoreA.combined.tier,
          component: scoreA.components
        },
        weaponB: {
          id: weaponB.id,
          name: weaponB.name,
          score: scoreB.combined.finalScore,
          tier: scoreB.combined.tier,
          component: scoreB.components
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
      SWSELogger.error('[WeaponSuggestions] Comparison failed:', err);
      return this._invalidComparison(err.message);
    }
  }

  /**
   * Group scored weapons by tier
   * @private
   */
  static _groupByTier(scored) {
    const groups = {
      perfect: [],
      excellent: [],
      good: [],
      viable: [],
      marginal: [],
      poor: []
    };

    scored.forEach(weapon => {
      const tier = weapon.combined.tier || 'poor';
      if (groups[tier]) {
        groups[tier].push(weapon);
      }
    });

    // Remove empty tiers
    return Object.fromEntries(
      Object.entries(groups).filter(([_, weapons]) => weapons.length > 0)
    );
  }

  /**
   * Generate summary of suggestions
   * @private
   */
  static _generateSummary(character, topWeapons, byTier) {
    if (topWeapons.length === 0) {
      return { recommendation: 'No viable weapons found', topChoice: null };
    }

    const topWeapon = topWeapons[0];
    const topScore = topWeapon.combined.finalScore;

    // Cluster analysis: how close are top weapons?
    const clustered = topWeapons.length > 1
      && Math.abs(topWeapons[1].combined.finalScore - topScore) < 5;

    let recommendation = `${topWeapon.weaponName} is your best choice`;
    if (clustered) {
      recommendation += ` (or ${topWeapons.slice(1, 3).map(w => w.weaponName).join('/')})`;
    }

    return {
      recommendation,
      topChoice: topWeapon,
      tierSummary: Object.entries(byTier)
        .map(([tier, weapons]) => `${weapons.length} ${tier}`)
        .join(', ')
    };
  }

  /**
   * Analyze comparison between two weapons
   * @private
   */
  static _analyzeComparison(scoreA, scoreB) {
    const delta = scoreA.combined.finalScore - scoreB.combined.finalScore;
    const threshold = 3; // Significant difference threshold

    if (Math.abs(delta) < threshold) {
      return 'Very similar effectiveness; choose based on preference';
    }

    if (delta > 0) {
      // A is better
      const componentDiffs = {
        axisA: (scoreA.axisA.score - scoreB.axisA.score).toFixed(1),
        axisB: (scoreA.axisB.score - scoreB.axisB.score).toFixed(1),
        roleAlignment: (scoreA.components.roleAlignment - scoreB.components.roleAlignment).toFixed(1)
      };

      let reason = 'Weapon A wins because of ';
      const reasons = [];

      if (Math.abs(componentDiffs.axisA) > 1) {
        reasons.push(`better damage (${componentDiffs.axisA})`);
      }
      if (Math.abs(componentDiffs.axisB) > 1) {
        reasons.push(`better accuracy/traits (${componentDiffs.axisB})`);
      }
      if (Math.abs(componentDiffs.roleAlignment) > 1) {
        reasons.push(`better role fit (${componentDiffs.roleAlignment})`);
      }

      return reason + (reasons.length > 0 ? reasons.join(' and ') : 'better overall fit');
    } else {
      // B is better (flip the logic)
      return 'Weapon B is the stronger choice';
    }
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

export default WeaponSuggestions;
