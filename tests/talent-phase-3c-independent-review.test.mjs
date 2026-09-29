import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectPhase3C, loadCommittedManifests, detectPackState } from '../tools/apply-talent-phase-3c.mjs';
import {
  ROOT, loadInputs, applyReference, checkInvariants, runAudit, protectedIds, BLOCKER_SAME_NAME_IN_TREE
} from '../tools/audit-talent-phase-3c-independent.mjs';

// Independent Phase 3C review: read-only. Never writes production packs.
// docs/audits/talent-phase-3c-claude-independent-review.md explains each case.

// The independent model needs the certified PRE-state packs. After the migration is applied, apply --verify is the
// authority for the post-state, so this file becomes a documented no-op instead of a false failure.
if (detectPackState().state !== 'PRE_STATE') {
  console.log('  skip talent-phase-3c independent review: production packs are not the certified pre-state (use apply-talent-phase-3c.mjs --verify)');
  process.exit(0);
}

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const clone = v => structuredClone(v);
const pristine = () => loadInputs();
const failing = (results, fragment) => results.filter(r => !r.ok && r.id.includes(fragment));

/* 1. Baseline: every invariant holds and a second application is a no-op. */
const audit = runAudit();
test('every independent invariant passes except the ONE documented open blocker (B2)', () => {
  // B2: the certified rename of Infamy|Notorious and Master of Teräs Käsi|Teräs Käsi Basics creates a same-name pair
  // with the protected review extras a7d8c4da96eacad4 / 222327492c484b4a inside one tree. That is a hard failure in
  // tools/audit-talent-tree-membership.mjs. When B2 is resolved this assertion must be tightened to an empty list.
  const bad = audit.results.filter(r => !r.ok).map(r => r.id);
  assert.deepEqual(bad, [BLOCKER_SAME_NAME_IN_TREE]);
  assert.ok(audit.results.length >= 18);
});
test('protected set is exactly 92 (90 deferred + 2 review extras)', () => {
  assert.equal(protectedIds(audit.inputs.closeout).size, 92);
});

/* 2. Fail-closed behaviour of the reference model (mirrors the contract the primary applicator must keep). */
test('unknown disposition hard-fails', () => {
  const i = pristine(); i.manifests[0].manifest.records[0].disposition = 'KEEP';
  assert.throws(() => applyReference(i), /unknown disposition/);
});
test('missing production record hard-fails', () => {
  const i = pristine();
  const id = i.manifests[0].manifest.records.find(r => r.identityResolution.productionRecordId).identityResolution.productionRecordId;
  i.talents = i.talents.filter(t => t._id !== id);
  assert.throws(() => applyReference(i), /missing production record/);
});
test('generated-ID collision with production hard-fails (pre mode)', () => {
  const i = pristine();
  const rec = i.manifests[0].manifest.records.find(r => r.identityResolution.createRecordId);
  i.talents.push({ ...clone(rec.createTemplate) });
  assert.throws(() => applyReference(i), /generated ID collision/);
});
test('certified mutation aimed at a protected record hard-fails', () => {
  const i = pristine();
  const prot = [...protectedIds(i.closeout)][0];
  const rec = i.manifests[0].manifest.records.find(r => r.identityResolution.productionRecordId);
  rec.identityResolution.productionRecordId = prot;
  assert.throws(() => applyReference(i), /protected record/);
});
test('Charm Beast: attempting to reuse the JATM production ID for the Core identity fails', () => {
  const i = pristine();
  const core = i.manifests.find(m => m.rel.includes('core-rulebook')).manifest.records
    .find(r => r.canonicalIdentity === 'Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast');
  core.identityResolution.productionRecordId = 'bab9a1ce285f98b9';
  assert.throws(() => applyReference(i), /disposition\/ID-kind mismatch|exactly one of/);
});
test('pseudo-operation / non-canonical field in mutationFields is not applied as data', () => {
  const i = pristine();
  const rec = i.manifests[0].manifest.records.find(r => r.identityResolution.productionRecordId);
  rec.mutationFields.push('system.abilityMeta'); rec.targetFields['system.abilityMeta'] = {};
  assert.throws(() => applyReference(i), /outside canonical surface/);
});
test('description-shape clobber is refused (object write onto string description)', () => {
  const i = pristine();
  const rec = i.manifests.flatMap(m => m.manifest.records).find(r => r.identityResolution.productionRecordId
    && r.mutationFields.includes('system.description'));
  assert.ok(rec, 'need a string-description record');
  rec.mutationFields = rec.mutationFields.map(f => f === 'system.description' ? 'system.description.value' : f);
  rec.targetFields['system.description.value'] = 'x';
  assert.throws(() => applyReference(i), /description shape mismatch/);
});
test('drift in a certified current field hard-fails (pre mode)', () => {
  const i = pristine();
  const rec = i.manifests.flatMap(m => m.manifest.records).find(r => r.identityResolution.productionRecordId && r.mutationFields.includes('system.benefit'));
  i.talents.find(t => t._id === rec.identityResolution.productionRecordId).system.benefit += ' DRIFT';
  assert.throws(() => applyReference(i), /drift/);
});

