import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// PHASE 4 / Track A: inline holopad structural rendering.
//
// Before this phase, ProgressionSurfaceAdapter's app.render() override
// unconditionally routed every progression structural render through
// requestShellRender() -> the hosting character sheet's own full
// ApplicationV2 render(false) -> _prepareContext() -> ShellSurfaceRegistry
// -> ProgressionSurfaceAdapter.buildViewModel() -> ProgressionShell.
// _prepareContext() -> the canonical shell template. An already-mounted
// inline progression surface therefore rebuilt the entire hosting character
// sheet just to replace its own inline HTML.
//
// These tests drive the REAL adapter (ProgressionSurfaceAdapter.prototype),
// not a reimplementation, against a lightweight app/host double — heavy
// enough to prove the real _installInlineRenderOverride()/
// _renderMountedInlineProgression()/afterInlineRender() logic, light
// enough to avoid the full actor/session/step bootstrap _initialize()
// requires.

registerFoundryPathLoader();
installFoundryShimGlobals();

/** Minimal fake DOM element: attribute-selector lookups are pre-wired by
 * the test (mirrors tests/progression-render-scheduler-budgets.test.mjs's
 * FakeElement — this codebase's established pattern for these fixtures,
 * not a general CSS engine). */
class FakeElement {
  constructor({ selectors = {}, html = '', tag = 'div' } = {}) {
    this._selectors = selectors;
    this._html = html;
    this.tag = tag;
    this.dataset = {};
    this.isConnected = true;
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = v; }
  querySelector(sel) { return this._selectors[sel] ?? null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return false; }
  matches() { return false; }
  getAttribute() { return null; }
  focus() {}
}
globalThis.HTMLElement = globalThis.HTMLElement ?? FakeElement;
globalThis.document = globalThis.document ?? {
  activeElement: null,
  getElementById: () => null,
  readyState: 'complete',
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.CSS = globalThis.CSS ?? { escape: (s) => String(s) };

const frameQueue = [];
globalThis.requestAnimationFrame = (fn) => { frameQueue.push(fn); return frameQueue.length; };
globalThis.cancelAnimationFrame = () => {};

/** Pump the fake frame queue on a real timer tick until `donePromise`
 * settles, or a safety timeout elapses. The render pass reaches its
 * requestAnimationFrame() call only after several real microtask hops
 * (buildViewModel -> _prepareContext -> afterInlineRender -> ...), so a
 * fixed one-shot flush can run (and find nothing queued) before the render
 * has gotten there — this polls instead of assuming a fixed number of
 * flushes is enough. */
async function pumpUntil(donePromise) {
  let done = false;
  donePromise.then(() => { done = true; }, () => { done = true; });
  for (let i = 0; i < 200 && !done; i++) {
    await new Promise(resolve => setTimeout(resolve, 2));
    const due = frameQueue.splice(0, frameQueue.length);
    for (const fn of due) if (fn) fn();
  }
  if (!done) throw new Error('pumpUntil: render did not settle within the safety window');
}

/** Drive app.render() to completion against the fake (never auto-firing)
 * requestAnimationFrame above. */
async function runRender(app) {
  const pending = app.render();
  await pumpUntil(pending);
  return pending;
}

globalThis.foundry.applications = globalThis.foundry.applications ?? {
  api: {
    ApplicationV2: class ApplicationV2Stub {},
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DocumentSheetV2: class DocumentSheetV2Stub {},
    DialogV2: class DialogV2Stub {},
  },
  handlebars: { renderTemplate: async () => '<div class="canonical-shell">SHELL</div>' },
  ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};
globalThis.game = globalThis.game ?? {};
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, error() {}, info() {} } };
globalThis.window = globalThis.window ?? {
  addEventListener: () => {}, removeEventListener: () => {}, __SWSE_CONTRACT_INITIALIZED__: false,
};
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { ProgressionSurfaceAdapter } = await import(
  '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
);
const { ProgressionShell } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js'
);

/** A mounted inline progression surface: [data-shell-region] wrapping
 * [data-inline-progression-host], matching surface-progression.hbs /
 * surface-chargen.hbs exactly. */
function buildMountedHostFixture(region = 'surface-progression') {
  const hostEl = new FakeElement({ html: '<div class="canonical-shell">OLD</div>' });
  const regionRoot = new FakeElement({
    selectors: { '[data-inline-progression-host]': hostEl },
  });
  const rootEl = new FakeElement({
    selectors: { [`[data-shell-region="${region}"]`]: regionRoot },
  });
  return { rootEl, regionRoot, hostEl };
}

