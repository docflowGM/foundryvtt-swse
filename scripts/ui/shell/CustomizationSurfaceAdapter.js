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
  /**
   * Host-scoped registry: shellHost -> Map<"actorId-mode", adapter>.
   *
   * PR #946 correction — the previous single flat Map keyed only by
   * "actorId-mode" let two independently-open shells (e.g. the owner's
   * Holopad routing to a vehicle's Shipyard via Asset Bay, and that same
   * vehicle's own actor sheet routing to its own Shipyard) collide on the
   * same key. getOrCreate() would silently hand the SECOND caller the
   * FIRST caller's adapter, reassigning its _shellHost — so the adapter's
   * overridden render()/close() closures (which capture `self._shellHost`)
   * would start targeting the wrong window. A WeakMap keyed by the actual
   * shell host object gives every host its own independent inner Map, so
   * the same actor+mode key can never cross host boundaries; entries are
   * released automatically (WeakMap) once a host is garbage-collected, and
   * destroyForHost() below still exists for explicit, deterministic cleanup
   * on close.
   *
   * @type {WeakMap<object, Map<string, CustomizationSurfaceAdapter>>}
   */
  static _hostRegistries = new WeakMap();

  constructor(shellHost, actor, options = {}) {
    this._shellHost = shellHost;
    this.actor = actor;
    this.options = options;
    this._app = null;
  }

  static key(actorId, mode) {
    return `${actorId}-${mode}`;
  }

  static _registryFor(shellHost) {
    if (!shellHost) return null;
    let map = this._hostRegistries.get(shellHost);
    if (!map) {
      map = new Map();
      this._hostRegistries.set(shellHost, map);
    }
    return map;
  }

  static get(shellHost, actorId, mode = 'garage') {
    const map = shellHost ? this._hostRegistries.get(shellHost) : null;
    if (!map || !actorId) return null;
    return map.get(this.key(actorId, mode)) ?? null;
  }

  static getForActor(shellHost, actorId, mode = 'garage') {
    const map = shellHost ? this._hostRegistries.get(shellHost) : null;
    if (!map || !actorId) return null;
    const exact = map.get(this.key(actorId, mode));
    if (exact) return exact;
    for (const [key, adapter] of map.entries()) {
      if (key.startsWith(`${actorId}-`)) return adapter;
    }
    return null;
  }

  static getOrCreate(shellHost, actor, options = {}) {
    const mode = options.bayMode || options.mode || (actor?.type === 'vehicle' ? 'shipyard' : 'garage');
    const map = this._registryFor(shellHost);
    const key = this.key(actor.id, mode);
    let adapter = map?.get(key);
    if (!adapter) {
      adapter = new CustomizationSurfaceAdapter(shellHost, actor, options);
      map?.set(key, adapter);
    }
    adapter._shellHost = shellHost;
    adapter.actor = actor;
    // Route-scoped values (ownerActorId/source/returnSurface/bayMode/
    // contextMode/...) always reflect ONLY the current call's options —
    // never merged with whatever this adapter's options happened to be
    // before. Every live caller already passes the complete, current
    // surface-options object (see ShellHost._prepareContext reading the
    // canonical this._shellSurfaceOptions), so replacing wholesale loses
    // nothing legitimate while preventing a later, narrower route (e.g. a
    // direct vehicle-sheet entry) from silently inheriting an earlier
    // route's ownerActorId/return surface (PR #946 review, Correction 4).
    adapter.options = { ...options, mode, bayMode: mode, inlineShell: true };
    return adapter;
  }

  static destroy(shellHost, actorId) {
    const map = shellHost ? this._hostRegistries.get(shellHost) : null;
    if (!map || !actorId) return;
    for (const [key, adapter] of map) {
      if (key.startsWith(actorId + '-')) {
        adapter._destroy();
        map.delete(key);
      }
    }
  }

  static destroyForHost(shellHost) {
    if (!shellHost) return;
    const map = this._hostRegistries.get(shellHost);
    if (!map) return;
    for (const adapter of map.values()) adapter._destroy();
    this._hostRegistries.delete(shellHost);
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
      const map = this.constructor._registryFor(this._shellHost);
      map?.set(this.constructor.key(this.actor.id, nextMode), this);
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
      // PART 2 / PR #946 Correction 4 — keep the owner identity current even
      // though the app instance is cached across renders (the adapter itself
      // is re-entered with fresh, wholesale-replaced options on every
      // getOrCreate() call). Always resync to whatever ownerActorId the
      // CURRENT options carry (falling back to null, not the previous
      // value) — a later route that omits ownerActorId entirely (e.g. a
      // direct asset-sheet entry after an earlier Asset Bay route on the
      // same host+actor+mode) must not leave the cached app pointed at a
      // stale owner. The earlier `!== undefined` guard here silently skipped
      // exactly that case; there is no longer a guard to skip.
      const nextOwnerActorId = this.options.ownerActorId || null;
      if (this._app.ownerActorId !== nextOwnerActorId) {
        this._app.ownerActorId = nextOwnerActorId;
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
