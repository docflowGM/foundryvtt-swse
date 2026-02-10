/**
 * Base Application class for SWSE system (AppV2)
 * Provides standardized defaults for all SWSE Application windows
 * including Forge compatibility and consistent positioning
 */
const { ApplicationV2 } = foundry.applications.api;

export default class SWSEApplication extends ApplicationV2 {
    /**
     * Default options for SWSE Applications
     * @returns {Object} Merged default options
     */
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
        ApplicationV2.DEFAULT_OPTIONS ?? {},
        {
            classes: ['swse', 'swse-window', 'swse-app'],
            position: {
                width: 600,
                height: 'auto'
            },
            resizable: true,
            draggable: true,
            popOut: true
        }
    );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

/**
     * Check if running in Forge environment
     * @returns {boolean} True if Forge is active
     */
    static get isForge() {
        return game.modules?.get('forgevtt')?.active ?? false;
    }

    /**
     * Prepare context for rendering
     * Override in subclasses to provide template data
     * @returns {Promise<Object>} Context object for template
     */
    async _prepareContext(options) {
        return {};
    }

    /**
     * Called after render to set up event listeners
     * Override in subclasses to bind event handlers
     * @param {Object} context - The prepared context
     * @param {Object} options - Render options
     */
    async _onRender(context, options) {
        // Override in subclasses for event binding
    }

    /**
     * Log method for debugging (can be disabled in production)
     * @param {string} message - Debug message
     * @param {*} data - Optional data to log
     */
    _log(message, data = null) {
        try {
            if (game.settings.get('foundryvtt-swse', 'debugMode')) {
                const logger = globalThis.swseLogger ?? console;
                logger.log(`[SWSE Application: ${this.constructor.name}] ${message}`, data || '');
            }
        } catch {
            // Ignore logging failures in early init or missing settings.
        }
    }
}
