import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { buildPhase3AcceptedSourcePreview } from '../tools/build-universal-vehicle-phase3-source-preview.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as M from '../scripts/domain/vehicles/vehicle-errata-migration.js';
import { digestUniversalVehicleSource } from '../scripts/domain/vehicles/vehicle-source-digest.js';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource } from '../scripts/domain/vehicles/vehicle-published-derived.js';

installSystemsResolver(); installFoundryStubs();
const { guardVehicleProvenance, applyChangesToCopy } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { VehicleErrataMigrationService: S } = await import('../scripts/engine/vehicles/vehicle-errata-migration-service.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { buildVehicleSheetContext } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const { buildVehicleAssetSummary } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');

const canonical = readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(JSON.parse);
const preview = new Map(buildPhase3AcceptedSourcePreview().records.map(r => [r.identity.sourceEntryKey, r]));
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const doc = key => structuredClone(docs.find(d => d.flags.swse.canonicalPublication.sourceEntryKey === key));
const AFFECTED = ['sotg-immobilizer-418-interdictor-class-heavy-cruiser', 'sotg-koensayr-btl-a4-lp-longprobe', 'sotg-koensayr-btl-s3-courier', 'sotg-koensayr-btl-s3-y-wing'];
const YW = 'sotg-koensayr-btl-s3-y-wing', IC = 'sotg-immobilizer-418-interdictor-class-heavy-cruiser';

test('the amendment JSON and the shared migration constant are identical (one authority)', () => {
  const j = JSON.parse(readFileSync('data/audits/vehicles/swse-universal-p6a-sotg-errata-amendment.json', 'utf8'));
  assert.equal(j.id, M.SOTG_ERRATA_AMENDMENT.id);
  assert.deepEqual(JSON.parse(JSON.stringify(M.SOTG_ERRATA_AMENDMENT.records)), j.records);
});

test('exactly four canonical publication records change; all other 425 are identical to the accepted source', () => {
  assert.equal(canonical.length, 429);
  assert.deepEqual(canonical.map(r => r.identity.sourceEntryKey).sort(), [...preview.keys()].sort(), 'identities unchanged');
  const changed = canonical.filter(r => JSON.stringify(r) !== JSON.stringify(preview.get(r.identity.sourceEntryKey))).map(r => r.identity.sourceEntryKey).sort();
  assert.deepEqual(changed, AFFECTED);
  for (const key of AFFECTED) {
    const r = canonical.find(x => x.identity.sourceEntryKey === key);
    assert.deepEqual(M.applyErrataToRecord(preview.get(key), M.errataEntryFor(key)).record, r, 'change is exactly the errata');
  }
});

test('Y-wing SR 25 reaches pack Actors, mirrors, digests, runtime projection and derived shield pool; other Y-wings untouched', () => {
  for (const key of AFFECTED.slice(1)) {
    const d = doc(key);
    assert.equal(d.flags.swse.universalVehicleSource.source.defenses.shieldRating, 25);
    assert.equal(d.flags.swse.universalVehicleSource.recordDigest, digestUniversalVehicleSource(d.flags.swse.universalVehicleSource.source));
    assert.deepEqual([d.system.shieldRating, d.system.shields.value, d.system.shields.max], [25, 25, 25]);
    const a = { ...d, toObject: () => structuredClone(d) };
    assert.equal(classifyVehicleActorSource(a).kind, 'canonical');
    assert.equal(getVehicleRuntimeProjection(a).published.defenses.shield.value, 25);
    assert.equal(getEffectiveVehicleDerived(a).shieldMax, 25);
  }
  // V2 sheet and Asset Bay read the same corrected baseline
  const yw = doc(YW), ywActor = { ...yw, id: 'y1', isOwner: true, items: [], toObject: () => structuredClone(yw) };
  assert.equal(buildVehicleSheetContext(ywActor, { editable: true }, {}).publicationView.shield.label, 'SR 25 / 25');
  assert.equal(buildVehicleAssetSummary(ywActor).shieldLabel, 'Shields 25/25');
  assert.equal(doc('core-koensayr-y-wing-starfighter').system.shieldRating, 25);
  assert.equal(doc('cw-koensayr-btl-s1-y-wing').system.shieldRating, 10);
});

