import assert from 'node:assert/strict';
import { createProbe } from '../tools/talent-tag-probes.mjs';
import { parse, read, readJson, TALENTS, TREES } from '../tools/talent-tag-io.mjs';

// Phase 11-2D: `category` has ZERO tree-credit authority. The 59 talents whose class-style category equals a tree they do not belong to
// (Bounty Hunter 11, Force Adept 26, Gunslinger 12, Shaper 5, Improviser 5) must keep their certified primary tree and gain no false credit.
const AFFECTED = ["028e4e50565971ee","084423db749d2bb3","08e904def2f9ea5c","0a65325a98b108a7","0c636cdbb63cdba3","0e36a04342959256","12eea831f06c45f7","19ba6767726bdc86","202a117b1b203951","203464310c5c2492","223ba62ffbabb9c2","2acaa4620d396fe9","2c1268268212d135","2da74bc3f4d45d2d","2fdf215a5da99e00","443bfe7fa33dd627","4ae840aaa4e0eba0","4ec766d6818c373f","5218d5971b78119b","52a4914cca90cc4d","546034f073eab1fd","554e245686231855","5621a55aea1936b2","58e37d40d3aa7d4b","5cd160036d6bba05","661c2c0665e911f6","66b23ee79bd33bf1","76ff0ba56aa3864b","7d30702a5a2640a4","85318987b48d5caa","86565bbe8b8fd1a2","94b1951d4795f602","970d8d555645604d","9b337a844329fa17","9c88f3f82e6e2082","aa9b67c6737c2549","b08c8efbea22f604","b15fa2f45baf55ea","b3ce8b08a8cb95fa","b5eba49d8305b689","b6e75c52f5d66ade","bab9a1ce285f98b9","bef731c3743c2c7f","c006a4be6de26139","c219dc05ccc7db81","c41461c3bdd0165d","cb0dcc59f7ced910","ccaa66ed749e3317","cdcdb85912d9eb67","cddfb9833c7d3344","d043a3c0494345ac","d24b04541998b27b","d61e3a2afe8ab339","d6d3b0a2ec01ca9a","dd488c2dc43d14ab","e8fe6087eef386c7","ecb678c47bb2cb43","f09f37cda0fc10e1","f5fcf2752e99961a"];
const FAMILIES = { 'Bounty Hunter': 11, 'Force Adept': 26, Gunslinger: 12, Shaper: 5, Improviser: 5 };
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const fn = (src, name) => { const i = src.indexOf(`function ${name}(`); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } throw new Error(name); };
let n = 0; const test = async (name, f) => { await f(); n++; process.stderr.write('  ok  ' + name + '\n'); };

await test('neither talent.category nor talent.system.category is a tree-identity candidate (and tags still are not)', () => {
  const body = strip(fn(read('scripts/data/prerequisite-checker.js'), 'getCanonicalTalentTreeIds'));
  assert.ok(!/\bcategory\b/.test(body)); assert.ok(!/\btags\b/.test(body));
  assert.ok(/getTreeIdsForTalentId/.test(body), 'certified membership remains the secondary authority');
});

const P = await createProbe(); const talents = parse(read(TALENTS)), trees = parse(read(TREES)), by = new Map(talents.map(t => [t._id, t])), treeById = new Map(trees.map(t => [t._id, t]));
const { canonicalTalentUuid } = await import('/systems/foundryvtt-swse/scripts/data/talent-source-identity.js');
const linked = (t, patch = {}) => ({ ...t, ...patch, system: { ...t.system, ...(patch.system ?? {}) }, flags: { ...(t.flags ?? {}), core: { sourceId: canonicalTalentUuid(t._id) } } });
const credits = item => new Set([...P.treeIdsOf(item.system), ...P.treeIdsOf(item)]);
const treeTokens = name => new Set(P.treeIdsOf({ treeId: name }));
const grants = (item, treeName) => [...treeTokens(treeName)].some(k => credits(item).has(k));

await test('the 59 affected talents keep their certified primary tree and gain no category-derived credit', () => {
  assert.equal(AFFECTED.length, 59); const fam = {};
  for (const id of AFFECTED) {
    const t = by.get(id); assert.ok(t, id); const cat = t.system.category; assert.ok(cat in FAMILIES, `${t.name}: ${cat}`); fam[cat] = (fam[cat] ?? 0) + 1;
    const primary = treeById.get(t.system.treeId).name; assert.notEqual(primary, cat, `${t.name} is not a member of the ${cat} tree`);
    assert.ok(grants(linked(t), primary), `${t.name} resolves its primary tree ${primary}`);
    assert.ok(!grants(linked(t), cat), `${t.name} must not be credited to the ${cat} tree`);
  }
  assert.deepEqual(fam, FAMILIES);
});
await test('a category value never grants tree credit, in either shape, even for a talent with no tree-identity field', () => {
  for (const cat of Object.keys(FAMILIES)) {
    const victim = talents.find(t => !trees.some(tr => tr.name === cat && tr.system.talentIds.includes(t._id)));
    for (const item of [linked(victim, { category: cat }), linked(victim, { system: { category: cat } }), linked(victim, { category: cat, system: { category: cat } })]) assert.ok(!grants(item, cat), `${cat} must not grant credit`);
    assert.equal([...credits(linked(victim, { category: cat, system: { category: cat } }))].join('|'), [...credits(linked(victim))].join('|'));
  }
});
await test('certified membership (not category) is the only way to earn the same-named tree: a real member still gets it', () => {
  for (const cat of Object.keys(FAMILIES)) { const tr = trees.find(x => x.name === cat); const member = by.get(tr.system.talentIds[0]); assert.ok(grants(linked(member), cat), `${member.name} is a certified ${cat} member`); }
});
await test('all 1,187 canonical talents still resolve their certified primary tree', () => {
  for (const t of talents) assert.ok(grants(linked(t), treeById.get(t.system.treeId).name) || [...credits(linked(t))].some(k => (P.tokenToTrees.get(k) ?? new Set()).has(t.system.treeId)), t.name);
});
await test('audit after 11-2D: category credit 0; Phase 11-2C protections intact (298 tag credits gone, 79 restored, 0 unresolved)', () => {
  const a = readJson('data/audits/talent-phase-11-2c-tree-credit-repair.json'), c = a.counts;
  assert.equal(c.talents, 1187); assert.equal(c.primaryTreesResolved, 1187); assert.equal(c.primaryTreesUnresolved, 0); assert.equal(c.certifiedRelationshipsNotResolved, 0);
  assert.equal(c.pollutingCreditsRemaining, 0); assert.equal(c.creditsFromStructuredFieldsWithoutMembership, 0); assert.equal(c.creditsFromCategoryField, 0); assert.equal(c.ofWhichFromTheCategoryField, 0);
  assert.equal(c.checkerReadsTagsForTreeIdentity, false); assert.equal(c.checkerReadsCategoryForTreeIdentity, false);
  assert.equal(c.oldPollutingTagCredits, 298); assert.equal(c.oldTagCreditsMirroringCertifiedMembership, 79); assert.equal(c.ofWhichRestoredByAuthority, 79);
  assert.equal(c.oldFalseCategoryCreditsIncludingTagOverlap, 59); assert.equal(c.oldCategoryCreditsRestoredByAuthority, c.oldCategoryCreditsMirroringCertifiedMembership);
});
P.restore();
process.stderr.write(`talent-phase-11-2d-category-tree-credit: ${n} checks passed\n`);
