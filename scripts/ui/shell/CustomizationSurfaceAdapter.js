/**
 * CustomizationSurfaceAdapter — Inline Droid Garage / Shipyard bridge.
 *
 * Reuses CustomizationBayApp as the state/controller source without opening a
 * standalone Foundry window. The holopad shell owns rendering; this adapter
 * provides pre-rendered content and forwards actions back to the app instance.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class CustomizationSurfaceAdapter {
  static _registry = new Map();

  constructor(shellHost, actor, options = {}) {
    this._shellHost = shellHost;
    this.actor = actor;
    this.options = options;
    this._app = null;
  }

  static getOrCreate(shellHost, actor, options = {}) {
    const mode = options.bayMode || options.mode || (actor?.type === 'vehicle' ? 'shipyard' : 'garage');
    const key = `${actor.id}-${mode}`;
    let adapter = this._registry.get(key);
    if (!adapter) {
      adapter = new CustomizationSurfaceAdapter(shellHost, actor, options);
      this._registry.set(key, adapter);
    }
    adapter._shellHost = shellHost;
    adapter.options = { ...adapter.options, ...options, mode };
    return adapter;
  }

  static destroy(actorId) {
    for (const [key, adapter] of this._registry) {
      if (key.startsWith(actorId + '-')) {
        adapter._destroy();
        this._registry.delete(key);
      }
    }
  }

  async buildViewModel() {
    try {
      const app = await this._getApp();
      const context = await app._prepareContext({});
      const contentHtml = await foundry.applications.handlebars.renderTemplate(
        'systems/foundryvtt-swse/templates/apps/customization/customization-bay.hbs',
        context
      );

      return {
        id: 'customization',
        title: context?.modeLabel || 'Customization Bay',
        actorId: this.actor.id,
        actorName: this.actor.name,
        bayMode: context?.mode || this.options.mode || 'garage',
        contextMode: context?.contextMode || this.options.contextMode || 'modifyExisting',
        contentHtml,
        vm: context,
        isReady: true
      };
    } catch (err) {
      SWSELogger.error('[CustomizationSurfaceAdapter] buildViewModel failed:', err);
      return {
        id: 'customization',
        title: 'Customization Bay',
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        error: err.message || String(err)
      };
    }
  }

  async handleAction(action, target) {
    const app = await this._getApp();
    if (typeof app.handleInlineAction !== 'function') {
      SWSELogger.warn('[CustomizationSurfaceAdapter] CustomizationBayApp has no inline action bridge');
      return;
    }
    await app.handleInlineAction(action, target);
  }

  async _getApp() {
    if (this._app) return this._app;

    const { CustomizationBayApp } = await import(
      '/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js'
    );

    const options = {
      ...this.options,
      mode: this.options.mode || this.options.bayMode,
      contextMode: this.options.contextMode
    };

    const app = new CustomizationBayApp(this.actor, options);
    const self = this;
    app.render = async function() {
      await self._shellHost?.render?.(false);
      return app;
    };
    app.close = async function() {
      await self._shellHost?.setSurface?.('home');
      await self._shellHost?.render?.(false);
      return app;
    };

    this._app = app;
    return app;
  }

  _destroy() {
    this._app = null;
  }
}