test('Interdictor: corrected 3x3 reference area; printed groups stay reference-only; generic component unchanged', () => {
  const d = doc(IC);
  const groups = d.flags.swse.universalVehicleSource.source.armament.firingGroups;
  assert.match(groups[1].specialNotes, /3x3 starship squares \(Errata 1\.0; printed 4x4\)/);
  assert.match(d.flags.swse.universalVehicleSource.source.exceptions.specialRules[0].summary, /"statblockAreaSquares":"3x3"/);
  assert.deepEqual(d.system.sourceAttackGroups, groups);
  assert.ok(groups.every(g => g.mountKeys.length === 0));
  assert.deepEqual(d.system.weapons, []);
  const a = { ...d, toObject: () => structuredClone(d) };
  assert.equal(getVehicleRuntimeProjection(a).published.attackGroupsExecutable, false);
  assert.equal(getVehicleRuntimeProjection(a).installed.mounts.length, 0);
  const gw = JSON.parse(readFileSync('data/vehicle-modifications/weapon-systems.json', 'utf8')).find(x => x.id === 'gravity-well-projector');
  assert.match(gw.effect, /4x4/);
});

// ---- world migration ----
function oldActor(key, { shieldsValue } = {}) {
  const d = doc(key), old = preview.get(key);
  d._id = 'a-' + key.slice(-6);
  d.flags.swse.universalVehicleSource = { ...d.flags.swse.universalVehicleSource, source: structuredClone(old), recordDigest: digestUniversalVehicleSource(old) };
  if (old.defenses.shieldRating !== d.system.shieldRating) { d.system.shieldRating = old.defenses.shieldRating; d.system.shields = { value: shieldsValue ?? old.defenses.shieldRating, max: old.defenses.shieldRating }; }
  d.system.sourceAttackGroups = structuredClone(old.armament.firingGroups);
  const actor = { ...d, id: d._id, toObject() { const { toObject, ...rest } = this; return structuredClone(rest); } };
  assert.equal(classifyVehicleActorSource(actor, undefined, { mode: 'runtime' }).kind, 'canonical', 'a pre-errata world Actor is still a valid source-backed vehicle');
  return actor;
}

test('plan: preview, preserved current shields by default, GM confirmation for initialize-full, idempotence, rejection', () => {
  const a = oldActor(YW, { shieldsValue: 4 });
  const p = M.planErrataMigration(a);
  assert.equal(p.status, 'READY');
  assert.deepEqual([p.preview.original.shieldsValue, p.preview.original.shieldsMax, p.preview.corrected.shieldsValue, p.preview.corrected.shieldsMax], [4, 10, 4, 25]);
  assert.equal('system.shields.value' in p.update, false, 'current shield value untouched (4/10 -> 4/25)');
  assert.deepEqual(M.planErrataMigration(a, { shieldPolicy: 'initialize-full' }).reasons, ['SHIELD_INITIALIZATION_REQUIRES_GM_CONFIRMATION']);
  assert.equal(M.planErrataMigration(a, { shieldPolicy: 'initialize-full', gmConfirmedUndamaged: true }).update['system.shields.value'], 25);
  // applying the plan makes the Actor valid and already migrated
  const migrated = applyChangesToCopy(a.toObject(), p.update);
  assert.equal(classifyVehicleActorSource(migrated, undefined, { mode: 'runtime' }).kind, 'canonical');
  assert.equal(M.planErrataMigration(migrated).status, 'ALREADY_MIGRATED');
  // tampered provenance and unrelated vehicles
  const bad = oldActor(YW); bad.flags.swse.universalVehicleSource.source.defenses.reflex += 1;
  assert.equal(M.planErrataMigration(bad).status, 'REJECTED');
  assert.ok(M.planErrataMigration(bad).reasons.includes('INVALID_SOURCE_PROVENANCE'));
  assert.equal(M.planErrataMigration(oldActor('cw-koensayr-btl-s1-y-wing')).status, 'NOT_AFFECTED');
  const ic = M.planErrataMigration(oldActor(IC));
  assert.equal(ic.status, 'READY');
  assert.match(JSON.stringify(ic.update['system.sourceAttackGroups']), /3x3/);
});

