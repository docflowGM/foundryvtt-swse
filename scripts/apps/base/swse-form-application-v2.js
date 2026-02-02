/**
 * Base FormApplication class for SWSE system - Foundry V2 API compliant
 * Extends HandlebarsApplicationMixin for proper V2 rendering lifecycle
 * Use for progression UI that handles form submission
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class SWSEFormApplicationV2 extends HandlebarsApplicationMixin(FormApplication) {
    /**
     * Default options for SWSE V2 FormApplications
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['swse', 'swse-form', 'swse-app'],
            tag: 'form',
            width: 600,
            height: 'auto',
            resizable: true,
            draggable: true,
            closeOnSubmit: false,
            submitOnChange: false,
            submitOnClose: false,
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
     * Handle form submission
     * DO NOT mutate actor data directly - call progression engine APIs
     * @param {Event} event - Form submission event
     * @param {Object} formData - Processed form data
     * @returns {Promise<void>}
     */
    async _updateObject(event, formData) {
        try {
            // Override in subclasses
            this._log('Form submitted', formData);
        } catch (error) {
            this._handleError('_updateObject', error);
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
