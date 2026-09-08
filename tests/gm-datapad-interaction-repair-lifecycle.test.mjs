import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad Stage 3 — GMInteractionRepairService stale-callback lifecycle.
//
// Reported live crash: `TypeError: Cannot read properties of null (reading
// 'style')`, thrown from inside Foundry's ApplicationV2 #applyPosition, one
// frame below GMDatapad._applyGmDatapadPosition, one frame below
// GMInteractionRepairService's own scheduled repair work.
//
// Root cause: _stabilizeViewport(host, root, signal) scheduled a nested
// double-requestAnimationFrame (`view.requestAnimationFrame(() =>
// view.requestAnimationFrame(apply))`) without ever capturing either frame
// id, so neither could be canceled when the binding's AbortController fired
// on destroy() (surface rerender or app close). Only the two setTimeout ids
// were cleared. apply() itself also had no signal/connectivity guard, so a
// callback that outlived its binding would call
// host._applyGmDatapadPosition() against a host/element Foundry had already
// torn down.
//
// Fix: capture both rAF ids and cancel them on abort; guard apply() itself
// on signal.aborted / root.isConnected / a live connected host element
// before touching anything. _bindModalBounds()'s deferred click-driven sync
// gets the same signal/root.isConnected guard for the same reason.
//
// This test proves both independent guards using a minimal fake DOM (no
// jsdom dependency in this repo) that implements only the handful of
// methods GMInteractionRepairService actually calls, with a hand-rolled
// requestAnimationFrame queue this test controls and flushes explicitly.

registerFoundryPathLoader();
installFoundryShimGlobals();

class FakeElement {
  constructor(doc) {
    this.ownerDocument = doc;
    this.style = {};
    this.dataset = {};
    this._connected = true;
    this._listeners = new Map();
    this.classList = {
      toggle() {}, add() {}, remove() {}, contains() { return false; }
    };
  }
  get isConnected() { return this._connected; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener(type, handler, options) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push({ handler, options });
  }
  removeEventListener() {}
  dispatchEvent(type, event) {
    for (const { handler } of this._listeners.get(type) || []) handler(event);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  closest() { return null; }
}

function makeFakeDom() {
  let rafSeq = 0;
  const rafQueue = new Map();
  const doc = {
    _styleIds: new Set(),
    getElementById(id) { return this._styleIds.has(id) ? {} : null; },
    createElement(tag) {
      const el = new FakeElement(doc);
      el.tagName = tag;
      return el;
    },
    head: {
      appendChild(el) { doc._styleIds.add(el.id); }
    }
  };
  const view = {
    requestAnimationFrame(cb) {
      const id = ++rafSeq;
      rafQueue.set(id, cb);
      return id;
    },
    cancelAnimationFrame(id) { rafQueue.delete(id); },
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args),
    addEventListener() {},
    removeEventListener() {},
    getComputedStyle: () => ({ transform: 'none', perspective: 'none', filter: 'none', backdropFilter: 'none', contain: '', willChange: '' })
  };
  doc.defaultView = view;
  const flushRaf = () => {
    const entries = [...rafQueue.entries()];
    rafQueue.clear();
    entries.forEach(([, cb]) => cb());
  };
  return { doc, view, flushRaf, pendingRafCount: () => rafQueue.size };
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

globalThis.HTMLElement = FakeElement;
globalThis.CSS = { escape: (value) => String(value) };

const { GMInteractionRepairService } = await import(
  '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMInteractionRepairService.js'
);

// --- 1: a destroyed binding's stale double-rAF callback must never call ----
// --- host._applyGmDatapadPosition -------------------------------------------

{
  const { doc, flushRaf } = makeFakeDom();
  const root = new FakeElement(doc);
  let positionCalls = 0;
  const host = {
    element: root,
    position: { left: 10, top: 10, width: 500, height: 400 },
    _applyGmDatapadPosition() { positionCalls += 1; }
  };

  const bound = GMInteractionRepairService.bind({ surfaceId: 'locations', host, root });
  assert.equal(bound, true, 'bind() must succeed against a connected fake root');

  GMInteractionRepairService.destroy(host);

  // Flush twice: pre-fix, the outer rAF callback (still queued because its
  // id was never captured/canceled) would itself schedule the inner one on
  // the first flush, which would then run and call apply() on the second.
  flushRaf();
  flushRaf();
  await wait(10);

  assert.equal(positionCalls, 0, 'a destroyed GMInteractionRepairService binding must never call host._applyGmDatapadPosition from a stale rAF callback');
}

// --- 2: the same guard holds for the two setTimeout-scheduled repairs ------

{
  const { doc, flushRaf } = makeFakeDom();
  const root = new FakeElement(doc);
  let positionCalls = 0;
  const host = {
    element: root,
    position: { left: 10, top: 10, width: 500, height: 400 },
    _applyGmDatapadPosition() { positionCalls += 1; }
  };

  GMInteractionRepairService.bind({ surfaceId: 'locations', host, root });
  GMInteractionRepairService.destroy(host);
  flushRaf();
  await wait(260); // outlast both the 60ms and 240ms scheduled timers

  assert.equal(positionCalls, 0, 'a destroyed binding\'s scheduled setTimeout repairs must not call host._applyGmDatapadPosition either');
}

// --- 3: apply() itself refuses to act once root is disconnected, even -----
// --- without an explicit destroy() (defense in depth) -----------------------

{
  const { doc, flushRaf } = makeFakeDom();
  const root = new FakeElement(doc);
  let positionCalls = 0;
  const host = {
    element: root,
    position: { left: 10, top: 10, width: 500, height: 400 },
    _applyGmDatapadPosition() { positionCalls += 1; }
  };

  GMInteractionRepairService.bind({ surfaceId: 'locations', host, root });
  root._connected = false; // simulate the root being detached without destroy() running
  flushRaf();
  flushRaf();
  await wait(10);

  assert.equal(positionCalls, 0, 'apply() must not touch a root that is no longer connected, independent of whether destroy() ran');
}

// --- 4: _bindModalBounds's deferred click-driven sync also refuses to run --
// --- once the binding has been destroyed -------------------------------------

{
  const { doc, flushRaf } = makeFakeDom();
  const root = new FakeElement(doc);
  const host = { element: root, position: {}, _applyGmDatapadPosition() {} };

  GMInteractionRepairService.bind({ surfaceId: 'locations', host, root });
  const before = root.getBoundingClientRect;
  let boundsCallsAfterAbort = 0;
  root.getBoundingClientRect = function (...args) {
    boundsCallsAfterAbort += 1;
    return before.apply(this, args);
  };

  // Simulate a click on a repair-relevant action, which schedules a
  // setTimeout(sync,0) and a requestAnimationFrame(sync) — both deferred.
  root.dispatchEvent('click', { target: { closest: (sel) => sel.includes('data-location-action') ? {} : null } });

  GMInteractionRepairService.destroy(host);
  flushRaf();
  await wait(10);

  assert.equal(boundsCallsAfterAbort, 0, 'a click-scheduled deferred modal-bounds sync must not run after the binding is destroyed');
}

console.log('GMInteractionRepairService lifecycle-safety regression passed (stale rAF/setTimeout repair callbacks can no longer reach a destroyed binding\'s host).');
