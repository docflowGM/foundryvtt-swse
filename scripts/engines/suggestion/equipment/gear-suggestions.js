/**
 * Gear Suggestions Engine
 *
 * Coordinates gear/equipment scoring and produces ranked, curated suggestions.
 * Evaluates utility items, gadgets, and specialized equipment.
 */

import { SWSELogger } from '../utils/logger.js';
import { assignTier, clampScore } from './shared-scoring-utils.js';

export class GearSuggestions {
  /**
   * Generate gear suggestions for a character
   * @param {Object} character - The character actor
   * @param {Array} gearOptions - Array of gear items to evaluate
   * @param {Object} options - Suggestion options (count, filters, etc.)
   * @returns {Object} Suggestion result with ranked gear and summary
   */
  static generateSuggestions(character, gearOptions = [], options = {}) {
    try {
      if (!character || !character.system) {
        return this._invalidSuggestions('Character data missing');
      }

      if (!gearOptions || gearOptions.length === 0) {
        return this._invalidSuggestions('No gear to evaluate');
      }

      // Score all gear options
      const scored = gearOptions
        .map(gear => this._scoreGear(gear, character, options))
        .filter(result => result && result.combined); // Filter out invalid scores

      // Sort by final score (descending)
      scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore);

      // Group by tier
      const byTier = this._groupByTier(scored);

      // Select top recommendations
      const topCount = options.topCount || 5;
      const topGear = scored.slice(0, topCount);

      // Generate summary
      const summary = this._generateSummary(character, topGear, byTier);

      return {
        characterId: character.id,
        characterName: character.name,

        // Ranked suggestions
        topSuggestions: topGear,
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
      SWSELogger.error('[GearSuggestions] Generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Get suggestions for a specific gear category
   * (e.g., "survival", "medical", "tech")
   * @param {Object} character - The character actor
   * @param {Array} gearOptions - Gear to filter and score
   * @param {String} category - Gear category to filter
   * @param {Object} options - Suggestion options
   * @returns {Object} Category-specific suggestions
   */
  static generateCategorySuggestions(
    character,
    gearOptions = [],
    category = '',
    options = {}
  ) {
    try {
      const categoryLower = category.toLowerCase();
      const filtered = gearOptions.filter(gear => {
        const gearCategory = (gear.system?.category || '').toLowerCase();
        const gearName = (gear.name || '').toLowerCase();
        const tags = (gear.system?.tags || []).map(t => t.toLowerCase());

        return (
          gearCategory === categoryLower ||
          gearName.includes(categoryLower) ||
          tags.includes(categoryLower)
        );
      });

      if (filtered.length === 0) {
        return this._invalidSuggestions(`No gear in category: ${category}`);
      }

      const result = this.generateSuggestions(character, filtered, options);
      result.category = category;

      return result;
    } catch (err) {
      SWSELogger.error('[GearSuggestions] Category generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Score a single gear item
   * @private
   */
  static _scoreGear(gear, character, options = {}) {
    try {
      if (!gear || !gear.system) {
        return null;
      }

      const charContext = this._extractCharacterContext(character);

      // Axis A: Utility value
      const axisA = this._computeUtilityAxis(gear, charContext);

      // Axis B: Action cost / availability
      const axisB = this._computeActionCostAxis(gear, charContext);

      // Role alignment (how useful for this character's role?)
      const roleAlignment = this._computeRoleAlignment(gear, charContext);

      // Base relevance (gatekeeper)
      const baseRelevance = 10;

      // Price bias
      const priceBias = this._scorePriceBias(gear);

      // Final score (additive, bounded 0-100)
      let finalScore = baseRelevance +
        roleAlignment +
        axisA +
        axisB +
        priceBias;

      // NaN protection
      if (!Number.isFinite(finalScore)) finalScore = 0;

      // Clamp to 0-100
      finalScore = clampScore(finalScore, 0, 100);

      // Assign tier (canonical)
      const tier = assignTier(finalScore);

      return {
        gearId: gear.id,
        gearName: gear.name,
        gearType: gear.type || 'equipment',

        components: {
          baseRelevance,
          roleAlignment,
          utility: axisA,
          actionCost: axisB,
          priceBias
        },

        combined: {
          finalScore,
          tier
        },

        explanations: this._generateExplanations(gear, charContext, axisA, axisB, roleAlignment),

        meta: {
          computedAt: Date.now(),
          engineVersion: '1.0.0'
        }
      };
    } catch (err) {
      SWSELogger.error('[GearSuggestions] Scoring failed:', err);
      return null;
    }
  }

  /**
   * Compute utility axis (0-20)
   * @private
   */
  static _computeUtilityAxis(gear, charContext) {
    const utility = gear.system?.utility || 0;
    const rarity = gear.system?.rarity || 'common';

    // Base utility score
    let score = Math.min(20, utility * 2);

    // Rarity bonus
    if (rarity === 'rare') score *= 1.1;
    if (rarity === 'unique') score *= 1.2;

    // Role-specific utility (bonus if matches character's expertise)
    const tags = (gear.system?.tags || []).map(t => t.toLowerCase());
    if (charContext.primaryRole === 'support' && tags.includes('medical')) {
      score += 5;
    }

    return Math.min(20, score);
  }

  /**
   * Compute action cost axis (0-20, inverted: lower cost = higher score)
   * @private
   */
  static _computeActionCostAxis(gear, charContext) {
    const actionCost = gear.system?.actionCost || 'passive';
    const setupCost = gear.system?.setupCost || 0;

    let score = 20; // Start at max (passive)

    if (actionCost === 'reaction') score = 15;
    if (actionCost === 'action') score = 10;
    if (actionCost === 'full-action') score = 5;

    // Setup cost reduces score
    if (setupCost > 0) {
      score -= setupCost * 2;
    }

    return Math.max(0, score);
  }

  /**
   * Compute role alignment (-10 to +10)
   * @private
   */
  static _computeRoleAlignment(gear, charContext) {
    const tags = (gear.system?.tags || []).map(t => t.toLowerCase());
    const primaryRole = charContext.primaryRole || 'generalist';

    let score = 0;

    // Medical gear for support roles
    if (tags.includes('medical') && (primaryRole === 'support' || primaryRole === 'leader')) {
      score += 8;
    }

    // Tech gear for technical roles
    if (tags.includes('tech') && (primaryRole === 'tech' || primaryRole === 'hacker')) {
      score += 8;
    }

    // Survival gear for scouts
    if (tags.includes('survival') && primaryRole === 'scout') {
      score += 5;
    }

    // Universal tools are acceptable for all
    if (tags.includes('utility') || tags.includes('tool')) {
      score += 2;
    }

    return Math.max(-10, Math.min(10, score));
  }

  /**
   * Score price bias
   * @private
   */
  static _scorePriceBias(gear) {
    const price = gear.system?.price || 0;

    if (price < 100) return 2;
    if (price < 500) return 0;
    if (price < 1000) return -2;
    return -4;
  }


  /**
   * Generate explanations for gear score
   * @private
   */
  static _generateExplanations(gear, charContext, axisA, axisB, roleAlignment) {
    const explanations = [];

    // Utility explanation
    if (axisA > 12) {
      explanations.push('Highly useful equipment');
    } else if (axisA > 8) {
      explanations.push('Provides good utility');
    } else if (axisA > 4) {
      explanations.push('Offers some benefit');
    }

    // Action cost explanation
    const actionCost = gear.system?.actionCost || 'passive';
    if (actionCost === 'passive') {
      explanations.push('Always available');
    } else if (actionCost === 'reaction') {
      explanations.push('Quick to activate');
    } else if (actionCost === 'action') {
      explanations.push('Requires your action');
    }

    // Role fit explanation
    if (roleAlignment > 5) {
      explanations.push(`Excellent for your ${charContext.primaryRole} role`);
    } else if (roleAlignment > 0) {
      explanations.push('Fits your playstyle');
    }

    return explanations.slice(0, 3);
  }

  /**
   * Extract character context
   * @private
   */
  static _extractCharacterContext(character) {
    const system = character.system || {};
    const className = system.class?.name || '';

    return {
      characterId: character.id,
      level: system.level?.value ?? 1,
      primaryRole: this._inferRole(className),
      attributes: {
        str: system.abilities?.str?.mod ?? 0,
        dex: system.abilities?.dex?.mod ?? 0,
        int: system.abilities?.int?.mod ?? 0,
        wis: system.abilities?.wis?.mod ?? 0
      }
    };
  }

  /**
   * Infer primary role from class
   * @private
   */
  static _inferRole(className) {
    const lower = (className || '').toLowerCase();
    if (lower.includes('jedi') || lower.includes('sith')) return 'force-user';
    if (lower.includes('scout')) return 'scout';
    if (lower.includes('soldier')) return 'soldier';
    if (lower.includes('scoundrel')) return 'scoundrel';
    if (lower.includes('tech')) return 'tech';
    return 'generalist';
  }

  /**
   * Group scored gear by tier (canonical tier labels)
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

    scored.forEach(gear => {
      const tier = gear.combined.tier || 'Poor';
      if (groups[tier]) {
        groups[tier].push(gear);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([_, gear]) => gear.length > 0)
    );
  }

  /**
   * Generate summary of suggestions
   * @private
   */
  static _generateSummary(character, topGear, byTier) {
    if (topGear.length === 0) {
      return { recommendation: 'No gear recommendations available' };
    }

    const topChoice = topGear[0];
    return {
      recommendation: `${topChoice.gearName} is recommended for your character`,
      topChoice,
      tierSummary: Object.entries(byTier)
        .map(([tier, items]) => `${items.length} ${tier}`)
        .join(', ')
    };
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
}

export default GearSuggestions;
