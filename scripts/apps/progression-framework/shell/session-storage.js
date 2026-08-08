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

/**
 * PHASE 4: write-behind autosave debounce window. Long enough to collapse
 * one interaction burst (a handful of commits from one player action) into
 * a single actor flag write; short enough that a player closing right after
 * a commit still gets a durable save via flushSession()/close(), not a lost
 * window.
 */
const AUTOSAVE_DEBOUNCE_MS = 100;

/**
 * PHASE 4: per actor+mode write-behind queue state.
 *
 * key = `${actorId}:${mode}` -> {
 *   pendingSnapshot: plain session-data object awaiting write, or null
 *   pendingActor: the actor that snapshot belongs to
 *   timer: debounce timer handle, or null
 *   writeInFlight: Promise<boolean> of the write currently running, or null
 *   clearing: true while a clearSession() barrier is active for this key
 * }
 *
 * This is a transient, in-memory, per-process queue — not a persisted
 * cache of session STATUS or data. It never survives past the actual
 * actor.setFlag() write it exists to serialize/coalesce. Idle entries
 * (nothing queued, nothing in flight, not clearing) are removed from the
 * map — see maybeCleanupEntry() — so this cannot grow unbounded across a
 * long session touching many actors.
 */
const pendingWrites = new Map();

function queueKey(actorId, mode) {
  return `${actorId}:${mode}`;
}

function getQueueEntry(key) {
  let entry = pendingWrites.get(key);
  if (!entry) {
    entry = { pendingSnapshot: null, pendingActor: null, timer: null, writeInFlight: null, clearing: false };
    pendingWrites.set(key, entry);
  }
  return entry;
}

/** Drop a fully-idle entry so the map does not grow unbounded. Safe to call
 * any time — a genuinely idle entry has nothing referencing it, and
 * getQueueEntry() transparently recreates one the next time it's needed. */
function maybeCleanupEntry(key) {
  const entry = pendingWrites.get(key);
  if (!entry) return;
  if (!entry.timer && !entry.pendingSnapshot && !entry.writeInFlight && !entry.clearing) {
    pendingWrites.delete(key);
  }
}

