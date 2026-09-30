import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 3E-2a: source-side facts of the Core Gunslinger census. Production-side fields may legitimately change when the
// production source/page defect is fixed later, so those are not pinned here.
const c = JSON.parse(fs.readFileSync(new URL('../data/audits/talent-phase-3e-core-gunslinger-census.json', import.meta.url), 'utf8'));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('the TXT shows exactly seven Gunslinger talents in alphabetical order, two of them across the page break', () => {
  assert.deepEqual(c.sourceRoster, ['Debilitating Shot', 'Deceptive Shot', 'Improved Quick Draw', 'Knockdown Shot', 'Multiattack Proficiency (pistols)', 'Ranged Disarm', 'Trigger Work']);
  assert.ok(c.source.entries[5].line > c.source.entries[4].line + 40, 'Ranged Disarm sits after the class table');
});
test('Phase 1D recorded only the five p.216 talents; canonical origin identities are five', () => {
  assert.equal(c.layerCounts.phase1dOriginRoster, 5); assert.equal(c.layerCounts.canonicalOriginIdentities, 5);
});
test('five exact matches, two authority gaps (Ranged Disarm, Trigger Work), no mismatches, no unexplained extras', () => {
  assert.equal(c.findings.exactMatches.length, 5);
  assert.deepEqual(c.findings.authorityGaps, ['Ranged Disarm', 'Trigger Work']);
  assert.deepEqual(c.findings.mismatches, []); assert.deepEqual(c.unexplainedProductionExtras, []);
});
test('the two gaps are corroborated independently of the tree text (index p.217, cross-reference, prerequisite, stat blocks)', () => {
  assert.equal(c.corroboration.coreIndex.length, 2); assert.ok(c.corroboration.coreBody.line > 0);
  assert.ok(c.corroboration.coreStatBlocks.length >= 2); assert.ok(c.corroboration.otherBooks.some(o => /Prerequisite: Ranged Disarm/.test(o.text)));
});
test('nothing is repaired and the PDF confirmation list is explicit', () => {
  assert.equal(c.productionMutationPerformed, false); assert.ok(c.pdfRequests.length >= 4);
});
test('the generator runs against the current repository without a stale TXT anchor', () => {
  const r = spawnSync(process.execPath, ['tools/census-talent-core-gunslinger.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} Core Gunslinger census checks passed`);
