/**
 * PlayerHistoryTracker
 *
 * Records suggestion feedback (shown/accepted/ignored/rejected).
 * Calculates acceptance rates by theme and ignored theme weights.
 * Maintains recent history (10-15 selections) to avoid overfitting.
 *
 * Phase 1B: Stubs only. Phase 1C: Implement storage + calculations.
 */

import { SWSELogger } from '../utils/logger.js';

export class PlayerHistoryTracker {

  /**
   * Record that a suggestion was shown to the player
   * @param {Actor} actor
   * @param {Object} suggestion
   * @param {Object} confidence - { confidence, level }
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence }
   * @returns {Promise<string>} Suggestion ID (for later tracking)
   */
  static async recordSuggestionShown(actor, suggestion, confidence, context) {
    // TODO: Phase 1C - Implement storage
    SWSELogger.log(`[HistoryTracker] Suggestion shown: ${suggestion.itemName}`);
    return `sugg_${Date.now()}`;
  }

  /**
   * Record that player accepted a suggestion
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionAccepted(actor, suggestionId) {
    // TODO: Phase 1C - Implement update
    SWSELogger.log(`[HistoryTracker] Suggestion accepted: ${suggestionId}`);
  }

  /**
   * Record mentor dialog ignore (explicit rejection)
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionIgnored(actor, suggestionId) {
    // TODO: Phase 1C - Implement update
    SWSELogger.log(`[HistoryTracker] Suggestion ignored: ${suggestionId}`);
  }

  /**
   * Record passive ignore (shown but never took)
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionPassiveIgnored(actor, suggestionId) {
    // TODO: Phase 1C - Implement update
    SWSELogger.log(`[HistoryTracker] Suggestion passive-ignored: ${suggestionId}`);
  }

  /**
   * Calculate acceptance rate for a specific theme
   * @param {Actor} actor
   * @param {string} theme - From BUILD_THEMES
   * @returns {number} 0-1 (accepted / (accepted + ignored))
   */
  static getAcceptanceRateByTheme(actor, theme) {
    // TODO: Phase 1C - Implement calculation
    return 0.5;
  }

  /**
   * Calculate negative weights for ignored themes
   * @param {Actor} actor
   * @returns {Object} { themeName: weight, ... }
   */
  static getIgnoredThemeWeights(actor) {
    // TODO: Phase 1C - Implement calculation
    return {};
  }

  /**
   * Get time since last suggestion (for cooldown)
   * @param {Actor} actor
   * @returns {number} Timestamp or 0 if never suggested
   */
  static getLastSuggestionTime(actor) {
    // TODO: Phase 1C - Implement getter
    return 0;
  }

  /**
   * Recalculate all metrics (called on level-up)
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async recalculateMetrics(actor) {
    // TODO: Phase 1C - Implement metric recalculation
    SWSELogger.log('[HistoryTracker] Recalculating metrics');
  }

  /**
   * Initialize history storage for an actor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Phase 1C - Implement storage init
    if (!actor.system.suggestionEngine) {
      actor.system.suggestionEngine = {};
    }
    if (!actor.system.suggestionEngine.history) {
      actor.system.suggestionEngine.history = {
        recent: [],
        aggregates: {}
      };
    }
    SWSELogger.log('[HistoryTracker] Storage initialized');
  }

  /**
   * Prune old history (keep only recent 10-15 selections)
   * @param {Actor} actor
   * @param {number} maxRecentSize - Default 15
   * @returns {Promise<void>}
   */
  static async pruneOldHistory(actor, maxRecentSize = 15) {
    // TODO: Phase 1C - Implement pruning
    SWSELogger.log('[HistoryTracker] Pruning old history');
  }
}
