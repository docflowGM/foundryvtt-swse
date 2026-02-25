/**
 * PlayerAnalytics
 *
 * PHASE F PART 3: God Object Split - Analytics Layer
 *
 * Calculates metrics and analytics from selection history.
 * Pure calculation logic - no recording, no persistence.
 *
 * Owns:
 * - Acceptance rate calculation by theme
 * - Ignored theme weight calculation
 * - Metrics aggregation
 * - Time decay factors
 * - Statistical aggregation
 *
 * Delegates to: SelectionRecorder (for history access)
 * Never owns: Recording, persistence, state mutations
 */

import { SWSELogger } from '../../utils/logger.js';

export class PlayerAnalytics {
  /**
   * Calculate acceptance rate for a specific theme
   *
   * @param {Actor} actor - Target actor
   * @param {string} theme - Theme to analyze
   * @returns {number} 0-1 (accepted / (accepted + mentorIgnored))
   */
  static getAcceptanceRateByTheme(actor, theme) {
    try {
      const aggregates = actor?.system?.suggestionEngine?.history?.aggregates;
      if (!aggregates?.acceptanceRateByTheme) {
        return 0.5; // Default: neutral
      }
      return aggregates.acceptanceRateByTheme[theme] ?? 0.5;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error getting acceptance rate:', err);
      return 0.5;
    }
  }

  /**
   * Calculate negative weights for ignored themes
   *
   * @param {Actor} actor - Target actor
   * @returns {Object} { themeName: weight, ... }
   */
  static getIgnoredThemeWeights(actor) {
    try {
      const aggregates = actor?.system?.suggestionEngine?.history?.aggregates;
      if (!aggregates?.ignoredThemeWeights) {
        return {};
      }
      return aggregates.ignoredThemeWeights;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error getting ignored theme weights:', err);
      return {};
    }
  }

