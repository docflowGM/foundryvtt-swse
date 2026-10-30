import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { collectSourceIdentityErrors, getVerifiedPublishedRecord, claimsPublishedSource, checkProvenanceUpdate } from '../scripts/domain/vehicles/vehicle-source-identity.js';
import { getPublishedDerivedBase, getPublishedVehicleInitiative } from '../scripts/domain/vehicles/vehicle-published-derived.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const base = (key = XW) => structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === key));
const runtime = a => classifyVehicleActorSource(a, undefined, { mode: 'runtime' });

// ---------- A. creation vs runtime Item validation ----------
test('creation mode still rejects any embedded Item; runtime mode accepts equipment', () => {
  const a = base();
  a.items = [{ _id: 'e1', name: 'Cargo Crate', type: 'equipment', system: {} }];
  assert.equal(classifyVehicleActorSource(a).kind, 'invalid-canonical');
  assert.ok(classifyVehicleActorSource(a).errors.includes('SOURCE_ATTACKS_NOT_INSTALLABLE'));
  assert.equal(runtime(a).kind, 'canonical');
  const p = getVehicleRuntimeProjection(a);
  assert.equal(p.kind, 'canonical');
  assert.equal(p.installed.equipmentItemCount, 1);
  assert.equal(p.installed.uncertifiedWeaponItems, 0);
});

test('equipment changes no published statistic; uncertified weapon Items are counted and never certified', () => {
  const plain = getVehicleRuntimeProjection(base());
  const a = base();
  a.items = [{ _id: 'e1', type: 'equipment', system: {} },
    { _id: 'w1', type: 'weapon', name: 'Forged Cannon', system: { vehicleMount: { installId: 'nope' } } }];
  const p = getVehicleRuntimeProjection(a);
  assert.deepEqual(p.published, plain.published);
  assert.deepEqual(p.source, plain.source);
  assert.equal(p.installed.uncertifiedWeaponItems, 1);
  assert.deepEqual(p.installed.mounts, []);
  assert.equal(p.installed.stockMountsCertified, false);
  assert.equal(p.published.attackGroupsExecutable, false);
});

test('runtime mode still enforces everything except embedded Items', () => {
  const cases = [
    a => { a.system.weapons = [{ name: 'x' }]; },
    a => { a.system.hp.max += 1; },
    a => { a.system.vehicleSourceEntryKey = 'other'; },
    a => { a.flags.swse.canonicalPublication.foundryStockAttackTrusted = true; },
    a => { a.flags.swse.universalVehicleSource.source.armament.firingGroups[0].mountKeys = ['m']; },
    a => { a.system.cost = 1; }
  ];
  for (const mutate of cases) { const a = base(); mutate(a); assert.equal(runtime(a).kind, 'invalid-canonical'); }
});

test('all 429: runtime projection with an equipment Item is valid and identical to the source-only one', () => {
  for (const a of actors) {
    const c = structuredClone(a);
    c.items = [{ _id: 'e', type: 'equipment', system: {} }];
    const p = getVehicleRuntimeProjection(c), q = getVehicleRuntimeProjection(a);
    assert.deepEqual(p.published, q.published);
    assert.equal(p.installed.equipmentItemCount, 1);
  }
});

test('hook and store creation paths remain on the strict creation mode', () => {
  assert.doesNotMatch(readFileSync('scripts/actors/vehicle/vehicle-precreate-hooks.js', 'utf8'), /mode: 'runtime'/);
  const factory = readFileSync('scripts/engine/vehicles/vehicle-factory.js', 'utf8');
  assert.match(factory, /classifyVehicleActorSource\(\{ \.\.\.templateObj, type: 'vehicle' \}\)/);
});

// ---------- B. one verification implementation ----------
test('shared identity check: every drift code fires, and derived/attack consumers honor it', () => {
  const drifts = [
    ['SOURCE_IDENTITY_DRIFT', a => { a.system.vehicleSourceEntryKey = 'x'; }],
    ['SOURCE_PUBLICATION_DRIFT', a => { a.system.vehicleSourcePage = 999; }],
    ['SOURCE_CATEGORY_DRIFT', a => { a.system.vehicleSourcePrimaryCategory = 'walker'; }],
    ['SOURCE_MODEL_DRIFT', a => { a.system.model = 'Fiction'; }],
    ['SOURCE_ONLY_TRUST_REQUIRED', a => { a.flags.swse.canonicalPublication.physicalMountCertification = true; }],
    ['SOURCE_RECORD_DIGEST_DRIFT', a => { a.flags.swse.universalVehicleSource.source.durability.hitPoints = 1; }],
    ['SOURCE_EVIDENCE_MISSING', a => { delete a.flags.swse.universalVehicleSource.recordDigest; }]
  ];
  for (const [code, mutate] of drifts) {
    const a = base(); mutate(a);
    const errors = collectSourceIdentityErrors({ sys: a.system, canonical: a.flags.swse.canonicalPublication, universal: a.flags.swse.universalVehicleSource });
    assert.ok(errors.includes(code), code);
    // each consumer refuses the same actor
    assert.equal(getVerifiedPublishedRecord(a), null, code);
    assert.equal(getPublishedDerivedBase(a), null, code);
    assert.throws(() => getPublishedVehicleInitiative(a), /UNIVERSAL_VEHICLE_SOURCE_INVALID/, code);
    assert.equal(runtime(a).kind, 'invalid-canonical', code);
    assert.equal(classifyInstalledVehicleWeapon({ ...a, id: 'v', items: new Map() }, { id: 'system-weapons-0', name: 'x' }).kind, 'UNRESOLVED', code);
  }
  assert.ok(getVerifiedPublishedRecord(base()));
});

