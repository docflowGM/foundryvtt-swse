import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';
import { danglingFromRetired, retiredIdentities, loadInputs, projectPhase3D, verifyProjection, detect3DState, freshReport, applyProduction, loadPostState, verifyPostState, REPORT_PATH, HOMEBREW } from '../tools/apply-talent-phase-3d.mjs';

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
test('runtime data: the two class archetypes that named the contaminated Inspire Fear record now name Inspire Fear I', () => {
  assert.deepEqual(p.runtimeRepoints, [{ file: 'data/class-archetypes.json', from: '585227ba15d24a37', to: 'cf4b1e5b126a2a7e', occurrences: 2 }]);
  const text = p.runtimeFiles['data/class-archetypes.json'];
  assert.ok(!text.includes('585227ba15d24a37')); JSON.parse(text);
  assert.equal(input.talents.find(t => t._id === 'cf4b1e5b126a2a7e').name, 'Inspire Fear I');
});
test('legacy registry aliases are rewritten by exact leaving name (merge -> survivor name), never by guesswork', () => {
  const alias = id => p.registry.find(e => e.id === id && !e.sourceId);
  assert.deepEqual(alias('officer').talents, ['Combined Fire', 'Stay in the Fight']); assert.equal(alias('officer').talentCount, 2);
  assert.deepEqual(alias('ace-pilot').talents, ['Escort Pilot']);
  const names = new Set(p.talents.map(t => t.name));
  for (const e of p.registry.filter(x => !x.sourceId)) for (const n of e.talents ?? []) if (input.talents.some(t => t.name === n && !names.has(n))) assert.fail(`${e.id} still names ${n}`);
});
test('five dangling structured prerequisites are repointed by identity (PHASE_3C_CANONICAL_RECORD_TOUCHED), text untouched', () => {
  assert.equal(p.canonicalTouched.length, 5); assert.ok(p.canonicalTouched.every(t => t.flag === 'PHASE_3C_CANONICAL_RECORD_TOUCHED'));
  const want = [['11e8f858af268e8c', 0, 'c67cbd59abd1cc53', 'Notorious'], ['8298e12805291c78', 0, 'c67cbd59abd1cc53', 'Notorious.'], ['9491f34aad83dfb1', 0, '09744041cdcc9e22', 'Notorious'], ['b0ecc747a76deb72', 1, '09744041cdcc9e22', 'Inspire Fear I, Inspire Fear II, Inspire Fear III, Notorious'], ['9c1e0b0566cb45c2', 0, '9e4345faaaa94dd8', 'Dastardly Strike']];
  for (const [id, i, to, text] of want) {
    const t = p.talents.find(x => x._id === id); assert.equal(t.system.prerequisitesStructured.conditions[i].id, to, t.name); assert.equal(t.system.prerequisites, text);
    const b = clone(input.talents.find(x => x._id === id)); b.system.prerequisitesStructured.conditions[i].id = to; assert.deepEqual(t, b, `${t.name}: only the id leaf may differ`);
  }
  // the two printed Notorious talents stay distinct: Bounty Hunter dependents vs Infamy dependents
  assert.notEqual(p.talents.find(x => x._id === '11e8f858af268e8c').system.prerequisitesStructured.conditions[0].id, p.talents.find(x => x._id === '9491f34aad83dfb1').system.prerequisitesStructured.conditions[0].id);
  // derived mirror entries (older schema, no structured prerequisites) carry no stale leaf
  for (const arr of Object.values(p.derived)) for (const e of arr.filter(x => want.some(w => w[0] === x._id))) assert.ok(!JSON.stringify(e.system.prerequisitesStructured ?? null).includes('swse.talent.notorious') && !JSON.stringify(e.system.prerequisitesStructured ?? null).includes('dastardly_attack'));
});
test('structured-prerequisite gate: zero dangling after the plan, and it catches a stale identity', () => {
  const retired = retiredIdentities(input.manifest, input.talents, p.talents);
  assert.ok(retired.includes('swse.talent.notorious') && retired.includes('swse.talent.dastardly_attack') && retired.includes('a7d8c4da96eacad4'));
  assert.deepEqual(danglingFromRetired(retired, p.talents), []);
  assert.ok(danglingFromRetired(retired, input.talents).length >= 5, 'the pre-migration pack has the five dangling references');
  const bad = clone(p.talents); bad[0].system.prerequisitesStructured = { type: 'all', conditions: [{ type: 'talent', uuid: 'Compendium.foundryvtt-swse.talents.a7d8c4da96eacad4' }] };
  assert.equal(danglingFromRetired(retired, bad).length, 1);
});
test('an allow-listed prerequisite repoint whose current value drifted refuses to apply', () => {
  const i = { ...input, manifest: clone(input.manifest) }; i.manifest.canonicalPrerequisiteRepoints.repoints[0].from = 'swse.talent.something_else';
  throwsWith(() => projectPhase3D(i), /holds .* expected/);
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
test('application flow in a scratch copy: --apply, --verify --exact twice (no writes), second --apply refuses, partial state refuses', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-3d-'));
  try {
    for (const rel of ['packs', 'data/audits', 'data/generated', 'data/fixes', 'data/class-archetypes.json', 'system.json']) fs.cpSync(rel, path.join(tmp, rel), { recursive: true });
    const hashAll = () => { const h = crypto.createHash('sha1'); for (const rel of touchedFiles) if (fs.existsSync(path.join(tmp, rel))) h.update(rel).update(fs.readFileSync(path.join(tmp, rel))); return h.digest('hex'); };
    const touchedFiles = ['packs/talents.db', 'packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', HOMEBREW.talentsFile, HOMEBREW.treesFile, 'data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json', 'data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json', 'data/class-archetypes.json', 'system.json'];
    const before = hashAll();
    const { written } = applyProduction(tmp);
    assert.equal(written.length, 13); assert.ok(written.includes('data/class-archetypes.json')); assert.ok(written.includes('system.json') && written.includes(HOMEBREW.talentsFile));
    assert.ok(!written.includes('packs/classes.db'), 'classes are not rewritten');
    const after = hashAll(); assert.notEqual(after, before);
    let results = verifyPostState(loadPostState(tmp), { exact: true, root: tmp, scan: false });
    assert.deepEqual(results.filter(r => !r.ok), []);
    results = verifyPostState(loadPostState(tmp), { exact: true, root: tmp, scan: false });
    assert.deepEqual(results.filter(r => !r.ok), []); assert.equal(hashAll(), after, 'verify must write nothing');
    assert.throws(() => applyProduction(tmp), /already applied|REFUSED/);
    assert.equal(hashAll(), after, 'the refused second apply must write nothing');
    // a tampered post-state fails --verify --exact
    fs.appendFileSync(path.join(tmp, 'packs/heroic.db'), '');
    // a stale runtime reference introduced after the migration is caught by the repository-wide gate
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'scripts/leak.js'), "const x = 'a7d8c4da96eacad4';\n");
    const gate = verifyPostState(loadPostState(tmp), { exact: false, root: tmp });
    assert.ok(gate.some(r => !r.ok && /residual-reference gate/.test(r.id)), 'the residual-reference gate must fail on a runtime leak');
    fs.rmSync(path.join(tmp, 'scripts/leak.js'));
    const t = fs.readFileSync(path.join(tmp, 'packs/talents-homebrew.db'), 'utf8').split('\n').filter(Boolean); fs.writeFileSync(path.join(tmp, 'packs/talents-homebrew.db'), t.slice(1).join('\n') + '\n');
    assert.ok(verifyPostState(loadPostState(tmp), { exact: true, root: tmp, scan: false }).some(r => !r.ok));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('a partial or drifted pre-state refuses to apply and writes nothing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-3d-'));
  try {
    for (const rel of ['packs', 'data/audits', 'data/generated', 'data/fixes', 'data/class-archetypes.json', 'system.json']) fs.cpSync(rel, path.join(tmp, rel), { recursive: true });
    const lines = fs.readFileSync(path.join(tmp, 'packs/talents.db'), 'utf8').split('\n').filter(Boolean);
    fs.writeFileSync(path.join(tmp, 'packs/talents.db'), lines.filter(l => !l.includes('"_id":"a7d8c4da96eacad4"')).join('\n') + '\n');
    const snap = fs.readFileSync(path.join(tmp, 'packs/heroic.db'), 'utf8');
    assert.throws(() => applyProduction(tmp), /REFUSED/);
    assert.equal(fs.readFileSync(path.join(tmp, 'packs/heroic.db'), 'utf8'), snap); assert.ok(!fs.existsSync(path.join(tmp, HOMEBREW.talentsFile)));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('the CLI refuses --apply on an unexpected pack state (real repository untouched)', () => {
  const before = fs.readFileSync('packs/talents.db', 'utf8');
  const run = spawnSync(process.execPath, ['tools/apply-talent-phase-3d.mjs', '--status'], { encoding: 'utf8' });
  assert.equal(run.status, 0); assert.match(run.stdout, /phase 3D: PRE_3D/);
  assert.equal(fs.readFileSync('packs/talents.db', 'utf8'), before);
});
console.log(`\n${passed} talent-phase-3d applicator checks passed`);
