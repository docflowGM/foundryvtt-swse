import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Postcondition coverage for the remaining asset-customization workflows. Offline only; not Foundry-tested.
registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
const post = await import('../scripts/domain/vehicles/vehicle-postcondition.js');

// ---- pure ----------------------------------------------------------------------------------------------------
assert.equal(post.canonicalEqual({ a: 1, b: { c: 2, d: [1, { e: 3 }] } }, { b: { d: [1, { e: 3 }], c: 2 }, a: 1 }), true, 'key order is irrelevant');
assert.equal(post.canonicalEqual({ a: 1, b: undefined }, { a: 1 }), true, 'undefined equals missing');
assert.equal(post.canonicalEqual([1, 2], [2, 1]), false, 'array order matters');
assert.equal(post.canonicalEqual({ a: 1 }, { a: 2 }), false);
assert.equal(post.canonicalEqual(null, undefined), true);
const actor = { flags: { swse: { vehicleInstallations: [{ id: 'x', n: 1 }] } }, system: { installedSystems: { s: { id: 's' } } }, items: [{ id: 'i1', flags: { swse: { ledger: { units: 3 } } } }] };
assert.equal(post.verifyStoredPaths({ 'flags.swse.vehicleInstallations': [{ n: 1, id: 'x' }] })(actor).ok, true);
assert.equal(post.verifyStoredPaths({ 'flags.swse.vehicleInstallations': [] })(actor).ok, false);
assert.equal(post.verifyStoredPaths({ 'flags.swse.==vehicleInstallations': [{ n: 1, id: 'x' }] })(actor).ok, true, "'==' replace syntax is read as the plain key");
assert.equal(post.verifyEmbeddedItemFlag('i1', 'swse', 'ledger', { units: 3 })(actor).ok, true);
assert.equal(post.verifyEmbeddedItemFlag('i1', 'swse', 'ledger', { units: 4 })(actor).ok, false);
assert.equal(post.verifyEmbeddedItemFlag('nope', 'swse', 'ledger', {})(actor).ok, false);

// ---- VehicleCustomizationEngine (non-canonical lane): charged but unpersisted -> failure + restore -------------
const { resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { VehicleCustomizationEngine } = await import('../scripts/engine/customization/vehicle-customization-engine.js');
const { VEHICLE_SYSTEM_DEFINITIONS } = await import('../scripts/domain/vehicles/vehicle-system-definitions.js');
const sysId = Object.keys(VEHICLE_SYSTEM_DEFINITIONS)[0];
const veh = () => { const a = { id: 'v1', name: 'Hull', type: 'vehicle', isOwner: true, uuid: 'Actor.v1', img: '', items: [], effects: [], flags: { swse: {}, [SYSTEM_ID]: {} },
  system: { credits: 100000, installedSystems: {}, type: VEHICLE_SYSTEM_DEFINITIONS[sysId].compatibility?.type?.[0] ?? 'transport' }, getFlag(s, k) { return this.flags?.[s]?.[k]; },
  toObject() { return JSON.parse(JSON.stringify({ system: a.system, name: a.name, img: a.img, items: a.items, effects: a.effects, flags: a.flags })); } }; a.items.get = () => null; return a; };
const world = (a) => installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: id => (id === a.id ? a : null) }, users: [] } });
{
  resetFakeActorEngine(); const v = veh(); world(v);
  const preview = VehicleCustomizationEngine.previewVehicleCustomization(v, { add: [sysId] });
  if (preview.success) {
    const ok = await VehicleCustomizationEngine.applyVehicleCustomization(v, { add: [sysId] });
    assert.equal(ok.success, true, ok.error);
    assert.ok(v.system.installedSystems[sysId]);
    // now a write that silently does not persist
    resetFakeActorEngine(); const v2 = veh(); world(v2);
    const real = ActorEngine.applyMutationPlan;
    ActorEngine.applyMutationPlan = async (a, plan, o) => { if (plan?.set && 'system.installedSystems' in plan.set) { const { ['system.installedSystems']: _x, ...rest } = plan.set; return real.call(ActorEngine, a, { ...plan, set: rest }, o); } return real.call(ActorEngine, a, plan, o); };
    try {
      const before = v2.system.credits;
      const r = await VehicleCustomizationEngine.applyVehicleCustomization(v2, { add: [sysId] });
      assert.equal(r.success, false); assert.equal(r.verificationFailed, true);
      assert.equal(v2.system.credits, before, 'charge restored'); assert.deepEqual(v2.system.installedSystems, {});
    } finally { ActorEngine.applyMutationPlan = real; }
  } else {
    assert.fail(`fixture vehicle was not accepted by the legacy engine preview: ${preview.error}`);
  }
}

