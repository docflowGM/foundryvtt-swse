import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 3E-2b: the discovery census must classify every residual lead (an unclassified one is a hole in the census).
const c = JSON.parse(fs.readFileSync(new URL('../data/audits/talent-phase-3e-discovery-census.json', import.meta.url), 'utf8'));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('no residual lead is unclassified', () => assert.deepEqual(c.unclassified, []));
test('the stat-block census independently finds talents the claims layer missed (they are in production via Phase 3D) and leaves named leads', () => {
  assert.ok(c.statBlockCensus.matchedCanonicalTalent >= 250);
  assert.deepEqual(c.statBlockCensus.residual.filter(r => r.kind === 'LEAD').map(r => r.name).sort(), ['Attract Student', 'Force Valor', 'Shocking Revelation', 'Social Engineering', 'Squad Fighter', 'Wanted Alive']);
});
test('Master Shaper is flagged as a printed stat-block discrepancy, not a missing talent', () => {
  assert.deepEqual(c.leads.sourceDiscrepancies, ['Master Shaper']);
});
test('prerequisite closure: one unresolved name (Command Decision) and four silent OCR defects in canonical text', () => {
  assert.deepEqual(c.leads.missingTalentCandidates.filter(l => l.kind === 'PREREQUISITE_UNDEFINED').map(l => l.name), ['Command Decision']);
  assert.deepEqual(c.leads.canonicalTextDefects.map(d => d.text).sort(), ['Battie Analysis', 'Enpower Weapon', "Hunter's Target. P", 'Shift Defense Il']);
});
test('the rare-token scan surfaces lost-space defects in canonical text', () => {
  assert.ok(c.rareTokenScan.likelyDefects.some(t => t.token === 'ateam'));
});
test('nothing is repaired and the generator is current', () => {
  assert.equal(c.productionMutationPerformed, false);
  const r = spawnSync(process.execPath, ['tools/census-talent-source-discovery.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} discovery census checks passed`);
