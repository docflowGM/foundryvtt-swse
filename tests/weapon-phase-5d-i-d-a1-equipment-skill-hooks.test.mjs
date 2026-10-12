import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-A1: weapon-carried and equipment skill-use modifiers reach the REAL production skill roll (scripts/rolls/skills.js#rollSkill ->
// RollCore) through the one existing authority (EquipmentSkillHookResolver). Take-10 rolls keep the final total deterministic: total = 10 + base + modifiers.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.applications ??= {}; globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} };
globalThis.Roll ??= class Roll { constructor(f) { this.formula = String(f); this.total = Number(f); } async evaluate() { return this; } };
globalThis.CONFIG ??= { SWSE: { skills: { stealth: { label: 'Stealth', ability: 'dex' }, survival: { label: 'Survival', ability: 'wis' } } } };
const warnings = [];
globalThis.ui ??= { notifications: { warn: (m) => warnings.push(m), error: (m) => warnings.push(m) } };

const { WeaponAuthorityRegistry, setSharedWeaponAuthorityRegistry } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
setSharedWeaponAuthorityRegistry(new WeaponAuthorityRegistry(JSON.parse(fs.readFileSync(new URL('../data/weapons/canonical-weapon-registry.json', import.meta.url), 'utf8'))));
game.swse ??= {}; game.swse.utils ??= {};
const { rollSkill } = await import('/systems/foundryvtt-swse/scripts/rolls/skills.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { SWSERollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/rolls/swse-roll-engine.js');
const { resolveEquipmentForSkillUse, getEquipmentSkillHooks, resolveSkillModifiersFromHooks, WEAPON_SKILL_HOOK_SPECS } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-skill-hook-resolver.js');

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const posted = [];
SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };

const BASE = 10; // derived Stealth / Survival total in the fixture (the roll must add modifiers on top of it, never inside it)
const weapon = (id, identityKey, extra = {}) => ({ id, name: `Item ${id}`, type: 'weapon', system: { quantity: 1, ...(extra.system ?? {}) }, flags: { swse: { canonicalWeapon: { identityKey } } } });
const gear = (id, hooks, extra = {}) => ({ id, name: `Gear ${id}`, type: 'equipment', system: { quantity: 1, equipped: true, skillHooks: hooks, ...(extra.system ?? {}) } });
const mkActor = (items, system = {}) => {
  items.get = (id) => items.find((i) => i.id === id);
  items.forEach((i) => { i.actor = null; });
  const actor = { id: 'a', name: 'Tester', isOwner: true, items, flags: {}, system: { skills: { stealth: { trained: true }, survival: { trained: true } }, derived: { skills: { stealth: { key: 'stealth', total: BASE, trained: true, ability: 'dex' }, survival: { key: 'survival', total: BASE, trained: true, ability: 'wis' } }, identity: { halfLevel: 1 } }, ...system } };
  items.forEach((i) => { i.actor = actor; });
  return actor;
};
const CONCEAL = { key: 'conceal-item-on-self', label: 'Conceal item on self', application: 'Conceal item on self (standard)' };
const SNIPE = { key: 'snipe', label: 'Snipe', application: 'Snipe (from hiding, standard+move)' };
const SURVIVAL = { key: 'basic-survival', label: 'Basic survival', application: 'Basic survival (24h)' };
const roll = async (actor, skill, use, extra = {}) => {
  posted.length = 0;
  const r = await rollSkill(actor, skill, { skillUse: use, take10: true, skipEquipmentSkillPrompt: true, ...extra });
  return { total: r?.total, ctx: posted[0]?.context, flags: posted[0]?.flags?.swse };
};
const delta = async (actor, skill, use, extra) => (await roll(actor, skill, use, extra)).total - (10 + BASE + 0);

// 1. concealing THIS weapon: +5 equipment, through the real roll; no item context / another item -> nothing
{
  const holdOut = weapon('w1', 'weapon-hold-out-blaster-pistol'), stunner = weapon('w2', 'unmapped::Contact Stunner');
  const a = mkActor([holdOut, stunner]);
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'w1' }), 5);
  const r = await roll(a, 'stealth', CONCEAL, { hookItemId: 'w1' });
  assert.equal(r.ctx.equipmentSkillBonus, 5);
  assert.deepEqual(r.ctx.equipmentSkillModifiers.map((m) => [m.itemId, m.value, m.type]), [['w1', 5, 'equipment']]);
  assert.equal(await delta(a, 'stealth', CONCEAL, {}), 0, 'no item context -> no bonus');
  assert.ok((await roll(a, 'stealth', CONCEAL, {})).flags.equipmentSkillNotes.length >= 1, 'the player is told what was not applied');
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'not-a-weapon-here' }), 0);
  assert.equal(await delta(a, 'stealth', { key: 'hide-sneak', label: 'Hide', application: 'Hide / sneak' }, { hookItemId: 'w1' }), 0, 'the concealment bonus is not a general Stealth bonus');
  assert.equal(await delta(a, 'stealth', null, { hookItemId: 'w1' }), 0, 'a plain Stealth check gets nothing');
}
ok('Hold-out pistol: +5 only when it is the object being concealed, never for another item / no context / other Stealth uses');

