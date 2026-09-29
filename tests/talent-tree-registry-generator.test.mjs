import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPackState, loadCommittedManifests, projectPhase3C, CLOSEOUT_PATH } from '../tools/apply-talent-phase-3c.mjs';
import { buildTalentTreeRegistry, obsoleteTreeNamesFromManifests, serializeRegistry, registrySlug } from '../tools/build-talent-tree-registry.mjs';

// tools/build-talent-tree-registry.mjs: completeness, same-name handling, legacy passthrough, determinism, idempotence.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readPack = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const onDisk = { talents: readPack('packs/talents.db'), trees: readPack('packs/talent_trees.db'), classes: readPack('packs/classes.db') };
const manifests = loadCommittedManifests();
const pre = detectPackState().state === 'PRE_STATE';
const projected = pre ? projectPhase3C({ manifests, closeout: readJson(CLOSEOUT_PATH), ...onDisk }) : onDisk;
const previousRegistry = readJson('data/generated/talent-trees.registry.json');
const obsoleteTreeNames = obsoleteTreeNamesFromManifests(manifests);
const build = (over = {}) => buildTalentTreeRegistry({ ...projected, previousRegistry, obsoleteTreeNames, ...over });
const registry = build();
const bySource = new Map(registry.filter(e => e.sourceId).map(e => [e.sourceId, e]));
const names = ids => ids.map(id => projected.talents.find(t => t._id === id).name);

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('one entry per production tree; membership, names, count and order equal the pack', () => {
  assert.equal(bySource.size, projected.trees.length);
  for (const t of projected.trees) {
    const e = bySource.get(t._id);
    assert.deepEqual(e.talentIds, t.system.talentIds); assert.deepEqual(e.talents, names(t.system.talentIds));
    assert.equal(e.talentCount, e.talents.length); assert.equal(e.displayName, t.name);
  }
});
test('all 7 certified new trees are represented with their exact members', () => {
  const created = manifests.flatMap(m => m.manifest.treeCreates ?? []);
  assert.equal(created.length, 7);
  for (const tc of created) assert.deepEqual([...bySource.get(tc.createTreeId).talentIds].sort(), [...tc.createTemplate.system.talentIds].sort());
});
test('GenoHaradan is one consolidated entry with 4 members; no Genohardan/Genoharadan fragments remain', () => {
  const geno = registry.filter(e => /geno/.test(e.id));
  assert.equal(geno.length, 1); assert.equal(geno[0].displayName, 'GenoHaradan'); assert.equal(geno[0].talentCount, 4);
  assert.ok(!bySource.has('db1b30c2163d0650'));
  assert.ok(!registry.some(e => e.id === 'genohardan'));
});
test('Core and JATM Charm Beast are separate entries addressed by ID', () => {
  const core = bySource.get('ad16f3e5f4f7441b'), jatm = bySource.get('ed899f9f41fc1391');
  assert.ok(core.talentIds.includes('c919d7682bd9df40') && !core.talentIds.includes('bab9a1ce285f98b9'));
  assert.ok(jatm.talentIds.includes('bab9a1ce285f98b9') && !jatm.talentIds.includes('c919d7682bd9df40'));
  assert.equal(core.talents.filter(x => x === 'Charm Beast').length, 1); assert.equal(jatm.talents.filter(x => x === 'Charm Beast').length, 1);
});
test('same-name trees (Squad Leader x2) get distinct, sourceId-based ids; unique names keep the plain slug', () => {
  const a = bySource.get('781feba15dc9e42f'), b = bySource.get('3b30dd12884bb2e4');
  assert.notEqual(a.id, b.id); assert.match(a.id, /^squad-leader-/); assert.match(b.id, /^squad-leader-/);
  assert.equal(bySource.get('ad16f3e5f4f7441b').id, 'dathomiri-witch');
  assert.equal(new Set(registry.map(e => e.id)).size, registry.length);
});
test('classAccess reflects the class pack including the 5 certified mutations', () => {
  const access = id => bySource.get(id).classAccess;
  assert.ok(access('3b30dd12884bb2e4').includes('Elite Trooper'));
  assert.ok(access('8633ecbf7151fbb6').includes('Martial Arts Master') && access('10738666e7ddcd1f').includes('Martial Arts Master'));
  assert.ok(access('7ab8bd7bce901f85').includes('Noble') && access('0c4ddea3c78ffc3d').includes('Scout'));
  assert.ok(access('da7b731a3e434a7a').includes('Assassin'));
});
test('legacy alias entries (no sourceId) are passed through verbatim; nothing else is', () => {
  const legacyBefore = previousRegistry.filter(e => !e.sourceId && !projected.trees.some(t => registrySlug(t.name) === e.id) && e.id !== 'genohardan');
  const legacyAfter = registry.filter(e => !e.sourceId);
  assert.ok(legacyAfter.length >= 5 && legacyAfter.some(e => e.id === 'soldier') && legacyAfter.some(e => e.id === 'jedi'));
  for (const e of legacyAfter) assert.deepEqual(e, previousRegistry.find(x => x.id === e.id));
  assert.equal(legacyAfter.length, legacyBefore.length);
});
test('output is independent of input tree order (deterministic)', () => {
  const shuffled = build({ trees: [...projected.trees].reverse() });
  assert.equal(serializeRegistry(shuffled), serializeRegistry(registry));
});
test('idempotent: regenerating from its own output changes nothing', () => {
  assert.equal(serializeRegistry(build({ previousRegistry: registry })), serializeRegistry(registry));
  assert.equal(serializeRegistry(build({ previousRegistry: build({ previousRegistry: registry }) })), serializeRegistry(registry));
});
test('a tree that disappears from the packs disappears from the registry (generated entries are never carried over)', () => {
  const reduced = build({ previousRegistry: registry, trees: projected.trees.filter(t => t._id !== '3b30dd12884bb2e4') });
  assert.ok(!reduced.some(e => e.sourceId === '3b30dd12884bb2e4'));
});
test('a tree referencing a missing talent fails loudly', () => {
  const trees = structuredClone(projected.trees); trees[0].system.talentIds.push('9999999999999999');
  assert.throws(() => build({ trees }), /references missing talent/);
});

console.log(`\n${n} registry generator checks passed`);
