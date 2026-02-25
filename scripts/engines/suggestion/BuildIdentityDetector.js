/**
 * BuildIdentityDetector
 *
 * PHASE F PART 3: God Object Split - Pure Logic Layer
 *
 * Detects build archetypes / identity anchors based on player choices.
 * Pure logic only - no persistence, no state mutations.
 *
 * Owns:
 * - Anchor detection from player history
 * - State transition rules (NONE → PROPOSED → LOCKED → WEAKENING → RELEASED)
 * - Consistency scoring
 * - Evidence collection
 *
 * Delegates to: None (pure evaluator)
 * Never owns: State persistence, actor mutations, storage
 */

import { SWSELogger } from '../../utils/logger.js';
import { BUILD_THEMES } from './BuildIntent.js';

// Anchor State Enum
export const ANCHOR_STATE = {
  NONE: 'none',
  PROPOSED: 'proposed',
  LOCKED: 'locked',
  WEAKENING: 'weakening',
  RELEASED: 'released'
};

// Theme to Archetype Mapping
export const THEME_TO_ARCHETYPE = {
  [BUILD_THEMES.MELEE]: ['frontline_damage', 'assassin'],
  [BUILD_THEMES.FORCE]: ['force_dps', 'force_control'],
  [BUILD_THEMES.RANGED]: ['sniper', 'assassin'],
  [BUILD_THEMES.STEALTH]: ['assassin', 'sniper'],
  [BUILD_THEMES.SOCIAL]: ['face', 'controller'],
  [BUILD_THEMES.TECH]: ['tech_specialist', 'skill_monkey'],
  [BUILD_THEMES.LEADERSHIP]: ['controller', 'face'],
  [BUILD_THEMES.SUPPORT]: ['force_control', 'controller'],
  [BUILD_THEMES.COMBAT]: ['frontline_damage', 'controller'],
  [BUILD_THEMES.EXPLORATION]: ['skill_monkey', 'sniper'],
  [BUILD_THEMES.VEHICLE]: ['sniper', 'tech_specialist'],
  [BUILD_THEMES.TRACKING]: ['sniper', 'skill_monkey']
};

export class BuildIdentityDetector {
  /**
   * Detect potential anchor based on recent player choices
   * Analyzes accepted suggestions and their themes
   *
   * @param {Array} history - Recent history entries (from actor.system.suggestionEngine.history.recent)
   * @returns {Object} { archetype: "key" | null, consistency: 0-1, confidence: 0-1, evidence: {...} }
   */
  static detectAnchor(history = []) {
    try {
      // Get recent accepted suggestions
      const acceptedSuggestions = history.filter(e => e.outcome === 'accepted');
      if (acceptedSuggestions.length === 0) {
        return { archetype: null, consistency: 0, confidence: 0, evidence: { reason: 'no accepted suggestions yet' } };
      }

      // Count theme frequencies in recent accepted picks
      const themeCounts = {};
      for (const entry of acceptedSuggestions) {
        if (!entry.theme) continue;
        themeCounts[entry.theme] = (themeCounts[entry.theme] || 0) + 1;
      }

      // Find dominant theme
      let dominantTheme = null;
      let dominantCount = 0;
      for (const [theme, count] of Object.entries(themeCounts)) {
        if (count > dominantCount) {
          dominantTheme = theme;
          dominantCount = count;
        }
      }

      if (!dominantTheme) {
        return { archetype: null, consistency: 0, confidence: 0, evidence: { reason: 'no themes in recent picks' } };
      }

      // Calculate consistency score: how dominant is the theme?
      // Range 0-1, where 1.0 = 100% of picks are this theme
      const consistencyScore = dominantCount / acceptedSuggestions.length;

      // Map theme to archetype(s)
      const primaryArchetype = THEME_TO_ARCHETYPE[dominantTheme]?.[0];
      if (!primaryArchetype) {
        return { archetype: null, consistency: 0, confidence: 0, evidence: { reason: `theme "${dominantTheme}" has no archetype mapping` } };
      }

      return {
        archetype: primaryArchetype,
        consistency: consistencyScore,
        confidence: Math.min(1.0, consistencyScore + 0.2),  // Boost confidence slightly
        evidence: {
          dominantTheme,
          themeCounts,
          dominantCount,
          totalSuggestions: acceptedSuggestions.length,
          consistency: consistencyScore
        }
      };
    } catch (err) {
      SWSELogger.error('[BuildIdentityDetector] Error detecting anchor:', err);
      return { archetype: null, consistency: 0, confidence: 0, evidence: { error: err.message } };
    }
  }

