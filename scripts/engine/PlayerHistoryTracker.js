/**
 * PlayerHistoryTracker
 *
 * Records suggestion feedback (shown/accepted/ignored/rejected).
 * Calculates acceptance rates by theme and ignored theme weights.
 * Maintains recent history (10-15 selections) to avoid overfitting.
 *
 * Phase 1C: Complete implementation with storage + calculations.
 */

import { SWSELogger } from '../utils/logger.js';

const MAX_RECENT_SIZE = 15;

export class PlayerHistoryTracker {

  /**
   * Record that a suggestion was shown to the player
   * @param {Actor} actor
   * @param {Object} suggestion - { itemId, itemName, category, theme }
   * @param {Object} confidence - { confidence, level }
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence }
   * @returns {Promise<string>} Suggestion ID (for later tracking)
   */
  static async recordSuggestionShown(actor, suggestion, confidence, context) {
    try {
      // Ensure storage is initialized
      await this.initializeStorage(actor);

      // Generate unique ID
      const suggestionId = `sugg_${actor.uuid}_${Date.now()}`;

      // Create history entry
      const entry = {
        id: suggestionId,
        itemId: suggestion.itemId,
        itemName: suggestion.itemName,
        category: suggestion.category || 'feat',
        theme: suggestion.theme,
        level: actor.system.level || 1,
        shownAt: Date.now(),
        outcome: null,  // Will be set to 'accepted', 'ignored', or 'passiveIgnored'
        outcomeAt: null,
        confidence: confidence.confidence,
        confidenceLevel: confidence.level,
        context: { ...context }
      };

      // Add to recent history
      actor.system.suggestionEngine.history.recent.push(entry);

      // Prune if needed
      if (actor.system.suggestionEngine.history.recent.length > MAX_RECENT_SIZE) {
        actor.system.suggestionEngine.history.recent.shift();
      }

      // Update meta
      if (!actor.system.suggestionEngine.meta) {
        actor.system.suggestionEngine.meta = {
          version: 1,
          created: Date.now(),
          lastUpdated: Date.now(),
          lastUpdatedAtLevel: actor.system.level || 1,
          totalSuggestionsShown: 0,
          totalSuggestionsAccepted: 0,
          totalSuggestionsIgnored: 0
        };
      }
      actor.system.suggestionEngine.meta.totalSuggestionsShown++;
      actor.system.suggestionEngine.meta.lastUpdated = Date.now();

      SWSELogger.log(`[HistoryTracker] Suggestion shown: ${suggestion.itemName} (${suggestionId})`);
      return suggestionId;
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording shown suggestion:', err);
      throw err;
    }
  }

  /**
   * Record that player accepted a suggestion
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionAccepted(actor, suggestionId) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.warn(`[HistoryTracker] No history found for acceptance: ${suggestionId}`);
        return;
      }

      const entry = history.find(e => e.id === suggestionId);
      if (!entry) {
        SWSELogger.warn(`[HistoryTracker] Suggestion not found in history: ${suggestionId}`);
        return;
      }

      entry.outcome = 'accepted';
      entry.outcomeAt = Date.now();

      // Update meta
      if (actor.system.suggestionEngine.meta) {
        actor.system.suggestionEngine.meta.totalSuggestionsAccepted++;
        actor.system.suggestionEngine.meta.lastUpdated = Date.now();
      }

      SWSELogger.log(`[HistoryTracker] Suggestion accepted: ${entry.itemName}`);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording accepted suggestion:', err);
      throw err;
    }
  }

  /**
   * Record mentor dialog ignore (explicit rejection)
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionIgnored(actor, suggestionId) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.warn(`[HistoryTracker] No history found for ignore: ${suggestionId}`);
        return;
      }

      const entry = history.find(e => e.id === suggestionId);
      if (!entry) {
        SWSELogger.warn(`[HistoryTracker] Suggestion not found in history: ${suggestionId}`);
        return;
      }

      entry.outcome = 'mentorIgnored';  // Explicit mentor dialog reject
      entry.outcomeAt = Date.now();

      // Update meta
      if (actor.system.suggestionEngine.meta) {
        actor.system.suggestionEngine.meta.totalSuggestionsIgnored++;
        actor.system.suggestionEngine.meta.lastUpdated = Date.now();
      }

      SWSELogger.log(`[HistoryTracker] Suggestion mentor-ignored: ${entry.itemName}`);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording ignored suggestion:', err);
      throw err;
    }
  }

  /**
   * Record passive ignore (shown but never took)
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionPassiveIgnored(actor, suggestionId) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.warn(`[HistoryTracker] No history found for passive ignore: ${suggestionId}`);
        return;
      }

      const entry = history.find(e => e.id === suggestionId);
      if (!entry) {
        SWSELogger.warn(`[HistoryTracker] Suggestion not found in history: ${suggestionId}`);
        return;
      }

      // Only mark as passive if not already marked as accepted/ignored
      if (!entry.outcome) {
        entry.outcome = 'passiveIgnored';  // Shown but never taken
        entry.outcomeAt = Date.now();
        SWSELogger.log(`[HistoryTracker] Suggestion passive-ignored: ${entry.itemName}`);
      }
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording passive-ignored suggestion:', err);
      throw err;
    }
  }

  /**
   * Calculate acceptance rate for a specific theme
   * @param {Actor} actor
   * @param {string} theme - From BUILD_THEMES
   * @returns {number} 0-1 (accepted / (accepted + mentorIgnored))
   */
  static getAcceptanceRateByTheme(actor, theme) {
    try {
      const aggregates = actor.system.suggestionEngine?.history?.aggregates;
      if (!aggregates?.acceptanceRateByTheme) {
        return 0.5;  // Default: neutral
      }
      return aggregates.acceptanceRateByTheme[theme] ?? 0.5;
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error getting acceptance rate:', err);
      return 0.5;
    }
  }

