/**
 * Startup and operator gate: (1) every required vehicle hook registers EXACTLY ONCE (a zero count fails -- the defect that hid the guards),
 * the handlers cancel invalid creation / unauthorized ledger writes and accept authorized ones; (2) stock-weapon arming on creation is
 * idempotent, tolerates failure, and a controlled Resync repairs a vehicle created before the hooks were registered; (3) the fire-mode
 * switch is paid by the crew member who operates the weapon's station (named operator / generic crew / automated).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { actors, world, install, state, ActorEngine, S } from './helpers/vehicle-weapon-world.mjs';

const read = f => fs.readFileSync(f, 'utf8');
const REQUIRED = ['preCreateActor:validateVehicleCreation', 'preUpdateActor:guardVehicleInstallationLedger', 'preUpdateActor:guardVehicleProvenance',
  'preUpdateActor:guardVehicleEnvironment', 'preUpdateItem:guardShipyardWeaponItem', 'createActor:armStockWeaponsOnCreate'];

test('STARTUP: index.js registers the vehicle hooks inside the system init hook, once, before the sheets and combat run', () => {
  const src = read('index.js');
  const initAt = src.indexOf('Hooks.once("init"');
  const callAt = src.indexOf('registerVehiclePreCreateHooks();');
  assert.ok(initAt >= 0 && callAt > initAt, 'the call sits inside the init callback');
  assert.equal(src.match(/registerVehiclePreCreateHooks\(\);/g).length, 1, 'one call site');
  assert.equal(src.match(/registerVehicleErrataMigration\(\);/g).length, 1);
  // nothing else in the loaded graph registers them a second time
  for (const f of ['scripts/infrastructure/hooks/init-hooks.js']) assert.doesNotMatch(read(f), /registerVehiclePreCreateHooks/);
});

let handlers; // (the freshly imported module instance's handlers)
test('HOOKS: each required hook registers exactly once on first call and never again', async () => {
  const on = [], realHooks = globalThis.Hooks;
  globalThis.Hooks = { on: (name, fn) => on.push([name, fn.name, fn]), once() {}, callAll() {} };
  try {
    const m = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js?fresh=startup');
    m.registerVehiclePreCreateHooks();
    const afterFirst = on.length;
    m.registerVehiclePreCreateHooks(); m.registerVehiclePreCreateHooks();
    assert.equal(on.length, afterFirst, 'repeat initialisation adds nothing');
  } finally { globalThis.Hooks = realHooks; }
  const names = on.map(x => `${x[0]}:${x[1]}`);
  for (const h of REQUIRED) assert.equal(names.filter(n => n === h).length, 1, `${h} registered exactly once`);
  handlers = Object.fromEntries(on.map(x => [x[1], x[2]]));
});

test('HANDLERS: invalid creation and unauthorized ledger / provenance writes are cancelled; untouched and authorized updates pass', async () => {
  const { validateVehicleCreation, guardVehicleInstallationLedger } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
  const bad = { type: 'vehicle', flags: { swse: { universalVehicleSource: { source: { identity: {} }, recordDigest: 'nope' } } } };
  assert.equal(validateVehicleCreation(bad, bad), false, 'a vehicle claiming a published source that fails verification is cancelled');
  const ok = actors[0];
  assert.notEqual(validateVehicleCreation(ok, ok), false, 'a verified canonical vehicle is accepted');
  // ledger writes
  assert.equal(guardVehicleInstallationLedger({ id: 'a1' }, { 'flags.swse.vehicleInstallations': { forged: true } }), false);
  assert.equal(guardVehicleInstallationLedger({ id: 'a1' }, { name: 'renamed' }), undefined, 'an update that does not touch a guarded flag passes');
  const { authorizeLedgerWrite, clearLedgerWrite } = await import('../scripts/domain/vehicles/vehicle-installation-ledger.js');
  const next = { entries: [] };
  authorizeLedgerWrite('a1', next);
  assert.equal(guardVehicleInstallationLedger({ id: 'a1' }, { 'flags.swse.vehicleInstallations': next }), undefined, 'the service-authorized write passes');
  clearLedgerWrite('a1');
  assert.equal(guardVehicleInstallationLedger({ id: 'a1' }, { 'flags.swse.vehicleInstallations': next }), false, 'the authorization is one-shot');
});

class Items extends Map { [Symbol.iterator]() { return this.values(); } get contents() { return [...this.values()]; } filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); } get(id) { return super.get(id); } }
function stockVehicle(key = 'core-incom-t-65b-x-wing-starfighter') {
  const doc = actors.find(d => d.flags.swse.canonicalPublication.sourceEntryKey === key);
  const veh = Object.assign(structuredClone(doc), { id: 'sveh', isOwner: true, items: new Items(), getActiveTokens: () => [], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  let n = 0;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'si' + (++n); veh.items.set(id, { id, ...structuredClone(x), actor: veh, parent: veh }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) veh.items.delete(id); };
  return veh;
}
const stockItems = v => v.items.contents.filter(i => i.flags?.swse?.vehicleStockWeapon);

test('ARMING: creation arms only the eligible groups, repeats are idempotent, failure never throws, and Resync repairs a vehicle created before the hooks existed', async () => {
  world();
  globalThis.game.user.id = 'u1';
  const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
  const { assessStockWeaponGroups, } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-groups.js');
  const { executableModesOf } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-items.js');
  const veh = stockVehicle();
  const expected = assessStockWeaponGroups(veh.flags.swse.universalVehicleSource.source).groups.reduce((n, g) => n + executableModesOf(g).length, 0);
  assert.ok(expected >= 1);
  // only the creating user arms
  await armStockWeaponsOnCreate(veh, {}, 'someone-else');
  assert.equal(stockItems(veh).length, 0);
  await armStockWeaponsOnCreate(veh, {}, 'u1');
  assert.equal(stockItems(veh).length, expected, 'exactly the executable groups become Items (the torpedoes stay reference-only)');
  const ids = stockItems(veh).map(i => i.id).sort();
  await armStockWeaponsOnCreate(veh, {}, 'u1'); await armStockWeaponsOnCreate(veh, {}, 'u1');
  assert.deepEqual(stockItems(veh).map(i => i.id).sort(), ids, 'repeated synchronisation creates and deletes nothing');
  // a vehicle created before the hooks were registered has no Items: the controlled Resync (owner/GM) arms it from the verified record
  const legacy = stockVehicle();
  assert.equal(stockItems(legacy).length, 0);
  const r = await S.reconcileWeaponItems({ vehicle: legacy });
  assert.deepEqual([r.success, r.operational], [true, true], JSON.stringify(r));
  assert.equal(stockItems(legacy).length, expected);
  assert.deepEqual(legacy.flags.swse.universalVehicleSource.source, veh.flags.swse.universalVehicleSource.source, 'the canonical source record is untouched');
  // a deleted Item is restored by Resync
  const victim = stockItems(legacy)[0]; legacy.items.delete(victim.id);
  assert.equal(stockItems(legacy).length, expected - 1);
  assert.equal((await S.reconcileWeaponItems({ vehicle: legacy })).success, true);
  assert.equal(stockItems(legacy).length, expected);
  // a non-owner cannot run it
  legacy.isOwner = false; const realGM = globalThis.game.user.isGM; globalThis.game.user.isGM = false;
  assert.deepEqual((await S.reconcileWeaponItems({ vehicle: legacy })).reasons, ['NOT_AUTHORIZED']);
  globalThis.game.user.isGM = realGM; legacy.isOwner = true;
  // failure handling: the hook warns and resolves, the service reports a precise reason
  const failing = stockVehicle();
  ActorEngine.createEmbeddedDocuments = async () => { throw new Error('create failed'); };
  await assert.doesNotReject(armStockWeaponsOnCreate(failing, {}, 'u1'));
  const f = await S.syncWeaponItems(failing);
  assert.deepEqual([f.success, f.reasons], [false, ['WEAPON_ITEM_SYNC_FAILED']]);
});

test('OPERATOR: the autofire switch is paid by the station\'s named operator, by the vehicle for a generic or automated crew, and refuses a broken assignment', async () => {
  world();
  const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
  const { VehicleFireModeService } = await import('../scripts/engine/vehicles/vehicle-fire-mode-service.js');
  const dbl = await install('blaster-cannon-light', 'cannon-double');      // GM_MOUNT: operator = pilot
  const { vehicle } = state();
  const gunner = { id: 'g1', type: 'character', name: 'Pilot Pat', isOwner: false };
  const realActors = globalThis.game.actors;
  globalThis.game.actors = { get: id => (id === 'g1' ? gunner : undefined) };
  const paid = [];
  const realSpend = ActionEconomyConsumption.spend;
  ActionEconomyConsumption.spend = async (actor, type) => { paid.push([actor.id, type]); return { allowed: true, rollback: async () => {} }; };
  const reset = async () => { vehicle.flags.swse.vehicleFireMode = {}; };
  try {
    // generic crew (no assignment): the vehicle pays
    vehicle.system.crewPositions = {};
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire' })).ok, true);
    assert.deepEqual(paid.pop(), [vehicle.id, 'swift']);
    await reset();
    // named operator on the station: THEIR action economy is charged, and their owner may do it
    vehicle.system.crewPositions = { pilot: { actorId: 'g1' } };
    const asGunnerOwner = await (async () => { const v = vehicle.isOwner; vehicle.isOwner = false; gunner.isOwner = true; try { return await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire', user: { isGM: false } }); } finally { vehicle.isOwner = v; gunner.isOwner = false; } })();
    assert.equal(asGunnerOwner.ok, true, JSON.stringify(asGunnerOwner));
    assert.deepEqual(paid.pop(), ['g1', 'swift']);
    assert.equal(asGunnerOwner.paidBy, 'g1');
    await reset();
    // a stranger cannot
    vehicle.isOwner = false;
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire', user: { isGM: false } })).reason, 'FIRE_MODE_NOT_AUTHORIZED');
    vehicle.isOwner = true;
    assert.equal(paid.length, 0, 'a refusal spends nothing');
    // an assignment that no longer resolves refuses before any cost
    vehicle.system.crewPositions = { pilot: { actorId: 'deleted' } };
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire' })).reason, 'FIRE_MODE_ASSIGNED_CREW_INVALID');
    assert.equal(paid.length, 0);
    // the named operator has no swift action left: refused, nothing written
    vehicle.system.crewPositions = { pilot: { actorId: 'g1' } };
    ActionEconomyConsumption.spend = async () => ({ allowed: false });
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire' })).reason, 'FIRE_MODE_SWIFT_ACTION_UNAVAILABLE');
    assert.notEqual(vehicle.flags.swse.vehicleFireMode?.[dbl.id], 'autofire');
  } finally { ActionEconomyConsumption.spend = realSpend; globalThis.game.actors = realActors; vehicle.system.crewPositions = {}; }
});
