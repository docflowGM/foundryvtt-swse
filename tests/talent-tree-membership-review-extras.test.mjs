import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT, CLOSEOUT_PATH, detectPackState, loadCommittedManifests, projectPhase3C
} from '../tools/apply-talent-phase-3c.mjs';

// tools/audit-talent-tree-membership.mjs tolerates EXACTLY the two certified protected review-extra same-name twins
// (IDs read from the Phase 3B closeout) and nothing else. Runs on scratch directories; repo packs are read-only here.

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readPack = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const closeout = readJson(CLOSEOUT_PATH);
const onDisk = { talents: readPack('packs/talents.db'), trees: readPack('packs/talent_trees.db'), classes: readPack('packs/classes.db') };
const projected = detectPackState().state === 'PRE_STATE'
  ? projectPhase3C({ manifests: loadCommittedManifests(), closeout, ...onDisk })
  : onDisk;

const ndjson = recs => recs.map(r => JSON.stringify(r)).join('\n') + '\n';
let n = 0;
const audit = (label, { talents = projected.talents, trees = projected.trees, classes = projected.classes, withCloseout = true } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-membership-'));
  try {
    fs.mkdirSync(path.join(dir, 'packs')); fs.mkdirSync(path.join(dir, 'data/audits'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'packs/talents.db'), ndjson(talents));
    fs.writeFileSync(path.join(dir, 'packs/talent_trees.db'), ndjson(trees));
    fs.writeFileSync(path.join(dir, 'packs/classes.db'), ndjson(classes));
    if (withCloseout) fs.writeFileSync(path.join(dir, CLOSEOUT_PATH), JSON.stringify(closeout));
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/audit-talent-tree-membership.mjs')], { cwd: dir, encoding: 'utf8' });
    return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const clone = v => structuredClone(v);
const tree = id => projected.trees.find(t => t._id === id);
// After Phase 3D the two review-extra twins no longer exist, so the twin-specific cases have no on-disk fixture;
// the exemption code path stays covered whenever the packs are the Phase 3C state, and the current state is asserted instead.
const post3d = ['POST_3D_STATE', 'POST_3E4_STATE', 'POST_3E5_STATE', 'POST_3F_STATE', 'POST_3G_STATE', 'POST_11_2A_STATE', 'POST_11_2B_STATE', 'POST_11_2C_STATE', 'POST_12_1_STATE', 'POST_12_2_STATE', 'POST_12_FINAL_STATE'].includes(detectPackState().state);
const testPre = (name, fn) => post3d ? console.log('  skip ' + name + ' (Phase 3D applied: the twins were merged/removed)') : test(name, fn);

testPre('projected state: the two certified review-extra twins pass, visibly, with zero unapproved duplicates', () => {
  const r = audit('projected');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /allowedProtectedReviewExtraDuplicateNames: 2/);
  assert.match(r.out, /duplicateTalentNamesWithinTree: 0/);
  assert.match(r.out, /a7d8c4da96eacad4/); assert.match(r.out, /222327492c484b4a/);
});
testPre('the exemption IDs come from the closeout: without it the same state fails', () => {
  const r = audit('no closeout', { withCloseout: false });
  assert.notEqual(r.code, 0); assert.match(r.out, /duplicateTalentNamesWithinTree: 2/);
});
testPre('a third arbitrary same-name duplicate in another tree is NOT tolerated', () => {
  const talents = clone(projected.talents), trees = clone(projected.trees);
  const t = trees.find(x => x._id === '67fdd8dce9abd6c1');
  const twin = clone(talents.find(x => x._id === t.system.talentIds[0])); twin._id = 'eeeeeeeeeeeeeeee';
  talents.push(twin); t.system.talentIds.push(twin._id);
  const r = audit('third', { talents, trees });
  assert.notEqual(r.code, 0); assert.match(r.out, /duplicateTalentNamesWithinTree: 1/); assert.match(r.out, /allowedProtectedReviewExtraDuplicateNames: 2/);
});
testPre('a third same-name talent added next to an approved pair is NOT tolerated (pairs only)', () => {
  const talents = clone(projected.talents), trees = clone(projected.trees);
  const infamy = trees.find(x => x._id === 'c1be604242cb328f');
  const twin = clone(talents.find(x => x._id === 'a7d8c4da96eacad4')); twin._id = 'dddddddddddddddd';
  talents.push(twin); infamy.system.talentIds.push(twin._id);
  const r = audit('triple', { talents, trees });
  assert.notEqual(r.code, 0); assert.match(r.out, /duplicateTalentNamesWithinTree: 1/);
});
testPre('a review-extra ID in a tree the closeout does not record for it is NOT tolerated', () => {
  const shifted = clone(closeout); shifted.reviewExtras[0].treeClaims = [{ treeId: '0000000000000000', treeName: 'Elsewhere' }];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-membership-'));
  try {
    fs.mkdirSync(path.join(dir, 'packs')); fs.mkdirSync(path.join(dir, 'data/audits'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'packs/talents.db'), ndjson(projected.talents));
    fs.writeFileSync(path.join(dir, 'packs/talent_trees.db'), ndjson(projected.trees));
    fs.writeFileSync(path.join(dir, 'packs/classes.db'), ndjson(projected.classes));
    fs.writeFileSync(path.join(dir, CLOSEOUT_PATH), JSON.stringify(shifted));
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/audit-talent-tree-membership.mjs')], { cwd: dir, encoding: 'utf8' });
    assert.notEqual(r.status, 0); assert.match(r.stdout, /duplicateTalentNamesWithinTree: 1/); assert.match(r.stdout, /allowedProtectedReviewExtraDuplicateNames: 1/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
if (post3d) test('Phase 3D state: no review-extra twin remains and the audit tolerates none', () => {
  const r = audit('post-3d');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /allowedProtectedReviewExtraDuplicateNames: 0/);
  assert.match(r.out, /duplicateTalentNamesWithinTree: 0/);
  assert.ok(!projected.talents.some(t => t._id === 'a7d8c4da96eacad4' || t._id === '222327492c484b4a'));
});
test('other hard failures are never suppressed: duplicate ID, missing tree member, unclaimed talent', () => {
  const dupId = clone(projected.talents); dupId.push(clone(dupId[0]));
  assert.match(audit('dup id', { talents: dupId }).out, /duplicateTalentIds: 1/);
  const missing = clone(projected.trees); missing[0].system.talentIds.push('9999999999999999');
  assert.match(audit('missing member', { trees: missing }).out, /treeClaimsMissingTalents: 1/);
  const unclaimed = clone(projected.trees); const t = unclaimed.find(x => x.system.talentIds.length > 2);
  const removed = t.system.talentIds.pop();
  const r = audit('unclaimed', { trees: unclaimed });
  assert.notEqual(r.code, 0); assert.match(r.out, /talentsUnclaimedByTree: [1-9]/); assert.ok(removed);
});

console.log(`\n${n} membership review-extra checks passed`);
