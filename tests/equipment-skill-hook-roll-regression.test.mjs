import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-A1 regression guard for the BEHAVIORAL EXPANSION: EquipmentSkillHookResolver now reaches the production skill roll, so ~all legacy equipment
// skillHooks could change roll totals. This test walks EVERY skillHook in the shipped equipment packs through the real rollSkill and pins exactly which
// ones may change a total (use-specific, plain "modifies", typed equipment, no consumable / required / conditional) and that everything else changes nothing.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.applications ??= {}; globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} };
globalThis.Roll ??= class Roll { constructor(f) { this.formula = String(f); this.total = Number(f); } async evaluate() { return this; } };
globalThis.CONFIG ??= { SWSE: { skills: {} } };
globalThis.ui ??= { notifications: { warn() {}, error() {} } };

const { WeaponAuthorityRegistry, setSharedWeaponAuthorityRegistry } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
setSharedWeaponAuthorityRegistry(new WeaponAuthorityRegistry(JSON.parse(fs.readFileSync(new URL('../data/weapons/canonical-weapon-registry.json', import.meta.url), 'utf8'))));
game.swse ??= {}; game.swse.utils ??= {};
const { rollSkill } = await import('/systems/foundryvtt-swse/scripts/rolls/skills.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const posted = []; SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
let mutations = 0; ActorEngine.updateOwnedItems = async () => { mutations++; };

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const BASE = 7;

// ---- the real shipped equipment records ---------------------------------------------------------------------------------------------------
const docs = [];
for (const f of fs.readdirSync(new URL('../packs', import.meta.url)).filter((x) => /^equipment.*\.db$/.test(x))) {
  for (const line of fs.readFileSync(new URL(`../packs/${f}`, import.meta.url), 'utf8').split('\n')) {
    if (!line.includes('skillHooks')) continue;
    const d = JSON.parse(line);
    if ((d.system?.skillHooks ?? []).length) docs.push({ pack: f, doc: d });
  }
}
assert.ok(docs.length > 20, 'the equipment packs carry skill hooks');

const SKILLS = ['perception', 'treatInjury', 'stealth', 'deception', 'useComputer', 'knowledgeLifeSciences', 'survival', 'mechanics', 'persuasion', 'climb'];
const skillRows = Object.fromEntries(SKILLS.map((k) => [k, { key: k, total: BASE, trained: true, ability: 'wis' }]));
const mkActor = (items) => {
  items.get = (id) => items.find((i) => i.id === id);
  const actor = { id: 'a', name: 'Tester', isOwner: true, items, flags: {}, system: { skills: Object.fromEntries(SKILLS.map((k) => [k, { trained: true }])), derived: { skills: skillRows, identity: { halfLevel: 1 } } } };
  items.forEach((i) => { i.actor = actor; });
  return actor;
};
const owned = (entry, i, equipped = true) => ({ id: `e${i}`, name: entry.doc.name, type: 'equipment', system: { ...structuredClone(entry.doc.system), quantity: 1, equipped } });
const total = async (actor, skill, use, extra = {}) => { const r = await rollSkill(actor, skill, { take10: true, skipEquipmentSkillPrompt: true, ...(use ? { skillUse: use } : {}), ...extra }); return r?.total; };
const BASELINE = 10 + BASE;

// the independent definition of "may change a roll" (kept separate from the implementation)
const normSkill = (s) => ({ treatinjury: 'treatInjury', usecomputer: 'useComputer' }[String(s).toLowerCase()] ?? s);
const eligible = (h) => (h.mode ?? 'modifies') === 'modifies' && !h.consumes && h.required !== true && h.bonus && h.bonus.type === 'equipment' && h.bonus.conditional !== true
  && Number(h.bonus.value) !== 0 && h.useKey && !['all', '*'].includes(h.useKey) && h.bonus.appliesWhenChosen !== true;

let eligibleCount = 0, inertCount = 0;
const hookRows = [];
docs.forEach((entry, i) => { for (const h of entry.doc.system.skillHooks) if (h.bonus && Number.isFinite(Number(h.bonus.value))) hookRows.push({ entry, i, h }); });

// 1. each numeric hook, alone, against its own use: changes the total by exactly its value iff eligible
for (const { entry, i, h } of hookRows) {
  const skill = normSkill(h.skill);
  if (!SKILLS.includes(skill)) continue;
  const needsEquipped = h.bonus.requiresEquipped === true || h.requiresEquipped === true;
  const use = { key: h.useKey === 'all' ? 'some-use' : h.useKey };
  const equippedTotal = await total(mkActor([owned(entry, i, true)]), skill, use);
  if (eligible(h)) {
    eligibleCount++;
    assert.equal(equippedTotal - BASELINE, Number(h.bonus.value), `${entry.doc.name} / ${h.useKey}: equipped, its own use`);
    if (needsEquipped) assert.equal(await total(mkActor([owned(entry, i, false)]), skill, use) - BASELINE, 0, `${entry.doc.name}: requires equipped but is not`);
    assert.equal(await total(mkActor([owned(entry, i, true)]), skill, { key: 'an-unrelated-use' }) - BASELINE, 0, `${entry.doc.name}: an unrelated use`);
    assert.equal(await total(mkActor([owned(entry, i, true)]), skill, null) - BASELINE, 0, `${entry.doc.name}: a plain check of the skill`);
  } else {
    inertCount++;
    assert.equal(equippedTotal - BASELINE, 0, `${entry.doc.name} / ${h.useKey} (${h.mode}, ${h.bonus.type}${h.consumes ? ', consumable' : ''}${h.required ? ', required' : ''}): must NOT change a roll`);
  }
}
assert.ok(eligibleCount >= 20 && inertCount >= 5, `representative coverage: ${eligibleCount} eligible, ${inertCount} inert hooks exercised`);
ok(`every shipped numeric skill hook (${eligibleCount} eligible, ${inertCount} inert) changes a roll exactly when, and only when, it is eligible`);

// 2. a character carrying EVERY shipped equipment item: ordinary checks are unchanged
{
  const items = docs.map((e, i) => owned(e, i, true));
  const actor = mkActor(items);
  for (const skill of SKILLS) {
    assert.equal(await total(actor, skill, null) - BASELINE, 0, `plain ${skill} check with all gear`);
    assert.equal(await total(actor, skill, { key: 'an-unrelated-use' }) - BASELINE, 0, `unrelated ${skill} use with all gear`);
    assert.equal(await total(actor, skill, { key: 'all' }) - BASELINE, 0, `a use literally named "all" is not a wildcard`);
  }
}
ok('a character carrying every shipped equipment item keeps identical totals on ordinary and unrelated checks');

// 3. typed stacking across the real data: per (skill, use) the best eligible equipment bonus applies, never the sum
{
  const groups = new Map();
  docs.forEach((e, i) => e.doc.system.skillHooks.forEach((h) => { if (eligible(h) && SKILLS.includes(normSkill(h.skill))) { const k = `${normSkill(h.skill)}|${h.useKey}`; (groups.get(k) ?? groups.set(k, []).get(k)).push({ e, i, h }); } }));
  let stacked = 0;
  for (const [k, list] of groups) {
    const [skill, useKey] = k.split('|');
    const actor = mkActor(list.map(({ e, i }) => owned(e, i, true)));
    const best = Math.max(...list.map(({ h }) => Number(h.bonus.value)));
    assert.equal(await total(actor, skill, { key: useKey }) - BASELINE, best, `${k}: ${list.length} items, best equipment bonus only`);
    if (list.length > 1) stacked++;
  }
  ok(`equipment bonuses never stack across the real data (${groups.size} skill/use groups, ${stacked} with several items)`);
}

// 4. no mutation, no consumption, no training override from merely rolling with gear
{
  mutations = 0;
  const items = docs.map((e, i) => owned(e, i, true));
  const before = JSON.stringify(items.map((i) => i.system.quantity));
  const actor = mkActor(items);
  for (const skill of SKILLS) for (const use of [null, { key: 'first-aid' }, { key: 'improve-access' }, { key: 'treat-poison' }]) await total(actor, skill, use);
  assert.equal(mutations, 0, 'rolling never mutates inventory');
  assert.equal(JSON.stringify(items.map((i) => i.system.quantity)), before, 'no consumable was consumed');
  const src = fs.readFileSync(new URL('../scripts/rolls/skills.js', import.meta.url), 'utf8');
  assert.ok(!/trainingOverride|consumeEquipmentForSkillUse|missingRequirements|\.blocked\b/.test(src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')), 'the roll consumes only the modifier list, never training overrides / requirements / consumption');
}
ok('merely rolling with gear never consumes, mutates, blocks or grants training');

// 5. the derived skill total is the only base: nothing else reads skillHooks
{
  const hits = [];
  const walk = (dir) => { for (const e of fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) walk(p); else if (p.endsWith('.js') && /skillHooks|equipment-skill-hook-resolver/.test(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))) hits.push(p); } };
  walk('scripts');
  const allowed = ['scripts/engine/equipment/equipment-skill-hook-resolver.js', 'scripts/engine/equipment/equipment-normalizer.js', 'scripts/rolls/skills.js', 'scripts/items/equipment-data-resolver.js', 'scripts/items/item-defaults.js'];
  const unexpected = hits.filter((p) => !allowed.includes(p) && !p.startsWith('scripts/engine/suggestion/'));
  assert.deepEqual(unexpected, [], 'no derived-total / modifier-engine path reads skillHooks, so the roll cannot double count them');
}
ok('no derived-total path reads skillHooks: a hook is counted once, by the roll');

// 6. three-state context for the weapon-scoped hooks: unknown is not false
{
  const ryyk = { id: 'r1', name: 'Ryyk Blade', type: 'weapon', system: { quantity: 1 }, flags: { swse: { canonicalWeapon: { identityKey: 'weapon-wookiee-ryyk-blade' } } } };
  const feat = { id: 'f1', name: 'Exotic Weapon Proficiency (Ryyk Blade)', type: 'feat', system: {}, flags: { swse: { choices: { weaponProficiency: { weaponIdentity: 'weapon-wookiee-ryyk-blade' } } } } };
  const actor = mkActor([ryyk, feat]);
  const use = { key: 'basic-survival' };
  const run = async (extra) => { posted.length = 0; const t = await total(actor, 'survival', use, extra); return { delta: t - BASELINE, notes: posted[0]?.flags?.swse?.equipmentSkillNotes ?? [] }; };
  const unknown = await run({}), isFalse = await run({ terrain: 'desert' }), isTrue = await run({ terrain: 'forest' });
  assert.equal(unknown.delta, 0); assert.equal(unknown.notes.length, 1, 'UNKNOWN terrain is reported to the player');
  assert.equal(isFalse.delta, 0); assert.equal(isFalse.notes.length, 0, 'FALSE terrain (stated) needs no note');
  assert.equal(isTrue.delta, 2); assert.equal(isTrue.notes.length, 0);
}
ok('terrain is TRUE / FALSE / UNKNOWN: unknown applies nothing and is reported, false is silent, true applies');

console.log(`Equipment skill-hook roll regression: ${n} checks passed.`);
