import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Mentor dialogue animation cancellation.
//
// MentorRail created an AbortController per line, but the signal never reached
// the reveal loop and AurebeshTranslator.cancel() only cleared innerHTML. The
// superseded loop kept ticking and kept writing into its own wrapper, so rapid
// dialogue changes left two reveals racing in the same container — and a
// cancelled long line went on running for as long as it would have taken to
// finish.
//
// These tests drive the real translator against a minimal DOM double.
//
// Coverage tier: (a) direct production-path — the real AurebeshTranslator is
// loaded and executed; only the DOM primitives it touches are stubbed.

registerFoundryPathLoader();
installFoundryShimGlobals();

/** Minimal element double covering exactly what the translator touches. */
class FakeElement {
  constructor(tagName = 'DIV') {
    this.tagName = tagName;
    this.children = [];
    this.parentElement = null;
    this.classList = { _set: new Set(), add(c) { this._set.add(c); }, contains(c) { return this._set.has(c); } };
    this.style = {};
    this.dataset = {};
    this._innerHTML = '';
    this.writes = 0;
    this._listeners = new Map();
  }

  set innerHTML(value) { this._innerHTML = value; this.writes += 1; }
  get innerHTML() { return this._innerHTML; }

  set textContent(value) { this._innerHTML = value; }
  get textContent() { return this._innerHTML; }

  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  remove() {
    const parent = this.parentElement;
    if (!parent) return;
    parent.children = parent.children.filter(c => c !== this);
    this.parentElement = null;
  }
  addEventListener(type, fn) { this._listeners.set(type, fn); }
  removeEventListener(type) { this._listeners.delete(type); }
  querySelector() { return null; }
  replaceChildren() { this.children = []; this._innerHTML = ''; }
}

globalThis.document = { createElement: (tag) => new FakeElement(String(tag).toUpperCase()) };
// Frame-align without a real compositor.
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { AurebeshTranslator } = await import(
  '/systems/foundryvtt-swse/scripts/ui/dialogue/aurebesh-translator.js'
);

const settle = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * 1. A newer line supersedes an older one: the old loop stops writing
 *    and only the newer wrapper is left in the container.
 * ------------------------------------------------------------------ */
{
  const container = new FakeElement('P');
  let completedA = false;
  let completedB = false;

  const a = AurebeshTranslator.render({
    text: 'The first line, which is deliberately long enough to still be revealing.',
    container,
    onComplete: () => { completedA = true; },
    enableSkip: false,
  });

  await settle(40);
  const wrapperA = container.children[0];
  assert.ok(wrapperA, 'first reveal never mounted');
  const writesBeforeSupersede = wrapperA.writes;

  // A newer line claims the same container.
  const b = AurebeshTranslator.render({
    text: 'Second.',
    container,
    onComplete: () => { completedB = true; },
    enableSkip: false,
  });

  await Promise.all([a, b]);
  await settle(60);

  assert.ok(
    wrapperA.writes <= writesBeforeSupersede + 1,
    `superseded reveal kept animating (${writesBeforeSupersede} -> ${wrapperA.writes} writes)`
  );
  assert.equal(completedA, false, 'a superseded reveal must not run its completion callback');
  assert.equal(completedB, true, 'the newest reveal should complete');
  assert.equal(wrapperA.parentElement, null, 'the superseded wrapper was left in the container');
}

/* ------------------------------------------------------------------ *
 * 2. cancel() stops the loop, not just the markup it had written.
 * ------------------------------------------------------------------ */
{
  const container = new FakeElement('P');
  let completed = false;

  const run = AurebeshTranslator.render({
    text: 'A long line that should stop revealing the moment it is cancelled.',
    container,
    onComplete: () => { completed = true; },
    enableSkip: false,
  });

  await settle(40);
  const wrapper = container.children[0];
  const writesAtCancel = wrapper.writes;

  AurebeshTranslator.cancel(container);

  await run;
  await settle(60);

  assert.ok(
    wrapper.writes <= writesAtCancel + 1,
    `cancel() did not stop the reveal loop (${writesAtCancel} -> ${wrapper.writes} writes)`
  );
  assert.equal(completed, false, 'a cancelled reveal must not report completion');
}

/* ------------------------------------------------------------------ *
 * 3. An aborted signal resolves the delay immediately instead of
 *    sitting out the full per-character wait.
 * ------------------------------------------------------------------ */
{
  const controller = new AbortController();
  const started = Date.now();
  const pending = AurebeshTranslator._delay(5000, controller.signal);
  controller.abort();
  await pending;
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 500, `aborted delay waited ${elapsed}ms instead of resolving immediately`);

  // Already-aborted signals short-circuit too.
  const preAborted = new AbortController();
  preAborted.abort();
  const t0 = Date.now();
  await AurebeshTranslator._delay(5000, preAborted.signal);
  assert.ok(Date.now() - t0 < 500, 'a pre-aborted delay did not short-circuit');
}

/* ------------------------------------------------------------------ *
 * 4. An abort signal stops an in-flight reveal.
 * ------------------------------------------------------------------ */
{
  const container = new FakeElement('P');
  const controller = new AbortController();
  let completed = false;

  const run = AurebeshTranslator.render({
    text: 'Another long line that the caller aborts partway through revealing.',
    container,
    signal: controller.signal,
    onComplete: () => { completed = true; },
    enableSkip: false,
  });

  await settle(40);
  const wrapper = container.children[0];
  const writesAtAbort = wrapper.writes;

  controller.abort();
  await run;
  await settle(60);

  assert.ok(
    wrapper.writes <= writesAtAbort + 1,
    `abort did not stop the reveal (${writesAtAbort} -> ${wrapper.writes} writes)`
  );
  assert.equal(completed, false, 'an aborted reveal must not report completion');
}

console.log('mentor-translator-cancellation: all assertions passed');
