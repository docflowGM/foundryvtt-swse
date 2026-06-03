/**
 * MessengerSurfaceController
 *
 * Owns Messenger/Holonet surface wiring and UI-state preservation.
 * Shell hosts delegate here so the shared shell host no longer contains
 * Messenger-specific controls, composers, attachment drag/drop, or read-sync
 * behavior.
 */
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HolonetComposerAssist } from '/systems/foundryvtt-swse/scripts/ui/holonet/HolonetComposerAssist.js';

export class MessengerSurfaceController {
  constructor(host, actor = null) {
    this.host = host;
    this.actor = actor;
  }

  setActor(actor) {
    this.actor = actor;
  }

  get element() { return this.host?.element ?? null; }
  get rendered() { return Boolean(this.host?.rendered); }
  get document() { return this.host?.document ?? null; }

  get _shellSurface() { return this.host?._shellSurface; }
  set _shellSurface(value) { if (this.host) this.host._shellSurface = value; }

  get _shellSurfaceOptions() { return this.host?._shellSurfaceOptions ?? {}; }
  get _holonetReadSyncInFlight() {
    if (!this.host) return new Set();
    this.host._holonetReadSyncInFlight ??= new Set();
    return this.host._holonetReadSyncInFlight;
  }

  get _holonetRenderDebounce() { return this.host?._holonetRenderDebounce ?? null; }
  set _holonetRenderDebounce(value) { if (this.host) this.host._holonetRenderDebounce = value; }

  get _pendingMessengerUiState() { return this.host?._pendingMessengerUiState ?? null; }
  set _pendingMessengerUiState(value) { if (this.host) this.host._pendingMessengerUiState = value; }

  get _messengerActionRefreshQueued() { return Boolean(this.host?._messengerActionRefreshQueued); }
  set _messengerActionRefreshQueued(value) { if (this.host) this.host._messengerActionRefreshQueued = Boolean(value); }

  get _messengerPendingRequestIds() {
    if (!this.host) return new Set();
    this.host._messengerPendingRequestIds ??= new Set();
    return this.host._messengerPendingRequestIds;
  }

  get _messengerThreadReadTimers() {
    if (!this.host) return new Map();
    this.host._messengerThreadReadTimers ??= new Map();
    return this.host._messengerThreadReadTimers;
  }

  get _messengerFilterDebounce() { return this.host?._messengerFilterDebounce ?? null; }
  set _messengerFilterDebounce(value) { if (this.host) this.host._messengerFilterDebounce = value; }

  patchSurfaceOptions(...args) { return this.host?.patchSurfaceOptions?.(...args); }
  patchSurfaceState(...args) { return this.host?.patchSurfaceState?.(...args); }
  getSurfaceState(...args) { return this.host?.getSurfaceState?.(...args); }
  requestSurfaceRender(...args) { return this.host?.requestSurfaceRender?.(...args); }
  setSurface(...args) { return this.host?.setSurface?.(...args); }

  async attach(root, signal = null) {
    this.actor = this.host?.actor || this.host?.document || this.actor;
    if (signal?.aborted) return;
    await this._wireMessengerSurfaceEvents(root, signal);
  }

