import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 1 actor authority + performance baseline — FINAL VERIFICATION PASS.
//
// The Phase 1 audit doc originally stated the instrumentation added to
// base-actor.js / derived-calculator.js / ModifierEngine.js / actor-perf-
// diagnostics.js could only be checked by static trace, because those files
// use Foundry-only absolute `/systems/foundryvtt-swse/...` imports that
// plain Node cannot resolve. That was incomplete: this repo already has a
// Foundry-shim harness (tests/helpers/foundry-shim/, built for the droid
// Phase 3/4 work — see docs/audits/droid-converted-system-reconciliation-phase-4.md)
// that rewrites those absolute specifiers to real files and stubs the
// narrow set of Foundry globals (`game`, `foundry.utils`, etc.) production
// code actually touches. Both `scripts/actors/derived/derived-calculator.js`
// and `scripts/utils/actor-perf-diagnostics.js` load and execute correctly
// through the EXISTING harness with zero new shim scaffolding — this file
// uses it to runtime-verify, not just statically trace, the highest-risk
// Phase 1 instrumentation: the disabled path is a true no-op, the enabled
// path's counters are accurate, `ActorPerfDiagnostics.time()` never alters
// a wrapped call's return value/exception/promise-ness, and the
// DerivedCalculator cache-hit/miss instrumentation is both accurate AND
// does not itself corrupt what the cache returns.
//
// `scripts/actors/v2/base-actor.js` and `scripts/sheets/v2/character-sheet.js`
// also load cleanly through this harness (proving no import-time regression
// in either), but their instance methods (`_performDerivedCalculation`,
// `_computeDerivedAsync`, `_prepareContext`) need a realistic actor/sheet
// `this` far beyond this shim's documented boundary to invoke meaningfully —
// exercising those remains verified by static trace only (see
// docs/audits/v2-actor-authority-performance-phase-1.md).

registerFoundryPathLoader();

function fakeActor(overrides = {}) {
  return {
    id: 'test-actor-1',
    type: 'character',
    _stats: { modifiedTime: 1000 },
    system: { attributes: {}, level: 1, size: 'medium', hp: { max: 10, value: 10 }, progression: {} },
    items: [],
    effects: [],
    ...overrides
  };
}

// ── actor-perf-diagnostics.js: disabled path is a true no-op (Test 1) ──────

{
  installFoundryShimGlobals({ game: { settings: { get: () => false } } });
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );

  const before = ActorPerfDiagnostics.summary({ quiet: true });
  ActorPerfDiagnostics.recordPreparePhase('actor1', 'sync', 15);
  ActorPerfDiagnostics.recordDerivedCacheEvent('hit');
  ActorPerfDiagnostics.recordModifierCacheEvent('source', 'miss');
  ActorPerfDiagnostics.recordSheetContext('vehicle', 9);
  ActorPerfDiagnostics.recordRenderQueued();
  const after = ActorPerfDiagnostics.summary({ quiet: true });
  assert.deepEqual(after, before, 'every record* call must be a no-op when performanceDiagnostics/debugMode is off');
}

// ── actor-perf-diagnostics.js: enabled path actually counts (Test 2) ───────

{
  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );
  ActorPerfDiagnostics.reset();

  ActorPerfDiagnostics.recordDerivedCacheEvent('hit');
  ActorPerfDiagnostics.recordDerivedCacheEvent('miss');
  ActorPerfDiagnostics.recordSheetContext('vehicle', 42);
  const summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.derivedCache.hits, 1);
  assert.equal(summary.derivedCache.misses, 1);
  assert.equal(summary.sheetContext.vehicle.count, 1);
}

// ── time(): return value, exceptions, and promise-ness are unchanged, both
// enabled and disabled (Test 3) ─────────────────────────────────────────────

{
  installFoundryShimGlobals({ game: { settings: { get: () => false } } });
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );

  let recorderCalls = 0;
  const disabledResult = ActorPerfDiagnostics.time(() => { recorderCalls++; }, () => ({ x: 1 }));
  assert.deepEqual(disabledResult, { x: 1 });
  assert.equal(recorderCalls, 0, 'recorder must not run when diagnostics are disabled');

  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  let recordedMs = null;
  const enabledResult = ActorPerfDiagnostics.time((ms) => { recordedMs = ms; }, () => ({ x: 2 }));
  assert.deepEqual(enabledResult, { x: 2 }, 'time() returns exactly what the wrapped fn returned');
  assert.equal(typeof recordedMs, 'number');
  assert.ok(!(enabledResult instanceof Promise), 'no Promise is introduced for a synchronous wrapped fn');

  let thrown = null;
  try {
    ActorPerfDiagnostics.time(() => {}, () => { throw new Error('boom'); });
  } catch (err) {
    thrown = err;
  }
  assert.equal(thrown?.message, 'boom', 'an exception from the wrapped fn propagates through time() unchanged');
}

// ── actor()/reset() console commands fail gracefully (Test 4) ──────────────

