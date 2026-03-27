/**
 * Advisory Result Formatter — Phase 4 Work Package E
 *
 * Transforms forecast + suggestion results into mentor-ready advisory context.
 * Separates mechanical analysis from presentation/voice.
 *
 * Input:
 * - SuggestionResult (tier, score, reasons)
 * - ForecastResult (unlocks, delays, warnings)
 * - BuildSignals (explicit + inferred intent)
 * - SuggestionContext (current node, constraints)
 *
 * Output:
 * {
 *   topic: string,           // What we're advising on
 *   recommendation: string,  // Primary suggestion
 *   alternatives: [string],  // Secondary options
 *   tradeoffs: [string],    // What you're giving up
 *   warnings: [string],     // Things to watch for
 *   futureImpact: [string], // Long-term consequences
 *   styleHint: string,      // Voice/tone for mentor
 * }
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class AdvisoryResultFormatter {
  /**
   * Format suggestion + forecast into advisory context for mentor.
   *
   * @param {Object} suggestionResult - SuggestionResult from ranking
   * @param {Object} alternativeResults - Array of other top suggestions
   * @param {Object} context - SuggestionContext
   * @returns {Object} Advisory context ready for mentor
   */
  static formatForMentor(suggestionResult, alternativeResults = [], context = {}) {
    try {
      const advisory = {
        topic: this._describeTopic(context),
        recommendation: this._formatRecommendation(suggestionResult),
        alternatives: this._formatAlternatives(alternativeResults, suggestionResult),
        tradeoffs: this._formatTradeoffs(suggestionResult),
        warnings: this._formatWarnings(suggestionResult),
        futureImpact: this._formatFutureImpact(suggestionResult),
        styleHint: this._selectStyleHint(suggestionResult, context),
      };

      swseLogger.debug('[AdvisoryResultFormatter] Advisory formatted:', {
        topic: advisory.topic,
        recommendation: advisory.recommendation.substring(0, 50),
        warnings: advisory.warnings.length,
        style: advisory.styleHint,
      });

      return advisory;
    } catch (err) {
      swseLogger.error('[AdvisoryResultFormatter] Error formatting advisory:', err);
      return {
        topic: 'Character Development',
        recommendation: 'Consider your character\'s goals.',
        alternatives: [],
        tradeoffs: [],
        warnings: ['Advisory system encountered an error.'],
        futureImpact: [],
        styleHint: 'neutral',
      };
    }
  }

  /**
   * Describe the current decision point.
   * @private
   */
  static _describeTopic(context) {
    if (!context.currentNode) {
      return 'Character Development';
    }

    const node = context.currentNode;
    if (typeof node === 'object' && node.label) {
      return `Selecting ${node.label}`;
    }
    if (typeof node === 'string') {
      return `Selecting ${node}`;
    }

    return 'Character Development';
  }

  /**
   * Format the top recommendation.
   * @private
   */
  static _formatRecommendation(result) {
    if (!result) return 'Make a choice aligned with your build.';

    const name = result.optionName || 'Unknown';
    const topReason = result.reasons?.[0];

    if (!topReason) {
      return `Consider ${name}.`;
    }

    // Map reason type to mentor guidance
    const reasonGuidance = {
      'prestige-prerequisite': `${name} is a key step toward your prestige class.`,
      'chain-continuation': `${name} continues your current specialization.`,
      'archetype-synergy': `${name} strengthens your ${result.optionName}-focused build.`,
      'ability-synergy': `${name} scales well with your attributes.`,
      'skill-synergy': `${name} complements your trained skills.`,
      'class-synergy': `${name} is a strong fit for your class.`,
      'survey-signal': `${name} matches your stated preferences.`,
    };

    return reasonGuidance[topReason.type] || `Consider ${name}.`;
  }

  /**
   * Format alternative options.
   * @private
   */
  static _formatAlternatives(alternatives, primaryResult) {
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      return [];
    }

    return alternatives
      .filter(alt => alt.optionId !== primaryResult.optionId)
      .slice(0, 2)  // Only top 2 alternatives
      .map(alt => {
        const reason = alt.reasons?.[0]?.text || `Also consider ${alt.optionName}`;
        return `${alt.optionName}: ${reason}`;
      });
  }

  /**
   * Format tradeoffs in human-readable form.
   * @private
   */
  static _formatTradeoffs(result) {
    if (!result.tradeoffs || result.tradeoffs.length === 0) {
      return [];
    }

    return result.tradeoffs.map(tradeoff => {
      const impact = tradeoff.impact || 'medium';
      const impactLabel = impact === 'high' ? 'significantly' : impact === 'low' ? 'slightly' : '';
      return `${tradeoff.text} (${impactLabel} impacts your build)`.trim();
    });
  }

  /**
   * Format warnings in advisory tone.
   * @private
   */
  static _formatWarnings(result) {
    if (!result.warnings || result.warnings.length === 0) {
      return [];
    }

    return result.warnings.map(warning => {
      const levelIcon = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'caution': '⚠️⚠️',
        'urgent': '🔴',
      }[warning.level] || '•';

      return `${levelIcon} ${warning.text}`;
    });
  }

  /**
   * Format long-term impact.
   * @private
   */
  static _formatFutureImpact(result) {
    const impact = [];

    // Unlocks
    if (result.forecastSummary?.unlocks && result.forecastSummary.unlocks.length > 0) {
      impact.push(`Will unlock: ${result.forecastSummary.unlocks.join(', ')}`);
    }

    // Delays
    if (result.forecastSummary?.delays && Object.keys(result.forecastSummary.delays).length > 0) {
      const delayDescriptions = Object.entries(result.forecastSummary.delays)
        .map(([target, levels]) => `${target} by ${levels} level(s)`)
        .join(', ');
      impact.push(`May delay: ${delayDescriptions}`);
    }

    // Blocks
    if (result.forecastSummary?.blocks && result.forecastSummary.blocks.length > 0) {
      impact.push(`Could block access to: ${result.forecastSummary.blocks.join(', ')}`);
    }

    return impact;
  }

  /**
   * Select mentor voice/style based on context.
   * @private
   */
  static _selectStyleHint(result, context) {
    // If high confidence (tier 5+), mentor is encouraging
    if ((result.tier ?? 0) >= 5) {
      return 'encouraging';
    }

    // If warnings, mentor is cautious
    if ((result.warnings ?? []).length > 0) {
      return 'cautious';
    }

    // If tradeoffs, mentor is analytical
    if ((result.tradeoffs ?? []).length > 0) {
      return 'analytical';
    }

    // Default is neutral/balanced
    return 'neutral';
  }

  /**
   * Format summary for review/confirmation step.
   *
   * @param {Array} suggestionResults - All suggestions made during progression
   * @param {Object} projectedCharacter - Final projected character
   * @returns {Object} Summary advisory
   */
  static formatForReview(suggestionResults, projectedCharacter) {
    try {
      const summary = {
        totalChoices: suggestionResults.length,
        topTierChoices: suggestionResults.filter(s => (s.tier ?? 0) >= 5).length,
        warningCount: suggestionResults.reduce((sum, s) => sum + (s.warnings?.length ?? 0), 0),
        majorTradeoffs: this._extractMajorTradeoffs(suggestionResults),
        projectionStrengths: this._identifyProjectionStrengths(projectedCharacter),
        projectionWeaknesses: this._identifyProjectionWeaknesses(projectedCharacter),
        finalAdvice: this._generateFinalAdvice(suggestionResults, projectedCharacter),
      };

      return summary;
    } catch (err) {
      swseLogger.error('[AdvisoryResultFormatter] Error formatting review:', err);
      return {
        totalChoices: 0,
        topTierChoices: 0,
        warningCount: 0,
        majorTradeoffs: [],
        projectionStrengths: [],
        projectionWeaknesses: [],
        finalAdvice: 'Review your character build carefully.',
      };
    }
  }

  /**
   * Extract major tradeoffs from all suggestions.
   * @private
   */
  static _extractMajorTradeoffs(suggestions) {
    return suggestions
      .filter(s => s.tradeoffs?.some(t => t.impact === 'high'))
      .slice(0, 3)  // Top 3
      .map(s => `${s.optionName}: ${s.tradeoffs.find(t => t.impact === 'high')?.text}`);
  }

  /**
   * Identify strengths in projected character.
   * @private
   */
  static _identifyProjectionStrengths(projection) {
    const strengths = [];

    if (!projection) return strengths;

    // Look for high attributes
    if (projection.attributes) {
      const highAttrs = Object.entries(projection.attributes)
        .filter(([_, value]) => value >= 16)
        .map(([attr, value]) => `${attr} ${value}`);
      if (highAttrs.length > 0) {
        strengths.push(`Strong attributes: ${highAttrs.join(', ')}`);
      }
    }

    // Look for specialized abilities
    const abilityTypes = ['feats', 'talents', 'forcePowers'];
    for (const type of abilityTypes) {
      const count = projection.abilities?.[type]?.length || 0;
      if (count >= 3) {
        strengths.push(`Well-developed ${type}`);
      }
    }

    return strengths;
  }

  /**
   * Identify weaknesses in projected character.
   * @private
   */
  static _identifyProjectionWeaknesses(projection) {
    const weaknesses = [];

    if (!projection) return weaknesses;

    // Look for low attributes
    if (projection.attributes) {
      const lowAttrs = Object.entries(projection.attributes)
        .filter(([_, value]) => value <= 8)
        .map(([attr, value]) => attr);
      if (lowAttrs.length > 0) {
        weaknesses.push(`Low ability scores: ${lowAttrs.join(', ')}`);
      }
    }

    // Look for missing abilities
    const expectedAbilities = projection.identity?.class ? 2 : 0;
    const actualAbilities = projection.abilities?.feats?.length || 0;
    if (actualAbilities < expectedAbilities) {
      weaknesses.push('Limited feat selections');
    }

    return weaknesses;
  }

  /**
   * Generate final piece of advice.
   * @private
   */
  static _generateFinalAdvice(suggestions, projection) {
    const topTierCount = suggestions.filter(s => (s.tier ?? 0) >= 5).length;
    const totalCount = suggestions.length;
    const confidence = topTierCount / Math.max(1, totalCount);

    if (confidence >= 0.7) {
      return 'Your build is focused and coherent. Good work.';
    } else if (confidence >= 0.4) {
      return 'Your build is diverse. Consider whether this aligns with your goals.';
    } else {
      return 'Your build is eclectic. Make sure the pieces work together.';
    }
  }
}