  /**
   * Calculate negative weights for ignored themes
   * @param {Actor} actor
   * @returns {Object} { themeName: weight, ... }
   */
  static getIgnoredThemeWeights(actor) {
    try {
      const aggregates = actor.system.suggestionEngine?.history?.aggregates;
      if (!aggregates?.ignoredThemeWeights) {
        return {};
      }
      return aggregates.ignoredThemeWeights;
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error getting ignored theme weights:', err);
      return {};
    }
  }

  /**
   * Get time since last suggestion (for cooldown)
   * @param {Actor} actor
   * @returns {number} Timestamp or 0 if never suggested
   */
  static getLastSuggestionTime(actor) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent;
      if (!history || history.length === 0) {
        return 0;
      }
      return history[history.length - 1].shownAt || 0;
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error getting last suggestion time:', err);
      return 0;
    }
  }

  /**
   * Recalculate all metrics (called on level-up)
   * Aggregates recent history into acceptance rates and ignored weights
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async recalculateMetrics(actor) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.log('[HistoryTracker] No history to recalculate');
        return;
      }

      // Initialize aggregates
      const aggregates = {
        acceptanceRateByTheme: {},
        ignoredThemeWeights: {},
        lastUpdatedAtLevel: actor.system.level || 1
      };

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
        const denominator = stats.accepted + stats.mentorIgnored;
        if (denominator > 0) {
          aggregates.acceptanceRateByTheme[theme] = stats.accepted / denominator;
        }

        // Ignored weight: penalty based on mentor-ignored count
        // Max -0.3, scale with frequency
        if (stats.mentorIgnored >= 2) {
          const ignorePenalty = Math.min(0.3, 0.1 * (stats.mentorIgnored / stats.shown));
          aggregates.ignoredThemeWeights[theme] = -ignorePenalty;
        }
      }

      // Update storage
      actor.system.suggestionEngine.history.aggregates = aggregates;

      SWSELogger.log(`[HistoryTracker] Metrics recalculated for ${Object.keys(themeStats).length} themes`);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recalculating metrics:', err);
      throw err;
    }
  }

  /**
   * Initialize history storage for an actor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    try {
      if (!actor.system.suggestionEngine) {
        actor.system.suggestionEngine = {};
      }

      if (!actor.system.suggestionEngine.history) {
        actor.system.suggestionEngine.history = {
          recent: [],
          aggregates: {
            acceptanceRateByTheme: {},
            ignoredThemeWeights: {},
            lastUpdatedAtLevel: actor.system.level || 1
          }
        };
        SWSELogger.log('[HistoryTracker] Storage initialized');
      }
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error initializing storage:', err);
      throw err;
    }
  }

  /**
   * Prune old history (keep only recent 10-15 selections)
   * Called automatically when recordSuggestionShown exceeds MAX_RECENT_SIZE
   * Can also be called manually
   * @param {Actor} actor
   * @param {number} maxRecentSize - Default 15
   * @returns {Promise<void>}
   */
  static async pruneOldHistory(actor, maxRecentSize = MAX_RECENT_SIZE) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent;
      if (!history) return;

      const removed = history.length - maxRecentSize;
      if (removed > 0) {
        actor.system.suggestionEngine.history.recent = history.slice(-maxRecentSize);
        SWSELogger.log(`[HistoryTracker] Pruned ${removed} old entries, kept ${maxRecentSize} recent`);
      }
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error pruning history:', err);
      throw err;
    }
  }
}
