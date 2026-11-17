import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const { registerFoundryPathLoader } = await import(u('tests/helpers/foundry-shim/register.mjs'));
const { installFoundryShimGlobals } = await import(u('tests/helpers/foundry-shim/globals.mjs'));
registerFoundryPathLoader(); installFoundryShimGlobals({ game: { items: [] } });
globalThis.fetch = async (url) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(ROOT, String(url).replace('/systems/foundryvtt-swse/', '')), 'utf8')) });
const { IdentityEngine } = await import(u('scripts/engine/prestige/identity-engine.js'));
await IdentityEngine.initialize();

const feat = (name, rules, over = {}) => ({ id: `id-${name}`, type: 'feat', name, system: { rules, ...(over.system || {}) }, flags: over.flags || {} });
const actor = (items = [], skills = {}, attrs = {}) => ({ items, system: { skills, attributes: attrs } });
const bias = (a) => IdentityEngine.computeObservedBehaviorBias(a).mechanicalBias;
const prov = (a) => IdentityEngine.computeObservedBehaviorBiasProvenance(a);

test('SV-14/MC-19 an always-active, target-specific rule on an owned feat yields exact provenance: item id, type, canonical id, rule type', () => {
  const a = actor([feat('Weapon Focus', [{ type: 'attackBonus', target: 'melee', value: 1 }], { flags: { swse: { canonicalFeat: { canonicalId: 'feat.wf' } } } })]);
  assert.ok(bias(a).accuracy > 0, 'the existing scorer sees it');
  const p = prov(a);
  assert.deepEqual(p.items.accuracy, [{ itemId: 'id-Weapon Focus', type: 'feat', name: 'Weapon Focus', canonicalId: 'feat.wf', certified: true, ruleType: 'attackBonus', specificity: 'target' }]);
  assert.ok(p.snapshot);
});

test('MC-19 conditional rules fail closed: they score, but they do not authorize a claim', () => {
  const a = actor([feat('Situational', [{ type: 'attackBonus', target: 'melee', value: 1, when: { type: 'condition', condition: 'flanking' } }])]);
  assert.ok(bias(a).accuracy > 0, 'ranking still sees the weighted contribution');
  const p = prov(a); assert.equal(p.items.accuracy, undefined); assert.equal(p.excluded.conditional, 1);
});

test('MC-19 generic-default mappings are not proof: an unmapped target or any skillId rule is excluded', () => {
  const a = actor([feat('Odd Target', [{ type: 'attackBonus', target: 'thrown', value: 1 }]), feat('Any Skill', [{ type: 'skillModifier', skillId: 'whatever', value: 2 }])]);
  const p = prov(a); assert.deepEqual(p.items, {}); assert.ok(p.excluded.defaultMapping >= 2);
});

test('MC-19 disabled items and featGrant recursion are not followed', () => {
  const a = actor([feat('Off', [{ type: 'attackBonus', target: 'melee', value: 1 }], { system: { disabled: true } }), feat('Granter', [{ type: 'featGrant', featName: 'Elsewhere' }])]);
  const p = prov(a); assert.deepEqual(p.items, {}); assert.equal(p.excluded.disabled, 1);
});

test('MC-19 a duplicated primitive on one item counts once', () => {
  const rule = { type: 'attackBonus', target: 'ranged', value: 1 };
  assert.equal(prov(actor([feat('Twice', [rule, rule])])).items.accuracy.length, 1);
});

test('MC-19 skills: only an explicitly mapped trained skill counts; Skill Focus is recorded; untrained and default-mapped skills are not proof', () => {
  const a = actor([feat('Skill Focus (Persuasion)', [])], { persuasion: { trained: true }, mechanics: { trained: false }, knowledgeTechnology: { trained: true } });
  const p = prov(a);
  assert.deepEqual(p.skills.persuasionMastery, [{ skillKey: 'persuasion', canonicalId: 'skill:persuasion', trained: true, skillFocus: true }]);
  assert.equal(p.skills.skillUtility, undefined, 'the generic default key is never evidence');
  assert.equal(Object.values(p.skills).flat().some((s) => s.skillKey === 'mechanics'), false);
  assert.ok(p.excluded.defaultMapping >= 1, 'a trained skill that only reaches the generic default is excluded');
});

test('MC-19 ability-only contributions are tendencies, never evidence of past training', () => {
  const p = prov(actor([], {}, { str: { total: 18 }, dex: { total: 16 } }));
  assert.ok(Object.keys(p.attributes).length > 0); assert.deepEqual(p.items, {}); assert.deepEqual(p.skills, {});
});

test('MC-19 stale evidence changes the snapshot reference: the Q2 context invalidates, nothing is carried over', () => {
  const a1 = actor([feat('Weapon Focus', [{ type: 'attackBonus', target: 'melee', value: 1 }])]); const a2 = actor([]);
  assert.notEqual(prov(a1).snapshot, prov(a2).snapshot);
  assert.equal(prov(a1).snapshot, prov(actor([feat('Weapon Focus', [{ type: 'attackBonus', target: 'melee', value: 1 }])])).snapshot, 'deterministic');
});

test('MC-19 provenance is separate from scoring: the observed bias output is unchanged by the provenance accessor', () => {
  const a = actor([feat('Weapon Focus', [{ type: 'attackBonus', target: 'melee', value: 1 }])], { persuasion: { trained: true } });
  const before = JSON.stringify(bias(a)); prov(a); assert.equal(JSON.stringify(bias(a)), before);
});
