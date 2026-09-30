import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, CLOSEOUT_PATH, loadCommittedManifests, projectPhase3C, verifyPostState, setPath,
  detachFromTree, attachToTree, protectedIdsOf, computeCertifiedFingerprints, serializeProjection, loadPackTexts
} from '../tools/apply-talent-phase-3c.mjs';

// Hardening tests for the Phase 3C applicator's pure functions. These run against the PRE-state packs in the
// checked-out repo; once the migration is applied they are replaced by the POST-state --verify path.

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readPack = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const closeout = readJson(CLOSEOUT_PATH);
const state = () => ({
  manifests: structuredClone(loadCommittedManifests()), closeout: structuredClone(closeout),
  talents: readPack('packs/talents.db'), trees: readPack('packs/talent_trees.db'), classes: readPack('packs/classes.db')
});
const isPre = state().talents.length === 1024;
let passed = 0, skipped = 0;
const test = (name, fn, { preOnly = false } = {}) => {
  if (preOnly && !isPre) { skipped++; console.log('  skip ' + name + ' (production is post-state)'); return; }
  fn(); passed++; console.log('  ok  ' + name);
};
const anyRecord = (s, pred) => s.manifests.flatMap(m => m.manifest.records).find(pred);

/* setPath: fail closed on incompatible shapes ------------------------------------------------------ */
test('setPath refuses to replace a string description with an object', () => {
  const t = { system: { description: 'plain text' } };
  assert.throws(() => setPath(t, 'system.description.value', 'x'), /incompatible shape/);
  assert.equal(t.system.description, 'plain text');
});
test('setPath refuses arrays / null / numbers as intermediates', () => {
  for (const bad of [[], null, 5]) {
    const t = { system: { a: bad } };
    assert.throws(() => setPath(t, 'system.a.b', 1), /incompatible shape/);
  }
});
test('setPath refuses to overwrite an object with a scalar', () => {
  const t = { system: { description: { value: 'x' } } };
  assert.throws(() => setPath(t, 'system.description', 'flat'), /overwrite object/);
});
test('setPath still creates missing parents and writes description.value onto an object description', () => {
  const t = { system: {} }; setPath(t, 'system.description.value', 'a'); assert.deepEqual(t.system.description, { value: 'a' });
  const u = { system: { description: { value: 'old', extra: 1 } } }; setPath(u, 'system.description.value', 'new');
  assert.deepEqual(u.system.description, { value: 'new', extra: 1 });
});

/* Tree cleanup is ID-based ----------------------------------------------------------------------- */
const nameLookup = talents => id => talents.find(t => t._id === id)?.name;
test('detachFromTree removes only the ID, and keeps a name still carried by another member (Charm Beast shape)', () => {
  const talents = [{ _id: 'A', name: 'Charm Beast' }, { _id: 'B', name: 'Charm Beast' }, { _id: 'C', name: 'Other' }];
  const tree = { system: { talentIds: ['A', 'B', 'C'], talentNames: ['Charm Beast', 'Charm Beast', 'Other'] } };
  detachFromTree(tree, 'A', ['Charm Beast'], nameLookup(talents));
  assert.deepEqual(tree.system.talentIds, ['B', 'C']);
  assert.ok(tree.system.talentNames.includes('Charm Beast'), 'name still carried by B must survive');
});
test('detachFromTree drops the certified stale name when no other member carries it', () => {
  const talents = [{ _id: 'A', name: 'Notorious' }, { _id: 'C', name: 'Other' }];
  const tree = { system: { talentIds: ['A', 'C'], talentNames: ['Notorious (Infamy)', 'Other'] } };
  detachFromTree(tree, 'A', ['Notorious (Infamy)', 'Notorious'], nameLookup(talents));
  assert.deepEqual(tree.system.talentIds, ['C']); assert.deepEqual(tree.system.talentNames, ['Other']);
});
test('attachToTree renames via the certified old/new pair without touching a same-name other member', () => {
  const talents = [{ _id: 'A', name: 'Notorious' }, { _id: 'X', name: 'Notorious (Infamy)' }];
  const tree = { system: { talentIds: ['A', 'X'], talentNames: ['Notorious (Infamy)'] } };
  attachToTree(tree, 'A', { from: 'Notorious (Infamy)', to: 'Notorious' }, 'Notorious', nameLookup(talents));
  assert.deepEqual(tree.system.talentIds, ['A', 'X']);
  assert.ok(tree.system.talentNames.includes('Notorious (Infamy)'), 'other member X still carries the old name');
  assert.ok(tree.system.talentNames.includes('Notorious'));
});
test('attachToTree / detachFromTree are idempotent', () => {
  const talents = [{ _id: 'A', name: 'N' }];
  const tree = { system: { talentIds: [], talentNames: [] } };
  attachToTree(tree, 'A', null, 'N', nameLookup(talents)); attachToTree(tree, 'A', null, 'N', nameLookup(talents));
  assert.deepEqual(tree.system, { talentIds: ['A'], talentNames: ['N'] });
  detachFromTree(tree, 'A', ['N'], nameLookup(talents)); detachFromTree(tree, 'A', ['N'], nameLookup(talents));
  assert.deepEqual(tree.system, { talentIds: [], talentNames: [] });
});