// 2. a different item's concealment bonus is never awarded; two equipment bonuses do not stack
{
  const a = mkActor([weapon('w1', 'weapon-hold-out-blaster-pistol'), weapon('w2', 'unmapped::Contact Stunner'), weapon('w3', 'weapon-snap-shot-blaster-pistol')]);
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'w2' }), 5, 'only the concealed weapon\'s +5, not 3 x +5');
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'x' }), 0);
}
ok('carrying several concealable weapons never adds their bonuses together');

// 3. Ascension Gun: the -5 penalty survives equipment-bonus selection and stacks with other typed bonuses
{
  const asc = weapon('g1', 'weapon-ascension-gun');
  const a = mkActor([asc]);
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'g1' }), -5);
  const r = await roll(a, 'stealth', CONCEAL, { hookItemId: 'g1' });
  assert.deepEqual(r.ctx.equipmentSkillModifiers.map((m) => [m.type, m.value]), [['penalty', -5]]);
  // legacy gear +2 equipment bonus to concealing: the penalty is NOT dropped by the "best equipment bonus" rule, and does not erase the bonus
  const sleeve = gear('e1', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 2 } }]);
  const b = mkActor([asc, sleeve]);
  assert.equal(await delta(b, 'stealth', CONCEAL, { hookItemId: 'g1' }), -3, '+2 equipment and -5 penalty both count');
  assert.equal(await delta(b, 'stealth', CONCEAL, { hookItemId: 'other' }), 2, 'legacy gear is not item-scoped; the weapon penalty needs its own item');
}
ok('Ascension Gun -5 is a real penalty: kept alongside equipment bonuses, only for the weapon being concealed');

// 4. stacking semantics: equipment best-only, untyped stacks (Defender is "+5 bonus", not "equipment bonus")
{
  const def = weapon('d1', 'weapon-defender-microblaster'), hold = weapon('w1', 'weapon-hold-out-blaster-pistol');
  const eq5 = gear('e5', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 5 } }]);
  const a = mkActor([def, hold, eq5]);
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'w1' }), 5, 'equipment +5 (weapon) and equipment +5 (gear) do not stack');
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'd1' }), 10, 'Defender\'s +5 is an undescribed (untyped) bonus: it stacks with the best equipment bonus (Core Rulebook p.241)');
  const plain = gear('p1', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'untyped', value: 2 } }]);
  assert.equal(await delta(mkActor([hold, plain]), 'stealth', CONCEAL, { hookItemId: 'w1' }), 7, 'a genuinely untyped legacy bonus still stacks with the best equipment bonus');
  const st = resolveEquipmentForSkillUse(a, CONCEAL, { skill: 'stealth', context: { hookItemId: 'w1' } });
  assert.ok(st.skippedSkillModifiers.some((s) => s.reason === 'superseded-equipment-bonus'), 'the losing equipment bonus is reported, not silently dropped');
}
ok('equipment bonuses take the best one, genuinely untyped bonuses stack, losers are reported');

// 5. Magna Caster: only the sniping use, only the sniping weapon
{
  const mag = weapon('m1', 'weapon-magna-caster'), hold = weapon('w1', 'weapon-hold-out-blaster-pistol');
  const a = mkActor([mag, hold]);
  assert.equal(await delta(a, 'stealth', SNIPE, { hookItemId: 'm1' }), 5);
  assert.equal(await delta(a, 'stealth', SNIPE, { hookItemId: 'w1' }), 0, 'sniping with another weapon');
  assert.equal(await delta(a, 'stealth', SNIPE, {}), 0, 'no weapon named');
  assert.equal(await delta(a, 'stealth', CONCEAL, { hookItemId: 'm1' }), 0, 'the sniping bonus is not a concealment bonus');
}
ok('Magna Caster +5 applies to the Snipe use with that weapon only');

