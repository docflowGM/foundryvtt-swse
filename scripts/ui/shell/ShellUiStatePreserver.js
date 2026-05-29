/**
 * ShellUiStatePreserver
 *
 * Shared, host-level UI preservation for holopad surfaces.
 *
 * Surface controllers should keep durable state in ShellSurfaceState. This class
 * covers the remaining browser state that is easy to lose during repaint:
 * focus, selection ranges, scroll offsets, and unsaved form control values.
 *
 * It is intentionally defensive and dependency-free so it can be used by the
 * actor holopad, GM datapad, and legacy shell hosts.
 */
const HOST_PRESERVERS = new WeakMap();

const CONTROL_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const ACTION_SELECTOR = '[data-action], [data-shell-action], [data-gm-action], [data-store-action], [data-allies-action], [data-workbench-action], [data-game-action]';
const SCROLL_SELECTOR = [
  '[data-state-key]',
  '[data-preserve-scroll]',
  '[data-shell-scroll]',
  '[data-thread-scroll]',
  '.swse-screen',
  '.swse-surface-body',
  '.swse-shell-surface',
  '.swse-scroll',
  '.holonet-thread-messages',
  '.messenger-thread-messages',
  '.store-product-grid',
  '.allies-panel-body',
  '.workbench-body',
  '.gm-datapad-content'
].join(',');

const DIRTY_ACTION_RE = /(?:save|submit|apply|commit|confirm|cancel|reset|close|discard|clear)/i;
const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'number', 'password', 'tel', 'url', 'date', 'datetime-local', 'month', 'time', 'week']);

function hostSurface(host) {
  return host?.shellSurface ?? host?._shellSurface ?? host?.currentPage ?? 'home';
}

function asElement(elementOrJquery) {
  if (!elementOrJquery) return null;
  if (elementOrJquery instanceof HTMLElement) return elementOrJquery;
  if (elementOrJquery?.[0] instanceof HTMLElement) return elementOrJquery[0];
  if (elementOrJquery?.element instanceof HTMLElement) return elementOrJquery.element;
  if (elementOrJquery?.element?.[0] instanceof HTMLElement) return elementOrJquery.element[0];
  return null;
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function attrSelector(name, value) {
  return `[${name}="${cssEscape(value)}"]`;
}

function elementKey(el, root) {
  if (!(el instanceof Element)) return null;
  const explicit = el.getAttribute('data-state-key')
    || el.getAttribute('data-shell-state-key')
    || el.getAttribute('data-preserve-key')
    || el.getAttribute('data-field-key');
  if (explicit) return { type: 'attr', selector: `[data-state-key="${cssEscape(explicit)}"], [data-shell-state-key="${cssEscape(explicit)}"], [data-preserve-key="${cssEscape(explicit)}"], [data-field-key="${cssEscape(explicit)}"]`, key: explicit };

  const name = el.getAttribute('name');
  if (name) return { type: 'name', selector: `${el.tagName.toLowerCase()}${attrSelector('name', name)}`, key: `${el.tagName.toLowerCase()}:name:${name}` };

  const id = el.getAttribute('id');
  if (id) return { type: 'id', selector: `#${cssEscape(id)}`, key: `id:${id}` };

  const actionEl = el.closest?.(ACTION_SELECTOR);
  if (actionEl) {
    const action = actionEl.getAttribute('data-action')
      || actionEl.getAttribute('data-shell-action')
      || actionEl.getAttribute('data-gm-action')
      || actionEl.getAttribute('data-store-action')
      || actionEl.getAttribute('data-allies-action')
      || actionEl.getAttribute('data-workbench-action')
      || actionEl.getAttribute('data-game-action');
    const value = actionEl.getAttribute('value') || actionEl.getAttribute('data-id') || actionEl.getAttribute('data-key') || '';
    if (action) {
      const selector = [
        attrSelector('data-action', action),
        attrSelector('data-shell-action', action),
        attrSelector('data-gm-action', action),
        attrSelector('data-store-action', action),
        attrSelector('data-allies-action', action),
        attrSelector('data-workbench-action', action),
        attrSelector('data-game-action', action)
      ].join(',');
      return { type: 'action', selector, key: `action:${action}:${value}` };
    }
  }

  if (!(root instanceof Element) || !root.contains(el)) return null;
  const parts = [];
  let node = el;
  while (node && node !== root && node instanceof Element && parts.length < 6) {
    const tag = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter(child => child.tagName === node.tagName);
    const index = Math.max(1, siblings.indexOf(node) + 1);
    parts.unshift(`${tag}:nth-of-type(${index})`);
    node = parent;
  }
  if (!parts.length) return null;
  const selector = parts.join(' > ');
  return { type: 'path', selector, key: `path:${selector}` };
}

function readControlValue(el) {
  if (!(el instanceof HTMLElement)) return null;
  if (el.matches?.('[contenteditable="true"]')) return { kind: 'html', value: el.innerHTML };
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') return { kind: 'checked', value: el.checked };
    return { kind: 'value', value: el.value };
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return { kind: 'value', value: el.value };
  return null;
}

function writeControlValue(el, entry) {
  if (!(el instanceof HTMLElement) || !entry) return;
  if (entry.kind === 'html' && el.matches?.('[contenteditable="true"]')) {
    if (el.innerHTML !== entry.value) el.innerHTML = entry.value;
    return;
  }
  if (entry.kind === 'checked' && el instanceof HTMLInputElement) {
    el.checked = Boolean(entry.value);
    return;
  }
  if (entry.kind === 'value' && 'value' in el && el.value !== entry.value) {
    el.value = entry.value ?? '';
  }
}

function shouldTrackControl(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.matches?.('[data-no-preserve], [data-ephemeral]')) return false;
  if (el instanceof HTMLInputElement) {
    if (el.type === 'hidden' || el.type === 'file') return false;
    return TEXT_INPUT_TYPES.has(el.type) || el.type === 'checkbox' || el.type === 'radio' || el.type === 'range' || el.type === 'color';
  }
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.matches?.('[contenteditable="true"]');
}