  _cssEscape(value) {
    return globalThis.CSS?.escape ? globalThis.CSS.escape(String(value || '')) : String(value || '').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  _defaultMessageLimit() { return 75; }

  _nextMessageLimit(current = null) {
    const raw = Number(current ?? this._shellSurfaceOptions?.messageLimit ?? this._defaultMessageLimit());
    const base = Number.isFinite(raw) ? raw : this._defaultMessageLimit();
    return Math.min(500, Math.max(this._defaultMessageLimit(), Math.floor(base) + this._defaultMessageLimit()));
  }

  _shouldScrollAfterThreadAction(action = '') {
    return [
      'accept-transfer', 'decline-transfer', 'approve-transfer', 'cancel-transfer',
      'pay-credit-request', 'decline-credit-request', 'accept-item-transfer', 'approve-item-transfer',
      'decline-item-transfer', 'cancel-item-transfer', 'offer-item-counter', 'accept-item-counter',
      'decline-item-counter', 'accept-asset-transfer', 'decline-asset-transfer',
      'cancel-asset-transfer', 'approve-asset-transfer', 'offer-asset-counter',
      'accept-asset-counter', 'approve-asset-counter', 'decline-asset-counter',
      'accept-game-invite', 'decline-game-invite', 'cancel-game-invite',
      'set-job-status', 'set-job-objective-status', 'award-job-items',
      'archive-thread', 'unarchive-thread', 'pin-message', 'unpin-message'
    ].includes(String(action || ''));
  }

  destroy() {
    // Reserved for controller-owned AbortControllers/state as Messenger wiring
    // continues to migrate out of ShellHost.
  }

  scheduleHolonetSurfaceRender(syncData = {}) {
    return this._scheduleHolonetSurfaceRender(syncData);
  }

  async refreshSurface(options = {}) {
    return this._refreshMessengerSurface(options);
  }

  captureUiState(root = this.element, overrides = {}) {
    return this._captureMessengerUiState(root, overrides);
  }

  restoreUiState(root = this.element) {
    return this._restoreMessengerUiState(root);
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
    this._syncHolonetComposerAttachments(form);
  }

  _syncHolonetComposerAttachments(form) {
    if (!form || typeof this.patchSurfaceState !== 'function') return;
    const formKey = form.dataset?.holonetAction || form.getAttribute?.('data-holonet-action') || 'compose';
    const attachments = Array.from(form.querySelectorAll('[data-holonet-attachment-bin] input[type="hidden"]')).map(input => ({
      inputName: input.name || 'attachmentUuids',
      uuid: input.value || '',
      name: input.dataset?.name || '',
      type: input.dataset?.type || '',
      img: input.dataset?.img || '',
      documentName: input.dataset?.documentName || ''
    })).filter(entry => entry.uuid);
    const prior = this.getSurfaceState?.('messenger')?.composeAttachments || {};
    this.patchSurfaceState('messenger', {
      composeAttachments: {
        ...prior,
        [formKey]: attachments
      }
    }, { render: false });
  }

  _restoreHolonetComposerAttachments(messengerRoot) {
    const stored = this.getSurfaceState?.('messenger')?.composeAttachments || {};
    if (!messengerRoot || !stored || typeof stored !== 'object') return;
    messengerRoot.querySelectorAll('form[data-holonet-action]').forEach(form => {
      const formKey = form.dataset?.holonetAction || 'compose';
      const attachments = Array.isArray(stored[formKey]) ? stored[formKey] : [];
      for (const attachment of attachments) {
        this._appendHolonetAttachment(form, attachment, { inputName: attachment.inputName || 'attachmentUuids' });
      }
    });
  }

  _clearHolonetComposerAttachments(form) {
    if (!form) return;
    form.querySelectorAll('[data-holonet-attachment-bin]').forEach(bin => bin.remove());
    this._syncHolonetComposerAttachments(form);
  }


  _messengerDraftFormKey(form, index = null) {
    if (!(form instanceof HTMLFormElement)) return null;
    const action = form.dataset?.holonetAction || form.getAttribute?.('data-holonet-action') || 'form';
    const threadId = form.dataset?.threadId || form.closest?.('[data-thread-id]')?.dataset?.threadId || this._shellSurfaceOptions?.threadId || 'new';
    const forms = Array.from(form.closest?.('[data-shell-region="surface-messenger"]')?.querySelectorAll?.('form[data-holonet-action]') ?? []);
    const formIndex = Number.isInteger(index) ? index : Math.max(0, forms.indexOf(form));
    return `${action}:${threadId}:${formIndex}`;
  }

  _isDraftField(field) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return false;
    if (!field.name) return false;
    const type = String(field.type || '').toLowerCase();
    return !['button', 'submit', 'reset', 'file', 'hidden'].includes(type);
  }

  _captureMessengerFormDrafts(messengerRoot) {
    if (!messengerRoot) return {};
    const drafts = {};
    const forms = Array.from(messengerRoot.querySelectorAll('form[data-holonet-action]'));
    forms.forEach((form, index) => {
      const key = this._messengerDraftFormKey(form, index);
      if (!key) return;
      const fields = Array.from(form.elements ?? []).filter(field => this._isDraftField(field));
      const entries = fields.map((field, fieldIndex) => {
        const type = String(field.type || field.tagName || '').toLowerCase();
        const base = { name: field.name, type, index: fieldIndex };
        if (field instanceof HTMLSelectElement && field.multiple) {
          return { ...base, selectedValues: Array.from(field.selectedOptions).map(option => option.value) };
        }
        if (type === 'checkbox' || type === 'radio') return { ...base, value: field.value, checked: Boolean(field.checked) };
        return { ...base, value: field.value ?? '' };
      });
      if (entries.length) drafts[key] = { action: form.dataset?.holonetAction || '', entries };
    });
    return drafts;
  }

