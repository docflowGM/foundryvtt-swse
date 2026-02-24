/**
 * AnchorRepository
 *
 * PHASE F PART 3: God Object Split - Persistence Layer
 *
 * Manages storage and retrieval of anchor state.
 * All anchor mutations flow through SuggestionStateService.
 *
 * Owns:
 * - Anchor data persistence
 * - Anchor storage initialization
 * - Anchor retrieval (read-only)
 * - Storage schema validation
 *
 * Delegates to:
 * - SuggestionStateService (for state mutations)
 * - BuildIdentityDetector (for logic)
 *
 * Never owns: Logic, calculations, state transitions
 */

import { SWSELogger } from '../../utils/logger.js';
import { SuggestionStateService } from './SuggestionStateService.js';
import { ANCHOR_STATE } from './BuildIdentityDetector.js';

export class AnchorRepository {
  /**
   * Initialize anchor storage structure on actor
   *
   * @param {Actor} actor - Target actor
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

        SWSELogger.log('[AnchorRepository] Storage initialized');
      }
    } catch (err) {
      SWSELogger.error('[AnchorRepository] Error initializing storage:', err);
    }
  }

  /**
   * Get anchor by position
   *
   * @param {Actor} actor - Target actor
   * @param {string} position - "primary" or "secondary"
   * @returns {Object|null} Anchor data or null
   */
  static getAnchor(actor, position = 'primary') {
    try {
      if (!actor?.system?.suggestionEngine) return null;
      const anchor = actor.system.suggestionEngine.anchors?.[position];
      return anchor || null;
    } catch (err) {
      SWSELogger.error(`[AnchorRepository] Error getting anchor "${position}":`, err);
      return null;
    }
  }

  /**
   * Get primary anchor (convenience method)
   *
   * @param {Actor} actor - Target actor
   * @returns {Object|null} Primary anchor data
   */
  static getPrimaryAnchor(actor) {
    return this.getAnchor(actor, 'primary');
  }

  /**
   * Get secondary anchor (convenience method)
   *
   * @param {Actor} actor - Target actor
   * @returns {Object|null} Secondary anchor data
   */
  static getSecondaryAnchor(actor) {
    return this.getAnchor(actor, 'secondary');
  }

  /**
   * Update anchor state through SuggestionStateService
   *
   * @param {Actor} actor - Target actor
   * @param {string} position - "primary" or "secondary"
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated anchor data
   */
  static async updateAnchor(actor, position = 'primary', updates = {}) {
    try {
      await this.initializeStorage(actor);

      const anchor = this.getAnchor(actor, position);
      if (!anchor) {
        throw new Error(`Anchor not found at position "${position}"`);
      }

      const updatedAnchor = { ...anchor, ...updates };

      // Store through SuggestionStateService
      const currentState = actor.getFlag('swse', 'suggestionEngine') || {};
      if (!currentState.anchors) {
        currentState.anchors = actor.system.suggestionEngine.anchors;
      }
      currentState.anchors[position] = updatedAnchor;

      await actor.setFlag('swse', 'suggestionEngine', currentState);

      // Also update in-memory state for consistency
      if (actor.system.suggestionEngine.anchors) {
        actor.system.suggestionEngine.anchors[position] = updatedAnchor;
      }

      SWSELogger.log(`[AnchorRepository] Anchor updated`, {
        actor: actor.name,
        position,
        newState: updatedAnchor.state,
        archetype: updatedAnchor.archetype
      });

      return updatedAnchor;
    } catch (err) {
      SWSELogger.error(
        `[AnchorRepository] Error updating anchor "${position}" for ${actor?.name ?? 'unknown'}`,
        err
      );
      throw err;
    }
  }

  /**
   * Confirm (lock) an anchor
   *
   * @param {Actor} actor - Target actor
   * @param {string} position - "primary" or "secondary"
   * @returns {Promise<Object>} Updated anchor data
   */
  static async confirmAnchor(actor, position = 'primary') {
    try {
      const anchor = this.getAnchor(actor, position);
      if (!anchor) {
        throw new Error(`Cannot confirm: anchor not found at position "${position}"`);
      }

      return await this.updateAnchor(actor, position, {
        state: ANCHOR_STATE.LOCKED,
        confirmedBy: 'player',
        confirmedAt: Date.now()
      });
    } catch (err) {
      SWSELogger.error(`[AnchorRepository] Error confirming anchor:`, err);
      throw err;
    }
  }

  /**
   * Reject a proposed anchor
   *
   * @param {Actor} actor - Target actor
   * @param {string} position - "primary" or "secondary"
   * @returns {Promise<Object>} Updated anchor data
   */
  static async rejectAnchor(actor, position = 'primary') {
    try {
      const anchor = this.getAnchor(actor, position);
      if (!anchor) {
        throw new Error(`Cannot reject: anchor not found at position "${position}"`);
      }

      return await this.updateAnchor(actor, position, {
        state: ANCHOR_STATE.NONE,
        archetype: null,
        confirmedAt: null,
        confirmedBy: null
      });
    } catch (err) {
      SWSELogger.error(`[AnchorRepository] Error rejecting anchor:`, err);
      throw err;
    }
  }

  /**
   * Record anchor change in history
   *
   * @param {Actor} actor - Target actor
   * @param {Object} entry - Change entry
   * @returns {Promise<void>}
   */
  static async recordAnchorHistory(actor, entry) {
    try {
      await this.initializeStorage(actor);

      if (!actor.system.suggestionEngine.anchors.history) {
        actor.system.suggestionEngine.anchors.history = [];
      }

      actor.system.suggestionEngine.anchors.history.push({
        ...entry,
        recordedAt: Date.now()
      });

      // Update through SuggestionStateService
      const currentState = actor.getFlag('swse', 'suggestionEngine') || {};
      if (!currentState.anchors) {
        currentState.anchors = actor.system.suggestionEngine.anchors;
      }

      await actor.setFlag('swse', 'suggestionEngine', currentState);

      SWSELogger.log(`[AnchorRepository] Anchor history recorded`, {
        actor: actor.name,
        entry: entry.reason
      });
    } catch (err) {
      SWSELogger.error(`[AnchorRepository] Error recording anchor history:`, err);
    }
  }

  export default {
    initializeStorage,
    getAnchor,
    getPrimaryAnchor,
    getSecondaryAnchor,
    updateAnchor,
    confirmAnchor,
    rejectAnchor,
    recordAnchorHistory
  };
}
