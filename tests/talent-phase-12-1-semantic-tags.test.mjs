import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateAuthority, loadAuthority, AUTH, MANIFEST_PATH, REPORT_PATH, detect12_1State } from '../tools/apply-talent-phase-12-1-tags.mjs';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';

// Phase 12-1: pins the owner-certified orphan semantic-tag contract. Every expectation is DERIVED from the final (QA3) authority file — there is no second
// hand-maintained table of 309 arrays in this test.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const nd = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const authority = rd(AUTH), { certified, deferred, defIds } = loadAuthority(), man = rd(MANIFEST_PATH), rep = rd(REPORT_PATH);
const talents = nd('packs/talents.db'), byId = new Map(talents.map(t => [t._id, t])), tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);

test('authority is the QA3 final payload: FINAL_FOR_EXECUTION, owner-authorized, 311 reviewed = 309 certified + exactly 2 deferred', () => {
  assert.equal(authority.status, 'FINAL_FOR_EXECUTION'); assert.equal(authority.ownerAuthorized, true); assert.equal(authority.executionEnabled, true); assert.equal(authority.finalSemanticPayload, 'QA3');
  assert.equal(certified.length, 309); assert.equal(deferred.length, 2); assert.equal(authority.qualitySweep.revisedTalentCount, 83); assert.equal(authority.qualitySweep.unchangedCertifiedTalentCount, 226);
  assert.deepEqual(deferred.map(d => d.auditKey).sort(), ['GOI-002', 'UR-022']); assert.deepEqual([...defIds].sort(), ['d376f165f1a47281', 'fd37b68c6fb620f6']);
  assert.ok(deferred.every(d => d.conceptFamily === 'TEMPORARY_TALENT_ACCESS' && d.status === 'AWAITING_DESIGNER_ADJUDICATION'));
});
test('no duplicate canonical ids or audit keys; no certified id is a deferred id; no certified record has empty or duplicated finalTags', () => {
  assert.equal(new Set(certified.map(x => x.canonicalId)).size, 309); assert.equal(new Set(certified.map(x => x.auditKey)).size, 309);
  assert.ok(certified.every(x => !defIds.has(x.canonicalId)));
  assert.ok(certified.every(x => Array.isArray(x.finalTags) && x.finalTags.length > 0 && new Set(x.finalTags).size === x.finalTags.length));
});
test('the validator rejects tampered authorities (wrong count, deferred id promoted, empty tags, duplicate tag, duplicate id, not final)', () => {
  const mut = fn => { const c = structuredClone(authority); fn(c); return c; }, first = c => Object.values(c.batches)[0].assignments;
  assert.throws(() => validateAuthority(mut(c => first(c).pop())), /309/);
  assert.throws(() => validateAuthority(mut(c => { first(c)[0].canonicalId = 'fd37b68c6fb620f6'; })), /overlaps a deferred id|unique/);
  assert.throws(() => validateAuthority(mut(c => { first(c)[0].finalTags = []; })), /non-empty/);
  assert.throws(() => validateAuthority(mut(c => { first(c)[0].finalTags = ['force', 'force']; })), /duplicate tag/);
  assert.throws(() => validateAuthority(mut(c => { first(c)[1].canonicalId = first(c)[0].canonicalId; })), /unique/);
  assert.throws(() => validateAuthority(mut(c => { c.executionEnabled = false; })), /FINAL_FOR_EXECUTION/);
});
test('every certified canonicalId resolves exactly once in packs/talents.db (id only; name/source/page are guards, not a fallback)', () => {
  assert.equal(talents.length, 1187); assert.equal(byId.size, 1187);
  for (const x of certified) { const t = byId.get(x.canonicalId); assert.ok(t, x.auditKey); assert.equal(t.name, x.name, x.auditKey); assert.equal(t.system.source, x.sourcebook, x.auditKey); assert.equal(t.system.page, x.page, x.auditKey); }
  for (const d of deferred) assert.equal(byId.get(d.canonicalId)?.name, d.name);
});
test('every certified talent carries system.tags EXACTLY equal to its authority finalTags (deep equality, authored order)', () => {
  for (const x of certified) assert.deepEqual(byId.get(x.canonicalId).system.tags, x.finalTags, x.auditKey);
});
test('the manifest is derived from the authority: 309 rows, empty before-arrays, exact after-arrays, deferred ids excluded', () => {
  assert.equal(man.rows.length, 309); assert.deepEqual(man.counts, { ...man.counts, reviewed: 311, certified: 309, deferred: 2, recordsChanged: 309 });
  for (const r of man.rows) { const x = certified.find(y => y.canonicalId === r.id); assert.ok(x, r.id); assert.deepEqual(r.after, x.finalTags); assert.deepEqual(r.before, []); assert.equal(r.path, 'system.tags'); }
  assert.ok(man.rows.every(r => !defIds.has(r.id))); assert.deepEqual(man.deferred.map(d => d.id).sort(), [...defIds].sort());
});
test('vocabulary: every certified tag belongs to the 184-string surviving vocabulary; the pack still holds exactly 184 raw tag strings and no tree_* tag', () => {
  const vocab = new Set(Object.keys(rd('data/audits/talent-phase-11-2c-dry-run-report.json').postCensus.byTag)), post = new Set(talents.flatMap(tagsOf));
  assert.equal(vocab.size, 184); assert.ok(certified.every(x => x.finalTags.every(g => vocab.has(g)))); assert.ok([...post].every(g => vocab.has(g))); assert.equal(post.size, 184); assert.ok([...post].every(g => !g.startsWith('tree_')));
});
test('orphan closeout: the only zero-tag canonical talents are exactly Quick Study (UR-022) and Done It All (GOI-002), whose tags are unchanged (empty)', () => {
  const zero = talents.filter(t => !tagsOf(t).length); assert.deepEqual(zero.map(t => t._id).sort(), [...defIds].sort()); assert.deepEqual(zero.map(t => t.name).sort(), ['Done It All', 'Quick Study']);
  assert.ok(certified.every(x => tagsOf(byId.get(x.canonicalId)).length > 0));
  for (const d of deferred) assert.deepEqual(byId.get(d.canonicalId).system.tags, []);
});
test('dry-run certified: 309 records, zero-tag 311 -> 2, 184 raw tags before and after, no non-target or non-tag change, tree identity untouched', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.ok(rep.verification.results.every(x => x.ok));
  assert.deepEqual([rep.counts.recordsChanged, rep.counts.zeroTagBefore, rep.counts.zeroTagAfter, rep.counts.rawTagsBefore, rep.counts.rawTagsAfter], [309, 311, 2, 184, 184]);
  assert.deepEqual([rep.counts.nonTargetRecordsChanged, rep.counts.nonTagFieldChanges, rep.counts.vocabularyViolations], [0, 0, 0]); assert.equal(rep.runtimeConsumers.treeIdentityChanged, 0);
  assert.equal(rep.counts.tagInstancesAfter - rep.counts.tagInstancesBefore, certified.reduce((s, x) => s + x.finalTags.length, 0));
});
test('state-appropriate gate passes: the pack is the Phase 12-1 post-state, --verify --exact passes and the CI detector reports POST_12_1_STATE', () => {
  // A later certified phase must add its own later-state mode here (as 11-2C/11-2B/... did) before it can change the pack.
  assert.equal(detect12_1State(), 'POST_12_1');
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-12-1-tags.mjs', '--verify', '--exact'], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(detectPackState().state, 'POST_12_1_STATE');
});

console.log(`\n${n} Phase 12-1 semantic-tag tests passed`);
