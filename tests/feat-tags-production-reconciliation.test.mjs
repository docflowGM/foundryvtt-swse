import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OUT_JSON } from '../tools/report-feat-tags-production-reconciliation.mjs';

// The tag production reconciliation was a REPORT-ONLY comparison of the certified feat tag authority against the PRE-CUTOVER
// production catalog (390 records). Phase 5C performed the cutover (353 canonical = 353 production), so the committed report is now
// frozen historical evidence; the live-state gate is tools/verify-canonical-production.mjs (feat semantic parity 353/353).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('the frozen pre-cutover reconciliation report is committed, report-only, and records the certified 351 + 6 + 33 = 390 partition', () => {
  const r = rd(OUT_JSON);
  assert.equal(r.status, 'REPORT_ONLY_NO_PRODUCTION_MUTATION');
  assert.deepEqual([r.totals.canonicalAssignments, r.totals.canonicalPresentInProduction, r.totals.canonicalMissingFromProduction, r.totals.implementationDerivatives, r.totals.noncanonicalRecords, r.totals.productionRecords, r.totals.productionPartitionCheck], [353, 351, 2, 6, 33, 390, 390]);
  assert.deepEqual(r.canonical.filter((x) => x.productionClassification === 'CANONICAL_IDENTITY_MISSING_FROM_PRODUCTION').map((x) => x.canonicalId).sort(), ['c352f81dde5c9dff', 'c9c4130a55761330']);
});
test('post-cutover: production is exactly the 353 canonical feats; the two formerly missing identities exist; derivatives and noncanonical records are gone', () => {
  const corpus = rd('data/canonical/feats.json');
  const catalog = rd('data/feat-catalog.json');
  assert.equal(catalog.length, 353);
  const ids = new Set(catalog.map((d) => d._id));
  assert.deepEqual([...ids].sort(), corpus.identities.map((i) => i.canonicalId).sort());
  assert.ok(ids.has('c352f81dde5c9dff') && ids.has('c9c4130a55761330'));
  for (const r of corpus.retiredProductionRecords) assert.ok(!ids.has(r.oldId), `${r.oldName} must be absent`);
  assert.equal(corpus.retiredProductionRecords.filter((r) => r.disposition === 'IMPLEMENTATION_DERIVATIVE_MIGRATED_TO_CHOICE').length, 6);
  assert.equal(corpus.retiredProductionRecords.filter((r) => r.disposition === 'REMOVED_NONCANONICAL').length, 33);
});
console.log(`${n} tests passed`);
