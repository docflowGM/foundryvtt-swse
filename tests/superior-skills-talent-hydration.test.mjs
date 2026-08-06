import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Superior Skills talent-tree hydration regression guard.
//
// The Superior Skills tree (Galaxy of Intrigue p.21, tree id 04a6f32128cc4b98)
// claims seven talents but only Critical Skill Success ever existed as a real
// compendium document. The gap was previously papered over by synthetic
// registry-only entries injected into TalentRegistry's private maps, which had
// no UUID, no compendium document, empty rules text, and the wrong source book.
//
// This test locks in the canonical repair: seven real talent documents, a
// talent-tree registry that reports all seven, talent-side tree identity that
// TalentRegistry can normalize, real owned-item data through
// FeatTalentPlanBuilder, and selected-skill metadata that survives the plan
// builder's merge onto the actor.
//
// Coverage tier: (a) direct production-path — the real TalentRegistry,
// ProgressionContentAuthority, and FeatTalentPlanBuilder modules are loaded and
// executed against the real packs/talents.db contents.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TREE_ID = '04a6f32128cc4b98';
const TREE_NAME = 'Superior Skills';
const SUPERIOR_SKILLS = Object.freeze({
  b89d573dba9ddb20: 'Assured Skill',
  5242623648114830: 'Critical Skill Success',
  '36fbab1a05c08fdd': 'Exceptional Skill',
  f85bb79fe20de1ef: 'Reliable Boon',
  '1cbf8a40f7972aa4': 'Skill Boon',
  '07cd591fb8dccb39': 'Skill Confidence',
  '323cc243fef47675': 'Skillful Recovery',
});

// Every talent-tree reference now resolves. The Korunnai Adept talents were
// hydrated from the repository's own authority data (follower-manager.js +
// talent-prerequisites.json) and the Krath tree's phantom id was removed, so
// there is no baseline of tolerated dangling references left.
const KNOWN_UNRESOLVED_TREE_TALENT_IDS = Object.freeze([]);
const KNOWN_UNRESOLVED_REGISTRY_NAMES = Object.freeze([]);

