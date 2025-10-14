/**
 * UI Helper Utilities for SWSE
 */

/**
 * Show a notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Notification type: "info", "warning", "error"
 */
export function notify(message, type = "info") {
    ui.notifications[type](message);
}

/**
 * Confirm dialog with user
 * @param {string} title - Dialog title
 * @param {string} content - Dialog content
 * @returns {Promise<boolean>} User's choice
 */
export async function confirm(title, content) {
    return await Dialog.confirm({
        title,
        content,
        yes: () => true,
        no: () => false,
        defaultYes: false
    });
}

/**
 * Prompt user for input
 * @param {string} title - Dialog title
 * @param {string} label - Input label
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>} User input or null if cancelled
 */
export async function prompt(title, label, defaultValue = "") {
    return new Promise((resolve) => {
        new Dialog({
            title,
            content: `
                <form>
                    <div class="form-group">
                        <label>${label}</label>
                        <input type="text" name="input" value="${defaultValue}" autofocus />
                    </div>
                </form>
            `,
            buttons: {
                ok: {
                    label: "OK",
                    callback: (html) => {
                        const input = html.find('[name="input"]').val();
                        resolve(input);
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => resolve(null)
                }
            },
            default: "ok",
            close: () => resolve(null)
        }).render(true);
    });
}

/**
 * Create a custom dialog
 * @param {string} title - Dialog title
 * @param {string} content - Dialog HTML content
 * @param {object} buttons - Dialog buttons configuration
 * @returns {Promise} Dialog promise
 */
export async function createDialog(title, content, buttons) {
    return new Promise((resolve) => {
        new Dialog({
            title,
            content,
            buttons,
            default: "ok",
            close: () => resolve(null)
        }).render(true);
    });
}

/**
 * Highlight element temporarily
 * @param {HTMLElement} element - Element to highlight
 * @param {number} duration - Duration in ms
 * @param {string} className - CSS class to add
 */
export function highlightElement(element, duration = 1000, className = "highlight") {
    element.classList.add(className);
    setTimeout(() => {
        element.classList.remove(className);
    }, duration);
}

/**
 * Scroll element into view smoothly
 * @param {HTMLElement} element - Element to scroll to
 */
export function scrollToElement(element) {
    element.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" 
    });
}
