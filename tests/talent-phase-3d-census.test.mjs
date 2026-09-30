import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 3D-1: the census must account for exactly the 92 records Phase 3C protected, and stay current.
const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const census = read('data/audits/talent-phase-3d-production-extras-census.json');
const impact = read('data/audits/talent-phase-3d-reference-impact.json');
const closeout = read('data/audits/talent-phase-3b-global-closeout.json');
let passed = 0; const test = (n, fn) => { fn(); passed++; console.log('  ok  ' + n); };

test('census has exactly 92 unique records (90 deferred + 2 review extras)', () => {
  assert.equal(census.records.length, 92);
  assert.equal(new Set(census.records.map(r => r.productionId)).size, 92);
  assert.equal(census.counts.deferredProductionOnly, 90);
  assert.equal(census.counts.reviewExtras, 2);
});
test('census ids equal the Phase 3C protected set', () => {
  const expected = new Set([...closeout.productionOnlyDeferred.map(d => d.productionRecordId), ...closeout.reviewExtras.map(e => e.productionRecordId)]);
  assert.deepEqual(new Set(census.records.map(r => r.productionId)), expected);
});
test('census is read-only and every record is unadjudicated', () => {
  assert.equal(census.productionMutationPerformed, false);
  assert.ok(census.records.every(r => r.evidenceStatus === 'UNADJUDICATED'));
});
test('reference-impact report covers the same 92 ids', () => {
  assert.deepEqual(impact.records.map(r => r.productionId), census.records.map(r => r.productionId));
});
test('census/reference files match the generator (--check)', () => {
  const run = spawnSync(process.execPath, ['tools/build-talent-phase-3d-census.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
console.log(`\n${passed} talent-phase-3d census checks passed`);