/* Projection guards (pre-state only) ---------------------------------------------------------------- */
test('projection: baseline succeeds with the certified totals', () => {
  const p = projectPhase3C(state());
  assert.equal(p.talents.length, 1272); assert.equal(p.trees.length, 196); assert.equal(p.classes.length, 37);
}, { preOnly: true });
test('projection: unknown disposition hard-fails', () => {
  const s = state(); s.manifests[0].manifest.records[0].disposition = 'KEEP';
  assert.throws(() => projectPhase3C(s), /unknown disposition/);
}, { preOnly: true });
test('projection: disposition/ID-kind mismatch hard-fails', () => {
  const s = state(); const r = anyRecord(s, x => x.disposition === 'CREATE'); r.disposition = 'UPDATE_CONTENT';
  assert.throws(() => projectPhase3C(s), /does not match its ID kind/);
}, { preOnly: true });
test('projection: pseudo-field / non-canonical mutation field is refused, never written as data', () => {
  const s = state(); const r = anyRecord(s, x => x.identityResolution.productionRecordId);
  r.mutationFields.push('system.abilityMeta'); r.targetFields['system.abilityMeta'] = {};
  assert.throws(() => projectPhase3C(s), /outside the canonical surface/);
}, { preOnly: true });
test('projection: mutation on a protected record hard-fails', () => {
  const s = state(); const r = anyRecord(s, x => x.identityResolution.productionRecordId);
  r.identityResolution.productionRecordId = [...protectedIdsOf(s.closeout)][0];
  assert.throws(() => projectPhase3C(s), /protected record/);
}, { preOnly: true });
test('projection: generated-ID collision hard-fails', () => {
  const s = state(); const r = anyRecord(s, x => x.identityResolution.createRecordId);
  s.talents.push({ _id: r.identityResolution.createRecordId, name: 'x', system: {} });
  assert.throws(() => projectPhase3C(s), /collision|expected 1024/);
}, { preOnly: true });
test('projection: missing production record hard-fails', () => {
  const s = state(); const r = anyRecord(s, x => x.identityResolution.productionRecordId);
  const id = r.identityResolution.productionRecordId; s.talents = s.talents.filter(t => t._id !== id);
  assert.throws(() => projectPhase3C(s), /expected 1024|missing/);
}, { preOnly: true });
test('projection: CORRECT_TREE is ID based (refuses when the old tree does not claim the ID)', () => {
  const s = state(); const r = anyRecord(s, x => x.disposition === 'CORRECT_TREE');
  const old = s.trees.find(t => t._id === r.treeMutation.removeFromTreeIds[0]);
  old.system.talentIds = old.system.talentIds.filter(i => i !== r.identityResolution.productionRecordId);
  assert.throws(() => projectPhase3C(s), /does not claim/);
}, { preOnly: true });
test('projection: a class that already holds a certified addition is "already applied", not silently deduplicated', () => {
  const s = state(); const m = s.manifests.flatMap(x => x.manifest.classAccessMutations ?? [])[0];
  const cls = s.classes.find(c => c._id === m.classRecordId);
  for (const [f, v] of Object.entries(m.add)) cls.system[f.replace('system.', '')].push(v);
  assert.throws(() => projectPhase3C(s), /already holds/);
}, { preOnly: true });
test('projection: consolidation patch that would drop a member hard-fails', () => {
  const s = state(); const c = s.manifests.flatMap(x => x.manifest.treeConsolidations ?? [])[0];
  c.survivorTreePatch['system.talentIds'] = c.survivorTreePatch['system.talentIds'].slice(1);
  assert.throws(() => projectPhase3C(s), /would drop member/);
}, { preOnly: true });
test('projection: consolidation / class patches outside their allow-lists are refused', () => {
  const a = state(); a.manifests.flatMap(x => x.manifest.treeConsolidations ?? [])[0].survivorTreePatch['system.tags'] = [];
  assert.throws(() => projectPhase3C(a), /patch field not allowed/);
  const b = state(); b.manifests.flatMap(x => x.manifest.classAccessMutations ?? [])[0].add['system.hitDie'] = 'x';
  assert.throws(() => projectPhase3C(b), /class access field not allowed/);
}, { preOnly: true });

