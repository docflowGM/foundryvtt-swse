/**
 * Suggestion Advisory Formatter - Phase 6 Consolidation
 *
 * Unified formatter for displaying suggestions with confidence, tier, and mentor reasoning.
 * Eliminates duplication of advisory display logic between chargen and levelup.
 *
 * CANONICAL: Single formatter for all suggestion display operations across progression flows.
 */

export class SuggestionAdvisoryFormatter {
  /**
   * Format a suggestion for UI display
   * CANONICAL: Use this to prepare suggestion for any display context
   *
   * @param {Object} suggestion - Suggestion object from SuggestionService
   * @param {Object} mentor - Mentor object (optional, for mentor-specific formatting)
   * @returns {Object} Formatted advisory object with all display fields
   */
  static formatForDisplay(suggestion, mentor = null) {
    if (!suggestion) return null;

    const advisory = {
      // Core suggestion fields
      _id: suggestion._id || suggestion.abbrev,
      name: suggestion.name || suggestion.ability,
      tier: suggestion.suggestion?.tier || 0,

      // Phase 4 transparency fields
      reason: suggestion.suggestion?.reason || '',
      explanation: suggestion.suggestion?.explanation || {},
      reasons: suggestion.suggestion?.reasons || [],
      confidence: suggestion.suggestion?.confidence || 0,

      // Phase 4 mentor enrichment fields
      mentorAdvice: suggestion.suggestion?.mentorAdvice || '',
      mentorReasons: suggestion.suggestion?.mentorReasons || [],
      strategicInsight: suggestion.suggestion?.strategicInsight || '',
      mentorConfidence: suggestion.suggestion?.mentorConfidence || 0,

      // Display properties
      cssClass: suggestion.suggestion?.cssClass || '',
      iconClass: suggestion.suggestion?.iconClass || '',
      icon: suggestion.suggestion?.icon || ''
    };

    // Build display text if mentor available
    if (mentor) {
      advisory.displayText = `${mentor.name} suggests: ${advisory.name}`;
      if (advisory.reason) {
        advisory.displayText += ` (${advisory.reason})`;
      }
    }

    return advisory;
  }

  /**
   * Determine if a suggestion should be displayed based on tier threshold
   * @param {Object} suggestion - Suggestion to check
   * @param {number} minTier - Minimum tier to display (default 3)
   * @returns {boolean} True if should display
   */
  static shouldDisplay(suggestion, minTier = 3) {
    if (!suggestion?.suggestion) return false;
    return (suggestion.suggestion.tier || 0) >= minTier;
  }

  /**
   * Sort suggestions by advisor confidence (highest first)
   * @param {Array} suggestions - Suggestions to sort
   * @returns {Array} Sorted suggestions
   */
  static sortByConfidence(suggestions) {
    return [...suggestions].sort((a, b) => {
      const aConf = a.suggestion?.confidence || 0;
      const bConf = b.suggestion?.confidence || 0;
      return bConf - aConf;
    });
  }

  /**
   * Sort suggestions by tier (highest first), then confidence
   * @param {Array} suggestions - Suggestions to sort
   * @returns {Array} Sorted suggestions
   */
  static sortByTierAndConfidence(suggestions) {
    return [...suggestions].sort((a, b) => {
      const aTier = a.suggestion?.tier || 0;
      const bTier = b.suggestion?.tier || 0;
      if (aTier !== bTier) return bTier - aTier;

      const aConf = a.suggestion?.confidence || 0;
      const bConf = b.suggestion?.confidence || 0;
      return bConf - aConf;
    });
  }

  /**
   * Get top N suggestions by ranking
   * @param {Array} suggestions - Suggestions to filter
   * @param {number} count - Number of top suggestions to return
   * @param {string} sortBy - Sort method: 'tier', 'confidence', 'tier+confidence'
   * @returns {Array} Top N suggestions
   */
  static getTopSuggestions(suggestions, count = 1, sortBy = 'tier+confidence') {
    let sorted;
    if (sortBy === 'tier') {
      sorted = suggestions.sort((a, b) => (b.suggestion?.tier || 0) - (a.suggestion?.tier || 0));
    } else if (sortBy === 'confidence') {
      sorted = this.sortByConfidence(suggestions);
    } else {
      sorted = this.sortByTierAndConfidence(suggestions);
    }

    return sorted.slice(0, count);
  }

  /**
   * Format confidence as percentage string
   * @param {number} confidence - Confidence value (0-1)
   * @returns {string} Percentage string (e.g., "85%")
   */
  static formatConfidencePercent(confidence) {
    return `${Math.round((confidence || 0) * 100)}%`;
  }

  /**
   * Get confidence color (for visual indication)
   * @param {number} confidence - Confidence value (0-1)
   * @returns {string} CSS color class or hex value
   */
  static getConfidenceColor(confidence) {
    confidence = confidence || 0;
    if (confidence >= 0.8) return '#4ade80'; // Green
    if (confidence >= 0.6) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  }

  /**
   * Get tier label (for display)
   * @param {number} tier - Tier number (0-6)
   * @returns {string} Human-readable tier label
   */
  static getTierLabel(tier) {
    const tierLabels = {
      0: 'Fallback',
      1: 'Class Synergy',
      2: 'Ability Match',
      3: 'Skill Match',
      4: 'Chain Link',
      5: 'Meta Synergy',
      6: 'Prestige Prereq'
    };
    return tierLabels[tier] || 'Unknown';
  }
}

export default SuggestionAdvisoryFormatter;
