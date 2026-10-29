import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import {
  classifyVehicleActorSource, getVehicleRuntimeProjection,
  getVehiclePublishedFieldState
} from '../scripts/domain/vehicles/vehicle-runtime-contract.js';

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const clone = value => structuredClone(value);
const pick = predicate => {
  const value = docs.find(predicate);
  assert.ok(value, 'Expected canonical fixture');
  return clone(value);
};

test('all 429 generated source Actors have one valid P0 lifecycle classification', () => {
  assert.equal(docs.length, 429);
  for (const doc of docs) {
    const result = classifyVehicleActorSource(doc);
    assert.deepEqual(result.errors, [], doc.system.vehicleSourceEntryKey + ': ' + result.errors);
    assert.equal(result.kind, 'canonical');
    const projection = getVehicleRuntimeProjection(doc);
    assert.equal(projection.source.sourceEntryKey, doc.system.vehicleSourceEntryKey);
    assert.equal(projection.published.attackGroupsExecutable, false);
    assert.deepEqual(projection.installed.mounts, []);
    assert.ok(Object.isFrozen(projection));
  }
});

test('world IDs and call signs do not replace published identity or model', () => {
  const original = pick(() => true);
  const second = clone(original);
  original._id = 'world-actor-one'; original.name = 'Red Leader';
  second._id = 'world-actor-two'; second.name = 'Red Two';
  assert.equal(classifyVehicleActorSource(original).kind, 'canonical');
  assert.equal(classifyVehicleActorSource(second).kind, 'canonical');
  assert.equal(original.system.vehicleSourceEntryKey, second.system.vehicleSourceEntryKey);
  assert.equal(getVehicleRuntimeProjection(original).published.model,
    getVehicleRuntimeProjection(second).published.model);
});

test('two printed Vultures retain distinct publication keys; hybrid keeps movement modes', () => {
  const core = pick(d => d.system.vehicleSourceEntryKey === 'core-vulture-class-droid-starfighter');
  const sotg = pick(d => d.system.vehicleSourceEntryKey === 'sotg-baktoid-armor-workshop-vulture-class-starfighter');
  const hybrid = pick(d => d.system.vehicleSourceEntryKey === 'sgtd-dp-2-probe-droid');
  assert.notEqual(core.system.vehicleSourceEntryKey, sotg.system.vehicleSourceEntryKey);
  for (const actor of [core, sotg, hybrid])
    assert.equal(classifyVehicleActorSource(actor).kind, 'canonical');
  assert.deepEqual(getVehicleRuntimeProjection(hybrid).published.movementModes,
    hybrid.flags.swse.universalVehicleSource.source.movement?.speedModes ?? []);
});

test('zero and negative Initiative retain numeric meaning', () => {
  for (const actor of [pick(d => d.system.initiative < 0), pick(d => d.system.initiative === 0)]) {
    assert.equal(classifyVehicleActorSource(actor).kind, 'canonical');
    assert.equal(getVehicleRuntimeProjection(actor).published.initiative.value, actor.system.initiative);
    const wrong = clone(actor); wrong.system.initiative = String(wrong.system.initiative);
    assert.equal(classifyVehicleActorSource(wrong).kind, 'invalid-canonical');
  }
});

test('unknown, explicit zero, and positive SR are separate publication facts', () => {
  const variants = [
    [pick(d => d.system.vehiclePublishedShieldStatus === 'unknown'), 'unknown'],
    [pick(d => d.system.shieldRating === 0), 'explicit-zero'],
    [pick(d => d.system.shieldRating > 0), 'known']
  ];
  for (const [doc, state] of variants) {
    assert.equal(classifyVehicleActorSource(doc).kind, 'canonical');
    assert.equal(getVehicleRuntimeProjection(doc).published.defenses.shield.state, state);
  }
  const unknown = variants[0][0];
  unknown.system.shields = { value: 0, max: 0 };
  unknown.system.shieldRating = 0;
  assert.equal(classifyVehicleActorSource(unknown).kind, 'canonical');
  unknown.system.shields.max = 1;
  assert.equal(classifyVehicleActorSource(unknown).kind, 'invalid-canonical');
  assert.equal(getVehiclePublishedFieldState(0), 'explicit-zero');
  assert.equal(getVehiclePublishedFieldState(null), 'unknown');
  assert.equal(getVehiclePublishedFieldState(null, 'conditional'), 'conditional');
  assert.equal(getVehiclePublishedFieldState(null, 'ambiguous'), 'conflicting');
});

