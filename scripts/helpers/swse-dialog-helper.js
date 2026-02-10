/**
 * Dialog Helper for SWSE system
 * Provides standardized dialog creation methods with Forge-compatible positioning
 */
export default class SWSEDialogHelper {
    /**
     * Standard dialog options that ensure proper positioning
     * @param {Object} overrides - Optional overrides for dialog options
     * @returns {Object} Dialog options with defaults
     */
    static getDefaultOptions(overrides = {}) {
        return foundry.utils.mergeObject({
            left: null,    // Center horizontally
            top: null,     // Center vertically
            width: 400,
            resizable: false,
            classes: ['swse', 'swse-dialog']
        }, overrides);
    }

    /**
     * Show a confirmation dialog with standardized positioning
     * @param {Object} config - Dialog configuration
     * @param {string} config.title - Dialog title
     * @param {string} config.content - Dialog content (HTML)
     * @param {Function} config.yes - Callback for yes button
     * @param {Function} config.no - Callback for no button (optional)
     * @param {Object} config.options - Additional dialog options
     * @returns {Promise<boolean>} True if user confirmed, false otherwise
     */
    static async confirm({ title, content, yes, no, options = {} }) {
        return Dialog.confirm({
            title,
            content,
            yes,
            no,
            options: this.getDefaultOptions(options)
        });
    }

    /**
     * Show a prompt dialog with standardized positioning
     * @param {Object} config - Dialog configuration
     * @param {string} config.title - Dialog title
     * @param {string} config.content - Dialog content (HTML)
     * @param {string} config.label - Button label
     * @param {Function} config.callback - Callback function
     * @param {Object} config.options - Additional dialog options
     * @returns {Promise} Result from callback
     */
    static async prompt({ title, content, label = 'Confirm', callback, options = {} }) {
        return Dialog.prompt({
            title,
            content,
            label,
            callback,
            options: this.getDefaultOptions(options)
        });
    }

    /**
     * Show a custom dialog with multiple buttons
     * @param {Object} config - Dialog configuration
     * @param {string} config.title - Dialog title
     * @param {string} config.content - Dialog content (HTML)
     * @param {Object} config.buttons - Button configuration
     * @param {Function} config.render - Optional render callback
     * @param {Function} config.close - Optional close callback
     * @param {string} config.default - Default button
     * @param {Object} config.options - Additional dialog options
     * @returns {Promise} Result from selected button callback
     */
    static async show({ title, content, buttons, render, close, default: defaultButton, options = {} }) {
        return new Promise((resolve) => {
            const dialog = new Dialog({
                title,
                content,
                buttons: this._processButtons(buttons, resolve),
                render,
                close: () => {
                    if (close) {close();}
                    resolve(null);
                },
                default: defaultButton
            }, this.getDefaultOptions(options));

            dialog.render(true);
        });
    }

    /**
     * Process button configuration to ensure callbacks resolve the promise
     * @param {Object} buttons - Button configuration
     * @param {Function} resolve - Promise resolve function
     * @returns {Object} Processed buttons
     * @private
     */
    static _processButtons(buttons, resolve) {
        const processed = {};
        for (const [key, button] of Object.entries(buttons)) {
            processed[key] = {
                ...button,
                callback: (html) => {
                    const result = button.callback ? button.callback(html) : key;
                    resolve(result);
                }
            };
        }
        return processed;
    }

    /**
     * Show a simple alert dialog
     * @param {string} title - Dialog title
     * @param {string} message - Alert message
     * @param {Object} options - Additional dialog options
     * @returns {Promise<void>}
     */
    static async alert(title, message, options = {}) {
        return this.show({
            title,
            content: `<p>${message}</p>`,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'OK'
                }
            },
            options: this.getDefaultOptions(options)
        });
    }

    /**
     * Show a warning dialog
     * @param {string} title - Dialog title
     * @param {string} message - Warning message
     * @param {Object} options - Additional dialog options
     * @returns {Promise<boolean>} True if user confirmed
     */
    static async warning(title, message, options = {}) {
        return this.confirm({
            title,
            content: `<div class="warning"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`,
            yes: () => true,
            no: () => false,
            options: this.getDefaultOptions({
                width: 450,
                ...options
            })
        });
    }

    /**
     * Show an error dialog
     * @param {string} title - Dialog title
     * @param {string} message - Error message
     * @param {Object} options - Additional dialog options
     * @returns {Promise<void>}
     */
    static async error(title, message, options = {}) {
        return this.alert(
            title,
            `<div class="error"><i class="fas fa-circle-xmark"></i> ${message}</div>`,
            this.getDefaultOptions({
                width: 450,
                ...options
            })
        );
    }

    /**
     * Check if running in Forge environment
     * @returns {boolean} True if Forge is active
     */
    static get isForge() {
        return game.modules?.get('forgevtt')?.active ?? false;
    }
}
