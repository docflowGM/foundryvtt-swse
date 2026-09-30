import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { reconcile, loadInput, BLOCKING } from '../tools/reconcile-talent-publication-corpus.mjs';

// Phase 3E-3: publication-to-production reconciliation. Each detection is proven by mutating a fresh copy of the inputs.
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const fresh = () => structuredClone(loadInput());
const run = mut => { const i = fresh(); mut(i); return reconcile(i); };
const codes = r => r.blockingFindings.map(f => f.code);

const base = reconcile(loadInput());
test('the real corpus reconciles: 1,182 + 7 claims -> 1,187 identities <-> 1,187 production records, zero blocking findings', () => {
  assert.deepEqual(base.blockingFindings, []);
  assert.equal(base.denominator.totalClaims, 1189); assert.equal(base.denominator.identities, 1187); assert.equal(base.denominator.productionCanonicalRecords, 1187);
  assert.equal(base.denominator.homebrewExcluded, 50); assert.equal(base.denominator.crossTreeSameNameGroups, 19);
});
test('claim without a record', () => assert.ok(codes(run(i => { i.production = i.production.filter(t => t._id !== i.addendum.additions[0].production.id); })).includes('CLAIM_WITHOUT_RECORD')));
test('record without a claim', () => assert.ok(codes(run(i => { i.production.push({ ...structuredClone(i.production[0]), _id: 'ffffffffffffffff', name: 'Invented Talent' }); })).includes('RECORD_WITHOUT_CLAIM')));
test('duplicate mapping (two identities -> one production record)', () => assert.ok(codes(run(i => { i.addendum.additions[1].production.id = i.addendum.additions[0].production.id; })).includes('DUPLICATE_MAPPING')));
test('duplicate production record in one tree', () => assert.ok(codes(run(i => {
  const t = i.production[0], tree = i.trees.find(x => x.system.talentIds.includes(t._id)); const c = { ...structuredClone(t), _id: 'eeeeeeeeeeeeeeee' }; i.production.push(c); tree.system.talentIds.push(c._id);
})).includes('DUPLICATE_RECORD_IN_TREE')));
test('wrong tree (member of a different tree than the manifest target)', () => assert.ok(codes(run(i => {
  const id = i.addendum.additions[0].production.id, other = i.trees.find(t => !t.system.talentIds.includes(id));
  i.trees.forEach(t => { t.system.talentIds = t.system.talentIds.filter(x => x !== id); }); other.system.talentIds.push(id);
})).includes('WRONG_TREE')));
test('name mismatch', () => assert.ok(codes(run(i => { i.production.find(t => t._id === i.addendum.additions[0].production.id).name = 'Something Else'; })).includes('NAME_MISMATCH')));
test('unresolved same-name cross-tree ambiguity (two same-name identities collapsed onto one record)', () => assert.ok(codes(run(i => {
  const g = i.canonical.sameNameDifferentTreeGroups[0], ids = i.canonical.records.filter(r => r.name === g.name).map(r => r.canonicalIdentity);
  for (const { manifest } of i.manifests) for (const r of manifest.records) if (r.canonicalIdentity === ids[1]) r.identityResolution.productionRecordId = [...i.manifests.flatMap(m => m.manifest.records)].find(x => x.canonicalIdentity === ids[0]).identityResolution.productionRecordId;
})).includes('UNRESOLVED_SAME_NAME_AMBIGUITY')));
test('claim count must equal the Phase 2 closeout certificate', () => assert.ok(codes(run(i => { i.closeout.totals.certifiedPublicationClaims += 1; })).includes('CLAIM_COUNT_MISMATCH')));
test('homebrew is outside the denominator and must stay disjoint', () => assert.ok(codes(run(i => { i.homebrew.push({ _id: i.production[0]._id, name: 'x' }); })).includes('HOMEBREW_IN_DENOMINATOR')));
test('text drift: production text must equal certified canonical text or an approved (PDF-verified) correction', () => {
  assert.equal(base.findingCounts.TEXT_DRIFT, 0);
  assert.ok(codes(run(i => { const t = i.production.find(x => x.name === 'Armor Mastery'); t.system.benefit += ' extra'; })).includes('TEXT_DRIFT'));
  assert.ok(codes(run(i => { const t = i.production.find(x => x.name === 'Cover Fire'); t.system.prerequisites = 'Something Else.'; })).includes('TEXT_DRIFT'));
  // an unapproved (PDF_REQUIRED) correction does not whitelist new text; a PDF_VERIFIED one does
  const coverFire = i => i.production.find(x => x.name === 'Cover Fire');
  assert.ok(codes(run(i => { coverFire(i).system.prerequisites = 'Battle Analysis.'; i.textCorrections.entries.forEach(e => { if (e.name === 'Cover Fire') e.verification.status = 'PDF_REQUIRED'; }); })).includes('TEXT_DRIFT'));
  assert.deepEqual(codes(run(i => { coverFire(i).system.prerequisites = 'Battle Analysis.'; })), []);
});
test('wrong source/page is reported as metadata (the seven 3E additions until the repair unit), not blocking', () => {
  const before = base.findingCounts.WRONG_SOURCE_PAGE; assert.ok(before === 7 || before === 0, 'only the seven 3E additions may lack source/page');
  const r = run(i => { const t = i.production.find(x => x.system.source); t.system.page += 1; });
  assert.equal(r.findingCounts.WRONG_SOURCE_PAGE, before + 1); assert.deepEqual(r.blockingFindings, []);
});
test('stale tree slugs and tree display-name drift are tracked for Phase 3F, never normalized here', () => {
  assert.ok(base.findingCounts.STALE_TREE_ID_SLUG > 0 && base.findingCounts.TREE_DISPLAY_NAME_DRIFT > 0);
  for (const c of BLOCKING) assert.ok(!['STALE_TREE_ID_SLUG', 'TREE_DISPLAY_NAME_DRIFT'].includes(c));
});
test('the committed report is current', () => {
  const r = spawnSync(process.execPath, ['tools/reconcile-talent-publication-corpus.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} publication reconciliation checks passed`);
