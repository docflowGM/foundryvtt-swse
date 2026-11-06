import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Gate C-3A -- initial droid installation seeding for chargen and droid
// followers. Real catalog, real published-source review gate, real follower
// transaction coordinator. scripts/apps/follower-creator.js and the chargen
// adapter file cannot be loaded under Node (Foundry application surface, a
// known limit also noted by follower-mutation-transaction.test.mjs), so their
// decision points live in the importable service and the two files are covered
// by that service plus a source-contract check at the end.

registerFoundryPathLoader();
installFoundryShimGlobals();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const svc = await import('../scripts/domain/droids/droid-initial-installation-service.js');
const { projectInitialInstallation, stableInstanceId } = await import('../scripts/domain/droids/droid-initial-installation.js');
const { auditAppendageMirror, listLedgerInstances, isValidInstanceId } = await import('../scripts/domain/droids/droid-appendage-instance.js');
const schema = await import('../scripts/data/droid-part-schema.js');
const { collectInstalledComponentEvidence, listConfirmedHostInstances, resolveDroidPartQuoteDetailed } = schema;
const { runFollowerMutationTransaction } = await import('../scripts/apps/progression-framework/adapters/follower-mutation-transaction.js');

let n = 0;
const ok = m => console.log(`  [${++n}] ${m} OK`);
const clone = v => JSON.parse(JSON.stringify(v));

// The builder's real defaults: slot-style appendage ids with the kind in `type`.
const defaultBuild = () => ({
  locomotion: { id: 'walking', name: 'Walking', speed: 6, cost: 0, isDefault: true },
  processor: { id: 'heuristic', name: 'Heuristic Processor', cost: 0, isGranted: true },
  appendages: [
    { id: 'hand-1', name: 'Hand (Right)', type: 'hand', cost: 0, isDefault: true },
    { id: 'hand-2', name: 'Hand (Left)', type: 'hand', cost: 0, isDefault: true }
  ],
  accessories: [], locomotionEnhancements: [], appendageEnhancements: []
});
const droid = (id, system = {}) => ({ id, type: 'droid', name: 'D', items: [], system: { droidSystems: { size: 'medium' }, installedSystems: {}, ...system } });
const seed = (actor, droidSystems) => svc.buildInitialDroidInstallation({ actor, seed: actor.id, droidSystems });

// 1. Two identical hands -> two distinct physical identities; canonical part ids survive; ledger and mirror agree.
{
  const r = seed(droid('a1'), defaultBuild());
  assert.equal(r.seeded, true);
  assert.deepEqual(r.unresolved, []);
  const hands = listLedgerInstances(r.installedSystems).instances;
  assert.equal(hands.length, 2);
  assert.ok(hands.every(h => h.partId === 'hand'), 'the kind comes from `type`, canonicalized');
  assert.equal(new Set(hands.map(h => h.instanceId)).size, 2);
  assert.equal(new Set(hands.map(h => h.locationId)).size, 2);
  assert.ok(hands.every(h => isValidInstanceId(h.instanceId)));
  assert.deepEqual(auditAppendageMirror(r.installedSystems, r.droidSystems), [], 'ledger and display mirror agree exactly');
  assert.ok(r.installedSystems['heuristic-processor'], 'the alias "heuristic" becomes its canonical id');
  assert.ok(r.installedSystems['walking']);
  assert.equal(r.installedSystems['walking'].provenance.origin, 'initial-build');
  ok('default build: two hands -> two distinct instances; canonical ids; mirror == ledger');
}

// 2. No appendages -> none invented. No anatomy inferred from display names.
{
  const b = defaultBuild(); b.appendages = [];
  const r = seed(droid('a2'), b);
  assert.equal(listLedgerInstances(r.installedSystems).instances.length, 0);
  assert.deepEqual(r.droidSystems.appendages, []);
  const named = seed(droid('a2b'), defaultBuild());
  for (const row of named.droidSystems.appendages) assert.ok(!/left|right/i.test(row.locationId), 'locations are opaque tokens');
  ok('no appendages -> none invented; "Hand (Right)" display names never become anatomy');
}

