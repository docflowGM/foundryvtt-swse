import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3G-2: the canonical talent source-identity path, executed through the REAL helper, finalizer plan builder, talent-step pending shape
// and PrerequisiteChecker against real pack records.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const talents = pack('packs/talents.db'), trees = pack('packs/talent_trees.db');
const say = console.log.bind(console);
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = v => JSON.parse(JSON.stringify(v)); globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
globalThis.foundry.utils.mergeObject = (a, b, o = {}) => { const merge = (x, y) => { const out = { ...x }; for (const [k, v] of Object.entries(y ?? {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && x?.[k] && typeof x[k] === 'object' ? merge(x[k], v) : v; return out; }; return merge(a, b); };
globalThis.foundry.applications = { api: { ApplicationV2: class ApplicationV2Stub {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DocumentSheetV2: class DocumentSheetV2Stub {}, DialogV2: class DialogV2Stub {} }, handlebars: { renderTemplate: async () => '' }, ux: { TextEditor: { implementation: { enrichHTML: async v => v } } } };
globalThis.window = globalThis.window ?? { addEventListener: () => {}, removeEventListener: () => {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = globalThis.document ?? { readyState: 'complete', addEventListener: () => {}, removeEventListener: () => {}, activeElement: null };
globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('no registry'); } });
const mk = (key, docs) => { const hydrate = d => ({ ...d, uuid: `Compendium.${key}.Item.${d._id}`, toObject: () => JSON.parse(JSON.stringify(d)) }); return { collection: key, metadata: { id: key, type: 'Item' }, getDocuments: async () => docs.map(hydrate), getDocument: async id => { const d = docs.find(x => x._id === id); return d ? hydrate(d) : null; }, getIndex: async () => docs.map(d => ({ _id: d._id, name: d.name, type: d.type, system: d.system, img: d.img })), index: new Map(docs.map(d => [d._id, d])) }; };
globalThis.game.system = { id: 'foundryvtt-swse' };
globalThis.game.packs = new Map([['foundryvtt-swse.talents', mk('foundryvtt-swse.talents', talents)], ['foundryvtt-swse.talent_trees', mk('foundryvtt-swse.talent_trees', trees)]]);

const H = await import('/systems/foundryvtt-swse/scripts/data/talent-source-identity.js');
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js'); await TalentTreeDB.build();
const { FeatTalentPlanBuilder } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/feat-talent-plan-builder.js');
const { TalentStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js');

const rec = (name, tree) => { const r = talents.filter(t => t.name === name && (!tree || trees.find(tr => tr.system.talentIds.includes(t._id))?.name === tree)); assert.equal(r.length, 1, `${name}|${tree} -> ${r.length}`); return r[0]; };
const treeName = t => trees.find(tr => tr.system.talentIds.includes(t._id)).name;
const v13 = t => `Compendium.foundryvtt-swse.talents.Item.${t._id}`, legacy = t => `Compendium.foundryvtt-swse.talents.${t._id}`;
let seq = 0;
const embedded = (t, sourceId) => ({ ...JSON.parse(JSON.stringify(t)), _id: `EMB${++seq}`, id: `EMB${++seq}`, flags: { ...(t.flags ?? {}), ...(sourceId ? { core: { sourceId } } : {}) } });
const actor = items => ({ id: 'a', type: 'character', system: { abilities: {} }, items, flags: {} });
const leaf = (t, extra = {}) => ({ type: 'talent', uuid: v13(t), name: t.name, ...extra });
const resolve = (l, a, pending = {}) => PrerequisiteChecker._resolvePrerequisiteByUuid(l, 'talent', a, pending);
const check = (l, a, pending = {}) => PrerequisiteChecker._checkTalentCondition(l, a, pending);
const pendingOf = t => TalentStep.prototype._buildCanonicalTalentSelection.call({ _slotType: 'class', _slotKey: () => 'slot-1', _selectedTreeId: null, descriptor: {} }, { ...JSON.parse(JSON.stringify(t)), id: t._id });

let n = 0; const test = async (name, fn) => { await fn(); n++; say('  ok  ' + name); };
const cast = rec('Cast Suspicion');

await test('helper: both UUID spellings name the same talent; v13 is the emitted form; names/slugs are not identity', () => {
  assert.equal(H.canonicalTalentUuid(cast._id), v13(cast)); assert.equal(H.canonicalTalentUuid(legacy(cast)), v13(cast)); assert.equal(H.canonicalTalentUuid(cast), v13(cast));
  assert.equal(H.canonicalTalentId(legacy(cast)), cast._id); assert.equal(H.canonicalTalentId(v13(cast)), cast._id);
  assert.ok(H.sameTalentUuid(legacy(cast), v13(cast)) && H.sameTalentUuid(v13(cast), legacy(cast)));
  assert.equal(H.canonicalTalentUuid('Compendium.other.pack.Item.0123456789abcdef'), null); assert.equal(H.canonicalTalentUuid('Cast Suspicion'), null); assert.equal(H.canonicalTalentUuid('swse.talent.cast_suspicion'), null);
  assert.deepEqual(H.targetIdentityOfLeaf({ id: cast._id }), { uuid: v13(cast), basis: 'compendiumId' }); assert.equal(H.targetIdentityOfLeaf({ id: 'swse.talent.cast_suspicion' }), null);
});
await test('helper: source identity of embedded items (both forms, never the fresh embedded id), stamping preserves unrelated flags', () => {
  assert.equal(H.sourceUuidOfEmbedded(embedded(cast, legacy(cast))), v13(cast)); assert.equal(H.sourceUuidOfEmbedded(embedded(cast, v13(cast))), v13(cast)); assert.equal(H.sourceUuidOfEmbedded(embedded(cast, null)), null);
  const d = H.stampSourceLink({ _id: 'x', flags: { swse: { id: 'swse.talent.x' }, core: { other: 1 } } }, cast._id);
  assert.equal(d.flags.core.sourceId, v13(cast)); assert.equal(d.flags.core.other, 1); assert.equal(d.flags.swse.id, 'swse.talent.x'); assert.equal(d._id, 'x');
});
await test('EMBEDDED canonical copy: a different embedded _id + canonical flags.core.sourceId satisfies a UUID leaf AUTHORITATIVELY (no fallback)', () => {
  const item = embedded(cast, v13(cast)); assert.notEqual(item._id, cast._id);
  const r = resolve(leaf(cast), actor([item])); assert.equal(r.via, 'uuid'); assert.equal(r.authoritative, true); assert.equal(r.fallback, false);
  assert.equal(check(leaf(cast, { name: undefined }), actor([item])).met, true);
});
await test('LEGACY source-link form on an existing snapshot satisfies the v13 leaf, and a legacy-form leaf is satisfied by a v13-stamped item', () => {
  assert.equal(resolve(leaf(cast), actor([embedded(cast, legacy(cast))])).via, 'uuid');
  assert.equal(resolve({ type: 'talent', uuid: legacy(cast), name: cast.name }, actor([embedded(cast, v13(cast))])).via, 'uuid');
});
await test('PENDING: the talent step threads the canonical source identity; a pending canonical talent satisfies the prerequisite BEFORE embedding', () => {
  const sel = pendingOf(cast);
  assert.equal(sel.sourceUuid, v13(cast)); assert.equal(sel.uuid, v13(cast)); assert.equal(sel.flags.core.sourceId, v13(cast)); assert.equal(sel.id, cast._id);
  const r = resolve(leaf(cast), actor([]), { selectedTalents: [sel] }); assert.equal(r.via, 'uuid'); assert.equal(r.source, 'pending'); assert.equal(r.fallback, false);
  assert.equal(check(leaf(cast), actor([]), { selectedTalents: [sel] }).met, true);
  assert.equal(check(leaf(cast), actor([]), { selectedTalents: [] }).met, false);
  // an old-shape pending entry (id only) is still recognised, as a compatibility identity — not by name
  const old = resolve(leaf(cast), actor([]), { selectedTalents: [{ id: cast._id, name: 'Totally Different Label' }] }); assert.equal(old.via, 'compendiumId'); assert.equal(old.authoritative, false); assert.equal(old.fallback, false);
});
await test('FINALIZER: the real plan builder stamps flags.core.sourceId (v13), keeps unrelated flags, and the stamped copy satisfies a UUID prerequisite', async () => {
  const plan = await FeatTalentPlanBuilder.build({ actor: actor([]), selections: { talents: [pendingOf(cast)] }, sessionState: { sessionId: 's1' } });
  assert.equal(plan.items.length, 1); const it = plan.items[0];
  assert.equal(it.flags.core.sourceId, v13(cast)); assert.equal(it.flags.swse.id, cast.flags.swse.id); assert.ok(it.flags.swse.progression, 'progression flags preserved');
  const created = { ...it, _id: 'FOUNDRY_NEW_ID', id: 'FOUNDRY_NEW_ID' }; assert.notEqual(created._id, cast._id);
  assert.equal(resolve(leaf(cast), actor([created])).via, 'uuid');
});
await test('PHASE 3D REPAIRS: the five production-id leaves now succeed at runtime (source-linked embedded copy AND pending), and the migrated UUID form does too', () => {
  const five = [['Fearsome', 'Notorious', 'Bounty Hunter'], ['Ruthless Negotiator', 'Notorious', 'Bounty Hunter'], ['Shared Notoriety', 'Notorious', 'Infamy'], ['Unsavory Reputation', 'Notorious', 'Infamy'], ['Weakening Strike', 'Dastardly Strike', 'Misfortune']];
  for (const [owner, target, tree] of five) {
    const o = rec(owner), tgt = rec(target, tree);
    const cur = o.system.prerequisitesStructured.conditions.find(c => c.type === 'talent' && c.id === tgt._id); assert.ok(cur, `${owner}: the 3D leaf points at ${target}|${tree}`);
    for (const l of [cur, leaf(tgt)]) {
      assert.equal(check(l, actor([embedded(tgt, v13(tgt))])).met, true, `${owner}: embedded`);
      assert.equal(check(l, actor([embedded(tgt, legacy(tgt))])).met, true, `${owner}: legacy source link`);
      assert.equal(check(l, actor([]), { selectedTalents: [pendingOf(tgt)] }).met, true, `${owner}: pending`);
    }
  }
});
await test('SAME-NAME: Find an Opening is satisfied by Outlaw|Seize the Moment and NOT by Provocateur|Seize the Moment (embedded, pending, unlinked legacy copy)', () => {
  const outlaw = rec('Seize the Moment', 'Outlaw'), prov = rec('Seize the Moment', 'Provocateur');
  assert.equal(outlaw._id, 'e19c06b6dfc7a703'); assert.notEqual(prov._id, outlaw._id);
  const l = leaf(outlaw); assert.equal(l.uuid, 'Compendium.foundryvtt-swse.talents.Item.e19c06b6dfc7a703');
  assert.equal(check(l, actor([embedded(outlaw, v13(outlaw))])).met, true);
  assert.equal(check(l, actor([embedded(prov, v13(prov))])).met, false, 'Provocateur copy (stamped) must not satisfy');
  assert.equal(check(l, actor([embedded(prov, legacy(prov))])).met, false, 'Provocateur copy (legacy link) must not satisfy');
  assert.equal(check(l, actor([]), { selectedTalents: [pendingOf(prov)] }).met, false, 'pending Provocateur must not satisfy');
  assert.equal(check(l, actor([]), { selectedTalents: [pendingOf(outlaw)] }).met, true);
  // an UNLINKED legacy copy has no identity; name fallback applies, but a copy in the WRONG tree is still rejected
  assert.equal(check(l, actor([embedded(prov, null)])).met, false, 'unlinked Provocateur copy rejected by tree');
  const fb = resolve(l, actor([embedded(outlaw, null)])); assert.equal(fb.via, 'name'); assert.equal(fb.fallback, true);
});
await test('SAME-NAME (second pair): Bounty Hunter|Notorious is not satisfied by Infamy|Notorious, and vice versa', () => {
  const bh = rec('Notorious', 'Bounty Hunter'), inf = rec('Notorious', 'Infamy');
  assert.equal(check(leaf(bh), actor([embedded(inf, v13(inf))])).met, false); assert.equal(check(leaf(inf), actor([embedded(bh, v13(bh))])).met, false);
  assert.equal(check(leaf(bh), actor([embedded(bh, v13(bh))])).met, true); assert.equal(check(leaf(inf), actor([embedded(inf, v13(inf))])).met, true);
});
await test('DEAD UUID: a nonexistent canonical UUID is never satisfied by a linked same-name talent; with no name it simply fails; fallback is reported', () => {
  const dead = { type: 'talent', uuid: 'Compendium.foundryvtt-swse.talents.Item.deadbeefdeadbeef', name: cast.name };
  assert.equal(check(dead, actor([embedded(cast, v13(cast))])).met, false, 'a different canonical identity is never downgraded to a name match');
  assert.equal(check({ ...dead, name: undefined }, actor([embedded(cast, null)])).met, false, 'no name -> no fallback');
  const fb = resolve(dead, actor([embedded(cast, null)])); assert.equal(fb.via, 'name'); assert.equal(fb.fallback, true); assert.equal(fb.deadOrUnlinkedIdentity, true);
});
await test('LEGACY leaves and text prerequisites behave as before (flag-id leaf on embedded items; text-only talent)', () => {
  assert.equal(resolve({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([embedded(cast, null)])).via, 'id');
  assert.equal(PrerequisiteChecker.checkTalentPrerequisites(actor([]), { name: 'X', system: { prerequisites: 'Cast Suspicion' } }).met, false);
  assert.equal(PrerequisiteChecker.checkTalentPrerequisites(actor([embedded(cast, null)]), { name: 'X', system: { prerequisites: 'Cast Suspicion' } }).met, true);
});
await test('SECOND CONSUMER (normalizer -> snapshot -> evaluator): identity-first there too; uuid-only leaves are no longer dropped; same-name wrong tree rejected', async () => {
  const { normalizeTalentPrerequisites } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-normalizer.js');
  const { buildActorPrerequisiteSnapshot } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js');
  const { evaluatePrerequisites } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-evaluator.js');
  const outlaw = rec('Seize the Moment', 'Outlaw'), prov = rec('Seize the Moment', 'Provocateur');
  const reqs = l => normalizeTalentPrerequisites({ name: 'Owner', system: { prerequisites: '', prerequisitesStructured: { type: 'all', conditions: [l] } } }).normalized;
  const passed = (l, a, pending = {}) => { const r = evaluatePrerequisites(buildActorPrerequisiteSnapshot(a, pending), reqs(l)); return r.met ?? r.passed ?? r.allMet ?? (r.results ? r.results.every(x => x.passed) : undefined); };
  const only = reqs({ type: 'talent', uuid: v13(outlaw) }); assert.equal(only.length, 1, 'a uuid-only leaf produces a requirement'); assert.equal(only[0].uuid, v13(outlaw));
  assert.equal(passed(leaf(outlaw), actor([embedded(outlaw, v13(outlaw))])), true);
  assert.equal(passed(leaf(outlaw), actor([embedded(prov, v13(prov))])), false);
  assert.equal(passed(leaf(outlaw), actor([embedded(prov, legacy(prov))])), false);
  assert.equal(passed(leaf(outlaw), actor([]), { selectedTalents: [pendingOf(outlaw)] }), true);
  assert.equal(passed(leaf(outlaw), actor([]), { selectedTalents: [pendingOf(prov)] }), false);
  assert.equal(passed(leaf(outlaw), actor([embedded(outlaw, null)])), true, 'unlinked legacy copy: name fallback');
  assert.equal(passed(leaf(outlaw), actor([embedded(prov, null)])), false, 'unlinked wrong-tree copy rejected');
});
console.log = say; say(`\n${n} talent-phase-3g runtime identity checks passed`);
