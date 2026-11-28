import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P1: stale-async protection. SWSEV2BaseActor._computeDerivedAsync() awaits DerivedCalculator.computeAll(); if the actor's source changes WHILE
// that await is pending, the finished result belongs to an older signature and must not be merged over a newer destination (it also must not stamp the
// stale signature as "applied"). A follow-up prepareDerivedData() recomputes against the new source. Failing before: the stale updates were merged.
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


const realComputeAll = DerivedCalculator.computeAll;
try {
  DerivedCalculator.clearCaches();
  const actor = makeFakeActor('stale-1');
  let release;
  const gate = new Promise((r) => { release = r; });
  DerivedCalculator.computeAll = async () => { await gate; return { 'system.derived.bab': 99, 'system.derived.marker': 'stale' }; };
  const pending = actor._computeDerivedAsync(actor.system);
  actor._stats.modifiedTime = 2000; // the source changes while computeAll is pending -> a different compute signature
  release();
  await pending;
  assert.equal(actor.system.derived.bab, undefined, 'a result computed for an older source revision is not merged');
  assert.equal(actor.system.derived.marker, undefined);
  assert.equal(actor.system.derived.meta?.appliedSignature, undefined, 'the stale signature is not recorded as applied');
  assert.equal(actor._swseDerivedAsyncInFlightSignature ?? null, null, 'the in-flight marker is cleared so the next pass can run');
  console.log('  ok  stale async result dropped');

  // an unchanged source still applies normally
  DerivedCalculator.computeAll = async () => ({ 'system.derived.bab': 7 });
  const actor2 = makeFakeActor('stale-2');
  await actor2._computeDerivedAsync(actor2.system);
  assert.equal(actor2.system.derived.bab, 7, 'a current result is applied');
  console.log('  ok  current async result applied');
} finally {
  DerivedCalculator.computeAll = realComputeAll;
}
console.log('v2-derived-async-stale-result-dropped: ok');
