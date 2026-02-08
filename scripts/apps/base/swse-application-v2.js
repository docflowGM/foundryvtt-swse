// scripts/apps/base/swse-application-v2.js
/**
 * Base Application class for SWSE system - Foundry ApplicationV2 compliant
 *
 * AppV2 contract:
 * - No jQuery in render lifecycle
 * - Use `_prepareContext` + `_onRender`
 * - Scope DOM queries to `this.element`
 *
 * This base keeps a small legacy-compat shim (`defaultOptions`) so older subclasses
 * can continue to override `static get defaultOptions()` while we finish migrations.
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

import { guardOnRender, validateTemplate } from '../../debug/appv2-probe.js';

export default class SWSEApplicationV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['swse', 'swse-window', 'swse-app'],
    tag: 'div',
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
    if (o.position?.width !== undefined) o.width = o.position.width;
    if (o.position?.height !== undefined) o.height = o.position.height;
    if (o.window?.resizable !== undefined) o.resizable = o.window.resizable;
    if (o.window?.draggable !== undefined) o.draggable = o.window.draggable;
    if (o.window?.frame !== undefined) o.popOut = o.window.frame;

    return foundry.utils.mergeObject(base, o);
  }

  async _prepareContext() {
    return {};
  }

  async _onRender(context, options) {
    try {
      guardOnRender(context, options, this);
      validateTemplate(this);
    } catch (error) {
      this._handleError('_onRender', error);
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
}
