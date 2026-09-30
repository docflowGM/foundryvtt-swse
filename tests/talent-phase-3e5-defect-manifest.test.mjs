import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { build, DEFECTS, NO_CHANGE } from '../tools/build-talent-phase-3e5-defect-manifest.mjs';

// Phase 3E-5a: the text-defect universe is a finite, PDF-gated list. Nothing here may write production.
const m = JSON.parse(fs.readFileSync(new URL('../data/audits/talent-phase-3e5-text-defect-manifest.json', import.meta.url), 'utf8'));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('every entry locates exactly once in production and in the certified canonical corpus (no build errors)', () => assert.deepEqual(build().errors, []));
test('the four known prerequisite defects are present and ids are unique', () => {
  const finds = m.entries.map(e => e.find);
  for (const f of ['Battie Analysis', 'Enpower Weapon', "Hunter's Target. P", 'Shift Defense 1, Shift Defense Il']) assert.ok(finds.includes(f), f);
  assert.equal(new Set(m.entries.map(e => e.id)).size, m.entries.length);
  assert.equal(m.entries.length, DEFECTS.length); assert.equal(m.noChangeCandidates.length, NO_CHANGE.length);
});
test('the lost-space / lost-hyphen / haIf candidates are all listed; printed forms are preserved, not corrected', () => {
  const finds = new Set(m.entries.map(e => e.find));
  for (const f of ['aswift', 'theirspeed', 'Forcesensitive', 'Forceusers', 'haIf']) assert.ok(finds.has(f), f);
  assert.equal(m.entries.filter(e => e.find === 'haIf').length, 7);
  assert.ok(m.noChangeCandidates.every(c => c.action === 'NO_CHANGE'));
  assert.ok(!m.entries.some(e => ['posess', 'nonenergy', 'nonproficiency', 'nonprestige'].includes(e.find)));
});
test('nothing is verified or applied yet: every entry awaits the PDF and no production write happened', () => {
  assert.equal(m.productionMutationPerformed, false);
  assert.ok(m.entries.every(e => e.verification.status === 'PDF_REQUIRED' && e.verification.verifiedText === null));
  assert.ok(m.entries.filter(e => e.replace === null).every(e => e.action === 'OWNER_TRANSCRIPTION_REQUIRED'));
});
test('the committed manifest is current', () => {
  const r = spawnSync(process.execPath, ['tools/build-talent-phase-3e5-defect-manifest.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} talent-phase-3e5 defect-manifest checks passed`);
