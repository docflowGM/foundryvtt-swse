/**
 * CustomizationSurfaceAdapter — Inline Droid Garage / Shipyard bridge.
 *
 * Reuses CustomizationBayApp as the state/controller source without opening a
 * standalone Foundry window. The holopad shell owns rendering; this adapter
 * provides pre-rendered content and forwards actions back to the app instance.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { MentorTranslationIntegration } from '/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js';

export class CustomizationSurfaceAdapter {
  static _registry = new Map();

  constructor(shellHost, actor, options = {}) {
    this._shellHost = shellHost;
    this.actor = actor;
    this.options = options;
    this._app = null;
  }

  static key(actorId, mode) {
    return `${actorId}-${mode}`;
  }

  static get(actorId, mode = 'garage') {
    if (!actorId) return null;
    return this._registry.get(this.key(actorId, mode)) ?? null;
  }

  static getForActor(actorId, mode = 'garage') {
    if (!actorId) return null;
    const exact = this.get(actorId, mode);
    if (exact) return exact;
    for (const [key, adapter] of this._registry.entries()) {
      if (key.startsWith(`${actorId}-`)) return adapter;
    }
    return null;
  }

  static getOrCreate(shellHost, actor, options = {}) {
    const mode = options.bayMode || options.mode || (actor?.type === 'vehicle' ? 'shipyard' : 'garage');
    const key = this.key(actor.id, mode);
    let adapter = this._registry.get(key);
    if (!adapter) {
      adapter = new CustomizationSurfaceAdapter(shellHost, actor, options);
      this._registry.set(key, adapter);
    }
    adapter._shellHost = shellHost;
    adapter.actor = actor;
    adapter.options = { ...adapter.options, ...options, mode, bayMode: mode, inlineShell: true };
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

  static destroyForHost(shellHost) {
    if (!shellHost) return;
    for (const [key, adapter] of this._registry) {
      if (adapter._shellHost === shellHost) {
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
        ownerActorId: this.options.ownerActorId || '',
        source: this.options.source || '',
        returnSurface: this.options.returnSurface || (this.options.source === 'asset-bay' ? 'asset-bay' : 'home'),
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
    const nextMode = app.mode || this.options.mode || this.options.bayMode;
    if (this.actor?.id && nextMode) {
      this.constructor._registry.set(this.constructor.key(this.actor.id, nextMode), this);
    }
  }

  /**
   * PART 24/25 — Hydrate DOM-only affordances (mentor Aurebesh translation)
   * after the inline shell injects the Bay. Mirrors
   * WorkbenchSurfaceAdapter.afterInlineRender()'s exact pattern/guard so the
   * Garage/Shipyard mentor line uses the same translation pipeline as
   * Workbench/Progression instead of a separate implementation. Idempotent:
   * each render injects a fresh, unhydrated DOM node (translationHydrated is
   * per-element, not per-adapter), so this safely no-ops on repeat calls
   * against an already-hydrated node and re-hydrates naturally when the
   * template re-renders with new mentor text.
   *
   * @param {Element} surfaceRoot
   * @returns {Promise<void>}
   */
  async afterInlineRender(surfaceRoot) {
    const mentorNode = surfaceRoot?.querySelector?.('[data-customization-mentor-text]');
    if (!mentorNode || mentorNode.dataset.translationHydrated === 'true') return;

    const text = mentorNode.dataset.rawText || mentorNode.textContent || '';
    const mentor = mentorNode.dataset.mentor || 'seraphim';
    const topic = (this.options?.bayMode || this.options?.mode) === 'shipyard' ? 'shipyard' : 'garage';
    mentorNode.dataset.translationHydrated = 'true';

    try {
      await MentorTranslationIntegration.render({
        text,
        container: mentorNode,
        mentor,
        topic,
        force: true
      });
    } catch (err) {
      SWSELogger.error('[CustomizationSurfaceAdapter] Mentor translation failed:', err);
      mentorNode.textContent = text;
    }
  }

  async _getApp() {
    if (this._app) {
      // PART 2 — keep the owner identity current even though the app
      // instance is cached across renders (the adapter itself is re-entered
      // with fresh options on every getOrCreate() call).
      if (this.options.ownerActorId !== undefined && this._app.ownerActorId !== (this.options.ownerActorId || null)) {
        this._app.ownerActorId = this.options.ownerActorId || null;
      }
      return this._app;
    }

    const { CustomizationBayApp } = await import(
      '/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js'
    );

    const options = {
      ...this.options,
      mode: this.options.mode || this.options.bayMode,
      contextMode: this.options.contextMode,
      inlineShell: true
    };

    const app = new CustomizationBayApp(this.actor, options);
    const self = this;
    app.render = async function() {
      await requestShellRender(self._shellHost, { reason: 'customization-surface-refresh', surfaceId: 'customization' });
      return app;
    };
    app.close = async function() {
      if (self.options?.returnSurface === 'asset-bay') {
        await self._shellHost?.setSurface?.('asset-bay', {
          source: 'customization',
          bayMode: self.options.bayMode || self.options.mode,
          mode: self.options.bayMode || self.options.mode,
          contextMode: self.options.contextMode || 'modifyExisting'
        });
      } else {
        await self._shellHost?.setSurface?.('home');
      }
      await requestShellRender(self._shellHost, { reason: 'customization-surface-close', surfaceId: self._shellHost?.shellSurface || 'home' });
      return app;
    };

    this._app = app;
    return app;
  }

  _destroy() {
    this._app = null;
  }
}