// ---- legacy vehicle lane: the payer is authorized, not guessed -------------------------------------------------
{
  resetFakeActorEngine(); const v = veh(); v.system.ownedByActorId = 'owner'; world(v);
  const stranger = { id: 'stranger', system: { credits: 99999 } };
  installFoundryShimGlobals({ game: { user: { isGM: false, id: 'u' }, actors: { get: id => (id === v.id ? v : null) }, users: [] } });
  const refused = VehicleCustomizationEngine.previewVehicleCustomization(v, { add: [sysId] }, { walletActor: stranger });
  assert.equal(refused.success, false); assert.match(refused.error, /not a recorded owner/);
  const owner = { id: 'owner', system: { credits: 99999 } };
  assert.equal(VehicleCustomizationEngine.previewVehicleCustomization(v, { add: [sysId] }, { walletActor: owner }).success, true);
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: id => (id === v.id ? v : null) }, users: [] } });
  assert.equal(VehicleCustomizationEngine.previewVehicleCustomization(v, { add: [sysId] }, { walletActor: stranger }).success, true, 'explicit GM override');
}

// ---- call-site coverage (structural: these workflows are not executable under the shim) ------------------------
const has = (file, re, msg) => assert.match(fs.readFileSync(file, 'utf8'), re, msg);
has('scripts/engine/vehicles/vehicle-installation-service.js', /verifyAsset: verifyStoredPaths\(set\)/, 'commit funnel');
has('scripts/engine/vehicles/vehicle-installation-service.js', /verifyAsset: verifyStoredPaths\(\{ \[VEHICLE_INSTALLATION_FLAG_PATH\]: plan\.nextLedger \}\)/, 'uninstall');
has('scripts/engine/vehicles/vehicle-installation-service.js', /verifyAsset: verifyStoredPaths\(\{ \[`flags\.swse\.\$\{AFTERMARKET_AMMO_FLAG\}`\]: next \}\)/, 'aftermarket ammunition purchase');
has('scripts/engine/vehicles/vehicle-installation-service.js', /verifyAsset: verifyEmbeddedItemFlag\(item\.id, 'swse', LEDGER_FLAG, plan\.ledger\)/, 'stock ammunition purchase');
has('scripts/engine/vehicles/vehicle-logistics-service.js', /verifyAsset: verifyStoredPaths\(\{ \[`flags\.swse\.\$\{LOGISTICS_FLAG\}`\]: next \}\)/, 'fuel/supplies purchase');
has('scripts/engine/customization/vehicle-customization-engine.js', /verifyAsset: verifyStoredPaths\(\{ 'system\.installedSystems': installedSystems \}\)/, 'legacy vehicle customization');
has('scripts/engine/customization/tech-specialist-modification-service.js', /assetMutationPlan: \{ set \}, verifyAsset: verifyStoredPaths\(/, 'Tech Specialist (actor subject)');
has('scripts/engine/customization/tech-specialist-modification-service.js', /verify: \(fresh\) =>/, 'Tech Specialist (item subject)');
console.log('Vehicle/asset postcondition tests passed.');
