/**
 * Persistent "flight recorder" for item editor and sheet hydration failures.
 *
 * Console output can disappear when Foundry/Chromium collapses, so this stores
 * the last relevant events in localStorage. It is intentionally defensive:
 * tracing must never be capable of breaking gameplay.
 */

const STORAGE_KEY = 'foundryvtt-swse.itemEditorTrace.v1';
const MAX_EVENTS = 200;
const MAX_STRING_LENGTH = 1200;
const MAX_DEPTH = 6;

function nowIso() {
  try { return new Date().toISOString(); } catch (_err) { return String(Date.now()); }
}

function clipString(value) {
  const text = String(value ?? '');
  return text.length > MAX_STRING_LENGTH ? `${text.slice(0, MAX_STRING_LENGTH)}…[truncated]` : text;
}

function safeClone(value, depth = 0, seen = new WeakSet()) {
  if (depth > MAX_DEPTH) return '[max-depth]';
  if (value == null) return value;

  const type = typeof value;
  if (type === 'string') return clipString(value);
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return String(value);
  if (type === 'function') return `[function ${value.name || 'anonymous'}]`;
  if (type === 'symbol') return String(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: clipString(value.message),
      stack: clipString(value.stack || '')
    };
  }

  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
    return {
      tagName: value.tagName,
      id: value.id || '',
      className: String(value.className || '')
    };
  }

  if (value?.documentName || value?.constructor?.documentName) {
    return {
      documentName: value.documentName || value.constructor?.documentName,
      id: value.id ?? value._id ?? null,
      uuid: value.uuid ?? null,
      name: value.name ?? '',
      type: value.type ?? null
    };
  }

  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 80).map(entry => safeClone(entry, depth + 1, seen));
  }

  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).slice(0, 80).map(([key, entry]) => [String(key), safeClone(entry, depth + 1, seen)]));
  }

  if (value instanceof Set) {
    return Array.from(value.values()).slice(0, 80).map(entry => safeClone(entry, depth + 1, seen));
  }

  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'app' || key === 'sheet' || key === 'element') continue;
    out[key] = safeClone(entry, depth + 1, seen);
  }
  return out;
}

function readEvents() {
  try {
    const raw = globalThis.localStorage?.getItem?.(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function writeEvents(events) {
  try {
    globalThis.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch (_err) {
    // localStorage can be full/blocked; never break the app for tracing.
  }
}

export function addItemEditorTrace(phase, payload = {}) {
  try {
    const event = {
      time: nowIso(),
      phase: String(phase || 'unknown'),
      payload: safeClone(payload)
    };
    const events = readEvents();
    events.push(event);
    writeEvents(events);
    return event;
  } catch (_err) {
    return null;
  }
}

export function getItemEditorTrace() {
  return readEvents();
}

export function clearItemEditorTrace() {
  writeEvents([]);
  return [];
}

export function copyItemEditorTrace() {
  const text = JSON.stringify(readEvents(), null, 2);
  try {
    globalThis.navigator?.clipboard?.writeText?.(text);
  } catch (_err) {
    // clipboard may be unavailable; still return text.
  }
  return text;
}

export function summarizeItem(item) {
  const system = item?.system ?? {};
  return {
    id: item?.id ?? item?._id ?? null,
    uuid: item?.uuid ?? null,
    name: item?.name ?? '',
    type: item?.type ?? null,
    img: item?.img ?? '',
    systemKeys: Object.keys(system ?? {}).sort(),
    numericProbe: {
      cost: system?.cost,
      value: system?.value,
      weight: system?.weight,
      equipped: system?.equipped,
      reflexBonus: system?.reflexBonus,
      fortitudeBonus: system?.fortitudeBonus,
      fortBonus: system?.fortBonus,
      attackBonus: system?.attackBonus
    }
  };
}

export function summarizeActorItems(actor) {
  const items = Array.from(actor?.items ?? []);
  const byType = {};
  for (const item of items) byType[item.type] = (byType[item.type] || 0) + 1;
  return {
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    total: items.length,
    byType
  };
}

export function installItemEditorTrace() {
  const root = globalThis;
  if (root.__swseItemEditorTraceInstalled) return;
  root.__swseItemEditorTraceInstalled = true;

  root.addEventListener?.('error', (event) => {
    addItemEditorTrace('window-error', {
      message: event?.message,
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
      error: event?.error
    });
  });

  root.addEventListener?.('unhandledrejection', (event) => {
    addItemEditorTrace('window-unhandledrejection', {
      reason: event?.reason
    });
  });

  root.SWSE ??= {};
  root.SWSE.debug ??= {};
  root.SWSE.debug.itemEditor = {
    dumpTrace: getItemEditorTrace,
    copyTrace: copyItemEditorTrace,
    clearTrace: clearItemEditorTrace,
    record: addItemEditorTrace
  };

  addItemEditorTrace('trace-installed', {
    helper: 'SWSE.debug.itemEditor.dumpTrace() / copyTrace() / clearTrace()',
    storageKey: STORAGE_KEY,
    maxEvents: MAX_EVENTS
  });
}
