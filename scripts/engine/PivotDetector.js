/**
 * PivotDetector
 *
 * Detects when player is changing their build direction.
 * State machine: STABLE → EXPLORATORY → PIVOTING → LOCKED.
 * Pauses anchor locking during exploration.
 *
 * Phase 1B: Stubs only. Phase 1C: Implement state machine + transitions.
 */

import { SWSELogger } from '../utils/logger.js';

export class PivotDetector {

  /**
   * Update pivot state based on recent selections
   * @param {Actor} actor
   * @param {Object} pendingData
   * @returns {Object} { state, transitioned: boolean, newState, evidence: {...} }
   */
  static updatePivotState(actor, pendingData) {
    // TODO: Phase 1C - Implement state machine
    // STABLE → EXPLORATORY (1-2 off-theme picks)
    // EXPLORATORY → PIVOTING (2-3 consistent off-theme in same theme)
    // PIVOTING → LOCKED (2-3 levels consistency in new theme)
    // Any state → STABLE (return to anchor theme)
    return {
      state: 'STABLE',
      transitioned: false,
      newState: null,
      evidence: {}
    };
  }

  /**
   * Transition to EXPLORATORY state
   * @param {Actor} actor
   * @param {string} reason - Human-readable reason
   * @returns {Promise<void>}
   */
  static async enterExploratory(actor, reason) {
    // TODO: Phase 1C - Implement transition
    SWSELogger.log(`[PivotDetector] Entering EXPLORATORY: ${reason}`);
  }

  /**
   * Transition to PIVOTING state
   * @param {Actor} actor
   * @param {string} emergingTheme
   * @returns {Promise<void>}
   */
  static async enterPivoting(actor, emergingTheme) {
    // TODO: Phase 1C - Implement transition
    SWSELogger.log(`[PivotDetector] Entering PIVOTING: ${emergingTheme}`);
  }

  /**
   * Confirm pivot, promote secondary anchor to primary
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async lockNewAnchor(actor) {
    // TODO: Phase 1C - Implement transition
    SWSELogger.log('[PivotDetector] Locking new anchor');
  }

  /**
   * Reject pivot, return to STABLE with reinforced primary anchor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async returnToStable(actor) {
    // TODO: Phase 1C - Implement transition
    SWSELogger.log('[PivotDetector] Returning to STABLE');
  }

  /**
   * Get current pivot state
   * @param {Actor} actor
   * @returns {string} "STABLE" | "EXPLORATORY" | "PIVOTING" | "LOCKED"
   */
  static getState(actor) {
    // TODO: Phase 1C - Implement getter
    if (!actor.system.suggestionEngine?.pivotDetector) return 'STABLE';
    return actor.system.suggestionEngine.pivotDetector.state || 'STABLE';
  }

  /**
   * Filter suggestions based on pivot state
   * @param {Array} suggestions
   * @param {Actor} actor
   * @returns {Array} Filtered/reweighted suggestions
   */
  static filterSuggestionsByPivotState(suggestions, actor) {
    // TODO: Phase 1C - Implement filtering
    // If EXPLORATORY or PIVOTING:
    //   - Include new-theme suggestions
    //   - Lower confidence for old-anchor suggestions
    //   - Broaden overall suggestion pool
    // If LOCKED or STABLE:
    //   - Normal weighting
    return suggestions;
  }

  /**
   * Initialize pivot detector storage
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Phase 1C - Implement init
    if (!actor.system.suggestionEngine) {
      actor.system.suggestionEngine = {};
    }
    if (!actor.system.suggestionEngine.pivotDetector) {
      actor.system.suggestionEngine.pivotDetector = {
        state: 'STABLE',
        transitionHistory: [],
        consecutiveOffThemePicks: 0,
        emergingTheme: null,
        emergingThemeEvidence: {}
      };
    }
    SWSELogger.log('[PivotDetector] Storage initialized');
  }
}
