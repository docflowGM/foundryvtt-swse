/**
 * SessionStorage - ProgressionSession Persistence Layer
 *
 * Part of PHASE 1: Stability Foundation
 *
 * Persists and recovers progression session state across page reloads.
 * Key principle: Never trust stored indices — always recompute active steps,
 * repair current step, and rebuild status matrix on restore.
 *
 * Architecture:
 * - Auto-save session state to actor flags after each commit
 * - Restore session on shell init
 * - Recompute active steps (don't trust stored step list)
 * - Recompute step statuses from scratch
 * - Repair current step if invalid
 * - Track last checkpoint for recovery diagnostics
 *
 * Storage structure:
 * {
 *   sessionId: string (unique identifier)
 *   mode: 'chargen' | 'levelup' | 'template'
 *   subtype: 'actor' | 'npc' | 'droid' | 'follower' | 'nonheroic'
 *   draftSelections: {...} (all selections made so far)
 *   visitedStepIds: [...] (steps player has entered)
 *   invalidatedStepIds: [...] (steps marked stale by upstream changes)
 *   currentStepId: string (current visible step)
 *   completedStepIds: [...] (steps already finalized)
 *   timestamp: ISO string (when saved)
 *   version: 1 (for future migrations)
 * }
 */

import { swseLogger } from '../../../utils/logger.js';

export class SessionStorage {
  /**
   * Save session state to actor flags.
   * Called after each commit to ensure recovery capability.
   *
   * @param {Actor} actor - The actor
   * @param {ProgressionSession} session - The session to save
   * @param {string} mode - 'chargen' | 'levelup' | 'template'
   * @returns {Promise<boolean>} true if save successful
   */
  static async saveSession(actor, session, mode = 'chargen') {
    if (!actor || !session) {
      swseLogger.warn('[SessionStorage] Cannot save: actor or session missing');
      return false;
    }

    try {
      const sessionData = this._compileSessionData(session, mode);
      await actor.setFlag('foundryvtt-swse', `progression.${mode}.session`, sessionData);

      swseLogger.debug('[SessionStorage] Session saved', {
        actorId: actor.id,
        mode,
        sessionId: sessionData.sessionId,
      });

      return true;
    } catch (err) {
      swseLogger.error('[SessionStorage] Failed to save session:', err);
      return false;
    }
  }

  /**
   * Load session state from actor flags.
   * Called during shell init to restore progression.
   *
   * @param {Actor} actor - The actor
   * @param {string} mode - 'chargen' | 'levelup' | 'template'
   * @returns {Object|null} Session data or null if none exists
   */
  static loadSession(actor, mode = 'chargen') {
    if (!actor) {
      swseLogger.warn('[SessionStorage] Cannot load: no actor');
      return null;
    }

    try {
      const sessionData = actor.getFlag('foundryvtt-swse', `progression.${mode}.session`);

      if (!sessionData) {
        swseLogger.debug('[SessionStorage] No saved session found', {
          actorId: actor.id,
          mode,
        });
        return null;
      }

      swseLogger.debug('[SessionStorage] Session loaded', {
        actorId: actor.id,
        mode,
        sessionId: sessionData.sessionId,
        visitedSteps: sessionData.visitedStepIds?.length || 0,
      });

      return sessionData;
    } catch (err) {
      swseLogger.warn('[SessionStorage] Failed to load session:', err);
      return null;
    }
  }

  /**
   * Check if a saved session exists.
   *
   * @param {Actor} actor - The actor
   * @param {string} mode - 'chargen' | 'levelup' | 'template'
   * @returns {boolean}
   */
  static hasSession(actor, mode = 'chargen') {
    return !!this.loadSession(actor, mode);
  }

  /**
   * Get session summary for UI display.
   * Used for "Resume progression?" prompts.
   *
   * @param {Object} sessionData - Session data from loadSession
   * @returns {Object|null} Summary with display info
   *   {
   *     mode: string
   *     timestamp: ISO string
   *     lastStepId: string
   *     selectionCount: number
   *     visitedStepCount: number
   *     preview: string (e.g., "Species selected, at Attributes step")
   *   }
   */
  static getSessionSummary(sessionData) {
    if (!sessionData) return null;

    const selections = Object.values(sessionData.draftSelections || {})
      .filter(v => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true));

