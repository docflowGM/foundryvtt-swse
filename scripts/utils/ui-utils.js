/**
 * UI Helper Utilities for SWSE
 */

/* ---------------------- Notifications ---------------------- */

export function notify(message, type = "info") {
    ui.notifications[type](message);
}

/* ---------------------- Confirm Dialog ---------------------- */

export async function confirm(title, content) {
    return await Dialog.confirm({
        title,
        content,
        yes: () => true,
        no: () => false,
        defaultYes: false
    });
}

/* ---------------------- Prompt Input Dialog ---------------------- */

export async function prompt(title, label, defaultValue = "") {
    const safeDefault = foundry.utils.escapeHTML(defaultValue);

    return new Promise((resolve) => {
        new Dialog({
            title,
            content: `
                <form>
                    <div class="form-group">
                        <label>${label}</label>
                        <input type="text" name="input" value="${safeDefault}" autofocus />
                    </div>
                </form>
            `,
            buttons: {
                ok: {
                    label: "OK",
                    callback: (html) => {
                        resolve(html.find('[name="input"]').val());
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

/* ---------------------- Generic Custom Dialog ---------------------- */

export async function createDialog(title, content, buttons) {
    return new Promise((resolve) => {
        const dlg = new Dialog({
            title,
            content,
            buttons,
            default: Object.keys(buttons)[0],
            close: () => resolve(null)
        });
        dlg.render(true);
    });
}

/* ---------------------- Element Highlight ---------------------- */

export function highlightElement(element, duration = 1000, className = "highlight") {
    if (!element) return;
    element.classList.add(className);
    setTimeout(() => {
        if (element) element.classList.remove(className);
    }, duration);
}

/* ---------------------- Scroll to Element ---------------------- */

export function scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}
