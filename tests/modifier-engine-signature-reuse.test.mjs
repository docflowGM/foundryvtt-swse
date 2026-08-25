import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3 — derived-data + performance optimization, Fix #2: ModifierEngine
// independently re-computed its actor modifier-source cache signature (an
// items/effects scan-sort-join, structurally identical in shape to
// DerivedCalculator's own) up to 5 times for a single, unchanged actor state
// within one DerivedCalculator.computeAll() cycle:
//   - getAllModifiers(actor)            -> 1 (its own cache check)
//   - aggregateAll(actor)               -> 1 (its own cache check)
//                                        -> 1 (internal getAllModifiers() fan-out)
//   - buildModifierBreakdown(actor, ..) -> 1 (its own cache check)
//                                        -> 1 (internal getAllModifiers() fan-out)
//
// getAllModifiers/aggregateAll/buildModifierBreakdown now accept an optional
// options.signature, and their internal getAllModifiers() fan-out calls pass
// their own already-computed signature through, and derived-calculator.js
// computes the signature once per computeAll() cycle and threads it through
// all three ModifierEngine entry points. This test spies on the engine's
// private _actorModifierSourceSignature() to prove:
//   1. each public method individually honors options.signature (0 calls),
//   2. aggregateAll()/buildModifierBreakdown() without options call it
//      exactly once each (not twice, via their internal fan-out reuse),
//   3. a full DerivedCalculator.computeAll() cycle calls it exactly once
//      total (not five times) for one actor.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { ModifierEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
);
const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);

function baseSystem(overrides = {}) {
  return {
    attributes: {},
    level: 1,
    size: 'medium',
    hp: { max: 10, value: 10 },
    progression: {},
    ...overrides
  };
}

function makeActor(id) {
  return {
    id,
    type: 'character',
    name: `Sig Reuse ${id}`,
    _stats: { modifiedTime: 1 },
    system: baseSystem(),
    items: [],
    effects: []
  };
}

function spySignature() {
  const original = ModifierEngine._actorModifierSourceSignature;
  let callCount = 0;
  ModifierEngine._actorModifierSourceSignature = function (...args) {
    callCount++;
    return original.apply(this, args);
  };
  return {
    count: () => callCount,
    restore: () => { ModifierEngine._actorModifierSourceSignature = original; }
  };
}

// ── each public method individually honors a provided options.signature (Test 1) ──

{
  ModifierEngine.clearCaches();
  const actor = makeActor('me-sig-a');
  const realSignature = ModifierEngine.getActorModifierSourceSignature(actor);

  const spy = spySignature();
  try {
    await ModifierEngine.getAllModifiers(actor, { signature: realSignature });
    assert.equal(spy.count(), 0, 'getAllModifiers() must not recompute the signature when options.signature is provided');

    await ModifierEngine.aggregateAll(actor, { signature: realSignature });
    assert.equal(spy.count(), 0, 'aggregateAll() must not recompute the signature when options.signature is provided');

    await ModifierEngine.buildModifierBreakdown(actor, ['hp.max'], { signature: realSignature });
    assert.equal(spy.count(), 0, 'buildModifierBreakdown() must not recompute the signature when options.signature is provided');
  } finally {
    spy.restore();
  }
}

// ── aggregateAll()/buildModifierBreakdown() without options call it exactly once (not twice) (Test 2) ──

{
  ModifierEngine.clearCaches();
  const actorAgg = makeActor('me-sig-b1');
  const spyAgg = spySignature();
  try {
    await ModifierEngine.aggregateAll(actorAgg);
    assert.equal(
      spyAgg.count(),
      1,
      'aggregateAll(actor) with no options must call the signature computation exactly once total (its own check + internal getAllModifiers() fan-out reuse), not twice'
    );
  } finally {
    spyAgg.restore();
  }

  ModifierEngine.clearCaches();
  const actorBreak = makeActor('me-sig-b2');
  const spyBreak = spySignature();
  try {
    await ModifierEngine.buildModifierBreakdown(actorBreak, ['hp.max']);
    assert.equal(
      spyBreak.count(),
      1,
      'buildModifierBreakdown(actor, targets) with no options must call the signature computation exactly once total, not twice'
    );
  } finally {
    spyBreak.restore();
  }
}

// ── a full DerivedCalculator.computeAll() cycle computes the modifier signature exactly once, not five times (Test 3) ──

{
  DerivedCalculator.clearCaches();
  ModifierEngine.clearCaches();
  const actor = makeActor('me-sig-c');

  const spy = spySignature();
  try {
    await DerivedCalculator.computeAll(actor);
    assert.equal(
      spy.count(),
      1,
      'a single DerivedCalculator.computeAll() cycle must compute the ModifierEngine actor-source signature exactly once, not once per getAllModifiers/aggregateAll/buildModifierBreakdown call (and their internal fan-outs)'
    );
  } finally {
    spy.restore();
  }
}

// ── correctness: threading a shared signature through does not change computeAll() output (Test 4) ──

{
  DerivedCalculator.clearCaches();
  ModifierEngine.clearCaches();
  const actorA = makeActor('me-sig-d1');
  const before = await DerivedCalculator.computeAll(actorA);

  DerivedCalculator.clearCaches();
  ModifierEngine.clearCaches();
  const actorB = makeActor('me-sig-d2');
  const after = await DerivedCalculator.computeAll(actorB);

  assert.deepEqual(
    JSON.parse(JSON.stringify(after)),
    JSON.parse(JSON.stringify(before)),
    'signature threading must not change computeAll() output for equivalent actor state'
  );
}

console.log('modifier-engine-signature-reuse.test.mjs: all assertions passed');
