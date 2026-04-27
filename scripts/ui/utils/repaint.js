/* ============================================================================
   REPAINT UTILITIES
   Minimal DOM updates without full re-render
   Fixes input reset, focus loss, and accordion collapse bugs
   ============================================================================ */

import { SWSELogger } from '../../utils/logger.js';

export class Repaint {
  /**
   * Update a single field's value in the DOM
   * No full re-render, just patch the element
   * @param {string} selector - CSS selector
   * @param {*} value - New value
   */
  static updateField(selector, value) {
    const el = document.querySelector(selector);
    if (!el) {
      SWSELogger.warn(`[Repaint] Selector not found: ${selector}`);
      return false;
    }

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
    } else if (el.classList.contains('value')) {
      el.textContent = value;
    } else {
      el.textContent = value;
    }

    SWSELogger.debug(`[Repaint] Updated field ${selector}`);
    return true;
  }

  /**
   * Update multiple fields at once
   * @param {Object} updates - Map of selector: value
   */
  static updateFields(updates) {
    if (!updates || typeof updates !== 'object') return;

    let count = 0;
    for (const [selector, value] of Object.entries(updates)) {
      if (this.updateField(selector, value)) {
        count++;
      }
    }

    SWSELogger.debug(`[Repaint] Updated ${count} fields`);
  }

  /**
   * Add/remove class without full re-render
   * @param {string} selector - CSS selector
   * @param {string} className - Class name to toggle
   * @param {boolean} force - Force add (true) or remove (false)
   */
  static toggleClass(selector, className, force) {
    const el = document.querySelector(selector);
    if (!el) return false;

    el.classList.toggle(className, force);
    return true;
  }

  /**
   * Show/hide element
   * @param {string} selector - CSS selector
   * @param {boolean} visible - Show or hide
   */
  static setVisibility(selector, visible) {
    const el = document.querySelector(selector);
    if (!el) return false;

    el.style.display = visible ? '' : 'none';
    return true;
  }

  /**
   * Update text content
   * @param {string} selector - CSS selector
   * @param {string} text - New text content
   */
  static updateText(selector, text) {
    const el = document.querySelector(selector);
    if (!el) return false;

    el.textContent = text;
    return true;
  }

  /**
   * Update HTML content (be careful with security)
   * @param {string} selector - CSS selector
   * @param {string} html - New HTML content
   */
  static updateHTML(selector, html) {
    const el = document.querySelector(selector);
    if (!el) return false;

    el.innerHTML = html;
    return true;
  }

  /**
   * Preserve focus and cursor position during potential re-renders
   * Call BEFORE render, then restoreFocus() AFTER
   * @param {HTMLElement} html - Root HTML element to search
   * @returns {Object} - Focus state to restore
   */
  static preserveFocus(html) {
    const active = html.querySelector(':focus');
    if (!active) return null;

    return {
      name: active.name,
      id: active.id,
      selector: this._getSelector(active),
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
      value: active.value
    };
  }

  /**
   * Restore focus and cursor position after render
   * @param {HTMLElement} html - Root HTML element to search
   * @param {Object} focusState - State from preserveFocus()
   */
  static restoreFocus(html, focusState) {
    if (!focusState || !html) return;

    let el = null;

    // Try by name first (most reliable)
    if (focusState.name) {
      el = html.querySelector(`[name="${focusState.name}"]`);
    }

    // Try by ID
    if (!el && focusState.id) {
      el = html.querySelector(`#${focusState.id}`);
    }

    // Try by selector
    if (!el && focusState.selector) {
      el = html.querySelector(focusState.selector);
    }

    if (el) {
      el.focus();
      if (el.setSelectionRange) {
        el.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
      }
      SWSELogger.debug('[Repaint] Restored focus', focusState.name);
    }
  }

  /**
   * Get a unique selector for an element (for finding it later)
   * @private
   * @param {HTMLElement} el - Element to get selector for
   * @returns {string} - Selector string
   */
  static _getSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `[name="${el.name}"]`;

    // Build path from parent elements
    const path = [];
    let current = el;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        const index = Array.from(current.parentNode.children).indexOf(current);
        selector += `:nth-child(${index + 1})`;
        path.unshift(selector);
      }

      current = current.parentNode;
    }

    return path.join(' > ');
  }
}
