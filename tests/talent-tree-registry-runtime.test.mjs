import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { detectPackState, loadCommittedManifests, projectPhase3C, CLOSEOUT_PATH } from '../tools/apply-talent-phase-3c.mjs';
import { buildTalentTreeRegistry, obsoleteTreeNamesFromManifests, serializeRegistry } from '../tools/build-talent-tree-registry.mjs';

// Runtime consumers of the generated talent-tree registry, executed for real against the Phase 3C projected state:
// TalentTreeDB (membership hints) and TalentTreeMembershipAuthority (registry lookup). Proves that same-name trees
// (Squad Leader) and same-name talents (Core/JATM Charm Beast) resolve to their own members.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readPack = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const onDisk = { talents: readPack('packs/talents.db'), trees: readPack('packs/talent_trees.db'), classes: readPack('packs/classes.db') };
const manifests = loadCommittedManifests();
const projected = detectPackState().state === 'PRE_STATE'
  ? projectPhase3C({ manifests, closeout: readJson(CLOSEOUT_PATH), ...onDisk })
  : onDisk;
const registry = detectPackState().state === 'PRE_STATE'
  ? buildTalentTreeRegistry({ ...projected, previousRegistry: readJson('data/generated/talent-trees.registry.json'), obsoleteTreeNames: obsoleteTreeNamesFromManifests(manifests) })
  : readJson('data/generated/talent-trees.registry.json');

// The production modules are chatty (audit dumps); keep this test's own output readable.
const say = console.log.bind(console);
for (const level of ['log', 'info', 'debug', 'warn', 'error']) console[level] = () => {};

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = v => JSON.parse(JSON.stringify(v));
globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));
globalThis.performance = globalThis.performance ?? { now: () => Date.now() };
globalThis.fetch = async url => {
  const u = String(url);
  if (u.endsWith('/data/generated/talent-trees.registry.json')) return { ok: true, json: async () => JSON.parse(JSON.stringify(registry)), clone() { return this; } };
  return { ok: false, json: async () => { throw new Error('not found: ' + u); } };
};

function makePack(packKey, docs) {
  const byId = new Map(docs.map(d => [d._id, d]));
  const hydrate = doc => ({ ...doc, uuid: `Compendium.${packKey}.Item.${doc._id}`, pack: packKey, toObject: () => JSON.parse(JSON.stringify(doc)) });
  return {
    collection: packKey, metadata: { id: packKey, type: 'Item' },
    getDocuments: async () => docs.map(hydrate),
    getDocument: async id => (byId.has(id) ? hydrate(byId.get(id)) : null),
    getIndex: async () => docs.map(d => ({ _id: d._id, name: d.name, type: d.type, system: d.system, img: d.img })),
    index: new Map(docs.map(d => [d._id, { _id: d._id, name: d.name, type: d.type }]))
  };
}
globalThis.game.system = { id: 'foundryvtt-swse' };
globalThis.game.packs = new Map([
  ['foundryvtt-swse.talents', makePack('foundryvtt-swse.talents', projected.talents)],
  ['foundryvtt-swse.talent_trees', makePack('foundryvtt-swse.talent_trees', projected.trees)],
  ['foundryvtt-swse.classes', makePack('foundryvtt-swse.classes', projected.classes)]
]);

const { TalentRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/talent-registry.js');
await TalentRegistry.initialize();
const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
await TalentTreeDB.build();
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
await ClassesDB.build(TalentTreeDB);
const { getTalentMembership, clearCache } = await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-tree-membership-authority.js');
clearCache();

let n = 0;
const test = async (name, fn) => { await fn(); n++; say('  ok  ' + name); };
const treeDoc = id => projected.trees.find(t => t._id === id);
const runtimeTree = id => [...TalentTreeDB.trees.values()].find(t => t.sourceId === id);
const membershipOf = async id => {
  const t = treeDoc(id);
  return getTalentMembership({ id: t.name.toLowerCase().replace(/\W+/g, '_'), sourceId: t._id, name: t.name, talentIds: t.system.talentIds, talentNames: t.system.talentNames, system: t.system });
};

await test('Core Dathomiri Witch resolves the Core Charm Beast ID; JATM Beastwarden resolves the JATM ID (never each other)', async () => {
  const core = await membershipOf('ad16f3e5f4f7441b'), jatm = await membershipOf('ed899f9f41fc1391');
  assert.ok(core.some(t => (t.id ?? t._id) === 'c919d7682bd9df40'), 'Core Charm Beast missing from Dathomiri Witch');
  assert.ok(!core.some(t => (t.id ?? t._id) === 'bab9a1ce285f98b9'), 'JATM Charm Beast leaked into Dathomiri Witch');
  assert.ok(jatm.some(t => (t.id ?? t._id) === 'bab9a1ce285f98b9'), 'JATM Charm Beast missing from Beastwarden');
  assert.ok(!jatm.some(t => (t.id ?? t._id) === 'c919d7682bd9df40'), 'Core Charm Beast leaked into Beastwarden');
});
await test('the two Squad Leader trees (Clone Wars / Galaxy at War) each resolve their own members', async () => {
  const cw = await membershipOf('781feba15dc9e42f'), gaw = await membershipOf('3b30dd12884bb2e4');
  const ids = list => new Set(list.map(t => t.id ?? t._id));
  for (const id of treeDoc('781feba15dc9e42f').system.talentIds) assert.ok(ids(cw).has(id), 'CW Squad Leader lost member ' + id);
  for (const id of treeDoc('3b30dd12884bb2e4').system.talentIds) assert.ok(ids(gaw).has(id), 'GaW Squad Leader lost member ' + id);
  for (const id of treeDoc('3b30dd12884bb2e4').system.talentIds) assert.ok(!ids(cw).has(id), 'GaW member leaked into CW Squad Leader');
});
await test('TalentTreeDB keeps BOTH Squad Leader trees (no overwrite, no load-audit failure) and applies each its own registry hint', () => {
  assert.equal(TalentTreeDB.trees.size, projected.trees.length, 'a same-name tree was overwritten in TalentTreeDB');
  assert.equal(TalentTreeDB.lastBuildAudit.duplicateIds.length, 0);
  assert.equal(TalentTreeDB.lastBuildAudit.duplicateStableKeys.length, 0);
  assert.equal(TalentTreeDB.lastBuildAudit.sameNameTrees.length, 1);
  const cw = runtimeTree('781feba15dc9e42f'), gaw = runtimeTree('3b30dd12884bb2e4');
  assert.ok(cw && gaw && cw.id !== gaw.id, 'both Squad Leader trees must be addressable');
  assert.equal(TalentTreeDB.get('squad_leader')?.sourceId, '781feba15dc9e42f', 'the established Clone Wars tree keeps the name-derived id');
  for (const t of [cw, gaw]) {
    const own = treeDoc(t.sourceId);
    assert.deepEqual([...t.talentNames].sort(), own.system.talentIds.map(id => projected.talents.find(x => x._id === id).name).sort());
  }
});
await test('class access resolves the intended Squad Leader tree ID (Soldier -> Clone Wars, Elite Trooper -> Galaxy at War)', () => {
  const cwRuntime = runtimeTree('781feba15dc9e42f'), gawRuntime = runtimeTree('3b30dd12884bb2e4');
  const soldier = [...ClassesDB.classes.values()].find(c => c.name === 'Soldier');
  const elite = [...ClassesDB.classes.values()].find(c => c.name === 'Elite Trooper');
  assert.ok(soldier.talentTreeSourceIds.includes('781feba15dc9e42f') && !soldier.talentTreeSourceIds.includes('3b30dd12884bb2e4'));
  assert.ok(elite.talentTreeSourceIds.includes('3b30dd12884bb2e4') && !elite.talentTreeSourceIds.includes('781feba15dc9e42f'));
  // ClassesDB derives talentTreeIds from talentTreeSourceIds (bySourceId), not from the slug stored in the pack.
  assert.ok(soldier.talentTreeIds.includes(cwRuntime.id) && !soldier.talentTreeIds.includes(gawRuntime.id));
  assert.ok(elite.talentTreeIds.includes(gawRuntime.id) && !elite.talentTreeIds.includes(cwRuntime.id));
  assert.notEqual(cwRuntime.id, gawRuntime.id);
  // and the registry agrees
  const byId = new Map(registry.filter(e => e.sourceId).map(e => [e.sourceId, e]));
  assert.ok(byId.get('781feba15dc9e42f').classAccess.includes('Soldier') && !byId.get('781feba15dc9e42f').classAccess.includes('Elite Trooper'));
  assert.ok(byId.get('3b30dd12884bb2e4').classAccess.includes('Elite Trooper') && !byId.get('3b30dd12884bb2e4').classAccess.includes('Soldier'));
});
await test('both Squad Leader identities stay addressable by tree id, sourceId and registry entry after a rebuild', async () => {
  await TalentTreeDB.build();
  assert.equal(TalentTreeDB.bySourceId('781feba15dc9e42f').sourceId, '781feba15dc9e42f');
  assert.equal(TalentTreeDB.bySourceId('3b30dd12884bb2e4').sourceId, '3b30dd12884bb2e4');
  assert.equal(TalentTreeDB.trees.size, projected.trees.length);
  assert.equal(new Set(registry.filter(e => e.sourceId).map(e => e.id)).size, projected.trees.length, 'registry entry ids must be unique');
});
await test('consolidated GenoHaradan tree exposes all four members through the runtime; the obsolete tree is gone', async () => {
  const members = await membershipOf('da7b731a3e434a7a');
  assert.equal(new Set(members.map(t => t.id ?? t._id)).size, 4);
  assert.equal(runtimeTree('db1b30c2163d0650'), undefined);
});
await test('every new certified tree resolves all of its members at runtime', async () => {
  for (const tc of manifests.flatMap(m => m.manifest.treeCreates ?? [])) {
    const members = await membershipOf(tc.createTreeId);
    assert.deepEqual([...new Set(members.map(t => t.id ?? t._id))].sort(), [...tc.createTemplate.system.talentIds].sort(), tc.canonicalTreeKey);
  }
});
await test('generated registry is deterministic: regenerating from the same inputs is byte-identical', () => {
  const again = buildTalentTreeRegistry({ ...projected, previousRegistry: registry, obsoleteTreeNames: obsoleteTreeNamesFromManifests(manifests) });
  assert.equal(serializeRegistry(again), serializeRegistry(registry));
});

say(`\n${n} runtime registry checks passed`);