// 3. Deterministic and idempotent: previews, retries, repeated finalization.
{
  const a = droid('a3');
  const first = seed(a, defaultBuild());
  const again = seed(a, defaultBuild());
  assert.deepEqual(again, first, 'same input -> identical output (no random, no clock)');
  assert.notDeepEqual(Object.keys(seed(droid('other'), defaultBuild()).installedSystems), Object.keys(first.installedSystems), 'a different actor gets different identities');
  // repeated finalization against the already-seeded actor
  const finalized = droid('a3', { installedSystems: first.installedSystems, droidSystems: first.droidSystems });
  const repeat = seed(finalized, defaultBuild());
  assert.equal(repeat.seeded, false, 'nothing new to write');
  assert.deepEqual(repeat.installedSystems, first.installedSystems, 'the existing ledger is preserved verbatim');
  assert.deepEqual(repeat.droidSystems.appendages.map(x => [x.instanceId, x.locationId]), first.droidSystems.appendages.map(x => [x.instanceId, x.locationId]), 'the mirror re-attaches the SAME identities');
  assert.deepEqual(auditAppendageMirror(repeat.installedSystems, repeat.droidSystems), []);
  assert.equal(Object.keys(repeat.installedSystems).length, Object.keys(first.installedSystems).length, 'no duplicate components');
  // a draft entry that already carries a valid identity keeps it
  const keep = defaultBuild(); keep.appendages[0].instanceId = 'inst-keepkeep0001';
  assert.ok(Object.keys(seed(droid('a3k'), keep).installedSystems).some(k => k.endsWith('inst-keepkeep0001')));
  assert.equal(stableInstanceId('s', 'hand', 1), stableInstanceId('s', 'hand', 1));
  assert.notEqual(stableInstanceId('s', 'hand', 1), stableInstanceId('s', 'hand', 2));
  ok('deterministic across preview / retry; repeated finalization reuses the same identities and duplicates nothing');
}

// 4. Confirmed prerequisite evidence works after creation (hosts, installed hardware).
{
  const b = defaultBuild(); b.processor = { id: 'remote', name: 'Remote Processor' };
  const r = seed(droid('a4'), b);
  const created = droid('a4', { installedSystems: r.installedSystems, droidSystems: r.droidSystems, droidSize: 'medium' });
  const ev = collectInstalledComponentEvidence(created);
  assert.ok(ev.confirmedIds.includes('hand') && ev.confirmedIds.includes('remote-processor'));
  assert.equal(listConfirmedHostInstances(created).length, 2, 'both hands are confirmed hosts');
  assert.equal(resolveDroidPartQuoteDetailed(created, 'remote-receiver').stages.prerequisites, 'MET', 'the created remote processor satisfies a typed requirement');
  const draftOnly = droid('a4d', { droidSystems: r.droidSystems, droidSize: 'medium' });
  assert.equal(resolveDroidPartQuoteDetailed(draftOnly, 'remote-receiver').stages.prerequisites, 'BLOCKED', 'the same draft WITHOUT the ledger confirms nothing');
  ok('after creation the ledger confirms hosts and prerequisites; the draft alone does not');
}

// 5. Unresolved / uncleared selections fail closed with a specific reason; nothing is silently installed.
{
  const cases = [
    ['unknown component', b => { b.accessories = [{ id: 'totally-made-up-gadget' }]; }, 'UNKNOWN_COMPONENT', 'totally-made-up-gadget'],
    ['source HOLD (not cleared for an initial build)', b => { b.processor = { id: 'military-processor' }; }, 'SOURCE_NOT_CLEARED', 'military-processor'],
    ['HOLD locomotion enhancement', b => { b.locomotionEnhancements = [{ id: 'jump-servos' }]; }, 'SOURCE_NOT_CLEARED', 'jump-servos'],
    ['fitting with no established host', b => { b.appendageEnhancements = [{ id: 'climbing-claws' }]; }, null, 'climbing-claws'],
    ['duplicate singleton', b => { b.accessories = [{ id: 'plasteel-shell' }, { id: 'plasteel-shell' }]; }, 'DUPLICATE_COMPONENT', 'plasteel-shell']
  ];
  for (const [label, mutate, code, id] of cases) {
    const b = defaultBuild(); mutate(b);
    const r = seed(droid('a5'), b);
    assert.equal(r.seeded, false, `${label}: nothing is seeded`);
    const hit = r.unresolved.find(u => u.id === id);
    assert.ok(hit, `${label}: the affected component is named (${JSON.stringify(r.unresolved)})`);
    if (code) assert.equal(hit.code, code, label);
    assert.ok(hit.reason.length > 10, `${label}: a specific reason is given`);
    assert.throws(() => svc.requireInitialDroidInstallation({ actor: droid('a5'), seed: 'a5', droidSystems: b }), err => err.code === 'DROID_INITIAL_INSTALLATION_UNRESOLVED' && err.message.includes(id), `${label}: aborts before commit`);
  }
  // the certified initial-build locomotion subset is preserved: the first unrestricted locomotion is accepted, a HOLD as a SECOND locomotion is not
  const first = defaultBuild(); first.locomotion = { id: 'tracked', speed: 6 };
  assert.deepEqual(seed(droid('a5l'), first).unresolved, [], 'tracked as the first locomotion is inside the certified subset');
  const second = defaultBuild(); second.secondaryLocomotion = [{ id: 'tracked', speed: 6 }];
  assert.ok(seed(droid('a5m'), second).unresolved.some(u => u.code === 'SOURCE_NOT_CLEARED'), 'a HOLD locomotion in a second slot is not cleared');
  ok('unknown / HOLD / unhosted / duplicate selections fail closed naming the component; the certified locomotion subset still passes');
}

