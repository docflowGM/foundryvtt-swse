/**
 * PivotDetector
 *
 * Phase 2B: Behavioral Learning & Pivot Detection
 *
 * Detects when player is changing their build direction (pivoting).
 * State machine: STABLE → EXPLORATORY → PIVOTING
 * Relaxes assumptions during exploration, doesn't enforce direction.
 *
 * Key Rules:
 * - Never suggests direction
 * - Only relaxes assumptions during exploration
 * - Divergence score measures off-theme picks
 * - Player can return to stable anytime
 */

import { SWSELogger } from '../utils/logger.js';
import { BuildIdentityAnchor, ANCHOR_STATE } from './BuildIdentityAnchor.js';
import { THEME_TO_ARCHETYPE } from './BuildIdentityAnchor.js';

// ─────────────────────────────────────────────────────────────
// Pivot State Enum
// ─────────────────────────────────────────────────────────────

export const PIVOT_STATE = {
  STABLE: 'stable',
  EXPLORATORY: 'exploratory',
  PIVOTING: 'pivoting'
};

export class PivotDetector {

  /**
   * Update pivot state based on recent selections
   * Calculates divergence score and transitions between states
   *
   * @param {Actor} actor
   * @returns {Object} { state, transitioned: boolean, newState, divergence: 0-1, evidence: {...} }
   */
  static updatePivotState(actor) {
    try {
      // Get anchor and recent history
      const primaryAnchor = BuildIdentityAnchor.getAnchor(actor, 'primary');
      const history = actor.system.suggestionEngine?.history?.recent || [];

      // Initialize pivot state if needed
      const pivotState = actor.system.suggestionEngine?.pivotDetector || {
        state: PIVOT_STATE.STABLE,
        divergenceScore: 0,
        consecutiveOffThemePicks: 0,
        emergingTheme: null
      };

      // If no locked anchor, player is exploratory by default
      if (!primaryAnchor || primaryAnchor.state !== ANCHOR_STATE.LOCKED) {
        if (pivotState.state !== PIVOT_STATE.EXPLORATORY) {
          return {
            state: PIVOT_STATE.EXPLORATORY,
            transitioned: true,
            newState: PIVOT_STATE.EXPLORATORY,
            divergence: 0.5,
            evidence: { reason: 'no locked anchor' }
          };
        }
        return {
          state: PIVOT_STATE.EXPLORATORY,
          transitioned: false,
          newState: null,
          divergence: 0.5,
          evidence: { reason: 'maintaining exploratory without anchor' }
        };
      }

      // Calculate divergence: how many recent picks diverge from anchor theme?
      const recentPicks = history.slice(-10);  // Last 10 picks
      if (recentPicks.length === 0) {
        return {
          state: PIVOT_STATE.STABLE,
          transitioned: false,
          newState: null,
          divergence: 0,
          evidence: { reason: 'no picks to analyze' }
        };
      }

      // Count off-theme picks
      let offThemeCount = 0;
      const themeFreq = {};
      for (const entry of recentPicks) {
        if (!entry.theme) {continue;}
        themeFreq[entry.theme] = (themeFreq[entry.theme] || 0) + 1;

        const archetypes = THEME_TO_ARCHETYPE[entry.theme] || [];
        if (!archetypes.includes(primaryAnchor.archetype)) {
          offThemeCount++;
        }
      }

      const divergenceScore = offThemeCount / Math.max(1, recentPicks.length);

      // Determine emerging theme (most frequent off-theme)
      let emergingTheme = null;
      let emergingCount = 0;
      for (const [theme, count] of Object.entries(themeFreq)) {
        const archetypes = THEME_TO_ARCHETYPE[theme] || [];
        if (archetypes.includes(primaryAnchor.archetype)) {continue;}  // Skip anchor theme
        if (count > emergingCount) {
          emergingTheme = theme;
          emergingCount = count;
        }
      }

      // State machine transitions
      const oldState = pivotState.state;
      let newState = oldState;

      if (oldState === PIVOT_STATE.STABLE) {
        // STABLE -> EXPLORATORY (30% divergence)
        if (divergenceScore >= 0.3) {
          newState = PIVOT_STATE.EXPLORATORY;
        }
      } else if (oldState === PIVOT_STATE.EXPLORATORY) {
        // EXPLORATORY -> STABLE (low divergence)
        if (divergenceScore < 0.2) {
          newState = PIVOT_STATE.STABLE;
        }
        // EXPLORATORY -> PIVOTING (>60% divergence in emerging theme)
        else if (divergenceScore > 0.6 && emergingTheme) {
          newState = PIVOT_STATE.PIVOTING;
        }
      } else if (oldState === PIVOT_STATE.PIVOTING) {
        // PIVOTING -> STABLE (return to anchor)
        if (divergenceScore < 0.2) {
          newState = PIVOT_STATE.STABLE;
          emergingTheme = null;
        }
        // PIVOTING -> EXPLORATORY (lost focus)
        else if (divergenceScore < 0.4) {
          newState = PIVOT_STATE.EXPLORATORY;
        }
      }

      const transitioned = newState !== oldState;

      return {
        state: newState,
        transitioned,
        newState: transitioned ? newState : null,
        divergence: divergenceScore,
        emergingTheme,
        evidence: {
          divergenceScore: divergenceScore.toFixed(3),
          offThemeCount,
          totalPicks: recentPicks.length,
          emergingTheme,
          emergingCount,
          anchorArchetype: primaryAnchor.archetype
        }
      };
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error updating pivot state:', err);
      return {
        state: PIVOT_STATE.STABLE,
        transitioned: false,
        newState: null,
        divergence: 0,
        evidence: { error: err.message }
      };
    }
  }

