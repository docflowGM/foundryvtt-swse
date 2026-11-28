import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-AE.6 baseline/parity (characterization of CURRENT behavior, written before the move): Edge of Exhaustion trade, the Recover action's
// three-round progress, and the action-economy write. The rules remain in SecondWindRules/ConditionTrackRules; this pins the orchestration.
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

const writes = []; const shifts = [];
const realUpdate = ActorEngine.updateActor; const realShift = ActorEngine.applyConditionShift;
ActorEngine.updateActor = async (actor, data) => { writes.push(JSON.parse(JSON.stringify(data))); return actor; };
ActorEngine.applyConditionShift = async (actor, dir, source) => { shifts.push([dir, source]); return { applied: 1 }; };
test.after(() => { ActorEngine.updateActor = realUpdate; ActorEngine.applyConditionShift = realShift; delete globalThis.game; });
const flags = {};
const mkActor = (system, extra = {}) => ({ id: 'a1', name: 'A', type: 'character', system, getFlag: (s, k) => flags[k], setFlag: async (s, k, v) => { flags[k] = v; }, unsetFlag: async (s, k) => { delete flags[k]; }, ...extra });

test('edge of exhaustion: refused with the rules reason when not eligible', async () => {
  globalThis.game = { combat: null };
  const out = await ActorEngine.applySecondWindEdgeOfExhaustion(mkActor({ secondWind: { uses: 0 }, conditionTrack: { current: 0 } }));
  assert.equal(out.success, false);
  assert.match(out.reason, /active combat/);
  const uses = await ActorEngine.applySecondWindEdgeOfExhaustion(mkActor({ secondWind: { uses: 1 } }));
  assert.equal(uses.success, false);
  await assert.rejects(() => ActorEngine.applySecondWindEdgeOfExhaustion(null), /requires actor/);
});
test('edge of exhaustion: eligible trade writes uses=1, condition+1 and persistent in ONE updateActor call', async () => {
  globalThis.game = { combat: { combatants: [{ actor: { id: 'a1' } }] } };
  writes.length = 0;
  const out = await ActorEngine.applySecondWindEdgeOfExhaustion(mkActor({ secondWind: { uses: 0 }, conditionTrack: { current: 1 } }));
  assert.equal(out.success, true);
  assert.equal(out.condition, 1);
  assert.equal(out.newCondition, 2);
  assert.deepEqual(writes, [{ 'system.secondWind.uses': 1, 'system.conditionTrack.current': 2, 'system.conditionTrack.persistent': true }]);
});
test('recover: no condition / persistent condition are refused without writes', async () => {
  globalThis.game = { combat: null };
  shifts.length = 0;
  assert.deepEqual(await ActorEngine.recoverConditionStep(mkActor({ conditionTrack: { current: 0 } })), { applied: false, reason: 'no-condition' });
  assert.deepEqual(await ActorEngine.recoverConditionStep(mkActor({ conditionTrack: { current: 2, persistent: true } })), { applied: false, reason: 'persistent' });
  assert.equal(shifts.length, 0);
  await assert.rejects(async () => { const r = await ActorEngine.recoverConditionStep(null); if (r.reason === 'error') throw r.error; }, /requires actor/);
});
test('recover outside combat: one condition step improves immediately (3 actions spent), progress flag cleared', async () => {
  globalThis.game = { combat: null };
  shifts.length = 0; flags.conditionRecoverProgress = { stale: true };
  const out = await ActorEngine.recoverConditionStep(mkActor({ conditionTrack: { current: 2 } }), 'src');
  assert.deepEqual(out, { applied: true, stepsRecovered: 1, spent: 3, inCombat: false, complete: true });
  assert.deepEqual(shifts, [[-1, 'src']]);
  assert.equal(flags.conditionRecoverProgress, undefined);
});
test('recover in combat: progress accumulates across consecutive rounds and completes on the third', async () => {
  const actor = mkActor({ conditionTrack: { current: 2 } });
  globalThis.game = { combat: { id: 'c1', round: 1, combatants: [{ actorId: 'a1' }] } };
  shifts.length = 0; delete flags.conditionRecoverProgress;
  let out = await ActorEngine.recoverConditionStep(actor);
  assert.deepEqual(out, { applied: false, reason: 'progress', spent: 1, remaining: 2, inCombat: true, complete: false });
  assert.deepEqual(flags.conditionRecoverProgress, { combatId: 'c1', round: 1, spent: 1 });
  globalThis.game.combat.round = 2;
  out = await ActorEngine.recoverConditionStep(actor);
  assert.equal(out.spent, 2);
  globalThis.game.combat.round = 3;
  out = await ActorEngine.recoverConditionStep(actor);
  assert.deepEqual(out, { applied: true, stepsRecovered: 1, spent: 3, inCombat: true, complete: true });
  assert.equal(shifts.length, 1);
  assert.equal(flags.conditionRecoverProgress, undefined);
  // a gap of more than one round restarts progress
  globalThis.game.combat.round = 9;
  out = await ActorEngine.recoverConditionStep(actor);
  assert.equal(out.spent, 1);
});
test('action economy: writes the object as-is and returns it; refuses non-objects', async () => {
  writes.length = 0;
  const economy = { swift: 1, move: 1, standard: 1 };
  assert.deepEqual(await ActorEngine.updateActionEconomy(mkActor({}), economy), { updated: true, actionEconomy: economy });
  assert.deepEqual(writes, [{ 'system.actionEconomy': economy }]);
  await assert.rejects(() => ActorEngine.updateActionEconomy(mkActor({}), null), /requires actionEconomy object/);
  await assert.rejects(() => ActorEngine.updateActionEconomy(null, economy), /no actor/);
});