/* 3. The invariant checks must actually detect corruption of the projected state. */
const corrupt = (mutate, fragment) => {
  const after = clone(audit.first); mutate(after);
  const res = checkInvariants(audit.inputs, after, { reference: audit.second });
  assert.ok(failing(res, fragment).length >= 1, 'invariant "' + fragment + '" did not fire');
};
test('checker detects a modified protected record', () => corrupt(a => {
  const id = [...protectedIds(audit.inputs.closeout)][5]; a.talents.find(t => t._id === id).name += 'x';
}, 'protected 92'));
test('checker detects an unauthorized field change on an existing record', () => corrupt(a => {
  const id = audit.inputs.manifests[0].manifest.records.find(r => r.identityResolution.productionRecordId).identityResolution.productionRecordId;
  a.talents.find(t => t._id === id).system.tags = ['tampered'];
}, 'preservation boundary'));
test('checker detects a stale talentNames entry after a move/rename', () => corrupt(a => {
  const rec = audit.inputs.manifests.flatMap(m => m.manifest.records).find(r => r.disposition === 'CORRECT_TREE');
  const tree = a.trees.find(t => t._id === rec.targetTree.treeId); tree.system.talentNames.push('Stale Ghost Name');
}, 'touched trees'));
test('checker detects a talent claimed by two trees (CORRECT_TREE not fully applied)', () => corrupt(a => {
  const rec = audit.inputs.manifests.flatMap(m => m.manifest.records).find(r => r.disposition === 'CORRECT_TREE');
  const old = a.trees.find(t => t._id === rec.treeMutation.removeFromTreeIds[0]);
  old.system.talentIds.push(rec.identityResolution.productionRecordId);
}, 'bidirectional membership'));
test('checker detects a duplicated class-access entry (non-idempotent class mutation)', () => corrupt(a => {
  const cls = a.classes.find(c => c._id === 'c4dbedcf989cb6b2'); cls.system.talent_trees.push('3b30dd12884bb2e4');
}, '5 class-access'));
test('checker detects the Charm Beast records being merged into one tree', () => corrupt(a => {
  const t = a.trees.find(x => x.system.talentIds.includes('c919d7682bd9df40'));
  t.system.talentIds = t.system.talentIds.filter(i => i !== 'c919d7682bd9df40');
  a.trees.find(x => x.system.talentIds.includes('bab9a1ce285f98b9')).system.talentIds.push('c919d7682bd9df40');
}, 'Charm Beast'));
test('checker detects GenoHaradan obsolete tree left behind', () => corrupt(a => {
  a.trees.push(clone(audit.inputs.trees.find(t => t._id === 'db1b30c2163d0650')));
}, 'GenoHaradan'));

/* 4. Cross-implementation equivalence: the primary applicator's projected state must equal the reference model's. */
test('primary applicator projected state == independent reference state (byte-identical, order included)', () => {
  const projection = projectPhase3C({
    manifests: loadCommittedManifests(), closeout: audit.inputs.closeout,
    talents: audit.inputs.talents, trees: audit.inputs.trees, classes: audit.inputs.classes
  });
  for (const k of ['talents', 'trees', 'classes']) assert.equal(JSON.stringify(projection[k]), JSON.stringify(audit.first[k]), k + ' differ');
});
test('primary applicator refuses --write in Phase 3C-1 and leaves packs untouched', () => {
  const before = ['talents.db', 'talent_trees.db', 'classes.db'].map(f => fs.readFileSync(path.join(ROOT, 'packs', f), 'utf8'));
  const run = spawnSync(process.execPath, [path.join(ROOT, 'tools/apply-talent-phase-3c.mjs'), '--write'], { cwd: ROOT, encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  const after = ['talents.db', 'talent_trees.db', 'classes.db'].map(f => fs.readFileSync(path.join(ROOT, 'packs', f), 'utf8'));
  assert.deepEqual(after, before);
});

console.log(`\n${passed} talent-phase-3c independent review checks passed`);