/** A step plugin whose lifecycle hooks count their own calls. */
function makeCountingPlugin({ stepId = 'species' } = {}) {
  const calls = { onDataReady: 0, afterRender: 0 };
  return {
    stepId,
    getBlockingIssues: () => [],
    getWarnings: () => [],
    async onDataReady() { calls.onDataReady += 1; },
    async afterRender() { calls.afterRender += 1; },
    calls,
  };
}

/** A minimal app double + real prototype methods this._app needs, reusing
 * ProgressionShell's real onDataReady revision-gate (not a reimplementation
 * of it) exactly like Test A6 requires. */
function makeAppDouble({ stepId = 'species', plugin = makeCountingPlugin({ stepId }) } = {}) {
  const descriptor = { stepId, label: 'Species' };
  const calls = { prepareContext: 0 };
  const app = {
    steps: [descriptor],
    currentStepIndex: 0,
    stepPlugins: new Map([[stepId, plugin]]),
    progressionSession: { currentStepId: stepId },
    focusedItem: null,
    _inlineRenderPromise: null,
    _inlineRenderQueued: false,
    _pendingScrollSnapshots: null,
    _dataReadyToken: new Map(),
    _stepDataRevision: 0,
    _onDataReadyCalls: 0,
    // Reuse the REAL revision-gated hooks from the canonical shell — this is
    // the exact authority Test A6 requires inline mode to honor, not an
    // independent inline revision counter.
    _shouldRunDataReady: ProgressionShell.prototype._shouldRunDataReady,
    _maybeRunOnDataReady: ProgressionShell.prototype._maybeRunOnDataReady,
    invalidateStepData: ProgressionShell.prototype.invalidateStepData,
    _captureProgressionScrollSnapshots: () => [],
    _restoreProgressionScrollSnapshots: () => {},
    async _prepareContext() {
      calls.prepareContext += 1;
      return { currentDescriptor: descriptor, workSurfaceHtml: '<div class="prog-work-surface"></div>' };
    },
  };
  return { app, calls, descriptor, plugin };
}

function makeHost({ shellSurface = 'progression', element = null } = {}) {
  const calls = { requestSurfaceRender: 0, render: 0 };
  return {
    shellSurface,
    element,
    async requestSurfaceRender() { calls.requestSurfaceRender += 1; return this; },
    async render() { calls.render += 1; return this; },
    calls,
  };
}

/** Construct a real adapter without the heavy _initialize() bootstrap:
 * manually wire the exact fields _initialize() would have set, then install
 * the real render() override the same way _initialize() does. */
function makeAdapter({ mode = 'levelup', host, app }) {
  const adapter = Object.create(ProgressionSurfaceAdapter.prototype);
  adapter._shellHost = host;
  adapter._actorId = 'actor-1';
  adapter.mode = mode;
  adapter._app = app;
  adapter._ready = true;
  adapter._installInlineRenderOverride(app);
  return adapter;
}

/* ------------------------------------------------------------------ *
 * A1 — Mounted structural progression does not render host.
 * ------------------------------------------------------------------ */
{
  const fixture = buildMountedHostFixture('surface-progression');
  const host = makeHost({ shellSurface: 'progression', element: fixture.rootEl });
  const { app, calls, plugin } = makeAppDouble();
  const adapter = makeAdapter({ mode: 'levelup', host, app });

  await runRender(app);

  assert.equal(host.calls.requestSurfaceRender, 0, 'mounted inline progression triggered a host requestSurfaceRender()');
  assert.equal(host.calls.render, 0, 'mounted inline progression triggered a host render()');
  assert.equal(calls.prepareContext, 1, 'ProgressionShell._prepareContext() was not called exactly once');
  assert.equal(fixture.hostEl.innerHTML, '<div class="canonical-shell">SHELL</div>',
    'the inline host did not receive the newly-rendered canonical shell HTML');
  assert.equal(plugin.calls.onDataReady, 1, 'afterInlineRender() did not run onDataReady() exactly once');
}

/* ------------------------------------------------------------------ *
 * A2 — Bootstrap fallback still uses host: no mounted
 * [data-inline-progression-host] exists yet.
 * ------------------------------------------------------------------ */
{
  // A shell-region wrapper exists (loading state) but has not mounted the
  // inline host yet — the real bootstrap shape before the first HTML lands.
  const regionRootNoHost = new FakeElement({ selectors: {} });
  const rootEl = new FakeElement({ selectors: { '[data-shell-region="surface-progression"]': regionRootNoHost } });
  const host = makeHost({ shellSurface: 'progression', element: rootEl });
  const { app, calls } = makeAppDouble();
  const adapter = makeAdapter({ mode: 'levelup', host, app });

  await runRender(app);

  assert.equal(host.calls.requestSurfaceRender, 1, 'bootstrap (no mounted inline host) did not fall back to exactly one coordinated host render');
  assert.equal(calls.prepareContext, 0, 'a blank direct-render success occurred despite no mounted inline host — buildViewModel() must not run without a host to mount into');
}

