/**
 * PivotLogic
 *
 * PHASE F PART 3: God Object Split - Pure Logic Layer
 *
 * Detects when player is changing their build direction (pivoting).
 * Pure state machine logic - no persistence, no state mutations.
 *
 * Owns:
 * - Divergence score calculation
 * - State machine transitions (STABLE → EXPLORATORY → PIVOTING)
 * - Pivot detection and emerging theme identification
 * - Evidence collection
 *
 * Delegates to: None (pure calculator)
 * Never owns: State persistence, actor mutations, storage
 */

import { SWSELogger } from '../../utils/logger.js';
import { ANCHOR_STATE } from './BuildIdentityDetector.js';
import { THEME_TO_ARCHETYPE } from './BuildIdentityDetector.js';

// Pivot State Enum
export const PIVOT_STATE = {
  STABLE: 'stable',
  EXPLORATORY: 'exploratory',
  PIVOTING: 'pivoting'
};

export class PivotLogic {
  /**
   * Calculate pivot state based on anchor and recent history
   * Pure state machine logic - no mutations
   *
   * @param {Object} primaryAnchor - Current anchor data (or null for no anchor)
   * @param {Object} currentPivotState - Current pivot state
   * @param {Array} history - Recent history entries
   * @returns {Object} { state, transitioned: boolean, newState, divergence: 0-1, emergingTheme, evidence: {...} }
   */
  static calculatePivotState(primaryAnchor = null, currentPivotState = null, history = []) {
    try {
      // Default current state if not provided
      const pivotState = currentPivotState || {
        state: PIVOT_STATE.STABLE,
        divergenceScore: 0,
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
            emergingTheme: null,
            evidence: { reason: 'no locked anchor' }
          };
        }
        return {
          state: PIVOT_STATE.EXPLORATORY,
          transitioned: false,
          newState: null,
          divergence: 0.5,
          emergingTheme: null,
          evidence: { reason: 'maintaining exploratory without anchor' }
        };
      }

      // Calculate divergence: how many recent picks diverge from anchor theme?
      const recentPicks = history.slice(-10); // Last 10 picks
      if (recentPicks.length === 0) {
        return {
          state: PIVOT_STATE.STABLE,
          transitioned: false,
          newState: null,
          divergence: 0,
          emergingTheme: null,
          evidence: { reason: 'no picks to analyze' }
        };
      }

      // Count off-theme picks
      let offThemeCount = 0;
      const themeFreq = {};
      for (const entry of recentPicks) {
        if (!entry.theme) continue;
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
        if (archetypes.includes(primaryAnchor.archetype)) continue; // Skip anchor theme
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
      SWSELogger.error('[PivotLogic] Error calculating pivot state:', err);
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
   * Filter suggestions based on pivot state
   * During exploration/pivoting, relaxes confidence constraints
   *
   * @param {Array} suggestions - Suggestions to filter
   * @param {string} pivotState - Current pivot state
   * @returns {Array} Filtered suggestions
   */
  static filterSuggestionsByState(suggestions = [], pivotState = PIVOT_STATE.STABLE) {
    try {
      if (!Array.isArray(suggestions)) {
        return [];
      }

      // During stable play: all suggestions allowed
      if (pivotState === PIVOT_STATE.STABLE) {
        return suggestions;
      }

      // During exploration: relax confidence floor from 0.2 to 0.1
      if (pivotState === PIVOT_STATE.EXPLORATORY) {
        return suggestions.map(s => ({
          ...s,
          suggestion: {
            ...s.suggestion,
            confidence: Math.max(0.1, s.suggestion?.confidence ?? 0.5)
          }
        }));
      }

      // During pivoting: even more relaxed (0.05), plus show emerging themes
      if (pivotState === PIVOT_STATE.PIVOTING) {
        return suggestions.map(s => ({
          ...s,
          suggestion: {
            ...s.suggestion,
            confidence: Math.max(0.05, s.suggestion?.confidence ?? 0.5)
          }
        }));
      }

      return suggestions;
    } catch (err) {
      SWSELogger.error('[PivotLogic] Error filtering suggestions by pivot state:', err);
      return suggestions;
    }
  }
}
