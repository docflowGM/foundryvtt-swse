/**
 * BuildIntent - Observable Build State
 *
 * Provides a centralized, observable view of the player's accumulated chargen choices.
 * This solves Gap #1 from CHARGEN_ARCHITECTURE_GAPS.md by creating a single source of truth
 * that steps, mentors, validation, and analysis systems can query.
 *
 * Architecture:
 * - All selections flow through commitSelection() to maintain consistency
 * - Changes are tracked and observable (via proxy traps for reactive systems)
 * - Later steps can query build intent to see what earlier steps picked
 * - Validation and suggestion systems have a clear API to inspect state
 *
 * API:
 *   shell.buildIntent.commitSelection(stepId, selectionKey, value)
 *   shell.buildIntent.getSelection(stepKey) → value or undefined
 *   shell.buildIntent.getAllSelections() → { species, class, background, ... }
 *   shell.buildIntent.observeSelection(stepKey, callback) → unobserve fn
 */

export class BuildIntent {
  /**
   * Create observable build intent tracker.
   *
   * PHASE 1 NOTE: This is now a DEPRECATED co-authority. It will be removed in Phase 2.
   * For now, it acts as a thin wrapper around progressionSession for backward compatibility.
   *
   * @param {ProgressionShell} shell - Parent shell for reactive updates
   */
  constructor(shell) {
    this.shell = shell;

    // DEPRECATED: No longer maintains independent _state
    // This class now delegates to progressionSession
    this._state = null;  // Placeholder
    this._watchers = new Map();
  }

  /**
   * DEPRECATED: No longer creates proxy.
   * Keeping stub for any code that may reference it.
   * @private
   */
  _createProxy() {
    // No-op in Phase 1 — all operations delegate to progressionSession
  }

  /**
   * Commit a selection to build intent.
   * This is the primary API for steps to update shared state.
   *
   * PHASE 1: This now delegates to progressionSession.
   *
   * @param {string} stepId - ID of step making the commitment
   * @param {string} selectionKey - Key in buildIntent (e.g., 'class', 'feats')
   * @param {*} value - Value to commit (can be any type)
   *
   * Usage:
   *   shell.buildIntent.commitSelection('class-step', 'class', classId);
   *   shell.buildIntent.commitSelection('feat-step', 'feats', [...featIds]);
   */
  commitSelection(stepId, selectionKey, value) {
    if (typeof selectionKey !== 'string') {
      console.warn(`[BuildIntent] Invalid selectionKey type: ${typeof selectionKey}`);
      return false;
    }

    try {
      // Delegate to canonical progressionSession
      const success = this.shell?.progressionSession?.commitSelection(
        stepId,
        selectionKey,
        value
      );

      // Also update shell.committedSelections for backward compatibility during migration
      // Store the raw normalized selection so existing step readers keep working.
      if (this.shell?.committedSelections && success) {
        this.shell.committedSelections.set(selectionKey, value);
      }

      // Re-render shell to reflect changes
      if (success && this.shell?.render) {
        this.shell.render();
      }

      return success ?? false;
    } catch (err) {
      console.error(`[BuildIntent] Error committing ${selectionKey}:`, err);
      return false;
    }
  }

  /**
   * Get a committed selection value.
   * PHASE 1: Delegates to progressionSession.
   *
   * @param {string} selectionKey - Key to retrieve (e.g., 'class', 'feats')
   * @returns {*} The committed value, or undefined if not set
   */
  getSelection(selectionKey) {
    return this.shell?.progressionSession?.getSelection(selectionKey);
  }

  /**
   * Get all committed selections as a snapshot.
   * PHASE 1: Delegates to progressionSession.
   *
   * @returns {Object} Copy of current state
   */
  getAllSelections() {
    return this.shell?.progressionSession?.getAllSelections() || {};
  }

  /**
   * Get build intent as character data for suggestion engine.
   * PHASE 1: Delegates to progressionSession.
   *
   * This transforms buildIntent into the format expected by SuggestionContextBuilder.
   *
   * @returns {Object} Character data structure for suggestions
   *
   * Example return:
   * {
   *   classes: ['soldier'],
   *   species: 'human',
   *   feats: ['armor-proficiency', 'weapon-focus'],
   *   talents: ['...',],
   *   skills: { piloting: 3, knowledge: 2 },
   *   abilityIncreases: { str: 2, dex: 1 },
   *   background: 'military',
   *   languages: ['basic', 'bothan'],
   * }
   */
  toCharacterData() {
    return this.shell?.progressionSession?.toCharacterData() || {};
  }

  /**
   * Register a watcher on a specific selection.
   * PHASE 1: Delegates to progressionSession.
   *
   * Callback is invoked when that selection changes.
   *
   * @param {string} selectionKey - Key to watch (e.g., 'class')
   * @param {Function} callback - Called with (newValue, oldValue, key)
   * @returns {Function} Unobserve function — call to remove watcher
   *
   * Usage:
   *   const unwatch = shell.buildIntent.observeSelection('class', (newClass, oldClass) => {
   *     console.log(`Class changed from ${oldClass} to ${newClass}`);
   *   });
   *   // Later:
   *   unwatch(); // Stop watching
   */
  observeSelection(selectionKey, callback) {
    if (typeof callback !== 'function') {
      console.warn(`[BuildIntent] Invalid callback type for ${selectionKey}`);
      return () => {}; // Return no-op unobserve
    }

    // Delegate to progressionSession
    if (this.shell?.progressionSession) {
      return this.shell.progressionSession.observeSelection(selectionKey, callback);
    }

    return () => {}; // Return no-op if no session
  }

  /**
   * Clear all selections (typically on chargen reset).
   * PHASE 1: Delegates to progressionSession.
   */
  reset() {
    if (this.shell?.progressionSession) {
      this.shell.progressionSession.reset();
    }
  }

  /**
   * For debugging: dump current state
   * PHASE 1: Delegates to progressionSession.
   */
  debug() {
    return this.shell?.progressionSession?.debug() || {};
  }
}