// fake world: ActorEngine.updateActor runs the real provenance guard; hooks let a test refuse/alter writes
function world(actors, { gm = true, onWrite = null } = {}) {
  const map = new Map(actors.map(a => [a.id, a]));
  globalThis.game = { user: { id: gm ? 'gm1' : 'u1', name: 'GM', isGM: gm }, actors: { contents: actors, get: id => map.get(id) }, scenes: { contents: [] } };
  const writes = [];
  ActorEngine.updateActor = async (actor, update) => {
    if (guardVehicleProvenance(actor, update) === false) throw new Error('PROVENANCE_GUARD_DENIED');
    const verdict = onWrite?.(actor, update, writes.length);
    if (verdict === 'throw') throw new Error('simulated write failure');
    if (verdict === 'ignore') { writes.push({ id: actor.id, keys: Object.keys(update), ignored: true }); return; }
    Object.assign(actor, applyChangesToCopy(actor.toObject(), update));
    if (typeof verdict === 'function') verdict(actor);
    writes.push({ id: actor.id, keys: Object.keys(update) });
  };
  return writes;
}
const fp = a => ({ [a.id]: M.migrationFingerprint(a) });
const isMigrationWrite = u => u['flags.swse.errataMigrations']?.length > 0;

test('service: GM only; backup then authorized migration; record; idempotent; unauthorized writes still denied', async () => {
  const a = oldActor(YW, { shieldsValue: 4 });
  world([a], { gm: false });
  assert.deepEqual((await S.apply({ actorIds: [a.id] })).reasons, ['GM_REQUIRED']);
  assert.deepEqual(S.preview().reasons, ['GM_REQUIRED']);
  assert.deepEqual((await S.restore(a.id, { gmConfirmed: true })).reasons, ['GM_REQUIRED']);
  const writes = world([a]);
  const pv = S.preview();
  assert.equal(pv.counts.READY, 1);
  const r = await S.apply({ actorIds: [a.id, a.id], expectedFingerprints: { [a.id]: pv.plans[0].fingerprint } });
  assert.deepEqual(r.migrated, [a.id], 'duplicate ids collapsed');
  assert.deepEqual([a.system.shieldRating, a.system.shields.value, a.system.shields.max], [25, 4, 25]);
  assert.equal(a.flags.swse.universalVehicleSource.source.defenses.shieldRating, 25);
  const rec = a.flags.swse.errataMigrations[0];
  assert.deepEqual([rec.version, rec.errataId, rec.gmUserId, rec.original.shieldsMax, rec.corrected.shieldsMax], [M.ERRATA_MIGRATION_VERSION, 'SOTG-E1-Y-WING-SHIELDS', 'gm1', 10, 25]);
  assert.equal(a.flags.swse.errataMigrationBackups[M.ERRATA_MIGRATION_VERSION].shields.max, 10);
  assert.ok(writes[0].keys[0].startsWith('flags.swse.errataMigrationBackups'), 'backup written first');
  const again = await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  assert.deepEqual(again.skipped.map(x => x.status), ['ALREADY_MIGRATED']);
  assert.equal(guardVehicleProvenance(a, { 'flags.swse.universalVehicleSource.source.defenses.shieldRating': 10 }), false);
  builder(a, a.system);
  assert.deepEqual([a.system.derived.shield.current, a.system.derived.shield.max], [4, 25], 'mitigation and recharge use the corrected maximum');
});

test('integrity: stale preview, concurrent request, missing fingerprint', async () => {
  const a = oldActor(YW, { shieldsValue: 6 });
  world([a]);
  const stale = M.migrationFingerprint(a);
  Object.assign(a, applyChangesToCopy(a.toObject(), { 'system.shields.value': 3 })); // changed (e.g. by another GM) after preview
  assert.deepEqual((await S.apply({ actorIds: [a.id], expectedFingerprints: { [a.id]: stale } })).skipped.map(x => x.status), ['STALE_PREVIEW']);
  assert.deepEqual((await S.apply({ actorIds: [a.id] })).skipped.map(x => x.status), ['STALE_PREVIEW'], 'a fingerprint is required');
  const [r1, r2] = await Promise.all([S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) }), S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) })]);
  assert.equal(r1.migrated.length + r2.migrated.length, 1);
  assert.ok([...r1.skipped, ...r2.skipped].some(x => x.status === 'IN_PROGRESS'));
  assert.equal(a.flags.swse.errataMigrations.length, 1, 'one migration record');
});

