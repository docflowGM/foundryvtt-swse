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
   * @param {ProgressionShell} shell - Parent shell for reactive updates
   */
  constructor(shell) {
    this.shell = shell;

    // Core state: tracks accumulated selections
    this._state = {
      species: null,
      class: null,
      background: null,
      feats: [],
      talents: [],
      skills: {},
      languages: [],
      attributes: {},
      multiclass: null,
      forcePowers: [],
      // Extensible for new step types
    };

    // Watchers: { stepKey: [callback, ...] }
    this._watchers = new Map();

    // Create proxy for reactive updates
    this._createProxy();
  }

  /**
   * Create a reactive proxy that triggers watchers on changes.
   * @private
   */
  _createProxy() {
    // Store original state for proxy handler to access
    const state = this._state;
    const watchers = this._watchers;
    const shell = this.shell;

    // The proxy sits between external code and the state
    // When someone reads/writes, we can intercept and trigger watchers
    this.proxy = new Proxy(state, {
      set: (target, prop, value) => {
        const oldValue = target[prop];

        // Only trigger watchers if value actually changed
        if (oldValue === value) return true;

        target[prop] = value;

        // Notify watchers for this property
        if (watchers.has(prop)) {
          watchers.get(prop).forEach(callback => {
            try {
              callback(value, oldValue, prop);
            } catch (err) {
              console.error(`[BuildIntent] Watcher error for ${prop}:`, err);
            }
          });
        }

        // Re-render shell to reflect changes
        if (shell?.render) {
          shell.render();
        }

        return true;
      },

      get: (target, prop) => {
        // Return state value for reads
        return target[prop];
      },
    });
  }

  /**
   * Commit a selection to build intent.
   * This is the primary API for steps to update shared state.
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
      // Use proxy to trigger watchers
      this.proxy[selectionKey] = value;

      // Also update shell.committedSelections for backward compatibility
      if (this.shell?.committedSelections) {
        this.shell.committedSelections.set(selectionKey, {
          [selectionKey]: value,
          source: stepId,
        });
      }

      return true;
    } catch (err) {
      console.error(`[BuildIntent] Error committing ${selectionKey}:`, err);
      return false;
    }
  }

  /**
   * Get a committed selection value.
   * @param {string} selectionKey - Key to retrieve (e.g., 'class', 'feats')
   * @returns {*} The committed value, or undefined if not set
   */
  getSelection(selectionKey) {
    return this._state[selectionKey];
  }

  /**
   * Get all committed selections as a snapshot.
   * @returns {Object} Copy of current state
   */
  getAllSelections() {
    return { ...this._state };
  }

  /**
   * Get build intent as character data for suggestion engine.
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
    return {
      classes: this._state.class ? [this._state.class] : [],
      species: this._state.species,
      feats: this._state.feats || [],
      talents: this._state.talents || [],
      skills: this._state.skills || {},
      abilityIncreases: this._state.attributes || {},
      background: this._state.background,
      languages: this._state.languages || [],
      multiclass: this._state.multiclass,
      forcePowers: this._state.forcePowers || [],
    };
  }

  /**
   * Register a watcher on a specific selection.
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

    if (!this._watchers.has(selectionKey)) {
      this._watchers.set(selectionKey, []);
    }

    const callbacks = this._watchers.get(selectionKey);
    callbacks.push(callback);

    // Return unobserve function
    return () => {
      const idx = callbacks.indexOf(callback);
      if (idx >= 0) {
        callbacks.splice(idx, 1);
      }
    };
  }

  /**
   * Clear all selections (typically on chargen reset).
   */
  reset() {
    this._state = {
      species: null,
      class: null,
      background: null,
      feats: [],
      talents: [],
      skills: {},
      languages: [],
      attributes: {},
      multiclass: null,
      forcePowers: [],
    };
    this._createProxy();
  }

  /**
   * For debugging: dump current state
   */
  debug() {
    return {
      state: this._state,
      watchers: Array.from(this._watchers.entries()).map(([key, cbs]) => ({
        key,
        watcherCount: cbs.length,
      })),
    };
  }
}
