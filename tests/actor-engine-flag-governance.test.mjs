import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 realignment Phase 3D.2: the governed flag API (ActorEngine.updateActorFlags / unsetActorFlag) is the single gate for actor flag writes (A-02).
// It always ran a full recalcAll(actor) after the write, which makes a mechanical reroute of bookkeeping flag writes (encounter-use markers, state
// notes) a behavior change: one extra derived recalculation per write. `options.recalc === false` lets such callers use the gate with exactly the
// old semantics; the default (recalc) is unchanged for every existing caller.
// Real ActorEngine imported by file path (same technique as tests/ti4c0-g06-rollback-verification.test.mjs). Level: L1, offline.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/core/logger.js');
for (const l of ['log', 'info', 'warn', 'error', 'debug']) if (SWSELogger[l]) SWSELogger[l] = () => {};
let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);

const calls = []; let recalcs = 0;
const savedRecalc = ActorEngine.recalcAll;
ActorEngine.recalcAll = async () => { recalcs += 1; };
const mkActor = () => ({ id: 'a1', name: 'T', setFlag: async (s, k, v) => { calls.push(['set', s, k, v]); return 'set-result'; }, unsetFlag: async (s, k) => { calls.push(['unset', s, k]); return 'unset-result'; } });
const reset = () => { calls.length = 0; recalcs = 0; };

try {
  // default behavior is unchanged: one write, one recalculation
  reset();
  assert.equal(await ActorEngine.updateActorFlags(mkActor(), 'swse', 'k', { a: 1 }), 'set-result');
  assert.deepEqual(calls, [['set', 'swse', 'k', { a: 1 }]]); assert.equal(recalcs, 1, 'default: recalculates once');
  reset();
  assert.equal(await ActorEngine.unsetActorFlag(mkActor(), 'swse', 'k'), 'unset-result');
  assert.deepEqual(calls, [['unset', 'swse', 'k']]); assert.equal(recalcs, 1, 'default: recalculates once');
  ok('default behavior (write + one recalculation) is unchanged for existing callers');

  // recalc:false: the same governed write, no recalculation
  reset();
  assert.equal(await ActorEngine.updateActorFlags(mkActor(), 'swse', 'k', 5, { recalc: false }), 'set-result');
  assert.deepEqual(calls, [['set', 'swse', 'k', 5]]); assert.equal(recalcs, 0, 'recalc:false skips the derived recalculation');
  reset();
  assert.equal(await ActorEngine.unsetActorFlag(mkActor(), 'swse', 'k', { recalc: false }), 'unset-result');
  assert.deepEqual(calls, [['unset', 'swse', 'k']]); assert.equal(recalcs, 0);
  ok('recalc:false performs the governed write without a derived recalculation');

  // only an explicit false disables it
  reset();
  await ActorEngine.updateActorFlags(mkActor(), 'swse', 'k', 1, { recalc: 0 }); await ActorEngine.updateActorFlags(mkActor(), 'swse', 'k', 1, { meta: {} });
  assert.equal(recalcs, 2, 'only recalc === false disables the recalculation');
  ok('only an explicit recalc:false disables the recalculation');

  // failures still propagate and never leave a recalculation running
  reset();
  const bad = { id: 'a2', name: 'B', setFlag: async () => { throw new Error('write rejected'); }, unsetFlag: async () => { throw new Error('unset rejected'); } };
  await assert.rejects(() => ActorEngine.updateActorFlags(bad, 'swse', 'k', 1, { recalc: false }), /write rejected/);
  await assert.rejects(() => ActorEngine.unsetActorFlag(bad, 'swse', 'k', { recalc: false }), /unset rejected/);
  assert.equal(recalcs, 0);
  ok('write failures propagate with or without recalculation');
} finally { ActorEngine.recalcAll = savedRecalc; }
console.log('actor-engine-flag-governance: ok');
