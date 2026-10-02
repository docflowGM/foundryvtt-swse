import assert from 'node:assert/strict';
import fs from 'node:fs';
import { read, parse, TALENTS, TREES } from '../tools/talent-tag-io.mjs';
import { loadRuntime, sourceLinked, finalizerEmbedded, pendingEntry } from '../tools/census-talent-prerequisite-identity.mjs';
import { createProbe } from '../tools/talent-tag-probes.mjs';
import { build as buildCensus, OUT as CENSUS_OUT } from '../tools/census-talent-force-classification.mjs';

// Phase 12 consumer correction: RAW "Force talent" = member of a Force talent tree (structural tree authority), NEVER the semantic `force` tag.
const talents = parse(read(TALENTS)), trees = parse(read(TREES)), say = console.log.bind(console);
const { PrerequisiteChecker, restore } = await loadRuntime(talents, trees);
const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
const ta = await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js');
const { evaluatePrerequisite } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-evaluator.js');
const { buildActorPrerequisiteSnapshot } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js');
await TalentTreeDB.build();
globalThis.window = globalThis.window || globalThis;
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => class extends Base {} };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll() {}, on() {} };
const { ForceAdeptTalentActions } = await import('/systems/foundryvtt-swse/scripts/engine/talent/force-adept-talent-actions.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
let n = 0; const test = async (name, fn) => { await fn(); n++; say('  ok  ' + name); };
const tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);
const treeName = id => TalentTreeDB.trees.get(id)?.name;
const treesOf = t => TalentTreeDB.getTreeIdsForTalentId(t._id).map(treeName);
const inTree = name => talents.filter(t => treesOf(t).includes(name));
const withTags = (t, tags) => ({ ...t, system: { ...t.system, tags } });
const strip = t => withTags(t, tagsOf(t).filter(g => g !== 'force'));

