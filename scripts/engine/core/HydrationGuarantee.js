/* ============================================================================
   HYDRATION GUARANTEE
   Ensures UI always reflects current actor state, never stale cached state
   ============================================================================ */

import { SWSELogger } from '../../utils/logger.js';

export class HydrationGuarantee {
  /**
   * Ensure a sheet/app always re-hydrates from actor after updates
   * Call this in activateListeners() to set up hydration on data changes
   * @param {Application} app - The sheet/app instance
   * @param {string} actorPropName - Name of the actor property (default: "actor")
   */
  static attachHydrationListener(app, actorPropName = 'actor') {
    if (!app) return;

    const actor = app[actorPropName];
    if (!actor) return;

    // Listen for actor updates
    actor.on('update', () => {
      SWSELogger.debug('[HydrationGuarantee] Actor updated, re-rendering', actor.name);
      app.render(false); // Re-hydrate UI
    });

    SWSELogger.debug(`[HydrationGuarantee] Attached to ${app.constructor.name}`);
  }

  /**
   * Guarantee that a template always gets fresh actor state
   * Use in getData() before passing to template
   * @param {Actor} actor - The actor to refresh
   * @returns {Actor} - Fresh actor instance
   */
  static refreshActor(actor) {
    if (!actor) return null;

    // Fetch fresh actor from game if needed
    if (game && game.actors) {
      const fresh = game.actors.get(actor.id);
      return fresh || actor;
    }

    return actor;
  }

  /**
   * Ensure a view model is built from current actor state
   * @param {Actor} actor - The actor
   * @param {Function} buildFn - Function to build view model
   * @returns {Promise<Object>} - Fresh view model
   */
  static async buildFreshViewModel(actor, buildFn) {
    if (!actor || typeof buildFn !== 'function') {
      throw new Error('[HydrationGuarantee] Actor and buildFn required');
    }

    // Refresh actor from database
    const fresh = this.refreshActor(actor);

    // Build view model from fresh data
    try {
      const vm = await buildFn(fresh);
      return vm;
    } catch (err) {
      SWSELogger.error('[HydrationGuarantee] Failed to build view model:', err);
      throw err;
    }
  }

  /**
   * Check if actor state differs from UI state
   * Useful for detecting desync issues
   * @param {Actor} actor - Current actor
   * @param {Object} uiState - Current UI state
   * @param {Array<string>} pathsToCheck - Paths to compare
   * @returns {Array<string>} - Paths that differ
   */
  static detectDesync(actor, uiState, pathsToCheck = []) {
    if (!actor || !uiState) return [];

    const diffs = [];

    for (const path of pathsToCheck) {
      const actorValue = this._getNestedValue(actor, path);
      const uiValue = this._getNestedValue(uiState, path);

      if (JSON.stringify(actorValue) !== JSON.stringify(uiValue)) {
        diffs.push(path);
        SWSELogger.warn(
          `[HydrationGuarantee] Desync detected at ${path}`,
          { actorValue, uiValue }
        );
      }
    }

    return diffs;
  }

  /**
   * Force refresh template with fresh data
   * Call this after critical updates
   * @param {Application} app - The sheet/app
   */
  static forceRefresh(app) {
    if (!app) return;

    SWSELogger.debug('[HydrationGuarantee] Forcing refresh', app.constructor.name);
    app.render(false);
  }

  /**
   * Debounce hydration calls (prevent excessive re-renders)
   * @param {Function} renderFn - The render function
   * @param {number} delayMs - Delay in milliseconds (default 100)
   * @returns {Function} - Debounced render function
   */
  static debounceHydration(renderFn, delayMs = 100) {
    let timeout;

    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        renderFn.apply(this, args);
      }, delayMs);
    };
  }

  /**
   * Get nested value using dot notation
   * @private
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot notation path
   * @returns {*} - The value at path
   */
  static _getNestedValue(obj, path) {
    if (!path) return undefined;

    return path.split('.').reduce((current, part) => {
      return current?.[part];
    }, obj);
  }
}