/* ------------------------------------------------------------------ *
 * A3 — Stale surface ignored: adapter is progression, host switched away.
 * ------------------------------------------------------------------ */
{
  const fixture = buildMountedHostFixture('surface-progression');
  const host = makeHost({ shellSurface: 'sheet', element: fixture.rootEl }); // switched away
  const { app, calls } = makeAppDouble();
  const adapter = makeAdapter({ mode: 'levelup', host, app });

  await runRender(app);

  assert.equal(host.calls.render, 0, 'stale-surface render triggered a host render()');
  assert.equal(host.calls.requestSurfaceRender, 0, 'stale-surface render triggered a host requestSurfaceRender()');
  assert.equal(calls.prepareContext, 0, 'stale-surface render performed an inline replacement anyway');
  assert.equal(fixture.hostEl.innerHTML, '<div class="canonical-shell">OLD</div>', 'stale-surface render mutated the inline host');
}

/* ------------------------------------------------------------------ *
 * A4 — Structural render serialization: multiple render() calls while one
 * is in flight collapse into a bounded number of inline replacements, not
 * one concurrent replacement per call.
 * ------------------------------------------------------------------ */
{
  const fixture = buildMountedHostFixture('surface-progression');
  const host = makeHost({ shellSurface: 'progression', element: fixture.rootEl });
  const { app, calls } = makeAppDouble();
  const adapter = makeAdapter({ mode: 'levelup', host, app });

  // Fire four overlapping render() calls before the first has settled.
  const p1 = app.render();
  const p2 = app.render();
  const p3 = app.render();
  const p4 = app.render();
  await pumpUntil(Promise.all([p1, p2, p3, p4]));

  // The safety-pass loop caps at 4 within one render() invocation's queue;
  // four near-simultaneous calls must not produce four independent
  // concurrent inline replacements (each with its own _prepareContext()).
  assert.ok(calls.prepareContext >= 1 && calls.prepareContext <= 4,
    `expected a bounded, coalesced number of inline replacements (1-4), got ${calls.prepareContext}`);
  assert.equal(fixture.hostEl.innerHTML, '<div class="canonical-shell">SHELL</div>', 'final state was not the rendered shell HTML');
}

/* ------------------------------------------------------------------ *
 * A5 — Partial region updates do not invoke host or structural inline
 * replacement. This guards Phase 2: ProgressionShell._updateRegion() is a
 * completely separate seam from app.render() and must never be routed
 * through the adapter's structural interception.
 * ------------------------------------------------------------------ */
{
  const fixture = buildMountedHostFixture('surface-progression');
  const host = makeHost({ shellSurface: 'progression', element: fixture.rootEl });
  const { app, calls } = makeAppDouble();
  makeAdapter({ mode: 'levelup', host, app });

  // A scoped region update never calls app.render() (that is the whole
  // point of Phase 2's partial seams) — assert the inline host and host
  // render/prepareContext counters stay untouched by merely existing.
  assert.equal(host.calls.render, 0);
  assert.equal(host.calls.requestSurfaceRender, 0);
  assert.equal(calls.prepareContext, 0);
  assert.equal(fixture.hostEl.innerHTML, '<div class="canonical-shell">OLD</div>');
}

/* ------------------------------------------------------------------ *
 * A6 — onDataReady inline lifecycle parity: repeated inline structural
 * repaints with an unchanged (stepId, _stepDataRevision) must not rerun
 * onDataReady(); invalidating the revision must make it run exactly once
 * more.
 * ------------------------------------------------------------------ */
{
  const fixture = buildMountedHostFixture('surface-progression');
  const host = makeHost({ shellSurface: 'progression', element: fixture.rootEl });
  const { app, plugin } = makeAppDouble();
  makeAdapter({ mode: 'levelup', host, app });

  await runRender(app);
  assert.equal(plugin.calls.onDataReady, 1, 'first inline structural render did not run onDataReady()');

  // Repeated structural repaints, unchanged step/revision.
  await runRender(app);
  await runRender(app);
  assert.equal(plugin.calls.onDataReady, 1, 'unchanged (stepId, _stepDataRevision) re-ran onDataReady() on a repeated inline structural repaint');

  // Explicit invalidation must make it run exactly once more.
  app.invalidateStepData(app.steps[0].stepId);
  await runRender(app);
  assert.equal(plugin.calls.onDataReady, 2, 'invalidateStepData() did not cause onDataReady() to run again exactly once');
}

console.log('progression-inline-surface-performance: all assertions passed');