{
  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );
  assert.equal(ActorPerfDiagnostics.actor(null), null, 'querying a null actor must not throw');
  assert.equal(ActorPerfDiagnostics.actor({ id: 'does-not-exist' }), null, 'querying an untracked actor must not throw');

  ActorPerfDiagnostics.reset();
  const summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.actorsTracked, 0);
  assert.equal(summary.derivedCache.hits, 0);
  assert.equal(summary.derivedCache.misses, 0);
}

// ── DerivedCalculator.getActorComputeSignature: the try/finally timing wrapper
// preserves the original method's contract exactly (Test 5) ────────────────

{
  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  const { DerivedCalculator } = await import(
    '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
  );
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );
  ActorPerfDiagnostics.reset();

  const actor = fakeActor();
  const sig1 = DerivedCalculator.getActorComputeSignature(actor);
  assert.equal(typeof sig1, 'string');
  const sig2 = DerivedCalculator.getActorComputeSignature(actor);
  assert.equal(sig1, sig2, 'identical actor state must produce an identical signature (required for caching to work)');
  assert.equal(DerivedCalculator.getActorComputeSignature({}), null, 'an actor with no id must still bypass caching (null), unchanged by the wrapper');

  const before = ActorPerfDiagnostics.summary({ quiet: true });
  DerivedCalculator.getActorComputeSignature(actor);
  const after = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(
    after.derivedCache.signature.count,
    before.derivedCache.signature.count + 1,
    'the try/finally wrapper must record exactly one signature-cost sample per call'
  );
}

// ── DerivedCalculator.computeAll: cache hit/miss instrumentation is accurate
// AND does not itself corrupt what the cache returns (Test 6) ──────────────

{
  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  const { DerivedCalculator } = await import(
    '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
  );
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );
  DerivedCalculator.clearCaches();
  ActorPerfDiagnostics.reset();

  const actor = fakeActor({ id: 'cache-test-actor', _stats: { modifiedTime: 5000 } });

  const result1 = await DerivedCalculator.computeAll(actor);
  let summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.derivedCache.misses, 1, 'the first call with an unseen signature must be a miss');
  assert.equal(summary.derivedCache.hits, 0);

  const result2 = await DerivedCalculator.computeAll(actor);
  summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.derivedCache.hits, 1, 'a second call with the identical signature must be a cache hit');
  assert.equal(summary.derivedCache.misses, 1, 'miss count must not move on a cache hit');
  assert.deepEqual(result2, result1, 'a cache hit must return data identical to the original miss');

  actor._stats.modifiedTime = 5001;
  const result3 = await DerivedCalculator.computeAll(actor);
  summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.derivedCache.misses, 2, 'a changed actor revision must invalidate the cache and produce a fresh miss');
  assert.notDeepEqual(result3, undefined);
}

// ── ModifierEngine and base-actor.js load cleanly through the shim — proves
// no import-time regression, even though their instance methods stay outside
// this harness's practical reach (Test 7) ───────────────────────────────────

{
  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  const { ModifierEngine } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
  );
  const actor = fakeActor({ system: { attributes: {}, level: 1, size: 'medium', skills: {} }, flags: {} });
  const modifiers = await ModifierEngine.getAllModifiers(actor);
  assert.ok(Array.isArray(modifiers));
  const aggregated = await ModifierEngine.aggregateAll(actor);
  assert.equal(typeof aggregated, 'object');

  const { SWSEV2BaseActor } = await import(
    '/systems/foundryvtt-swse/scripts/actors/v2/base-actor.js'
  );
  assert.equal(typeof SWSEV2BaseActor, 'function', 'base-actor.js must load without throwing at import time');
}

// ── ModifierEngine: signature wrapper + source-cache hit/miss instrumentation
// is accurate and does not corrupt the returned modifier list (Test 8) ─────

{
  installFoundryShimGlobals({ game: { settings: { get: () => true } } });
  const { ModifierEngine } = await import(
    '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
  );
  const { ActorPerfDiagnostics } = await import(
    '/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js'
  );
  ModifierEngine.clearCaches();
  ActorPerfDiagnostics.reset();

  const actor = fakeActor({
    id: 'modifier-cache-test-actor',
    system: { attributes: {}, level: 1, size: 'medium', skills: {} },
    flags: {}
  });

  const modifiers1 = await ModifierEngine.getAllModifiers(actor);
  let summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.modifierCache.source.misses, 1, 'first getAllModifiers() call for unseen actor state must be a source-cache miss');
  assert.equal(summary.modifierCache.source.hits, 0);
  assert.ok(summary.modifierCache.signature.count >= 1, 'the signature try/finally wrapper must have recorded at least one sample');

  const modifiers2 = await ModifierEngine.getAllModifiers(actor);
  summary = ActorPerfDiagnostics.summary({ quiet: true });
  assert.equal(summary.modifierCache.source.hits, 1, 'a second call with unchanged actor state must be a source-cache hit');
  assert.equal(summary.modifierCache.source.misses, 1, 'miss count must not move on a cache hit');
  assert.deepEqual(modifiers2, modifiers1, 'a source-cache hit must return the same modifier list as the original miss');
}

console.log('actor-perf-diagnostics-shim.test.mjs: all assertions passed');
