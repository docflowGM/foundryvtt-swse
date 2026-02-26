/**
 * PivotDetector (PHASE F PART 3B: Refactored Facade)
 *
 * Public API compatibility layer for pivot detection.
 * Delegates to PivotLogic (state machine logic) and PivotStateManager (persistence).
 *
 * GOVERNANCE:
 * - All state machine logic → PivotLogic (pure, testable)
 * - All persistence → PivotStateManager (through SuggestionStateService)
 * - This module is a backwards-compatible facade only
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { PivotLogic, PIVOT_STATE } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PivotLogic.js";
import { PivotStateManager } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PivotStateManager.js";
import { AnchorRepository } from "/systems/foundryvtt-swse/scripts/engine/suggestion/AnchorRepository.js";

// Re-export for backwards compatibility
export { PIVOT_STATE } from './PivotLogic.js';

export class PivotDetector {

  /**
   * Update pivot state based on recent selections
   * Delegates to PivotLogic (calculation) and PivotStateManager (persistence)
   *
   * @param {Actor} actor
   * @returns {Object} { state, transitioned: boolean, newState, divergence: 0-1, evidence: {...} }
   */
  static updatePivotState(actor) {
    try {
      PivotStateManager.initializeStorage(actor);

      // Get current state and anchor
      const primaryAnchor = AnchorRepository.getPrimaryAnchor(actor);
      const currentPivotState = PivotStateManager.getPivotState(actor);
      const history = actor?.system?.suggestionEngine?.history?.recent || [];

      // Use PivotLogic for pure state machine calculation
      const result = PivotLogic.calculatePivotState(primaryAnchor, currentPivotState, history);

      return result;
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error updating pivot state:', err);
      return {
        state: PIVOT_STATE.STABLE,
        transitioned: false,
        newState: null,
        divergence: 0,
        emergingTheme: null,
        evidence: { error: err.message }
      };
    }
  }

  /**
   * Get current pivot state
   * Delegates to PivotStateManager
   *
   * @param {Actor} actor
   * @returns {string} one of PIVOT_STATE values
   */
  static getState(actor) {
    try {
      return PivotStateManager.getState(actor);
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error getting state:', err);
      return PIVOT_STATE.STABLE;
    }
  }

  /**
   * Reweight suggestions based on pivot state
   * During exploration/pivoting, relaxes confidence constraints
   * Delegates to PivotLogic
   *
   * @param {Array} suggestions
   * @param {Actor} actor
   * @returns {Array} Reweighted suggestions
   */
  static filterSuggestionsByPivotState(suggestions, actor) {
    try {
      const state = this.getState(actor);
      return PivotLogic.filterSuggestionsByState(suggestions, state);
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error filtering suggestions by pivot state:', err);
      return suggestions;
    }
  }

  /**
   * Initialize pivot state storage
   * Delegates to PivotStateManager
   */
  static async initializeStorage(actor) {
    try {
      return await PivotStateManager.initializeStorage(actor);
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error initializing storage:', err);
    }
  }
}
