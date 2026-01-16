/**
 * BuildIdentityAnchor (ArchetypeDetector)
 *
 * Phase 2A: Identity Anchor Lifecycle
 *
 * Detects build archetypes / identity anchors and manages their lifecycle.
 * Anchors represent the "who you are becoming" - a stable identity for the character.
 *
 * Anchor States:
 * - NONE: No anchor detected
 * - PROPOSED: Anchor detected but not confirmed (consistency >= 0.6)
 * - LOCKED: Anchor confirmed by player (manually activated)
 * - WEAKENING: Anchor locked but consistency dropped (< 0.4 for 2+ levels)
 * - RELEASED: Anchor was weakening for 3+ levels, now freed to pivot
 *
 * Key Rules:
 * - Anchors never auto-lock (require player confirmation)
 * - Lock requires consistency over recent levels
 * - Decay happens gradually (avoid mis-classification)
 * - Released anchors allow pivots
 */

import { SWSELogger } from '../utils/logger.js';
import { ARCHETYPE_CATALOG } from './ArchetypeDefinitions.js';
import { BUILD_THEMES } from './BuildIntent.js';

// ─────────────────────────────────────────────────────────────
// Anchor State Enum
// ─────────────────────────────────────────────────────────────

export const ANCHOR_STATE = {
  NONE: 'none',
  PROPOSED: 'proposed',
  LOCKED: 'locked',
  WEAKENING: 'weakening',
  RELEASED: 'released'
};

// ─────────────────────────────────────────────────────────────
// Theme to Archetype Mapping
// Maps BUILD_THEMES to primary and secondary archetypes
// ─────────────────────────────────────────────────────────────

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

export class BuildIdentityAnchor {

