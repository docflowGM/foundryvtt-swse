/* ============================================================================
   RENDER LIFECYCLE
   Controls when and how often renders happen
   Prevents cascading renders, double-clicks, and input reset bugs
   ============================================================================ */

import { SWSELogger } from '../../utils/logger.js';
import { Repaint } from './repaint.js';

export class RenderLifecycle {
  constructor(app) {
    this.app = app;
    this._isUpdating = false;
    this._renderQueued = false;
    this._pendingRender = null;
  }

  /**
   * Debounce a function (delay before first execution)
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} - Debounced function
   */
  static debounce(fn, delay = 150) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle a function (delay between executions)
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum milliseconds between executions
   * @returns {Function} - Throttled function
   */
  static throttle(fn, limit = 150) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Wrap an async operation to prevent concurrent renders
   * @param {Function} operation - Async function to run
   * @returns {Promise} - Result of operation
   */
  async withRenderLock(operation) {
    if (this._isUpdating) {
      SWSELogger.warn('[RenderLifecycle] Render already in progress, queueing');
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!this._isUpdating) {
            clearInterval(checkInterval);
            operation().then(resolve).catch(reject);
          }
        }, 50);
      });
    }

    this._isUpdating = true;
    try {
      const result = await operation();
      return result;
    } finally {
      this._isUpdating = false;

      // If a render was queued during update, execute it now
      if (this._renderQueued) {
        this._renderQueued = false;
        this.app.render(false);
      }
    }
  }

  /**
   * Queue a render if one isn't already in progress
   * @returns {Promise} - Resolves when render completes
   */
  async queueRender() {
    if (this._isUpdating) {
      this._renderQueued = true;
      SWSELogger.debug('[RenderLifecycle] Render queued');

      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this._isUpdating && !this._renderQueued) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }

    return this.app.render(false);
  }

  /**
   * Safely update a field without full re-render
   * @param {string} selector - CSS selector
   * @param {*} value - New value
   */
  updateFieldOnly(selector, value) {
    Repaint.updateField(selector, value);
  }

  /**
   * Safely update multiple fields without full re-render
   * @param {Object} updates - Map of selector: value
   */
  updateFieldsOnly(updates) {
    Repaint.updateFields(updates);
  }

  /**
   * Prevent listener duplication
   * MUST be called before attaching listeners in activateListeners()
   * @param {HTMLElement} html - Root element to clean listeners from
   */
  cleanListeners(html) {
    if (!html) return;

    // Foundry jQuery objects have a .off() method
    if (html.off && typeof html.off === 'function') {
      try {
        html.off();
        SWSELogger.debug('[RenderLifecycle] Cleaned listeners');
      } catch (err) {
        SWSELogger.warn('[RenderLifecycle] Failed to clean listeners', err);
      }
    }
  }

  /**
   * Attach a listener that prevents cascading renders
   * @param {HTMLElement} element - Element to attach to
   * @param {string} eventType - Event type (click, input, etc.)
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  attachListener(element, eventType, handler, options = {}) {
    if (!element) return;

    element.addEventListener(eventType, async (e) => {
      // Prevent default and stop propagation
      if (options.preventDefault !== false) {
        e.preventDefault();
      }
      if (options.stopPropagation !== false) {
        e.stopPropagation();
      }

      // Run with render lock
      await this.withRenderLock(async () => {
        try {
          await handler(e);
        } catch (err) {
          SWSELogger.error('[RenderLifecycle] Listener error', err);
        }
      });
    });
  }
}
