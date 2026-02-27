/**
 * BuildIdentityAnchor (PHASE F PART 3B: Refactored Facade)
 *
 * Public API compatibility layer for anchor management.
 * Delegates to BuildIdentityDetector (logic) and AnchorRepository (persistence).
 *
 * GOVERNANCE:
 * - All detection logic → BuildIdentityDetector (pure, testable)
 * - All persistence → AnchorRepository (through SuggestionStateService)
 * - This module is a backwards-compatible facade only
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BuildIdentityDetector, ANCHOR_STATE, THEME_TO_ARCHETYPE } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIdentityDetector.js";
import { AnchorRepository } from "/systems/foundryvtt-swse/scripts/engine/suggestion/AnchorRepository.js";



// ─────────────────────────────────────────────────────────────
// Re-exports for backwards compatibility
// Actual definitions in BuildIdentityDetector
// ─────────────────────────────────────────────────────────────

export { ANCHOR_STATE, THEME_TO_ARCHETYPE } from './BuildIdentityDetector.js';

export class BuildIdentityAnchor {

  /**
   * Detect potential anchor based on recent player choices
   * Delegates to BuildIdentityDetector (pure logic)
   *
   * @param {Actor} actor
   * @returns {Object} { archetype: "key" | null, consistency: 0-1, confidence: 0-1, evidence: {...} }
   */
  static detectAnchor(actor) {
    try {
      const history = actor?.system?.suggestionEngine?.history?.recent || [];
      return BuildIdentityDetector.detectAnchor(history);
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error detecting anchor:', err);
      return { archetype: null, consistency: 0, confidence: 0, evidence: { error: err.message } };
    }
  }

  /**
   * Validate and update primary anchor after level-up
   * Delegates to BuildIdentityDetector (state machine logic) and AnchorRepository (persistence)
   *
   * @param {Actor} actor
   * @returns {Promise<Object>} { updated: boolean, anchor, newState }
   */
  static async validateAndUpdateAnchor(actor) {
    try {
      await AnchorRepository.initializeStorage(actor);

      const primaryAnchor = AnchorRepository.getPrimaryAnchor(actor);
      const history = actor?.system?.suggestionEngine?.history?.recent || [];
      const currentLevel = actor?.system?.level ?? 1;

      // Use BuildIdentityDetector to determine next state (pure logic)
      const result = BuildIdentityDetector.determineNextState(primaryAnchor, history, currentLevel);

      if (result.transitioned) {
        // Persist the state change through AnchorRepository
        const updated = await AnchorRepository.updateAnchor(actor, 'primary', result.anchor);
        SWSELogger.log(`[BuildIdentityAnchor] Anchor state transitioned: ${result.newState}`);
        return { updated: true, anchor: updated, newState: result.newState };
      }

      return { updated: false, anchor: result.anchor, newState: result.newState };
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error validating anchor:', err);
      return { updated: false, anchor: null, newState: ANCHOR_STATE.NONE };
    }
  }

  /**
   * Player confirms an anchor (locks it in)
   * Delegates to AnchorRepository (persistence)
   *
   * @param {Actor} actor
   * @param {string} archetypeKey
   * @returns {Promise<Object>} Updated anchor
   */
  static async confirmAnchor(actor, archetypeKey) {
    try {
      return await AnchorRepository.confirmAnchor(actor, 'primary');
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error confirming anchor:', err);
      return null;
    }
  }

  /**
   * Player rejects a proposed anchor
   * Delegates to AnchorRepository (persistence)
   *
   * @param {Actor} actor
   * @returns {Promise<Object>} Updated anchor
   */
  static async rejectAnchor(actor) {
    try {
      return await AnchorRepository.rejectAnchor(actor, 'primary');

      if (primaryAnchor.state === ANCHOR_STATE.PROPOSED) {
        primaryAnchor.state = ANCHOR_STATE.NONE;
        primaryAnchor.archetype = null;

        SWSELogger.log('[BuildIdentityAnchor] Anchor rejected by player');
      }
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error rejecting anchor:', err);
    }
  }

  /**
   * Apply anchor bonus/penalty to suggestion confidence
   * Adjusts confidence based on whether suggestion matches locked anchor
   *
   * @param {number} baseConfidence - 0-1
   * @param {Actor} actor
   * @param {Object} suggestion - { theme, category, itemName }
   * @returns {number} Adjusted confidence 0-1
   */
  static applyAnchorWeight(baseConfidence, actor, suggestion) {
    try {
      const primaryAnchor = this.getAnchor(actor, 'primary');
      if (!primaryAnchor || primaryAnchor.state !== ANCHOR_STATE.LOCKED) {
        return baseConfidence;
      }

      if (!suggestion.theme) {
        return baseConfidence;
      }

      // Get archetype for the suggestion's theme
      const suggestionArchetypes = THEME_TO_ARCHETYPE[suggestion.theme] || [];
      const matchesAnchor = suggestionArchetypes.includes(primaryAnchor.archetype);

      // Weights based on anchor state
      if (matchesAnchor) {
        // +0.15 for matches to locked anchor
        return Math.min(1.0, baseConfidence + 0.15);
      } else {
        // -0.2 for contradicts locked anchor (but never drop below 0.2)
        return Math.max(0.2, baseConfidence - 0.2);
      }
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error applying anchor weight:', err);
      return baseConfidence;
    }
  }

  /**
   * Get anchor by position
   * Delegates to AnchorRepository (read-only)
   *
   * @param {Actor} actor
   * @param {string} position - "primary" | "secondary"
   * @returns {Object|null}
   */
  static getAnchor(actor, position = 'primary') {
    try {
      return AnchorRepository.getAnchor(actor, position);
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error getting anchor:', err);
      return null;
    }
  }

  /**
   * Check if character's recent picks indicate a potential pivot
   * @param {Actor} actor
   * @returns {Object|null} { emergingTheme, confidence } or null
   */
  static checkForPotentialPivot(actor) {
    try {
      const primaryAnchor = this.getAnchor(actor, 'primary');
      if (!primaryAnchor || primaryAnchor.state !== ANCHOR_STATE.LOCKED) {
        return null;
      }

      const history = actor.system.suggestionEngine?.history?.recent || [];
      if (history.length < 3) return null;

      // Count recent themes (last 5-7 picks)
      const recentPicks = history.slice(-7);
      const themeCounts = {};
      for (const entry of recentPicks) {
        if (!entry.theme) continue;
        themeCounts[entry.theme] = (themeCounts[entry.theme] || 0) + 1;
      }

      // Find theme that's NOT the anchor
      let emergingTheme = null;
      let emergingCount = 0;
      for (const [theme, count] of Object.entries(themeCounts)) {
        const archetypes = THEME_TO_ARCHETYPE[theme] || [];
        if (archetypes.includes(primaryAnchor.archetype)) {
          continue;  // Skip anchor theme
        }
        if (count > emergingCount) {
          emergingTheme = theme;
          emergingCount = count;
        }
      }

      if (!emergingTheme || emergingCount < 2) {
        return null;
      }

      const confidence = emergingCount / recentPicks.length;
      return { emergingTheme, confidence };
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error checking for pivot:', err);
      return null;
    }
  }

  /**
   * Initialize anchor storage
   * Delegates to AnchorRepository (persistence)
   *
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    try {
      return await AnchorRepository.initializeStorage(actor);
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error initializing storage:', err);
    }
  }
}
