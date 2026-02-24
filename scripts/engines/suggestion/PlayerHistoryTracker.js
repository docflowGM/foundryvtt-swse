/**
 * PlayerHistoryTracker (PHASE F PART 3B: Refactored Facade)
 *
 * Public API compatibility layer for player selection history.
 * Delegates to SelectionRecorder (recording) and PlayerAnalytics (calculations).
 *
 * GOVERNANCE:
 * - All recording logic → SelectionRecorder (pure recording, no calculations)
 * - All calculation logic → PlayerAnalytics (pure analytics, no recording)
 * - This module is a backwards-compatible facade only
 */

import { SWSELogger } from '../../utils/logger.js';
import { SelectionRecorder } from './SelectionRecorder.js';
import { PlayerAnalytics } from './PlayerAnalytics.js';

const MAX_RECENT_SIZE = 15;

export class PlayerHistoryTracker {

  /**
   * Record that a suggestion was shown to the player
   * Delegates to SelectionRecorder
   */
  static async recordSuggestionShown(actor, suggestion, confidence, context) {
    try {
      await this.initializeStorage(actor);
      return SelectionRecorder.recordSuggestionShown(actor, suggestion, confidence, context);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording shown suggestion:', err);
      throw err;
    }
  }

  /**
   * Record that player accepted a suggestion
   * Delegates to SelectionRecorder
   */
  static async recordSuggestionAccepted(actor, suggestionId) {
    try {
      return SelectionRecorder.recordSuggestionAccepted(actor, suggestionId);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording accepted suggestion:', err);
      throw err;
    }
  }

  /**
   * Record mentor dialog ignore (explicit rejection)
   * Delegates to SelectionRecorder
   */
  static async recordSuggestionIgnored(actor, suggestionId) {
    try {
      return SelectionRecorder.recordSuggestionIgnored(actor, suggestionId);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording ignored suggestion:', err);
      throw err;
    }
  }

  /**
   * Record passive ignore (shown but never took)
   * Delegates to SelectionRecorder
   */
  static async recordSuggestionPassiveIgnored(actor, suggestionId) {
    try {
      return SelectionRecorder.recordSuggestionPassiveIgnored(actor, suggestionId);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recording passive-ignored suggestion:', err);
      throw err;
    }
  }

  /**
   * Calculate acceptance rate for a specific theme
   * Delegates to PlayerAnalytics
   */
  static getAcceptanceRateByTheme(actor, theme) {
    try {
      return PlayerAnalytics.getAcceptanceRateByTheme(actor, theme);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error getting acceptance rate:', err);
      return 0.5;
    }
  }

  /**
   * Calculate negative weights for ignored themes
   * Delegates to PlayerAnalytics
   */
  static getIgnoredThemeWeights(actor) {
    try {
      return PlayerAnalytics.getIgnoredThemeWeights(actor);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error getting ignored theme weights:', err);
      return {};
    }
  }

  /**
   * Get time since last suggestion (for cooldown)
   * Delegates to PlayerAnalytics
   */
  static getLastSuggestionTime(actor) {
    try {
      return PlayerAnalytics.getLastSuggestionTime(actor);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error getting last suggestion time:', err);
      return 0;
    }
  }

  /**
   * Recalculate all metrics (called on level-up)
   * Delegates to PlayerAnalytics for pure calculation, then stores results
   */
  static async recalculateMetrics(actor) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.log('[HistoryTracker] No history to recalculate');
        return;
      }

      const currentLevel = actor?.system?.level || 1;

      // Use PlayerAnalytics for pure calculation (no persistence)
      const aggregates = PlayerAnalytics.calculateMetrics(history, currentLevel);

      // Store the calculated aggregates
      if (!actor.system.suggestionEngine.history) {
        actor.system.suggestionEngine.history = { recent: [] };
      }
      actor.system.suggestionEngine.history.aggregates = aggregates;

      SWSELogger.log(`[HistoryTracker] Metrics recalculated for ${Object.keys(aggregates.acceptanceRateByTheme).length} themes`);
    } catch (err) {
      SWSELogger.error('[HistoryTracker] Error recalculating metrics:', err);
      throw err;
    }
  }

  /**
   * Initialize history storage for an actor
   */
  static async initializeStorage(actor) {
    try {
      if (!actor?.system?.suggestionEngine) {
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
    }
  }

  /**
   * Prune old history (keep only recent MAX_RECENT_SIZE entries)
   * Delegates to SelectionRecorder for history access
   */
  static async pruneOldHistory(actor, maxRecentSize = MAX_RECENT_SIZE) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent;
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
