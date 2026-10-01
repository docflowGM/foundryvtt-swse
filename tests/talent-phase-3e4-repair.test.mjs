import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { project, leafDiff, detect3E4State, leavesOf, MANIFEST_PATH, REPORT_PATH, ADDENDUM_PATH, TALENTS } from '../tools/apply-talent-phase-3e4.mjs';

// Phase 3E-4: the seven-record canonical repair. Valid before AND after the packs are repaired (project() is idempotent).
const read = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const manifest = JSON.parse(read(MANIFEST_PATH)), report = JSON.parse(read(REPORT_PATH)), addendum = JSON.parse(read(ADDENDUM_PATH));
const talents = read(TALENTS).split('\n').filter(Boolean).map(JSON.parse);
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const state = detect3E4State();

test('boundary: the manifest targets exactly the seven addendum ids', () => {
  assert.deepEqual(manifest.records.map(r => r.id).sort(), addendum.additions.map(a => a.production.id).sort());
  assert.equal(manifest.records.length, 7);
});
test('projection changes only the seven records and only the permitted leaves', () => {
  const after = project(manifest, talents), ids = new Set(manifest.records.map(r => r.id));
  assert.equal(after.length, 1187);
  talents.forEach((t, i) => { if (!ids.has(t._id)) assert.deepEqual(after[i], t); });
  for (const r of manifest.records) {
    const b = talents.find(t => t._id === r.id), a = after.find(t => t._id === r.id);
    for (const d of leafDiff(b, a)) assert.ok(/^system\.(source|page|prerequisites|benefit|description)(\.|$)/.test(d.leaf), d.leaf);
    assert.equal(a.name, b.name); assert.equal(a.system.treeId, b.system.treeId); assert.ok(!('summary' in a.system));
  }
});
test('the repaired records equal the PDF-verified addendum (source, page, prerequisites, benefit == description.value)', () => {
  const after = project(manifest, talents);
  for (const a of addendum.additions) {
    const s = after.find(t => t._id === a.production.id).system;
    assert.equal(s.source, a.publication.sourcebook); assert.equal(s.page, a.publication.page); assert.equal(s.prerequisites ?? '', a.prerequisites);
    assert.equal(s.benefit, a.rulesText); assert.equal(s.description.value, a.rulesText);
  }
});
test('specific owner-authorized contents: Force Point costs, move object prerequisite, printed cross-reference, Stolen Form wording', () => {
  const by = Object.fromEntries(addendum.additions.map(a => [a.name, project(manifest, talents).find(t => t._id === a.production.id).system]));
  assert.ok(/spend a Force Point when you activate the power/.test(by['Move Massive Object'].benefit) && by['Move Massive Object'].prerequisites === 'Telekinetic Power, move object');
  assert.ok(/spend a Force Point to negate that movement/.test(by['Telekinetic Stability'].benefit));
  assert.ok(/spend a Force Point and increase your Dark Side Score by 1/.test(by['Dark Preservation'].benefit));
  assert.ok(/\(see Disarm, page 152\)/.test(by['Ranged Disarm'].benefit));
  assert.ok(/choose a different lightsaber form/.test(by['Stolen Form'].benefit) && by['Stolen Form'].page === 81);
  assert.equal(by['Trigger Work'].page, 217); assert.equal(by['Hard Target'].page, 95);
});
test('the dry-run report is certified, records zero changes outside the seven and no actor/class/tree/homebrew write', () => {
  assert.equal(report.status, 'DRY_RUN_CERTIFIED'); assert.equal(report.counts.changedOutsideSeven, 0); assert.equal(report.counts.recordsChanged, 7);
  assert.ok(report.verification.results.every(r => r.ok));
  for (const f of ['packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db']) assert.ok(f in report.untouchedFiles, f);
  assert.equal(report.embeddedActorItems.total, 24);
});
test('the set leaves are all that a record may differ by (rest fingerprint contract)', () => {
  assert.equal(Object.keys(leavesOf({ system: { description: { value: 'x' } } })).join(), 'system.description.value');
});
test(`state-appropriate gate passes (${state})`, () => {
  const args = state === 'POST_3E4' ? ['--verify', '--exact'] : (state === 'POST_3E5' || state === 'POST_LATER') ? ['--verify'] : ['--check'];
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-3e4.mjs', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} talent-phase-3e4 checks passed (${state})`);