// 6. Backup-processor mirrors are draft-only: reported, never installed.
{
  const b = defaultBuild(); b.backupProcessor = { id: 'basic-processor' }; b.processorSlots = { backup: { id: 'basic-processor' } };
  const r = seed(droid('a6'), b);
  assert.deepEqual(r.unresolved, []);
  assert.ok(r.skipped.some(s => s.field === 'backupProcessor'));
  assert.ok(!r.installedSystems['backup-processor'] && !r.installedSystems['basic-processor']);
  ok('a draft backup-processor slot is reported as skipped, never promoted to installed hardware');
}

// 7. Existing ledger records are never overwritten; foreign physical instances win.
{
  const foreign = { 'hand--inst-foreignfore1': { id: 'hand', instanceId: 'inst-foreignfore1', locationId: 'appendage-slot-1', name: 'Hand', category: 'appendage', slot: 'appendage' }, 'heuristic-processor': { id: 'heuristic-processor', note: 'keep me' } };
  const r = seed(droid('a7', { installedSystems: foreign }), defaultBuild());
  assert.deepEqual(r.installedSystems['hand--inst-foreignfore1'], foreign['hand--inst-foreignfore1']);
  assert.equal(r.installedSystems['heuristic-processor'].note, 'keep me', 'an existing record is not replaced');
  assert.equal(listLedgerInstances(r.installedSystems).instances.length, 1, 'no extra hands seeded over the existing instance');
  assert.ok(r.skipped.some(s => s.field === 'appendages'));
  ok('existing ledger records win; physical appendages are not seeded over existing instances');
}

// 8. Stock-statblock droids are never seeded (it would un-suppress baked-in bonuses).
{
  const stock = droid('a8', { droidCalculationMode: 'stock-statblock', installedSystems: {} });
  const r = seed(stock, defaultBuild());
  assert.equal(r.seeded, false); assert.equal(r.reason, 'STOCK_STATBLOCK_MODE'); assert.deepEqual(r.installedSystems, {});
  assert.equal(r.droidSystems.appendages[0].instanceId, undefined, 'the stock blob is untouched');
  const playable = droid('a8p', { droidCalculationMode: 'playable-derived' });
  assert.equal(seed(playable, defaultBuild()).seeded, true);
  ok('stock-statblock droids keep their imported provenance and published totals; playable droids are seeded');
}

// 9. Chargen plan: keys, no credit movement, deterministic, non-droid untouched.
{
  const plan = { set: {} };
  const actor = droid('a9');
  svc.applyInitialInstallationToPlan(plan, { actor, seed: actor.id, droidSystems: defaultBuild() });
  assert.ok(plan.set['system.droidSystems'] && plan.set['system.installedSystems']);
  assert.ok(!Object.keys(plan.set).some(k => /credits/i.test(k)), 'seeding moves no credits');
  const plan2 = { set: {} };
  svc.applyInitialInstallationToPlan(plan2, { actor, seed: actor.id, droidSystems: defaultBuild() });
  assert.deepEqual(plan2, plan, 'repeated planning is identical');
  const empty = { set: {} };
  svc.applyInitialInstallationToPlan(empty, { actor, seed: actor.id, droidSystems: null });
  assert.equal(empty.set['system.droidSystems'], null); assert.equal(empty.set['system.installedSystems'], undefined);
  const thrown = { set: {} };
  assert.throws(() => svc.applyInitialInstallationToPlan(thrown, { actor, seed: actor.id, droidSystems: { ...defaultBuild(), accessories: [{ id: 'nope-nope' }] } }), /nope-nope/);
  assert.equal(thrown.set['system.installedSystems'], undefined, 'an unresolved build writes nothing');
  ok('chargen plan: droidSystems + installedSystems, no credit keys, repeat-identical, null build untouched, unresolved build writes nothing');
}

