import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createProbe } from '../tools/talent-tag-probes.mjs';
import { parse, read, readJson, TALENTS, TREES } from '../tools/talent-tag-io.mjs';

// Phase 11-2C tree-authority repair: prerequisite tree credit comes from canonical tree identity + certified membership, never from tags.
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const fn = (src, name) => { const i = src.indexOf(`function ${name}(`); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } throw new Error(name); };
let n = 0; const test = async (name, f) => { await f(); n++; console.log('  ok  ' + name); };

await test('no prerequisite-tree code reads semantic tags as tree authority', () => {
  assert.ok(!/\btags\b/.test(strip(fn(read('scripts/data/prerequisite-checker.js'), 'getCanonicalTalentTreeIds'))));
  assert.ok(!/\btags\b/.test(strip(fn(read('scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js'), 'getTalentTreeKeys'))));
  assert.ok(/getTreeIdsForTalentId/.test(read('scripts/data/prerequisite-checker.js')) && /getTreeIdsForTalentId/.test(read('scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js')), 'both consume the certified membership authority');
});

const P = await createProbe(); const talents = parse(read(TALENTS)), trees = parse(read(TREES));
const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
const { canonicalTalentUuid } = await import('/systems/foundryvtt-swse/scripts/data/talent-source-identity.js');
const linked = (t, tags) => ({ ...t, system: { ...t.system, tags }, flags: { ...(t.flags ?? {}), core: { sourceId: canonicalTalentUuid(t._id) } } });

await test('a semantic tag never grants tree credit, even when a tree shares its name (control / leadership / dark_side)', () => {
  const victim = talents.find(t => t.system.tags?.length === 0 || !t.system.tags?.length) ?? talents[0]; // after the Phase 12 final adjudication no talent is untagged; linked() overrides the tags in both probes, so any record proves the rule
  const base = P.treeIdsOf(linked(victim, [])).join('|'), tagged = P.treeIdsOf(linked(victim, ['control', 'leadership', 'dark_side', 'striker', 'tree_6ac3416fb6aada56', 'mystic'])).join('|');
  assert.equal(tagged, base);
  const tokens = P.treeIdsOf({ treeId: 'Control' }).concat(P.treeIdsOf({ treeId: 'Leadership' }), P.treeIdsOf({ treeId: 'Dark Side' }));
  assert.ok(!P.treeIdsOf(linked(victim, ['control', 'leadership', 'dark_side'])).some(k => tokens.includes(k) && !P.treeIdsOf(linked(victim, [])).includes(k)));
});
await test('every certified primary tree identity resolves, for every canonical talent', () => {
  for (const t of talents) { const ids = TalentTreeDB.getTreeIdsForTalentId(t._id); const prim = trees.find(x => x._id === t.system.treeId); assert.ok(prim && ids.length, t.name); }
});
await test('certified membership is by canonical id and identity-safe: same-name talents/trees stay distinct', () => {
  const byTree = new Map(trees.map(tr => [tr._id, tr.name]));
  for (const [name, count] of Object.entries(talents.reduce((o, t) => (o[t.name] = (o[t.name] ?? 0) + 1, o), {}))) {
    if (count < 2) continue;
    const sameName = talents.filter(t => t.name === name); const sets = sameName.map(t => new Set(TalentTreeDB.getTreeIdsForTalentId(t._id)));
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) if (byTree.get(sameName[i].system.treeId) !== byTree.get(sameName[j].system.treeId)) assert.ok(![...sets[i]].some(x => sets[j].has(x)), `${name}: same-name talents in different trees must not share membership`);
  }
});
await test('the audit proves the repair: 79 tag credits that mirrored membership are restored by the authority; 298 polluting credits stay gone; 0 unresolved', () => {
  const a = readJson('data/audits/talent-phase-11-2c-tree-credit-repair.json'), c = a.counts;
  assert.equal(c.primaryTreesUnresolved, 0); assert.equal(c.certifiedRelationshipsNotResolved, 0); assert.equal(c.oldTagCreditsMirroringCertifiedMembership, 79); assert.equal(c.ofWhichRestoredByAuthority, 79);
  assert.equal(c.oldPollutingTagCredits, 298); assert.equal(c.pollutingCreditsRemaining, 0); assert.equal(c.checkerReadsTagsForTreeIdentity, false);
  assert.equal(a.falseCreditsRemaining.length, 0);
});
P.restore();
console.log(`talent-tree-membership-authority-repair: ${n} checks passed`);