test('malformed canonical claims cannot pass as custom Actors', () => {
  const baseline = pick(d => d.system.shieldRating > 0);
  const variants = [
    d => { d.flags.swse.canonicalPublication.sourceEntryKey = 'tampered'; },
    d => { delete d.flags.swse.canonicalPublication; },
    d => { d.system.vehicleSourceEntryKey = 'another-key'; },
    d => { d.system.vehiclePackName = 'vehicles-nonexistent'; },
    d => { d.system.vehicleSourcePrimaryCategory = 'made-up'; },
    d => { d.system.model = 'Fictional Hull'; },
    d => { d.system.reflexDefense = -99; },
    d => { d.system.hp.max += 1; },
    d => { d.system.initiative = '+0'; },
    d => { d.system.weapons = [{ name: 'uncertified' }]; },
    d => { d.items = [{ name: 'uncertified weapon' }]; },
    d => { d.flags.swse.canonicalPublication.foundryStockAttackTrusted = true; },
    d => { d.flags.swse.universalVehicleSource.source.armament.weaponMounts = [{}]; },
    d => { d.flags.swse.universalVehicleSource.source.armament.firingGroups[0].mountKeys = ['fake']; },
    d => { delete d.flags.swse.universalVehicleSource; },
    d => { d.system.vehicleMovementModes = []; }
  ];
  for (const [index, mutate] of variants.entries()) {
    const tampered = clone(baseline); mutate(tampered);
    const result = classifyVehicleActorSource(tampered);
    assert.equal(result.kind, 'invalid-canonical', 'variant ' + index + ': ' + result.errors.join(','));
    assert.throws(() => getVehicleRuntimeProjection(tampered), /UNIVERSAL_VEHICLE_SOURCE_INVALID/);
  }
});

test('creation input and Document cannot disagree about canonical provenance', () => {
  const actor = pick(() => true);
  const data = clone(actor);
  data.system.vehicleSourceEntryKey = 'fake-key';
  assert.equal(classifyVehicleActorSource(actor, data).kind, 'invalid-canonical');
  const broken = clone(actor);
  delete broken.flags.swse.universalVehicleSource;
  assert.equal(classifyVehicleActorSource(broken, actor).kind, 'invalid-canonical');
});

test('an empty input Item array cannot conceal Items already on the Document', () => {
  const source = pick(() => true);
  const input = clone(source);
  input.items = [];
  source.items = [{ name: 'unsanctioned stock weapon', type: 'weapon' }];
  const result = classifyVehicleActorSource(source, input);
  assert.equal(result.kind, 'invalid-canonical');
  assert.ok(result.errors.includes('SOURCE_ATTACKS_NOT_INSTALLABLE'));
});

test('uncertified modification claims remain reference-only rather than installed hardware', () => {
  const actor = pick(() => true);
  actor.system.vehicleModifications = [{ name: 'spoofed shields', value: 999 }];
  const projection = getVehicleRuntimeProjection(actor);
  assert.deepEqual(projection.installed.modifications, []);
  assert.deepEqual(projection.installed.mounts, []);
  assert.equal(projection.installed.certification, 'NONE');
  assert.equal(projection.unverifiedModificationClaims[0].name, 'spoofed shields');
  assert.ok(Object.isFrozen(projection.unverifiedModificationClaims));
});

test('intentionally blank Phase 4D shell and explicit custom vehicles remain separate', () => {
  const scratch = {
    name: '[SWSE PHASE4D SCRATCH]', type: 'vehicle',
    system: {}, flags: { swse: { vehiclePhase4dScratch: { sourceKey: 'sample' } } }
  };
  assert.equal(classifyVehicleActorSource(scratch).kind, 'scratch');
  assert.equal(classifyVehicleActorSource({ type: 'vehicle', system: {} }).kind, 'custom');
  assert.equal(classifyVehicleActorSource({ type: 'character', system: {} }).kind, 'not-vehicle');
});

test('Foundry hooks register once; no hidden importer or post-create weapon hydration', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const source = readFileSync('scripts/actors/vehicle/vehicle-precreate-hooks.js', 'utf8');
  assert.doesNotMatch(source, /normalizeVehicleImportData|normalizeVehicleWeaponImportData|createVehicleWeaponItems/);
  const code = source.replace(/^import .*;\s*$/gm, '').replace(/\bexport\s+/g, '');
  const callbacks = new Map();
  const context = {
    classifyVehicleActorSource,
    Hooks: { on(name, callback) {
      const array = callbacks.get(name) ?? [];
      array.push(callback); callbacks.set(name, array);
    } },
    console: { error() {} }
  };
  runInNewContext(code + '\nglobalThis.register=registerVehiclePreCreateHooks;', context);
  context.register(); context.register();
  assert.equal(callbacks.get('preCreateActor').length, 1);
  assert.equal(callbacks.has('createActor'), false);
  const gate = callbacks.get('preCreateActor')[0];
  const good = pick(() => true);
  const bad = clone(good); bad.system.weapons = [{ name: 'uncertified' }];
  assert.equal(gate(good, good), undefined);
  assert.equal(gate(bad, bad), false);
  assert.equal(gate({ type: 'vehicle', system: {}, flags: {} }), undefined);
});
