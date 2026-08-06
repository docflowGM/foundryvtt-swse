import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Krath talent-tree hydration regression guard.
//
// The Krath tree (Knights of the Old Republic Campaign Guide pp. 59-60, tree id
// d29a7261c1be4b83) shipped with a single dangling talent id and no talent
// documents. An earlier pass removed the dangling id and recorded a content
// gap, which made the audit green but left the tree empty. This test locks in
// the canonical repair: all four talents exist as real compendium documents
// with correct source/page metadata, tree membership agrees on both sides, and
// nothing synthetic or uuid-less is left behind.
//
// Coverage tier: (a) direct production-path — the real TalentRegistry and
// TalentTreeMembershipAuthority are executed against the real packs.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TREE_ID = 'd29a7261c1be4b83';
const TREE_NAME = 'Krath';
const SOURCE = 'Knights of the Old Republic Campaign Guide';

const KRATH = Object.freeze({
  eaaecdfd7a538975: { name: 'Dark Side Manipulation', page: 59, prerequisites: '' },
  '90820963f87dd268': { name: 'Krath Illusions', page: 60, prerequisites: 'Illusion' },
  ed0304eebd82042b: { name: 'Krath Intuition', page: 60, prerequisites: '' },
  ca30265867f3dcb1: { name: 'Krath Surge', page: 60, prerequisites: '' },
});

function readPack(name) {
  return fs.readFileSync(path.join(ROOT, 'packs', name), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const talentDocs = readPack('talents.db');
const treeDocs = readPack('talent_trees.db');
const talentsById = new Map(talentDocs.map(doc => [doc._id, doc]));
const krathTree = treeDocs.find(doc => doc._id === TREE_ID);

/* ------------------------------------------------------------------ *
 * 1. Exactly four canonical talent documents, and the tree claims them.
 * ------------------------------------------------------------------ */
{
  assert.ok(krathTree, 'the Krath talent-tree document is missing');
  assert.equal(krathTree.name, TREE_NAME);
  assert.equal(
    krathTree.system.contentGap,
    undefined,
    'the Krath content gap must be resolved by hydration, not still recorded'
  );
  assert.deepEqual(
    [...new Set(krathTree.system.talentIds)].sort(),
    Object.keys(KRATH).sort(),
    'the Krath tree does not claim exactly its four canonical talents'
  );
  assert.equal(krathTree.system.talentIds.length, 4, 'the Krath tree has duplicate talent ids');
  assert.deepEqual(
    [...krathTree.system.talentNames].sort(),
    Object.values(KRATH).map(t => t.name).sort()
  );
  assert.equal(krathTree.system.source, SOURCE);
  assert.equal(krathTree.system.page, 59);
}

/* ------------------------------------------------------------------ *
 * 2. Every Krath tree reference resolves to a real document.
 * ------------------------------------------------------------------ */
{
  for (const id of krathTree.system.talentIds) {
    assert.ok(talentsById.has(id), `the Krath tree claims ${id}, which has no compendium document`);
  }
  // The removed phantom id must not come back: 8793a955bce166d2 is the legacy
  // compendium id of the Alter talent "Illusion" (data/audit/talent_audit_master.json
  // and three core.sourceId flags in packs/heroic.db), not a Krath talent. It is
  // the prerequisite of Krath Illusions, which is how it ended up here.
  assert.ok(
    !krathTree.system.talentIds.includes('8793a955bce166d2'),
    'the Krath tree claims Illusion\'s legacy id again'
  );
}

/* ------------------------------------------------------------------ *
 * 3. Each document claims the Krath tree, with correct source/page,
 *    prerequisites, real rules text, and no synthetic markers.
 * ------------------------------------------------------------------ */
{
  for (const [id, expected] of Object.entries(KRATH)) {
    const doc = talentsById.get(id);
    assert.ok(doc, `Krath talent ${expected.name} (${id}) was not hydrated`);
    assert.equal(doc.name, expected.name);
    assert.equal(doc.type, 'talent');
    assert.equal(doc.system.treeId, TREE_ID, `${expected.name} does not claim the Krath tree by id`);
    assert.equal(doc.system.talent_tree, TREE_NAME, `${expected.name} does not claim the Krath tree by name`);
    assert.equal(doc.system.source, SOURCE, `${expected.name} has the wrong source book`);
    assert.equal(doc.system.page, expected.page, `${expected.name} has the wrong printed page`);
    assert.equal(doc.system.prerequisites, expected.prerequisites);
    assert.ok(String(doc.system.benefit || '').length > 40, `${expected.name} has no benefit text`);
    assert.equal(doc.system.description?.value, doc.system.benefit);
    assert.ok(doc.system.tags.includes(`tree_${TREE_ID}`));
    assert.ok(doc.system.tags.includes('krath'));

    // Context-dependent mechanics must not be modelled as passive static bonuses.
    assert.equal(doc.system.executionModel, 'ACTIVE', `${expected.name} is marked passive`);
    assert.deepEqual(doc.system.abilityMeta.modifiers, [], `${expected.name} applies a static modifier`);
    assert.equal(doc.system.abilityMeta.staticSheetPolicy, 'exclude');
    assert.equal(doc.system.abilityMeta.manualResolution, true);

    // Nothing synthetic: real ids, no uuid:null placeholder fields.
    assert.match(id, /^[0-9a-f]{16}$/);
    assert.ok(!('uuid' in doc), `${expected.name} carries a placeholder uuid field`);
  }

  // Krath Illusions is the only one with a prerequisite, and that prerequisite
  // resolves to a real talent document.
  assert.ok(
    talentDocs.some(doc => doc.name === 'Illusion'),
    'Krath Illusions requires Illusion, which has no compendium document'
  );

  // The once-per-encounter talents declare their limit rather than implying it.
  for (const id of ['eaaecdfd7a538975', 'ed0304eebd82042b', 'ca30265867f3dcb1']) {
    assert.equal(talentsById.get(id).system.abilityMeta.usesPerEncounter, 1);
  }

  // Krath Surge's benefit is a choice made per use, and it applies the
  // [Dark Side] descriptor to that use only.
  const surge = talentsById.get('ca30265867f3dcb1');
  assert.equal(surge.system.activationChoiceMeta.resolution, 'on_use');
  assert.deepEqual(surge.system.activationChoiceMeta.options.map(o => o.id), ['damage', 'range']);
  assert.match(surge.system.benefit, /\[Dark Side\] descriptor/);
}

/* ------------------------------------------------------------------ *
 * 4. Both talent-tree registries report the tree identically.
 * ------------------------------------------------------------------ */
{
  const expectedNames = Object.values(KRATH).map(t => t.name).sort();
  for (const rel of ['data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json']) {
    const entry = readJson(rel).find(e => e.id === 'krath');
    assert.ok(entry, `${rel} has no Krath entry`);
    assert.equal(entry.displayName, TREE_NAME);
    assert.equal(entry.talentCount, 4);
    assert.deepEqual([...entry.talents].sort(), expectedNames);
  }
}

/* ------------------------------------------------------------------ *
 * 5. No synthetic or uuid-less Krath entry exists in the live registry,
 *    and the Krath NPCs' tradition reference resolves to the tree.
 * ------------------------------------------------------------------ */
registerFoundryPathLoader();
installFoundryShimGlobals();

globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (value) => JSON.parse(JSON.stringify(value));
globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));

