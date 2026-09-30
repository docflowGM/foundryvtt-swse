import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { build, DEFECTS, NO_CHANGE, projectRecord, verified } from '../tools/build-talent-phase-3e5-defect-manifest.mjs';
import { buildReport, projectPack } from '../tools/apply-talent-phase-3e5.mjs';

// Phase 3E-5: finite, PDF-gated text-defect manifest + its dry-run. The dry-run writes no pack.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const m = rd('data/audits/talent-phase-3e5-text-defect-manifest.json'), rep = rd('data/audits/talent-phase-3e5-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const by = id => m.entries.find(e => e.id === id);

test('every entry locates exactly (manifest builds with no errors)', () => assert.deepEqual(build().errors, []));
test('owner PDF rulings: 17 verified entries on 16 records, 7 second-wave nominations pending, 6 no-change rulings', () => {
  assert.equal(m.counts.pdfVerified, 17); assert.equal(m.counts.recordsVerified, 16); assert.equal(m.counts.pdfRequired, 7); assert.equal(m.noChangeRulings.length, NO_CHANGE.length);
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
test('second-wave nominations are never applied while PDF_REQUIRED', () => {
  const pend = m.entries.filter(e => !verified(e)); assert.deepEqual(pend.map(e => e.id).sort(), ['TD-20', 'TD-21', 'TD-22', 'TD-23', 'TD-24', 'TD-25', 'TD-26']);
  assert.ok(pend.every(e => e.verification.printedText === null));
  const talents = fs.readFileSync(new URL('../packs/talents.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const { after } = projectPack(talents, m.entries);
  for (const e of pend) assert.deepEqual(after.find(t => t._id === e.productionId), talents.find(t => t._id === e.productionId), e.name);
});
test('projectRecord: exact pre-image required, chained tokens compose, reapplication is a no-op', () => {
  const es = m.entries.filter(e => e.name === 'Drain Force');
  const before = { benefit: 'a Forcesensitive foe and covert it' };
  const once = projectRecord(before, es); assert.equal(once.benefit, 'a Force-sensitive foe and convert it');
  assert.deepEqual(projectRecord(once, es), once);
  const errs = []; projectRecord({ benefit: 'no defect here' }, es, errs); assert.ok(errs.length >= 1);
});
test('dry-run: certified, 16 records, zero changes outside them, no pack written, every verification passes', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.equal(rep.counts.recordsChanged, 16); assert.equal(rep.counts.changedOutsideTargets, 0);
  assert.ok(rep.verification.results.every(r => r.ok)); assert.equal(rep.dryRun, true);
  assert.deepEqual(buildReport().verification.results.filter(r => !r.ok), []);
});
test('dry-run touches only text leaves; ids, names, trees, source, page are never in the mutation set', () => {
  for (const r of rep.records) for (const c of r.changes) assert.ok(/^system\.(prerequisites|benefit|description|summary)(\.value)?$/.test(c.leaf), `${r.name} ${c.leaf}`);
});
test('the committed manifest and dry-run are current (pre-repair pack)', () => {
  for (const [tool, arg] of [['build-talent-phase-3e5-defect-manifest.mjs', '--check'], ['apply-talent-phase-3e5.mjs', '--check']]) {
    const r = spawnSync(process.execPath, ['tools/' + tool, arg], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});
console.log(`\n${n} talent-phase-3e5 checks passed`);
