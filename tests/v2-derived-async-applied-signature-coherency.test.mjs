import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 derived/cache-coherency regression — REQUIRED FAIL-BEFORE TEST B
// (New prepare destination / same source signature).
//
// SWSEV2BaseActor._computeDerivedAsync() (scripts/actors/v2/base-actor.js)
// used to treat "I applied source signature S once, on this actor instance"
// as equivalent to "the CURRENT system.derived destination still holds S's
// result" -- via an instance-level flag, _swseDerivedAsyncAppliedSignature,
// that short-circuited computation whenever the persisted source signature
// matched a value it had seen before:
//
//     if (this._swseDerivedAsyncAppliedSignature === signature) return;
//
// Those are different facts. Foundry can reconstruct/reset prepared runtime
// data (system.derived) during a later prepareData() cycle without changing
// the actor's persisted source signature at all -- the instance-level flag
// survives that reset (it lives on the actor object, not inside
// system.derived), so the old code would skip reapplying the correction and
// leave the freshly-reset, empty system.derived in place forever, for as
// long as the source data stayed unchanged.
//
// The fix (scripts/actors/derived/derived-generation.js +
// scripts/actors/v2/base-actor.js) anchors the "already applied" check to
// the DESTINATION instead: system.derived.meta.appliedSignature, stamped
// inside system.derived itself, so it is wiped along with everything else
// when Foundry resets system.derived, correctly forcing a reapplication --
// which DerivedCalculator's own signature-keyed result cache then serves
// cheaply (no ModifierEngine/heavy recompute), per the required behavior:
// "DerivedCalculator cache HIT -> return cached authoritative updates ->
// compare/reapply them against CURRENT system.derived."
//
// This test exercises the REAL, unmodified production method
// (SWSEV2BaseActor.prototype._computeDerivedAsync) against a real
// DerivedCalculator/ModifierEngine pipeline -- not a reimplementation.
// SWSEV2BaseActor itself cannot be safely `new`'d under this harness (its
// superclass chain expects a live Foundry Actor document), so the test
// builds an actor via Object.create(SWSEV2BaseActor.prototype), which is a
// real instance of the class (a genuine `instanceof` relationship, with
// every real prototype method, including the private helpers
// _computeDerivedAsync calls on `this`) with plain, directly-assigned own
// properties standing in for actor state.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SWSEV2BaseActor } = await import(
  '/systems/foundryvtt-swse/scripts/actors/v2/base-actor.js'
);
const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);
const { ModifierEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
);

function baseSystem() {
  return {
    attributes: {
      str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
      dex: { base: 14, racial: 0, enhancement: 0, temp: 0 },
      con: { base: 12, racial: 0, enhancement: 0, temp: 0 },
      int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
      wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
      cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
    },
    level: 4,
    hp: { max: 30, value: 30 },
    skills: {},
    progression: {},
    // _computeDerivedAsync() is normally invoked after _performDerivedCalculation()
    // has already run `system.derived ??= {}`; calling it directly here (to
    // exercise the real method without the full prepareDerivedData() chain)
    // means the test must do that same one-line initialization itself.
    derived: {}
  };
}

function makeFakeActor(id) {
  const actor = Object.create(SWSEV2BaseActor.prototype);
  actor.id = id;
  actor.name = `Fail-Before-Test-Actor-${id}`;
  actor.type = 'character';
  actor._stats = { modifiedTime: 1000 }; // persisted revision R — never changes in this test
  actor.system = baseSystem();
  actor.items = [];
  actor.effects = [];
  actor.apps = {}; // no open sheets — isolates the test from render-queuing side effects
  actor.flags = { swse: {} };
  // Object.create(SWSEV2BaseActor.prototype) gives real prototype methods,
  // but SWSEActorBase.getFlag() calls super.getFlag() up into Foundry's real
  // Actor class, which this harness does not stub. Shadow it with a plain
  // own-property implementation, same as this repo's other actor-fake
  // helpers (tests/helpers/foundry-shim/fakes/actor-factory.mjs).
  actor.getFlag = (scope, key) => actor.flags?.[scope]?.[key];
  return actor;
}

function countCalls(target, methodName) {
  const original = target[methodName].bind(target);
  const state = { count: 0 };
  target[methodName] = async function (...args) {
    state.count++;
    return original(...args);
  };
  return { state, restore: () => { target[methodName] = original; } };
}

// ─── Test B: destination reset with an unchanged source signature ─────────

