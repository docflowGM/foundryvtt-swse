/**
 * ShellHostMixin — Surface/overlay/drawer state for the character sheet shell (Phase 11)
 *
 * Apply this mixin to make any ApplicationV2 class a shell host:
 *
 *   class MySheet extends ShellHostMixin(HandlebarsApplicationMixin(ActorSheetV2)) { ... }
 *
 * The mixin adds:
 *   - Surface state: surfaceId controls which content fills the window
 *   - Overlay state: a modal-like layer above the current surface
 *   - Drawer state: a side panel alongside the current surface
 *   - ShellRouter registration/unregistration on open/close
 *
 * Container classification (Phase 11 Addendum):
 *   Route   → setSurface('progression' | 'chargen' | 'upgrade')
 *   Overlay → openOverlay('upgrade-single-item' | 'confirm-*' | 'warning-*')
 *   Drawer  → openDrawer('item-detail' | 'choice-detail' | 'modifier-breakdown' | ...)
 */

import { ShellRouter } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js';
import { ShellSurfaceRegistry } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceRegistry.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { ShellSurfaceState } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceState.js';
import { ShellMutationGuard } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellMutationGuard.js';
import { ShellUiStatePreserver } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellUiStatePreserver.js';
import { MessengerSurfaceController } from '/systems/foundryvtt-swse/scripts/ui/shell/MessengerSurfaceController.js';
import { AtlasSurfaceController } from '/systems/foundryvtt-swse/scripts/ui/shell/AtlasSurfaceController.js';
import { TransmissionDecryptionSurfaceController } from '/systems/foundryvtt-swse/scripts/ui/shell/TransmissionDecryptionSurfaceController.js';

/**
 * @param {class} BaseClass - The ApplicationV2 base class to mix into
 * @returns {class}
 */