  /**
   * Determine the next state for an anchor based on consistency and current state.
   * Pure state machine logic - no mutations.
   *
   * @param {Object} currentAnchor - Current anchor state object
   * @param {Array} history - Recent history entries
   * @param {number} currentLevel - Current actor level
   * @returns {Object} { transitioned: boolean, newState, anchor: {...}, evidence: {...} }
   */
  static determineNextState(currentAnchor, history = [], currentLevel = 1) {
    try {
      // No anchor yet - try to detect
      if (!currentAnchor || currentAnchor.state === ANCHOR_STATE.NONE) {
        const detected = this.detectAnchor(history);
        if (detected.archetype && detected.consistency >= 0.6) {
          return {
            transitioned: true,
            newState: ANCHOR_STATE.PROPOSED,
            anchor: {
              ...currentAnchor,
              state: ANCHOR_STATE.PROPOSED,
              archetype: detected.archetype,
              consistency: detected.consistency,
              confidence: detected.confidence,
              evidence: detected.evidence,
              detectedAt: Date.now()
            },
            evidence: { reason: 'anchor detected with sufficient consistency' }
          };
        }
        return {
          transitioned: false,
          newState: ANCHOR_STATE.NONE,
          anchor: currentAnchor,
          evidence: { reason: 'no anchor detected' }
        };
      }

      // Detect current consistency
      const detected = this.detectAnchor(history);
      const currentConsistency = detected.consistency || 0;

      // PROPOSED state transitions
      if (currentAnchor.state === ANCHOR_STATE.PROPOSED) {
        if (currentConsistency < 0.5) {
          return {
            transitioned: true,
            newState: ANCHOR_STATE.NONE,
            anchor: { ...currentAnchor, state: ANCHOR_STATE.NONE, archetype: null },
            evidence: { reason: 'proposed anchor cancelled (consistency dropped)' }
          };
        }
        return {
          transitioned: false,
          newState: ANCHOR_STATE.PROPOSED,
          anchor: { ...currentAnchor, consistency: currentConsistency },
          evidence: { reason: 'proposed anchor maintained' }
        };
      }

      // LOCKED state transitions
      if (currentAnchor.state === ANCHOR_STATE.LOCKED) {
        if (currentConsistency < 0.4) {
          return {
            transitioned: true,
            newState: ANCHOR_STATE.WEAKENING,
            anchor: {
              ...currentAnchor,
              state: ANCHOR_STATE.WEAKENING,
              weakeningStartLevel: currentLevel
            },
            evidence: { reason: 'anchor consistency dropped below threshold' }
          };
        }
        return {
          transitioned: false,
          newState: ANCHOR_STATE.LOCKED,
          anchor: { ...currentAnchor, consistency: currentConsistency },
          evidence: { reason: 'anchor maintains lock' }
        };
      }

      // WEAKENING state transitions
      if (currentAnchor.state === ANCHOR_STATE.WEAKENING) {
        if (currentConsistency >= 0.6) {
          return {
            transitioned: true,
            newState: ANCHOR_STATE.LOCKED,
            anchor: { ...currentAnchor, state: ANCHOR_STATE.LOCKED, weakeningStartLevel: null },
            evidence: { reason: 'anchor consistency recovered' }
          };
        }

        const weakeningDuration = (currentLevel || 1) - (currentAnchor.weakeningStartLevel || currentLevel);
        if (weakeningDuration >= 3 && currentConsistency < 0.3) {
          return {
            transitioned: true,
            newState: ANCHOR_STATE.RELEASED,
            anchor: { ...currentAnchor, state: ANCHOR_STATE.RELEASED, releasedAt: Date.now() },
            evidence: { reason: 'anchor released after 3+ levels of weakening' }
          };
        }

        return {
          transitioned: false,
          newState: ANCHOR_STATE.WEAKENING,
          anchor: { ...currentAnchor, consistency: currentConsistency },
          evidence: { reason: 'anchor weakening continues' }
        };
      }

      // RELEASED state transitions
      if (currentAnchor.state === ANCHOR_STATE.RELEASED) {
        return {
          transitioned: true,
          newState: ANCHOR_STATE.NONE,
          anchor: { ...currentAnchor, state: ANCHOR_STATE.NONE, archetype: null },
          evidence: { reason: 'released anchor reset' }
        };
      }

      return {
        transitioned: false,
        newState: currentAnchor.state,
        anchor: currentAnchor,
        evidence: { reason: 'unknown state' }
      };
    } catch (err) {
      SWSELogger.error('[BuildIdentityDetector] Error determining next state:', err);
     return {
        transitioned: false,
        newState: currentAnchor?.state ?? ANCHOR_STATE.NONE,
        anchor: currentAnchor,
        evidence: { error: err.message }
      };
    }
  }
}