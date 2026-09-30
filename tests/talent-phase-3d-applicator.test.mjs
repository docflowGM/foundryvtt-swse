import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';
import { loadInputs, projectPhase3D, verifyProjection, detect3DState, freshReport, REPORT_PATH, HOMEBREW } from '../tools/apply-talent-phase-3d.mjs';

// Phase 3D-3: dry-run only. These tests never write a pack; they prove the simulation and its refusals.
if (detectPackState().state !== 'POST_STATE') { console.log('  skip talent-phase-3d applicator: packs are not the certified Phase 3C post-state'); process.exit(0); }

const clone = v => structuredClone(v);
const input = loadInputs();
const p = projectPhase3D(input);
const results = verifyProjection(input, p);
const rec = id => input.manifest.records.find(r => r.productionId === id);
let passed = 0; const test = (n, fn) => { fn(); passed++; console.log('  ok  ' + n); };
const throwsWith = (fn, re) => assert.throws(fn, err => re.test(err.message));

test('every simulated invariant passes', () => assert.deepEqual(results.filter(r => !r.ok), []));
test('final count math: 1,272 - 19 - 16 - 50 = 1,187 canonical; 50 homebrew; 1,237 preserved', () => {
  assert.equal(input.talents.length, 1272);
  assert.equal(p.talents.length, 1187); assert.equal(p.homebrew.talents.length, 50);
  assert.equal(p.talents.length + p.homebrew.talents.length, 1237);
  assert.deepEqual(p.operationCounts.MERGE_DUPLICATE, 19); assert.equal(p.operationCounts.REMOVE_CONTAMINATION, 16);
  assert.equal(p.operationCounts.MOVE_HOMEBREW_PACK, 50); assert.equal(p.operationCounts.KEEP_CANONICAL_ADDITIONAL_PUBLICATION, 6); assert.equal(p.operationCounts.CORRECT_IDENTITY, 1);
});
test('trees reconcile: 19 exclusively-homebrew trees move with their records (ids preserved)', () => {
  assert.equal(p.homebrew.trees.length, 19); assert.equal(p.trees.length + p.homebrew.trees.length, input.trees.length);
  for (const t of p.homebrew.trees) { assert.ok(input.trees.some(x => x._id === t._id)); assert.ok(t.system.talentIds.every(id => p.homebrew.talents.some(h => h._id === id))); assert.ok(!p.trees.some(x => x._id === t._id)); }
});
test('moved records keep their ids and every automation field unchanged', () => {
  for (const h of p.homebrew.talents) assert.deepEqual(h, input.talents.find(t => t._id === h._id));
  assert.ok(p.homebrew.talents.some(h => h.system.abilityMeta && Object.keys(h.system.abilityMeta).length));
});
test('HARD PREREQUISITE: all 34 Notorious / Teräs Käsi embedded actor repoints happen before removal', () => {
  const hits = p.repointed.filter(r => r.from === 'a7d8c4da96eacad4' || r.from === '222327492c484b4a');
  assert.equal(hits.length, 34); assert.equal(p.repointed.length, 34);
  assert.equal(hits.filter(r => r.to === '09744041cdcc9e22').length, 20); assert.equal(hits.filter(r => r.to === 'c67cbd59abd1cc53').length, 12); assert.equal(hits.filter(r => r.to === '67bddb17ae2770f3').length, 2);
  assert.ok(hits.every(r => r.toPack === 'talents'));
});
test('removing a record whose actor repoint is not planned is refused', () => {
  const i = { ...input, manifest: clone(input.manifest) };
  const r = i.manifest.records.find(x => x.productionId === 'a7d8c4da96eacad4'); r.referencesToRepoint.actorPackEmbeddedItems.pop();
  throwsWith(() => projectPhase3D(i), /unresolved live actor reference|BLOCKED/);
  const i2 = { ...input, manifest: clone(input.manifest) };
  // checker passes (list == live refs) but the repoint target is withdrawn: projection must still refuse
  i2.manifest.records.find(x => x.productionId === '222327492c484b4a').survivorId = null;
  throwsWith(() => projectPhase3D(i2), /survivor|replacement/);
});
test('an unlisted reference in a non-actor pack blocks the removal', () => {
  const i = { ...input, otherPackTexts: { ...input.otherPackTexts, 'leak.db': '{"x":"ref a7d8c4da96eacad4"}' } };
  throwsWith(() => projectPhase3D(i), /unresolved live references/);
});
test('merge survivors keep their ids and stay unchanged; Notorious twins stay distinct', () => {
  const after = new Map(p.talents.map(t => [t._id, t]));
  for (const r of input.manifest.records.filter(x => x.finalDisposition === 'MERGE_DUPLICATE')) { assert.ok(after.has(r.survivorId)); assert.deepEqual(after.get(r.survivorId), input.talents.find(t => t._id === r.survivorId)); assert.ok(!after.has(r.productionId)); }
  assert.ok(after.has('09744041cdcc9e22') && after.has('c67cbd59abd1cc53') && !after.has('a7d8c4da96eacad4'));
});
test('KEEP records (incl. Stolen Form) remain with their actor references valid', () => {
  for (const r of input.manifest.records.filter(x => x.finalDisposition === 'KEEP_CANONICAL_ADDITIONAL_PUBLICATION')) assert.ok(p.talents.some(t => t._id === r.productionId), r.name);
  for (const a of [...p.actors.heroic, ...p.actors.npc]) for (const it of a.items ?? []) if ((it.flags?.core?.sourceId || '').endsWith('f9352f317ad2f695')) assert.match(it.flags.core.sourceId, /\.talents\.f9352f317ad2f695$/);
});
test('identity correction: Ranged Disarm moves Warrior -> Gunslinger and only system.treeId changes', () => {
  const r = 'd7870d0940a3ce0b', g = p.trees.find(t => t._id === 'cb6f775cd227a3e3'), w = p.trees.find(t => t._id === '13776eed744d410c');
  assert.ok(g.system.talentIds.includes(r)); assert.ok(!w.system.talentIds.includes(r));
  assert.equal(p.talents.find(t => t._id === r).system.treeId, 'cb6f775cd227a3e3');
});
test('no orphan memberships and no nonexistent class tree references', () => {
  const ids = new Set(p.talents.map(t => t._id)), trees = new Set(p.trees.map(t => t._id));
  for (const t of p.trees) for (const id of t.system.talentIds) assert.ok(ids.has(id), `${t.name}: orphan ${id}`);
  for (const c of p.classes) for (const ref of c.system.talentTreeSourceIds ?? []) assert.ok(trees.has(ref), `${c.name}: ${ref}`);
  assert.deepEqual(p.classes, input.classes); // nothing references a homebrew tree, so classes stay byte-identical
});
test('registry is regenerated without the homebrew trees and keeps every canonical tree', () => {
  assert.ok(p.registry.every(e => !p.movedTreeIds.includes(e.sourceId)));
  for (const t of p.trees) assert.ok(p.registry.some(e => e.sourceId === t._id));
});
test('identity is never matched by name alone: same-name records resolve by id', () => {
  const notorious = input.talents.filter(t => t.name === 'Notorious').map(t => t._id).sort();
  assert.deepEqual(notorious, ['09744041cdcc9e22', 'a7d8c4da96eacad4', 'c67cbd59abd1cc53']);
  assert.deepEqual(p.talents.filter(t => t.name === 'Notorious').map(t => t._id).sort(), ['09744041cdcc9e22', 'c67cbd59abd1cc53']);
});
test('dry-run idempotence: a second projection over the projected state refuses as already applied', () => {
  assert.equal(detect3DState(input.manifest, p.talents), 'POST_3D');
  throwsWith(() => projectPhase3D({ ...input, talents: p.talents, trees: p.trees, classes: p.classes, actors: p.actors, derived: p.derived }), /already applied/);
});
test('a partly applied state refuses', () => {
  const partial = input.talents.filter(t => t._id !== 'a7d8c4da96eacad4');
  assert.equal(detect3DState(input.manifest, partial), 'PARTIAL_3D');
  throwsWith(() => projectPhase3D({ ...input, talents: partial }), /partly applied/);
});
test('committed dry-run report equals a fresh projection and certifies it', () => {
  const { report } = freshReport();
  assert.equal(report.status, 'DRY_RUN_CERTIFIED'); assert.equal(report.productionMutationPerformed, false);
  assert.equal(fs.readFileSync(REPORT_PATH, 'utf8'), JSON.stringify(report, null, 2) + '\n');
  assert.equal(report.counts.after.totalPreservedTalents, 1237);
});
test('--apply is refused and no pack changes', () => {
  const files = ['packs/talents.db', 'packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/npc.db'];
  const before = files.map(f => fs.readFileSync(f, 'utf8'));
  const run = spawnSync(process.execPath, ['tools/apply-talent-phase-3d.mjs', '--apply'], { encoding: 'utf8' });
  assert.equal(run.status, 2); assert.match(run.stderr, /dry-run only/);
  assert.deepEqual(files.map(f => fs.readFileSync(f, 'utf8')), before);
  assert.ok(!fs.existsSync(HOMEBREW.talentsFile) && !fs.existsSync(HOMEBREW.treesFile));
});
console.log(`\n${passed} talent-phase-3d applicator checks passed`);
