import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-AE.6 baseline/parity (characterization of CURRENT behavior, written before applyHealing/applyConditionShift move to
// damage-condition-orchestration.js): the engine calls updateActor with exactly these payloads and returns exactly these results.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x';
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);

const calls = [];
const realUpdate = ActorEngine.updateActor;
ActorEngine.updateActor = async (actor, data, options) => { calls.push({ data: JSON.parse(JSON.stringify(data)), options }); return actor; };
test.after(() => { ActorEngine.updateActor = realUpdate; });
const mk = (system, type = 'character') => ({ name: 'T', type, system });

test('healing: clamps to max HP, reports applied/newHP, writes HP through updateActor', async () => {
  calls.length = 0;
  const out = await ActorEngine.applyHealing(mk({ hp: { value: 10, max: 15 }, conditionTrack: { current: 0 } }), 20);
  assert.deepEqual(out, { applied: 5, newHP: 15 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].data['system.hp.value'], 15);
  assert.equal(calls[0].data['system.conditionTrack.current'], undefined, 'healing from above 0 HP does not move the condition track');
});
test('healing at max HP is a no-op (no write)', async () => {
  calls.length = 0;
  const out = await ActorEngine.applyHealing(mk({ hp: { value: 15, max: 15 } }), 5);
  assert.deepEqual(out, { applied: 0, newHP: 15 });
  assert.equal(calls.length, 0);
});
test('healing from 0 HP applies ConditionTrackRules.resolveHealingConditionRecovery', async () => {
  calls.length = 0;
  const actor = mk({ hp: { value: 0, max: 20 }, conditionTrack: { current: 5 } });
  const out = await ActorEngine.applyHealing(actor, 4);
  assert.equal(out.applied, 4);
  assert.equal(calls[0].data['system.hp.value'], 4);
  assert.ok('system.conditionTrack.current' in calls[0].data, 'revival from 0 HP writes a recovered condition step');
  assert.ok(calls[0].data['system.conditionTrack.current'] < 5);
});
test('healing refuses bad amounts and destroyed droids; a disabled droid is restored to operational', async () => {
  await assert.rejects(() => ActorEngine.applyHealing(mk({ hp: { value: 1, max: 5 } }), -1), /Invalid healing amount/);
  await assert.rejects(() => ActorEngine.applyHealing(null, 1), /no actor/);
  await assert.rejects(() => ActorEngine.applyHealing(mk({ hp: { value: 1, max: 5 }, droidState: { destroyed: true } }, 'droid'), 1), /destroyed/);
  calls.length = 0;
  await ActorEngine.applyHealing(mk({ hp: { value: 0, max: 9 }, conditionTrack: { current: 3 }, droidState: { status: 'disabled' } }, 'droid'), 3);
  assert.equal(calls[0].data['system.droidState.status'], 'operational');
  assert.equal(calls[0].data['system.droidState.disabled'], false);
  assert.equal(calls[0].data['system.droidState.canBeRepaired'], true);
});
test('condition shift: validates direction, writes the next step with render:false, reports applied/newCondition', async () => {
  await assert.rejects(() => ActorEngine.applyConditionShift(mk({}), 0), /Invalid shift direction/);
  await assert.rejects(() => ActorEngine.applyConditionShift(mk({}), 1.5), /Invalid shift direction/);
  await assert.rejects(() => ActorEngine.applyConditionShift(null, 1), /no actor/);
  calls.length = 0;
  const out = await ActorEngine.applyConditionShift(mk({ conditionTrack: { current: 1 } }), 1);
  assert.equal(out.applied, 1);
  assert.equal(out.newCondition, 2);
  assert.deepEqual(calls[0].data, { 'system.conditionTrack.current': 2 });
  assert.deepEqual(calls[0].options, { render: false });
});
test('condition shift at the boundary is a no-op (no write)', async () => {
  calls.length = 0;
  const out = await ActorEngine.applyConditionShift(mk({ conditionTrack: { current: 0 } }), -1);
  assert.equal(out.applied, 0);
  assert.equal(calls.length, 0);
});