/* Verifier catches corruption of the certified post-state -------------------------------------------- */
const postFixture = () => {
  const s = state(); const p = projectPhase3C(s); const texts = loadPackTexts();
  const report = { fingerprints: computeCertifiedFingerprints({ manifests: s.manifests, closeout: s.closeout, before: { talents: s.talents, trees: s.trees, classes: s.classes } }) };
  return { s, p, report, args: { manifests: s.manifests, closeout: s.closeout, report, talents: structuredClone(p.talents), trees: structuredClone(p.trees), classes: structuredClone(p.classes) } };
};
const failedIds = results => results.filter(r => !r.ok).map(r => r.id);
test('verifyPostState passes on the projected state and rejects targeted corruption', () => {
  const f = postFixture();
  assert.deepEqual(failedIds(verifyPostState(f.args)), []);
  const cases = [
    ['protected', a => { a.talents.find(t => t._id === [...protectedIdsOf(f.s.closeout)][3])._x = 1; }, 'protected 92'],
    ['preserved surface', a => { const id = f.s.manifests[0].manifest.records.find(r => r.identityResolution.productionRecordId).identityResolution.productionRecordId; a.talents.find(t => t._id === id).system.tags = ['x']; }, 'preserved surface'],
    ['missing canonical', a => { a.talents = a.talents.filter(t => t._id !== 'c919d7682bd9df40'); }, 'talents: 1272'],
    ['Charm Beast merged', a => { for (const t of a.trees) t.system.talentIds = t.system.talentIds.filter(i => i !== 'c919d7682bd9df40'); a.trees.find(t => t.system.talentIds.includes('bab9a1ce285f98b9')).system.talentIds.push('c919d7682bd9df40'); }, 'Charm Beast'],
    ['obsolete tree resurrected', a => { a.trees.push({ _id: 'db1b30c2163d0650', name: 'Genohardan', system: { talentIds: [], talentNames: [] } }); }, 'GenoHaradan'],
    ['duplicate class entry', a => { a.classes.find(c => c._id === 'c4dbedcf989cb6b2').system.talent_trees.push('3b30dd12884bb2e4'); }, 'classes: 5'],
    ['unapproved same-name pair', a => { const tree = a.trees.find(t => t._id === '67fdd8dce9abd6c1'); const dup = structuredClone(a.talents.find(t => t._id === tree.system.talentIds[0])); dup._id = 'ffffffffffffffff'; a.talents.push(dup); tree.system.talentIds.push(dup._id); }, 'trees: no duplicate IDs'],
    ['stale tree name', a => { a.trees.find(t => t._id === '67fdd8dce9abd6c1').system.talentNames.push('Ghost'); }, 'names array']
  ];
  for (const [label, mutate, fragment] of cases) {
    const a = { ...f.args, talents: structuredClone(f.args.talents), trees: structuredClone(f.args.trees), classes: structuredClone(f.args.classes) };
    mutate(a);
    assert.ok(failedIds(verifyPostState(a)).some(id => id.includes(fragment)), `verifier missed: ${label}`);
  }
}, { preOnly: true });
test('the two certified protected review-extra duplicate names are tolerated by verifyPostState, exactly those two', () => {
  const f = postFixture();
  const res = verifyPostState(f.args).find(r => r.id.startsWith('trees: no duplicate IDs'));
  assert.ok(res.ok); assert.match(res.detail, /2 protected review-extra duplicate names tolerated/);
}, { preOnly: true });
test('serializeProjection keeps untouched pack lines byte-for-byte', () => {
  const f = postFixture(); const texts = loadPackTexts(); const out = serializeProjection(f.p, texts);
  const orig = new Set(texts.talents.split('\n')); let kept = 0;
  for (const line of out.talents.split('\n')) if (orig.has(line)) kept++;
  assert.ok(kept >= 1024 - 932 - 1, 'untouched lines must be preserved verbatim');
  assert.ok(out.talents.endsWith('\n') && !out.talents.endsWith('\n\n'));
}, { preOnly: true });

console.log(`\n${passed} passed, ${skipped} skipped (talent-phase-3c applicator hardening)`);
