/**
 * SelectionRecorder
 *
 * PHASE F PART 3: God Object Split - Recording Layer
 *
 * Records facts about player selections: suggestions shown, outcomes recorded.
 * Pure recording logic - no calculations or analytics.
 *
 * CRITICAL FIX: All mutations are now persisted to actor flags to prevent
 * data loss on reload. History is stored in both actor.system (volatile) and
 * actor.flags (persistent).
 *
 * Owns:
 * - Recording when suggestions are shown
 * - Recording selection outcomes (accepted/ignored)
 * - Maintaining selection history
 * - History pruning (keeps recent N entries)
 * - Persisting history to actor flags
 *
 * Delegates to: None (pure recording)
 * Never owns: Analytics, calculations, aggregations
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const MAX_RECENT_SIZE = 15;

/**
 * Persist selection history to actor flags
 * @private
 */
async function _persistHistory(actor) {
  try {
    if (!actor?.system?.suggestionEngine?.history?.recent) {
      return;
    }
    // Persist to actor flags for durability across reloads
    // @mutation-exception: metadata
    // Store selection history for suggestion caching (session state)
    await actor.setFlag(
      'foundryvtt-swse',
      'suggestionEngine.history.recent',
      actor.system.suggestionEngine.history.recent
    );
  } catch (err) {
    SWSELogger.error('[SelectionRecorder] Failed to persist history:', err);
  }
}

export class SelectionRecorder {
  /**
   * Record that a suggestion was shown to the player
   *
   * @param {Actor} actor - Target actor
   * @param {Object} suggestion - { itemId, itemName, category, theme }
   * @param {Object} confidence - { confidence, level }
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence, archetypeMatch }
   * @returns {Promise<string>} Suggestion ID (for later outcome tracking)
   */
  static async recordSuggestionShown(actor, suggestion, confidence, context) {
    try {
      if (!actor?.system?.suggestionEngine?.history?.recent) {
        SWSELogger.warn('[SelectionRecorder] History not initialized, cannot record shown suggestion');
        return null;
      }

      // Generate unique ID with random suffix to prevent same-ms collisions
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const suggestionId = `sugg_${actor.uuid}_${Date.now()}_${randomSuffix}`;

      // Create history entry
      const entry = {
        id: suggestionId,
        itemId: suggestion.itemId,
        itemName: suggestion.itemName,
        category: suggestion.category || 'feat',
        theme: suggestion.theme,
        level: actor.system.level || 1,
        shownAt: Date.now(),
        outcome: null, // Will be set to 'accepted', 'mentorIgnored', or 'passiveIgnored'
        outcomeAt: null,
        confidence: confidence.confidence,
        confidenceLevel: confidence.level,
        context: {
          ...context,
          archetypeMatch: context.archetypeMatch || null // Snapshot for pivot detection
        }
      };

      // Add to recent history
      actor.system.suggestionEngine.history.recent.push(entry);

      // Prune if needed
      if (actor.system.suggestionEngine.history.recent.length > MAX_RECENT_SIZE) {
        actor.system.suggestionEngine.history.recent.shift();
      }

      // Persist to flags
      await _persistHistory(actor);

      SWSELogger.log(`[SelectionRecorder] Suggestion shown: ${suggestion.itemName} (${suggestionId})`);
      return suggestionId;
    } catch (err) {
      SWSELogger.error('[SelectionRecorder] Error recording shown suggestion:', err);
      return null;
    }
  }

  /**
   * Record that player accepted a suggestion
   *
   * @param {Actor} actor - Target actor
   * @param {string} suggestionId - ID returned from recordSuggestionShown
   * @returns {boolean} true if recorded successfully
   */
  static async recordSuggestionAccepted(actor, suggestionId) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.warn(`[SelectionRecorder] No history found for acceptance: ${suggestionId}`);
        return false;
      }

      const entry = history.find(e => e.id === suggestionId);
      if (!entry) {
        SWSELogger.warn(`[SelectionRecorder] Suggestion not found in history: ${suggestionId}`);
        return false;
      }

      entry.outcome = 'accepted';
      entry.outcomeAt = Date.now();

      // Persist to flags
      await _persistHistory(actor);

      SWSELogger.log(`[SelectionRecorder] Suggestion accepted: ${entry.itemName}`);
      return true;
    } catch (err) {
      SWSELogger.error('[SelectionRecorder] Error recording acceptance:', err);
      return false;
    }
  }

  /**
   * Record that player explicitly ignored a suggestion
   *
   * @param {Actor} actor - Target actor
   * @param {string} suggestionId - ID returned from recordSuggestionShown
   * @returns {boolean} true if recorded successfully
   */
  static async recordSuggestionIgnored(actor, suggestionId) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.warn(`[SelectionRecorder] No history found for ignore: ${suggestionId}`);
        return false;
      }

      const entry = history.find(e => e.id === suggestionId);
      if (!entry) {
        SWSELogger.warn(`[SelectionRecorder] Suggestion not found in history: ${suggestionId}`);
        return false;
      }

      entry.outcome = 'ignored';
      entry.outcomeAt = Date.now();

      // Persist to flags
      await _persistHistory(actor);

      SWSELogger.log(`[SelectionRecorder] Suggestion explicitly ignored: ${entry.itemName}`);
      return true;
    } catch (err) {
      SWSELogger.error('[SelectionRecorder] Error recording ignore:', err);
      return false;
    }
  }

  /**
   * Record that a suggestion was passively ignored (dialog closed without selecting)
   *
   * @param {Actor} actor - Target actor
   * @param {string} suggestionId - ID returned from recordSuggestionShown
   * @returns {boolean} true if recorded successfully
   */
  static async recordSuggestionPassiveIgnored(actor, suggestionId) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent;
      if (!history) {
        SWSELogger.warn(`[SelectionRecorder] No history found for passive ignore: ${suggestionId}`);
        return false;
      }

      const entry = history.find(e => e.id === suggestionId);
      if (!entry) {
        SWSELogger.warn(`[SelectionRecorder] Suggestion not found in history: ${suggestionId}`);
        return false;
      }

      entry.outcome = 'passiveIgnored';
      entry.outcomeAt = Date.now();

      // Persist to flags
      await _persistHistory(actor);

      SWSELogger.log(`[SelectionRecorder] Suggestion passively ignored: ${entry.itemName}`);
      return true;
    } catch (err) {
      SWSELogger.error('[SelectionRecorder] Error recording passive ignore:', err);
      return false;
    }
  }

  /**
   * Get all recent history entries
   *
   * @param {Actor} actor - Target actor
   * @returns {Array} Recent history entries
   */
  static getRecentHistory(actor) {
    return actor?.system?.suggestionEngine?.history?.recent || [];
  }

    /**
   * Get history entries with a specific outcome
   *
   * @param {Actor} actor - Target actor
   * @param {string|null} outcome - 'accepted', 'ignored', 'passiveIgnored', or null for unresolved
   * @returns {Array} Filtered history entries
   */
  static getHistoryByOutcome(actor, outcome) {
    const history = this.getRecentHistory(actor);
    return history.filter(e => e.outcome === outcome);
  }
}