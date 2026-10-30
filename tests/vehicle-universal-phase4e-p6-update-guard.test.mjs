import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { getVerifiedPublishedRecord, checkProvenanceUpdate } from '../scripts/domain/vehicles/vehicle-source-identity.js';

installSystemsResolver();
const { guardVehicleProvenance, applyChangesToCopy } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const make = (key = XW, edit = a => a) => { const d = edit(structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === key)));
  return { ...d, type: 'vehicle', id: 'v1', toObject: () => structuredClone(d), _source: d }; };
const allowed = (actor, changes) => guardVehicleProvenance(actor, changes) !== false;
// Applying an allowed update must leave a vehicle the runtime projection still accepts.
const persistsValid = (actor, changes) => { const after = applyChangesToCopy(actor.toObject(), changes); return getVehicleRuntimeProjection(after).kind === 'canonical'; };

test('published-field mirrors cannot be changed by an ordinary update', () => {
  const a = make();
  for (const changes of [
    { system: { cost: 1 } }, { 'system.costNumeric': 1 }, { system: { crew: '6' } }, { system: { passengers: 40 } },
    { system: { cargo: '500 tons' } }, { system: { consumables: '9 years' } }, { system: { size: 'Diminutive' } },
    { system: { vehicleCrewCount: 99 } }, { system: { vehicleCrewLabel: 'x' } }, { system: { vehiclePassengers: 9 } },
    { system: { vehiclePublishedCargo: { value: 1, unit: 'kg', raw: '1 kg' } } }
  ]) assert.equal(allowed(a, changes), false, JSON.stringify(changes));
  // submitting the current value is still a no-op
  assert.equal(allowed(a, { system: { size: a.system.size, cost: a.system.cost } }), true);
});

test('no ordinary update may persist a state that makes the runtime projection throw', () => {
  const a = make();
  const bad = [
    { system: { hp: { value: 121 } } }, { system: { hp: { value: -1 } } },
    { 'system.shields.value': 16 }, { 'system.shields.value': -2 },
    { system: { weapons: [{ name: 'Forged Cannon' }] } },
    { system: { sourceAttackGroups: [] } }, { system: { vehicleMovementModes: [] } }
  ];
  for (const changes of bad) assert.equal(allowed(a, changes), false, JSON.stringify(changes));
  const ok = [
    { system: { hp: { value: 0 } } }, { system: { hp: { value: 120 } } }, { 'system.hp.value': 37 },
    { system: { shields: { value: 0 } } }, { system: { shields: { value: 15 } } },
    { name: 'Red Five' }, { img: 'x.webp' }, { system: { notes: 'n' } },
    { system: { crewPositions: { pilot: { id: 'a', name: 'Luke' } } } },
    { flags: { swse: { vehicleInstallations: [] } } }, { 'flags.other.x': 1 }
  ];
  for (const changes of ok) { assert.equal(allowed(a, changes), true, JSON.stringify(changes)); assert.ok(persistsValid(a, changes), JSON.stringify(changes)); }
});

test('unknown-SR vehicles cannot gain a shield pool through an update', () => {
  const v = make('core-vulture-class-droid-starfighter');
  assert.equal(allowed(v, { 'system.shields.value': 5 }), false);
  assert.equal(allowed(v, { system: { shieldRating: 5 } }), false);
  assert.equal(allowed(v, { system: { hp: { value: 3 } } }), true);
});

test('all 429: legitimate play-state updates are never blocked', () => {
  for (const base of actors) {
    const a = make(base.system.vehicleSourceEntryKey);
    const max = base.system.hp.max;
    for (const changes of [{ system: { hp: { value: max } } }, { system: { hp: { value: 0 } } }, { name: 'Callsign' },
      { system: { crewPositions: { pilot: { id: 'p' } } } }]) {
      assert.equal(allowed(a, changes), true, base.system.vehicleSourceEntryKey + JSON.stringify(changes));
      assert.ok(persistsValid(a, changes));
    }
    assert.equal(allowed(a, { system: { hp: { value: max + 1 } } }), false);
  }
});

test('a vehicle that is already invalid is not trapped: repairing updates stay possible', () => {
  const broken = make(XW, d => { d.system.hp.value = 999; return d; });
  assert.equal(allowed(broken, { system: { hp: { value: 10 } } }), true);
});

test('non-vehicles and custom vehicles are untouched by the guard', () => {
  assert.equal(guardVehicleProvenance({ type: 'character', system: {}, flags: {} }, { system: { cost: 1 } }), undefined);
  const custom = { type: 'vehicle', flags: {}, system: {}, toObject() { return this; } };
  assert.equal(guardVehicleProvenance(custom, { system: { cost: 1, hp: { value: 99999 } } }), undefined);
});

test('applyChangesToCopy handles dotted keys, nested objects and deletions without touching the original', () => {
  const src = { system: { a: { b: 1 }, keep: 1 }, flags: { swse: { x: 1 } } };
  const out = applyChangesToCopy(src, { 'system.a.b': 2, system: { added: 3 }, flags: { swse: { '-=x': null } } });
  assert.deepEqual(out, { system: { a: { b: 2 }, keep: 1, added: 3 }, flags: { swse: {} } });
  assert.equal(src.system.a.b, 1);
});

test('verification is not cached: an in-place mutation of an already verified record is rejected', () => {
  const a = make();
  assert.ok(getVerifiedPublishedRecord(a));
  assert.ok(getVerifiedPublishedRecord(a), 'second call on the same object also verifies');
  a.flags.swse.universalVehicleSource.source.durability.hitPoints = 1; // same object, mutated in place
  assert.equal(getVerifiedPublishedRecord(a), null);
  assert.throws(() => getVehicleRuntimeProjection(a), /UNIVERSAL_VEHICLE_SOURCE_INVALID/);
  const b = make(); getVerifiedPublishedRecord(b);
  b.flags.swse.canonicalPublication.sourceEntryKey = 'other'; // identity drift after a verified call
  assert.equal(getVerifiedPublishedRecord(b), null);
});

test('guard stays registered and denies by returning false', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('scripts/actors/vehicle/vehicle-precreate-hooks.js', 'utf8');
  assert.match(src, /Hooks\.on\('preUpdateActor', guardVehicleProvenance\)/);
  assert.equal(checkProvenanceUpdate(make(), { system: { cost: 1 } }).ok, false);
});
