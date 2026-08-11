/**
 * sentinel-compendium-forensics.js — Compendium interaction diagnostic (Sentinel-owned)
 *
 * Investigates why native Foundry v13 CompendiumDirectory pack-card clicks
 * fail to open packs while the SWSE capture-phase fallback
 * (compendium-directory-click-repair.js) can still resolve and open them.
 * See docs/audits/compendium-interaction-forensics-2026-08.md.
 *
 * ARCHITECTURE: this is a Sentinel diagnostic, not an independent
 * observability stack. It:
 *   - registers itself as a SentinelEngine layer ('compendiumInteraction')
 *     so SentinelEngine.bootstrap() controls whether it installs at all —
 *     Sentinel owns enable/disable, not a bespoke debug flag;
 *   - stores every finding as a SentinelEngine.report(...) call — there is
 *     no parallel ring buffer of finalized records here. `#reportLog`
 *     (bounded by SentinelConfig.MAX_REPORT_LOG) is the only history;
 *   - is read back exclusively through SentinelEngine.getReports(...) —
 *     lastInteraction()/report()/status() below are just query+format
 *     helpers over that shared store, plumbed into
 *     SWSE.debug.sentinel.diagnostics.compendium.*.
 *
 * The only local, non-Sentinel state is (a) a WeakMap of DOM-node → stable
 * diagnostic id (cannot live in a report log — it must never retain a DOM
 * reference) and (b) a transient Map of in-flight click traces, cleared as
 * soon as each trace finalizes. Neither is "history."
 *
 * Never calls preventDefault/stopPropagation/stopImmediatePropagation and
 * never mutates DOM. The one sanctioned behavioral experiment
 * (SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY) remains owned and decided by
 * compendium-directory-click-repair.js; this module only records that it
 * happened.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";

const LAYER = 'compendiumInteraction';
const CATEGORY = 'COMPENDIUM_INTERACTION';
const { SEVERITY } = SentinelEngine;

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

function reportEvidence(subcode, severity, message, meta) {
  SentinelEngine.report(LAYER, severity, message, meta, { category: CATEGORY, subcode });
}

// ---------------------------------------------------------------------------
// Read-only selectors (independent of compendium-directory-click-repair.js's
// private helpers — this module must keep working even if that file's
// internals change).
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
// Click propagation forensics — correlated by a trace id stamped onto the
// Event object itself (same Event instance throughout capture+bubble, so
// no WeakMap is needed for cross-stage correlation).
// ---------------------------------------------------------------------------
const activeTraces = new Map(); // traceId -> in-progress trace (transient only)
let traceCounter = 0;

function _traceIdFor(event) {
  if (event.__swseSentinelCompendiumTrace) return event.__swseSentinelCompendiumTrace;
  const id = `COMP-${String(++traceCounter).padStart(4, '0')}`;
  event.__swseSentinelCompendiumTrace = id;
  return id;
}

/**
 * Read (never create) the trace id for an event. Used by
 * compendium-directory-click-repair.js so its own Sentinel observations
 * correlate with this module's propagation trace for the same physical
 * click. Returns null if this diagnostic never saw the event (e.g. the
 * layer is disabled), which is the correct, honest answer — the fallback
 * should not invent a trace id that mimics one this module produced.
 */
export function getTraceId(event) {
  return event?.__swseSentinelCompendiumTrace ?? null;
}

function _summarizeElementsFromPoint(x, y) {
  if (typeof document.elementsFromPoint !== 'function') return [];
  try {
    return document.elementsFromPoint(x, y).slice(0, 8).map(el => {
      const cs = getComputedStyle(el);
      return { ...describeElement(el), pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, position: cs.position };
    });
  } catch (_e) {
    return [];
  }
}

const EXPECTED_STAGES = ['document-capture', 'sidebar-capture', 'compendium-root-capture', 'compendium-root-bubble', 'document-bubble'];

