/**
 * Base Application class for SWSE system - Foundry V2 API compliant
 * Extends HandlebarsApplicationMixin for proper V2 rendering lifecycle
 * All progression UI classes must extend this
 */
const { HandlebarsApplicationMixin } = foundry.applications;

export default class SWSEApplicationV2 extends HandlebarsApplicationMixin(Application) {
    /**
     * Default options for SWSE V2 Applications
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['swse', 'swse-window', 'swse-app'],
            tag: 'form',
            width: 600,
            height: 'auto',
            resizable: true,
            draggable: true,
            popOut: true
        });
    }

    /**
     * V2 API: Prepare context for rendering
     * Override in subclasses to provide template context
     * @returns {Promise<Object>} Context object for template
     */
    async _prepareContext() {
        try {
            return {};
        } catch (error) {
            this._handleError('_prepareContext', error);
            return {};
        }
    }

    /**
     * V2 API: Called after render to set up event listeners
     * Scope all listeners to this.element
     * @param {HTMLElement} html - The rendered HTML element
     * @param {Object} options - Render options
     */
    async _onRender(html, options) {
        try {
            // Override in subclasses for event binding
            // All DOM queries MUST be scoped to this.element
        } catch (error) {
            this._handleError('_onRender', error);
        }
    }

    /**
     * Debug logging helper
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    _log(message, data = null) {
        if (game.settings?.get('foundryvtt-swse', 'debugMode')) {
            console.log(`[${this.constructor.name}] ${message}`, data || '');
        }
    }

    /**
     * Safe error handling wrapper
     * @param {string} context - Where error occurred
     * @param {Error} error - The error
     */
    _handleError(context, error) {
        console.error(`[${this.constructor.name}:${context}]`, error);
        ui.notifications?.error(`Error in ${this.constructor.name}: ${error.message}`);
    }
}