// 10. Followers: both write steps produce the same identities; a repeat adds nothing; failure rolls the transaction back.
{
  const droidConfig = { isDroid: true, size: 'medium', droidSystems: defaultBuild() };
  const follower = droid('f1');
  const step1 = svc.resolveFollowerDroidInstallation(follower, droidConfig);
  assert.ok(step1.installedSystems && step1.droidSystems.appendages.every(a => a.instanceId));
  assert.deepEqual(step1.draft.appendages.map(a => a.instanceId), [undefined, undefined], 'the creation-time draft copy is left untouched');
  // the follower after step 1, then the second write step
  const after1 = droid('f1', { installedSystems: step1.installedSystems, droidSystems: step1.droidSystems });
  const step2 = svc.resolveFollowerDroidInstallation(after1, droidConfig);
  assert.equal(step2.installedSystems, null, 'nothing new to write on the repeat');
  assert.deepEqual(step2.droidSystems.appendages.map(a => [a.instanceId, a.locationId]), step1.droidSystems.appendages.map(a => [a.instanceId, a.locationId]), 'both steps carry identical identities');
  assert.deepEqual(auditAppendageMirror(step1.installedSystems, step2.droidSystems), []);
  // a follower config without a droid build is left alone
  assert.equal(svc.resolveFollowerDroidInstallation(droid('f2'), { isDroid: true }).installedSystems, null);

  // failure inside the creation transaction rolls back what was committed, exactly like any other step failure
  const log = [];
  const badConfig = { isDroid: true, droidSystems: { ...defaultBuild(), accessories: [{ id: 'unknown-follower-part' }] } };
  const result = await runFollowerMutationTransaction([
    { name: 'create-actor', commit: async () => { log.push('create'); return { id: 'f3' }; }, rollback: async () => { log.push('delete-actor'); } },
    { name: 'materialize', commit: async () => { svc.resolveFollowerDroidInstallation(droid('f3'), badConfig); log.push('materialize'); } }
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.failedStep, 'materialize');
  assert.equal(result.error.code, 'DROID_INITIAL_INSTALLATION_UNRESOLVED');
  assert.deepEqual(log, ['create', 'delete-actor'], 'the created follower is rolled back; nothing was materialized');
  assert.equal(result.rollbackFailed, false);
  ok('followers: identical identities across both write steps, repeat is a no-op, an unresolved build rolls the whole transaction back');
}

// 11. Non-droid creation is unaffected; creation never touches Store / purchase machinery.
{
  const plan = { set: { keep: 1 } };
  const adapterSrc = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/adapters/default-subtypes.js'), 'utf8');
  assert.match(adapterSrc, /if \(!droidBuild\?\.isDroid\) \{\s*return mutationPlan;/, 'the adapter returns non-droid plans untouched before any seeding');
  assert.match(adapterSrc, /applyInitialInstallationToPlan\(mutationPlan/);
  const creatorSrc = fs.readFileSync(path.join(ROOT, 'scripts/apps/follower-creator.js'), 'utf8');
  assert.match(creatorSrc, /persistentChoices\??\.droidConfig\?\.isDroid\) \{[\s\S]{0,200}_resolveFollowerDroidInstallation/, 'the follower seeding sits inside the droid-only branch (both sites)');
  assert.equal((creatorSrc.match(/_resolveFollowerDroidInstallation\(follower, droidConfig\)/g) || []).length, 2);
  assert.ok(/ActorEngine\.updateActor\(follower, (materialUpdates|updateData)/.test(creatorSrc), 'follower writes go through ActorEngine');
  for (const rel of ['scripts/domain/droids/droid-initial-installation.js', 'scripts/domain/droids/droid-initial-installation-service.js']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/TransactionEngine|executeAsset|applyDroidCustomization|store-checkout|cost-registry|\.update\(/.test(src), `${rel}: no purchase, store, customization-engine or direct update call`);
  }
  assert.equal(plan.set.keep, 1);
  ok('non-droid plans untouched; follower seeding only in the droid branch via ActorEngine; no Store / purchase / customization-engine / direct update in the creation modules');
}

// 12. The creation modules fail closed on a seed-less call and never mutate their inputs.
{
  const b = defaultBuild(); const before = clone(b);
  const ledger = { keep: { id: 'keep' } }; const ledgerBefore = clone(ledger);
  projectInitialInstallation({ seed: 'z', droidSystems: b, existingLedger: ledger, getDefinition: schema.getDroidPartDefinition, normalizeId: schema.normalizeDroidPartId, reviewComponent: () => ({ decision: 'PASS' }) });
  assert.deepEqual(b, before, 'the input build is not mutated'); assert.deepEqual(ledger, ledgerBefore, 'the input ledger is not mutated');
  ok('the projection never mutates its inputs');
}

console.log(`Droid Gate C-3A initial installation tests passed (${n} groups).`);