  _restoreMessengerFormDrafts(messengerRoot, drafts = null) {
    const stored = drafts || this.getSurfaceState?.('messenger')?.composeDrafts || this.getSurfaceState?.('messenger')?.uiState?.composeDrafts || {};
    if (!messengerRoot || !stored || typeof stored !== 'object') return;
    const forms = Array.from(messengerRoot.querySelectorAll('form[data-holonet-action]'));
    forms.forEach((form, index) => {
      const key = this._messengerDraftFormKey(form, index);
      const draft = key ? stored[key] : null;
      if (!draft?.entries?.length) return;
      const fields = Array.from(form.elements ?? []).filter(field => this._isDraftField(field));
      draft.entries.forEach((entry) => {
        const sameName = fields.filter(field => field.name === entry.name);
        const field = sameName[entry.index] || fields[entry.index] || sameName[0];
        if (!field || field.disabled) return;
        const type = String(field.type || field.tagName || '').toLowerCase();
        if (field instanceof HTMLSelectElement && field.multiple && Array.isArray(entry.selectedValues)) {
          Array.from(field.options).forEach(option => { option.selected = entry.selectedValues.includes(option.value); });
          return;
        }
        if (type === 'checkbox' || type === 'radio') {
          if (entry.value == null || field.value === entry.value) field.checked = Boolean(entry.checked);
          return;
        }
        if (entry.value != null) field.value = entry.value;
      });
    });
    this._syncMessengerThreadTypeCards(messengerRoot);
  }

  _syncMessengerFormDraftState(messengerRoot) {
    if (!messengerRoot || typeof this.patchSurfaceState !== 'function') return;
    this.patchSurfaceState('messenger', {
      composeDrafts: this._captureMessengerFormDrafts(messengerRoot)
    }, { render: false });
  }

  _clearMessengerFormDraft(form = null) {
    if (typeof this.patchSurfaceState !== 'function') return;
    const current = this.getSurfaceState?.('messenger')?.composeDrafts || {};
    if (!form) {
      this.patchSurfaceState('messenger', { composeDrafts: {} }, { render: false });
      return;
    }
    const key = this._messengerDraftFormKey(form);
    if (!key || !current[key]) return;
    const next = { ...current };
    delete next[key];
    this.patchSurfaceState('messenger', { composeDrafts: next }, { render: false });
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
    if (!messengerRoot) {
      const fallbackState = { ...overrides };
      this._patchMessengerUiState(fallbackState);
      return fallbackState;
    }

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

    const state = {
      threadId: conversation?.dataset.threadId || this._shellSurfaceOptions?.threadId || null,
      threadSearch: messengerRoot.querySelector('input[name="threadSearch"]')?.value ?? this._shellSurfaceOptions?.threadSearch ?? '',
      includeArchived: Boolean(messengerRoot.querySelector('input[name="includeArchived"]')?.checked ?? this._shellSurfaceOptions?.includeArchived),
      messageLimit: Number(conversation?.dataset.messageLimit || this._shellSurfaceOptions?.messageLimit || 0) || null,
      highlightRecordId: conversation?.dataset.highlightRecordId || this._shellSurfaceOptions?.highlightRecordId || null,
      threadListScrollTop: messengerRoot.querySelector('.hl-tlist-scroll')?.scrollTop ?? 0,
      messageScrollTop,
      messageAtBottom,
      infoScrollTop: messengerRoot.querySelector('.hl-info-panel')?.scrollTop ?? 0,
      composeScrollTop: messengerRoot.querySelector('.hl-compose-scroll')?.scrollTop ?? 0,
      composeDrafts: this._captureMessengerFormDrafts(messengerRoot),
      activeState,
      ...overrides
    };
    this._patchMessengerUiState(state);
    return state;
  }