  /**
   * Get current pivot state
   * @param {Actor} actor
   * @returns {string} one of PIVOT_STATE values
   */
  static getState(actor) {
    try {
      if (!actor.system.suggestionEngine?.pivotDetector) {
        return PIVOT_STATE.STABLE;
      }
      return actor.system.suggestionEngine.pivotDetector.state || PIVOT_STATE.STABLE;
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error getting state:', err);
      return PIVOT_STATE.STABLE;
    }
  }

  /**
   * Reweight suggestions based on pivot state
   * During exploration/pivoting, relaxes confidence constraints
   *
   * @param {Array} suggestions
   * @param {Actor} actor
   * @returns {Array} Reweighted suggestions
   */
  static filterSuggestionsByPivotState(suggestions, actor) {
    try {
      const state = this.getState(actor);

      if (state === PIVOT_STATE.STABLE) {
        // Normal weighting - don't modify
        return suggestions;
      }

      if (state === PIVOT_STATE.EXPLORATORY || state === PIVOT_STATE.PIVOTING) {
        // During exploration/pivoting:
        // - Reduce penalty for off-anchor suggestions
        // - Increase visibility of "Possible" tier
        return suggestions.map(sugg => {
          // Boost confidence slightly to surface more options
          if (sugg.confidence && sugg.confidence < 0.5) {
            return {
              ...sugg,
              confidence: Math.min(0.6, sugg.confidence + 0.1),
              confidenceLevel: sugg.confidence < 0.4 ? 'Possible' : sugg.confidenceLevel,
              pivotAdjusted: true
            };
          }
          return sugg;
        });
      }

      return suggestions;
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error filtering by pivot state:', err);
      return suggestions;
    }
  }

  /**
   * Transition to EXPLORATORY state
   * @param {Actor} actor
   * @param {string} reason - Human-readable reason
   * @returns {Promise<void>}
   */
  static async enterExploratory(actor, reason) {
    try {
      await this.initializeStorage(actor);
      const pivotState = actor.system.suggestionEngine.pivotDetector;
      pivotState.state = PIVOT_STATE.EXPLORATORY;
      pivotState.transitionedAt = Date.now();
      pivotState.transitionReason = reason;
      SWSELogger.log(`[PivotDetector] Entering EXPLORATORY: ${reason}`);
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error entering exploratory:', err);
    }
  }

  /**
   * Transition to PIVOTING state
   * @param {Actor} actor
   * @param {string} emergingTheme
   * @returns {Promise<void>}
   */
  static async enterPivoting(actor, emergingTheme) {
    try {
      await this.initializeStorage(actor);
      const pivotState = actor.system.suggestionEngine.pivotDetector;
      pivotState.state = PIVOT_STATE.PIVOTING;
      pivotState.emergingTheme = emergingTheme;
      pivotState.transitionedAt = Date.now();
      SWSELogger.log(`[PivotDetector] Entering PIVOTING: ${emergingTheme}`);
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error entering pivoting:', err);
    }
  }

  /**
   * Return to STABLE state
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async returnToStable(actor) {
    try {
      await this.initializeStorage(actor);
      const pivotState = actor.system.suggestionEngine.pivotDetector;
      pivotState.state = PIVOT_STATE.STABLE;
      pivotState.emergingTheme = null;
      pivotState.transitionedAt = Date.now();
      SWSELogger.log('[PivotDetector] Returning to STABLE');
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error returning to stable:', err);
    }
  }

  /**
   * Initialize pivot detector storage
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    try {
      if (!actor.system.suggestionEngine) {
        actor.system.suggestionEngine = {};
      }
      if (!actor.system.suggestionEngine.pivotDetector) {
        actor.system.suggestionEngine.pivotDetector = {
          state: PIVOT_STATE.STABLE,
          transitionHistory: [],
          divergenceScore: 0,
          emergingTheme: null,
          emergingThemeEvidence: {},
          transitionedAt: null,
          transitionReason: null
        };
        SWSELogger.log('[PivotDetector] Storage initialized');
      }
    } catch (err) {
      SWSELogger.error('[PivotDetector] Error initializing storage:', err);
    }
  }
}