// 6. Wookiee Ryyk Blade: carried + proficient + forest/jungle + the Basic Survival use
{
  const ryyk = weapon('r1', 'weapon-wookiee-ryyk-blade');
  const proficientFeat = { id: 'f1', name: 'Exotic Weapon Proficiency (Ryyk Blade)', type: 'feat', system: {}, flags: { swse: { choices: { weaponProficiency: { weaponIdentity: 'weapon-wookiee-ryyk-blade' } } } } };
  const a = mkActor([ryyk, proficientFeat]);
  assert.equal(await delta(a, 'survival', SURVIVAL, { terrain: 'forest' }), 2);
  assert.equal(await delta(a, 'survival', SURVIVAL, { terrain: 'jungle' }), 2);
  assert.equal(await delta(a, 'survival', SURVIVAL, { terrain: 'desert' }), 0, 'wrong terrain');
  assert.equal(await delta(a, 'survival', SURVIVAL, {}), 0, 'terrain not stated');
  assert.equal(await delta(a, 'survival', { key: 'track', label: 'Track', application: 'Track' }, { terrain: 'forest' }), 0, 'other Survival uses');
  const unproficient = mkActor([weapon('r1', 'weapon-wookiee-ryyk-blade')]);
  assert.equal(await delta(unproficient, 'survival', SURVIVAL, { terrain: 'forest' }), 0, 'not proficient');
  const sold = mkActor([{ ...weapon('r1', 'weapon-wookiee-ryyk-blade'), system: { quantity: 0 } }, proficientFeat]);
  assert.equal(await delta(sold, 'survival', SURVIVAL, { terrain: 'forest' }), 0, 'not carried (quantity 0)');
  const wookiee = mkActor([weapon('r1', 'weapon-wookiee-ryyk-blade')], { proficiencies: { weapon: { 'advanced-melee': true } }, species: 'Wookiee' });
  assert.equal(await delta(wookiee, 'survival', SURVIVAL, { terrain: 'forest' }), 2, 'the Wookiee advanced-melee route (species override) counts');
}
ok('Ryyk Blade +2: needs the Basic Survival use, forest/jungle, proficiency (incl. the Wookiee route) and being carried');

// 7. unavailable gear, legacy equipment and legacy (non-canonical) weapons
{
  const empty = weapon('w1', 'weapon-hold-out-blaster-pistol', { system: { quantity: 0 } });
  assert.equal(await delta(mkActor([empty]), 'stealth', CONCEAL, { hookItemId: 'w1' }), 0, 'quantity 0 grants nothing');
  const legacy = { id: 'l1', name: 'Hold-out Blaster Pistol', type: 'weapon', system: { quantity: 1 }, flags: {} };
  assert.equal(await delta(mkActor([legacy]), 'stealth', CONCEAL, { hookItemId: 'l1' }), 0, 'identity comes from the canonical stamp, never from the display name');
  const unequippedRequired = gear('e1', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 3, requiresEquipped: true } }], { system: { equipped: false } });
  assert.equal(await delta(mkActor([unequippedRequired]), 'stealth', CONCEAL, {}), 0, 'requires-equipped gear that is not equipped');
  const legacyGear = gear('e2', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 3 } }]);
  assert.equal(await delta(mkActor([legacyGear]), 'stealth', CONCEAL, {}), 3, 'legacy equipment hooks now reach the roll');
  const conditional = gear('e3', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 3, conditional: true } }]);
  assert.equal(await delta(mkActor([conditional]), 'stealth', CONCEAL, {}), 0, 'conditional bonuses stay unapplied');
  const stamped = weapon('s1', 'weapon-not-in-the-registry');
  assert.equal(await delta(mkActor([stamped]), 'stealth', CONCEAL, { hookItemId: 's1' }), 0, 'an unknown stamp derives no hook');
}
ok('unavailable / legacy-named / unknown-identity items grant nothing; legacy equipment hooks apply once');