export function ShellHostMixin(BaseClass) {
  return class ShellHostMixinClass extends BaseClass {

    // ─── Surface State ──────────────────────────────────────────────────────────

    /** @type {string} Active surface: 'sheet' | 'progression' | 'chargen' | 'upgrade' */
    _shellSurface = 'sheet';

    /** @type {object} Options passed to the current surface */
    _shellSurfaceOptions = {};

    /** @type {{overlayId: string, options: object}|null} Active overlay */
    _shellOverlay = null;

    /** @type {{drawerId: string, options: object}|null} Active drawer */
    _shellDrawer = null;

    /** @type {{modalId: string, options: object}|null} Active modal */
    _shellModal = null;

    /** @type {number|null} Holonet sync hook id */
    _holonetSyncHookId = null;

    /** @type {Set<string>} Thread ids currently being auto-marked read. */
    _holonetReadSyncInFlight = new Set();

    /** @type {number|null} Debounce handle for Holonet-driven shell rerenders. */
    _holonetRenderDebounce = null;

    /** @type {object|null} Captured Messenger UI state restored after rerender. */
    _pendingMessengerUiState = null;

    /** @type {ShellSurfaceState|null} Canonical per-surface UI state store. */
    _shellSurfaceState = null;

    /** @type {Promise|null} Coalesced shell surface render promise. */
    _shellRenderPromise = null;

    /** @type {boolean} Prevents double-render storms when Messenger action handlers already scheduled a refresh. */
    _messengerActionRefreshQueued = false;

    /** @type {Set<string>} Player-originated Messenger socket requests waiting for GM commit sync. */
    _messengerPendingRequestIds = new Set();

    /** @type {{starts:number[], suppressUntil:number, delayedRender:number|null, warnedAt:number}} Home render storm circuit breaker. */
    _homeRenderGuard = { starts: [], suppressUntil: 0, delayedRender: null, warnedAt: 0 };

    // ─── Accessors ──────────────────────────────────────────────────────────────

    get shellSurface() { return this._shellSurface; }
    get shellSurfaceOptions() { return this._shellSurfaceOptions; }
    get shellOverlay() { return this._shellOverlay; }
    get shellDrawer() { return this._shellDrawer; }
    get shellModal() { return this._shellModal; }

    // ─── Surface Routing ────────────────────────────────────────────────────────

    /**
     * Switch the active surface (ROUTE container).
     * Clears overlay and drawer when the surface changes.
     *
     * @param {string} surfaceId
     * @param {object} [options]
     */
    async setSurface(surfaceId, options = {}) {
      const normalizedSurfaceId = surfaceId === 'upgrade' ? 'workbench' : surfaceId;
      SWSELogger.debug(`[ShellHost] setSurface: ${this._shellSurface} → ${normalizedSurfaceId}`);
      this._ensureShellSurfaceState();
      this._shellSurface = normalizedSurfaceId;
      const nextOptions = this._shellSurfaceState.patch(normalizedSurfaceId, options ?? {});
      ShellMutationGuard.withSurfaceOptionsMutation(this, () => { this._shellSurfaceOptions = nextOptions; });
      // Surface transitions clear the overlay/drawer stack
      this._shellOverlay = null;
      this._shellDrawer = null;
    }

    _ensureShellSurfaceState() {
      ShellMutationGuard.install(this, { label: 'ShellHostMixin', logger: SWSELogger });
      ShellUiStatePreserver.install(this, { logger: SWSELogger });
      if (!this._shellSurfaceState) {
        this._shellSurfaceState = new ShellSurfaceState({
          [this._shellSurface || 'home']: this._shellSurfaceOptions || {}
        });
      }
      return this._shellSurfaceState;
    }

    getSurfaceState(surfaceId = this._shellSurface) {
      return this._ensureShellSurfaceState().get(surfaceId);
    }

    patchSurfaceState(surfaceId = this._shellSurface, patch = {}, { render = false, reason = 'surface-state-patch' } = {}) {
      const next = this._ensureShellSurfaceState().patch(surfaceId, patch);
      if (surfaceId === this._shellSurface) {
        ShellMutationGuard.withSurfaceOptionsMutation(this, () => { this._shellSurfaceOptions = next; });
      }
      if (render) void this.requestSurfaceRender({ reason, surfaceId });
      return next;
    }

    patchSurfaceOptions(patch = {}, options = {}) {
      return this.patchSurfaceState(this._shellSurface, patch, options);
    }

    requestSurfaceRender({ reason = 'surface-render', surfaceId = this._shellSurface, preserveUi = true } = {}) {
      const guard = this._homeRenderGuard ??= { starts: [], suppressUntil: 0, delayedRender: null, warnedAt: 0 };
      const now = Date.now();
      if ((surfaceId || this._shellSurface) === 'home') {
        guard.starts = (guard.starts || []).filter(ts => now - ts < 1800);
        if (now < Number(guard.suppressUntil || 0)) {
          if (!guard.delayedRender) {
            guard.delayedRender = window.setTimeout(() => {
              guard.delayedRender = null;
              if (this.rendered && this._shellSurface === 'home') void this.requestSurfaceRender({ reason: 'home-render-storm-recovery', surfaceId: 'home' });
            }, Math.max(120, Number(guard.suppressUntil || 0) - now));
          }
          return Promise.resolve(this);
        }
        if (guard.starts.length >= 12) {
          guard.suppressUntil = now + 900;
          if (now - Number(guard.warnedAt || 0) > 5000) {
            guard.warnedAt = now;
            SWSELogger.warn('[ShellHost] Suppressed a home-surface render storm; a recovery render will run after the storm window.');
          }
          return Promise.resolve(this);
        }
      }

      if (this._shellRenderPromise) {
      if (preserveUi) this._shellUiStatePreserver?.capture?.(this.element, { surfaceId, reason: `${reason}:coalesced-before-render` });
      return this._shellRenderPromise;
    }
      this._shellRenderPromise = Promise.resolve().then(async () => {
        SWSELogger.debug(`[ShellHost] requestSurfaceRender: ${surfaceId} (${reason})`);
        if (preserveUi) this._shellUiStatePreserver?.capture?.(this.element, { surfaceId, reason: `${reason}:before-render` });
        while (this._isRendering) {
          await new Promise(resolve => window.setTimeout(resolve, 0));
        }
        return ShellMutationGuard.withSurfaceRender(this, () => this.render(false), { reason, surfaceId });
      }).finally(() => {
        this._shellRenderPromise = null;
      });
      return this._shellRenderPromise;
    }

    /**
     * Return to the primary sheet surface.
     */
    async returnToSheet() {
      await this.setSurface('sheet');
      await this.requestSurfaceRender({ reason: 'return-to-sheet', surfaceId: 'sheet' });
    }

    // ─── Overlay Management ─────────────────────────────────────────────────────

    /**
     * Open an overlay above the current surface (OVERLAY container).
     *
     * @param {string} overlayId
     * @param {object} [options]
     */
    async openOverlay(overlayId, options = {}) {
      SWSELogger.debug(`[ShellHost] openOverlay: ${overlayId}`);
      this._shellOverlay = { overlayId, options };
    }

    /**
     * Close the current overlay.
     */
    async closeOverlay() {
      this._shellOverlay = null;
    }

    // ─── Drawer Management ──────────────────────────────────────────────────────

    /**
     * Open a side drawer alongside the current surface (DRAWER container).
     *
     * @param {string} drawerId
     * @param {object} [options]
     */
    async openDrawer(drawerId, options = {}) {
      SWSELogger.debug(`[ShellHost] openDrawer: ${drawerId}`);
      this._shellDrawer = { drawerId, options };
    }

    /**
     * Close the current drawer.
     */
    async closeDrawer() {
      this._shellDrawer = null;
    }

    // ─── Modal Management ───────────────────────────────────────────────────────

    /**
     * Open a blocking modal layer.
     *
     * @param {string} modalId
     * @param {object} [options]
     */
    async openModal(modalId, options = {}) {
      this._shellModal = { modalId, options };
    }

    /**
     * Close the current modal.
     */
    async closeModal() {
      this._shellModal = null;
    }

    // ─── Lifecycle Hooks ────────────────────────────────────────────────────────

    /**
     * Override _prepareContext to inject shell state into the template context.
     * Builds surface view model when a non-sheet surface is active.
     */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);

      context.shellSurface = this._shellSurface;
      context.shellSurfaceOptions = this._shellSurfaceOptions;
      context.shellOverlay = this._shellOverlay;
      context.shellDrawer = this._shellDrawer;
      context.shellModal = this._shellModal;
      context.shellIsSheet = this._shellSurface === 'sheet';

      // Build surface view model for non-sheet surfaces
      if (this._shellSurface !== 'sheet') {
        try {
          const actor = this.actor || this.document;
          context.shellSurfaceVm = await ShellSurfaceRegistry.buildSurfaceVm({
            actor,
            surfaceId: this._shellSurface,
            surfaceOptions: this._shellSurfaceOptions,
            shellHost: this
          });
        } catch (err) {
          SWSELogger.error('[ShellHost] Surface VM build failed:', err);
          context.shellSurfaceVm = { error: err.message, surfaceId: this._shellSurface };
        }
      }

      // Build overlay view model if overlay is active
      if (this._shellOverlay) {
        try {
          const actor = this.actor || this.document;
          context.shellOverlayVm = await ShellSurfaceRegistry.buildOverlayVm({
            actor,
            overlayId: this._shellOverlay.overlayId,
            overlayOptions: this._shellOverlay.options,
            shellHost: this
          });
        } catch (err) {
          SWSELogger.error('[ShellHost] Overlay VM build failed:', err);
          context.shellOverlayVm = { error: err.message };
        }
      }

      // Build drawer view model if drawer is active
      if (this._shellDrawer) {
        try {
          const actor = this.actor || this.document;
          context.shellDrawerVm = await ShellSurfaceRegistry.buildDrawerVm({
            actor,
            drawerId: this._shellDrawer.drawerId,
            drawerOptions: this._shellDrawer.options,
            shellHost: this
          });
        } catch (err) {
          SWSELogger.error('[ShellHost] Drawer VM build failed:', err);
          context.shellDrawerVm = { error: err.message };
        }
      }

      return context;
    }

    /**
     * Override _onRender to wire shell-level events (back button, overlay close, etc.)
     * and register with ShellRouter.
     */
    async _onRender(context, options) {
      if (this._shellSurface === 'home') {
        const guard = this._homeRenderGuard ??= { starts: [], suppressUntil: 0, delayedRender: null, warnedAt: 0 };
        const now = Date.now();
        guard.starts = (guard.starts || []).filter(ts => now - ts < 1800);
        guard.starts.push(now);
      }
      await super._onRender(context, options);
      this._shellUiStatePreserver?.restore?.(this.element, { surfaceId: this._shellSurface });

      const actor = this.actor || this.document;
      if (actor?.id) {
        ShellRouter.register(actor.id, this);
      }

      if (this._holonetSyncHookId == null) {
        this._holonetSyncHookId = Hooks.on('swseHolonetUpdated', (syncData = {}) => {
          if (!this.rendered) return;
          if (this._shellSurface === 'home' || this._shellSurface === 'messenger') {
            this._scheduleHolonetSurfaceRender(syncData);
          }
        });
      }

      this._wireShellEvents();
    }

    /**
     * Wire shell-level events. Called after every render.
     * Shell events: back-to-sheet, close-overlay, close-drawer.
     */
    _wireShellEvents() {
      const root = this.element;
      if (!root) return;

      // Back to sheet (from any route surface)
      root.querySelectorAll('[data-shell-action="return-to-sheet"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.returnToSheet();
        });
      });


      // Back to home
      root.querySelectorAll('[data-shell-action="return-to-home"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.setSurface('home');
          await this.requestSurfaceRender({ reason: 'return-to-home', surfaceId: 'home' });
        });
      });

      // Close overlay
      root.querySelectorAll('[data-shell-action="close-overlay"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.closeOverlay();
          await this.requestSurfaceRender({ reason: 'close-overlay' });
        });
      });

      root.querySelectorAll('[data-shell-action="open-notifications"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.openDrawer('holonet-notifications');
          await this.requestSurfaceRender({ reason: 'open-notifications-drawer' });
        });
      });

      // Close drawer
      root.querySelectorAll('[data-shell-action="close-drawer"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.closeDrawer();
          await this.requestSurfaceRender({ reason: 'close-drawer' });
        });
      });

      // Home surface tile events
      if (this._shellSurface === 'home') {
        this._wireHomeSurfaceEvents(root);
      }

      // Upgrade surface events (inline upgrade surface on the shell)
      if (this._shellSurface === 'upgrade') {
        this._wireUpgradeSurfaceEvents(root);
      }

      if (this._shellSurface === 'asset-bay') {
        this._wireAssetBaySurfaceEvents(root);
      }

      if (this._shellSurface === 'customization') {
        this._wireCustomizationSurfaceEvents(root);
      }

      if (this._shellSurface === 'messenger') {
        this._messengerSurfaceController ??= new MessengerSurfaceController(this, this.actor || this.document);
        this._messengerSurfaceController.setActor?.(this.actor || this.document);
        void this._messengerSurfaceController.attach(root).catch(err => {
          SWSELogger.error('[ShellHost] Messenger surface event wiring failed:', err);
        });
      } else {
        this._messengerSurfaceController?.destroy?.();
      }

      if (this._shellSurface === 'atlas') {
        this._atlasSurfaceController ??= new AtlasSurfaceController(this, this.actor || this.document);
        this._atlasSurfaceController.attach(root);
      } else {
        this._atlasSurfaceController?.destroy?.();
      }

      if (this._shellSurface === 'transmission-decryption') {
        this._transmissionDecryptionSurfaceController ??= new TransmissionDecryptionSurfaceController(this, this.actor || this.document);
        this._transmissionDecryptionSurfaceController.attach(root);
      } else {
        this._transmissionDecryptionSurfaceController?.destroy?.();
      }

      if (this._shellSurface === 'store') {
        void import('/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceController.js').then(({ StoreSurfaceController }) => {
          if (this._shellSurface !== 'store' || !this.element) return;
          this._storeSurfaceController ??= new StoreSurfaceController(this, this.actor || this.document);
          this._storeSurfaceController.attach(this.element);
        }).catch(err => {
          SWSELogger.error('[ShellHost] Store surface event wiring failed:', err);
        });
      } else {
        this._storeSurfaceController?.destroy?.();
      }

      if (this._shellDrawer?.drawerId === 'holonet-notifications') {
        void this._wireHolonetNotificationDrawerEvents(root).catch(err => {
          SWSELogger.error('[ShellHost] Holonet notification drawer event wiring failed:', err);
        });
      }

      // Overlay-specific events
      if (this._shellOverlay) {
        this._wireOverlayEvents(root);
      }

      // Open-home nav button (available on all surfaces and sheet mode)
      root.querySelectorAll('[data-shell-action="open-home"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.setSurface('home');
          await this.requestSurfaceRender({ reason: 'return-to-home', surfaceId: 'home' });
        });
      });
    }

    /**
     * Wire home surface tile and CommFeed click events.
     * HoloNet rows are routed before generic app tiles because feed rows can
     * carry both data-holonet-record-id and data-route-id.
     */
    _wireHomeSurfaceEvents(root) {
      const homeRoot = root.querySelector('[data-shell-region="surface-home"]');
      if (!homeRoot) return;

      homeRoot.querySelectorAll('[data-holonet-record-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation?.();
          const recordId = el.dataset.holonetRecordId;
          if (!recordId) return;
          try {
            const { HolonetEngine } = await import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js');
            const { HolonetDeliveryRouter } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-delivery-router.js');
            const recipientId = HolonetDeliveryRouter.getCurrentRecipientId();
            const record = await HolonetEngine.getRecord?.(recordId);
            if (recipientId) await HolonetEngine.markRead(recordId, recipientId);
            if (record && await this._routeHolonetRecordAction(record, el)) return;
            SWSELogger.warn('[ShellHost] HoloNet feed record had no actionable route', {
              recordId,
              routeId: el.dataset.routeId || null,
              sourceFamily: record?.sourceFamily || null,
              intent: record?.intent || null
            });
            await this.requestSurfaceRender({ reason: 'holonet-record-read' });
          } catch (err) {
            SWSELogger.error('[ShellHost] Failed to process HoloNet feed record:', err);
            ui?.notifications?.warn?.('Unable to open that HoloNet item. See console for details.');
          }
        });
      });

      homeRoot.querySelectorAll('[data-route-id]:not([data-holonet-record-id])').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation?.();
          if (el.disabled) return;
          const routeId = el.dataset.routeId;
          if (!routeId) return;
          const surfaceOptions = { source: 'home' };
          if (el.dataset.bayMode) surfaceOptions.bayMode = el.dataset.bayMode;
          if (el.dataset.contextMode) surfaceOptions.contextMode = el.dataset.contextMode;
          if (el.dataset.tabTarget) surfaceOptions.tab = el.dataset.tabTarget;

          const actor = this.actor || this.document;
          if (routeId === 'customization' && surfaceOptions.bayMode === 'shipyard' && actor?.type === 'vehicle') {
            await this._openShipyardForAsset(actor, {
              source: 'vehicle-home',
              contextMode: surfaceOptions.contextMode || 'modifyExisting'
            });
            return;
          }

          await this.setSurface(routeId, surfaceOptions);
          await this.requestSurfaceRender({ reason: `${routeId}-home-launch`, surfaceId: routeId });
        });
      });
    }



    /**
     * Wire inline Garage / Shipyard customization actions for whatever actor is
     * bound to the customization surface. This is intentionally generic shell
     * behavior so owner dashboards, droid sheets, and vehicle sheets all use the
     * same inline adapter bridge.
     */
    _wireCustomizationSurfaceEvents(root) {
      const surfaceRoot = root.querySelector('[data-shell-region="surface-customization"]');
      if (!surfaceRoot) return;

      surfaceRoot.addEventListener('click', async (ev) => {
        const target = ev.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        if (!action) return;
        ev.preventDefault();

        try {
          const { CustomizationSurfaceAdapter } = await import(
            '/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js'
          );
          const mode = surfaceRoot.dataset.bayMode
            || this._shellSurfaceOptions?.bayMode
            || this._shellSurfaceOptions?.mode
            || (this.actor?.type === 'vehicle' ? 'shipyard' : 'garage');
          const targetActorId = surfaceRoot.dataset.actorId
            || this._shellSurfaceOptions?.targetActorId
            || this.actor?.id;
          const adapter = CustomizationSurfaceAdapter.getForActor?.(targetActorId, mode)
            || CustomizationSurfaceAdapter.get?.(targetActorId, mode);
          if (!adapter) {
            SWSELogger.warn(`[ShellHost] No customization adapter found for ${targetActorId}/${mode}`);
            return;
          }
          await adapter.handleAction?.(action, target);
        } catch (err) {
          SWSELogger.error(`[ShellHost] Customization surface action failed:`, err);
        }
      });
    }

    /**
     * Wire Asset Bay owner dashboard actions.
     * Asset Bay is the centralized control point for owned property actors.
     * It opens owned droid/vehicle actor sheets for play/status, and routes
     * modifications into Garage or Shipyard so property management stays
     * separate from the owner's main character sheet.
     */
    _wireAssetBaySurfaceEvents(root) {
      const surfaceRoot = root.querySelector('[data-shell-region="surface-asset-bay"]');
      if (!surfaceRoot) {
        SWSELogger.warn('[AssetBay] Surface root not found while wiring events.');
        return;
      }

      if (surfaceRoot.dataset.assetBayWired === 'true') return;
      surfaceRoot.dataset.assetBayWired = 'true';
      SWSELogger.debug('[AssetBay] Wiring delegated action handler', {
        mode: surfaceRoot.dataset.bayMode || this._shellSurfaceOptions?.bayMode || 'all'
      });

      surfaceRoot.addEventListener('click', async (ev) => {
        const el = ev.target?.closest?.('[data-asset-bay-action]');
        if (!el || !surfaceRoot.contains(el)) return;
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        const action = el.dataset.assetBayAction;
        const rawActorId = el.dataset.actorId || '';
        const bayModeFromEl = el.dataset.bayMode || surfaceRoot.dataset.bayMode || this._shellSurfaceOptions?.bayMode || this._shellSurfaceOptions?.mode || 'all';
        SWSELogger.log('[AssetBay] action clicked', {
          action,
          actorId: rawActorId || null,
          bayMode: bayModeFromEl,
          disabled: !!el.disabled
        });

        if (el.disabled) {
          SWSELogger.debug('[AssetBay] Ignored disabled action', { action, actorId: rawActorId || null });
          return;
        }
        if (!action) {
          SWSELogger.warn('[AssetBay] Clicked asset bay control without action dataset', { dataset: { ...el.dataset } });
          return;
        }

        try {
          if (action === 'switch-mode') {
            const bayMode = el.dataset.bayMode || 'all';
            SWSELogger.log('[AssetBay] switching mode', { bayMode });
            await this.setSurface('asset-bay', {
              source: 'asset-bay-filter',
              bayMode,
              mode: bayMode
            });
            await this.requestSurfaceRender({ reason: `asset-bay-${bayMode}-filter`, surfaceId: 'asset-bay' });
            return;
          }

          if (!rawActorId) {
            SWSELogger.warn('[AssetBay] Missing actor id for action', { action, dataset: { ...el.dataset } });
            ui.notifications?.warn?.('That asset action is missing an actor id. See console for details.');
            return;
          }

          const actorId = this._normalizeAssetActorId(rawActorId);
          const targetActor = game.actors?.get?.(actorId) ?? null;
          if (!targetActor) {
            SWSELogger.warn('[AssetBay] Actor not found for action', { action, rawActorId, actorId });
            ui.notifications?.warn?.('That owned actor could not be found. See console for details.');
            await this.requestSurfaceRender({ reason: 'asset-bay-missing-actor', surfaceId: 'asset-bay' });
            return;
          }

          SWSELogger.debug('[AssetBay] resolved target actor', {
            action,
            actorId: targetActor.id,
            actorName: targetActor.name,
            actorType: targetActor.type
          });

          if (action === 'open-sheet') {
            if (!targetActor.sheet?.render) {
              SWSELogger.warn('[AssetBay] Target actor has no renderable sheet', { actorId: targetActor.id, actorName: targetActor.name });
              ui.notifications?.warn?.(`${targetActor.name} does not have an openable sheet.`);
              return;
            }
            targetActor.sheet.render(true);
            return;
          }

          if (action === 'modify') {
            const bayMode = bayModeFromEl || (targetActor.type === 'vehicle' ? 'shipyard' : 'garage');
            SWSELogger.log('[AssetBay] launching modification route', { bayMode, actorId: targetActor.id, actorType: targetActor.type });
            if (bayMode === 'shipyard' && targetActor.type === 'vehicle') {
              const opened = await this._openShipyardForAsset(targetActor, {
                source: 'asset-bay',
                ownerActor: this.actor || this.document,
                contextMode: 'modifyExisting'
              });
              if (!opened) SWSELogger.warn('[AssetBay] Shipyard route failed', { actorId: targetActor.id });
              return;
            }

            await this.setSurface('customization', {
              source: 'asset-bay',
              returnSurface: 'asset-bay',
              ownerActorId: this.actor?.id ?? this.document?.id ?? '',
              targetActorId: targetActor.id,
              bayMode,
              mode: bayMode,
              contextMode: 'modifyExisting'
            });
            await this.requestSurfaceRender({ reason: `${bayMode}-asset-bay-launch`, surfaceId: 'customization' });
            return;
          }

          if (action === 'grant-access') {
            const bayMode = bayModeFromEl || (targetActor.type === 'vehicle' ? 'shipyard' : 'garage');
            SWSELogger.log('[AssetBay] opening grant access dialog', { bayMode, actorId: targetActor.id });
            await this._promptGrantAssetAccess(targetActor, bayMode);
            return;
          }

          SWSELogger.warn('[AssetBay] Unknown asset bay action', { action, dataset: { ...el.dataset } });
          ui.notifications?.warn?.(`Unknown asset action: ${action}`);
        } catch (err) {
          SWSELogger.error('[AssetBay] action failed', {
            action,
            actorId: rawActorId || null,
            bayMode: bayModeFromEl,
            error: err?.message,
            stack: err?.stack
          });
          ui.notifications?.error?.(`Asset Bay action failed: ${err.message}`);
        }
      });
    }


    _normalizeAssetActorId(value) {
      return String(value ?? '').replace(/^Actor\./, '').replace(/^Compendium\.[^.]+\.[^.]+\.Actor\./, '').trim();
    }

    _idsFromAssetReference(value) {
      const ids = new Set();
      const add = (candidate) => {
        const id = this._normalizeAssetActorId(candidate);
        if (id) ids.add(id);
      };

      if (!value) return ids;
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === 'object') add(entry?.id ?? entry?.actorId ?? entry?.ownerActorId ?? entry?.uuid);
          else add(entry);
        }
        return ids;
      }

      if (typeof value === 'object') {
        add(value.id ?? value.actorId ?? value.ownerActorId ?? value.uuid);
        for (const key of ['ownerActorIds', 'accessActorIds', 'recipientActorIds']) {
          const entries = Array.isArray(value[key]) ? value[key] : value[key] ? Object.values(value[key]) : [];
          for (const entry of entries) add(entry?.id ?? entry?.actorId ?? entry);
        }
        return ids;
      }

      add(value);
      return ids;
    }

    _resolveAssetOwnerActor(assetActor) {
      const current = this.actor || this.document || null;
      if (current?.type !== 'vehicle') return current;

      const system = assetActor?.system ?? {};
      const flags = assetActor?.flags ?? {};
      const candidates = [
        system.ownedByActorId,
        system.ownerActorId,
        system.ownerId,
        system.ownerUuid,
        system.ownedBy,
        system.storeAcquisition?.ownerActorId,
        system.assetOwnership?.primaryOwnerActorId,
        flags['foundryvtt-swse']?.assetGrant?.primaryOwnerActorId,
        flags['foundryvtt-swse']?.storeAcquisition?.ownerActorId
      ];

      for (const value of candidates) {
        for (const id of this._idsFromAssetReference(value)) {
          const actor = game.actors?.get?.(id);
          if (actor && actor.type !== 'vehicle') return actor;
        }
      }

      const userActor = game.user?.character ?? null;
      if (userActor?.type !== 'vehicle') return userActor;
      return current;
    }

    async _openShipyardForAsset(targetVehicle, options = {}) {
      if (!targetVehicle || targetVehicle.type !== 'vehicle') {
        ui.notifications?.warn?.('Select a vehicle actor before opening the Shipyard.');
        return false;
      }

      try {
        const { VehicleModificationApp } = await import('/systems/foundryvtt-swse/scripts/apps/vehicle-modification-app.js');
        const ownerActor = options.ownerActor?.type && options.ownerActor.type !== 'vehicle'
          ? options.ownerActor
          : this._resolveAssetOwnerActor(targetVehicle);

        await VehicleModificationApp.open(ownerActor, {
          targetVehicle,
          vehicleActor: targetVehicle,
          mode: 'shipyard',
          contextMode: options.contextMode || 'modifyExisting',
          source: options.source || 'asset-shipyard'
        });
        return true;
      } catch (err) {
        SWSELogger.error('[ShellHost] Failed to open Shipyard Builder:', err);
        ui.notifications?.error?.('Failed to open the Shipyard Builder. See console for details.');
        return false;
      }
    }


    async _promptGrantAssetAccess(assetActor, bayMode = 'garage') {
      if (!game.user?.isGM) {
        ui.notifications?.warn?.('Only a GM can grant droid or ship access.');
        return false;
      }
      const recipients = Array.from(game.users?.contents ?? game.users ?? [])
        .filter(user => !user?.isGM && user?.character)
        .map(user => ({ user, actor: user.character }))
        .filter(row => row.actor?.id);
      if (!recipients.length) {
        ui.notifications?.warn?.('No player character actors are available to receive this asset.');
        return false;
      }

      const checkboxes = recipients.map(({ actor }) => `
        <label style="display:block;margin:.25rem 0;">
          <input type="checkbox" name="recipientActorIds" value="${actor.id}" checked>
          ${actor.name}
        </label>`).join('');
      const primaryOptions = recipients.map(({ actor }) => `<option value="${actor.id}">${actor.name}</option>`).join('');
      const label = bayMode === 'shipyard' ? 'ship' : 'droid';
      const content = `
        <form class="swse-asset-grant-dialog">
          <p>Grant access to <strong>${assetActor.name}</strong>. One ${label} actor is shared; this does not copy the asset or charge credits.</p>
          <label>Primary owner / captain
            <select name="primaryActorId">${primaryOptions}</select>
          </label>
          <fieldset style="margin-top:.5rem;">
            <legend>Access recipients</legend>
            ${checkboxes}
          </fieldset>
        </form>`;

      return new Promise(resolve => {
        new Dialog({
          title: `Grant ${assetActor.name}`,
          content,
          buttons: {
            grant: {
              icon: '<i class="fas fa-gift"></i>',
              label: 'Grant Access',
              callback: async (html) => {
                try {
                  const form = html?.[0]?.querySelector?.('form') ?? html?.querySelector?.('form');
                  const data = new FormData(form);
                  const recipientActorIds = data.getAll('recipientActorIds').map(String).filter(Boolean);
                  const recipientActors = recipientActorIds.map(id => game.actors?.get?.(id)).filter(Boolean);
                  const primaryOwnerActor = game.actors?.get?.(String(data.get('primaryActorId') || '')) ?? recipientActors[0] ?? null;
                  if (!recipientActors.length) {
                    ui.notifications?.warn?.('Select at least one recipient actor.');
                    resolve(false);
                    return;
                  }
                  const { AssetGrantService } = await import('/systems/foundryvtt-swse/scripts/engine/assets/AssetGrantService.js');
                  await AssetGrantService.grantAssetAccess({
                    assetActor,
                    recipientActors,
                    primaryOwnerActor,
                    shared: recipientActors.length > 1,
                    grantSource: `${bayMode}-gm-grant`,
                    requesterId: game.user?.id ?? null,
                    notes: `Granted from ${bayMode === 'shipyard' ? 'Shipyard' : 'Garage'}.`
                  });
                  ui.notifications?.info?.(`${assetActor.name} access granted to ${recipientActors.length} actor(s).`);
                  await this.requestSurfaceRender({ reason: 'asset-bay-grant-access', surfaceId: 'asset-bay' });
                  resolve(true);
                } catch (err) {
                  SWSELogger.error('[ShellHost] Asset grant failed:', err);
                  ui.notifications?.error?.(`Asset grant failed: ${err.message}`);
                  resolve(false);
                }
              }
            },
            cancel: { label: 'Cancel', callback: () => resolve(false) }
          },
          default: 'grant',
          close: () => resolve(false)
        }).render(true);
      });
    }

    _holonetMessengerThreadId(record, element = null) {
      const dataset = element?.dataset || {};
      const metadata = record?.metadata || {};
      const actionOptions = metadata.actionOptions || {};
      const direct = dataset.holonetThreadId || actionOptions.threadId || metadata.threadId || record?.threadId;
      if (direct) return String(direct);
      const projection = Array.isArray(record?.projections)
        ? record.projections.find(entry => String(entry?.surfaceType || entry?.type || '').toLowerCase().includes('messenger') && (entry?.threadId || entry?.metadata?.threadId))
        : null;
      return projection?.threadId || projection?.metadata?.threadId ? String(projection.threadId || projection.metadata.threadId) : '';
    }

    _holonetMessengerSourceRecordId(record, element = null) {
      const dataset = element?.dataset || {};
      const metadata = record?.metadata || {};
      const actionOptions = metadata.actionOptions || {};
      return String(dataset.holonetSourceRecordId || actionOptions.sourceRecordId || metadata.sourceRecordId || metadata.recordId || record?.id || '');
    }

    _holonetRecordRouteData(record, element = null) {
      const dataset = element?.dataset || {};
      const metadata = record?.metadata || {};
      const route = metadata.route || {};
      const actionOptions = metadata.actionOptions || {};
      const sourceFamily = String(record?.sourceFamily || '').toLowerCase();
      const intent = String(record?.intent || '').toLowerCase();
      const surface = String(
        dataset.holonetActionSurface
        || actionOptions.surface
        || metadata.actionSurface
        || dataset.routeId
        || metadata.routeId
        || route.surface
        || route.routeId
        || ''
      ).toLowerCase();
      const threadId = this._holonetMessengerThreadId(record, element);
      const sourceRecordId = this._holonetMessengerSourceRecordId(record, element);
      const appMode = String(dataset.appMode || actionOptions.appMode || metadata.appMode || route.appMode || '').toLowerCase();
      const routeIntent = String(dataset.routeIntent || actionOptions.routeIntent || metadata.routeIntent || route.routeIntent || intent || '').toLowerCase();
      const targetActorId = this._normalizeAssetActorId(
        dataset.actorId
        || actionOptions.targetActorId
        || actionOptions.actorId
        || metadata.targetActorId
        || metadata.actorId
        || metadata.draftActorId
        || route.targetActorId
        || route.actorId
        || ''
      );
      const bayMode = String(dataset.bayMode || actionOptions.bayMode || metadata.bayMode || route.bayMode || '').toLowerCase();
      return {
        sourceFamily,
        intent,
        surface,
        threadId,
        sourceRecordId,
        appMode,
        routeIntent,
        targetActorId,
        bayMode,
        tab: dataset.tabTarget || actionOptions.tab || metadata.tab || route.tab || null,
        sheetAnchor: dataset.sheetAnchor || actionOptions.sheetAnchor || metadata.sheetAnchor || route.sheetAnchor || null,
        workbenchCategory: dataset.workbenchCategory || actionOptions.category || metadata.workbenchCategory || route.category || null,
        initialCategory: dataset.initialCategory || actionOptions.initialCategory || metadata.initialCategory || route.initialCategory || null,
        mode: dataset.mode || actionOptions.mode || metadata.mode || route.mode || null,
        entryPoint: dataset.entryPoint || actionOptions.entryPoint || metadata.entryPoint || route.entryPoint || null
      };
    }

    _inferHolonetBayMode(record, routeData = {}) {
      if (routeData.bayMode) return routeData.bayMode;
      const family = routeData.sourceFamily;
      const approvalType = String(record?.metadata?.approvalType || record?.metadata?.assetType || '').toLowerCase();
      const targetActor = routeData.targetActorId ? game.actors?.get?.(routeData.targetActorId) : null;
      const type = String(targetActor?.type || approvalType || '').toLowerCase();
      if (family === 'garage' || family === 'droid' || type.includes('droid')) return 'garage';
      if (family === 'shipyard' || family === 'ship' || type.includes('vehicle') || type.includes('ship')) return 'shipyard';
      return 'all';
    }

    async _openHolonetSurface(surfaceId, options = {}, reason = 'holonet-route') {
      await this.setSurface(surfaceId, options);
      if (this._shellDrawer?.drawerId === 'holonet-notifications') await this.closeDrawer();
      await this.requestSurfaceRender({ reason, surfaceId });
      return true;
    }

    async _routeHolonetRecordAction(record, element = null) {
      const routeData = this._holonetRecordRouteData(record, element);
      const family = routeData.sourceFamily;
      const surface = routeData.surface;
      const intent = routeData.intent;
      const routeIntent = routeData.routeIntent;
      const isJob = routeData.appMode === 'jobs'
        || routeIntent.includes('job')
        || intent.includes('job')
        || String(record?.metadata?.category || '').toLowerCase().includes('job');

      SWSELogger.debug('[ShellHost] Routing HoloNet record', {
        recordId: record?.id,
        family,
        surface,
        intent,
        routeIntent,
        threadId: routeData.threadId || null,
        targetActorId: routeData.targetActorId || null
      });

      if (routeData.threadId && (family === 'messenger' || surface === 'messenger' || isJob)) {
        return this._openHolonetSurface('messenger', {
          source: 'holonet-notice',
          appMode: isJob ? 'jobs' : 'chat',
          threadId: routeData.threadId,
          compose: false,
          ...(routeData.sourceRecordId ? { highlightRecordId: routeData.sourceRecordId } : {})
        }, isJob ? 'holonet-open-job-thread' : 'holonet-open-messenger-thread');
      }

      if (surface === 'store' || family === 'store') {
        return this._openHolonetSurface('store', {
          source: 'holonet-notice',
          mode: routeData.mode || null,
          initialCategory: routeData.initialCategory || null,
          tab: routeData.tab || null,
          entryPoint: routeData.entryPoint || null,
          highlightRecordId: record?.id || null
        }, 'holonet-open-store');
      }

      if (surface === 'asset-bay' || family === 'approvals' || family === 'garage' || family === 'shipyard' || family === 'droid' || family === 'ship') {
        const bayMode = this._inferHolonetBayMode(record, routeData);
        return this._openHolonetSurface('asset-bay', {
          source: 'holonet-notice',
          bayMode,
          mode: bayMode,
          targetActorId: routeData.targetActorId || null,
          highlightActorId: routeData.targetActorId || null,
          highlightRecordId: record?.id || null
        }, 'holonet-open-asset-bay');
      }

      if (surface === 'workbench' || family === 'workbench') {
        return this._openHolonetSurface('workbench', {
          source: 'holonet-notice',
          selectedCategoryId: routeData.workbenchCategory || routeData.initialCategory || null,
          category: routeData.workbenchCategory || routeData.initialCategory || null,
          mode: routeData.mode || null,
          highlightRecordId: record?.id || null
        }, 'holonet-open-workbench');
      }

      if (surface === 'allies' || family === 'allies' || family === 'faction' || family === 'follower') {
        return this._openHolonetSurface('allies', {
          source: 'holonet-notice',
          tab: routeData.tab || null,
          targetActorId: routeData.targetActorId || null,
          highlightRecordId: record?.id || null
        }, 'holonet-open-allies');
      }

      if (surface === 'games' || family === 'games') {
        return this._openHolonetSurface('games', {
          source: 'holonet-notice',
          mode: routeData.mode || null,
          highlightRecordId: record?.id || null
        }, 'holonet-open-games');
      }

      if (surface === 'training' || surface === 'progression' || family === 'training' || family === 'progression') {
        return this._openHolonetSurface('progression', {
          source: 'holonet-notice',
          stepId: routeData.entryPoint || routeData.mode || null,
          highlightRecordId: record?.id || null
        }, 'holonet-open-training');
      }

      if (surface === 'mentor' || family === 'mentor') {
        return this._openHolonetSurface('mentor', {
          source: 'holonet-notice',
          highlightRecordId: record?.id || null
        }, 'holonet-open-mentor');
      }

      if (surface === 'sheet' || family === 'healing') {
        await this.setSurface('sheet', {
          source: 'holonet-notice',
          tab: routeData.tab || 'overview',
          sheetAnchor: routeData.sheetAnchor || 'health',
          highlightRecordId: record?.id || null
        });
        if (this._shellDrawer?.drawerId === 'holonet-notifications') await this.closeDrawer();
        await this.requestSurfaceRender({ reason: 'holonet-open-sheet', surfaceId: 'sheet' });
        return true;
      }

      SWSELogger.warn('[ShellHost] HoloNet record has no actionable route', {
        recordId: record?.id,
        family,
        surface,
        intent,
        routeData
      });
      return false;
    }

    async _wireHolonetNotificationDrawerEvents(root) {
      const drawerRoot = root.querySelector('[data-drawer-id="holonet-notifications"]');
      if (!drawerRoot) return;

      const { HolonetNoticeCenterService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-notice-center-service.js');
      const { HolonetEngine } = await import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js');
      const recipientId = await HolonetNoticeCenterService.currentRecipientId();

      drawerRoot.querySelectorAll('[data-holonet-record-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const recordId = el.dataset.holonetRecordId;
          if (!recordId || !recipientId) return;
          const record = await HolonetEngine.getRecord?.(recordId);
          await HolonetEngine.markRead(recordId, recipientId);
          if (record && await this._routeHolonetRecordAction(record, el)) {
            return;
          }
          await this.requestSurfaceRender({ reason: 'holonet-record-read' });
        });
      });

      drawerRoot.querySelectorAll('[data-holonet-action="mark-all-read"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await HolonetNoticeCenterService.markAllRead(recipientId);
          await this.requestSurfaceRender({ reason: 'holonet-mark-all-read' });
        });
      });
    }


    _getMessengerSurfaceController() {
      this._messengerSurfaceController ??= new MessengerSurfaceController(this, this.actor || this.document);
      this._messengerSurfaceController.setActor?.(this.actor || this.document);
      return this._messengerSurfaceController;
    }

    _scheduleHolonetSurfaceRender(syncData = {}) {
      this._getMessengerSurfaceController()?.scheduleHolonetSurfaceRender(syncData);
    }

    async _refreshMessengerSurface(options = {}) {
      return this._getMessengerSurfaceController()?.refreshSurface(options);
    }

    _captureMessengerUiState(root = this.element, overrides = {}) {
      return this._getMessengerSurfaceController()?.captureUiState(root, overrides) ?? { ...overrides };
    }

    _restoreMessengerUiState(root = this.element) {
      return this._getMessengerSurfaceController()?.restoreUiState(root);
    }

    async _wireMessengerSurfaceEvents(root, signal = null) {
      return this._getMessengerSurfaceController()?.attach(root, signal);
    }

    /**
     * Wire upgrade surface events when the shell is in 'upgrade' mode.
     * Mirrors the event wiring in SWSEUpgradeApp.wireEvents().
     */
    _wireUpgradeSurfaceEvents(root) {
      const upgradeRoot = root.querySelector('[data-shell-region="surface-upgrade"]');
      if (!upgradeRoot) return;

      const actor = this.actor || this.document;

      // Category tab selection
      upgradeRoot.querySelectorAll('[data-category-id]').forEach(el => {
        el.addEventListener('click', () => {
          const newCat = el.dataset.categoryId;
          if (this._shellSurfaceOptions.selectedCategoryId === newCat) return;
          this.patchSurfaceOptions({ selectedCategoryId: newCat, selectedItemId: null });
          this.requestSurfaceRender({ reason: 'upgrade-category-change' });
        });
      });

      // Item rail row selection
      upgradeRoot.querySelectorAll('[data-item-id]').forEach(el => {
        el.addEventListener('click', () => {
          const newItem = el.dataset.itemId;
          if (this._shellSurfaceOptions.selectedItemId === newItem) return;
          this.patchSurfaceOptions({ selectedItemId: newItem });
          this.requestSurfaceRender({ reason: 'upgrade-item-change' });
        });
      });

      // Apply upgrade
      upgradeRoot.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const { selectedItemId } = this._shellSurfaceOptions;
          if (!actor || !selectedItemId) return;
          try {
            const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
            await CommandBus.execute('APPLY_ITEM_UPGRADE', {
              actor,
              itemId: selectedItemId,
              upgradeId: el.dataset.upgradeId
            });
            await this.requestSurfaceRender({ reason: 'upgrade-apply' });
          } catch (err) {
            ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`);
          }
        });
      });

      // Remove upgrade
      upgradeRoot.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const { selectedItemId } = this._shellSurfaceOptions;
          if (!actor || !selectedItemId) return;
          try {
            const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
            await CommandBus.execute('REMOVE_ITEM_UPGRADE', {
              actor,
              itemId: selectedItemId,
              upgradeIndex: Number(el.dataset.upgradeIndex)
            });
            await this.requestSurfaceRender({ reason: 'upgrade-remove' });
          } catch (err) {
            ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`);
          }
        });
      });

      // Finalize upgrades
      upgradeRoot.querySelector('[data-action="finalize-upgrades"]')?.addEventListener('click', async () => {
        const { selectedItemId } = this._shellSurfaceOptions;
        if (!actor || !selectedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('FINALIZE_ITEM_UPGRADES', { actor, itemId: selectedItemId });
          ui.notifications?.info?.('Upgrades finalized.');
          await this.requestSurfaceRender({ reason: 'upgrade-finalize' });
        } catch (err) {
          ui.notifications?.error?.(`Failed to finalize: ${err.message}`);
        }
      });
    }

    /**
     * Wire overlay-specific events.
     */
    _wireOverlayEvents(root) {
      const overlayRoot = root.querySelector('[data-shell-region="overlay"]');
      if (!overlayRoot) return;

      const overlayId = this._shellOverlay?.overlayId;
      const actor = this.actor || this.document;

      if (overlayId === 'upgrade-single-item') {
        // Single-item upgrade overlay events (same as upgrade surface but scoped)
        overlayRoot.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
          el.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            const focusedItemId = this._shellOverlay?.options?.focusedItemId;
            if (!actor || !focusedItemId) return;
            try {
              const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
              await CommandBus.execute('APPLY_ITEM_UPGRADE', {
                actor,
                itemId: focusedItemId,
                upgradeId: el.dataset.upgradeId
              });
              await this.requestSurfaceRender({ reason: 'upgrade-overlay-apply' });
            } catch (err) {
              ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`);
            }
          });
        });

        overlayRoot.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
          el.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            const focusedItemId = this._shellOverlay?.options?.focusedItemId;
            if (!actor || !focusedItemId) return;
            try {
              const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
              await CommandBus.execute('REMOVE_ITEM_UPGRADE', {
                actor,
                itemId: focusedItemId,
                upgradeIndex: Number(el.dataset.upgradeIndex)
              });
              await this.requestSurfaceRender({ reason: 'upgrade-overlay-remove' });
            } catch (err) {
              ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`);
            }
          });
        });
      }

      // Confirm overlay actions
      overlayRoot.querySelector('[data-shell-overlay-action="confirm"]')?.addEventListener('click', async () => {
        const onConfirm = this._shellOverlay?.options?.onConfirm;
        if (typeof onConfirm === 'function') {
          try {
            await onConfirm();
          } catch (err) {
            SWSELogger.error('[ShellHost] Overlay confirm callback failed:', err);
          }
        }
        await this.closeOverlay();
        await this.requestSurfaceRender({ reason: 'overlay-close' });
      });

      overlayRoot.querySelector('[data-shell-overlay-action="cancel"]')?.addEventListener('click', async () => {
        const onCancel = this._shellOverlay?.options?.onCancel;
        if (typeof onCancel === 'function') {
          try {
            await onCancel();
          } catch (err) {
            SWSELogger.error('[ShellHost] Overlay cancel callback failed:', err);
          }
        }
        await this.closeOverlay();
        await this.requestSurfaceRender({ reason: 'overlay-close' });
      });
    }

    /**
     * Unregister from ShellRouter when the sheet closes.
     */
    async close(options) {
      const actor = this.actor || this.document;
      if (actor?.id) {
        ShellRouter.unregister(actor.id);
      }
      try {
        const { CustomizationSurfaceAdapter } = await import('/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js');
        CustomizationSurfaceAdapter.destroyForHost?.(this);
      } catch (err) {
        SWSELogger.warn('[ShellHost] Failed to destroy customization adapters for closing host:', err);
      }
      if (this._homeRenderGuard?.delayedRender) {
        window.clearTimeout(this._homeRenderGuard.delayedRender);
        this._homeRenderGuard.delayedRender = null;
      }
      if (this._holonetSyncHookId != null) {
        Hooks.off('swseHolonetUpdated', this._holonetSyncHookId);
        this._holonetSyncHookId = null;
      }
      return super.close(options);
    }
  };
}
