import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Elite Droid talent-tree hydration regression guard.
//
// The tree document itself was restored earlier from repository authority
// (packs/classes.db, data/talent_tree_class_map.json,
// data/talent-tree-descriptions.json, the mentor prestige profiles) but shipped
// with no talent documents. This test locks in the full four-talent hydration
// from Scavenger's Guide to Droids p. 28, including the mechanical clauses that
// distinguish each talent from a generic passive bonus.
//
// Coverage tier: (a) direct production-path — the real TalentRegistry and
// TalentTreeMembershipAuthority are executed against the real packs.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TREE_ID = 'b968ecab63bc4cf4';
const TREE_NAME = 'Elite Droid';
const SOURCE = "Scavenger's Guide to Droids";
const PAGE = 28;

const ELITE_DROID = Object.freeze({
  cb3bbc1e7d8829e9: { name: 'Break Program', prerequisites: 'Trained in Use Computer' },
  '2b6a4a203b72dc79': { name: 'Heuristic Mastery', prerequisites: 'Wisdom 15' },
  '8d0657e7ade688bd': { name: 'Scripted Routines', prerequisites: 'Base attack bonus +5' },
  '6fdbdd17eba93006': { name: 'Ultra Resilient', prerequisites: '' },
});

const readPack = (name) =>
  fs.readFileSync(path.join(ROOT, 'packs', name), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const talentDocs = readPack('talents.db');
const treeDocs = readPack('talent_trees.db');
const classDocs = readPack('classes.db');
const talentsById = new Map(talentDocs.map(doc => [doc._id, doc]));
const tree = treeDocs.find(doc => doc._id === TREE_ID);

/* 1-3. Exactly four talents; every id resolves; every document claims the tree. */
{
  assert.ok(tree, 'the Elite Droid tree document is missing');
  assert.equal(tree.name, TREE_NAME);
  assert.equal(tree.system.contentGap, undefined, 'the Elite Droid content gap must be resolved, not recorded');
  assert.deepEqual([...new Set(tree.system.talentIds)].sort(), Object.keys(ELITE_DROID).sort());
  assert.equal(tree.system.talentIds.length, 4, 'the Elite Droid tree has duplicate talent ids');
  assert.deepEqual(
    [...tree.system.talentNames].sort(),
    Object.values(ELITE_DROID).map(t => t.name).sort()
  );

  for (const id of tree.system.talentIds) {
    assert.ok(talentsById.has(id), `the Elite Droid tree claims ${id}, which has no compendium document`);
  }

  for (const [id, expected] of Object.entries(ELITE_DROID)) {
    const doc = talentsById.get(id);
    assert.ok(doc, `${expected.name} was not hydrated`);
    assert.equal(doc.name, expected.name);
    assert.equal(doc.type, 'talent');
    assert.equal(doc.system.treeId, TREE_ID, `${expected.name} does not claim the Elite Droid tree by id`);
    assert.equal(doc.system.talent_tree, TREE_NAME, `${expected.name} does not claim the tree by name`);
    /* 4. Source and page. */
    assert.equal(doc.system.source, SOURCE, `${expected.name} has the wrong source book`);
    assert.equal(doc.system.page, PAGE, `${expected.name} has the wrong printed page`);
    assert.equal(doc.system.prerequisites, expected.prerequisites);
    assert.ok(String(doc.system.benefit || '').length > 40, `${expected.name} has no benefit text`);
    assert.equal(doc.system.description?.value, doc.system.benefit);
    assert.ok(doc.system.tags.includes(`tree_${TREE_ID}`));
    assert.ok(doc.system.tags.includes('elite-droid'));

    // Contextual mechanics must not be encoded as unconditional passives.
    assert.equal(doc.system.executionModel, 'ACTIVE', `${expected.name} is marked passive`);
    assert.deepEqual(doc.system.abilityMeta.modifiers, [], `${expected.name} applies a static modifier`);
    assert.equal(doc.system.abilityMeta.staticSheetPolicy, 'exclude');
    assert.equal(doc.system.abilityMeta.manualResolution, true);

    /* 10. Nothing synthetic. */
    assert.match(id, /^[0-9a-f]{16}$/);
    assert.ok(!('uuid' in doc), `${expected.name} carries a placeholder uuid field`);
  }
}

/* 5-7. Structured prerequisites match the printed ones. */
{
  const breakProgram = talentsById.get('cb3bbc1e7d8829e9');
  assert.deepEqual(breakProgram.system.prerequisitesStructured.conditions, [
    { type: 'skillTrained', skill: 'usecomputer' },
  ]);

  const heuristic = talentsById.get('2b6a4a203b72dc79');
  assert.deepEqual(heuristic.system.prerequisitesStructured.conditions, [
    { type: 'attribute', ability: 'wis', min: 15 },
  ]);

  const scripted = talentsById.get('8d0657e7ade688bd');
  assert.deepEqual(scripted.system.prerequisitesStructured.conditions, [{ type: 'bab', min: 5 }]);

  assert.equal(talentsById.get('6fdbdd17eba93006').system.prerequisitesStructured, undefined);
}

/* Source-fidelity: the mechanical clauses, not just the names. */
{
  const breakProgram = talentsById.get('cb3bbc1e7d8829e9');
  assert.match(breakProgram.system.benefit, /behavioral inhibitors/);
  assert.match(breakProgram.system.benefit, /data link/);
  assert.match(breakProgram.system.benefit, /Use Computer check opposed by the target Droid's Will Defense/);
  assert.match(breakProgram.system.benefit, /rounds equal to your Intelligence bonus/);
  assert.equal(breakProgram.system.abilityMeta.combatActions[0].relatedSkills[0], 'useComputer');

  const heuristic = talentsById.get('2b6a4a203b72dc79');
  assert.match(heuristic.system.benefit, /reroll any untrained Skill Check, except a Use the Force check/);
  assert.match(heuristic.system.benefit, /keep the result of the reroll even if it is worse/);
  assert.match(heuristic.system.benefit, /once per encounter you can spend a Force Point/);
  assert.match(heuristic.system.benefit, /take the better result/);
  const rerolls = heuristic.system.abilityMeta.rerolls;
  assert.equal(rerolls.length, 2);
  const untrained = rerolls.find(r => r.trigger === 'untrainedSkillCheck');
  assert.deepEqual(untrained.excludes, ['useTheForce']);
  assert.equal(untrained.keep, 'second', 'the untrained reroll must keep the second result, even when worse');
  const forcePoint = rerolls.find(r => r.cost === 'forcePoint');
  assert.equal(forcePoint.keep, 'better');
  assert.equal(forcePoint.usesPerEncounter, 1);

  /* 8. All three Scripted Routines actions survive. */
  const scripted = talentsById.get('8d0657e7ade688bd');
  const routines = scripted.system.abilityMeta.routines;
  assert.deepEqual(routines.map(r => r.name), ['Attack Script', 'Defense Script', 'Skill Script']);
  for (const routine of routines) assert.equal(routine.usesPerEncounter, 1);
  assert.deepEqual(
    routines[0].steps,
    [
      { from: 'full-round', to: 'standard' },
      { from: 'standard', to: 'move' },
      { from: 'move', to: 'swift' },
      { from: 'swift', to: 'free' },
    ],
    'Attack Script must reduce each action cost by exactly one step'
  );
  assert.equal(routines[1].effect, 'reapplyIndependentSpirit');
  assert.equal(routines[2].bonusFormula, 'floor(independentDroidLevel / 2)');
  assert.deepEqual(routines[2].requires, ['inCombat', 'trainedSkill', 'standardActionOrLess']);
  for (const name of ['Attack Script', 'Defense Script', 'Skill Script']) {
    assert.ok(scripted.system.benefit.includes(name), `${name} is missing from the printed benefit text`);
  }

  /* 9. Ultra Resilient is a once-per-encounter Reaction scaled by class level. */
  const ultra = talentsById.get('6fdbdd17eba93006');
  assert.match(ultra.system.benefit, /Once per encounter, as a Reaction/);
  assert.match(ultra.system.benefit, /Damage Threshold by a bonus equal to your Independent Droid level/);
  assert.equal(ultra.system.abilityMeta.usesPerEncounter, 1);
  assert.equal(ultra.system.abilityMeta.combatActions[0].actionType, 'reaction');
  assert.deepEqual(ultra.system.abilityMeta.temporaryBonus, {
    target: 'damageThreshold',
    formula: 'independentDroidLevel',
    duration: 'reaction',
    usesPerEncounter: 1,
  });
}

/* Registries report the tree identically. */
{
  const expectedNames = Object.values(ELITE_DROID).map(t => t.name).sort();
  for (const rel of ['data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json']) {
    const entry = readJson(rel).find(e => e.id === 'elite-droid');
    assert.ok(entry, `${rel} has no Elite Droid entry`);
    assert.equal(entry.talentCount, 4);
    assert.deepEqual([...entry.talents].sort(), expectedNames);
  }
}

/* 11. Independent Droid class access resolves the restored tree. */
{
  const cls = classDocs.find(doc => doc._id === '3b1ed5f1038d49fb');
  assert.ok(cls, 'the Independent Droid class is missing');
  assert.ok(cls.system.talentTreeIds.includes('elite_droid'));
  assert.ok(cls.system.talentTreeSourceIds.includes(TREE_ID), 'the class does not resolve the tree by id');
  assert.ok(cls.system.talent_trees.includes(TREE_ID));
  assert.ok(
    cls.system.talentTreeUuids.includes(`Compendium.foundryvtt-swse.talent_trees.${TREE_ID}`),
    'the class has no compendium uuid for the Elite Droid tree'
  );
  assert.ok(
    readJson('data/talent_tree_class_map.json')['Elite Droid']?.includes('Independent Droid'),
    'the Elite Droid class map entry is gone'
  );
}

/* Live registry resolution: real documents, real uuids, nothing synthetic. */
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

for (const [id, expected] of Object.entries(ELITE_DROID)) {
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

for (const treeRef of [TREE_NAME, 'elite-droid', TREE_ID]) {
  const members = TalentRegistry.getByTree(treeRef);
  assert.equal(
    new Set(members.map(e => e.id)).size,
    4,
    `TalentRegistry.getByTree(${JSON.stringify(treeRef)}) did not resolve all four Elite Droid talents`
  );
  assert.deepEqual(
    members.map(e => e.name).sort(),
    Object.values(ELITE_DROID).map(t => t.name).sort()
  );
}

{
  const { getTalentMembership, clearCache } = await import(
    '/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-tree-membership-authority.js'
  );
  clearCache();
  const membership = await getTalentMembership({
    id: tree._id,
    name: tree.name,
    talentIds: tree.system.talentIds,
    talentNames: tree.system.talentNames,
    talentCount: 4,
    system: tree.system,
  });
  assert.equal(new Set(membership.map(e => e.id)).size, 4);
  assert.deepEqual(
    membership.map(e => e.name).sort(),
    Object.values(ELITE_DROID).map(t => t.name).sort()
  );
}

console.log('elite-droid-talent-tree-hydration: all assertions passed');