function isLikelyScrollable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.scrollTop > 0 || el.scrollLeft > 0) return true;
  return (el.scrollHeight - el.clientHeight) > 2 || (el.scrollWidth - el.clientWidth) > 2;
}

export class ShellUiStatePreserver {
  static install(host, options = {}) {
    if (!host) return null;
    const existing = HOST_PRESERVERS.get(host);
    if (existing) return existing;
    const preserver = new ShellUiStatePreserver(host, options);
    HOST_PRESERVERS.set(host, preserver);
    host._shellUiStatePreserver = preserver;
    return preserver;
  }

  static forHost(host) {
    return host ? HOST_PRESERVERS.get(host) ?? null : null;
  }

  constructor(host, { logger = null } = {}) {
    this.host = host;
    this.logger = logger;
    this.snapshot = null;
    this.dirtyBySurface = new Map();
    this.controlValuesBySurface = new Map();
    this.bindAbort = null;
  }

  get currentSurface() {
    return hostSurface(this.host);
  }

  capture(rootLike = this.host?.element, { surfaceId = this.currentSurface, reason = 'capture' } = {}) {
    const root = asElement(rootLike);
    if (!root) return null;
    const active = root.ownerDocument?.activeElement;
    const activeKey = root.contains(active) ? elementKey(active, root) : null;
    const activeValue = activeKey && shouldTrackControl(active) ? readControlValue(active) : null;
    const selection = active && typeof active.selectionStart === 'number'
      ? { start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection }
      : null;

    const scroll = [];
    for (const el of root.querySelectorAll(SCROLL_SELECTOR)) {
      if (!isLikelyScrollable(el)) continue;
      const key = elementKey(el, root);
      if (!key) continue;
      scroll.push({ key, top: el.scrollTop, left: el.scrollLeft });
    }

    const controls = new Map(this.controlValuesBySurface.get(surfaceId) ?? []);
    if (activeKey && activeValue) controls.set(activeKey.key, { key: activeKey, value: activeValue });

    this.snapshot = { surfaceId, reason, activeKey, activeValue, selection, scroll, controls, capturedAt: Date.now() };
    return this.snapshot;
  }