// 8. no double counting + provenance agrees with the final total
{
  const hold = weapon('w1', 'weapon-hold-out-blaster-pistol');
  const without = mkActor([]); const withW = mkActor([hold]);
  const a = await roll(without, 'stealth', CONCEAL, { hookItemId: 'w1' });
  const b = await roll(withW, 'stealth', CONCEAL, { hookItemId: 'w1' });
  assert.equal(a.total, 10 + BASE);
  assert.equal(b.total - a.total, 5, 'the derived total is untouched: owning the weapon changes the roll by exactly the modifier');
  assert.equal(b.ctx.baseBonus, BASE, 'the displayed Base excludes the gear modifier, which the card lists separately');
  const provenanceSum = b.ctx.equipmentSkillModifiers.reduce((s, m) => s + m.value, 0);
  assert.equal(provenanceSum, b.ctx.equipmentSkillBonus);
  assert.equal(b.total, 10 + b.ctx.baseBonus + provenanceSum, 'final total = take-10 + displayed Base + the listed modifiers');
  const parts = SWSERollEngine._buildParts({ roll: { total: b.total }, context: b.ctx, breakdown: [], d20: null, category: 'skill' });
  const shown = parts.filter((p) => p.kind === 'bonus').reduce((sum, p) => sum + Number(String(p.value).replace('+', '')), 0);
  assert.equal(shown, b.ctx.baseBonus + provenanceSum, 'the card\'s displayed bonus lines add up to the rolled bonus');
  assert.ok(parts.some((p) => /Gear: /.test(p.label) && Number(String(p.value).replace('+', '')) === 5), 'the card names the gear and its value');
  const rolled = await roll(withW, 'stealth', CONCEAL, { hookItemId: 'w1', customModifier: 2 });
  assert.equal(rolled.total, 10 + BASE + 2 + 5);
}
ok('final total, displayed base and modifier provenance agree; the derived total never includes the hook');

// 9. the chat breakdown shows the modifier
{
  const src = fs.readFileSync(new URL('../scripts/engine/rolls/swse-roll-engine.js', import.meta.url), 'utf8');
  assert.ok(src.includes('equipmentSkillModifiers') && src.includes('Gear: '));
}
ok('the holo roll breakdown lists the equipment modifier with its source');

