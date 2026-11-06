import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Reviewer item: a charged wallet is not proof the hardware persisted. The intended ledger must be observed
// after the transaction; otherwise both actors are restored. Offline (fake ActorEngine); not Foundry-tested.
registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
const PART = 'plasteel-shell';
const pc = await import('../scripts/domain/droids/droid-installation-postcondition.js');

// ---- pure ----------------------------------------------------------------------------------------------------
assert.equal(pc.verifyDroidLedgerMatchesIntent({ a: { id: 'a' } }, { a: { id: 'a' } }).ok, true);
assert.equal(pc.verifyDroidLedgerMatchesIntent({}, { a: { id: 'a' } }).ok, false, 'missing record');
assert.equal(pc.verifyDroidLedgerMatchesIntent({ a: { id: 'a' }, b: { id: 'b' } }, { a: { id: 'a' } }).ok, false, 'removed record still present');
assert.match(pc.verifyDroidLedgerMatchesIntent({ h: { id: 'hand', instanceId: 'i1' } }, { h: { id: 'hand', instanceId: 'i2' } }).reason, /instanceId/, 'wrong physical instance');
assert.match(pc.verifyDroidLedgerMatchesIntent({ h: { id: 'hand', hostInstanceId: 'x' } }, { h: { id: 'hand', hostInstanceId: 'y' } }).reason, /hostInstanceId/, 'wrong host');
assert.equal(pc.verifyDroidLedgerMatchesIntent(undefined, {}).ok, true);
assert.equal(pc.verifyItemsDeleted({ items: { get: id => (id === 'i1' ? {} : null) } }, ['i1']).ok, false);
assert.equal(pc.verifyItemsDeleted({ items: [] }, ['i1']).ok, true);

// ---- transaction ---------------------------------------------------------------------------------------------
const { resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { computeDroidPartCost } = await import('../scripts/data/droid-part-schema.js');

const droid = (system = {}) => { const a = { id: 'd1', name: 'D', type: 'droid', isOwner: true, uuid: 'Actor.d1', img: '', items: [], effects: [], flags: { [SYSTEM_ID]: {}, swse: {} },
  system: { credits: 10000, droidSystems: { size: 'medium' }, installedSystems: {}, ...system }, getFlag(s, k) { return this.flags?.[s]?.[k]; },
  toObject() { return JSON.parse(JSON.stringify({ system: a.system, name: a.name, img: a.img, items: a.items, effects: a.effects, flags: a.flags })); } }; a.items.get = () => null; return a; };
const gm = (actor) => installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: id => (id === actor.id ? actor : null) }, users: [] } });

// success path still passes the postcondition
{
  resetFakeActorEngine(); const d = droid(); gm(d);
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: [PART] });
  assert.equal(r.success, true, r.error);
  assert.ok(d.system.installedSystems[PART]);
}

// the hardware write silently does not persist: the charge is NOT kept, the result says verification failed
{
  resetFakeActorEngine(); const d = droid(); gm(d);
  const real = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (actor, plan, opts) => {
    if (plan?.set && 'system.installedSystems' in plan.set) { const { ['system.installedSystems']: _drop, ...rest } = plan.set; return real.call(ActorEngine, actor, { ...plan, set: rest }, opts); }
    return real.call(ActorEngine, actor, plan, opts);
  };
  try {
    const before = d.system.credits;
    const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: [PART] });
    assert.equal(r.success, false, 'a charged but unpersisted install must not be reported as success');
    assert.match(r.error ?? '', /postcondition failed/);
    assert.equal(r.verificationFailed, true);
    assert.equal(d.system.credits, before, 'the charge was restored');
    assert.deepEqual(d.system.installedSystems, {}, 'no phantom hardware');
  } finally { ActorEngine.applyMutationPlan = real; }
}

// a removal whose ledger delete does not persist: resale is not kept
{
  resetFakeActorEngine(); const d = droid({ installedSystems: { [PART]: { id: PART, installedAt: 1 } } }); gm(d);
  const real = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (actor, plan, opts) => {
    if (plan?.set && 'system.installedSystems' in plan.set) { const { ['system.installedSystems']: _drop, ...rest } = plan.set; return real.call(ActorEngine, actor, { ...plan, set: rest }, opts); }
    return real.call(ActorEngine, actor, plan, opts);
  };
  try {
    const before = d.system.credits;
    const r = await DroidCustomizationEngine.applyDroidCustomization(d, { remove: [PART] });
    assert.equal(r.success, false); assert.equal(r.verificationFailed, true);
    assert.equal(d.system.credits, before, 'resale credit restored when the removal did not persist');
    assert.ok(d.system.installedSystems[PART], 'hardware still recorded');
  } finally { ActorEngine.applyMutationPlan = real; }
}
console.log('Droid customization postcondition tests passed.');
