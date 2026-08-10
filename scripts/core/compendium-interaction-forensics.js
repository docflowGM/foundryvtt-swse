/**
 * Compendium Interaction Forensics
 *
 * Read-only, debug-gated instrument for diagnosing why native Foundry v13
 * CompendiumDirectory pack-card clicks fail to open packs while the SWSE
 * capture-phase fallback (compendium-directory-click-repair.js) can still
 * resolve and open the clicked pack.
 *
 * This module NEVER calls preventDefault/stopPropagation/stopImmediatePropagation,
 * never mutates DOM, and never mutates ApplicationV2 options. It only observes.
 *
 * The one intentional exception to "observe only" lives in
 * compendium-directory-click-repair.js: a single opt-in global flag
 * (SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY) lets that file skip its own
 * preventDefault/pack.render(true) for exactly one click, so the native
 * handler can be observed running (or not running) on its own. That toggle
 * is documented and driven from here via SWSE.debug.compendiumForensics.
 *
 * Enable with either:
 *   globalThis.SWSE_DEBUG_COMPENDIUMS = true
 * or the existing "debugMode" world setting.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";

// ---------------------------------------------------------------------------
// Debug gate — mirrors compendium-directory-click-repair.js's _isDebug().
// ---------------------------------------------------------------------------
function _isDebug() {
  if (globalThis.SWSE_DEBUG_COMPENDIUMS === true) return true;
  try { return game?.settings?.get?.("foundryvtt-swse", "debugMode") === true; } catch (_e) { return false; }
}

function _dlog(...args) {
  if (!_isDebug()) return;
  console.log("[SWSE-COMPENDIUM-FORENSICS]", ...args);
}

// ---------------------------------------------------------------------------
// Bounded ring buffers
// ---------------------------------------------------------------------------
const MAX_CLICK_TRACES = 20;
const MAX_MUTATIONS = 50;

const clickTraces = []; // completed traces, newest last
const activeTraces = new Map(); // traceId -> in-progress trace
const mutationLog = [];

let traceCounter = 0;
let installed = false;

// ---------------------------------------------------------------------------
// Stable, non-mutating node identity (WeakMap, not a DOM attribute)
// ---------------------------------------------------------------------------
const nodeIds = new WeakMap();
let nodeIdCounter = 0;

function nodeId(el) {
  if (!(el instanceof Element)) return null;
  if (!nodeIds.has(el)) nodeIds.set(el, `node#${++nodeIdCounter}`);
  return nodeIds.get(el);
}

function describeElement(el) {
  if (!(el instanceof Element)) return null;
  const tag = el.tagName?.toLowerCase() ?? '?';
  const id = el.id ? `#${el.id}` : '';
  const cls = el.classList?.length ? `.${Array.from(el.classList).join('.')}` : '';
  return {
    id: nodeId(el),
    selector: `${tag}${id}${cls}`.slice(0, 160),
    dataset: el.dataset ? { ...el.dataset } : {},
    inDocument: document.contains(el)
  };
}

// ---------------------------------------------------------------------------
// Read-only selectors (deliberately independent copies — this module must
// not import private helpers from compendium-directory-click-repair.js, so
// that it keeps working even if that file's internals change).
// ---------------------------------------------------------------------------
const ROOT_SELECTOR = [
  '#sidebar #compendium',
  '#sidebar .compendium-sidebar',
  '#compendium',
  '.compendium-sidebar'
].join(',');

const PACK_ROW_SELECTOR = [
  'li.directory-item',
  'li.compendium',
  '.compendium-pack',
  '.pack-card',
  '.pack-row',
  '[role="listitem"]',
  '[data-pack]',
  '[data-pack-id]',
  '[data-collection]',
  '[data-collection-id]',
  '[data-uuid]',
  '[data-entry-id]',
  '[data-document-id]'
].join(',');

function _findRoots() {
  const roots = new Set();
  const appEl = ui?.compendium?.element;
  if (appEl instanceof HTMLElement) roots.add(appEl);
  for (const el of document.querySelectorAll(ROOT_SELECTOR)) {
    if (el instanceof HTMLElement) roots.add(el);
  }
  return Array.from(roots);
}

// ---------------------------------------------------------------------------
// Phase 2 — click propagation forensics
// ---------------------------------------------------------------------------
function _traceIdFor(event) {
  if (event.__swseForensicsTrace) return event.__swseForensicsTrace;
  const id = `click-${++traceCounter}`;
  event.__swseForensicsTrace = id;
  return id;
}

function _summarizeElementsFromPoint(x, y) {
  if (typeof document.elementsFromPoint !== 'function') return [];
  try {
    return document.elementsFromPoint(x, y).slice(0, 8).map(el => {
      const cs = getComputedStyle(el);
      return {
        ...describeElement(el),
        pointerEvents: cs.pointerEvents,
        zIndex: cs.zIndex,
        position: cs.position
      };
    });
  } catch (_e) {
    return [];
  }
}

function _recordStage(stage, event) {
  if (!_isDebug()) return;

  const traceId = _traceIdFor(event);
  let trace = activeTraces.get(traceId);
  if (!trace) {
    trace = { traceId, startedAt: performance.now(), stages: {} };
    activeTraces.set(traceId, trace);

    // Schedule the "which stages fired" report once the event has fully
    // finished dispatching (capture + target + bubble all complete
    // synchronously before this microtask runs).
    queueMicrotask(() => _finalizeTrace(traceId));
  }

  const target = event.target instanceof Element ? event.target : null;
  const x = event.clientX;
  const y = event.clientY;

  const packRow = target?.closest?.(PACK_ROW_SELECTOR) ?? null;
  const actionEl = target?.closest?.('[data-action]') ?? null;

  trace.stages[stage] = {
    at: performance.now() - trace.startedAt,
    eventPhase: event.eventPhase,
    defaultPrevented: event.defaultPrevented,
    cancelBubble: event.cancelBubble,
    target: describeElement(target),
    currentTarget: describeElement(event.currentTarget instanceof Element ? event.currentTarget : null),
    packRow: describeElement(packRow),
    actionElement: actionEl ? { ...describeElement(actionEl), action: actionEl.getAttribute('data-action') } : null,
    coords: Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  };

  // Only compute composedPath / elementsFromPoint once per trace — they are
  // expensive and identical at every stage (composedPath is fixed at
  // dispatch time regardless of propagation state).
  if (!trace.composedPath) {
    trace.composedPath = typeof event.composedPath === 'function'
      ? event.composedPath().filter(el => el instanceof Element).map(describeElement)
      : [];
  }
  if (!trace.hitTest && Number.isFinite(x) && Number.isFinite(y)) {
    trace.hitTest = {
      elementFromPoint: describeElement(document.elementFromPoint(x, y)),
      elementsFromPoint: _summarizeElementsFromPoint(x, y)
    };
  }

  _dlog(`stage=${stage}`, trace.stages[stage]);
}

const EXPECTED_STAGES = ['document-capture', 'sidebar-capture', 'compendium-root-capture', 'compendium-root-bubble', 'document-bubble'];

function _finalizeTrace(traceId) {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  activeTraces.delete(traceId);

  const observed = EXPECTED_STAGES.filter(s => trace.stages[s]);
  const missing = EXPECTED_STAGES.filter(s => !trace.stages[s]);
  const lastObserved = observed[observed.length - 1] ?? null;

  const finished = {
    traceId,
    timestamp: Date.now(),
    stages: trace.stages,
    observedOrder: observed,
    missingStages: missing,
    lastObservedStage: lastObserved,
    composedPath: trace.composedPath ?? [],
    hitTest: trace.hitTest ?? null
  };

  clickTraces.push(finished);
  if (clickTraces.length > MAX_CLICK_TRACES) clickTraces.shift();

  _dlog(`trace ${traceId} complete. observed=[${observed.join(', ')}] missing=[${missing.join(', ')}] lastObservedStage=${lastObserved}`);
}

function _installClickStages() {
  // Stage 1: document capture — outermost, fires before any node-specific
  // capture listener (including compendium-directory-click-repair.js's own
  // document-capture listener, PROVIDED this module is installed before
  // that one registers — see index.js call ordering).
  document.addEventListener('click', (event) => _recordStage('document-capture', event), { capture: true });

  // Stage 5: document bubble — innermost-to-outermost bubble finishes here,
  // last possible observation point for this click.
  document.addEventListener('click', (event) => _recordStage('document-bubble', event), { capture: false });

  // Stage 2/3/4 depend on #sidebar / #compendium existing. Install lazily
  // and re-install on every sidebar/compendium render, mirroring the
  // lifecycle compendium-directory-click-repair.js already uses for the
  // same problem (roots can be replaced across renders — see H6).
  const installedSidebar = new WeakSet();
  const installedRoots = new WeakSet();

  function installSidebarStage() {
    const sidebar = document.getElementById('sidebar');
    if (!(sidebar instanceof HTMLElement) || installedSidebar.has(sidebar)) return;
    installedSidebar.add(sidebar);
    sidebar.addEventListener('click', (event) => _recordStage('sidebar-capture', event), { capture: true });
  }

  function installRootStages() {
    for (const root of _findRoots()) {
      if (installedRoots.has(root)) continue;
      installedRoots.add(root);
      root.addEventListener('click', (event) => _recordStage('compendium-root-capture', event), { capture: true });
      root.addEventListener('click', (event) => _recordStage('compendium-root-bubble', event), { capture: false });
    }
  }

  installSidebarStage();
  installRootStages();

  Hooks.on('renderSidebar', () => { installSidebarStage(); installRootStages(); });
  Hooks.on('renderCompendiumDirectory', () => installRootStages());
  for (const delay of [0, 250, 1000]) setTimeout(() => { installSidebarStage(); installRootStages(); }, delay);
}

// ---------------------------------------------------------------------------
// Phase 3 — app instance / DOM root identity forensics
// ---------------------------------------------------------------------------
let lastKnownAppRoot = null;

function _recordRenderIdentity(app) {
  const el = app?.element instanceof HTMLElement ? app.element : null;
  lastKnownAppRoot = el;
  _dlog('renderCompendiumDirectory identity snapshot', {
    constructor: app?.constructor?.name,
    appId: app?.id,
    rendered: app?.rendered,
    element: describeElement(el),
    documentContainsElement: el ? document.contains(el) : null
  });
}

function identitySnapshot() {
  const liveRoots = _findRoots();
  const appEl = ui?.compendium?.element instanceof HTMLElement ? ui.compendium.element : null;
  return {
    constructor: ui?.compendium?.constructor?.name ?? null,
    appId: ui?.compendium?.id ?? null,
    rendered: ui?.compendium?.rendered ?? null,
    appElement: describeElement(appEl),
    lastRenderedElement: describeElement(lastKnownAppRoot),
    appElementMatchesLastRendered: appEl === lastKnownAppRoot,
    appElementInDocument: appEl ? document.contains(appEl) : null,
    domRootsFound: liveRoots.map(describeElement)
  };
}

// ---------------------------------------------------------------------------
// Phase 4 — DOM mutation forensics (narrow, current compendium root only)
// ---------------------------------------------------------------------------
const OBSERVED_ATTRIBUTES = ['class', 'style', 'hidden', 'aria-hidden', 'data-tab', 'data-application-part'];
const observedNodes = new WeakSet();
let mutationObserverInstance = null;

function _recordMutation(record) {
  mutationLog.push(record);
  if (mutationLog.length > MAX_MUTATIONS) mutationLog.shift();
  _dlog('mutation observed', record);
}

function _installMutationForensics() {
  if (typeof MutationObserver === 'undefined') return;

  function attachTo(node) {
    if (!(node instanceof HTMLElement) || observedNodes.has(node)) return;
    observedNodes.add(node);

    if (!mutationObserverInstance) {
      mutationObserverInstance = new MutationObserver((records) => {
        if (!_isDebug()) return;
        const stackHint = new Error().stack?.split('\n').slice(1, 4).join(' | ') ?? null;
        for (const record of records) {
          _recordMutation({
            timestamp: performance.now(),
            target: describeElement(record.target instanceof Element ? record.target : record.target?.parentElement),
            type: record.type,
            attributeName: record.attributeName ?? null,
            oldValue: record.oldValue ?? null,
            addedNodes: Array.from(record.addedNodes ?? []).filter(n => n instanceof Element).map(describeElement),
            removedNodes: Array.from(record.removedNodes ?? []).filter(n => n instanceof Element).map(describeElement),
            // Best-effort only: MutationObserver callbacks run as a microtask
            // after the synchronous call that caused the mutation has already
            // unwound, so this stack identifies the callback's own frame, not
            // necessarily the original mutator. Documented limitation, not a
            // false negative.
            observerCallbackStackHint: stackHint
          });
        }
      });
    }

    mutationObserverInstance.observe(node, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: OBSERVED_ATTRIBUTES,
      childList: true,
      subtree: false
    });
  }

  function attachToCurrentRoots() {
    for (const root of _findRoots()) attachTo(root);
    const sidebar = document.getElementById('sidebar');
    if (sidebar instanceof HTMLElement) attachTo(sidebar);
  }

  attachToCurrentRoots();
  Hooks.on('renderCompendiumDirectory', () => attachToCurrentRoots());
  Hooks.on('renderSidebar', () => attachToCurrentRoots());
}

// ---------------------------------------------------------------------------
// Phase 5 — ApplicationV2 options forensics (read-only snapshot + diff)
// ---------------------------------------------------------------------------
function _safeDefaultOptions(cls) {
  try {
    return cls?.DEFAULT_OPTIONS ?? null;
  } catch (_e) {
    return null;
  }
}

function optionsSnapshot() {
  const nativeCompendiumClass = foundry?.applications?.sidebar?.tabs?.CompendiumDirectory ?? null;
  const nativeDefaults = _safeDefaultOptions(nativeCompendiumClass);
  const swseDefaults = _safeDefaultOptions(SWSEApplicationV2);

  const identity = {
    positionShared: !!(nativeDefaults?.position && swseDefaults?.position && nativeDefaults.position === swseDefaults.position),
    windowShared: !!(nativeDefaults?.window && swseDefaults?.window && nativeDefaults.window === swseDefaults.window),
    actionsShared: !!(nativeDefaults?.actions && swseDefaults?.actions && nativeDefaults.actions === swseDefaults.actions)
  };

  return {
    capturedAt: Date.now(),
    nativeCompendiumDirectoryFound: !!nativeCompendiumClass,
    nativeDefaultOptions: nativeDefaults ? foundry.utils.deepClone(nativeDefaults) : null,
    swseApplicationV2DefaultOptions: swseDefaults ? foundry.utils.deepClone(swseDefaults) : null,
    crossHierarchySharedReferences: identity,
    liveCompendiumInstanceOptions: ui?.compendium?.options ? foundry.utils.deepClone(ui.compendium.options) : null
  };
}

let initSnapshot = null;
let readySnapshot = null;

function _diffKeys(a, b) {
  if (!a || !b) return null;
  const changed = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) changed.push(key);
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Phase 8 — pre-existing fallback observation (read state, do not alter it)
// ---------------------------------------------------------------------------
// compendium-directory-click-repair.js honors this flag itself (see Phase 9
// there); this module only exposes a convenience toggle + reads the flag's
// current value back for status reporting.
function armNativeOnlyClick() {
  globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY = true;
  _dlog('Armed SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY for exactly one compendium click. ' +
    'The next resolved pack click will NOT be opened by the fallback — watch the console ' +
    'for whether Foundry\'s native handler opens it anyway.');
  return true;
}

function isNativeOnlyArmed() {
  return globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY === true;
}

// ---------------------------------------------------------------------------
// Public status / report API
// ---------------------------------------------------------------------------
function status() {
  return {
    debugEnabled: _isDebug(),
    installed,
    clickTraceCount: clickTraces.length,
    mutationCount: mutationLog.length,
    nativeOnlyArmed: isNativeOnlyArmed(),
    identity: identitySnapshot()
  };
}

function lastClick() {
  return clickTraces[clickTraces.length - 1] ?? null;
}

function lastMutations() {
  return mutationLog.slice(-10);
}

function clear() {
  clickTraces.length = 0;
  mutationLog.length = 0;
  activeTraces.clear();
  _dlog('Cleared click traces and mutation log.');
}

function report() {
  const click = lastClick();
  const snap = optionsSnapshot();
  const lines = [
    `SWSE Compendium Forensics — ${new Date().toISOString()}`,
    `  debug enabled: ${_isDebug()}  installed: ${installed}  nativeOnlyArmed: ${isNativeOnlyArmed()}`,
    `  identity: appElement=${identitySnapshot().appElement?.id ?? 'null'} lastRendered=${identitySnapshot().lastRenderedElement?.id ?? 'null'} match=${identitySnapshot().appElementMatchesLastRendered}`,
    `  options: nativeFound=${snap.nativeCompendiumDirectoryFound} sharedRefs=${JSON.stringify(snap.crossHierarchySharedReferences)}`,
    `  clicks traced: ${clickTraces.length}  mutations observed: ${mutationLog.length}`
  ];
  if (click) {
    lines.push(`  last click ${click.traceId}: observed=[${click.observedOrder.join(', ')}] missing=[${click.missingStages.join(', ')}] lastObservedStage=${click.lastObservedStage}`);
  }
  if (initSnapshot && readySnapshot) {
    const changed = _diffKeys(initSnapshot.swseApplicationV2DefaultOptions, readySnapshot.swseApplicationV2DefaultOptions);
    lines.push(`  SWSEApplicationV2.DEFAULT_OPTIONS changed keys (init→ready): ${changed?.join(', ') || 'none'}`);
  }
  const text = lines.join('\n');
  console.log(text);
  return text;
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------
export function installCompendiumInteractionForensics() {
  if (installed) return;
  installed = true;

  try {
    initSnapshot = optionsSnapshot();
  } catch (_e) { /* game/foundry globals may not exist yet at init */ }

  _installClickStages();
  _installMutationForensics();

  Hooks.on('renderCompendiumDirectory', (app) => _recordRenderIdentity(app));

  Hooks.once('ready', () => {
    try { readySnapshot = optionsSnapshot(); } catch (_e) { /* noop */ }
  });

  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.compendiumForensics = {
    status,
    lastClick,
    lastMutations,
    optionsSnapshot,
    clear,
    report,
    armNativeOnlyClick,
    isNativeOnlyArmed,
    identitySnapshot,
    allClicks: () => clickTraces.slice()
  };

  SWSELogger.log('[CompendiumInteractionForensics] Installed (debug-gated, non-mutating, no behavior change).');
}

export default installCompendiumInteractionForensics;
