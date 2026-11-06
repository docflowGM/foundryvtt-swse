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
// Production-shaped droid FOLLOWER: follower-mutation-planning.js creates `type: 'npc'` with `system.isDroid`.
const npcFollower = (id, system = {}) => ({
  id, type: 'npc', name: 'Follower', items: [], flags: {},
  system: { isFollower: true, isDroid: true, noConstitution: true, droidSize: 'medium', size: 'medium', droidSystems: { baseSystems: [], optionalSystems: [] }, installedSystems: {}, credits: 0, ...system }
});
const droid = (id, system = {}) => ({ id, type: 'droid', name: 'D', items: [], system: { droidSystems: { size: 'medium' }, installedSystems: {}, ...system } });
const seed = (actor, droidSystems) => svc.buildInitialDroidInstallation({ actor, seed: actor.id, droidSystems, size: 'medium' });

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
  const b = defaultBuild(); b.processor = { id: 'remote', name: 'Remote Processor', variant: '5 km' };
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
  assert.ok(seed(droid('a5m'), second).unresolved.some(u => u.code === 'UNVALIDATED_SELECTION'), 'a second locomotion slot has no initial-build acceptance path');
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

// 7. Existing ledger records are never overwritten; a ledger that differs from the build is a CONFLICT (not silently skipped).
{
  const foreign = { 'hand--inst-foreignfore1': { id: 'hand', instanceId: 'inst-foreignfore1', locationId: 'appendage-slot-1', name: 'Hand', category: 'appendage', slot: 'appendage' }, 'heuristic-processor': { id: 'heuristic-processor', note: 'keep me' } };
  const a = droid('a7', { installedSystems: foreign });
  const r = seed(a, defaultBuild());
  assert.equal(r.seeded, false);
  assert.ok(r.unresolved.some(u => u.code === 'EXISTING_APPENDAGES_CONFLICT'), 'one existing hand vs two approved hands is reported');
  assert.deepEqual(r.installedSystems, foreign, 'nothing is written or overwritten');
  assert.equal(r.droidSystems.appendages[0].instanceId, undefined, 'the mirror is not changed either');
  assert.throws(() => svc.requireInitialDroidInstallation({ actor: a, seed: 'a7', droidSystems: defaultBuild(), size: 'medium' }), /existing|physical appendage/i);
  // an existing, valid, enabled singleton is preserved verbatim
  const keepOnly = droid('a7b', { installedSystems: { 'heuristic-processor': { id: 'heuristic-processor', note: 'keep me' } } });
  const kept = seed(keepOnly, defaultBuild());
  assert.equal(kept.installedSystems['heuristic-processor'].note, 'keep me');
  assert.equal(kept.seeded, true, 'the missing records are added around it');
  ok('a differing existing ledger is a reported conflict that changes nothing; a valid existing singleton is preserved');
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
  const follower = npcFollower('f1');
  const step1 = svc.resolveFollowerDroidInstallation(follower, droidConfig);
  assert.ok(step1.installedSystems && step1.droidSystems.appendages.every(a => a.instanceId));
  assert.deepEqual(step1.draft.appendages.map(a => a.instanceId), [undefined, undefined], 'the creation-time draft copy is left untouched');
  // the follower after step 1, then the second write step
  const after1 = npcFollower('f1', { installedSystems: step1.installedSystems, droidSystems: step1.droidSystems });
  const step2 = svc.resolveFollowerDroidInstallation(after1, droidConfig);
  assert.equal(step2.installedSystems, null, 'nothing new to write on the repeat');
  assert.deepEqual(step2.droidSystems.appendages.map(a => [a.instanceId, a.locationId]), step1.droidSystems.appendages.map(a => [a.instanceId, a.locationId]), 'both steps carry identical identities');
  assert.deepEqual(auditAppendageMirror(step1.installedSystems, step2.droidSystems), []);
  // a follower config without a droid build is left alone
  assert.equal(svc.resolveFollowerDroidInstallation(npcFollower('f2'), { isDroid: true }).installedSystems, null);

  // failure inside the creation transaction rolls back what was committed, exactly like any other step failure
  const log = [];
  const badConfig = { isDroid: true, droidSystems: { ...defaultBuild(), accessories: [{ id: 'unknown-follower-part' }] } };
  const result = await runFollowerMutationTransaction([
    { name: 'create-actor', commit: async () => { log.push('create'); return { id: 'f3' }; }, rollback: async () => { log.push('delete-actor'); } },
    { name: 'materialize', commit: async () => { svc.resolveFollowerDroidInstallation(npcFollower('f3'), badConfig); log.push('materialize'); } }
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


// ======================= Review corrections (Gate C-3A) =======================
const { resolveDroidCalculationMode } = await import('../scripts/actors/droid/droid-mode-adapter.js');
const FAKE = { getDefinition: schema.getDroidPartDefinition, normalizeId: schema.normalizeDroidPartId, reviewComponent: (def, ctx) => svcReview(def, ctx) };
const { resolveDroidComponentSourceReview } = await import('../scripts/domain/droids/droid-component-source-review.js');
const svcReview = (def, ctx) => resolveDroidComponentSourceReview(def?.source ?? def, ctx);
const acceptAll = (over = {}) => (def, { field }) => ({ ok: true, firstSlotUnrestricted: field === 'locomotion', ...over });
const project = (build, { existing = {}, accept = acceptAll() } = {}) => projectInitialInstallation({ seed: 'rv', droidSystems: build, existingLedger: existing, acceptSelection: accept, ...FAKE });
const ledgerOfHands = (...rows) => Object.fromEntries(rows.map(r => [`hand--${r.instanceId}`, { id: r.part ?? 'hand', instanceId: r.instanceId, locationId: r.locationId, name: 'Hand', category: 'appendage', slot: 'appendage', ...(r.extra ?? {}) }]));

// 13. Duplicate / conflicting supplied identities fail closed; nothing is written.
{
  const mk = (rows) => { const b = defaultBuild(); b.appendages = rows; return b; };
  const dupIds = mk([{ id: 'hand-1', type: 'hand', instanceId: 'inst-dupdupdup001' }, { id: 'hand-2', type: 'hand', instanceId: 'inst-dupdupdup001' }]);
  const r1 = project(dupIds);
  assert.ok(r1.unresolved.some(u => u.code === 'DUPLICATE_INSTANCE_ID'), 'two rows with one identity');
  assert.equal(r1.seeded, false); assert.deepEqual(r1.installedSystems, {}, 'no ledger entry is written');
  assert.deepEqual(r1.droidSystems.appendages, dupIds.appendages, 'the mirror is left exactly as supplied');
  const dupLoc = mk([{ id: 'hand-1', type: 'hand', locationId: 'appendage-slot-4' }, { id: 'hand-2', type: 'hand', locationId: 'appendage-slot-4' }]);
  assert.ok(project(dupLoc).unresolved.some(u => u.code === 'CONFLICTING_LOCATION'), 'two rows claiming one location');
  assert.ok(project(mk([{ id: 'hand-1', type: 'hand', locationId: 'left-arm' }])).unresolved.some(u => u.code === 'CONFLICTING_LOCATION'), 'a non-token location is refused');
  assert.ok(project(mk([{ id: 'hand-1', type: 'hand', instanceId: 'garbage' }])).unresolved.some(u => u.code === 'MALFORMED_SUPPLIED_IDENTITY'));
  // distinct supplied identities of the same kind remain legal and are kept
  const fine = project(mk([{ id: 'hand-1', type: 'hand', instanceId: 'inst-aaaaaa000001', locationId: 'appendage-slot-3' }, { id: 'hand-2', type: 'hand', instanceId: 'inst-aaaaaa000002' }]));
  assert.deepEqual(fine.unresolved, []);
  const ids = listLedgerInstances(fine.installedSystems).instances;
  assert.deepEqual(ids.map(i => i.instanceId).sort(), ['inst-aaaaaa000001', 'inst-aaaaaa000002']);
  assert.equal(ids.find(i => i.instanceId === 'inst-aaaaaa000001').locationId, 'appendage-slot-3', 'a supplied location is honored');
  assert.notEqual(ids.find(i => i.instanceId === 'inst-aaaaaa000002').locationId, 'appendage-slot-3', 'a derived location never reuses a supplied one');
  assert.deepEqual(auditAppendageMirror(fine.installedSystems, fine.droidSystems), []);
  // a draft id cannot impersonate an unrelated existing instance
  const existing = ledgerOfHands({ instanceId: 'inst-bbbbbb000001', locationId: 'appendage-slot-1', part: 'claw' });
  const imp = mk([{ id: 'hand-1', type: 'hand', instanceId: 'inst-bbbbbb000001' }]);
  const r2 = project(imp, { existing });
  assert.ok(r2.unresolved.some(u => u.code === 'EXISTING_APPENDAGES_CONFLICT'), 'the id belongs to a claw, not a hand');
  assert.deepEqual(r2.installedSystems, existing);
  ok('duplicate / conflicting / malformed supplied identities fail closed with nothing written; distinct supplied identities stay legal; no impersonation');
}

// 13b. All-or-nothing: whatever the failure, the returned ledger and mirror are exactly the inputs.
{
  const shapes = [
    () => { const b = defaultBuild(); b.accessories = [{ id: 'totally-made-up-gadget' }]; return [b, {}]; },
    () => { const b = defaultBuild(); b.appendages[1].instanceId = b.appendages[0].instanceId = 'inst-allornothing1'; return [b, {}]; },
    () => [defaultBuild(), { 'heuristic-processor': { id: 'heuristic-processor', installed: false } }],
    () => { const b = defaultBuild(); b.locomotion.restricted = true; return [b, {}]; }
  ];
  for (const make of shapes) {
    const [build, existing] = make();
    const r = project(build, { existing });
    assert.ok(r.unresolved.length > 0);
    assert.deepEqual(r.installedSystems, existing, 'ledger untouched');
    assert.deepEqual(r.droidSystems, build, 'mirror untouched (no identity written onto any row)');
    assert.equal(r.seeded, false);
  }
  ok('every failure shape returns the exact inputs: nothing partially written');
}

// 14. Existing-ledger conflict matrix: exact repeat succeeds, everything else is reported.
{
  const two = defaultBuild();
  const seeded = project(two);
  const exact = seeded.installedSystems;
  const again = project(two, { existing: exact });
  assert.deepEqual(again.unresolved, []); assert.equal(again.seeded, false);
  assert.deepEqual(again.installedSystems, exact, 'exact repeat: ledger unchanged');
  assert.deepEqual(auditAppendageMirror(again.installedSystems, again.droidSystems), []);
  const hands = listLedgerInstances(exact).instances;
  const conflict = (label, existing, build = defaultBuild(), code = 'EXISTING_APPENDAGES_CONFLICT') => {
    const r = project(build, { existing });
    assert.ok(r.unresolved.some(u => u.code === code), `${label}: expected ${code}, got ${JSON.stringify(r.unresolved.map(u => u.code))}`);
    assert.equal(r.seeded, false, label); assert.deepEqual(r.installedSystems, existing, `${label}: nothing overwritten`);
  };
  const [h1, h2] = hands;
  conflict('fewer existing instances', Object.fromEntries(Object.entries(exact).filter(([k]) => !k.includes(h2.instanceId))));
  conflict('extra existing instance', { ...exact, ...ledgerOfHands({ instanceId: 'inst-extraextra001', locationId: 'appendage-slot-9' }) });
  conflict('changed kind (same id, now a claw)', { ...exact, [`hand--${h1.instanceId}`]: { ...exact[`hand--${h1.instanceId}`], id: 'claw' } });
  conflict('conflicting location', { ...exact, [`hand--${h1.instanceId}`]: { ...exact[`hand--${h1.instanceId}`], locationId: 'appendage-slot-9' } });
  conflict('malformed existing record', { ...exact, 'hand--inst-bad': { id: 'hand', instanceId: 'not-valid' } }, defaultBuild(), 'MALFORMED_EXISTING_RECORD');
  // disabled / malformed / different SINGLETON records are conflicts, not "already there"
  for (const [label, rec] of [['installed:false', { id: 'heuristic-processor', installed: false }], ['enabled:false', { id: 'heuristic-processor', enabled: false }], ['not an object', true], ['different component', { id: 'basic-processor' }]]) {
    conflict(`singleton ${label}`, { 'heuristic-processor': rec }, defaultBuild(), 'EXISTING_COMPONENT_CONFLICT');
  }
  const ok1 = project(defaultBuild(), { existing: { 'heuristic-processor': { id: 'heuristic-processor', note: 'valid' } } });
  assert.deepEqual(ok1.unresolved, []); assert.equal(ok1.installedSystems['heuristic-processor'].note, 'valid');
  ok('existing ledger: exact repeat succeeds; count / kind / location / malformed / disabled / different records are reported conflicts and nothing is overwritten');
}

// 15. The restricted-locomotion fact is derived from the builder's acceptance, never asserted here.
{
  const loco = (over = {}) => { const b = defaultBuild(); b.locomotion = { id: 'walking', speed: 6, ...over }; return b; };
  assert.deepEqual(project(loco()).unresolved, [], 'first unrestricted locomotion (accepted by the builder as the primary) passes');
  assert.deepEqual(project(loco({ id: 'tracked' })).unresolved, []);
  // the SAME HOLD locomotion is refused when the builder's acceptance does not vouch for it as the first unrestricted system
  const notVouched = project(loco(), { accept: acceptAll({ firstSlotUnrestricted: false }) });
  assert.ok(notVouched.unresolved.some(u => u.code === 'SOURCE_NOT_CLEARED'), 'no unrestricted evidence => the HOLD subset is not granted');
  assert.deepEqual(project(loco(), { accept: acceptAll({ firstSlotUnrestricted: true }) }).unresolved, []);
  // an explicit restriction claim (anything but false) is unverified
  for (const marker of [{ restricted: true }, { restricted: 'limited' }, { isRestricted: true }, { restrictedLocomotion: 1 }]) {
    assert.ok(project(loco(marker)).unresolved.some(u => u.code === 'RESTRICTION_UNVERIFIED'), JSON.stringify(marker));
  }
  assert.deepEqual(project(loco({ restricted: false })).unresolved, [], 'an explicit false is consistent evidence');
  // a PASS locomotion needs no restriction fact; a second locomotion slot has no acceptance path at all
  assert.deepEqual(project(loco({ id: 'stationary' }), { accept: acceptAll({ firstSlotUnrestricted: false }) }).unresolved, []);
  const second = defaultBuild(); second.locomotionSystems = [{ id: 'stationary' }];
  assert.ok(project(second).unresolved.some(u => u.code === 'UNVALIDATED_SELECTION'));
  // with no acceptance workflow nothing is accepted
  const none = projectInitialInstallation({ seed: 'rv', droidSystems: defaultBuild(), existingLedger: {}, ...FAKE });
  assert.ok(none.unresolved.length > 0 && none.unresolved.every(u => u.code === 'ACCEPTANCE_UNAVAILABLE')); assert.equal(none.seeded, false);
  // through the production wiring: the five HOLD locomotions follow the builder's own acceptance
  for (const id of ['walking', 'wheeled', 'tracked', 'hovering', 'flying']) {
    assert.deepEqual(seed(droid(`l-${id}`), loco({ id })).unresolved, [], `${id} as the first locomotion`);
  }
  ok('restricted-locomotion evidence comes from the builder acceptance; claims, unknown state, extra slots and a missing workflow fail closed; no HOLD promoted');
}

// 16. Acceptance boundary: only selections the builder's initial-build workflow accepts are installed.
{
  const refused = (mutate) => { const b = defaultBuild(); mutate(b); return seed(droid('ab'), b); };
  const needsVariant = refused(b => { b.processor = { id: 'remote' }; });
  assert.ok(needsVariant.unresolved.some(u => u.code === 'ACCEPTANCE_FAILED' && /variant/i.test(u.reason)), 'a component needing a published variant but lacking one is refused with that reason');
  assert.equal(needsVariant.seeded, false);
  assert.ok(refused(b => { b.accessories = [{ id: 'shield-expansion-module' }]; }).unresolved.some(u => u.code === 'ACCEPTANCE_FAILED'), 'a component whose prerequisite is unmet in the draft is refused');
  // the builder's quote needs a real selected speed: none / invalid is refused, never defaulted
  for (const speed of [undefined, null, -1, 'fast']) {
    const r = refused(b => { b.locomotion = { id: 'walking', ...(speed === undefined ? {} : { speed }) }; });
    assert.ok(r.unresolved.some(u => u.field === 'locomotion' && u.code === 'ACCEPTANCE_FAILED' && /speed/i.test(u.reason)), `locomotion speed ${String(speed)} is refused with the real cause (${JSON.stringify(r.unresolved)})`);
    assert.equal(r.seeded, false);
  }
  const unknownSize = svc.buildInitialDroidInstallation({ actor: droid('ab2'), seed: 'ab2', droidSystems: defaultBuild(), size: 'gigantic' });
  assert.ok(unknownSize.unresolved.length > 0 && unknownSize.seeded === false, 'an unknown size accepts nothing');
  for (const field of ['sensors', 'weapons', 'integratedSystems', 'processorEnhancements', 'locomotionSystems', 'secondaryLocomotion']) {
    const r = refused(b => { b[field] = [{ id: 'plasteel-shell' }]; });
    assert.ok(r.unresolved.some(u => u.field === field && u.code === 'UNVALIDATED_SELECTION'), `${field}: no builder acceptance path`);
  }
  const unmapped = schema.getAllDroidPartDefinitions().find(d => !d.sourcePath);
  if (unmapped) assert.ok(refused(b => { b.accessories = [{ id: unmapped.id }]; }).unresolved.some(u => ['ACCEPTANCE_FAILED', 'SOURCE_NOT_CLEARED', 'UNKNOWN_COMPONENT'].includes(u.code)), 'an overlay-only definition with no builder path is refused');
  ok('only builder-accepted selections are installed: missing variant, unmet prerequisite, unknown size, builder-foreign fields and unmapped definitions all fail closed with a reason');
}

// 17. Production-shaped (type "npc") droid followers.
{
  const droidConfig = { isDroid: true, size: 'medium', droidSystems: defaultBuild() };
  const f = npcFollower('nf1');
  assert.equal(f.type, 'npc'); assert.equal(f.system.isDroid, true);
  const step1 = svc.resolveFollowerDroidInstallation(f, droidConfig);
  assert.ok(step1.installedSystems['heuristic-processor'] && Object.keys(step1.installedSystems).length === 4);
  const created = npcFollower('nf1', { installedSystems: step1.installedSystems, droidSystems: step1.droidSystems });
  // evidence works on the NPC shape
  const ev = collectInstalledComponentEvidence(created);
  assert.ok(ev.confirmedIds.includes('hand') && ev.confirmedIds.includes('heuristic-processor'));
  assert.equal(listConfirmedHostInstances(created).length, 2);
  // repeated materialization is a no-op with identical identities
  const repeat = svc.resolveFollowerDroidInstallation(created, droidConfig);
  assert.equal(repeat.installedSystems, null);
  assert.deepEqual(repeat.droidSystems.appendages.map(a => a.instanceId), step1.droidSystems.appendages.map(a => a.instanceId));
  // a conflicting existing ledger on a follower is reported, not overwritten
  const tampered = npcFollower('nf1', { installedSystems: { ...step1.installedSystems, 'heuristic-processor': { id: 'heuristic-processor', installed: false } }, droidSystems: step1.droidSystems });
  assert.throws(() => svc.resolveFollowerDroidInstallation(tampered, droidConfig), err => err.code === 'DROID_INITIAL_INSTALLATION_UNRESOLVED');
  // stock-statblock protection: an NPC-typed follower is never a stock-imported droid
  const withStockFlag = npcFollower('nf2', { droidCalculationMode: 'stock-statblock' });
  withStockFlag.flags = { swse: { stockDroidImport: { importMode: 'statblock' } } };
  assert.equal(resolveDroidCalculationMode(withStockFlag).reason, 'not-a-droid-actor', 'the resolver treats non-droid actor types as playable-derived (unchanged authority)');
  assert.equal(svc.resolveFollowerDroidInstallation(withStockFlag, droidConfig).installedSystems !== null, true, 'so a follower is seeded');
  // modifier eligibility: the modifier collector only runs for actor.type === "droid"
  const mods = fs.readFileSync(path.join(ROOT, 'scripts/engine/effects/modifiers/ModifierEngine.js'), 'utf8');
  assert.match(mods, /static async _getDroidModModifiers\(actor\) \{[\s\S]{0,200}actor\.type !== 'droid'[\s\S]{0,40}return modifiers/, 'droid-part modifiers are not collected for npc-typed followers, so seeding neither applies nor double-counts them');
  // organic NPC follower: no droid build, nothing seeded
  const organic = { id: 'on1', type: 'npc', name: 'Organic', items: [], flags: {}, system: { isFollower: true, isDroid: false, installedSystems: {} } };
  const o = svc.resolveFollowerDroidInstallation(organic, {});
  assert.equal(o.installedSystems, null); assert.deepEqual(Object.keys(o.droidSystems).sort(), ['allowedOptionalCategories', 'baseSystems', 'optionalSystems']);
  // rollback with the production actor shape
  const log = [];
  const bad = { isDroid: true, droidSystems: { ...defaultBuild(), accessories: [{ id: 'unknown-follower-part' }] } };
  const res = await runFollowerMutationTransaction([
    { name: 'create-actor', commit: async () => { log.push('create'); return npcFollower('nf3'); }, rollback: async () => { log.push('delete-actor'); } },
    { name: 'materialize', commit: async (ctx) => { svc.resolveFollowerDroidInstallation(ctx['create-actor'], bad); log.push('materialize'); } }
  ]);
  assert.equal(res.ok, false); assert.deepEqual(log, ['create', 'delete-actor']); assert.equal(res.error.code, 'DROID_INITIAL_INSTALLATION_UNRESOLVED');
  ok('npc-shaped follower: seeding, evidence, repeat no-op, conflict reported, stock protection / modifier gating audited, organic NPC untouched, rollback intact');
}

console.log(`Droid Gate C-3A initial installation tests passed (${n} groups).`);
