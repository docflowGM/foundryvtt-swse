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
import { HolonetComposerAssist } from '/systems/foundryvtt-swse/scripts/ui/holonet/HolonetComposerAssist.js';

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
      SWSELogger.debug(`[ShellHost] setSurface: ${this._shellSurface} → ${surfaceId}`);
      this._shellSurface = surfaceId;
      this._shellSurfaceOptions = options;
      // Surface transitions clear the overlay/drawer stack
      this._shellOverlay = null;
      this._shellDrawer = null;
    }

    /**
     * Return to the primary sheet surface.
     */
    async returnToSheet() {
      await this.setSurface('sheet');
      this.render(false);
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
      await super._onRender(context, options);

      const actor = this.actor || this.document;
      if (actor?.id) {
        ShellRouter.register(actor.id, this);
      }

      if (this._holonetSyncHookId == null) {
        this._holonetSyncHookId = Hooks.on('swseHolonetUpdated', () => {
          if (!this.rendered) return;
          if (this._shellSurface === 'home' || this._shellSurface === 'messenger') {
            this.render(false);
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
          this.render(false);
        });
      });

      // Close overlay
      root.querySelectorAll('[data-shell-action="close-overlay"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.closeOverlay();
          this.render(false);
        });
      });

      root.querySelectorAll('[data-shell-action="open-notifications"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.openDrawer('holonet-notifications');
          this.render(false);
        });
      });

      // Close drawer
      root.querySelectorAll('[data-shell-action="close-drawer"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.closeDrawer();
          this.render(false);
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

      if (this._shellSurface === 'messenger') {
        this._wireMessengerSurfaceEvents(root);
      }

      if (this._shellDrawer?.drawerId === 'holonet-notifications') {
        this._wireHolonetNotificationDrawerEvents(root);
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
          this.render(false);
        });
      });
    }

    /**
     * Wire home surface tile click events.
     * Each tile carries a data-route-id that maps to a shell surface.
     */
    _wireHomeSurfaceEvents(root) {
      const homeRoot = root.querySelector('[data-shell-region="surface-home"]');
      if (!homeRoot) return;

      homeRoot.querySelectorAll('[data-route-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          if (el.disabled) return;
          const routeId = el.dataset.routeId;
          if (!routeId) return;
          await this.setSurface(routeId, { source: 'home' });
          this.render(false);
        });
      });

      homeRoot.querySelectorAll('[data-holonet-record-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const recordId = el.dataset.holonetRecordId;
          if (!recordId) return;
          try {
            const { HolonetEngine } = await import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js');
            const { HolonetDeliveryRouter } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-delivery-router.js');
            const recipientId = HolonetDeliveryRouter.getCurrentRecipientId();
            if (recipientId) {
              await HolonetEngine.markRead(recordId, recipientId);
              this.render(false);
            }
          } catch (err) {
            SWSELogger.error('[ShellHost] Failed to mark Holonet record read:', err);
          }
        });
      });
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
          await HolonetEngine.markRead(recordId, recipientId);
          this.render(false);
        });
      });

      drawerRoot.querySelectorAll('[data-holonet-action="mark-all-read"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await HolonetNoticeCenterService.markAllRead(recipientId);
          this.render(false);
        });
      });
    }

    async _wireMessengerSurfaceEvents(root) {
      const messengerRoot = root.querySelector('[data-shell-region="surface-messenger"]');
      if (!messengerRoot) return;

      const actor = this.actor || this.document;
      const { HolonetMessengerService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');

      await HolonetComposerAssist.attach(messengerRoot);

      const conversation = messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]');
      if (conversation?.querySelector('.swse-msg--unread')) {
        await HolonetMessengerService.markThreadRead(conversation.dataset.threadId);
        this.render(false);
        return;
      }

      messengerRoot.querySelectorAll('.swse-messenger-thread[data-thread-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const threadId = ev.currentTarget.dataset.threadId;
          if (!threadId) return;
          await this.setSurface('messenger', { threadId, source: 'home' });
          this.render(false);
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="send-message"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const data = new FormData(form);
          const body = String(data.get('body') || '').trim();
          if (!body) return;
          const threadId = form.dataset.threadId || null;
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          await HolonetMessengerService.sendMessage({ actor, body, threadId, recipientIds });
          form.reset();
          this.render(false);
        });
      });
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
          this._shellSurfaceOptions = {
            ...this._shellSurfaceOptions,
            selectedCategoryId: newCat,
            selectedItemId: null
          };
          this.render(false);
        });
      });

      // Item rail row selection
      upgradeRoot.querySelectorAll('[data-item-id]').forEach(el => {
        el.addEventListener('click', () => {
          const newItem = el.dataset.itemId;
          if (this._shellSurfaceOptions.selectedItemId === newItem) return;
          this._shellSurfaceOptions = {
            ...this._shellSurfaceOptions,
            selectedItemId: newItem
          };
          this.render(false);
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
            this.render(false);
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
            this.render(false);
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
          this.render(false);
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
              this.render(false);
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
              this.render(false);
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
        this.render(false);
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
        this.render(false);
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
      if (this._holonetSyncHookId != null) {
        Hooks.off('swseHolonetUpdated', this._holonetSyncHookId);
        this._holonetSyncHookId = null;
      }
      return super.close(options);
    }
  };
}