export class SessionStorage {
  /**
   * Write-behind autosave: compile a snapshot now and schedule it to be
   * written after a short debounce window, replacing any snapshot already
   * queued for this actor+mode (latest wins). Does not wait for the actor
   * flag write — normal commit persistence must never block player
   * interaction on it. Use saveSession() when the caller needs a durable
   * awaited write, or flushSession() to drain whatever is currently queued.
   *
   * @param {Actor} actor
   * @param {ProgressionSession} session
   * @param {string} [mode]
   */
  static queueSessionSave(actor, session, mode = 'chargen') {
    if (!actor || !session) return;
    const key = queueKey(actor.id, mode);
    const entry = getQueueEntry(key);
    // PHASE 4.1: a save racing an active clearSession() barrier represents
    // pre-clear intent (or, at best, is indistinguishable from it) — discard
    // it rather than let it resurrect the session the clear is removing.
    if (entry.clearing) {
      swseLogger.debug('[SessionStorage] Autosave discarded: clearSession() barrier active', {
        actorId: actor.id,
        mode,
      });
      return;
    }
    entry.pendingSnapshot = this._compileSessionData(session, mode);
    entry.pendingActor = actor;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this._drain(key);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /**
   * Durable, serialized save. Compiles a snapshot now, cancels any pending
   * debounce window for this actor+mode, and drains the queue immediately.
   * Still participates in the SAME per-actor+mode serialization as
   * queueSessionSave() — a write already in flight is awaited first, so
   * this can never race a debounced autosave for the same actor+mode.
   *
   * Resolves only once the requested snapshot (or a newer one that
   * superseded it before this could run) has completed its actor flag
   * write, or been proven semantically identical to what's already stored.
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

    const key = queueKey(actor.id, mode);
    const entry = getQueueEntry(key);
    // PHASE 4.1: same clear-barrier guard as queueSessionSave() — a durable
    // save requested while a clear is in progress is pre-clear intent too.
    if (entry.clearing) {
      swseLogger.debug('[SessionStorage] saveSession() discarded: clearSession() barrier active', {
        actorId: actor.id,
        mode,
      });
      return false;
    }
    entry.pendingSnapshot = this._compileSessionData(session, mode);
    entry.pendingActor = actor;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    return this._drain(key);
  }

  /**
   * Durability boundary: write whatever is currently queued for this
   * actor+mode (waiting behind any write already in flight), then resolve.
   * A no-op — resolves immediately true — when nothing is queued and
   * nothing is in flight. Call this before an irreversible operation
   * (finalization) or on close, so a debounce window that has not fired
   * yet cannot silently drop the latest draft.
   *
   * @param {Actor} actor
   * @param {string} [mode]
   * @returns {Promise<boolean>}
   */
  static async flushSession(actor, mode = 'chargen') {
    if (!actor) return true;
    const key = queueKey(actor.id, mode);
    const entry = pendingWrites.get(key);
    if (!entry) return true;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    return this._drain(key);
  }

  /**
   * Core write-behind worker for one actor+mode key. Serializes behind any
   * write already in flight (max concurrent setFlag per actor+mode = 1),
   * then writes the latest queued snapshot; loops as long as newer work
   * keeps appearing, so "latest wins" holds even under a continuous burst
   * without ever running two writes at once.
   *
   * PHASE 4.1: this loops rather than checking once, because more than one
   * caller can be draining the SAME key concurrently (e.g. an ordinary
   * debounced autosave and an explicit flushSession() call racing the same
   * in-flight write). Looping — re-reading entry.writeInFlight/pendingSnapshot
   * fresh each pass, and following a newer writeInFlight if one appeared
   * while we were awaiting an older one — makes every concurrent caller
   * converge on the SAME final observable result (the durability of the
   * latest state), instead of one caller reporting a stale result it
   * captured before a sibling call picked up newer work.
   * @param {string} key
   * @returns {Promise<boolean>}
   * @private
   */
  static async _drain(key) {
    const entry = pendingWrites.get(key);
    if (!entry) return true;

    let lastResult = true;
    for (;;) {
      if (entry.writeInFlight) {
        const inFlight = entry.writeInFlight;
        try {
          lastResult = await inFlight;
        } catch (_err) {
          // Already logged by _writeSnapshot(); this drain continues regardless.
          lastResult = false;
        }
        // A different write started (and is now in flight) since we began
        // waiting on `inFlight` — a sibling _drain() call picked it up.
        // Follow it instead of reporting our now-stale result.
        if (entry.writeInFlight && entry.writeInFlight !== inFlight) {
          continue;
        }
      }

      // PHASE 4.1: a clearSession() barrier started for this key. Any
      // queued work is pre-clear intent — it must not be written now,
      // underneath the barrier. Let clearSession() finish the job; report
      // the durability of whatever we actually waited on above.
      if (entry.clearing) {
        maybeCleanupEntry(key);
        return lastResult;
      }

      if (!entry.pendingSnapshot) {
        maybeCleanupEntry(key);
        return lastResult;
      }

      const snapshot = entry.pendingSnapshot;
      const actor = entry.pendingActor;
      entry.pendingSnapshot = null;

      const writePromise = this._writeSnapshot(actor, snapshot);
      entry.writeInFlight = writePromise;
      try {
        lastResult = await writePromise;
      } finally {
        if (entry.writeInFlight === writePromise) entry.writeInFlight = null;
      }
      // Loop again: a newer snapshot (or clear barrier) may have appeared
      // while this write was running.
    }
  }

  /**
   * Write one compiled snapshot to actor flags, honoring the existing
   * semantic-dedupe contract (a snapshot identical to what's already stored
   * except for its timestamp is never re-written).
   * @param {Actor} actor
   * @param {Object} sessionData
   * @returns {Promise<boolean>}
   * @private
   */
  static async _writeSnapshot(actor, sessionData) {
    if (!actor || !sessionData) return false;
    try {
      const flagPath = `progression.${sessionData.mode}.session`;
      const existing = actor.getFlag?.('foundryvtt-swse', flagPath);
      if (existing && this._isSemanticallySameSession(existing, sessionData)) {
        swseLogger.debug('[SessionStorage] Session save skipped; state unchanged', {
          actorId: actor.id,
          mode: sessionData.mode,
          sessionId: existing.sessionId || sessionData.sessionId,
        });
        return true;
      }

      await actor.setFlag('foundryvtt-swse', flagPath, sessionData);

      swseLogger.debug('[SessionStorage] Session saved', {
        actorId: actor.id,
        mode: sessionData.mode,
        sessionId: sessionData.sessionId,
      });

      return true;
    } catch (err) {
      swseLogger.error('[SessionStorage] Failed to save session:', err);
      return false;
    }
  }

  /**
   * Read the completion marker for a progression mode.
   * A completed session is final actor state, not recoverable draft state.
   */
  static getCompletedMarker(actor, mode = 'chargen') {
    if (!actor) return null;
    try {
      return actor.getFlag?.('foundryvtt-swse', `progression.${mode}.completed`) || null;
    } catch (_err) {
      return null;
    }
  }

  /**
   * Mark a progression session as finalized.
   * Used as a second guard so stale saved sessions from older paths are never
   * auto-resumed after a successful Confirm/Finish.
   */
  static async markSessionCompleted(actor, sessionData = {}, mode = 'chargen') {
    if (!actor) return false;
    try {
      const marker = {
        completed: true,
        mode,
        sessionId: sessionData?.sessionId || null,
        currentStepId: sessionData?.currentStepId || null,
        completedAt: new Date().toISOString(),
        source: 'progression-finalization'
      };
      await actor.setFlag?.('foundryvtt-swse', `progression.${mode}.completed`, marker);
      swseLogger.debug('[SessionStorage] Session marked complete', {
        actorId: actor.id,
        mode,
        sessionId: marker.sessionId,
      });
      return true;
    } catch (err) {
      swseLogger.warn('[SessionStorage] Failed to mark session complete', err);
      return false;
    }
  }

  /**
   * Some actors were finalized before completion markers existed. Detect those
   * stale chargen sessions conservatively: a saved session parked at Summary
   * plus actor-owned class/progression items means the finalizer already ran.
   */
  static _looksLikeFinalizedActor(actor, sessionData = {}, mode = 'chargen') {
    if (!actor || mode !== 'chargen' || !sessionData) return false;
    try {
      if (actor.system?.progression?.chargenComplete === true) return true;
      const completed = actor.getFlag?.('foundryvtt-swse', 'progression.chargen.completed');
      if (completed?.completed === true) return true;

      const currentStepId = String(sessionData.currentStepId || sessionData.lastStepId || '').toLowerCase();
      const completedSteps = new Set((Array.isArray(sessionData.completedStepIds) ? sessionData.completedStepIds : [])
        .map(step => String(step || '').toLowerCase()));
      const atFinalSummary = currentStepId === 'summary' || completedSteps.has('summary');
      if (!atFinalSummary) return false;

      const items = Array.from(actor.items || []);
      const hasProgressionItems = items.some(item => ['class', 'feat', 'talent', 'force-power', 'force-regimen', 'maneuver'].includes(String(item?.type || '').toLowerCase()));
      const hasFinalizedIdentity = !!(actor.system?.class || actor.system?.species || actor.system?.background);
      const hasHp = Number(actor.system?.hp?.max || 0) > 1;
      return hasProgressionItems && (hasFinalizedIdentity || hasHp);
    } catch (_err) {
      return false;
    }
  }

  static _isCompletedSession(actor, sessionData = {}, mode = 'chargen') {
    const marker = this.getCompletedMarker(actor, mode);
    if (marker?.completed === true) {
      const markerSessionId = marker.sessionId || marker.completedSessionId || null;
      if (!markerSessionId || !sessionData?.sessionId || markerSessionId === sessionData.sessionId) return true;
    }
    return this._looksLikeFinalizedActor(actor, sessionData, mode);
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

      if (this._isCompletedSession(actor, sessionData, mode)) {
        swseLogger.warn('[SessionStorage] Ignoring completed/stale progression session', {
          actorId: actor.id,
          mode,
          sessionId: sessionData.sessionId || null,
          currentStepId: sessionData.currentStepId || null,
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

    const key = queueKey(actor.id, mode);
    const entry = getQueueEntry(key);

    // PHASE 4.1: raise the barrier as the FIRST synchronous statement, before
    // any await. Nothing else can run on this key until we yield, so this
    // atomically closes the window a queued save could otherwise slip
    // through in. From this point until the finally below, queueSessionSave()
    // and saveSession() both refuse new work for this key (see their
    // `entry.clearing` guards) — any save "racing" this clear is pre-clear
    // intent and must not be allowed to resurrect the session being cleared.
    entry.clearing = true;
    try {
      // Cancel/drop whatever was queued, then wait for any write already
      // physically in flight (started before this barrier existed) to
      // finish, so the unset below is always the LAST thing to happen for
      // this key.
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      entry.pendingSnapshot = null;
      if (entry.writeInFlight) {
        try {
          await entry.writeInFlight;
        } catch (_err) {
          // Already logged by _writeSnapshot().
        }
      }
      // Defense in depth: nothing should be able to populate pendingSnapshot
      // while entry.clearing is true (the guards above prevent it), but drop
      // it anyway rather than trust that invariant blindly.
      entry.pendingSnapshot = null;

      try {
        if (typeof actor.unsetFlag === 'function') {
          await actor.unsetFlag('foundryvtt-swse', `progression.${mode}.session`);
        } else {
          await actor.setFlag('foundryvtt-swse', `progression.${mode}.session`, null);
        }

        swseLogger.debug('[SessionStorage] Session cleared', {
          actorId: actor.id,
          mode,
        });

        return true;
      } catch (err) {
        swseLogger.error('[SessionStorage] Failed to clear session:', err);
        return false;
      }
    } finally {
      entry.clearing = false;
      maybeCleanupEntry(key);
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
    // Keep a stable session id for the lifetime of this shell. A changing id
    // makes every autosave look dirty and can feed actor-update render storms.
    const sessionId = session.sessionId || `${mode}-${session.actorId}-${session.createdAt || Date.now()}`;

    return {
      // Metadata
      sessionId,
      mode,
      subtype: session.subtype,
      timestamp: new Date().toISOString(),
      version: 1,

      // User selections (the primary recoverable state). PHASE 4.1: a true
      // deep clone — this snapshot is queued and written up to
      // AUTOSAVE_DEBOUNCE_MS later, and the live session's nested selection
      // objects (e.g. draftSelections.feats[i].choice) keep mutating in the
      // meantime. A shallow copy would leave those nested objects shared, so
      // the "queued" snapshot could silently change before it's ever written.
      draftSelections: this._cloneSessionPayload(session.draftSelections),

      // Progression tracking (must be restored exactly)
      visitedStepIds: this._cloneSessionPayload(session.visitedStepIds),
      invalidatedStepIds: this._cloneSessionPayload(session.invalidatedStepIds),
      currentStepId: session.currentStepId,
      completedStepIds: this._cloneSessionPayload(session.completedStepIds),

      // Entitlements for reference (recomputed on restore)
      derivedEntitlements: this._cloneSessionPayload(session.derivedEntitlements),
    };
  }

  /**
   * Deep-clone a persisted session payload so a queued snapshot can never be
   * mutated by later changes to the live session's nested selection state.
   * Prefers the Foundry utility; falls back to structuredClone, then a JSON
   * round-trip, for the headless test harness. No new dependency introduced.
   * @private
   */
  static _cloneSessionPayload(value) {
    if (value === undefined || value === null) return value;
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    try {
      return structuredClone(value);
    } catch (_err) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  /** @private */
  static _isSemanticallySameSession(a = {}, b = {}) {
    const pick = (value = {}) => ({
      mode: value.mode || null,
      subtype: value.subtype || null,
      version: value.version || 1,
      draftSelections: value.draftSelections || {},
      visitedStepIds: value.visitedStepIds || [],
      invalidatedStepIds: value.invalidatedStepIds || [],
      currentStepId: value.currentStepId || null,
      completedStepIds: value.completedStepIds || [],
      derivedEntitlements: value.derivedEntitlements || {},
    });
    return this._stableStringify(pick(a)) === this._stableStringify(pick(b));
  }

  /** @private */
  static _stableStringify(value) {
    const normalize = (input) => {
      if (Array.isArray(input)) return input.map(normalize);
      if (!input || typeof input !== 'object') return input;
      return Object.keys(input).sort().reduce((out, key) => {
        if (typeof input[key] === 'function') return out;
        out[key] = normalize(input[key]);
        return out;
      }, {});
    };
    try {
      return JSON.stringify(normalize(value));
    } catch (_err) {
      return String(value);
    }
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
