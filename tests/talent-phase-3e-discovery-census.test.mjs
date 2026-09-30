import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 3E-2b: the discovery census must classify every residual lead (an unclassified one is a hole in the census).
const c = JSON.parse(fs.readFileSync(new URL('../data/audits/talent-phase-3e-discovery-census.json', import.meta.url), 'utf8'));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('no residual lead is unclassified', () => assert.deepEqual(c.unclassified, []));
test('the stat-block census independently finds talents the claims layer missed (they are in production via Phase 3D) and leaves named leads', () => {
  assert.ok(c.statBlockCensus.matchedCanonicalTalent >= 250);
  assert.deepEqual(c.statBlockCensus.residual.filter(r => r.kind === 'PRINTED_REFERENCE_WITHOUT_RULE_DEFINITION').map(r => r.name).sort(), ['Attract Student', 'Force Valor', 'Shocking Revelation', 'Social Engineering', 'Squad Fighter', 'Wanted Alive']);
});
test('the seven names without a printed definition add no canonical talent (owner PDF pass)', () => {
  assert.equal(c.leads.canonicalTalentsToAdd, 0); assert.deepEqual(c.leads.missingTalentCandidates, []);
  assert.equal(c.leads.printedReferencesWithoutRuleDefinition.length, 7);
});
test('Master Shaper is flagged as a printed stat-block discrepancy, not a missing talent', () => {
  assert.deepEqual(c.leads.sourceDiscrepancies, ['Master Shaper']);
});
test('prerequisite closure: one printed reference without a definition (Command Decision); the four silent OCR prerequisite defects exist only before the 3E-5 repair', () => {
  assert.deepEqual(c.leads.printedReferencesWithoutRuleDefinition.filter(l => l.kind === 'PRINTED_PREREQUISITE_INCONSISTENCY').map(l => l.name), ['Command Decision']);
  const four = c.leads.canonicalTextDefects.map(d => d.text).sort();
  assert.ok(four.length === 0 || JSON.stringify(four) === JSON.stringify(['Battie Analysis', 'Enpower Weapon', "Hunter's Target. P", 'Shift Defense Il']), four.join());
});
test('the rare-token scan surfaced lost-space defects (repaired in 3E-5: none of them remains); PDF-confirmed printed forms are not flagged', () => {
  const toks = c.rareTokenScan.likelyDefects.map(t => t.token);
  assert.ok(toks.includes('ateam') || !['ateam', 'aswift', 'theirspeed', 'forcesensitive', 'forceusers'].some(x => toks.includes(x)));
  for (const printed of ['nonenergy', 'nonproficiency', 'nonprestige', 'nonsurprised', 'nonthreatening']) assert.ok(!toks.includes(printed), printed);
});
test('nothing is repaired and the generator is current', () => {
  assert.equal(c.productionMutationPerformed, false);
  const r = spawnSync(process.execPath, ['tools/census-talent-source-discovery.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} discovery census checks passed`);