await test('the Force talent tree set is exactly the 6 generic Force trees + 25 official Force-tradition trees (class trees such as Jedi Guardian, Sith, Mystic are NOT Force talent trees)', () => {
  const names = [...ta.getCanonicalForceTalentTreeIds()].map(treeName).sort();
  assert.equal(names.length, 31);
  for (const g of ['Alter', 'Control', 'Dark Side', 'Light Side', 'Sense', 'Guardian Spirit', 'Krath', 'Jal Shey', 'Aing-Tii Monk']) assert.ok(names.includes(g), g);
  for (const c of ['Jedi Guardian', 'Jedi Sentinel', 'Sith', 'Mystic', 'Telepath', 'Jedi Healer', 'Force Hunter', 'Lightsaber Forms']) assert.ok(!names.includes(c), c);
  assert.ok(ta.isCanonicalForceTalentTree([...ta.getCanonicalForceTalentTreeIds()][0]));
});
await test('Case 1: every talent of Alter / Control / Sense / Dark Side / Light Side / Guardian Spirit counts regardless of its semantic tags (tagged, stripped and emptied)', () => {
  for (const tree of ['Alter', 'Control', 'Sense', 'Dark Side', 'Light Side', 'Guardian Spirit']) {
    const ts = inTree(tree); assert.ok(ts.length > 0, tree);
    for (const t of ts) for (const v of [t, strip(t), withTags(t, []), withTags(t, ['ranged'])]) assert.equal(ta.isForceTalent(v), true, `${tree}/${t.name}`);
  }
});
await test('Case 2: published Force-tradition tree talents count without needing a semantic force tag (e.g. Guardian Spirit, Kilian Ranger, Krath)', () => {
  const noTag = talents.filter(t => ta.isForceTalent(t) && !tagsOf(t).includes('force'));
  assert.ok(noTag.length > 0);
  assert.ok(noTag.some(t => treesOf(t).includes('Kilian Ranger')) || noTag.some(t => treesOf(t).includes('Krath')) || noTag.some(t => treesOf(t).includes('Guardian Spirit')));
  for (const tree of ['Krath', 'Kilian Ranger', 'Jal Shey', 'Matukai Adept']) for (const t of inTree(tree)) assert.equal(ta.isForceTalent(withTags(t, [])), true, `${tree}/${t.name}`);
});
await test('Case 3: Jedi class talents (mechanic uses the Force, semantic force tag present) do NOT count', () => {
  for (const tree of ['Jedi Guardian', 'Jedi Sentinel', 'Jedi Consular', 'Jedi Watchman', 'Jedi Healer']) for (const t of inTree(tree)) assert.equal(ta.isForceTalent(withTags(t, [...new Set([...tagsOf(t), 'force'])])), false, `${tree}/${t.name}`);
  assert.ok(inTree('Jedi Guardian').some(t => tagsOf(t).includes('force')));
});
await test('Case 4: class-limited Sith / Force-user prestige talents do NOT count merely because of name, class, category or tags', () => {
  for (const tree of ['Sith', 'Mystic', 'Telepath', 'Sith Alchemy', 'Force Hunter', 'Imperial Inquisitor', 'Lightsaber Forms']) for (const t of inTree(tree)) assert.equal(ta.isForceTalent(withTags(t, [...tagsOf(t), 'force'])), false, `${tree}/${t.name}`);
  assert.equal(ta.isForceTalent({ ...inTree('Sith')[0], name: 'Force Jedi Sith Mystic Adept', system: { ...inTree('Sith')[0].system, category: 'jedi sith force', tags: ['force'] } }), false);
});
await test('Case 5: a non-Force-tree talent with semantic `force` does not satisfy Force Adept "three Force talents" (checker AND evaluator)', () => {
  const fakes = talents.filter(t => treesOf(t).length && !ta.isForceTalent(t) && tagsOf(t).includes('force')).slice(0, 3);
  assert.equal(fakes.length, 3);
  const actor = { id: 'a', type: 'character', system: {}, items: fakes.map(sourceLinked), flags: {} };
  assert.equal(PrerequisiteChecker.checkPrestigeClassPrerequisites(actor, 'Force Adept').details.talents.met, false);
  assert.equal(evaluatePrerequisite(buildActorPrerequisiteSnapshot(actor), { type: 'force_talent_count', count: 3 }).passed, false);
});
await test('Case 6: removing the semantic force tag from a real Force talent does not change classification (compendium record, finalizer clone, source-linked clone, pending selection)', () => {
  const t = inTree('Sense').find(x => tagsOf(x).includes('force')); assert.ok(t);
  for (const shape of [x => x, finalizerEmbedded, sourceLinked, pendingEntry]) {
    const bare = strip(t), forms = shape === finalizerEmbedded ? [sourceLinked(bare)] : [shape(bare)];
    for (const f of forms) assert.equal(ta.isForceTalent(f), true);
  }
  // a finalizer-shaped clone carries a fresh embedded _id and NO source link: identity is unresolved -> fail closed, never guessed from tags/name
  const orphan = finalizerEmbedded(t); orphan.flags = {}; orphan._stats = {};
  const r = ta.classifyForceTalent(orphan); assert.deepEqual([r.isForce, r.resolved, r.canonicalId], [false, false, null]);
});
await test('Case 7: multi-tree identity — a talent certified in several trees counts if ANY is a Force talent tree', () => {
  const alter = [...TalentTreeDB.trees.values()].find(x => x.name === 'Alter').id, jg = inTree('Jedi Guardian')[0];
  const set = TalentTreeDB.talentToTrees.get(jg._id); assert.ok(set);
  assert.equal(ta.isForceTalent(jg), false);
  set.add(alter);
  try { assert.equal(ta.isForceTalent(jg), true); assert.equal(ta.classifyForceTalent(jg).treeIds.length, 2); } finally { set.delete(alter); }
  assert.equal(ta.isForceTalent(jg), false);
  const ft = inTree('Alter')[0], other = [...TalentTreeDB.trees.values()].find(x => x.name === 'Jedi Guardian').id, fs2 = TalentTreeDB.talentToTrees.get(ft._id);
  fs2.add(other); try { assert.equal(ta.isForceTalent(ft), true); } finally { fs2.delete(other); }
});
await test('Case 8: parity — PrerequisiteChecker == PrerequisiteEvaluator == Mystic Mastery for the same actor, and semantic tags cannot move any of them', async () => {
  const pick = (tree, k) => inTree(tree).slice(0, k);
  const force = [...pick('Alter', 2), ...pick('Krath', 1)], classy = [...pick('Jedi Guardian', 2), ...pick('Sith', 1), ...pick('Mystic', 1)];
  const sent = []; const orig = SWSEChat.postHTML; SWSEChat.postHTML = async o => { sent.push(o); return o; };
  try {
    for (const mutate of [x => x, strip, x => withTags(x, []), x => withTags(x, [...tagsOf(x), 'force'])]) {
      const items = [...force, ...classy].map(t => ({ ...sourceLinked(mutate(t)), type: 'talent' }));
      const actor = { id: 'a', type: 'character', name: 'Parity', system: { abilities: {} }, items, flags: {} };
      const checker = PrerequisiteChecker.checkPrestigeClassPrerequisites(actor, 'Force Adept').details.talents.actual;
      const evaluator = evaluatePrerequisite(buildActorPrerequisiteSnapshot(actor), { type: 'force_talent_count', count: 1 });
      sent.length = 0; await ForceAdeptTalentActions.announceMysticMastery(actor);
      const mystic = sent[0].flags.swse.estimatedForceTalentCount;
      assert.deepEqual([checker, mystic], [3, 3]);
      assert.equal(evaluatePrerequisite(buildActorPrerequisiteSnapshot(actor), { type: 'force_talent_count', count: 3 }).passed, true);
      assert.equal(evaluatePrerequisite(buildActorPrerequisiteSnapshot(actor), { type: 'force_talent_count', count: 4 }).passed, false);
      assert.equal(evaluator.passed, true); assert.equal(ta.countForceTalents(items), 3);
    }
  } finally { SWSEChat.postHTML = orig; }
});
await test('probe: toggling the semantic force tag on every canonical talent never changes the structural classification signature; the old tag/regex heuristics are gone from all three consumers', async () => {
  const probe = await createProbe();
  for (const t of talents) {
    const a = probe.signature(t, tagsOf(t)), b = probe.signature(t, tagsOf(t).filter(g => g !== 'force')), c = probe.signature(t, [...new Set([...tagsOf(t), 'force'])]);
    assert.equal(a.forceTalent, b.forceTalent, t.name); assert.equal(a.forceTalent, c.forceTalent, t.name);
  }
  for (const rel of ['scripts/data/prerequisite-checker.js', 'scripts/engine/progression/prerequisites/prerequisite-evaluator.js', 'scripts/engine/talent/force-adept-talent-actions.js']) {
    const src = read(rel); assert.ok(src.includes('countForceTalents'), rel);
    assert.ok(!/tags\??\.includes\('force'\)/.test(src) && !src.includes('/force|mystic|telepath|adept|jedi|sith/i'), rel);
  }
});
await test('census: 1,187 canonical talents, 173 RAW Force talents, 0 unresolved identities; committed census current; buckets and old-method false positives/negatives recorded', async () => {
  const c = await buildCensus(), committed = JSON.parse(fs.readFileSync(new URL('../' + CENSUS_OUT, import.meta.url), 'utf8'));
  assert.deepEqual(c, committed);
  assert.equal(c.canonicalTalents, 1187); assert.equal(c.rawForceTalents, 173); assert.equal(c.unresolvedTalents.length, 0); assert.equal(c.forceTalentTreeCount, 31);
  assert.deepEqual(c.buckets, { rawForce_semanticForce: 138, rawForce_noSemanticForce: 35, nonForce_semanticForce: 151, nonForce_noSemanticForce: 863 });
  assert.equal(c.oldTagCounter.total, 289); assert.equal(c.oldTagCounter.falsePositives.length, 151); assert.equal(c.oldTagCounter.falseNegatives.length, 35);
  assert.equal(c.oldMysticRegex.total, 382); assert.equal(c.oldMysticRegex.falsePositives.length, 239); assert.equal(c.oldMysticRegex.falseNegatives.length, 30);
});
restore();
say(`\n${n} Force-talent structural-authority tests passed`);