test('integrity: refused write, altered persisted state, unpersisted backup and failed recovery are all reported', async () => {
  // 1. Foundry refuses the migration write without throwing -> verification fails -> recovered
  let a = oldActor(YW, { shieldsValue: 5 });
  world([a], { onWrite: (_x, u) => (isMigrationWrite(u) ? 'ignore' : null) });
  let r = await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  assert.ok(r.failed[0].reasons.includes('SOURCE_NOT_PERSISTED'));
  assert.equal(r.failed[0].recovered, true);
  assert.deepEqual([a.system.shields.value, a.system.shields.max], [5, 10]);
  // 2. a recalculation changes protected state after the write -> CURRENT_SHIELDS_CHANGED -> recovered
  a = oldActor(YW, { shieldsValue: 5 });
  world([a], { onWrite: (_x, u) => (isMigrationWrite(u) ? actor => { actor.system.shields.value = 25; } : null) });
  r = await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  assert.ok(r.failed[0].reasons.includes('CURRENT_SHIELDS_CHANGED'));
  assert.equal(r.failed[0].recovered, true);
  assert.equal(a.system.shields.value, 5);
  assert.equal((a.flags.swse.errataMigrations ?? []).length, 0, 'no migration record survives a failed correction');
  // 3. backup not persisted -> no migration attempted
  a = oldActor(YW, { shieldsValue: 5 });
  const w = world([a], { onWrite: (_x, u) => (Object.keys(u)[0].startsWith('flags.swse.errataMigrationBackups') ? 'ignore' : null) });
  r = await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  assert.deepEqual(r.failed[0].reasons, ['BACKUP_NOT_PERSISTED']);
  assert.equal(w.filter(x => !x.ignored).length, 0);
  // 4. the migration write throws and so does the recovery -> reported as not recovered
  a = oldActor(YW, { shieldsValue: 5 });
  world([a], { onWrite: (_x, u, n) => (n >= 1 ? 'throw' : null) });
  r = await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  assert.equal(r.failed[0].recovered, false);
  assert.ok(r.failed[0].recoveryProblems.includes('RECOVERY_WRITE_FAILED'));
});

test('manual restoration keeps post-migration gameplay, needs a GM decision for conflicts, and is audited', async () => {
  const a = oldActor(YW, { shieldsValue: 4 });
  world([a]);
  await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  // gameplay after migration: more damage
  Object.assign(a, applyChangesToCopy(a.toObject(), { 'system.shields.value': 2 }));
  const pv = S.previewRestore(a.id);
  assert.equal(pv.status, 'READY');
  assert.deepEqual(pv.gameplayChanges, [{ field: 'system.shields.value', atMigration: 4, now: 2 }]);
  assert.deepEqual((await S.restore(a.id, { expectedFingerprint: pv.fingerprint })).reasons, ['GM_CONFIRMATION_REQUIRED']);
  const r = await S.restore(a.id, { gmConfirmed: true, expectedFingerprint: pv.fingerprint });
  assert.equal(r.ok, true);
  assert.deepEqual([a.system.shields.value, a.system.shields.max, a.system.shieldRating], [2, 10, 10], 'current shields preserved, maximum restored');
  assert.equal(a.flags.swse.universalVehicleSource.source.defenses.shieldRating, 10);
  assert.equal(a.flags.swse.errataMigrationRestorations[0].gameplayChangesKept[0].now, 2);
  assert.equal(classifyVehicleActorSource(a.toObject(), undefined, { mode: 'runtime' }).kind, 'canonical');
  assert.deepEqual(S.previewRestore(a.id).reasons, ['NO_ACTIVE_MIGRATION'], 'repeated restoration refused');
});