  restore(rootLike = this.host?.element, { surfaceId = this.currentSurface } = {}) {
    const root = asElement(rootLike);
    if (!root) return false;
    const snapshot = this.snapshot;
    const dirtyControls = this.controlValuesBySurface.get(surfaceId) ?? new Map();
    const controls = new Map([...(snapshot?.controls ?? new Map()), ...dirtyControls]);

    for (const { key, value } of controls.values()) {
      const el = this.find(root, key);
      if (el && shouldTrackControl(el)) writeControlValue(el, value);
    }

    for (const entry of snapshot?.scroll ?? []) {
      const el = this.find(root, entry.key);
      if (!el) continue;
      try {
        el.scrollTop = entry.top ?? 0;
        el.scrollLeft = entry.left ?? 0;
      } catch (_err) {
        // Some elements are not scroll assignable in all browsers.
      }
    }

    const focusKey = snapshot?.activeKey;
    const focusEl = focusKey ? this.find(root, focusKey) : null;
    if (focusEl instanceof HTMLElement && !focusEl.matches?.('[disabled], [aria-disabled="true"]')) {
      try {
        focusEl.focus({ preventScroll: true });
        if (snapshot?.selection && typeof focusEl.setSelectionRange === 'function') {
          const length = String(focusEl.value ?? '').length;
          const start = Math.min(snapshot.selection.start ?? length, length);
          const end = Math.min(snapshot.selection.end ?? start, length);
          focusEl.setSelectionRange(start, end, snapshot.selection.direction ?? 'none');
        }
      } catch (_err) {
        // Focus restoration is best-effort.
      }
    }

    this.bindDirtyTracking(root, { surfaceId });
    return true;
  }

  find(root, key) {
    if (!(root instanceof Element) || !key?.selector) return null;
    try {
      return root.querySelector(key.selector);
    } catch (_err) {
      return null;
    }
  }

  bindDirtyTracking(rootLike = this.host?.element, { surfaceId = this.currentSurface } = {}) {
    const root = asElement(rootLike);
    if (!root) return;
    this.bindAbort?.abort?.();
    this.bindAbort = new AbortController();
    const { signal } = this.bindAbort;

    const mark = (ev) => {
      const target = ev.target instanceof Element ? ev.target.closest(CONTROL_SELECTOR) : null;
      if (!target || !root.contains(target) || !shouldTrackControl(target)) return;
      const key = elementKey(target, root);
      const value = readControlValue(target);
      if (!key || !value) return;
      this.markDirty(surfaceId, key, value);
    };

    const maybeClear = (ev) => {
      const actionEl = ev.target instanceof Element ? ev.target.closest(ACTION_SELECTOR) : null;
      const form = ev.target instanceof Element ? ev.target.closest('form') : null;
      const action = actionEl?.getAttribute('data-action')
        || actionEl?.getAttribute('data-shell-action')
        || actionEl?.getAttribute('data-gm-action')
        || actionEl?.getAttribute('data-store-action')
        || actionEl?.getAttribute('data-allies-action')
        || actionEl?.getAttribute('data-workbench-action')
        || actionEl?.getAttribute('data-game-action')
        || form?.getAttribute('data-action')
        || '';
      if (DIRTY_ACTION_RE.test(action)) this.clearDirty(surfaceId);
    };

    root.addEventListener('input', mark, { signal, capture: true });
    root.addEventListener('change', mark, { signal, capture: true });
    root.addEventListener('keyup', mark, { signal, capture: true });
    root.addEventListener('submit', () => this.clearDirty(surfaceId), { signal, capture: true });
    root.addEventListener('reset', () => this.clearDirty(surfaceId), { signal, capture: true });
    root.addEventListener('click', maybeClear, { signal, capture: true });
  }

  markDirty(surfaceId = this.currentSurface, key, value) {
    if (!surfaceId || !key || !value) return;
    const dirty = this.dirtyBySurface.get(surfaceId) ?? new Set();
    dirty.add(key.key);
    this.dirtyBySurface.set(surfaceId, dirty);

    const values = this.controlValuesBySurface.get(surfaceId) ?? new Map();
    values.set(key.key, { key, value });
    this.controlValuesBySurface.set(surfaceId, values);
  }

  clearDirty(surfaceId = this.currentSurface) {
    if (!surfaceId) return;
    this.dirtyBySurface.delete(surfaceId);
    this.controlValuesBySurface.delete(surfaceId);
  }

  hasDirty(surfaceId = this.currentSurface) {
    return (this.dirtyBySurface.get(surfaceId)?.size ?? 0) > 0;
  }

  getDirtySummary(surfaceId = this.currentSurface) {
    const dirty = this.dirtyBySurface.get(surfaceId);
    return { surfaceId, count: dirty?.size ?? 0, keys: Array.from(dirty ?? []).slice(0, 12) };
  }
}
