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

    /** @type {Set<string>} Thread ids currently being auto-marked read. */
    _holonetReadSyncInFlight = new Set();

    /** @type {number|null} Debounce handle for Holonet-driven shell rerenders. */
    _holonetRenderDebounce = null;

    /** @type {object|null} Captured Messenger UI state restored after rerender. */
    _pendingMessengerUiState = null;

    /** @type {boolean} Prevents double-render storms when Messenger action handlers already scheduled a refresh. */
    _messengerActionRefreshQueued = false;

    /** @type {Set<string>} Player-originated Messenger socket requests waiting for GM commit sync. */
    _messengerPendingRequestIds = new Set();

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
      this._shellSurface = normalizedSurfaceId;
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
        void this._wireMessengerSurfaceEvents(root).catch(err => {
          SWSELogger.error('[ShellHost] Messenger surface event wiring failed:', err);
        });
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
          const surfaceOptions = { source: 'home' };
          if (el.dataset.bayMode) surfaceOptions.bayMode = el.dataset.bayMode;
          if (el.dataset.contextMode) surfaceOptions.contextMode = el.dataset.contextMode;
          await this.setSurface(routeId, surfaceOptions);
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


    _collectHolonetAttachments(form) {
      return Array.from(form?.querySelectorAll?.('input[name="attachmentUuids"]') ?? [])
        .map(input => ({
          uuid: String(input.value || '').trim(),
          name: input.dataset.name || '',
          type: input.dataset.type || '',
          img: input.dataset.img || '',
          documentName: input.dataset.documentName || ''
        }))
        .filter(att => att.uuid);
    }

    async _resolveHolonetDroppedItem(ev) {
      const raw = ev?.dataTransfer?.getData?.('text/plain') || ev?.dataTransfer?.getData?.('application/json') || '';
      if (!raw) return null;
      let data = null;
      try { data = JSON.parse(raw); } catch (_err) { return null; }
      const isItem = data?.type === 'Item' || data?.documentName === 'Item' || data?.uuid?.includes('.Item.');
      if (!isItem) return null;
      let doc = null;
      try {
        if (data.uuid) doc = await fromUuid(data.uuid);
        else if (globalThis.Item?.fromDropData) doc = await Item.fromDropData(data);
      } catch (err) {
        console.warn('[Holonet] Unable to resolve dropped item', data, err);
      }
      if (!doc) return null;
      const uuid = data.uuid || doc.uuid;
      if (!uuid) return null;
      return {
        uuid,
        name: doc.name || 'Item',
        type: doc.type || 'item',
        img: doc.img || '',
        documentName: doc.documentName || 'Item'
      };
    }

    _appendHolonetAttachment(form, attachment, { inputName = 'attachmentUuids' } = {}) {
      if (!form || !attachment?.uuid) return;
      let bin = form.querySelector('[data-holonet-attachment-bin]');
      if (!bin) {
        bin = document.createElement('div');
        bin.dataset.holonetAttachmentBin = 'true';
        bin.className = 'hl-attach-preview-list';
        form.appendChild(bin);
      }
      if (Array.from(form.querySelectorAll(`input[name="${inputName}"]`)).some(input => input.value === attachment.uuid)) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = inputName;
      input.value = attachment.uuid;
      input.dataset.name = attachment.name || '';
      input.dataset.type = attachment.type || '';
      input.dataset.img = attachment.img || '';
      input.dataset.documentName = attachment.documentName || '';
      bin.appendChild(input);
      const chip = document.createElement('span');
      chip.className = 'hl-attach-preview-chip';
      chip.textContent = `${attachment.name || 'Item'} attached`;
      bin.appendChild(chip);
    }

    _wireHolonetAttachmentDrops(messengerRoot) {
      messengerRoot.querySelectorAll('[data-holonet-drop-zone]').forEach(zone => {
        zone.addEventListener('dragover', ev => {
          ev.preventDefault();
          zone.classList.add('hl-drop-active');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('hl-drop-active'));
        zone.addEventListener('drop', async ev => {
          ev.preventDefault();
          zone.classList.remove('hl-drop-active');
          const attachment = await this._resolveHolonetDroppedItem(ev);
          if (!attachment) return;
          const form = zone.closest('form');
          const inputName = zone.dataset.holonetDropInput || 'attachmentUuids';
          this._appendHolonetAttachment(form, attachment, { inputName });
        });
      });
    }

    _noteMessengerPendingResult(result) {
      const requestId = result?.requestId ? String(result.requestId) : null;
      if (!requestId || !result?.pending) return;
      this._messengerPendingRequestIds.add(requestId);
      window.setTimeout(() => {
        this._messengerPendingRequestIds.delete(requestId);
      }, 15000);
    }

    _captureMessengerUiState(root = this.element, overrides = {}) {
      const messengerRoot = root?.querySelector?.('[data-shell-region="surface-messenger"]');
      if (!messengerRoot) return { ...overrides };

      const active = document.activeElement;
      const activeState = active && messengerRoot.contains(active) ? {
        selector: active.name
          ? `${active.tagName.toLowerCase()}[name="${globalThis.CSS?.escape ? globalThis.CSS.escape(active.name) : active.name}"]`
          : null,
        value: active.value ?? null,
        selectionStart: Number.isInteger(active.selectionStart) ? active.selectionStart : null,
        selectionEnd: Number.isInteger(active.selectionEnd) ? active.selectionEnd : null
      } : null;

      const conversation = messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]');
      const messageScrollTop = conversation?.scrollTop ?? 0;
      const messageAtBottom = conversation
        ? (conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop) <= 36
        : false;

      return {
        threadId: conversation?.dataset.threadId || this._shellSurfaceOptions?.threadId || null,
        threadListScrollTop: messengerRoot.querySelector('.hl-tlist-scroll')?.scrollTop ?? 0,
        messageScrollTop,
        messageAtBottom,
        infoScrollTop: messengerRoot.querySelector('.hl-info-panel')?.scrollTop ?? 0,
        composeScrollTop: messengerRoot.querySelector('.hl-compose-scroll')?.scrollTop ?? 0,
        activeState,
        ...overrides
      };
    }

    _restoreMessengerUiState(root = this.element) {
      const state = this._pendingMessengerUiState;
      if (!state) return;
      const messengerRoot = root?.querySelector?.('[data-shell-region="surface-messenger"]');
      if (!messengerRoot) return;

      window.requestAnimationFrame?.(() => {
        const threadList = messengerRoot.querySelector('.hl-tlist-scroll');
        if (threadList && Number.isFinite(state.threadListScrollTop)) threadList.scrollTop = state.threadListScrollTop;

        const info = messengerRoot.querySelector('.hl-info-panel');
        if (info && Number.isFinite(state.infoScrollTop)) info.scrollTop = state.infoScrollTop;

        const compose = messengerRoot.querySelector('.hl-compose-scroll');
        if (compose && Number.isFinite(state.composeScrollTop)) compose.scrollTop = state.composeScrollTop;

        const conversation = messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]');
        if (conversation) {
          if (state.scrollToBottom || state.messageAtBottom) conversation.scrollTop = conversation.scrollHeight;
          else if (Number.isFinite(state.messageScrollTop)) conversation.scrollTop = state.messageScrollTop;
        }

        const activeState = state.activeState;
        if (activeState?.selector && activeState.value != null) {
          const field = messengerRoot.querySelector(activeState.selector);
          if (field && !field.disabled) {
            field.value = activeState.value;
            field.focus?.({ preventScroll: true });
            if (Number.isInteger(activeState.selectionStart) && field.setSelectionRange) {
              field.setSelectionRange(activeState.selectionStart, activeState.selectionEnd ?? activeState.selectionStart);
            }
          }
        }
        this._pendingMessengerUiState = null;
      });
    }

    _scheduleHolonetSurfaceRender(syncData = {}) {
      if (!this.rendered) return;
      const isMessenger = this._shellSurface === 'messenger';
      const pendingRequestSync = Boolean(isMessenger && syncData?.requestId && this._messengerPendingRequestIds.has(String(syncData.requestId)));
      if (isMessenger && this._messengerActionRefreshQueued && !pendingRequestSync) return;

      if (isMessenger) {
        const matchingRequest = pendingRequestSync;
        if (matchingRequest) this._messengerPendingRequestIds.delete(String(syncData.requestId));
        const shouldSelectSyncedThread = Boolean(matchingRequest && syncData?.threadId);
        const currentState = this._captureMessengerUiState(this.element, {
          threadId: shouldSelectSyncedThread ? syncData.threadId : undefined,
          scrollToBottom: Boolean((syncData?.messageId && syncData?.threadId && this._shellSurfaceOptions?.threadId === syncData.threadId) || shouldSelectSyncedThread)
        });
        if (shouldSelectSyncedThread) {
          this._shellSurfaceOptions = { ...this._shellSurfaceOptions, threadId: syncData.threadId, compose: false, source: 'messenger' };
        } else if (syncData?.threadId && !this._shellSurfaceOptions?.threadId && currentState.threadId === syncData.threadId) {
          this._shellSurfaceOptions = { ...this._shellSurfaceOptions, threadId: syncData.threadId, source: 'messenger' };
        }
        this._pendingMessengerUiState = currentState;
      }

      if (this._holonetRenderDebounce) window.clearTimeout(this._holonetRenderDebounce);
      this._holonetRenderDebounce = window.setTimeout(() => {
        this._holonetRenderDebounce = null;
        if (this.rendered) this.render(false);
      }, isMessenger ? 90 : 120);
    }

    async _refreshMessengerSurface(options = {}) {
      const threadId = options.threadId || this._shellSurfaceOptions?.threadId || null;
      this._messengerActionRefreshQueued = true;
      this._pendingMessengerUiState = this._captureMessengerUiState(this.element, {
        threadId,
        scrollToBottom: Boolean(options.scrollToBottom)
      });
      this._shellSurface = 'messenger';
      this._shellSurfaceOptions = {
        ...this._shellSurfaceOptions,
        source: 'messenger',
        ...(threadId ? { threadId } : {}),
        ...(options.compose != null ? { compose: options.compose } : {}),
        ...(options.compositionType ? { compositionType: options.compositionType } : {}),
        ...(options.compositionMode ? { compositionMode: options.compositionMode } : {})
      };
      if (this._holonetRenderDebounce) {
        window.clearTimeout(this._holonetRenderDebounce);
        this._holonetRenderDebounce = null;
      }
      this.render(false);
      window.setTimeout(() => { this._messengerActionRefreshQueued = false; }, 150);
    }

    async _wireMessengerSurfaceEvents(root) {
      const messengerRoot = root.querySelector('[data-shell-region="surface-messenger"]');
      if (!messengerRoot) return;

      const actor = this.actor || this.document;
      const { HolonetMessengerService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');

      try {
        await HolonetComposerAssist.attach(messengerRoot);
      } catch (err) {
        SWSELogger.warn('[ShellHost] Messenger composer assist failed to attach; core controls remain available.', err);
      }
      this._wireHolonetAttachmentDrops(messengerRoot);

      const conversation = messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]');
      const unreadThreadId = conversation?.querySelector('.swse-msg-row--unread') ? conversation.dataset.threadId : null;

      messengerRoot.querySelectorAll('[data-holonet-action="open-compose"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.setSurface('messenger', { compose: true, source: 'messenger' });
          await this._refreshMessengerSurface({ compose: true });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-action="quick-thread"][data-recipient-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const recipientId = el.dataset.recipientId;
          if (!recipientId) return;
          const result = await HolonetMessengerService.quickStartThread({ actor, recipientId });
          this._noteMessengerPendingResult(result);
          await this._refreshMessengerSurface({ threadId: result?.threadId ?? this._shellSurfaceOptions?.threadId ?? null, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('.swse-messenger-thread[data-thread-id]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const threadId = ev.currentTarget.dataset.threadId;
          if (!threadId) return;
          await this.setSurface('messenger', { threadId, source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-action="open-credit-composer"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const threadId = el.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
          if (!threadId) return;
          await this.setSurface('messenger', { threadId, compose: false, compositionType: 'credits', compositionMode: el.dataset.compositionMode || 'send', source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false, compositionType: 'credits', compositionMode: el.dataset.compositionMode || 'send' });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-action="open-item-composer"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const threadId = el.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
          if (!threadId) return;
          await this.setSurface('messenger', { threadId, compose: false, compositionType: 'items', source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false, compositionType: 'items' });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-action="open-asset-composer"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const threadId = el.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
          if (!threadId) return;
          await this.setSurface('messenger', { threadId, compose: false, compositionType: 'assets', source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false, compositionType: 'assets' });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-action="close-composer"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const threadId = this._shellSurfaceOptions?.threadId || messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]')?.dataset?.threadId || null;
          await this.setSurface('messenger', { threadId, compose: false, source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-item-filter]').forEach(input => {
        input.addEventListener('input', () => {
          const query = String(input.value || '').trim().toLowerCase();
          messengerRoot.querySelectorAll('.hl-item-row[data-item-name]').forEach(row => {
            const haystack = String(row.dataset.itemName || '').toLowerCase();
            row.hidden = Boolean(query && !haystack.includes(query));
          });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-asset-filter]').forEach(input => {
        input.addEventListener('input', () => {
          const query = String(input.value || '').trim().toLowerCase();
          messengerRoot.querySelectorAll('.hl-item-row[data-asset-name]').forEach(row => {
            const haystack = String(row.dataset.assetName || '').toLowerCase();
            row.hidden = Boolean(query && !haystack.includes(query));
          });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="submit-credit-composer"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
          const mode = form.dataset.compositionMode || 'send';
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          const amount = Number(data.get('amount') || 0);
          const splitMode = String(data.get('splitMode') || 'split-total');
          const memo = String(data.get('memo') || '').trim();
          if (!threadId || !recipientIds.length || !Number.isFinite(amount) || amount <= 0) return;
          const result = await HolonetMessengerService.composeCreditOperation({ actor, threadId, mode, recipientIds, amount, splitMode: mode === 'request' && splitMode === 'send-each' ? 'request-each' : splitMode, memo });
          this._noteMessengerPendingResult(result);
          await this.setSurface('messenger', { threadId, compose: false, source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="submit-item-composer"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          const itemIds = data.getAll('itemIds').map(String).filter(Boolean);
          const items = itemIds.map(itemId => ({ itemId, quantity: Number(data.get(`quantity.${itemId}`) || 1) || 1 }));
          const distributionMode = String(data.get('distributionMode') || 'single');
          const memo = String(data.get('memo') || '').trim();
          const tradeIntent = String(data.get('tradeIntent') || 'gift');
          const requestedCredits = Number(data.get('requestedCredits') || 0) || 0;
          const requestedItemsNote = String(data.get('requestedItemsNote') || '').trim();
          if (!threadId || !recipientIds.length || !items.length) return;
          const result = await HolonetMessengerService.offerItemTransfer({ actor, threadId, recipientIds, items, distributionMode, memo, tradeIntent, requestedCredits, requestedItemsNote });
          this._noteMessengerPendingResult(result);
          await this.setSurface('messenger', { threadId, compose: false, source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="submit-asset-composer"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
          const recipientId = String(data.get('recipientId') || '').trim();
          const assetIds = data.getAll('assetIds').map(String).filter(Boolean);
          const requestedCredits = Number(data.get('requestedCredits') || 0) || 0;
          const memo = String(data.get('memo') || '').trim();
          if (!threadId || !recipientId || !assetIds.length) return;
          const result = await HolonetMessengerService.offerAssetTransfer({ actor, threadId, recipientId, assetIds, requestedCredits, memo });
          this._noteMessengerPendingResult(result);
          await this.setSurface('messenger', { threadId, compose: false, source: 'messenger' });
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="send-message"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const body = String(data.get('body') || '').trim();
          const imageUrl = String(data.get('imageUrl') || '').trim();
          const attachments = this._collectHolonetAttachments(form);
          if (!body && !imageUrl && !attachments.length) return;
          const threadId = form.dataset.threadId || null;
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          const result = await HolonetMessengerService.sendMessage({ actor, body, imageUrl, threadId, recipientIds, attachments, senderRecipientId: String(data.get('senderRecipientId') || '').trim() || null });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId: result?.threadId ?? threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="create-thread"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const body = String(data.get('body') || '').trim();
          const imageUrl = String(data.get('imageUrl') || '').trim();
          const attachments = this._collectHolonetAttachments(form);
          const title = String(data.get('title') || '').trim();
          const threadType = String(data.get('threadType') || 'private');
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          const result = await HolonetMessengerService.createThread({ actor, body, title, threadType, recipientIds, imageUrl, attachments, senderRecipientId: String(data.get('senderRecipientId') || '').trim() || null });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId: result?.threadId ?? null, compose: Boolean(result?.pending && !result?.threadId), scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="create-job"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const title = String(data.get('title') || '').trim();
          const body = String(data.get('body') || '').trim();
          const contactRecipientId = String(data.get('contactRecipientId') || '').trim();
          const rewardCredits = Number(data.get('rewardCredits') || 0);
          const rewardItems = String(data.get('rewardItems') || '').trim();
          const rewardItemUuids = data.getAll('rewardItemUuids').map(String).filter(Boolean);
          const attachments = this._collectHolonetAttachments(form);
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          const result = await HolonetMessengerService.createJobPosting({ actor, title, body, contactRecipientId, recipientIds, rewardCredits, rewardItems, rewardItemUuids, attachments });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId: result?.threadId ?? null, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('[data-holonet-action="thread-action"]').forEach(el => {
        el.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const threadId = el.dataset.threadId;
          const action = el.dataset.threadAction;
          const recipientId = el.dataset.recipientId || null;
          const recordId = el.dataset.recordId || null;
          const amount = Number(el.dataset.amount || 0) || null;
          const status = el.dataset.status || null;
          if (!threadId || !action) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action, recipientId, recordId, amount, status });
          this._noteMessengerPendingResult(result);
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: ['accept-transfer', 'decline-transfer', 'approve-transfer', 'cancel-transfer', 'accept-item-transfer', 'decline-item-transfer', 'cancel-item-transfer', 'accept-asset-transfer', 'decline-asset-transfer', 'cancel-asset-transfer', 'approve-asset-transfer', 'offer-asset-counter', 'accept-asset-counter', 'approve-asset-counter', 'decline-asset-counter'].includes(action) });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="manage-members"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const action = String(data.get('memberAction') || 'invite-members');
          const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
          const threadId = form.dataset.threadId;
          if (!threadId || !recipientIds.length) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action, recipientIds });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId, compose: false });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="transfer-credits"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const recipientId = String(data.get('recipientId') || '');
          const amount = Number(data.get('amount') || 0);
          const partyFundCutPercent = Number(data.get('partyFundCutPercent') || 0);
          if (!threadId || !recipientId || !Number.isFinite(amount) || amount <= 0) return;
          const action = ev.submitter?.name === 'transferMode' && ev.submitter?.value ? ev.submitter.value : 'offer-credit-transfer';
          let result = null;
          if (action === 'job-payout') {
            result = await HolonetMessengerService.threadAction({ actor, threadId, action, recipientId, amount, partyFundCutPercent });
          } else {
            result = await HolonetMessengerService.offerCreditTransfer({ actor, threadId, recipientId, amount });
          }
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="party-fund"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const amount = Number(data.get('amount') || 0);
          const recipientId = String(data.get('recipientId') || '');
          const action = ev.submitter?.name === 'partyFundAction' && ev.submitter?.value ? ev.submitter.value : 'contribute-party-fund';
          if (!threadId || !Number.isFinite(amount) || amount <= 0) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action, amount, recipientId });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });


      messengerRoot.querySelectorAll('form[data-holonet-action="set-presence"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          await HolonetMessengerService.setPresence({
            actor,
            preset: String(data.get('preset') || 'available'),
            status: String(data.get('status') || '').trim(),
            visibility: String(data.get('visibility') || 'party')
          });
          await this._refreshMessengerSurface({ threadId: this._shellSurfaceOptions?.threadId ?? null });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="create-persona"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          await HolonetMessengerService.createCustomPersona({
            label: String(data.get('label') || '').trim(),
            avatar: String(data.get('avatar') || '').trim(),
            notes: String(data.get('notes') || '').trim()
          });
          form.reset();
          await this._refreshMessengerSurface({ threadId: this._shellSurfaceOptions?.threadId ?? null, compose: false });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="item-transfer"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const recipientId = String(data.get('recipientId') || '');
          const itemUuids = data.getAll('attachmentUuids').map(String).filter(Boolean);
          const action = ev.submitter?.name === 'itemTransferMode' && ev.submitter?.value ? ev.submitter.value : 'offer-item-transfer';
          if (!threadId || !recipientId || !itemUuids.length) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action, recipientId, itemUuids });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });


      messengerRoot.querySelectorAll('form[data-holonet-action="item-counter-offer"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const recordId = form.dataset.recordId;
          const counterCredits = Number(data.get('counterCredits') || 0) || 0;
          const counterItemIds = data.getAll('counterItemIds').map(String).filter(Boolean);
          const counterMemo = String(data.get('counterMemo') || '').trim();
          if (!threadId || !recordId || (!counterCredits && !counterItemIds.length && !counterMemo)) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action: 'offer-item-counter', recordId, counterCredits, counterItemIds, counterMemo });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });


      messengerRoot.querySelectorAll('form[data-holonet-action="asset-counter-offer"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const recordId = form.dataset.recordId;
          const counterCredits = Number(data.get('counterCredits') || 0) || 0;
          const counterItemIds = data.getAll('counterItemIds').map(String).filter(Boolean);
          const counterAssetIds = data.getAll('counterAssetIds').map(String).filter(Boolean);
          const counterMemo = String(data.get('counterMemo') || '').trim();
          if (!threadId || !recordId || (!counterCredits && !counterItemIds.length && !counterAssetIds.length && !counterMemo)) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action: 'offer-asset-counter', recordId, counterCredits, counterItemIds, counterAssetIds, counterMemo });
          this._noteMessengerPendingResult(result);
          form.reset();
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="job-status"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const status = String(data.get('status') || '').trim();
          if (!threadId || !status) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action: 'set-job-status', status });
          this._noteMessengerPendingResult(result);
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('form[data-holonet-action="award-job-items"]').forEach(form => {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const data = new FormData(form);
          const threadId = form.dataset.threadId;
          const recipientId = String(data.get('recipientId') || '');
          const itemUuids = data.getAll('itemUuids').map(String).filter(Boolean);
          if (!threadId || !recipientId) return;
          const result = await HolonetMessengerService.threadAction({ actor, threadId, action: 'award-job-items', recipientId, itemUuids });
          this._noteMessengerPendingResult(result);
          await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: true });
        });
      });

      messengerRoot.querySelectorAll('.hl-mode-card input[name="threadType"]').forEach(input => {
        input.addEventListener('change', () => this._syncMessengerThreadTypeCards(messengerRoot));
      });
      this._syncMessengerThreadTypeCards(messengerRoot);
      this._restoreMessengerUiState(root);

      if (unreadThreadId) {
        this._queueMessengerThreadRead(unreadThreadId, HolonetMessengerService);
      }
    }

    _syncMessengerThreadTypeCards(messengerRoot) {
      messengerRoot?.querySelectorAll?.('.hl-mode-card')?.forEach(card => {
        const input = card.querySelector('input[name="threadType"]');
        card.classList.toggle('is-selected', Boolean(input?.checked));
      });
    }

    _queueMessengerThreadRead(threadId, HolonetMessengerService) {
      if (!threadId || this._holonetReadSyncInFlight.has(threadId)) return;
      this._holonetReadSyncInFlight.add(threadId);
      window.setTimeout(async () => {
        try {
          await HolonetMessengerService.markThreadRead(threadId);
          if (game.user?.isGM && this.rendered && this._shellSurface === 'messenger') {
            const selectedThreadId = this._shellSurfaceOptions?.threadId || threadId;
            if (selectedThreadId === threadId) await this._refreshMessengerSurface({ threadId });
          }
        } catch (err) {
          SWSELogger.warn('[ShellHost] Failed to mark Messenger thread read:', err);
        } finally {
          this._holonetReadSyncInFlight.delete(threadId);
        }
      }, 0);
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
