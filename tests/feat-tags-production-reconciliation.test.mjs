import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { reconcile, OUT_JSON } from '../tools/report-feat-tags-production-reconciliation.mjs';
import { loadContext, AUTHORITY_PATH } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Production reconciliation is REPORT-ONLY: ID-driven, isolates derivatives and noncanonical records, never invents missing identities.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex');
const authority = rd(AUTHORITY_PATH);
const ctx = loadContext();
const loadProd = () => {
  const raw = rd('data/feat-catalog.json'); const catalog = Array.isArray(raw) ? raw : Object.values(raw);
  const pack = new Map(fs.readFileSync(new URL('../packs/feats.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => { const r = JSON.parse(l); return [r._id, r]; }));
  return { catalog, byId: new Map(catalog.map(r => [r._id, r])), pack };
};
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('reconciliation covers all 353 canonical identities: 351 present + 2 missing; partition is 351 + 6 + 33 = 390', () => {
  const r = reconcile(authority, ctx, loadProd());
  assert.deepEqual([r.totals.canonicalAssignments, r.totals.canonicalPresentInProduction, r.totals.canonicalMissingFromProduction, r.totals.implementationDerivatives, r.totals.noncanonicalRecords, r.totals.productionRecords, r.totals.productionPartitionCheck], [353, 351, 2, 6, 33, 390, 390]);
});
test('the two missing canonical identities are reported, not invented', () => {
  const prod = loadProd(); const r = reconcile(authority, ctx, prod);
  const miss = r.canonical.filter(x => x.productionClassification === 'CANONICAL_IDENTITY_MISSING_FROM_PRODUCTION');
  assert.deepEqual(miss.map(x => x.canonicalId).sort(), ['c352f81dde5c9dff', 'c9c4130a55761330']);
  for (const m of miss) { assert.equal(m.repoRecord, null); assert.equal(m.productionTags, null); assert.ok(!prod.byId.has(m.canonicalId)); assert.deepEqual(m.tagsToRemove, []); }
  assert.equal(prod.catalog.length, 390);
});
test('the six Weapon Proficiency derivatives are isolated: not canonical rows, no canonical tag transfer', () => {
  const prod = loadProd(); const r = reconcile(authority, ctx, prod);
  assert.equal(r.implementationDerivatives.length, 6);
  const canonicalIds = new Set(r.canonical.map(x => x.canonicalId));
  for (const d of r.implementationDerivatives) {
    assert.ok(!canonicalIds.has(d.repoId)); assert.equal(d.canonicalIdentity, false); assert.equal(d.parentCanonicalId, 'ecc2471ac96ec2d4');
    assert.equal(d.canonicalTagTransfer, 'NOT_PERFORMED_PENDING_PHASE_1C');
    assert.deepEqual(d.productionTags, prod.byId.get(d.repoId).system.tags);
  }
  assert.equal(r.canonical.filter(x => x.name === 'Weapon Proficiency').length, 1);
});
test('the 33 noncanonical records are isolated from the canonical authority', () => {
  const r = reconcile(authority, ctx, loadProd());
  assert.equal(r.noncanonicalRecords.length, 33);
  assert.ok(r.noncanonicalRecords.every(x => x.inCanonicalAuthority === false));
  const canonicalIds = new Set(r.canonical.map(x => x.canonicalId));
  assert.ok(r.noncanonicalRecords.every(x => !canonicalIds.has(x.repoId)));
});
test('the join is ID-driven: a renamed production record still joins by canonical ID (name is diagnostic only)', () => {
  const prod = loadProd(); const id = '192923f60db38831';
  prod.byId.get(id).name = 'Totally Different Name';
  const r = reconcile(authority, ctx, prod); const row = r.canonical.find(x => x.canonicalId === id);
  assert.equal(row.productionClassification, 'CANONICAL_RECORD_PRESENT'); assert.ok(row.warnings.some(w => /NAME_DIAGNOSTIC_MISMATCH/.test(w)));
});
test('per-feat deltas are exact: production = remove + match, authority = add + match', () => {
  const r = reconcile(authority, ctx, loadProd());
  for (const x of r.canonical.filter(y => y.productionTags)) {
    assert.deepEqual([...x.tagsToRemove, ...x.tagsAlreadyMatching].sort(), [...x.productionTags].sort(), x.name);
    assert.deepEqual([...x.tagsToAdd, ...x.tagsAlreadyMatching].sort(), [...x.pass1FinalTags].sort(), x.name);
  }
});
test('reconcile() performs no writes and does not mutate its inputs; production file hashes are unchanged', () => {
  const before = [sha('data/feat-catalog.json'), sha('packs/feats.db'), sha(AUTHORITY_PATH)];
  const prod = loadProd(); const snapshot = JSON.stringify(prod.catalog); const authSnap = JSON.stringify(authority);
  reconcile(authority, ctx, prod);
  assert.equal(JSON.stringify(prod.catalog), snapshot); assert.equal(JSON.stringify(authority), authSnap);
  assert.deepEqual([sha('data/feat-catalog.json'), sha('packs/feats.db'), sha(AUTHORITY_PATH)], before);
});
test('the committed reconciliation report is report-only and matches a fresh computation', () => {
  const committed = rd(OUT_JSON); const fresh = reconcile(authority, ctx, loadProd());
  assert.equal(committed.status, 'REPORT_ONLY_NO_PRODUCTION_MUTATION'); assert.deepEqual(committed.totals, fresh.totals);
});
console.log(`${n} tests passed`);
