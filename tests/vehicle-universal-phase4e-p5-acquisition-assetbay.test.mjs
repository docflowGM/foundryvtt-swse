import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';

installSystemsResolver();
const { validateVehicleCreation } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { StoreAcquisitionService } = await import('../scripts/engine/store/acquisition-service.js');
const { AssetBaySurfaceService } = await import('../scripts/ui/shell/AssetBaySurfaceService.js');
const { VehicleFactory } = await import('../scripts/engine/vehicles/vehicle-factory.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const template = key => { const a = structuredClone(actors.find(x => x.system.vehicleSourceEntryKey === key)); return { ...a, toObject: () => structuredClone(a) }; };
const owner = { id: 'owner1', name: 'Wedge', ownership: { u1: 3 }, system: {}, getFlag: () => null };

function purchasePlan(key = XW, condition = 'new') {
  const plan = VehicleFactory.buildMutationPlan({ template: template(key), condition });
  globalThis.game = { user: { id: 'u1', isGM: false }, users: new Map(), actors: { contents: [] } };
  const prepared = StoreAcquisitionService.prepareCreateActorPlans([plan], { ownerActor: owner, transactionId: 'tx1', source: 'store' });
  return prepared.plans?.[0] ?? prepared.preparedPlans?.[0] ?? prepared[0];
}

test('purchased vehicle plan keeps the published source intact, gets its own id, and is owned by the buyer', () => {
  const plan = purchasePlan();
  const data = (plan.create ?? plan).actors[0].data;
  assert.equal(data._id, undefined, 'world Actor receives its own _id on creation');
  assert.equal(data.system.vehicleSourceEntryKey, XW);
  assert.equal(data.system.ownedByActorId, 'owner1');
  assert.equal(data.ownership.u1, 3);
  // still a valid canonical creation payload after acquisition decoration, hook would allow it
  assert.equal(validateVehicleCreation({ ...data, type: 'vehicle' }, data), undefined);
  assert.equal(classifyVehicleActorSource({ ...data, type: 'vehicle' }).kind, 'canonical');
  assert.equal(getVehicleRuntimeProjection({ ...data, type: 'vehicle' }).source.sourceEntryKey, XW);
});

test('used purchase keeps source identity and gains no weapon Items', () => {
  const data = (purchasePlan(XW, 'used').create ?? purchasePlan(XW, 'used')).actors[0].data;
  assert.match(data.name, /^\(Used\)/);
  assert.equal(data.system.vehicleSourceEntryKey, XW);
  assert.deepEqual(JSON.parse(JSON.stringify(data.items ?? [])), []);
  assert.deepEqual(JSON.parse(JSON.stringify(data.system.weapons)), []);
});

test('two purchases of the same publication are two distinct Actors with one source identity', () => {
  const a = (purchasePlan().create).actors[0], b = (purchasePlan().create).actors[0];
  assert.notEqual(a.temporaryId, b.temporaryId);
  assert.equal(a.data.system.vehicleSourceEntryKey, b.data.system.vehicleSourceEntryKey);
});

test('Asset Bay lists the purchased vehicle for its owner and not for others', async () => {
  const data = (purchasePlan().create).actors[0].data;
  const vehicle = { id: 'veh1', uuid: 'Actor.veh1', type: 'vehicle', name: data.name, img: data.img, system: data.system, flags: data.flags,
    items: [], isOwner: true };
  globalThis.game = { user: { id: 'u1', isGM: false }, actors: { contents: [vehicle], get: id => (id === 'veh1' ? vehicle : null) }, users: new Map() };
  const vm = await AssetBaySurfaceService.buildViewModel(owner, { bayMode: 'shipyard' });
  assert.equal(vm.shipCount, 1);
  assert.equal(vm.assets[0].actorId, 'veh1');
  assert.equal(vm.assets[0].canOpenSheet, true);
  const stranger = { id: 'someoneElse', name: 'Other', system: {}, getFlag: () => null };
  assert.equal((await AssetBaySurfaceService.buildViewModel(stranger, { bayMode: 'shipyard' })).shipCount, 0);
});