  /**
   * Get time since last suggestion (for cooldown)
   *
   * @param {Actor} actor - Target actor
   * @returns {number} Timestamp or 0 if never suggested
   */
  static getLastSuggestionTime(actor) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent;
      if (!history || history.length === 0) {
        return 0;
      }
      return history[history.length - 1].shownAt || 0;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error getting last suggestion time:', err);
      return 0;
    }
  }

  /**
   * Calculate aggregated metrics from history
   * Pure calculation - no state mutations
   *
   * @param {Array} history - Recent history entries (from actor.system.suggestionEngine.history.recent)
   * @param {number} currentLevel - Current actor level (for time decay)
   * @returns {Object} { acceptanceRateByTheme, ignoredThemeWeights, lastUpdatedAtLevel }
   */
  static calculateMetrics(history = [], currentLevel = 1) {
    try {
      const aggregates = {
        acceptanceRateByTheme: {},
        ignoredThemeWeights: {},
        lastUpdatedAtLevel: currentLevel
      };

      if (!history || history.length === 0) {
        return aggregates;
      }

      // Group suggestions by theme
      const themeStats = {};
      for (const entry of history) {
        if (!entry.theme) continue;

        if (!themeStats[entry.theme]) {
          themeStats[entry.theme] = {
            shown: 0,
            accepted: 0,
            mentorIgnored: 0,
            passiveIgnored: 0
          };
        }

        themeStats[entry.theme].shown++;
        if (entry.outcome === 'accepted') {
          themeStats[entry.theme].accepted++;
        } else if (entry.outcome === 'mentorIgnored') {
          themeStats[entry.theme].mentorIgnored++;
        } else if (entry.outcome === 'passiveIgnored') {
          themeStats[entry.theme].passiveIgnored++;
        }
      }

      // Calculate acceptance rates and ignored weights
      for (const [theme, stats] of Object.entries(themeStats)) {
        // Acceptance rate: accepted / (accepted + mentor-ignored)
        // Only use mentor ignores as strong signal, not passive ignores
        // Early-game guard: require 3+ total samples to avoid overfitting
        const denominator = stats.accepted + stats.mentorIgnored;
        if (denominator >= 3) {
          aggregates.acceptanceRateByTheme[theme] = stats.accepted / denominator;
        } else if (denominator > 0) {
          // 1-2 samples: use neutral prior
          aggregates.acceptanceRateByTheme[theme] = 0.5;
        }

        // Ignored weight: penalty based on mentor-ignored count with time decay
        // Only penalize if 2+ mentor ignores
        // Soft minimum sample size: max(shown, 5)
        // Time decay: recent ignores worth more than old ones
        if (stats.mentorIgnored >= 2) {
          // Calculate decay-weighted ignore count
          let decayedIgnoreCount = 0;
          for (const entry of history) {
            if (entry.theme !== theme || entry.outcome !== 'mentorIgnored') continue;

            const ageInLevels = currentLevel - (entry.level || currentLevel);
            let decayFactor = 1.0; // Last 3 levels: 100%
            if (ageInLevels > 3 && ageInLevels <= 6) {
              decayFactor = 0.5; // 4-6 levels ago: 50%
            } else if (ageInLevels > 6) {
              decayFactor = 0.25; // 7+ levels ago: 25%
            }

            decayedIgnoreCount += decayFactor;
          }

          // Calculate penalty with soft minimum sample size
          const softMinShown = Math.max(stats.shown, 5);
          const ignorePenalty = Math.min(0.3, 0.1 * (decayedIgnoreCount / softMinShown));
          aggregates.ignoredThemeWeights[theme] = -ignorePenalty;
        }
      }

      return aggregates;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error calculating metrics:', err);
      return {
        acceptanceRateByTheme: {},
        ignoredThemeWeights: {},
        lastUpdatedAtLevel: currentLevel
      };
    }
  }

  /**
   * Calculate total acceptance rate across all themes
   *
   * @param {Array} history - Recent history entries
   * @returns {number} 0-1 overall acceptance rate
   */
  static calculateOverallAcceptanceRate(history = []) {
    try {
      if (!history || history.length === 0) {
        return 0.5; // Default neutral
      }

      const outcomes = history.reduce(
        (acc, entry) => {
          if (entry.outcome === 'accepted') {
            acc.accepted++;
          } else if (entry.outcome === 'mentorIgnored') {
            acc.mentorIgnored++;
          }
          return acc;
        },
        { accepted: 0, mentorIgnored: 0 }
      );

      const denominator = outcomes.accepted + outcomes.mentorIgnored;
      if (denominator === 0) {
        return 0.5;
      }

      return outcomes.accepted / denominator;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error calculating overall acceptance rate:', err);
      return 0.5;
    }
  }

  /**
   * Determine dominant theme from history
   *
   * @param {Array} history - Recent history entries
   * @returns {string|null} Most frequent theme
   */
  static getDominantTheme(history = []) {
    try {
      const themeCounts = {};
      for (const entry of history) {
        if (!entry.theme) continue;
        themeCounts[entry.theme] = (themeCounts[entry.theme] || 0) + 1;
      }

      let dominantTheme = null;
      let maxCount = 0;
      for (const [theme, count] of Object.entries(themeCounts)) {
        if (count > maxCount) {
          dominantTheme = theme;
          maxCount = count;
        }
      }

      return dominantTheme;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error determining dominant theme:', err);
      return null;
    }
  }

    /**
   * Calculate theme frequency distribution
   *
   * @param {Array} history - Recent history entries
   * @returns {Object} { theme: frequency, ... }
   */
  static getThemeDistribution(history = []) {
    try {
      const distribution = {};
      let total = 0;

      for (const entry of history) {
        if (!entry.theme) continue;
        distribution[entry.theme] = (distribution[entry.theme] || 0) + 1;
        total++;
      }

      // Convert to percentages
      const percentages = {};
      for (const [theme, count] of Object.entries(distribution)) {
        percentages[theme] = total > 0 ? count / total : 0;
      }

      return percentages;
    } catch (err) {
      SWSELogger.error('[PlayerAnalytics] Error getting theme distribution:', err);
      return {};
    }
  }
}