// 10. stacking function + specs are data-driven (no names)
{
  const specs = WEAPON_SKILL_HOOK_SPECS.map((s) => s.key);
  assert.deepEqual(specs.sort(), ['concealmentEquipmentBonus', 'concealmentStealthBonus', 'concealmentStealthPenalty', 'snipingStealthEquipmentBonus', 'survivalBasicForestJungleBonusWhenProficientAndCarried']);
  const src = fs.readFileSync(new URL('../scripts/engine/equipment/equipment-skill-hook-resolver.js', import.meta.url), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
  assert.ok(!/(Hold-out|Contact Stunner|Ascension|Magna|Ryyk|Defender|weapon-hold|weapon-ascension)/i.test(code), 'no weapon name or identity literal in resolver code');
  const hooks = getEquipmentSkillHooks(mkActor([weapon('w1', 'weapon-hold-out-blaster-pistol')]), { skill: 'stealth' });
  assert.equal(hooks.length, 1); assert.equal(hooks[0].origin, 'canonical-weapon');
  assert.deepEqual(resolveSkillModifiersFromHooks([], {}), { modifiers: [], total: 0, skipped: [] });
}
ok('hooks derive from registry operation keys by canonical identity; no weapon names in code');

// 11. the guarded prompt supplies the item; an unanswered prompt applies nothing
{
  const a = mkActor([weapon('w1', 'weapon-hold-out-blaster-pistol')]);
  let prompts = 0;
  globalThis.Dialog = { prompt: async () => { prompts++; return { hookItemId: 'w1', terrain: null }; } };
  posted.length = 0;
  let r = await rollSkill(a, 'stealth', { skillUse: CONCEAL, take10: true });
  assert.equal(prompts, 1); assert.equal(r.total, 10 + BASE + 5, 'the answered prompt names the item');
  globalThis.Dialog = { prompt: async () => null };
  r = await rollSkill(a, 'stealth', { skillUse: CONCEAL, take10: true });
  assert.equal(r.total, 10 + BASE, 'an unanswered prompt is never a guess');
  globalThis.Dialog = { prompt: async () => { throw new Error('closed'); } };
  r = await rollSkill(a, 'stealth', { skillUse: CONCEAL, take10: true });
  assert.equal(r.total, 10 + BASE);
  delete globalThis.Dialog;
}
ok('the owner is asked which item the check concerns; closing the prompt applies nothing');

// 12. mutation safety: the consumable path no longer calls item.update()
{
  const src = fs.readFileSync(new URL('../scripts/engine/equipment/equipment-skill-hook-resolver.js', import.meta.url), 'utf8');
  assert.ok(!/item\.update\(|item\.update\?\.\(/.test(src.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n')));
  assert.ok(src.includes('ActorEngine.updateOwnedItems'));
}
ok('inventory mutation in the resolver goes through ActorEngine');

console.log(`Weapon 5D-I-D-A1 equipment skill hooks: ${n} checks passed.`);

// ======================= review corrections (PR #1022) =======================
const section = (m) => console.log(`  -- ${m}`);
{ // Blocker 1: a real EQUIPMENT item with quantity 0 grants nothing (normalizeEquipmentSystem clamps quantity to >= 1, so availability must use the owned quantity)
  const hook = [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 3 } }];
  const zero = gear('z1', hook, { system: { quantity: 0 } });
  assert.equal(await delta(mkActor([zero]), 'stealth', CONCEAL, {}), 0, 'equipment with quantity 0 grants no bonus');
  const negative = gear('z2', hook, { system: { quantity: -2 } });
  assert.equal(await delta(mkActor([negative]), 'stealth', CONCEAL, {}), 0, 'negative quantity grants no bonus');
  const missing = gear('z3', hook); delete missing.system.quantity;
  assert.equal(await delta(mkActor([missing]), 'stealth', CONCEAL, {}), 3, 'an unspecified quantity still means one');
  const three = gear('z4', hook, { system: { quantity: 3 } });
  assert.equal(await delta(mkActor([three]), 'stealth', CONCEAL, {}), 3, 'quantity 3 grants the bonus once');
  const weaponZero = weapon('wz', 'weapon-hold-out-blaster-pistol', { system: { quantity: 0 } });
  assert.equal(await delta(mkActor([weaponZero]), 'stealth', CONCEAL, { hookItemId: 'wz' }), 0, 'weapon with quantity 0 grants no bonus');
}
ok('zero / negative quantity equipment and weapons grant nothing; an unspecified quantity still means one');

{ // Blocker 2: the card reconciles with a derived total, a custom modifier, a feat bonus, an equipment bonus and a penalty -- every modifier shown exactly once
  const featItem = { id: 'ft1', name: 'Test Stealth Feat', type: 'feat', system: { abilityMeta: { skillCheckBonuses: [{ id: 'ft-stealth', skill: 'stealth', value: 3 }] } } };
  const cases = [
    { items: [weapon('w1', 'weapon-hold-out-blaster-pistol'), featItem], hook: 'w1', custom: 2, gear: 5 },
    { items: [weapon('g1', 'weapon-ascension-gun'), featItem], hook: 'g1', custom: 2, gear: -5 },
    { items: [weapon('g1', 'weapon-ascension-gun'), weapon('w1', 'weapon-hold-out-blaster-pistol'), featItem], hook: 'g1', custom: -1, gear: -5 },
    { items: [weapon('w1', 'weapon-hold-out-blaster-pistol')], hook: 'w1', custom: 0, gear: 5 },
  ];
  for (const c of cases) {
    const a = mkActor(c.items.map((i) => structuredClone(i)));
    const featTotal = c.items.some((i) => i.id === 'ft1') ? 3 : 0;
    const r = await roll(a, 'stealth', CONCEAL, { hookItemId: c.hook, customModifier: c.custom });
    const bonusOnTheRoll = r.total - 10; // take-10: the d20 is the constant 10
    assert.equal(bonusOnTheRoll, BASE + c.custom + featTotal + c.gear, 'the roll math itself is unchanged');
    const parts = SWSERollEngine._buildParts({ roll: { total: r.total }, context: r.ctx, breakdown: [], d20: null, category: 'skill' });
    const shown = parts.filter((p) => p.kind === 'bonus').reduce((s, p) => s + Number(String(p.value).replace('+', '')), 0);
    assert.equal(shown, bonusOnTheRoll, `card lines add up to the rolled bonus: ${JSON.stringify(parts.filter((p) => p.kind === 'bonus').map((p) => [p.label, p.value]))}`);
    const labels = parts.filter((p) => p.kind === 'bonus').map((p) => p.label);
    assert.equal(labels.filter((l) => /Test Stealth Feat/.test(l)).length, featTotal ? 1 : 0, 'the feat is listed once');
    assert.equal(labels.filter((l) => /^Modifier$/.test(l)).length, c.custom ? 1 : 0, 'the custom modifier is listed once');
    assert.equal(labels.filter((l) => /^Gear: /.test(l)).length, 1, 'the gear modifier is listed once');
    assert.equal(r.ctx.baseBonus, BASE, 'Base is the derived total only');
  }
}
ok('roll card reconciles exactly with derived + custom + feat + equipment bonus / penalty, each modifier shown once');

{ // Correction 3: the prompt escapes editable text and validates what it returns
  const evil = weapon('e1', 'weapon-hold-out-blaster-pistol');
  evil.name = '<img src=x onerror=alert(1)> "Pistol" & Co';
  const other = weapon('e2', 'unmapped::Contact Stunner');
  const a = mkActor([evil, other]);
  let html = '';
  globalThis.Dialog = { prompt: async ({ content }) => { html = content; return { hookItemId: 'e1', terrain: null }; } };
  let r = await rollSkill(a, 'stealth', { skillUse: CONCEAL, take10: true });
  assert.ok(!/<img/i.test(html) && !html.includes('onerror=alert') || html.includes('&lt;img'), 'item names are escaped in the dialog markup');
  assert.ok(html.includes('&lt;img') && html.includes('&quot;Pistol&quot;') && html.includes('&amp; Co'), html);
  assert.equal(r.total, 10 + BASE + 5, 'a valid answer applies the named item');
  globalThis.Dialog = { prompt: async () => ({ hookItemId: 'not-an-eligible-item', terrain: 'desert<script>' }) };
  r = await rollSkill(a, 'stealth', { skillUse: CONCEAL, take10: true });
  assert.equal(r.total, 10 + BASE, 'an item id that is not one of the offered candidates is rejected');
  globalThis.Dialog = { prompt: async () => ({ hookItemId: 'e1', terrain: null }) };
  const ryyk = mkActor([weapon('r1', 'weapon-wookiee-ryyk-blade'), { id: 'f1', name: 'Exotic Weapon Proficiency (Ryyk Blade)', type: 'feat', system: {}, flags: { swse: { choices: { weaponProficiency: { weaponIdentity: 'weapon-wookiee-ryyk-blade' } } } } }]);
  globalThis.Dialog = { prompt: async () => ({ hookItemId: null, terrain: 'desert' }) };
  r = await rollSkill(ryyk, 'survival', { skillUse: SURVIVAL, take10: true });
  assert.equal(r.total, 10 + BASE, 'a terrain that is not one of the offered options is not accepted');
  globalThis.Dialog = { prompt: async () => ({ hookItemId: null, terrain: 'jungle' }) };
  r = await rollSkill(ryyk, 'survival', { skillUse: SURVIVAL, take10: true });
  assert.equal(r.total, 10 + BASE + 2, 'an offered terrain is accepted');
  delete globalThis.Dialog;
}
ok('the context prompt escapes item names and rejects an unoffered item id or terrain');

{ // Defender Microblaster: CWCG p.62 "+5 bonus" with no descriptor; Core Rulebook p.241 (Stacking Bonuses): bonuses without a descriptor stack with other bonuses, including other undescribed bonuses
  const def = weapon('d1', 'weapon-defender-microblaster');
  const eq5 = gear('e5', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'equipment', value: 5 } }]);
  const plain2 = gear('p2', [{ skill: 'stealth', useKey: 'conceal-item-on-self', mode: 'modifies', bonus: { type: 'untyped', value: 2 } }]);
  assert.equal(await delta(mkActor([def]), 'stealth', CONCEAL, { hookItemId: 'd1' }), 5);
  assert.equal(await delta(mkActor([def, eq5]), 'stealth', CONCEAL, { hookItemId: 'd1' }), 10, 'untyped +5 stacks with a separate equipment bonus');
  assert.equal(await delta(mkActor([def, plain2]), 'stealth', CONCEAL, { hookItemId: 'd1' }), 7, 'and with another undescribed bonus');
  assert.equal(await delta(mkActor([def, eq5]), 'stealth', CONCEAL, { hookItemId: 'other' }), 5, 'self-item limitation: concealing something else gets only the legacy gear bonus, never the Defender\'s');
  const rec = JSON.parse(fs.readFileSync(new URL('../data/weapons/canonical-weapon-registry.json', import.meta.url), 'utf8')).identities.find((r) => r.identityKey === 'weapon-defender-microblaster');
  assert.ok(/\+5 bonus on Stealth checks to conceal it/.test(rec.canonicalPlayerText) && !/equipment bonus/i.test(rec.canonicalPlayerText), 'the recorded source wording states a +5 bonus with no descriptor');
  assert.equal(WEAPON_SKILL_HOOK_SPECS.find((x) => x.key === 'concealmentStealthBonus').type, 'untyped');
}
ok('Defender Microblaster +5 is untyped (CWCG p.62 + Core p.241): it stacks with an equipment bonus, only when the Defender itself is concealed');

console.log(`Review corrections: ${n} total checks passed.`);