  _patchMessengerUiState(state = {}) {
    try {
      const threadId = state?.threadId || this._shellSurfaceOptions?.threadId || null;
      this.patchSurfaceState?.('messenger', {
        ...(threadId ? { threadId } : {}),
        uiState: state
      });
    } catch (_err) {
      // UI-state capture is best-effort; Messenger actions must never fail because restoration failed.
    }
  }

  _restoreMessengerUiState(root = this.element) {
    const state = this._pendingMessengerUiState || this.getSurfaceState?.('messenger')?.uiState;
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

      this._restoreMessengerFormDrafts(messengerRoot, state.composeDrafts);

      const conversation = messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]');
      if (conversation) {
        if (state.scrollToBottom || state.messageAtBottom) conversation.scrollTop = conversation.scrollHeight;
        else if (Number.isFinite(state.messageScrollTop)) conversation.scrollTop = state.messageScrollTop;
      }

      const highlightRecordId = state.highlightRecordId || this._shellSurfaceOptions?.highlightRecordId || null;
      if (highlightRecordId) {
        const highlighted = messengerRoot.querySelector(`[data-holonet-message-id="${this._cssEscape(highlightRecordId)}"]`);
        if (highlighted) {
          highlighted.classList.add('hl-message-anchor--highlight');
          const scrollTarget = highlighted.querySelector?.('article, .hl-credit-card, .hl-attach-card, .hl-receipt-card, .hl-sys-msg') || highlighted;
          scrollTarget.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        }
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
        this.patchSurfaceOptions({ threadId: syncData.threadId, compose: false, source: 'messenger' });
      } else if (syncData?.threadId && !this._shellSurfaceOptions?.threadId && currentState.threadId === syncData.threadId) {
        this.patchSurfaceOptions({ threadId: syncData.threadId, source: 'messenger' });
      }
      this._pendingMessengerUiState = currentState;
    }

    if (this._holonetRenderDebounce) window.clearTimeout(this._holonetRenderDebounce);
    this._holonetRenderDebounce = window.setTimeout(() => {
      this._holonetRenderDebounce = null;
      if (this.rendered) {
        void this.requestSurfaceRender({
          reason: isMessenger ? 'holonet-messenger-sync' : 'holonet-home-sync',
          surfaceId: this._shellSurface
        });
      }
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
    this.patchSurfaceOptions({
      source: options.source || 'messenger',
      ...(threadId ? { threadId } : {}),
      ...(options.compose != null ? { compose: options.compose } : {}),
      ...(options.compositionType ? { compositionType: options.compositionType } : {}),
      ...(options.compositionMode ? { compositionMode: options.compositionMode } : {}),
      ...(options.threadSearch != null ? { threadSearch: String(options.threadSearch || '') } : {}),
      ...(options.includeArchived != null ? { includeArchived: Boolean(options.includeArchived) } : {}),
      ...(options.highlightRecordId != null ? { highlightRecordId: String(options.highlightRecordId || '') } : {}),
      ...(options.messageLimit != null ? { messageLimit: Number(options.messageLimit) || this._defaultMessageLimit() } : {})
    });
    if (this._holonetRenderDebounce) {
      window.clearTimeout(this._holonetRenderDebounce);
      this._holonetRenderDebounce = null;
    }
    await this.requestSurfaceRender({ reason: 'messenger-action-refresh', surfaceId: 'messenger' });
    window.setTimeout(() => { this._messengerActionRefreshQueued = false; }, 150);
  }

  _wireMessengerScrollFallback(messengerRoot, signal = null) {
    if (!(messengerRoot instanceof HTMLElement)) return;
    const scrollSelectors = [
      '.hl-compose-scroll',
      '.hl-tlist-scroll',
      '.hl-messages',
      '.hl-info-panel',
      '.hl-job-grid',
      '.hl-jobboard-view'
    ];

    const findScrollTarget = (target) => {
      if (!(target instanceof Element)) return null;
      for (const selector of scrollSelectors) {
        const match = target.closest(selector);
        if (match instanceof HTMLElement) return match;
      }
      return null;
    };

    const canScroll = (el) => el instanceof HTMLElement && (el.scrollHeight - el.clientHeight) > 1;

    messengerRoot.addEventListener('wheel', (ev) => {
      const scrollTarget = findScrollTarget(ev.target);
      if (!canScroll(scrollTarget)) return;

      const before = scrollTarget.scrollTop;
      const max = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
      const next = Math.max(0, Math.min(max, before + ev.deltaY));
      if (next === before) {
        // Keep the canvas/hotbar from eating wheel events when the cursor is
        // inside a Messenger scroll region, even at the scroll boundary.
        ev.stopPropagation();
        return;
      }

      scrollTarget.scrollTop = next;
      ev.preventDefault();
      ev.stopPropagation();
    }, { capture: true, passive: false, signal });
  }

  _scheduleThreadFilterRefresh(form) {
    if (!form) return;
    const data = new FormData(form);
    const threadSearch = String(data.get('threadSearch') || '').trim();
    const includeArchived = data.get('includeArchived') === 'true' || data.get('includeArchived') === 'on';
    this.patchSurfaceOptions?.({ threadSearch, includeArchived, source: 'messenger' }, { render: false });
    if (this._messengerFilterDebounce) window.clearTimeout(this._messengerFilterDebounce);
    this._messengerFilterDebounce = window.setTimeout(() => {
      this._messengerFilterDebounce = null;
      void this._refreshMessengerSurface({ threadSearch, includeArchived, source: 'messenger' });
    }, 250);
  }

  async _wireMessengerSurfaceEvents(root, signal = null) {
    const messengerRoot = root?.querySelector?.('[data-shell-region="surface-messenger"]');
    if (!messengerRoot || signal?.aborted) return;

    const actor = this.actor || this.document;
    const { HolonetMessengerService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');
    if (signal?.aborted || !messengerRoot.isConnected) return;

    try {
      await HolonetComposerAssist.attach(messengerRoot);
    } catch (err) {
      SWSELogger.warn('[MessengerSurfaceController] Messenger composer assist failed to attach; core controls remain available.', err);
    }
    if (signal?.aborted || !messengerRoot.isConnected) return;
    this._wireHolonetAttachmentDrops(messengerRoot);
    this._restoreHolonetComposerAttachments(messengerRoot);
    this._restoreMessengerFormDrafts(messengerRoot);
    this._wireMessengerScrollFallback(messengerRoot, signal);

    const syncDrafts = () => this._syncMessengerFormDraftState(messengerRoot);
    messengerRoot.querySelectorAll('form[data-holonet-action]').forEach(form => {
      form.addEventListener('input', syncDrafts, { capture: true });
      form.addEventListener('change', syncDrafts, { capture: true });
    });

    messengerRoot.querySelectorAll('form[data-holonet-action="thread-filter"]').forEach(form => {
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (this._messengerFilterDebounce) {
          window.clearTimeout(this._messengerFilterDebounce);
          this._messengerFilterDebounce = null;
        }
        const data = new FormData(form);
        const threadSearch = String(data.get('threadSearch') || '').trim();
        const includeArchived = data.get('includeArchived') === 'true' || data.get('includeArchived') === 'on';
        this.patchSurfaceOptions?.({ threadSearch, includeArchived, source: 'messenger' }, { render: false });
        await this._refreshMessengerSurface({ threadSearch, includeArchived, source: 'messenger' });
      });
      form.querySelectorAll('input[name="threadSearch"]').forEach(input => {
        input.addEventListener('input', () => this._scheduleThreadFilterRefresh(form));
      });
      form.querySelectorAll('input[name="includeArchived"]').forEach(input => {
        input.addEventListener('change', () => this._scheduleThreadFilterRefresh(form));
      });
    });

    messengerRoot.querySelectorAll('[data-holonet-action="clear-thread-filter"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.patchSurfaceOptions?.({ threadSearch: '', includeArchived: false, source: 'messenger' }, { render: false });
        await this._refreshMessengerSurface({ threadSearch: '', includeArchived: false, source: 'messenger' });
      });
    });

    messengerRoot.querySelectorAll('[data-holonet-action="load-older-messages"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const threadId = el.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
        if (!threadId) return;
        const currentLimit = Number(el.dataset.messageLimit || this._shellSurfaceOptions?.messageLimit || this._defaultMessageLimit());
        const messageLimit = this._nextMessageLimit(currentLimit);
        this.patchSurfaceOptions?.({ threadId, messageLimit, source: 'messenger' }, { render: false });
        await this._refreshMessengerSurface({ threadId, messageLimit, source: 'messenger' });
      });
    });

    const conversation = messengerRoot.querySelector('.swse-messenger-conversation[data-thread-id]');
    const unreadThreadId = conversation?.querySelector('.swse-msg-row--unread') ? conversation.dataset.threadId : null;

    messengerRoot.querySelectorAll('[data-holonet-action="set-app-mode"][data-app-mode]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const appMode = String(el.dataset.appMode || 'chat').trim().toLowerCase() === 'jobs' ? 'jobs' : 'chat';
        await this.setSurface('messenger', { appMode, compose: false, source: 'messenger' });
        await this._refreshMessengerSurface({ appMode, compose: false, source: 'messenger' });
      });
    });

    messengerRoot.querySelectorAll('[data-holonet-action="open-compose"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('messenger', { appMode: 'chat', compose: true, source: 'messenger' });
        await this._refreshMessengerSurface({ appMode: 'chat', compose: true });
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
        await this.setSurface('messenger', { threadId, appMode: 'chat', source: 'messenger', messageLimit: this._defaultMessageLimit(), highlightRecordId: '' });
        await this._refreshMessengerSurface({ threadId, appMode: 'chat', compose: false, messageLimit: this._defaultMessageLimit(), highlightRecordId: '' });
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

    messengerRoot.querySelectorAll('[data-holonet-action="open-secret-note-composer"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const threadId = el.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
        if (!threadId || !game.user?.isGM) return;
        await this.setSurface('messenger', { threadId, compose: false, compositionType: 'secret-note', source: 'messenger' });
        await this._refreshMessengerSurface({ threadId, compose: false, compositionType: 'secret-note' });
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

    const normalizeComposerFilter = (value) => String(value || '')
      .normalize?.('NFKD')
      ?.replace(/[\u0300-\u036f]/g, '')
      ?.replace(/[\u2013\u2014]/g, '-')
      ?.toLowerCase()
      ?.replace(/[^a-z0-9]+/g, ' ')
      ?.trim()
      ?? String(value || '').toLowerCase().trim();

    const applyItemFilter = (input) => {
      const query = normalizeComposerFilter(input.value);
      let visibleRowsTotal = 0;
      const flatRows = Array.from(messengerRoot.querySelectorAll('.hl-inventory-item-row[data-item-search], .hl-item-row[data-item-search]:not([data-asset-name])'));
      if (flatRows.length) {
        flatRows.forEach(row => {
          const rowKey = normalizeComposerFilter(row.dataset.itemSearch || row.dataset.itemName || row.textContent || '');
          const match = !query || rowKey.includes(query);
          row.hidden = !match;
          if (match) visibleRowsTotal += 1;
        });
      } else {
        messengerRoot.querySelectorAll('.hl-item-category[data-item-category]').forEach(category => {
          let visibleRows = 0;
          const categoryKey = normalizeComposerFilter(category.dataset.itemCategorySearch || category.dataset.itemCategory || '');
          category.querySelectorAll('.hl-item-row[data-item-search], .hl-item-row[data-item-name]').forEach(row => {
            const rowKey = normalizeComposerFilter(row.dataset.itemSearch || row.dataset.itemName || row.textContent || '');
            const match = !query || rowKey.includes(query) || categoryKey.includes(query);
            row.hidden = !match;
            if (match) visibleRows += 1;
          });
          category.hidden = Boolean(query && visibleRows === 0);
          visibleRowsTotal += visibleRows;
        });
      }
      const empty = messengerRoot.querySelector('[data-holonet-item-filter-empty]');
      if (empty) empty.hidden = !(query && visibleRowsTotal === 0);
    };

    const updateSelectedInventoryPreview = (scope = messengerRoot) => {
      const output = scope.querySelector('[data-holonet-selected-items]');
      if (!output) return;
      const empty = scope.querySelector('[data-holonet-selected-items-empty]');
      const rows = Array.from(scope.querySelectorAll('.hl-inventory-item-row'));
      const selectedRows = rows.filter(row => row.querySelector('input[type="checkbox"]')?.checked);
      output.querySelectorAll('.hl-selected-cargo-chip').forEach(el => el.remove());
      selectedRows.forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        const qtyInput = row.querySelector('.hl-qty-control input');
        const qty = Math.max(1, Number(qtyInput?.value || 1) || 1);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'hl-selected-cargo-chip';
        chip.dataset.itemId = checkbox?.value || row.dataset.itemId || '';
        const name = document.createElement('span');
        name.textContent = row.dataset.itemName || row.querySelector('b')?.textContent || 'Item';
        const meta = document.createElement('small');
        meta.textContent = `${row.dataset.itemType || 'Item'} × ${qty}`;
        const removeIcon = document.createElement('i');
        removeIcon.className = 'fas fa-times';
        removeIcon.setAttribute('aria-hidden', 'true');
        chip.append(name, meta, removeIcon);
        chip.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (checkbox) checkbox.checked = false;
          updateSelectedInventoryPreview(scope);
        });
        output.appendChild(chip);
      });
      if (empty) empty.hidden = selectedRows.length > 0;
    };

    messengerRoot.querySelectorAll('[data-holonet-action="toggle-inventory-picker"]').forEach(button => {
      button.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const picker = messengerRoot.querySelector('[data-holonet-inventory-picker]');
        if (!picker) return;
        const shouldOpen = picker.hidden;
        picker.hidden = !shouldOpen;
        button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        button.textContent = shouldOpen ? 'Hide Inventory' : 'Open Inventory';
        if (shouldOpen) {
          const search = picker.querySelector('[data-holonet-item-filter]');
          search?.focus?.();
        }
      });
    });

    messengerRoot.querySelectorAll('.hl-inventory-item-row input[type="checkbox"], .hl-inventory-item-row .hl-qty-control input').forEach(input => {
      input.addEventListener('change', () => updateSelectedInventoryPreview(messengerRoot));
      input.addEventListener('input', () => updateSelectedInventoryPreview(messengerRoot));
    });
    updateSelectedInventoryPreview(messengerRoot);

    messengerRoot.querySelectorAll('[data-holonet-item-filter]').forEach(input => {
      input.addEventListener('input', () => applyItemFilter(input));
      input.addEventListener('search', () => applyItemFilter(input));
      applyItemFilter(input);
    });

    messengerRoot.querySelectorAll('[data-holonet-action="clear-item-filter"]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const input = messengerRoot.querySelector('[data-holonet-item-filter]');
        if (!input) return;
        input.value = '';
        applyItemFilter(input);
        input.focus();
      });
    });

    messengerRoot.querySelectorAll('[data-holonet-asset-filter]').forEach(input => {
      input.addEventListener('input', () => {
        const query = normalizeComposerFilter(input.value);
        messengerRoot.querySelectorAll('.hl-item-row[data-asset-name]').forEach(row => {
          const haystack = normalizeComposerFilter(row.dataset.assetName || row.textContent || '');
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

    messengerRoot.querySelectorAll('form[data-holonet-action="submit-secret-note-composer"]').forEach(form => {
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!game.user?.isGM) return;
        const data = new FormData(form);
        const threadId = form.dataset.threadId || this._shellSurfaceOptions?.threadId || null;
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const title = String(data.get('title') || '').trim();
        const body = String(data.get('body') || '').trim();
        const imageUrl = String(data.get('imageUrl') || '').trim();
        const expiresAfterSeconds = Number(data.get('expiresAfterSeconds') || 0) || 0;
        const source = String(data.get('source') || 'messenger').trim() || 'messenger';
        if (!threadId || (!body && !imageUrl)) return;
        const result = await HolonetMessengerService.issueSecretNote({ actor, threadId, recipientIds, title, body, imageUrl, expiresAfterSeconds, source });
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        await this._refreshMessengerSurface({ threadId, compose: false, scrollToBottom: this._shouldScrollAfterThreadAction(action) });
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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
        this._clearHolonetComposerAttachments(form);
        this._clearMessengerFormDraft(form);
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

    messengerRoot.querySelectorAll('form[data-holonet-action="job-objective-status"]').forEach(form => {
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const threadId = form.dataset.threadId;
        const objectiveId = String(data.get('objectiveId') || '').trim();
        const objectiveStatus = String(data.get('objectiveStatus') || '').trim();
        const objectiveNote = String(data.get('objectiveNote') || '').trim();
        if (!threadId || !objectiveId || !objectiveStatus) return;
        const result = await HolonetMessengerService.threadAction({ actor, threadId, action: 'set-job-objective-status', objectiveId, objectiveStatus, objectiveNote });
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


    messengerRoot.querySelectorAll('[data-holonet-action="reveal-secret-note"][data-record-id]').forEach(button => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const recordId = button.dataset.recordId;
        const result = await HolonetMessengerService.openSecretNote({ actor, recordId });
        this._noteMessengerPendingResult(result);
        await this._refreshMessengerSurface({ threadId: this._shellSurfaceOptions?.threadId ?? null, compose: false });
      });
    });

    messengerRoot.querySelectorAll('[data-holonet-action="destroy-secret-note"][data-record-id]').forEach(button => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const recordId = button.dataset.recordId;
        const result = await HolonetMessengerService.destroySecretNote({ actor, recordId, reason: button.dataset.reason || 'destroyed' });
        this._noteMessengerPendingResult(result);
        await this._refreshMessengerSurface({ threadId: this._shellSurfaceOptions?.threadId ?? null, compose: false });
      });
    });

    messengerRoot.querySelectorAll('.hl-mode-card input[name="threadType"]').forEach(input => {
      input.addEventListener('change', () => this._syncMessengerThreadTypeCards(messengerRoot));
    });
    this._syncMessengerThreadTypeCards(messengerRoot);
    this._wireSecretNoteSelfDestructTimers(messengerRoot, actor);
    this._restoreMessengerUiState(root);

    if (unreadThreadId) {
      this._queueMessengerThreadRead(unreadThreadId, HolonetMessengerService);
    }
  }


  _wireSecretNoteSelfDestructTimers(messengerRoot, actor = this.actor) {
    messengerRoot?.querySelectorAll?.('[data-secret-note-expire-ms][data-record-id]').forEach(el => {
      const recordId = el.dataset.recordId;
      const expiresAtMs = Number(el.dataset.secretNoteExpireMs || 0);
      if (!recordId || !Number.isFinite(expiresAtMs) || expiresAtMs <= 0) return;
      const delay = Math.max(0, expiresAtMs - Date.now()) + 250;
      window.setTimeout(async () => {
        const stillVisible = this.rendered && this._shellSurface === 'messenger' && this.element?.querySelector?.(`[data-record-id="${this._cssEscape(recordId)}"]`);
        if (!stillVisible) return;
        try {
          await HolonetMessengerService.destroySecretNote({ actor, recordId, reason: 'self-destruct' });
          await this._refreshMessengerSurface({ threadId: this._shellSurfaceOptions?.threadId ?? null, compose: false });
        } catch (err) {
          SWSELogger.warn('[MessengerSurfaceController] Secret note self-destruct failed:', err);
        }
      }, Math.min(delay, 2147483000));
    });
  }

  _syncMessengerThreadTypeCards(messengerRoot) {
    messengerRoot?.querySelectorAll?.('.hl-mode-card')?.forEach(card => {
      const input = card.querySelector('input[name="threadType"]');
      card.classList.toggle('is-selected', Boolean(input?.checked));
    });
  }

  _queueMessengerThreadRead(threadId, HolonetMessengerService) {
    if (!threadId || this._holonetReadSyncInFlight.has(threadId)) return;
    const existingTimer = this._messengerThreadReadTimers.get(threadId);
    if (existingTimer) window.clearTimeout(existingTimer);
    const timer = window.setTimeout(async () => {
      this._messengerThreadReadTimers.delete(threadId);
      const selectedThreadId = this._shellSurfaceOptions?.threadId || threadId;
      const conversation = this.element?.querySelector?.('.swse-messenger-conversation[data-thread-id]');
      const stillVisible = this.rendered && this._shellSurface === 'messenger' && selectedThreadId === threadId && conversation?.dataset?.threadId === threadId;
      if (!stillVisible) return;
      this._holonetReadSyncInFlight.add(threadId);
      try {
        await HolonetMessengerService.markThreadRead(threadId);
        if (game.user?.isGM && this.rendered && this._shellSurface === 'messenger') {
          const currentThreadId = this._shellSurfaceOptions?.threadId || threadId;
          if (currentThreadId === threadId) await this._refreshMessengerSurface({ threadId });
        }
      } catch (err) {
        SWSELogger.warn('[MessengerSurfaceController] Failed to mark Messenger thread read:', err);
      } finally {
        this._holonetReadSyncInFlight.delete(threadId);
      }
    }, 1200);
    this._messengerThreadReadTimers.set(threadId, timer);
  }

}
