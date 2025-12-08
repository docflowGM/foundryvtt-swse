/**
 * Base Application class for SWSE system
 * Provides standardized defaults for all SWSE Application windows
 * including Forge compatibility and consistent positioning
 */
export default class SWSEApplication extends Application {
    /**
     * Default options for SWSE Applications
     * @returns {Object} Merged default options
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['swse', 'swse-window'],
            left: null,        // Center horizontally
            top: null,         // Center vertically
            resizable: true,
            draggable: true,
            // Forge detection - popOut may need adjustment for Forge environments
            // Keep popOut enabled by default, but can be overridden by subclasses
            popOut: true
        });
    }

    /**
     * Check if running in Forge environment
     * @returns {boolean} True if Forge is active
     */
    static get isForge() {
        return game.modules?.get('forgevtt')?.active ?? false;
    }

    /**
     * Enhanced render with Forge compatibility checks
     * @param {boolean} force - Force render
     * @param {Object} options - Render options
     * @returns {Application} The rendered application
     */
    render(force = false, options = {}) {
        // Ensure position options are set for Forge compatibility
        if (!this.options.left && this.options.left !== 0) {
/* COMMENTED BY fix_ui_js.py */
            this.options.left = null;
        }
        if (!this.options.top && this.options.top !== 0) {
/* COMMENTED BY fix_ui_js.py */
            this.options.top = null;
        }

        return super.render(force, options);
    }

    /**
     * Log method for debugging (can be disabled in production)
     * @param {string} message - Debug message
     * @param {*} data - Optional data to log
     */
    _log(message, data = null) {
        if (game.settings.get('swse', 'debugMode')) {
            swseLogger.log(`[SWSE Application: ${this.constructor.name}] ${message}`, data || '');
        }
    }
}