function readPack(name) {
  return fs.readFileSync(path.join(ROOT, 'packs', name), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

const talentDocs = readPack('talents.db');
const treeDocs = readPack('talent_trees.db');
const generatedRegistry = readJson('data/generated/talent-trees.registry.json');
const fixesRegistry = readJson('data/fixes/talent-trees.registry.json');

const talentsById = new Map(talentDocs.map(doc => [doc._id, doc]));
const talentsByName = new Map(talentDocs.map(doc => [doc.name.toLowerCase(), doc]));

/* ------------------------------------------------------------------ *
 * 1. Every talent ID referenced by every talent-tree document resolves
 *    to a real talent compendium document.
 * ------------------------------------------------------------------ */
{
  const unresolved = [];
  for (const tree of treeDocs) {
    for (const talentId of tree.system?.talentIds ?? []) {
      if (!talentsById.has(talentId)) unresolved.push(talentId);
    }
  }
  assert.deepEqual(
    [...new Set(unresolved)].sort(),
    [...KNOWN_UNRESOLVED_TREE_TALENT_IDS].sort(),
    'talent-tree documents reference talent ids that have no compendium document'
  );

  for (const talentId of Object.keys(SUPERIOR_SKILLS)) {
    assert.ok(talentsById.has(talentId), `Superior Skills talent ${talentId} has no compendium document`);
  }
}

/* ------------------------------------------------------------------ *
 * 2. Every generated registry talent name resolves to a talent document.
 * ------------------------------------------------------------------ */
{
  const unresolved = [];
  for (const tree of generatedRegistry) {
    for (const name of tree.talents ?? []) {
      if (!talentsByName.has(String(name).toLowerCase())) unresolved.push(name);
    }
  }
  assert.deepEqual(
    [...new Set(unresolved)].sort(),
    [...KNOWN_UNRESOLVED_REGISTRY_NAMES].sort(),
    'generated talent-tree registry lists talent names with no compendium document'
  );
}

/* ------------------------------------------------------------------ *
 * 2b. Korunnai Adept and Krath are canonically resolved, not baselined.
 * ------------------------------------------------------------------ */
{
  const korunnai = treeDocs.find(doc => doc._id === '46d03bab0cf74a14');
  assert.ok(korunnai, 'Korunnai Adept tree is missing');
  assert.deepEqual(
    korunnai.system.talentIds.map(id => talentsById.get(id)?.name ?? `MISSING(${id})`).sort(),
    ['Akk Dog Attack Training', 'Akk Dog Master', "Akk Dog Trainer's Actions", 'Protective Reaction'],
    'Korunnai Adept membership does not resolve to real documents'
  );
  for (const id of ['ad7fd3e1a2b04c30', 'ad7fd3e1a2b04c31', 'ad7fd3e1a2b04c32']) {
    const doc = talentsById.get(id);
    assert.ok(doc, `Korunnai talent ${id} was not hydrated`);
    assert.equal(doc.system.treeId, '46d03bab0cf74a14');
    assert.equal(doc.system.talent_tree, 'Korunnai Adept');
    assert.equal(doc.system.prerequisites, 'Akk Dog Master');
    assert.ok(String(doc.system.benefit || '').length > 40, `${doc.name} has no benefit text`);
    // Follower semantics come from follower-manager.js and must survive.
    assert.equal(doc.system.followerTalent?.targetFilter, 'akk-dog');
  }

  // Krath: the phantom reference is gone. The tree legitimately has no talent
  // document in this repository, which is a recorded content gap, not a
  // dangling reference.
  const krath = treeDocs.find(doc => doc._id === 'd29a7261c1be4b83');
  assert.ok(krath, 'Krath tree is missing');
  assert.deepEqual(krath.system.talentIds, [], 'Krath still claims a talent that does not exist');
  assert.ok(krath.system.contentGap?.reason, 'the Krath content gap is undocumented');
}

/* ------------------------------------------------------------------ *
 * 3. Superior Skills resolves exactly seven unique talents everywhere.
 * ------------------------------------------------------------------ */
{
  const tree = treeDocs.find(doc => doc._id === TREE_ID);
  assert.ok(tree, 'Superior Skills talent-tree document is missing');
  assert.deepEqual([...new Set(tree.system.talentIds)].sort(), Object.keys(SUPERIOR_SKILLS).sort());
  assert.equal(tree.system.talentIds.length, 7, 'Superior Skills tree has duplicate talent ids');
  assert.deepEqual([...new Set(tree.system.talentNames)].sort(), Object.values(SUPERIOR_SKILLS).sort());

  for (const [label, registry] of [['generated', generatedRegistry], ['fixes', fixesRegistry]]) {
    const entry = registry.find(item => item.id === 'superior-skills');
    assert.ok(entry, `${label} registry has no superior-skills entry`);
    assert.equal(entry.talentCount, 7, `${label} registry reports the wrong Superior Skills talent count`);
    assert.equal(new Set(entry.talents).size, 7, `${label} registry has duplicate Superior Skills talent names`);
    assert.deepEqual([...entry.talents].sort(), Object.values(SUPERIOR_SKILLS).sort());
  }
}

/* ------------------------------------------------------------------ *
 * 4. None of the seven are synthetic registry entries: each is a real,
 *    fully-populated document carrying canonical source metadata.
 * ------------------------------------------------------------------ */
{
  for (const [talentId, name] of Object.entries(SUPERIOR_SKILLS)) {
    const doc = talentsById.get(talentId);
    assert.equal(doc.name, name);
    assert.equal(doc.type, 'talent');
    assert.equal(doc.system.treeId, TREE_ID, `${name} does not declare the Superior Skills tree id`);
    assert.equal(doc.system.talent_tree, TREE_NAME, `${name} does not declare the Superior Skills tree name`);
    assert.equal(doc.system.source, 'Galaxy of Intrigue', `${name} has the wrong source book`);
    assert.equal(doc.system.page, 21, `${name} has the wrong source page`);
    assert.ok(doc.system.tags.includes('superior-skills'), `${name} is missing the superior-skills tag`);
    assert.ok(doc.system.tags.includes('skills'), `${name} is missing the skills tag`);
    assert.ok(String(doc.system.benefit || '').length > 40, `${name} has no benefit text`);
    assert.ok(String(doc.system.description?.value || '').length > 40, `${name} has no description text`);
    assert.ok(!JSON.stringify(doc).includes('syntheticRegistryEntry'), `${name} is still a synthetic registry entry`);
    assert.ok(!JSON.stringify(doc).includes('Unknown Regions'), `${name} still claims the wrong source book`);
  }

  assert.equal(
    talentsById.get('07cd591fb8dccb39').system.prerequisites,
    'Critical Skill Success',
    'Skill Confidence lost its Critical Skill Success prerequisite'
  );
}

/* ------------------------------------------------------------------ *
 * 5-6. Runtime: registry resolution, plan-builder owned-item data, and
 *      Exceptional Skill's selected-skill metadata surviving finalization.
 * ------------------------------------------------------------------ */
registerFoundryPathLoader();
installFoundryShimGlobals();

// The shim's mergeObject is a shallow spread; FeatTalentPlanBuilder relies on
// Foundry's recursive merge to layer the selection's system data over the
// resolved compendium document without discarding the document's own fields.
function recursiveMerge(target = {}, source = {}, options = {}) {
  const out = options.inplace === false ? { ...(target || {}) } : (target || {});
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = recursiveMerge({ ...out[key] }, value, { ...options, inplace: false });
    } else if (options.overwrite === false && key in out) {
      continue;
    } else {
      out[key] = value;
    }
  }
  return out;
}
globalThis.foundry.utils.mergeObject = recursiveMerge;

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
// The neighbouring packs are registered too so ProgressionContentAuthority's
// sibling registries initialize quietly instead of emitting missing-pack diagnostics.
globalThis.game.packs = new Map([
  ['foundryvtt-swse.talents', makePack('foundryvtt-swse.talents', talentDocs)],
  ['foundryvtt-swse.talent_trees', makePack('foundryvtt-swse.talent_trees', treeDocs)],
  ['foundryvtt-swse.feats', makePack('foundryvtt-swse.feats', readPack('feats.db'))],
]);
globalThis.performance = globalThis.performance ?? { now: () => Date.now() };

const { TalentRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/talent-registry.js');
const { ProgressionContentAuthority } = await import('/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js');
const { FeatTalentPlanBuilder } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/feat-talent-plan-builder.js');

await TalentRegistry.initialize();

// C: id / name / tree resolution, and real documents behind every reference.
{
  for (const [talentId, name] of Object.entries(SUPERIOR_SKILLS)) {
    const byId = TalentRegistry.getById(talentId);
    const byName = TalentRegistry.getByName(name);
    assert.ok(byId, `TalentRegistry.getById did not resolve ${name}`);
    assert.ok(byName, `TalentRegistry.getByName did not resolve ${name}`);
    assert.equal(byId.id, talentId);
    assert.equal(byName.id, talentId);
    assert.equal(byId.source, 'Galaxy of Intrigue');
    assert.ok(byId.uuid, `${name} resolved without a compendium uuid (synthetic entry)`);
    assert.notEqual(byId.pack, 'synthetic:talent-tree-membership');

    const doc = await TalentRegistry.getDocumentById(talentId);
    assert.ok(doc, `TalentRegistry.getDocumentById did not return a document for ${name}`);
    assert.equal(doc.name, name);

    const authorityDoc = await ProgressionContentAuthority.getTalentDocument({ id: talentId, name });
    assert.ok(authorityDoc, `ProgressionContentAuthority.getTalentDocument did not return a document for ${name}`);
    assert.equal(authorityDoc.name, name);
  }

  // The progression read seam itself (talent-side membership + registry merge).
  const { getTalentMembership, clearCache } = await import(
    '/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-tree-membership-authority.js'
  );
  clearCache();
  const treeDoc = treeDocs.find(doc => doc._id === TREE_ID);
  const membership = await getTalentMembership({
    id: treeDoc._id,
    name: treeDoc.name,
    talentIds: treeDoc.system.talentIds,
    talentNames: treeDoc.system.talentNames,
    talentCount: 7,
    system: treeDoc.system,
  });
  assert.equal(new Set(membership.map(entry => entry.id)).size, 7, 'TalentTreeMembershipAuthority did not hydrate all seven Superior Skills talents');
  assert.deepEqual(membership.map(entry => entry.name).sort(), Object.values(SUPERIOR_SKILLS).sort());

  for (const treeRef of [TREE_NAME, 'superior-skills', TREE_ID]) {
    const members = TalentRegistry.getByTree(treeRef);
    assert.equal(
      new Set(members.map(entry => entry.id)).size,
      7,
      `TalentRegistry.getByTree(${JSON.stringify(treeRef)}) did not resolve all seven Superior Skills talents`
    );
    assert.deepEqual(members.map(entry => entry.name).sort(), Object.values(SUPERIOR_SKILLS).sort());
  }
}

// 5. All seven produce real owned-item data through FeatTalentPlanBuilder.
{
  const actor = { items: [] };
  const selections = {
    talents: Object.entries(SUPERIOR_SKILLS).map(([id, name], index) => ({
      id,
      name,
      count: 1,
      slotKey: `talent-slot-${index}`,
      slotType: 'class-talent',
    })),
  };

  const { items } = await FeatTalentPlanBuilder.build({ actor, selections, sessionState: { sessionId: 'test-session' } });
  assert.equal(items.length, 7, 'FeatTalentPlanBuilder did not emit one owned item per Superior Skills talent');

  for (const item of items) {
    assert.equal(item.type, 'talent');
    assert.equal(item.system.treeId, TREE_ID, `${item.name} lost its tree identity`);
    assert.equal(item.system.talent_tree, TREE_NAME, `${item.name} lost its tree name`);
    assert.equal(item.system.source, 'Galaxy of Intrigue', `${item.name} lost its source`);
    assert.equal(item.system.page, 21, `${item.name} lost its source page`);
    assert.ok(String(item.system.benefit || '').length > 40, `${item.name} was materialized as a blank placeholder`);
  }
  assert.deepEqual(items.map(item => item.name).sort(), Object.values(SUPERIOR_SKILLS).sort());
}

// Repeatability: the five "select this Talent multiple times" talents must be
// recognized by the existing repeatability authority; the other two must not.
{
  const repeatable = ['Assured Skill', 'Exceptional Skill', 'Skill Boon', 'Skill Confidence', 'Skillful Recovery'];
  for (const [talentId, name] of Object.entries(SUPERIOR_SKILLS)) {
    const doc = talentsById.get(talentId);
    assert.equal(
      FeatTalentPlanBuilder.isRepeatableTalentEntry({ id: talentId, name }, doc),
      repeatable.includes(name),
      `${name} has the wrong repeatability classification`
    );
  }
}

// 6. Exceptional Skill preserves its selected-skill metadata through finalization.
{
  const actor = { items: [] };
  const selections = {
    talents: [{
      id: '36fbab1a05c08fdd',
      name: 'Exceptional Skill',
      count: 1,
      slotKey: 'talent-slot-0',
      slotType: 'class-talent',
      system: { selectedChoice: { id: 'perception', value: 'perception', label: 'Perception' }, choiceResolved: true },
    }],
  };

  const { items } = await FeatTalentPlanBuilder.build({ actor, selections, sessionState: { sessionId: 'test-session' } });
  assert.equal(items.length, 1);
  const [item] = items;
  assert.equal(item.name, 'Exceptional Skill');
  assert.equal(item.system.selectedChoice?.value, 'perception', 'Exceptional Skill silently lost its chosen skill');
  assert.equal(item.system.choiceResolved, true);
  // The choice prompt itself is driven off the document's choiceMeta.
  assert.equal(item.system.choiceMeta?.required, true);
  assert.equal(item.system.choiceMeta?.choiceKind, 'trained_skill');
  assert.ok(String(item.system.benefit || '').includes('Trained Skill'), 'Exceptional Skill lost its canonical benefit text');
}

// Every Superior Skills talent that names a chosen skill exposes choice metadata.
{
  const expectedChoiceKinds = {
    'Assured Skill': 'skill',
    'Exceptional Skill': 'trained_skill',
    'Skill Boon': 'trained_skill',
    'Skill Confidence': 'trained_skill',
    'Skillful Recovery': 'trained_skill',
    'Critical Skill Success': null,
    'Reliable Boon': null,
  };
  for (const [talentId, name] of Object.entries(SUPERIOR_SKILLS)) {
    const meta = talentsById.get(talentId).system.choiceMeta ?? null;
    assert.equal(meta?.choiceKind ?? null, expectedChoiceKinds[name], `${name} has the wrong choice kind`);
    if (expectedChoiceKinds[name]) {
      assert.equal(meta.required, true, `${name} does not require its skill choice`);
      assert.equal(meta.resolution, 'immediate', `${name} does not resolve its choice at selection time`);
      assert.ok(meta.storagePath, `${name} has no choice storage path`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 7. Direct actor addition uses a real compendium document rather than a
 *    blank placeholder, and the synthetic registry workaround is gone.
 * ------------------------------------------------------------------ */
{
  const abilitiesUi = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-sheet/abilities-ui.js'), 'utf8');
  assert.match(
    abilitiesUi,
    /wireAddAbilityButton\('add-talent', 'talent'\)/,
    'the Add Talent button is no longer wired through the compendium selection modal'
  );
  assert.match(abilitiesUi, /_showItemSelectionModal\?\.\(itemType\)/);

  const sheet = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-sheet.js'), 'utf8');
  assert.match(sheet, /_addAbilityItemFromCompendium\(itemType\)/, 'the compendium add path is missing');
  assert.match(sheet, /registry\.getDocumentById\?\.\(entry\.id\)/, 'the compendium add path does not load the real document');
  assert.match(
    sheet,
    /ActorEngine\.createEmbeddedDocuments\(this\.actor, 'Item', \[source\]/,
    'the compendium add path does not create the owned item through ActorEngine'
  );

  assert.equal(
    fs.existsSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/reconciliation/reconciliation-and-superior-skills-hotfix.js')),
    false,
    'the synthetic Superior Skills hotfix file still exists'
  );
  const remediation = fs.readFileSync(
    path.join(ROOT, 'scripts/apps/progression-framework/shell/reconciliation/reconciliation-remediation-hotfix.js'),
    'utf8'
  );
  assert.ok(!/Superior Skills/i.test(remediation), 'the reconciliation hotfix still injects Superior Skills talents');
  assert.ok(!/TalentRegistry/.test(remediation), 'the reconciliation hotfix still mutates TalentRegistry internals');
}

console.log('superior-skills-talent-hydration: all assertions passed');
