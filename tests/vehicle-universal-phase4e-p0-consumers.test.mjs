import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const clone = structuredClone;
const sample = predicate => {
  const value = actors.find(predicate);
  assert.ok(value, 'Expected source-backed sample');
  return clone(value);
};

function factory() {
  const code = readFileSync('scripts/engine/vehicles/vehicle-factory.js', 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace(/\bexport\s+/g, '');
  const ctx = {
    structuredClone, classifyVehicleActorSource, getVehicleRuntimeProjection,
    swseLogger: { debug() {} }
  };
  runInNewContext(code + '\nglobalThis.Factory = VehicleFactory;', ctx);
  return ctx.Factory;
}

test('all 429 canonical template copies retain source identity, printed stats, and zero installed mounts', () => {
  const Factory = factory();
  assert.equal(actors.length, 429);
  for (const actor of actors) {
    const result = Factory.buildVehicleActorData({ template: actor, condition: 'new' });
    assert.equal(result._id, undefined);
    assert.equal(result.id, undefined);
    assert.equal(result.flags.swse.universalVehicleSource.source.identity.sourceEntryKey,
      actor.system.vehicleSourceEntryKey);
    assert.equal(result.system.initiative, actor.system.initiative);
    assert.equal(result.system.hp.max, actor.system.hp.max);
    assert.equal(result.system.reflexDefense, actor.system.reflexDefense);
    assert.equal(result.system.fortitudeDefense, actor.system.fortitudeDefense);
    assert.equal(result.system.model, actor.system.model);
    assert.equal(result.system.vehiclePublishedShieldStatus,
      actor.system.vehiclePublishedShieldStatus);
    assert.deepEqual(JSON.parse(JSON.stringify(result.items)), []);
    assert.deepEqual(JSON.parse(JSON.stringify(result.system.weapons)), []);
    assert.equal(classifyVehicleActorSource(result).kind, 'canonical');
    assert.equal(Object.hasOwn(result.system, 'hull'), Object.hasOwn(actor.system, 'hull'));
    assert.equal(Object.hasOwn(result.system, 'cost'), Object.hasOwn(actor.system, 'cost'));
  }
});

test('world IDs and used-condition callsigns do not replace publication identity or price', () => {
  const Factory = factory();
  const original = sample(d => d.system.vehiclePublishedShieldStatus === 'unknown');
  const copy = Factory.buildVehicleActorData({ template: original, condition: 'used' });
  assert.match(copy.name, /^\(Used\)/);
  assert.equal(copy.system.model, original.system.model);
  assert.deepEqual(JSON.parse(JSON.stringify(copy.flags)), JSON.parse(JSON.stringify(original.flags)));
  assert.equal(copy.system.vehicleSourceEntryKey, original.system.vehicleSourceEntryKey);
  assert.equal(copy.system.vehiclePublishedShieldStatus, 'unknown');
  assert.equal(copy.system.shieldRating, undefined);
  assert.equal(copy.system.shields, undefined);
});

test('invalid source and uncertified legacy shipyard modifications fail before mutation', () => {
  const Factory = factory();
  const original = sample(d => d.system.shieldRating > 0);
  const corrupted = clone(original);
  corrupted.system.hp.max = 1;
  assert.throws(() => Factory.buildVehicleActorData({ template: corrupted }),
    /VEHICLE_FACTORY_UNTRUSTED_CANONICAL_TEMPLATE/);
  assert.throws(() => Factory.buildVehicleActorData({
    template: original, modifications: [{ id: 'weapons-lasers', damage: '99d10' }]
  }), /VEHICLE_FACTORY_CANONICAL_MODIFICATION_REQUIRES_CERTIFIED_P2_PATH/);
  assert.throws(() => Factory.buildExistingModificationMutationPlan(original, {
    stockShip: { hitPoints: 999 }, modifications: []
  }), /VEHICLE_FACTORY_CANONICAL_MODIFICATION_REQUIRES_CERTIFIED_P2_PATH/);
});

test('source-claim stock frames cannot enter the old stock-ship JSON reconstruction path', () => {
  const Factory = factory();
  const original = sample(() => true);
  assert.throws(() => Factory.buildVehicleActorData({ stockShip: original }),
    /VEHICLE_FACTORY_CANONICAL_STOCK_FRAME_REBUILD_FORBIDDEN/);
});

test('old vehicle sheet reads live HP before stale hull and exposes read-only source projection', () => {
  const context = readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', 'utf8');
  const sheet = readFileSync('scripts/sheets/v2/vehicle-actor-sheet.js', 'utf8');
  assert.match(context, /const hull = system\.hp \?\? system\.hull \?\? \{\};/);
  assert.match(context, /const hp = system\.hp \?\? system\.hull \?\? \{\};/);
  assert.match(context, /vehicleRuntimeProjection = getVehicleRuntimeProjection\(actor\)/);
  assert.match(context, /vehicleRuntimeProjection,/);
  assert.match(sheet, /classifyVehicleActorSource\(this\.actor\)/);
  assert.match(sheet, /sourceAssessment\.kind === 'canonical'/);
  assert.match(sheet, /'system\.hp\.value'/);
  assert.doesNotMatch(sheet.slice(sheet.indexOf('const canonicalWritable ='),sheet.indexOf('const isWritable =')),
    /system\.hull|system\.weapons|system\.reflexDefense|system\.fortitudeDefense|system\.cost/);
});

test('legacy Store checkout resolves the universal source pack before any credit debit', () => {
  const code = readFileSync('scripts/apps/store/store-checkout.js', 'utf8');
  const buy = code.slice(code.indexOf('export async function buyVehicle('),
    code.indexOf('export async function createCustomDroid('));
  const plans = code.slice(code.indexOf('async function createVehiclePlans('),
    code.indexOf('function flattenCartForPurchase('));
  assert.doesNotMatch(buy, /foundryvtt-swse\.vehicles['"]/);
  assert.match(buy, /VehiclePackDataLoader\.loadVehicleIndex\(\)/);
  assert.match(buy, /VehiclePackDataLoader\.loadVehicleDocument\(/);
  assert.match(buy, /vehiclePlans = await createVehiclePlans\(/);
  assert.match(buy, /return vehiclePlans;/);
  assert.ok(buy.indexOf('vehiclePlans = await createVehiclePlans(') <
    buy.indexOf('StoreEngine.purchase('), 'source preflight must precede debit');
  assert.match(plans, /entry\.sourceEntryKey === key/);
  assert.match(plans, /VehiclePackDataLoader\.loadVehicleDocument\(matches\[0\]\)/);
  assert.match(plans, /template: canonicalActor/);
  assert.match(plans, /projection\.published\.price\?\.status !== 'priced'/);
  assert.match(code, /const stagedVehiclePlans = store\.cart\.vehicles\?\.length > 0/);
  const checkout = code.slice(code.indexOf('export async function checkout('));
  assert.ok(checkout.indexOf('await createVehiclePlans(store.cart.vehicles, store.itemsById)') <
    checkout.indexOf('StoreEngine.purchase('), 'cart source preflight must precede debit');
  assert.match(checkout, /plans\.push\(\.\.\.stagedVehiclePlans\);/);
});

test('Foundry V13 Factory uses toObject(true) source, never prepared derived data', () => {
  const Factory = factory();
  const original = sample(() => true);
  let consulted = null;
  const stub = {
    toObject(isSource) {
      consulted = isSource;
      if (isSource) return clone(original);
      const prepared = clone(original);
      prepared.system.hp.max = 9999;
      return prepared;
    }
  };
  const created = Factory.buildVehicleActorData({ template: { doc: stub } });
  assert.equal(consulted, true, 'Foundry source flag must be true');
  assert.equal(created.system.hp.max, original.system.hp.max);
  assert.equal(classifyVehicleActorSource(created).kind, 'canonical');
});
