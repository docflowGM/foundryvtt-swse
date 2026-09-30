import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { runtimeId, assignRuntimeIds, projectNormalization, reverseNormalization } from '../tools/census-talent-tree-identity.mjs';

// Phase 3F-2: the persistent-vs-runtime tree identity contract, executed against the REAL runtime modules
// (TalentTreeDB, ClassesDB, normalizeTalent) and the real packs, before AND after the normalization projection.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readPack = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const census = readJson('data/audits/talent-phase-3f-tree-identity-census.json');
const packs = { talents: readPack('packs/talents.db'), trees: readPack('packs/talent_trees.db'), classes: readPack('packs/classes.db') };
const applied = packs.trees.every(t => !census.driftTrees.some(d => d.treeId === t._id && t.name === d.currentName)); // packs already normalized?
// The test always exercises BOTH states: `before0` is the pre-normalization packs (reconstructed from the frozen census once 3F is applied).
const before0 = applied ? reverseNormalization({ trees: packs.trees, talents: packs.talents }, census) : { trees: packs.trees, talents: packs.talents };

const say = console.log.bind(console);
for (const level of ['log', 'info', 'debug', 'warn', 'error']) console[level] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = v => JSON.parse(JSON.stringify(v)); globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));
globalThis.performance = globalThis.performance ?? { now: () => Date.now() };
globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('no registry in this test'); } });
const makePack = (key, docs) => ({ collection: key, metadata: { id: key, type: 'Item' }, getDocuments: async () => docs, getIndex: async () => docs.map(d => ({ _id: d._id, name: d.name, type: d.type, system: d.system, img: d.img })), index: new Map(docs.map(d => [d._id, d])) });
globalThis.game.system = { id: 'foundryvtt-swse' };
const load = async ({ talents, trees, classes }) => {
  globalThis.game.packs = new Map([['foundryvtt-swse.talents', makePack('foundryvtt-swse.talents', talents)], ['foundryvtt-swse.talent_trees', makePack('foundryvtt-swse.talent_trees', trees)], ['foundryvtt-swse.classes', makePack('foundryvtt-swse.classes', classes)]]);
  const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js'); await TalentTreeDB.build();
  const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js'); await ClassesDB.build(TalentTreeDB);
  return { TalentTreeDB, ClassesDB };
};
const { normalizeTalent } = await import('/systems/foundryvtt-swse/scripts/data/talent-normalizer.js');
const { normalizeTalentTreeId } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js');

let n = 0; const test = async (name, fn) => { await fn(); n++; say('  ok  ' + name); };
// TalentTreeDB / ClassesDB are singletons: every state is exercised in sequence and snapshotted before the next build.
const snap = ({ TalentTreeDB: db, ClassesDB: cdb }) => ({
  trees: new Map([...db.trees.values()].map(t => [t.sourceId, { id: t.id, name: t.name, talentIds: [...(t.talentIds ?? [])] }])),
  classes: new Map([...cdb.classes.values()].map(c => [c.name, { sourceIds: [...(c.talentTreeSourceIds ?? [])], access: (c.talentTreeIds ?? []).map(id => db.byId(id)?.sourceId ?? `MISSING:${id}`).sort() }])),
  audit: { sameName: db.lastBuildAudit.sameNameTrees.length, dupIds: db.lastBuildAudit.duplicateIds.length, size: db.trees.size },
  squad: { cw: db.bySourceId('781feba15dc9e42f')?.id, gaw: db.bySourceId('3b30dd12884bb2e4')?.id }
});
const ownerOf = new Map(); for (const t of packs.trees) for (const id of t.system.talentIds) ownerOf.set(id, t._id);

const cur = await load({ ...before0, classes: packs.classes });
const before = snap(cur);
await test('the census copy of normalizeTalentTreeId is identical to the runtime function', () => {
  for (const s of ['Lightsaber Forms', "Jedi's Path", '1stdegree Droid', 'Aing-Tii Monk', 'Warden of the Sky', '']) assert.equal(runtimeId(s), normalizeTalentTreeId(s), s);
});
await test('contract: every tree resolves to the SAME runtime tree by sourceId, runtime id, stable key and get(sourceId)', () => {
  const db = cur.TalentTreeDB;
  assert.equal(db.trees.size, before0.trees.length);
  for (const t of before0.trees) {
    const rt = db.bySourceId(t._id);
    assert.ok(rt, `no runtime tree for ${t.name}`);
    assert.equal(rt.sourceId, t._id); assert.equal(db.byId(rt.id), rt); assert.equal(db.get(rt.id), rt); assert.equal(db.get(t._id), rt);
    const key = [...db._byKey.entries()].find(([, v]) => v === rt)?.[0]; assert.ok(key, `no stable key for ${t.name}`); assert.equal(db.byKey(key), rt);
  }
  assert.deepEqual(Object.fromEntries(assignRuntimeIds(before0.trees)), Object.fromEntries(before0.trees.map(t => [t._id, db.bySourceId(t._id).id])), 'the census runtime-id model must match TalentTreeDB');
});
await test('persistent talent system.treeId = tree _id resolves to the RUNTIME id through normalizeTalent (source-ID hardening), even when the inverse index does not know the talent', () => {
  const db = cur.TalentTreeDB;
  for (const t of before0.trees) {
    const probe = { _id: 'zzprobe' + t._id, name: 'Unindexed Probe ' + t._id, system: { treeId: t._id } };
    assert.equal(normalizeTalent(probe, db).treeId, db.bySourceId(t._id).id, t.name);
  }
  const any = [...db.trees.values()][0];
  assert.equal(normalizeTalent({ _id: 'zz1', name: 'Unindexed A', system: { treeId: any.id } }, db).treeId, any.id, 'a runtime id is still accepted');
  assert.equal(normalizeTalent({ _id: 'zz2', name: 'Unindexed B', system: { treeId: 'not-a-tree' } }, db).treeId, null, 'an unknown value never invents authority');
});
await test('every production talent resolves to the tree that contains it (current packs)', () => {
  for (const talent of before0.talents) { const tree = ownerOf.get(talent._id); if (tree) assert.equal(normalizeTalent(talent, cur.TalentTreeDB).treeId, cur.TalentTreeDB.bySourceId(tree).id, talent.name); }
});

