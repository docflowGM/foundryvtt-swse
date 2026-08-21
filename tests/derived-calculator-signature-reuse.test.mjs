import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3 — derived-data + performance optimization, Fix #1: DerivedCalculator
// used to compute its own items/effects scan-sort-join cache signature via
// getActorComputeSignature(actor) even when SWSEV2BaseActor._computeDerivedAsync()
// had already computed that exact signature moments earlier for its own
// in-flight/applied coalescing check, so a single async derived pass ran the
// same scan-sort-join twice. computeAll(actor, { signature }) now accepts a
// pre-computed signature and skips its own recomputation when provided, while
// falling back to computing it itself (unchanged) when options.signature is
// omitted — so every other pre-existing caller (e.g. ActorEngine.recalcAll(),
// which calls computeAll(actor) with no second argument) is unaffected.

registerFoundryPathLoader();
installFoundryShimGlobals();

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
    _stats: { modifiedTime: 1 },
    system: baseSystem(),
    items: [],
    effects: []
  };
}

// ── computeAll(actor, { signature }) must NOT call getActorComputeSignature again (Test 1) ──

{
  DerivedCalculator.clearCaches();
  const actor = makeActor('sig-reuse-a');
  const realSignature = DerivedCalculator.getActorComputeSignature(actor);

  const originalGetSignature = DerivedCalculator.getActorComputeSignature;
  let callCount = 0;
  DerivedCalculator.getActorComputeSignature = function (...args) {
    callCount++;
    return originalGetSignature.apply(this, args);
  };

  try {
    await DerivedCalculator.computeAll(actor, { signature: realSignature });
    assert.equal(
      callCount,
      0,
      'computeAll() must not call getActorComputeSignature again when options.signature is already provided'
    );
  } finally {
    DerivedCalculator.getActorComputeSignature = originalGetSignature;
  }
}

// ── omitting options entirely falls back to computing the signature itself (Test 2) ──

{
  DerivedCalculator.clearCaches();
  const actor = makeActor('sig-reuse-b');

  const originalGetSignature = DerivedCalculator.getActorComputeSignature;
  let callCount = 0;
  DerivedCalculator.getActorComputeSignature = function (...args) {
    callCount++;
    return originalGetSignature.apply(this, args);
  };

  try {
    await DerivedCalculator.computeAll(actor);
    assert.equal(
      callCount,
      1,
      'computeAll(actor) with no options must still compute its own signature exactly once (pre-existing callers unaffected)'
    );
  } finally {
    DerivedCalculator.getActorComputeSignature = originalGetSignature;
  }
}

// ── a pre-computed signature produces identical output to the self-computed path (Test 3) ──

{
  DerivedCalculator.clearCaches();
  const actorA = makeActor('sig-reuse-c1');
  const actorB = makeActor('sig-reuse-c2');

  const viaSelfComputed = await DerivedCalculator.computeAll(actorA);
  DerivedCalculator.clearCaches();
  const signature = DerivedCalculator.getActorComputeSignature(actorB);
  const viaPreComputed = await DerivedCalculator.computeAll(actorB, { signature });

  assert.deepEqual(
    JSON.parse(JSON.stringify(viaPreComputed)),
    JSON.parse(JSON.stringify(viaSelfComputed)),
    'passing a correctly pre-computed signature must not change computeAll() output'
  );
}

console.log('derived-calculator-signature-reuse.test.mjs: all assertions passed');