test('manual restoration: recharge above the old maximum needs an explicit clamp decision; stale preview refused', async () => {
  const a = oldActor(YW, { shieldsValue: 4 });
  world([a]);
  await S.apply({ actorIds: [a.id], expectedFingerprints: fp(a) });
  Object.assign(a, applyChangesToCopy(a.toObject(), { 'system.shields.value': 20 })); // recharged / repaired after migration
  const pv = S.previewRestore(a.id);
  assert.equal(pv.status, 'NEEDS_GM_DECISION');
  assert.deepEqual((await S.restore(a.id, { gmConfirmed: true, expectedFingerprint: pv.fingerprint })).reasons, ['CURRENT_SHIELDS_EXCEED_RESTORED_MAXIMUM']);
  Object.assign(a, applyChangesToCopy(a.toObject(), { 'system.shields.value': 19 }));
  assert.deepEqual((await S.restore(a.id, { gmConfirmed: true, expectedFingerprint: pv.fingerprint, shieldDecision: 'clamp-to-restored-max' })).reasons, ['ACTOR_CHANGED_SINCE_PREVIEW']);
  const pv2 = S.previewRestore(a.id, { shieldDecision: 'clamp-to-restored-max' });
  const r = await S.restore(a.id, { gmConfirmed: true, expectedFingerprint: pv2.fingerprint, shieldDecision: 'clamp-to-restored-max' });
  assert.equal(r.ok, true);
  assert.deepEqual([a.system.shields.value, a.system.shields.max], [10, 10]);
  assert.equal(a.flags.swse.errataMigrationRestorations[0].shieldDecision, 'clamp-to-restored-max');
});

test('Interdictor migrates and restores its reference text; custom-built ships and unrelated vehicles are never touched', async () => {
  const ic = oldActor(IC);
  world([ic]);
  const r = await S.apply({ actorIds: [ic.id], expectedFingerprints: fp(ic) });
  assert.deepEqual(r.migrated, [ic.id]);
  assert.match(JSON.stringify(ic.system.sourceAttackGroups), /3x3/);
  assert.deepEqual(ic.system.weapons, []);
  const pv = S.previewRestore(ic.id);
  assert.equal((await S.restore(ic.id, { gmConfirmed: true, expectedFingerprint: pv.fingerprint })).ok, true);
  assert.match(JSON.stringify(ic.system.sourceAttackGroups), /4x4 starship squares/);
  // custom-built ship (construction record, no publication claim)
  const custom = { _id: 'c1', id: 'c1', type: 'vehicle', name: 'Custom', system: { hp: { value: 30, max: 30 }, shields: { value: 10, max: 10 } }, flags: { swse: { vehicleConstruction: { schema: 'x' } } } };
  custom.toObject = function () { const { toObject, ...rest } = this; return structuredClone(rest); };
  assert.equal(M.planErrataMigration(custom).status, 'NOT_AFFECTED');
  world([custom, ic]);
  assert.equal(S.preview().plans.some(p => p.actorId === 'c1'), false);
});

test('unlinked token Actors are reported, never migrated', () => {
  const a = oldActor(YW);
  world([]);
  globalThis.game.scenes = { contents: [{ id: 's1', name: 'Space', tokens: { contents: [{ id: 't1', name: 'Gold 2', actorLink: false, actor: a }, { id: 't2', name: 'Linked', actorLink: true, actor: a }] } }] };
  const scan = S.scanUnlinkedTokens();
  assert.deepEqual(scan.tokens.map(t => [t.tokenId, t.status]), [['t1', 'READY']]);
  assert.match(scan.note, /reported only/);
});

const builder = (() => {
  const code = readFileSync('scripts/actors/v2/vehicle-derived-builder.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s+\{[^}]*\};?/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource };
  runInNewContext(code + '\nglobalThis.build = buildVehicleDerived;', ctx);
  return ctx.build;
})();

test('provenance write-authorization never mutates the caller update (regression: restore deletion key leaked into the backup)', async () => {
  const I = await import('../scripts/domain/vehicles/vehicle-source-identity.js');
  const update = { 'flags.swse.universalVehicleSource': { source: { publication: { book: 'B' } } }, 'flags.swse.universalVehicleSource.source.publication.-=errataApplied': null };
  const before = JSON.stringify(update);
  I.authorizeProvenanceMigration('x', update);
  I.clearProvenanceMigration('x');
  assert.equal(JSON.stringify(update), before);
  assert.deepEqual(M.restoreDeletions({ universalVehicleSource: { source: { publication: {} } } }), { 'flags.swse.universalVehicleSource.source.publication.-=errataApplied': null });
});