const after = projectNormalization(before0, census);
if (applied) { assert.deepEqual(after.trees, packs.trees); assert.deepEqual(after.talents, packs.talents); }
const fut = await load({ ...after, classes: packs.classes });
const afterSnap = snap(fut);
await test('projected packs: every production talent still resolves to its containing tree', () => {
  for (const talent of after.talents) { const tree = ownerOf.get(talent._id); if (tree) assert.equal(normalizeTalent(talent, fut.TalentTreeDB).treeId, fut.TalentTreeDB.bySourceId(tree).id, talent.name); }
});
await test('same-name trees stay distinct (Squad Leader x2) by sourceId, before and after the normalization', () => {
  for (const x of [before, afterSnap]) { assert.ok(x.squad.cw && x.squad.gaw && x.squad.cw !== x.squad.gaw); assert.equal(x.audit.dupIds, 0); assert.equal(x.audit.sameName, 1); }
});
await test('the normalization changes NO tree identity: same sourceIds, same membership, same tree count; runtime ids change only for the certified six', () => {
  assert.equal(afterSnap.audit.size, before.audit.size);
  const changing = new Set(census.driftTrees.filter(d => d.runtimeIdChanges).map(d => d.treeId));
  assert.equal(changing.size, 6);
  for (const [sid, x] of before.trees) { const y = afterSnap.trees.get(sid); assert.ok(y, sid); assert.deepEqual(y.talentIds, x.talentIds); assert.equal(y.id !== x.id, changing.has(sid), `${x.name}: ${x.id} -> ${y.id}`); }
});
await test('class -> tree access resolves to the SAME trees (by sourceId) before and after; no class stores a runtime id the normalization changes', () => {
  assert.equal(afterSnap.classes.size, before.classes.size);
  for (const [name, c] of before.classes) {
    const f = afterSnap.classes.get(name);
    assert.deepEqual(f.sourceIds, c.sourceIds, name); assert.deepEqual(f.access, c.access, `${name}: class tree access changed`);
    assert.ok(!c.access.some(x => x.startsWith('MISSING')), name);
  }
  const changingRuntimeIds = new Set(census.driftTrees.filter(d => d.runtimeIdChanges).map(d => d.runtimeIdBefore));
  for (const cls of packs.classes) for (const id of cls.system.talentTreeIds ?? []) assert.ok(!changingRuntimeIds.has(id), `${cls.name} stores runtime id ${id}`);
});
const { getForceTalentTreeAccessKeys } = await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js');
const aingTii = 'f8e7edab5f234e27';
const aingKeys = () => getForceTalentTreeAccessKeys({ system: { forceTradition: 'Aing Tii Monks' }, items: [] }, { includeGeneric: false, includeTraditions: true });
const norm = v => String(v).toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const aingAfter = aingKeys().map(norm);
await load({ ...before0, classes: packs.classes });
const aingBefore = aingKeys().map(norm);
await test('REGRESSION (Aing-Tii Monk): the `aing-tii-monk` Force-tradition access rule did NOT resolve the tree under the old name "Aingtii Monk" and DOES after the rename', () => {
  assert.ok(!aingBefore.includes(aingTii) && !aingBefore.includes('aing-tii-monk'), 'before: the rule key must not match the misspelled tree');
  assert.ok(aingAfter.includes(aingTii), 'after: the tree sourceId is granted');
  assert.ok(aingAfter.includes('aing-tii-monk'), 'after: the tree id/name matches the rule key');
});
await test('the projection makes every stale system.treeId the tree _id and every display name the canonical name', () => {
  for (const r of census.staleTalentReferences) assert.equal(after.talents.find(t => t._id === r.talentId).system.treeId, r.authoritativeTreeId);
  for (const d of census.driftTrees) assert.equal(after.trees.find(t => t._id === d.treeId).name, d.canonicalName);
  assert.equal(after.talents.length, packs.talents.length);
});
console.log = say; say(`\n${n} talent-phase-3f tree identity checks passed${applied ? ' (packs already normalized)' : ''}`);
