import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-AE.1 baseline/parity: plan validation, temp-id rewrite, recovery-snapshot completeness and the derived-state view model.
// Written before the extraction into governance/actor-engine/mutation-plan-helpers.js; the ActorEngine methods remain delegates.
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
const { MutationApplicationError } = await import('/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js');
const bad = (plan, re) => assert.throws(() => ActorEngine._validateMutationPlan(plan), (e) => e instanceof MutationApplicationError && re.test(e.message));

test('plan validation: accepts a well-formed plan and an empty plan', () => {
  ActorEngine._validateMutationPlan({});
  ActorEngine._validateMutationPlan({ create: { actors: [{ temporaryId: 't1', data: {} }] }, set: { a: 1 }, update: { items: [{ _id: 'i1' }, { id: 'i2' }] }, add: { items: ['x'] }, delete: { items: ['y'] } });
});
test('plan validation: each malformed bucket is refused with its own message', () => {
  bad({ create: 'x' }, /create bucket must be an object/);
  bad({ create: { actors: {} } }, /create\.actors must be an array/);
  bad({ create: { actors: [{ data: {} }] } }, /temporaryId/);
  bad({ create: { actors: [{ temporaryId: 't' }] } }, /must have data/);
  bad({ set: 'x' }, /set bucket must be an object/);
  bad({ update: { items: {} } }, /must be an array/);
  bad({ update: { items: [null] } }, /entries must be objects/);
  bad({ update: { items: [{}] } }, /_id or id/);
  bad({ add: { items: 'x' } }, /add bucket "items" must be an array/);
  bad({ delete: { items: 'x' } }, /delete bucket "items" must be an array/);
});
test('temporary ids: exact ids and Actor.<tempId> references are rewritten in nested structures; unknown strings are untouched', () => {
  const bucket = { items: ['temp_a', 'keep', { link: 'Actor.temp_a', deep: ['temp_b'] }], single: 'temp_b' };
  ActorEngine._rewriteTemporaryIds(bucket, { temp_a: 'REAL_A', temp_b: 'REAL_B' });
  assert.deepEqual(bucket, { items: ['REAL_A', 'keep', { link: 'Actor.REAL_A', deep: ['REAL_B'] }], single: 'REAL_B' });
  assert.equal(ActorEngine._rewriteTemporaryIds(null, {}), undefined);
});
test('recovery snapshot completeness: scope decides which arrays are required; ids must be unique non-empty strings', () => {
  const v = (s) => ActorEngine._validateRecoverySnapshot(s);
  assert.deepEqual(v(null), { complete: false, problems: ['snapshot is not an object'] });
  assert.equal(v({ items: [{ _id: 'a' }], effects: [] }).complete, true);
  assert.match(v({ items: [] }).problems[0], /effects is missing/);
  assert.equal(v({ scope: 'system-and-flags' }).complete, true);
  assert.equal(v({ scope: 'embedded-items', items: [] }).complete, true);
  assert.match(v({ items: [{ _id: 'a' }, { _id: 'a' }], effects: [] }).problems[0], /duplicate/);
  assert.match(v({ items: [{ id: 'a' }], effects: [] }).problems[0], /without a valid _id/);
  assert.match(v({ items: 'x', effects: [] }).problems[0], /items is not an array/);
});
test('derived state view model: ability totals fall back derived -> attributes.base -> abilities mirror -> 10; condition steps mark index <= current', () => {
  const s = ActorEngine.buildDerivedState({ system: { derived: { attributes: { str: { total: 16 } } }, attributes: { dex: { base: 12 } }, abilities: { con: { total: 8 } }, conditionTrack: { current: 2 } } });
  assert.deepEqual(s.abilities.map((a) => [a.key, a.total, a.mod]), [['str', 16, 3], ['dex', 12, 1], ['con', 8, -1], ['int', 10, 0], ['wis', 10, 0], ['cha', 10, 0]]);
  assert.deepEqual(s.conditionSteps.map((c) => c.active), [true, true, true, false, false]);
  assert.equal(ActorEngine.buildDerivedState({ system: {} }).conditionSteps[0].active, true);
});
