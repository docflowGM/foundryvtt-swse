/**
 * UI Helper Utilities for SWSE
 */

/* ---------------------- Notifications ---------------------- */

export function notify(message, type = 'info') {
    ui.notifications[type](message);
}

/* ---------------------- Confirm Dialog ---------------------- */

export async function confirm(title, content) {
    return new Promise((resolve) => {
        const app = new ConfirmDialog(title, content, resolve);
        app.render(true);
    });
}

class ConfirmDialog extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: 'swse-confirm-dialog',
        tag: 'div',
        window: { icon: 'fas fa-question', title: 'Confirm' },
        position: { width: 400, height: 'auto' }
    };

    constructor(title, content, resolve) {
        super({ window: { title } });
        this.dialogContent = content;
        this.resolveDialog = resolve;
    }

    _renderHTML(context, options) {
        return `<div class="dialog-content">${this.dialogContent}</div>
            <div class="dialog-buttons" style="margin-top: 1rem; text-align: right;">
                <button class="btn btn-primary" data-action="yes" style="margin-right: 0.5rem;">Yes</button>
                <button class="btn btn-secondary" data-action="no">No</button>
            </div>`;
    }

    _replaceHTML(result, content, options) {
        result.innerHTML = '';
        result.appendChild(content);
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element?.querySelector('[data-action="yes"]')?.addEventListener('click', () => {
            if (this.resolveDialog) this.resolveDialog(true);
            this.close();
        });
        this.element?.querySelector('[data-action="no"]')?.addEventListener('click', () => {
            if (this.resolveDialog) this.resolveDialog(false);
            this.close();
        });
    }
}

/* ---------------------- Prompt Input Dialog ---------------------- */

export async function prompt(title, label, defaultValue = '') {
    const safeDefault = foundry.utils.escapeHTML(defaultValue);

    return new Promise((resolve) => {
        const app = new PromptDialog(title, label, safeDefault, resolve);
        app.render(true);
    });
}

class PromptDialog extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: 'swse-prompt-dialog',
        tag: 'div',
        window: { icon: 'fas fa-input-text', title: 'Input' },
        position: { width: 400, height: 'auto' }
    };

    constructor(title, label, defaultValue, resolve) {
        super({ window: { title } });
        this.label = label;
        this.defaultValue = defaultValue;
        this.resolveDialog = resolve;
    }

    _renderHTML(context, options) {
        return `<form style="padding: 0.5rem;">
            <div class="form-group">
                <label>${this.label}</label>
                <input type="text" name="input" value="${this.defaultValue}" autofocus style="width: 100%; padding: 0.5rem;" />
            </div>
        </form>
        <div class="dialog-buttons" style="margin-top: 1rem; text-align: right;">
            <button class="btn btn-primary" data-action="ok" style="margin-right: 0.5rem;">OK</button>
            <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        </div>`;
    }

    _replaceHTML(result, content, options) {
        result.innerHTML = '';
        result.appendChild(content);
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element?.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
            const input = this.element?.querySelector('[name="input"]');
            if (this.resolveDialog) this.resolveDialog(input?.value || null);
            this.close();
        });
        this.element?.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
            if (this.resolveDialog) this.resolveDialog(null);
            this.close();
        });
    }
}

/* ---------------------- Generic Custom Dialog ---------------------- */

export async function createDialog(title, content, buttons) {
    return new Promise((resolve) => {
        const app = new CustomDialog(title, content, buttons, resolve);
        app.render(true);
    });
}

class CustomDialog extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: 'swse-custom-dialog',
        tag: 'div',
        window: { icon: 'fas fa-dialog', title: 'Dialog' },
        position: { width: 500, height: 'auto' }
    };

    constructor(title, content, buttons, resolve) {
        super({ window: { title } });
        this.dialogContent = content;
        this.buttons = buttons;
        this.resolveDialog = resolve;
    }

    _renderHTML(context, options) {
        const buttonKeys = Object.keys(this.buttons);
        const buttonHTML = buttonKeys.map(key => {
            const btn = this.buttons[key];
            return `<button class="btn" data-action="${key}" style="margin-right: 0.5rem;">${btn.label || key}</button>`;
        }).join('');

        return `<div class="dialog-content">${this.dialogContent}</div>
            <div class="dialog-buttons" style="margin-top: 1rem; text-align: right;">
                ${buttonHTML}
            </div>`;
    }

    _replaceHTML(result, content, options) {
        result.innerHTML = '';
        result.appendChild(content);
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const buttonKeys = Object.keys(this.buttons);
        buttonKeys.forEach(key => {
            this.element?.querySelector(`[data-action="${key}"]`)?.addEventListener('click', () => {
                if (this.resolveDialog) this.resolveDialog(null);
                this.close();
            });
        });
    }
}

/* ---------------------- Element Highlight ---------------------- */

export function highlightElement(element, duration = 1000, className = 'highlight') {
    if (!element) {return;}
    element.classList.add(className);
    setTimeout(() => {
        if (element) {element.classList.remove(className);}
    }, duration);
}

/* ---------------------- Scroll to Element ---------------------- */

export function scrollToElement(element) {
    if (!element) {return;}
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
}
