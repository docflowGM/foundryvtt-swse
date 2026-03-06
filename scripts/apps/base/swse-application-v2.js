// scripts/apps/base/swse-application-v2.js

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

import { guardOnRender, validateTemplate } from "/systems/foundryvtt-swse/scripts/debug/appv2-probe.js";

export default class SWSEApplicationV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['swse', 'swse-window'],
    position: {
      width: 600,
      height: 'auto'
    },
    window: {
      resizable: true,
      draggable: true,
      frame: true
    },
    actions: {}
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? {};
    const o = foundry.utils.mergeObject({}, this.DEFAULT_OPTIONS);

    // Legacy v1-style aliases used by older subclasses.
    if (o.position?.width !== undefined) {o.width = o.position.width;}
    if (o.position?.height !== undefined) {o.height = o.position.height;}
    if (o.window?.resizable !== undefined) {o.resizable = o.window.resizable;}
    if (o.window?.draggable !== undefined) {o.draggable = o.window.draggable;}
    if (o.window?.frame !== undefined) {o.popOut = o.window.frame;}

    return foundry.utils.mergeObject(base, o);
  }

  async _prepareContext(options) {
    return {};
  }

  /**
   * V13 AppV2 render lifecycle.
   * Validates, renders, then rethrows errors to prevent zombie apps.
   */
  async _onRender(context, options) {
    try {
      guardOnRender(context, options, this);
      validateTemplate(this);

      await super._onRender(context, options);
    } catch (error) {
      this._handleError('_onRender', error);
      throw error; // Critical: prevent partial render state
    }
  }

  _log(message, data = null) {
    if (game.settings?.get?.('foundryvtt-swse', 'debugMode')) {
      // eslint-disable-next-line no-console
      console.log(`[${this.constructor.name}] ${message}`, data ?? '');
    }
  }

  _handleError(context, error) {
    // eslint-disable-next-line no-console
    console.error(`[${this.constructor.name}:${context}]`, error);
    ui?.notifications?.error?.(`Error in ${this.constructor.name}: ${error?.message ?? error}`);
  }

  /**
   * Single source of truth for content element access.
   * V13-safe: uses stable container, never assumes .window-content.
   */
  get contentElement() {
    if (!this.element) return null;
    // Prefer explicit content container if available
    const content = this.element.querySelector('[data-application-content]');
    if (content) return content;
    // Fallback: use element itself (V13 AppV2 pattern)
    return this.element;
  }

  /**
   * Attach delegated listener to root element.
   * Safe for post-render wiring only.
   * @param {string} type Event type
   * @param {string} selector CSS selector or null for root
   * @param {Function} handler Event handler
   * @param {object} options addEventListener options
   */
  onRoot(type, selector, handler, options) {
    if (!this.element) {
      this._log(`onRoot: element not available for ${type}`);
      return;
    }
    if (selector) {
      // Delegated listener
      this.element.addEventListener(type, (ev) => {
        const target = ev.target?.closest?.(selector);
        if (target && this.element.contains(target)) {
          handler(ev, target);
        }
      }, options);
    } else {
      // Root listener
      this.element.addEventListener(type, handler, options);
    }
  }

  /**
   * Attach delegated listener to content element.
   * Safe for post-render wiring only.
   * @param {string} type Event type
   * @param {string} selector CSS selector or null for content root
   * @param {Function} handler Event handler
   * @param {object} options addEventListener options
   */
  onContent(type, selector, handler, options) {
    const content = this.contentElement;
    if (!content) {
      this._log(`onContent: content element not available for ${type}`);
      return;
    }
    if (selector) {
      content.addEventListener(type, (ev) => {
        const target = ev.target?.closest?.(selector);
        if (target && content.contains(target)) {
          handler(ev, target);
        }
      }, options);
    } else {
      content.addEventListener(type, handler, options);
    }
  }
}
