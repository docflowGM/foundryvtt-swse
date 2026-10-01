import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { project, buildReport, detect3FState, MANIFEST_PATH, REPORT_PATH } from '../tools/apply-talent-phase-3f.mjs';

// Phase 3F-3: the manifest-driven tree identity normalization. Valid before AND after the packs are normalized.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const pk = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const manifest = rd(MANIFEST_PATH), report = rd(REPORT_PATH), talents = pk('packs/talents.db'), trees = pk('packs/talent_trees.db');
const state = detect3FState();
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('scope: exactly 71 talents in 11 slug families and 12 trees (6 runtime-id changing, 6 case-only)', () => {
  assert.equal(manifest.talents.length, 71); assert.equal(new Set(manifest.talents.map(t => t.before)).size, 11); assert.equal(manifest.trees.length, 12);
  assert.equal(manifest.trees.filter(t => t.runtimeIdBefore !== t.runtimeIdAfter).length, 6);
  assert.equal(new Set(manifest.trees.map(t => t.nameAfter)).size, 12);
});
test('projection touches only system.treeId on the 71 talents and name / system.talent_tree on the 12 trees; ids and membership preserved', () => {
  const a = project(manifest, talents, trees), tIds = new Set(manifest.talents.map(t => t.id)), nIds = new Set(manifest.trees.map(t => t.id));
  assert.equal(a.talents.length, 1187); assert.equal(a.trees.length, 177);
  a.talents.forEach((t, i) => { if (!tIds.has(t._id)) assert.deepEqual(t, talents[i]); else { const x = structuredClone(t), y = structuredClone(talents[i]); delete x.system.treeId; delete y.system.treeId; assert.deepEqual(x, y); } });
  a.trees.forEach((t, i) => { if (!nIds.has(t._id)) assert.deepEqual(t, trees[i]); else { const x = structuredClone(t), y = structuredClone(trees[i]); for (const o of [x, y]) { delete o.name; delete o.system.talent_tree; } assert.deepEqual(x, y); } });
});
test('every new system.treeId is a tree `_id` that contains the talent; no name slug remains after projection', () => {
  const a = project(manifest, talents, trees), byId = new Map(a.trees.map(t => [t._id, t]));
  for (const m of manifest.talents) { const t = a.talents.find(x => x._id === m.id); assert.equal(t.system.treeId, m.after); assert.ok(byId.get(m.after).system.talentIds.includes(m.id)); }
});
test('dry-run report: certified, zero changes outside the targets, classes/actors/homebrew untouched, registry changes limited to the 12 trees', () => {
  assert.equal(report.status, 'DRY_RUN_CERTIFIED'); assert.equal(report.counts.changedOutsideTargets, 0); assert.ok(report.verification.results.every(r => r.ok));
  assert.equal(report.counts.registryEntriesChanged, 12); assert.ok(report.registryChanges.every(d => d.onlyIdAndDisplayNameChanged));
  for (const f of ['packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db']) assert.ok(f in report.untouchedFiles, f);
  if (state === 'PRE_3F') assert.deepEqual(buildReport().verification.results.filter(r => !r.ok), []);
});
test(`state-appropriate gate passes (${state})`, () => {
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-3f.mjs', ...(state === 'POST_3F' ? ['--verify', '--exact'] : state === 'POST_LATER' ? ['--verify'] : ['--check'])], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} talent-phase-3f normalization checks passed (${state})`);