    return {
      mode: sessionData.mode,
      timestamp: sessionData.timestamp,
      lastStepId: sessionData.currentStepId,
      selectionCount: selections.length,
      visitedStepCount: sessionData.visitedStepIds?.length || 0,
      preview: this._generatePreview(sessionData),
    };
  }

  /**
   * Clear saved session.
   * Called after finalization or explicit reset.
   *
   * @param {Actor} actor - The actor
   * @param {string} mode - 'chargen' | 'levelup' | 'template'
   * @returns {Promise<boolean>}
   */
  static async clearSession(actor, mode = 'chargen') {
    if (!actor) return false;

    try {
      await actor.setFlag('foundryvtt-swse', `progression.${mode}.session`, null);

      swseLogger.debug('[SessionStorage] Session cleared', {
        actorId: actor.id,
        mode,
      });

      return true;
    } catch (err) {
      swseLogger.error('[SessionStorage] Failed to clear session:', err);
      return false;
    }
  }

  /**
   * Restore session data into a ProgressionSession object.
   * CRITICAL: Recompute active steps and repair current step.
   * Never trust stored indices or step list.
   *
   * @param {ProgressionSession} session - Target session object
   * @param {Object} sessionData - Data from loadSession
   * @returns {boolean} true if restore successful
   */
  static restoreIntoSession(session, sessionData) {
    if (!session || !sessionData) {
      swseLogger.warn('[SessionStorage] Cannot restore: invalid args');
      return false;
    }

    try {
      // Restore selections. Keep session defaults for missing keys and ignore
      // malformed stored values instead of letting one bad step payload erase the
      // rest of the chargen run.
      if (sessionData.draftSelections) {
        const restoredSelections = { ...session.draftSelections };
        for (const [key, rawValue] of Object.entries(sessionData.draftSelections)) {
          if (!Object.prototype.hasOwnProperty.call(restoredSelections, key)) continue;
          try {
            const value = typeof session._coerceSelectionToSchema === 'function'
              ? session._coerceSelectionToSchema(key, rawValue, { stepId: 'session-restore' })
              : rawValue;
            if (typeof session._validateSelection === 'function') {
              session._validateSelection(key, value);
            }
            restoredSelections[key] = value;
          } catch (err) {
            swseLogger.warn('[SessionStorage] Ignored invalid stored selection during restore', {
              key,
              message: err?.message || String(err),
            });
          }
        }
        session.draftSelections = restoredSelections;
      }

      // Restore tracking (visited, invalidated, completed)
      if (sessionData.visitedStepIds) {
        session.visitedStepIds = [...sessionData.visitedStepIds];
      }

      if (sessionData.invalidatedStepIds) {
        session.invalidatedStepIds = [...sessionData.invalidatedStepIds];
      }

      if (sessionData.completedStepIds) {
        session.completedStepIds = [...sessionData.completedStepIds];
      }

      // Store current step hint (will be repaired by shell if invalid)
      session.currentStepId = sessionData.currentStepId || null;

      // Update timestamps
      session.lastModifiedAt = Date.now();

      swseLogger.debug('[SessionStorage] Restored into session', {
        visitedSteps: session.visitedStepIds.length,
        invalidatedSteps: session.invalidatedStepIds.length,
        currentStepId: session.currentStepId,
      });

      return true;
    } catch (err) {
      swseLogger.error('[SessionStorage] Failed to restore into session:', err);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Internal Methods
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Compile session data for storage.
   * @private
   */
  static _compileSessionData(session, mode) {
    // Generate unique session ID for diagnostics
    const sessionId = `${mode}-${session.actorId}-${Date.now()}`;

    return {
      // Metadata
      sessionId,
      mode,
      subtype: session.subtype,
      timestamp: new Date().toISOString(),
      version: 1,

      // User selections (the primary recoverable state)
      draftSelections: { ...session.draftSelections },

      // Progression tracking (must be restored exactly)
      visitedStepIds: [...session.visitedStepIds],
      invalidatedStepIds: [...session.invalidatedStepIds],
      currentStepId: session.currentStepId,
      completedStepIds: [...session.completedStepIds],

      // Entitlements for reference (recomputed on restore)
      derivedEntitlements: { ...session.derivedEntitlements },
    };
  }

  /**
   * Generate human-readable preview of session state.
   * @private
   */
  static _generatePreview(sessionData) {
    const parts = [];

    // Check what's been selected
    const selections = sessionData.draftSelections || {};
    if (selections.species) parts.push('Species selected');
    if (selections.class) parts.push('Class selected');
    if (selections.background) parts.push('Background selected');
    if (selections.attributes) parts.push('Attributes distributed');
    if (selections.feats?.length > 0) parts.push('Feats selected');
    if (selections.talents?.length > 0) parts.push('Talents selected');

    // Add current step
    if (sessionData.currentStepId) {
      parts.push(`at ${sessionData.currentStepId} step`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No progress yet';
  }
}
