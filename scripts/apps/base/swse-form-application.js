/**
 * Base FormApplication class for SWSE system (AppV2)
 * Provides standardized defaults for all SWSE form-based windows
 * including Forge compatibility and consistent positioning
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class SWSEFormApplication extends HandlebarsApplicationMixin(FormApplication) {
    /**
     * Default options for SWSE FormApplications
     */
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
        FormApplication.DEFAULT_OPTIONS ?? {},
        {
            classes: ['swse', 'swse-form', "swse-app"],
            position: {
                width: 600,
                height: 'auto'
            },
            resizable: true,
            draggable: true,
            closeOnSubmit: false,
            submitOnChange: false,
            submitOnClose: false,
            popOut: true
        }
    );

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
        if (game.settings.get('foundryvtt-swse', 'debugMode')) {
            swseLogger.log(`[SWSE FormApplication: ${this.constructor.name}] ${message}`, data || '');
        }
    }

    /**
     * Handle form submission with error handling
     * @param {Event} event - The form submission event
     * @param {Object} formData - The processed form data
     * @returns {Promise<void>}
     */
    async _updateObject(event, formData) {
        // Override in subclasses
        this._log('Form submitted', formData);
    }
}