  /**
   * Detect potential anchor based on recent player choices
   * Analyzes accepted suggestions and their themes
   *
   * @param {Actor} actor
   * @returns {Object} { archetype: "key" | null, confidence: 0-1, evidence: {...} }
   */
  static detectAnchor(actor) {
    try {
      const history = actor.system.suggestionEngine?.history?.recent || [];

      // Get recent accepted suggestions
      const acceptedSuggestions = history.filter(e => e.outcome === 'accepted');
      if (acceptedSuggestions.length === 0) {
        return { archetype: null, confidence: 0, evidence: { reason: 'no accepted suggestions yet' } };
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
        return { archetype: null, confidence: 0, evidence: { reason: 'no themes in recent picks' } };
      }

      // Calculate consistency score: how dominant is the theme?
      // Range 0-1, where 1.0 = 100% of picks are this theme
      const consistencyScore = dominantCount / acceptedSuggestions.length;

      // Map theme to archetype(s)
      const primaryArchetype = THEME_TO_ARCHETYPE[dominantTheme]?.[0];
      if (!primaryArchetype) {
        return { archetype: null, confidence: 0, evidence: { reason: `theme "${dominantTheme}" has no archetype mapping` } };
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
      SWSELogger.error('[BuildIdentityAnchor] Error detecting anchor:', err);
      return { archetype: null, confidence: 0, evidence: { error: err.message } };
    }
  }

  /**
   * Validate and update primary anchor after level-up
   * Advances anchor state machine based on consistency and player decisions
   *
   * @param {Actor} actor
   * @returns {Promise<Object>} { updated: boolean, anchor, newState }
   */
  static async validateAndUpdateAnchor(actor) {
    try {
      await this.initializeStorage(actor);

      const primaryAnchor = actor.system.suggestionEngine.anchors.primary;
      if (!primaryAnchor || primaryAnchor.state === ANCHOR_STATE.NONE) {
        // No anchor currently - try to detect one
        const detected = this.detectAnchor(actor);
        if (detected.archetype && detected.consistency >= 0.6) {
          primaryAnchor.state = ANCHOR_STATE.PROPOSED;
          primaryAnchor.archetype = detected.archetype;
          primaryAnchor.consistency = detected.consistency;
          primaryAnchor.confidence = detected.confidence;
          primaryAnchor.evidence = detected.evidence;
          primaryAnchor.detectedAt = Date.now();

          SWSELogger.log(`[BuildIdentityAnchor] Anchor proposed: ${detected.archetype} (consistency: ${detected.consistency.toFixed(2)})`);
          return { updated: true, anchor: primaryAnchor, newState: ANCHOR_STATE.PROPOSED };
        }
        return { updated: false, anchor: primaryAnchor, newState: ANCHOR_STATE.NONE };
      }

      // Anchor exists - validate and advance state
      const detected = this.detectAnchor(actor);
      const currentConsistency = detected.consistency || 0;

      // State machine transitions
      if (primaryAnchor.state === ANCHOR_STATE.PROPOSED) {
        // PROPOSED -> LOCKED (if player confirms) or PROPOSED -> NONE (if consistency drops)
        if (currentConsistency < 0.5) {
          primaryAnchor.state = ANCHOR_STATE.NONE;
          primaryAnchor.archetype = null;
          SWSELogger.log('[BuildIdentityAnchor] Proposed anchor cancelled (consistency dropped)');
          return { updated: true, anchor: primaryAnchor, newState: ANCHOR_STATE.NONE };
        }
        // Stay PROPOSED until confirmed
        primaryAnchor.consistency = currentConsistency;
        return { updated: false, anchor: primaryAnchor, newState: ANCHOR_STATE.PROPOSED };
      }

      if (primaryAnchor.state === ANCHOR_STATE.LOCKED) {
        // LOCKED -> WEAKENING (if consistency drops below 0.4 for one level)
        if (currentConsistency < 0.4) {
          primaryAnchor.weakeningStartLevel = actor.system.level;
          primaryAnchor.state = ANCHOR_STATE.WEAKENING;
          SWSELogger.log(`[BuildIdentityAnchor] Anchor weakening at level ${actor.system.level}`);
          return { updated: true, anchor: primaryAnchor, newState: ANCHOR_STATE.WEAKENING };
        }
        // Stay LOCKED, update consistency
        primaryAnchor.consistency = currentConsistency;
        return { updated: false, anchor: primaryAnchor, newState: ANCHOR_STATE.LOCKED };
      }

      if (primaryAnchor.state === ANCHOR_STATE.WEAKENING) {
        // WEAKENING -> LOCKED (if consistency recovers)
        if (currentConsistency >= 0.6) {
          primaryAnchor.state = ANCHOR_STATE.LOCKED;
          primaryAnchor.weakeningStartLevel = null;
          SWSELogger.log('[BuildIdentityAnchor] Anchor stabilized back to LOCKED');
          return { updated: true, anchor: primaryAnchor, newState: ANCHOR_STATE.LOCKED };
        }

        // WEAKENING -> RELEASED (if consistency stays low for 3+ levels)
        const weakeningDuration = (actor.system.level || 1) - (primaryAnchor.weakeningStartLevel || actor.system.level);
        if (weakeningDuration >= 3 && currentConsistency < 0.3) {
          primaryAnchor.state = ANCHOR_STATE.RELEASED;
          primaryAnchor.releasedAt = Date.now();
          SWSELogger.log('[BuildIdentityAnchor] Anchor released after 3+ levels of weakening');
          return { updated: true, anchor: primaryAnchor, newState: ANCHOR_STATE.RELEASED };
        }

        primaryAnchor.consistency = currentConsistency;
        return { updated: false, anchor: primaryAnchor, newState: ANCHOR_STATE.WEAKENING };
      }

      if (primaryAnchor.state === ANCHOR_STATE.RELEASED) {
        // RELEASED -> NONE (reset anchor, allow new detection)
        primaryAnchor.state = ANCHOR_STATE.NONE;
        primaryAnchor.archetype = null;
        SWSELogger.log('[BuildIdentityAnchor] Anchor reset from RELEASED');
        return { updated: true, anchor: primaryAnchor, newState: ANCHOR_STATE.NONE };
      }

      return { updated: false, anchor: primaryAnchor, newState: primaryAnchor.state };
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error validating anchor:', err);
      return { updated: false, anchor: null, newState: ANCHOR_STATE.NONE };
    }
  }

  /**
   * Player confirms an anchor (locks it in)
   * @param {Actor} actor
   * @param {string} archetypeKey
   * @returns {Promise<void>}
   */
  static async confirmAnchor(actor, archetypeKey) {
    try {
      await this.initializeStorage(actor);

      const primaryAnchor = actor.system.suggestionEngine.anchors.primary;
      if (!primaryAnchor) return;

      if (primaryAnchor.state === ANCHOR_STATE.PROPOSED) {
        primaryAnchor.state = ANCHOR_STATE.LOCKED;
        primaryAnchor.confirmedBy = 'player';
        primaryAnchor.confirmedAt = Date.now();

        SWSELogger.log(`[BuildIdentityAnchor] Anchor confirmed and locked: ${archetypeKey}`);
      }
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error confirming anchor:', err);
    }
  }

  /**
   * Player rejects a proposed anchor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async rejectAnchor(actor) {
    try {
      await this.initializeStorage(actor);

      const primaryAnchor = actor.system.suggestionEngine.anchors.primary;
      if (!primaryAnchor) return;

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
   * @param {Actor} actor
   * @param {string} position - "primary" | "secondary"
   * @returns {Object|null}
   */
  static getAnchor(actor, position = "primary") {
    try {
      if (!actor.system.suggestionEngine) return null;
      const anchor = actor.system.suggestionEngine.anchors?.[position];
      return anchor || null;
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
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    try {
      if (!actor.system.suggestionEngine) {
        actor.system.suggestionEngine = {};
      }
      if (!actor.system.suggestionEngine.anchors) {
        actor.system.suggestionEngine.anchors = {
          primary: {
            state: ANCHOR_STATE.NONE,
            archetype: null,
            consistency: 0,
            confidence: 0,
            evidence: {},
            detectedAt: null,
            confirmedAt: null,
            confirmedBy: null,
            weakeningStartLevel: null,
            releasedAt: null
          },
          secondary: {
            state: ANCHOR_STATE.NONE,
            archetype: null,
            consistency: 0,
            confidence: 0,
            evidence: {}
          },
          history: []
        };
        SWSELogger.log('[BuildIdentityAnchor] Storage initialized');
      }
    } catch (err) {
      SWSELogger.error('[BuildIdentityAnchor] Error initializing storage:', err);
    }
  }
}
