import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateAuthority, loadAuthority, corpusChecks, AUTH, QA5, MANIFEST_PATH, REPORT_PATH, detect12_2State } from '../tools/apply-talent-phase-12-2-tags.mjs';
import { loadAuthority as loadAuthority12_1 } from '../tools/apply-talent-phase-12-1-tags.mjs';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';

// Phase 12-2 + the full Phase 12 corpus contract (QA5). Every expectation is DERIVED from the authority files in the repository.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const nd = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const authority = rd(AUTH), q5 = rd(QA5), L = loadAuthority(), { certified, deferred, defIds, qa } = L, man = rd(MANIFEST_PATH), rep = rd(REPORT_PATH);
const talents = nd('packs/talents.db'), byId = new Map(talents.map(t => [t._id, t])), tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);

test('12-2 authority is owner-authorized and final: 876 assignments, unique ids/audit keys, no deferred id, no empty or duplicated finalTags, all within the 184-tag vocabulary', () => {
  assert.equal(authority.status, 'FINAL_FOR_EXECUTION'); assert.equal(authority.ownerAuthorized, true); assert.equal(authority.executionEnabled, true); assert.equal(authority.designStatus, 'DESIGN_PASS_COMPLETE');
  assert.equal(certified.length, 876); assert.equal(new Set(certified.map(x => x.canonicalId)).size, 876); assert.equal(new Set(certified.map(x => x.auditKey)).size, 876);
  assert.ok(certified.every(x => !defIds.has(x.canonicalId) && x.finalTags.length > 0 && new Set(x.finalTags).size === x.finalTags.length && x.finalTags.every(t => L.vocab.has(t))));
  assert.equal(L.vocab.size, 184); assert.deepEqual([...defIds].sort(), ['d376f165f1a47281', 'fd37b68c6fb620f6']);
});
test('the 12-2 GLOBAL_QA authority and QA5 agree on finalTags for all 876 ids; the validator fails closed on any disagreement, deferred id, empty or duplicated tags, wrong count', () => {
  for (const x of certified) assert.deepEqual(qa.get(x.canonicalId).finalTags, x.finalTags, x.auditKey);
  const mut = fn => { const c = structuredClone(authority), q = structuredClone(q5); fn(c, q); return [c, q]; }, first = c => Object.values(c.batches)[0].assignments;
  assert.throws(() => validateAuthority(...mut(c => first(c).pop())), /876/);
  assert.throws(() => validateAuthority(...mut(c => { first(c)[0].finalTags = [...first(c)[0].finalTags, 'reaction']; })), /disagree|duplicate|fail closed/);
  assert.throws(() => validateAuthority(...mut((c, q) => { q.certifiedAssignments.find(a => a.canonicalId === first(c)[0].canonicalId).finalTags = ['force']; })), /disagree/);
  assert.throws(() => validateAuthority(...mut(c => { first(c)[0].canonicalId = 'fd37b68c6fb620f6'; })), /deferred|unique/);
  assert.throws(() => validateAuthority(...mut(c => { first(c)[0].finalTags = []; })), /non-empty/);
  assert.throws(() => validateAuthority(...mut(c => { first(c)[1].canonicalId = first(c)[0].canonicalId; })), /unique/);
  assert.throws(() => validateAuthority(...mut(c => { c.executionEnabled = false; })), /FINAL_FOR_EXECUTION/);
});
test('the supplied add/delete/disposition labels are stale only for the 13 global-QA revisions; every diff is derived from finalTags', () => {
  const revised = new Set(authority.globalConsistencySweep.revisionCanonicalIds); assert.equal(revised.size, 13);
  assert.deepEqual(man.suppliedLabelDiscrepancies.records.map(r => r.id).sort(), [...revised].sort());
  for (const r of man.rows) { assert.deepEqual(r.added, r.after.filter(t => !r.before.includes(t))); assert.deepEqual(r.removed, r.before.filter(t => !r.after.includes(t))); }
  assert.deepEqual(rep.counts.dispositions, { ADD_AND_DELETE: 731, ADD: 143, DELETE: 2 });
});
test('every Phase 12-2 target carries system.tags EXACTLY equal to its authority finalTags (deep equality, authored order); manifest rows equal the authority', () => {
  for (const x of certified) assert.deepEqual(byId.get(x.canonicalId).system.tags, x.finalTags, x.auditKey);
  assert.equal(man.rows.length + man.alreadyAtFinal.length, 876); for (const r of man.rows) assert.deepEqual(r.after, certified.find(x => x.canonicalId === r.id).finalTags);
});
test('dry-run certified: 876 records changed, 0 non-target and 0 non-tag changes, tree identity untouched, zero-tag census unchanged', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.ok(rep.verification.results.every(x => x.ok));
  assert.deepEqual([rep.counts.recordsChanged, rep.counts.nonTargetRecordsChanged, rep.counts.nonTagFieldChanges, rep.counts.vocabularyViolations, rep.counts.zeroTagBefore, rep.counts.zeroTagAfter], [876, 0, 0, 0, 2, 2]);
  assert.equal(rep.runtimeConsumers.treeIdentityChanged, 0); assert.equal(rep.counts.tagInstancesAfter - rep.counts.tagInstancesBefore, rep.counts.tagElementsAdded - rep.counts.tagElementsRemoved);
});
test('the 876 and the 309 (Phase 12-1) are disjoint, cover QA5 exactly, and the two deferrals are the only talents outside it', () => {
  const ids121 = new Set(loadAuthority12_1().certified.map(x => x.canonicalId)), ids122 = new Set(certified.map(x => x.canonicalId));
  assert.equal(ids121.size, 309); assert.ok([...ids122].every(id => !ids121.has(id)));
  assert.deepEqual([...new Set([...ids121, ...ids122])].sort(), [...qa.keys()].sort());
  assert.deepEqual(talents.filter(t => !qa.has(t._id)).map(t => t._id).sort(), [...defIds].sort());
});
test('FULL CORPUS (QA5): 1,187 canonical talents = 1,185 certified (309 + 876) + 2 deferred; 1,185 / 1,185 exact matches; every QA5 integrity rule and family-convergence check passes', () => {
  assert.equal(q5.corpus.canonicalTalents, 1187); assert.equal(q5.corpus.certified, 1185); assert.equal(q5.corpus.phase12_1Certified, 309); assert.equal(q5.corpus.phase12_2Certified, 876); assert.equal(deferred.length, 2);
  assert.equal(q5.revisionSummary.totalRevisedCertifiedRecords, 24); assert.equal(q5.revisionSummary.phase12_1Revisions, 11); assert.equal(q5.revisionSummary.phase12_2Revisions, 13);
  const res = corpusChecks(talents, L); assert.ok(res.length >= 17); for (const r of res) assert.ok(r.ok, r.id + ' ' + r.detail);
  let exact = 0; for (const [id, a] of qa) if (JSON.stringify(tagsOf(byId.get(id))) === JSON.stringify(a.finalTags)) exact++; assert.equal(exact, 1185);
});
test('QA5 authority and its report are committed verbatim, and QA5 records no new vocabulary', () => {
  assert.equal(q5.vocabulary.newTagsAuthorizedByGlobalQA?.length ?? 0, 0); assert.ok(fs.existsSync(new URL('../docs/audits/talent-phase-12-global-consistency-sweep-report-qa5.md', import.meta.url)));
  const present = new Set(talents.flatMap(tagsOf)); assert.ok([...present].every(t => L.vocab.has(t))); assert.ok(present.size <= 184);
});
test('state-appropriate gate passes: the pack is the Phase 12-2 post-state, --verify --exact passes and the CI detector reports POST_12_2_STATE', () => {
  // A later certified phase must add its own later-state mode here (as 12-1/11-2C/... did) before it can change the pack.
  assert.equal(detect12_2State(), 'POST_12_2'); assert.equal(detectPackState().state, 'POST_12_2_STATE');
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-12-2-tags.mjs', '--verify', '--exact'], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
});

console.log(`\n${n} Phase 12-2 / full-corpus semantic-tag tests passed`);