function makePack(packKey, docs) {
  const byId = new Map(docs.map(doc => [doc._id, doc]));
  const hydrate = (doc) => ({
    ...doc,
    uuid: `Compendium.${packKey}.Item.${doc._id}`,
    pack: packKey,
    toObject: () => JSON.parse(JSON.stringify(doc)),
  });
  return {
    collection: packKey,
    metadata: { id: packKey, type: 'Item' },
    getDocuments: async () => docs.map(hydrate),
    getDocument: async (id) => (byId.has(id) ? hydrate(byId.get(id)) : null),
    getIndex: async () => docs.map(doc => ({ _id: doc._id, name: doc.name, type: doc.type })),
    index: new Map(docs.map(doc => [doc._id, { _id: doc._id, name: doc.name, type: doc.type }])),
  };
}

globalThis.game.system = { id: 'foundryvtt-swse' };
globalThis.game.packs = new Map([
  ['foundryvtt-swse.talents', makePack('foundryvtt-swse.talents', talentDocs)],
  ['foundryvtt-swse.talent_trees', makePack('foundryvtt-swse.talent_trees', treeDocs)],
]);
globalThis.performance = globalThis.performance ?? { now: () => Date.now() };

const { TalentRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/talent-registry.js');
await TalentRegistry.initialize();

for (const [id, expected] of Object.entries(KRATH)) {
  const byId = TalentRegistry.getById(id);
  const byName = TalentRegistry.getByName(expected.name);
  assert.ok(byId, `TalentRegistry.getById did not resolve ${expected.name}`);
  assert.ok(byName, `TalentRegistry.getByName did not resolve ${expected.name}`);
  assert.equal(byName.id, id);
  assert.equal(byId.source, SOURCE);
  assert.ok(byId.uuid, `${expected.name} resolved without a compendium uuid (synthetic entry)`);
  assert.notEqual(byId.pack, 'synthetic:talent-tree-membership');

  const doc = await TalentRegistry.getDocumentById(id);
  assert.ok(doc, `TalentRegistry.getDocumentById returned nothing for ${expected.name}`);
  assert.equal(doc.name, expected.name);
}

for (const treeRef of [TREE_NAME, 'krath', TREE_ID]) {
  const members = TalentRegistry.getByTree(treeRef);
  assert.equal(
    new Set(members.map(e => e.id)).size,
    4,
    `TalentRegistry.getByTree(${JSON.stringify(treeRef)}) did not resolve all four Krath talents`
  );
  assert.deepEqual(
    members.map(e => e.name).sort(),
    Object.values(KRATH).map(t => t.name).sort()
  );
}

{
  const { getTalentMembership, clearCache } = await import(
    '/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-tree-membership-authority.js'
  );
  clearCache();
  const membership = await getTalentMembership({
    id: krathTree._id,
    name: krathTree.name,
    talentIds: krathTree.system.talentIds,
    talentNames: krathTree.system.talentNames,
    talentCount: 4,
    system: krathTree.system,
  });
  assert.equal(new Set(membership.map(e => e.id)).size, 4);
  assert.deepEqual(
    membership.map(e => e.name).sort(),
    Object.values(KRATH).map(t => t.name).sort()
  );
}

// The Krath NPCs name the tradition the tree represents; the tradition alias
// map must keep resolving it so those actors reach a real tree.
{
  const { TREE_ALIASES } = await import(
    '/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js'
  ).catch(() => ({ TREE_ALIASES: null }));
  if (TREE_ALIASES) {
    const aliases = TREE_ALIASES instanceof Map ? TREE_ALIASES.get('krath') : TREE_ALIASES.krath;
    assert.ok(aliases?.includes('krath'), 'the krath tradition alias was dropped');
  }
}

console.log('krath-talent-tree-hydration: all assertions passed');
