/**
 * PivotStateManager
 *
 * PHASE F PART 3: God Object Split - Persistence Layer
 *
 * Manages storage and retrieval of pivot state.
 * All pivot mutations flow through SuggestionStateService.
 *
 * Owns:
 * - Pivot state data persistence
 * - Pivot state storage initialization
 * - Pivot state retrieval (read-only)
 * - Storage schema validation
 *
 * Delegates to:
 * - SuggestionStateService (for state mutations)
 * - PivotLogic (for calculations)
 *
 * Never owns: Logic, calculations, state transitions
 */

import { SWSELogger } from '../../utils/logger.js';
import { SuggestionStateService } from './SuggestionStateService.js';
import { PIVOT_STATE } from './PivotLogic.js';

export class PivotStateManager {
  /**
   * Initialize pivot state storage on actor
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    try {
      if (!actor?.system?.suggestionEngine) {
        actor.system.suggestionEngine = {};
      }

      if (!actor.system.suggestionEngine.pivotDetector) {
        actor.system.suggestionEngine.pivotDetector = {
          state: PIVOT_STATE.STABLE,
          divergenceScore: 0,
          emergingTheme: null,
          changedAt: null,
          previousState: null
        };

        SWSELogger.log('[PivotStateManager] Storage initialized');
      }
    } catch (err) {
      SWSELogger.error('[PivotStateManager] Error initializing storage:', err);
    }
  }

  /**
   * Get current pivot state
   *
   * @param {Actor} actor - Target actor
   * @returns {string} One of PIVOT_STATE values
   */
  static getState(actor) {
    try {
      if (!actor?.system?.suggestionEngine?.pivotDetector) {
        return PIVOT_STATE.STABLE;
      }
      return actor.system.suggestionEngine.pivotDetector.state || PIVOT_STATE.STABLE;
    } catch (err) {
      SWSELogger.error('[PivotStateManager] Error getting pivot state:', err);
      return PIVOT_STATE.STABLE;
    }
  }

  /**
   * Get complete pivot state object
   *
   * @param {Actor} actor - Target actor
   * @returns {Object} Full pivot state
   */
  static getPivotState(actor) {
    try {
      if (!actor?.system?.suggestionEngine?.pivotDetector) {
        return {
          state: PIVOT_STATE.STABLE,
          divergenceScore: 0,
          emergingTheme: null,
          changedAt: null,
          previousState: null
        };
      }
      return actor.system.suggestionEngine.pivotDetector;
    } catch (err) {
      SWSELogger.error('[PivotStateManager] Error getting pivot state:', err);
      return { state: PIVOT_STATE.STABLE, divergenceScore: 0, emergingTheme: null };
    }
  }

  /**
   * Update pivot state through SuggestionStateService
   *
   * @param {Actor} actor - Target actor
   * @param {string} newState - New pivot state
   * @param {Object} details - Additional state details { divergenceScore, emergingTheme }
   * @returns {Promise<Object>} Updated pivot state
   */
  static async updatePivotState(actor, newState, details = {}) {
    try {
      await this.initializeStorage(actor);

      const currentState = actor.system.suggestionEngine.pivotDetector;
      const oldState = currentState.state;

      const updatedState = {
        state: newState,
        divergenceScore: details.divergenceScore ?? currentState.divergenceScore ?? 0,
        emergingTheme: details.emergingTheme ?? currentState.emergingTheme ?? null,
        changedAt: newState !== oldState ? new Date().toISOString() : currentState.changedAt,
        previousState: newState !== oldState ? oldState : currentState.previousState
      };

      // Store through SuggestionStateService
      await SuggestionStateService.updatePivotState(actor, newState);

      // Update in-memory state with additional details
      if (actor.system.suggestionEngine.pivotDetector) {
        Object.assign(actor.system.suggestionEngine.pivotDetector, updatedState);
      }

      SWSELogger.log(`[PivotStateManager] Pivot state updated`, {
        actor: actor.name,
        from: oldState,
        to: newState,
        divergence: details.divergenceScore?.toFixed(2),
        emergingTheme: details.emergingTheme
      });

      return updatedState;
    } catch (err) {
      SWSELogger.error(
        `[PivotStateManager] Error updating pivot state for ${actor?.name ?? 'unknown'}`,
        err
      );
      throw err;
    }
  }

  /**
   * Reset pivot state to STABLE
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<Object>} Updated pivot state
   */
  static async resetToStable(actor) {
    return this.updatePivotState(actor, PIVOT_STATE.STABLE, {
      divergenceScore: 0,
      emergingTheme: null
    });
  }

  /**
   * Record pivot state change in history
   *
   * @param {Actor} actor - Target actor
   * @param {Object} entry - Change entry
   * @returns {Promise<void>}
   */
  static async recordStateChange(actor, entry) {
    try {
      await this.initializeStorage(actor);

      if (!actor.system.suggestionEngine.pivotDetector.history) {
        actor.system.suggestionEngine.pivotDetector.history = [];
      }

      actor.system.suggestionEngine.pivotDetector.history.push({
        ...entry,
        recordedAt: Date.now()
      });

      // Keep history to reasonable size (last 20 changes)
      if (actor.system.suggestionEngine.pivotDetector.history.length > 20) {
        actor.system.suggestionEngine.pivotDetector.history.shift();
      }

      SWSELogger.log(`[PivotStateManager] Pivot state change recorded`, {
        actor: actor.name,
        transition: entry.transition
      });
    } catch (err) {
      SWSELogger.error(`[PivotStateManager] Error recording state change:`, err);
    }
  }
}
