import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { build, DEFECTS, NO_CHANGE, projectRecord, verified } from '../tools/build-talent-phase-3e5-defect-manifest.mjs';
import { buildReport, projectPack, detect3E5State } from '../tools/apply-talent-phase-3e5.mjs';

// Phase 3E-5: finite, PDF-gated text-defect manifest + its dry-run. The dry-run writes no pack.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const m = rd('data/audits/talent-phase-3e5-text-defect-manifest.json'), rep = rd('data/audits/talent-phase-3e5-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const state = detect3E5State();
const by = id => m.entries.find(e => e.id === id);

test('every entry locates exactly (manifest builds with no errors)', () => assert.deepEqual(build().errors, []));
test('owner PDF rulings: 28 verified entries on 23 records, no nomination outstanding, 6 no-change rulings', () => {
  assert.equal(m.counts.pdfVerified, 28); assert.equal(m.counts.recordsVerified, 23); assert.equal(m.counts.pdfRequired, 0); assert.equal(m.noChangeRulings.length, NO_CHANGE.length);
  assert.equal(m.entries.length, DEFECTS.length);
  assert.ok(m.noChangeRulings.map(x => x.record).includes('Sidestep'));
});
test('reclassifications: Wrong Decision / Vital Encouragement are section bleed, Share Talent is a full-record repair, Hunter\'s Mark repairs its summary', () => {
  assert.equal(by('TD-06').group, 'ADJACENT_SECTION_OCR_BLEED'); assert.ok(!by('TD-06').after.benefit.includes('Executive Leadership'));
  assert.equal(by('TD-16').group, 'ADJACENT_SECTION_OCR_BLEED'); assert.ok(!by('TD-16').after.benefit.includes('New Sense Talents'));
  assert.equal(by('TD-15').action, 'REPLACE_FIELDS'); assert.ok(by('TD-15').after.benefit.startsWith('Choose a talent that you already possess.') && !/Twi'Ler|Lightsa-ber|Duel-ist/.test(by('TD-15').after.benefit));
  assert.ok(by('TD-05').fields.includes('summary') && !/ateam|you 4 target| ,| \./.test(by('TD-05').after.summary));
  assert.equal(by('TD-19').find, 'posess'); assert.equal(by('TD-18').find, 'covert it');
  assert.ok(!m.entries.some(e => e.id === 'TD-07'), 'the aswift/theirspeed token fixes were inside the bled block');
});
test('second-wave rulings folded in: TD-20..TD-26 are PDF_VERIFIED with the printed text recorded', () => {
  for (const id of ['TD-20', 'TD-21', 'TD-22', 'TD-23', 'TD-24', 'TD-24b', 'TD-24c', 'TD-25', 'TD-25b', 'TD-25c', 'TD-26']) { assert.ok(verified(by(id)), id); assert.ok(by(id).verification.printedText, id); }
  assert.equal(by('TD-22').replace, '1d6 x your Wisdom modifier');
  assert.ok(m.entries.filter(e => e.group === 'BULLET_GLYPH_OCR').every(e => e.replace.startsWith('\u2022 ')));
  assert.ok(!/ ,|te price|@/.test(by('TD-20').after.summary) && by('TD-20').after.benefit.includes('the price of a bounty') && by('TD-20').after.benefit.includes('your Persuasion check'));
  assert.ok(m.entries.every(verified));
});
test('projectRecord: exact pre-image required, chained tokens compose, reapplication is a no-op', () => {
  const es = m.entries.filter(e => e.name === 'Drain Force');
  const before = { benefit: 'a Forcesensitive foe and covert it' };
  const once = projectRecord(before, es); assert.equal(once.benefit, 'a Force-sensitive foe and convert it');
  assert.deepEqual(projectRecord(once, es), once);
  const errs = []; projectRecord({ benefit: 'no defect here' }, es, errs); assert.ok(errs.length >= 1);
});
test('dry-run: certified, 23 records, zero changes outside them, every verification passes', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.equal(rep.counts.recordsChanged, 23); assert.equal(rep.counts.leafChangesTotal, 49); assert.equal(rep.counts.changedOutsideTargets, 0);
  assert.ok(rep.verification.results.every(r => r.ok)); assert.equal(rep.dryRun, true);
  if (state === 'PRE_3E5') assert.deepEqual(buildReport().verification.results.filter(r => !r.ok), []);
});
test('dry-run touches only text leaves; ids, names, trees, source, page are never in the mutation set', () => {
  for (const r of rep.records) for (const c of r.changes) assert.ok(/^system\.(prerequisites|benefit|description|summary)(\.value)?$/.test(c.leaf), `${r.name} ${c.leaf}`);
});
test(`state-appropriate gates pass (${state})`, () => {
  const runs = (state === 'POST_3E5' || state === 'POST_LATER')
    ? [['apply-talent-phase-3e5.mjs', '--verify', '--exact'], ['build-talent-phase-3e5-defect-manifest.mjs', '--check']]
    : [['build-talent-phase-3e5-defect-manifest.mjs', '--check'], ['apply-talent-phase-3e5.mjs', '--check']];
  for (const [tool, ...args] of runs) { const r = spawnSync(process.execPath, ['tools/' + tool, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr); }
});
console.log(`\n${n} talent-phase-3e5 checks passed (${state})`);