{
  DerivedCalculator.clearCaches();
  const actor = makeFakeActor('async-applied-b1');
  const spy = countCalls(ModifierEngine, 'getAllModifiers');

  try {
    const signature = DerivedCalculator.getActorComputeSignature(actor);
    assert.ok(signature, 'test setup must produce a real, non-null compute signature');

    // ── First application: establishes the destination for signature S ──
    await actor._computeDerivedAsync(actor.system);

    assert.ok(actor.system.derived?.bab >= 0, 'first application must populate system.derived.bab');
    assert.ok(
      actor.system.derived?.defenses?.fortitude?.total > 0,
      'first application must populate system.derived.defenses'
    );
    assert.equal(
      actor.system.derived?.meta?.appliedSignature,
      signature,
      'system.derived.meta.appliedSignature must record the signature this destination reflects'
    );
    const generationAfterFirstApply = actor.system.derived?.meta?.generation;
    assert.ok(Number.isFinite(generationAfterFirstApply), 'a derived generation must be stamped after a real application');
    // A single computeAll() pass legitimately calls ModifierEngine.getAllModifiers()
    // more than once internally (aggregateAll/buildModifierBreakdown reuse the
    // same signature) — this test only cares that a SECOND application of the
    // same unchanged signature doesn't add to that count (see below).
    const callCountAfterFirstApply = spy.state.count;
    assert.ok(callCountAfterFirstApply > 0, 'the first application must run the real, uncached ModifierEngine pipeline');

    // ── Simulate Foundry reconstructing/resetting prepared runtime data: ──
    // system.derived is wiped, but the actor's persisted source (and
    // therefore its compute signature) is completely unchanged.
    const rebuiltSystem = { ...actor.system, derived: {} };
    actor.system = rebuiltSystem;
    assert.equal(
      DerivedCalculator.getActorComputeSignature(actor),
      signature,
      'test setup must keep the persisted source signature identical across the reset'
    );
    assert.equal(actor.system.derived?.meta?.appliedSignature, undefined, 'the reset destination must have lost its applied-signature marker');

    // ── PASS-AFTER: reapply against the reset destination ──
    await actor._computeDerivedAsync(actor.system);

    assert.ok(
      actor.system.derived?.defenses?.fortitude?.total > 0,
      'FAIL-BEFORE PROOF: the reset destination must be restored to the authoritative defenses, not left empty. ' +
      'Under the pre-fix code, this destination would still equal {} forever: the OLD instance-level ' +
      '_swseDerivedAsyncAppliedSignature flag survives the system.derived reset untouched, so ' +
      '"this._swseDerivedAsyncAppliedSignature === signature" would still short-circuit and return before ' +
      'ever reaching DerivedCalculator.computeAll() again.'
    );
    assert.equal(
      actor.system.derived?.meta?.appliedSignature,
      signature,
      'the reapplied destination must be re-stamped with the same (unchanged) source signature'
    );
    const generationAfterReapply = actor.system.derived?.meta?.generation;
    assert.notEqual(
      generationAfterReapply,
      generationAfterFirstApply,
      'the derived generation must advance on reapplication so panel/view-model caches keyed off it ' +
      '(see actor-sheet-base.js _buildPanelViewModelCacheSignature) correctly invalidate'
    );

    // ── Preferred behavior: reapplication must be cheap (DerivedCalculator's ──
    // own signature-keyed result cache serves it), not a second full recompute.
    assert.equal(
      spy.state.count,
      callCountAfterFirstApply,
      'reapplying an unchanged signature must be served from DerivedCalculator\'s own compute cache ' +
      '(zero additional ModifierEngine calls) — correctness must not come at the cost of recomputing expensive math'
    );
  } finally {
    spy.restore();
  }
}

console.log('  [1/2] destination-reset / unchanged-signature reapplication OK');

// ─── In-flight dedup must still coalesce two concurrent same-signature calls ─

{
  // Learn how many ModifierEngine.getAllModifiers() calls a single, isolated
  // computeAll() pass makes for this actor shape (aggregateAll/
  // buildModifierBreakdown legitimately call it more than once per pass), so
  // the concurrent-pair assertion below can check "no MORE than one pass's
  // worth of calls" instead of assuming a brittle exact constant.
  DerivedCalculator.clearCaches();
  const baselineActor = makeFakeActor('async-applied-b2-baseline');
  const baselineSpy = countCalls(ModifierEngine, 'getAllModifiers');
  await baselineActor._computeDerivedAsync(baselineActor.system);
  const callsPerPass = baselineSpy.state.count;
  baselineSpy.restore();
  assert.ok(callsPerPass > 0, 'baseline measurement must observe at least one ModifierEngine call');

  DerivedCalculator.clearCaches();
  const actor = makeFakeActor('async-applied-b2');
  const spy = countCalls(ModifierEngine, 'getAllModifiers');

  try {
    // Fire twice without awaiting between calls: _computeDerivedAsync's guard
    // sets its in-flight marker synchronously (before its first await), so
    // the second call must see it and return immediately.
    const p1 = actor._computeDerivedAsync(actor.system);
    const p2 = actor._computeDerivedAsync(actor.system);
    await Promise.all([p1, p2]);

    assert.equal(
      spy.state.count,
      callsPerPass,
      'two concurrent calls sharing the same source signature must still coalesce into a single ' +
      'ModifierEngine/DerivedCalculator pass (same-signature IN-FLIGHT deduplication must be preserved) — ' +
      'seeing 2x the single-pass call count would mean the in-flight guard failed to coalesce them'
    );
    assert.ok(actor.system.derived?.defenses?.fortitude?.total > 0, 'the coalesced pair must still land authoritative defenses');
  } finally {
    spy.restore();
  }
}

console.log('  [2/2] concurrent same-signature in-flight deduplication preserved OK');
console.log('v2-derived-async-applied-signature-coherency.test.mjs: all assertions passed');