test('all 429 verify through the shared implementation', () => {
  for (const a of actors) {
    assert.deepEqual(collectSourceIdentityErrors({ sys: a.system, canonical: a.flags.swse.canonicalPublication, universal: a.flags.swse.universalVehicleSource }), []);
    assert.ok(claimsPublishedSource(a));
  }
});

test('a bare identity mirror is a publication claim and cannot masquerade as a custom vehicle', () => {
  const a = base(); delete a.flags.swse;
  assert.equal(claimsPublishedSource(a), true);
  assert.equal(getVerifiedPublishedRecord(a), null);
  assert.throws(() => getPublishedVehicleInitiative(a), /UNIVERSAL_VEHICLE_SOURCE_INVALID/);
  assert.equal(claimsPublishedSource({ type: 'vehicle', system: { speed: 3 }, flags: {} }), false);
});

test('derived builder flags an invalid claim instead of treating it as a plain custom vehicle', () => {
  const code = readFileSync('scripts/actors/v2/vehicle-derived-builder.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s+\{[^}]*\};?/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { getPublishedDerivedBase, claimsPublishedSource };
  runInNewContext(code + '\nglobalThis.b = buildVehicleDerived;', ctx);
  const bad = base(); bad.flags.swse.universalVehicleSource.source.durability.hitPoints = 1;
  ctx.b(bad, bad.system);
  assert.equal(bad.system.derived.sourceInvalid, true);
  const good = base(); ctx.b(good, good.system);
  assert.equal(good.system.derived.sourceInvalid, false);
  const custom = { type: 'vehicle', flags: {}, system: {} }; ctx.b(custom, custom.system);
  assert.equal(custom.system.derived.sourceInvalid, false);
});

// ---------- B. provenance update protection ----------
test('provenance updates: identity, source record and printed fields are immutable; play state is not', () => {
  const a = base();
  const deny = changes => assert.equal(checkProvenanceUpdate(a, changes).ok, false, JSON.stringify(changes));
  const allow = changes => assert.equal(checkProvenanceUpdate(a, changes).ok, true, JSON.stringify(changes));
  deny({ flags: { swse: { universalVehicleSource: { source: { durability: { hitPoints: 1 } } } } } });
  deny({ 'flags.swse.canonicalPublication.sourceEntryKey': 'x' });
  deny({ flags: { swse: { canonicalPublication: { foundryStockAttackTrusted: true } } } });
  deny({ system: { vehicleSourceEntryKey: 'x' } });
  deny({ 'system.vehiclePackName': 'x' });
  deny({ system: { model: 'Fiction' } });
  deny({ system: { hp: { max: 999 } } });
  deny({ 'system.initiative': 0 });
  deny({ system: { vehiclePublishedPrice: { status: 'priced', amountCredits: 1 } } });
  deny({ 'flags.swse.-=universalVehicleSource': null });
  deny({ flags: { swse: { '-=canonicalPublication': null } } });
  deny({ flags: { '-=swse': null } });
  deny({ flags: { swse: { '==universalVehicleSource': {} } } });
  allow({ name: 'Red Five', img: 'x.webp' });
  allow({ system: { hp: { value: 10 }, shields: { value: 3 }, notes: 'n', crewPositions: { pilot: { id: 'a' } } } });
  allow({ 'flags.swse.vehicleInstallations': [] });
  allow({ 'flags.other.thing': 1 });
  // re-submitting the current value is a no-op, not a change
  allow({ system: { model: a.system.model, hp: { max: a.system.hp.max } } });
  allow({ flags: { swse: { canonicalPublication: { sourceEntryKey: a.flags.swse.canonicalPublication.sourceEntryKey } } } });
  assert.deepEqual(checkProvenanceUpdate({ type: 'vehicle', flags: {}, system: {} }, { system: { model: 'x' } }), { ok: true, paths: [] });
  assert.equal(checkProvenanceUpdate({ type: 'character' }, { system: { model: 'x' } }).ok, true);
});

test('provenance guard is registered with the vehicle hooks', () => {
  const hooks = readFileSync('scripts/actors/vehicle/vehicle-precreate-hooks.js', 'utf8');
  assert.match(hooks, /Hooks\.on\('preUpdateActor', guardVehicleProvenance\)/);
  assert.match(hooks, /return false;/);
});