function _recordStage(stage, event) {
  const traceId = _traceIdFor(event);
  let trace = activeTraces.get(traceId);
  if (!trace) {
    trace = { traceId, startedAt: performance.now(), stages: {} };
    activeTraces.set(traceId, trace);
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
}

function _finalizeTrace(traceId) {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  activeTraces.delete(traceId);

  const observed = EXPECTED_STAGES.filter(s => trace.stages[s]);
  const missing = EXPECTED_STAGES.filter(s => !trace.stages[s]);
  const lastObservedStage = observed[observed.length - 1] ?? null;

  const record = {
    traceId,
    timestamp: Date.now(),
    stages: trace.stages,
    observedOrder: observed,
    missingStages: missing,
    lastObservedStage,
    composedPath: trace.composedPath ?? [],
    hitTest: trace.hitTest ?? null,
    fallback: fallbackObservations.get(traceId) ?? null
  };
  fallbackObservations.delete(traceId);

  reportEvidence(
    'CLICK_TRACE',
    SEVERITY.INFO,
    `Compendium click trace ${traceId}: observed=[${observed.join(', ')}] lastStage=${lastObservedStage}`,
    record
  );
}

// ---------------------------------------------------------------------------
// Fallback observations (compendium-directory-click-repair.js reports here
// instead of maintaining its own forensic history — see module docblock).
// Buffered transiently by trace id so a click's fallback evidence merges
// into that same click's CLICK_TRACE report instead of scattering across
// unrelated report entries.
// ---------------------------------------------------------------------------
const fallbackObservations = new Map();

export function observeFallback(event, type, payload = {}) {
  const traceId = getTraceId(event) ?? 'untraced';
  const existing = fallbackObservations.get(traceId) ?? { traceId, events: [] };
  existing.events.push({ type, at: performance.now(), ...payload });
  fallbackObservations.set(traceId, existing);

  reportEvidence('FALLBACK', SEVERITY.INFO, `Compendium fallback: ${type} (${traceId})`, { traceId, type, ...payload });
}

// ---------------------------------------------------------------------------
// App instance / DOM root identity forensics
// ---------------------------------------------------------------------------
let lastKnownAppRoot = null;

function _recordRenderIdentity(app) {
  const el = app?.element instanceof HTMLElement ? app.element : null;
  lastKnownAppRoot = el;
  reportEvidence('IDENTITY', SEVERITY.INFO, `CompendiumDirectory render identity snapshot`, {
    constructor: app?.constructor?.name ?? null,
    appId: app?.id ?? null,
    rendered: app?.rendered ?? null,
    element: describeElement(el),
    documentContainsElement: el ? document.contains(el) : null
  });
}

function identitySnapshot() {
  const appEl = ui?.compendium?.element instanceof HTMLElement ? ui.compendium.element : null;
  return {
    constructor: ui?.compendium?.constructor?.name ?? null,
    appId: ui?.compendium?.id ?? null,
    rendered: ui?.compendium?.rendered ?? null,
    appElement: describeElement(appEl),
    lastRenderedElement: describeElement(lastKnownAppRoot),
    appElementMatchesLastRendered: appEl === lastKnownAppRoot,
    appElementInDocument: appEl ? document.contains(appEl) : null,
    domRootsFound: _findRoots().map(describeElement)
  };
}

// ---------------------------------------------------------------------------
// DOM mutation forensics (narrow, current compendium root only)
// ---------------------------------------------------------------------------
const OBSERVED_ATTRIBUTES = ['class', 'style', 'hidden', 'aria-hidden', 'data-tab', 'data-application-part'];
const observedNodes = new WeakSet();
let mutationObserverInstance = null;

function _installMutationForensics() {
  if (typeof MutationObserver === 'undefined') return;

  function attachTo(node) {
    if (!(node instanceof HTMLElement) || observedNodes.has(node)) return;
    observedNodes.add(node);

    if (!mutationObserverInstance) {
      mutationObserverInstance = new MutationObserver((records) => {
        for (const record of records) {
          reportEvidence('MUTATION', SEVERITY.WARN, 'DOM mutation observed on a compendium/sidebar root', {
            target: describeElement(record.target instanceof Element ? record.target : record.target?.parentElement),
            type: record.type,
            attributeName: record.attributeName ?? null,
            oldValue: record.oldValue ?? null,
            addedNodes: Array.from(record.addedNodes ?? []).filter(n => n instanceof Element).map(describeElement),
            removedNodes: Array.from(record.removedNodes ?? []).filter(n => n instanceof Element).map(describeElement)
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
// ApplicationV2 options forensics (read-only snapshot + diff)
// ---------------------------------------------------------------------------
function _safeDefaultOptions(cls) {
  try { return cls?.DEFAULT_OPTIONS ?? null; } catch (_e) { return null; }
}

function optionsSnapshot() {
  const nativeCompendiumClass = foundry?.applications?.sidebar?.tabs?.CompendiumDirectory ?? null;
  const nativeDefaults = _safeDefaultOptions(nativeCompendiumClass);
  const swseDefaults = _safeDefaultOptions(SWSEApplicationV2);

  const crossHierarchySharedReferences = {
    positionShared: !!(nativeDefaults?.position && swseDefaults?.position && nativeDefaults.position === swseDefaults.position),
    windowShared: !!(nativeDefaults?.window && swseDefaults?.window && nativeDefaults.window === swseDefaults.window),
    actionsShared: !!(nativeDefaults?.actions && swseDefaults?.actions && nativeDefaults.actions === swseDefaults.actions)
  };

  return {
    capturedAt: Date.now(),
    nativeCompendiumDirectoryFound: !!nativeCompendiumClass,
    nativeDefaultOptions: nativeDefaults ? foundry.utils.deepClone(nativeDefaults) : null,
    swseApplicationV2DefaultOptions: swseDefaults ? foundry.utils.deepClone(swseDefaults) : null,
    crossHierarchySharedReferences,
    liveCompendiumInstanceOptions: ui?.compendium?.options ? foundry.utils.deepClone(ui.compendium.options) : null
  };
}

function _reportOptionsSnapshot(label) {
  const snap = optionsSnapshot();
  reportEvidence('OPTIONS', SEVERITY.INFO, `ApplicationV2 options snapshot (${label})`, snap);
  return snap;
}

// ---------------------------------------------------------------------------
// Phase 9 — "observe native" one-shot toggle (compatibility surface only;
// compendium-directory-click-repair.js is the sole owner of the decision to
// honor this flag — see docs/audits/compendium-interaction-forensics-2026-08.md).
// ---------------------------------------------------------------------------
function armNativeOnlyClick() {
  globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY = true;
  reportEvidence('FALLBACK', SEVERITY.INFO, 'Armed SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY for one click', {});
  return true;
}

function isNativeOnlyArmed() {
  return globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY === true;
}

// ---------------------------------------------------------------------------
// Evidence-derived hypothesis assessment (never a hard-coded winner — every
// verdict is computed from what has actually been observed this session).
// ---------------------------------------------------------------------------
function assessHypotheses() {
  const reports = SentinelEngine.getReports(LAYER);
  const clickTraces = reports.filter(r => r.meta?.traceId).map(r => r.meta);
  const mutations = reports.filter(r => r.subcode === 'MUTATION');
  const identities = reports.filter(r => r.subcode === 'IDENTITY');
  const optionsReports = reports.filter(r => r.subcode === 'OPTIONS');
  const latestOptions = optionsReports[optionsReports.length - 1]?.meta ?? null;
  const latestIdentity = identities[identities.length - 1]?.meta ?? null;
  const nativeOnlyTraces = clickTraces.filter(t => (t.fallback?.events ?? []).some(e => e.type === 'native-only-bypass'));

  const h1 = mutations.length === 0
    ? 'WEAK (no #compendium/#sidebar mutations observed this session; static audit already found the named mutator, hardening-init.js, is dead code)'
    : `SUPPORTED (${mutations.length} mutation(s) observed on a compendium/sidebar root this session)`;

  const h2 = !latestOptions
    ? 'REQUIRES TRACE (no options snapshot taken yet — call diagnostics.compendium.report() after boot)'
    : Object.values(latestOptions.crossHierarchySharedReferences ?? {}).some(Boolean)
      ? 'SUPPORTED (native CompendiumDirectory and SWSEApplicationV2 share a nested DEFAULT_OPTIONS object reference)'
      : 'FALSIFIED (no shared object identity between native and SWSE ApplicationV2 defaults)';

  const h3 = nativeOnlyTraces.length === 0
    ? 'REQUIRES TRACE (arm SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY and click one pack to test)'
    : nativeOnlyTraces.some(t => t.lastObservedStage === 'document-bubble' && t.stages?.['document-bubble']?.defaultPrevented === false)
      ? 'FALSIFIED (native delegation was given priority and the click still did not resolve — native handler appears non-functional on its own)'
      : 'SUPPORTED (fallback abstained for one click; propagation still stopped before reaching document-bubble, consistent with the fallback normally self-masking native delegation)';

  const withHitTest = clickTraces.filter(t => t.hitTest);
  const h4 = withHitTest.length === 0
    ? 'REQUIRES TRACE (no click observed yet)'
    : withHitTest.every(t => (t.hitTest.elementsFromPoint ?? []).some(el => el.selector && /directory-item|pack|compendium/i.test(el.selector)))
      ? 'FALSIFIED (the compendium pack row is present among the top hit-test elements at click coordinates)'
      : 'SUPPORTED (a foreign element sits above the pack row at click coordinates)';

  const h5 = clickTraces.length === 0
    ? 'REQUIRES TRACE'
    : 'REQUIRES TRACE (no static or automated signal distinguishes Foundry\'s expected action-delegation markup from what SWSE renders — inspect stages[...].actionElement manually)';

  const h6 = !latestIdentity
    ? 'REQUIRES TRACE (no renderCompendiumDirectory identity snapshot taken yet)'
    : latestIdentity.appElementMatchesLastRendered === false
      ? 'SUPPORTED (the live ui.compendium.element no longer matches the last-rendered root)'
      : 'NOT OBSERVED (identity matched at last check)';

  return { H1_lifecycleDomContamination: h1, H2_optionContamination: h2, H3_propagationInterception: h3, H4_physicalOverlay: h4, H5_actionDelegationFailure: h5, H6_staleAppRoot: h6 };
}

// ---------------------------------------------------------------------------
// Public diagnostic API — plumbed into SWSE.debug.sentinel.diagnostics.compendium
// ---------------------------------------------------------------------------
function status() {
  return {
    installed,
    sentinelActive: SentinelEngine.isActive(),
    sentinelMode: Object.keys(SentinelEngine.MODES)[SentinelEngine.getMode()],
    reportCount: SentinelEngine.getReports(LAYER).length,
    nativeOnlyArmed: isNativeOnlyArmed(),
    identity: identitySnapshot()
  };
}

function lastInteraction() {
  const reports = SentinelEngine.getReports(LAYER).filter(r => r.subcode === 'CLICK_TRACE');
  return reports[reports.length - 1] ?? null;
}

function clear() {
  SentinelEngine.clearReports(LAYER);
}

function report() {
  const reports = SentinelEngine.getReports(LAYER);
  const last = lastInteraction();
  const assessment = assessHypotheses();

  const lines = [
    `SWSE Sentinel — Compendium Interaction Diagnostic — ${new Date().toISOString()}`,
    `  Sentinel mode: ${Object.keys(SentinelEngine.MODES)[SentinelEngine.getMode()]}  installed: ${installed}  nativeOnlyArmed: ${isNativeOnlyArmed()}`,
    `  reports this session: ${reports.length}`,
    ''
  ];

  if (last) {
    const trace = last.meta;
    lines.push(`Last interaction trace ${trace.traceId} (${trace.observedOrder.length === 1 && globalThis.SWSE_DEBUG_COMPENDIUM_NATIVE_ONLY === false ? 'NATIVE-ONLY TRACE' : 'NORMAL FALLBACK TRACE'}):`);
    lines.push(`  Propagation:`);
    for (const stage of EXPECTED_STAGES) {
      lines.push(`    ${stage.padEnd(24)} ${trace.stages[stage] ? 'YES' : 'NO'}`);
    }
    lines.push(`    fallback reached      ${trace.fallback ? 'YES' : 'NO'}`);
    lines.push(`  Last observed stage: ${trace.lastObservedStage}`);
    if (trace.fallback?.events?.length) {
      lines.push(`  Fallback events: ${trace.fallback.events.map(e => e.type).join(' -> ')}`);
    }
  } else {
    lines.push('No interaction trace recorded yet — click a compendium pack with Sentinel active.');
  }

  lines.push('');
  lines.push('Assessment (evidence-derived, not hard-coded):');
  for (const [key, verdict] of Object.entries(assessment)) {
    lines.push(`  ${key.padEnd(32)} ${verdict}`);
  }

  const text = lines.join('\n');
  console.log(text);
  return text;
}

// ---------------------------------------------------------------------------
// Instrumentation installation — this IS the layer's init(), called by
// SentinelEngine.bootstrap() only if the layer ends up enabled. Nothing in
// this file calls this outside that path.
// ---------------------------------------------------------------------------
function _attachInstrumentation() {
  if (installed) return;
  installed = true;

  _reportOptionsSnapshot('init');

  // Stage 1: document capture — outermost. Registering this layer (and
  // therefore this listener) BEFORE registerCompendiumDirectoryClickRepair()
  // is called (see index.js) is load-bearing: it guarantees this stage
  // observes every click before the fallback's own document-capture
  // listener can stopImmediatePropagation() it.
  document.addEventListener('click', (event) => _recordStage('document-capture', event), { capture: true });
  document.addEventListener('click', (event) => _recordStage('document-bubble', event), { capture: false });

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

  _installMutationForensics();

  Hooks.on('renderCompendiumDirectory', (app) => _recordRenderIdentity(app));
  Hooks.once('ready', () => _reportOptionsSnapshot('ready'));

  SentinelEngine.report(LAYER, SEVERITY.INFO, 'Compendium interaction diagnostic attached', {}, { category: CATEGORY });
}

/**
 * Register this diagnostic with Sentinel and bootstrap immediately.
 *
 * Called once from index.js's init hook, BEFORE
 * registerCompendiumDirectoryClickRepair() (ordering is load-bearing, see
 * _attachInstrumentation's docblock above). SentinelEngine.bootstrap() is
 * idempotent — calling it here simply means Sentinel's mode/layer
 * activation happens now instead of waiting for
 * scripts/governance/sentinel/sentinel-init.js's own ready-hook bootstrap
 * call, which becomes a no-op. No other Sentinel layer currently depends on
 * being initialized later, so this does not change any other layer's
 * observable behavior.
 *
 * If Sentinel ends up OFF (production default: devMode off, sentinelMode
 * "OFF"), or the per-layer "sentinelCompendiumInteraction" setting is
 * false, _attachInstrumentation() never runs and no listeners/observers of
 * any kind are installed — this diagnostic does not exist at runtime.
 */
export function registerCompendiumInteractionDiagnostic() {
  SentinelEngine.registerLayer(LAYER, { init: _attachInstrumentation });
  SentinelEngine.bootstrap();
}

export const CompendiumInteractionDiagnostic = {
  status,
  lastInteraction,
  report,
  clear,
  armNativeOnlyClick,
  isNativeOnlyArmed,
  identitySnapshot,
  optionsSnapshot,
  assessHypotheses
};

export default registerCompendiumInteractionDiagnostic;
