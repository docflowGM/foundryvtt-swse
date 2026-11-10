import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Combat Loadout Preview: a READ-ONLY projection of the production attack / damage authorities (loadout-preview.js).
// Every number below is checked three ways: (1) hand arithmetic from the printed rules (half heroic level + Strength; double positive
// Strength for a two-handed non-light melee weapon), (2) PARITY with the real rollAttack / rollDamage on the identical Actor, weapon, profile and
// grip, and (3) bounds that contain every reachable total of the rolled formula. Real canonical registry, real readiness fixture, no shadow math.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { callAll() {}, on() {}, once() {} };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = { combat: null, user: { targets: { first: () => null } }, settings: { get: () => false } };

const F = await import('./helpers/ready-weapon-fixture.mjs'); await F.installReadinessEnvironment();
const { buildWeaponLoadoutPreview, buildLoadoutPreviews } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/loadout-preview.js');
const { boundsOfDiceExpression } = await import('/systems/foundryvtt-swse/scripts/engine/combat/dice-expression-bounds.js');
const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
// level 5 hero: half heroic level = 2
const hero = (items, { str = 3, dex = 4, derived = {} } = {}) => {
  const a = F.actorOf(items);
  a.system = { species: 'Human', size: 'Medium', bab: 5, level: 5, attributes: { str: ab(str), dex: ab(dex), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'simple', 'advanced-melee', 'lightsabers'] };
  return a;
};
const ONE = ['natural-arm-1'], TWO = ['natural-arm-1', 'natural-arm-2'];
const saber = (grip, id = 'w1') => F.readiedWeapon(id, { key: F.SABER_KEY, wielded: grip, appendageIds: grip === 'two-handed' ? TWO : ONE });
const pistol = (id = 'p1', apps = ['natural-arm-1']) => F.readiedWeapon(id, { key: 'weapon-blaster-pistol', wielded: 'one-handed', appendageIds: apps, system: { weaponCategory: 'ranged' } });

// ---- harness for the real roll path (parity) ----
const formulas = [];
let posted = [];
const stub = async (f) => { formulas.push(String(f)); return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
RollEngine.safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 });
ActionEconomyConsumption.spend = async () => ({ allowed: true, committed: true, rollback: async () => {} });
const target = () => ({ id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: [], getFlag() {}, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } });
const flat = (f) => Number(Function(`return ${String(f).replace(/^\s*1d20/, '0')}`)());
/** the real attack, then the real damage roll from the attack's own workflow context; returns { attackBonus, damageFormula } */
async function realRoll(actor, weapon) {
  formulas.length = 0; posted = [];
  assert.ok(await rollAttack(actor, weapon, { target: target(), suppressChat: false }), 'real attack executed');
  const attackBonus = flat(formulas[0]);
  const ctx = posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
  formulas.length = 0;
  await rollDamage(actor, weapon, { suppressChat: true, target: target(), combatContext: ctx, workflowContext: ctx });
  return { attackBonus, damageFormula: formulas[0] };
}
const norm = (s) => String(s).replace(/\s/g, '');
const snapshot = (...docs) => JSON.stringify(docs.map((d) => ({ ...d, actor: undefined, items: undefined })));

test('dice bounds: exact minimum / maximum of the formulas the damage authority emits', () => {
  assert.deepEqual(boundsOfDiceExpression('1d8 + 5'), { min: 6, max: 13, constant: false });
  assert.deepEqual(boundsOfDiceExpression('2d8 + 5'), { min: 7, max: 21, constant: false });
  assert.deepEqual(boundsOfDiceExpression('(2d6 + 3) * 2'), { min: 10, max: 30, constant: false });
  assert.deepEqual(boundsOfDiceExpression('((1d8 + 5) * 2 + 1d6) * 2'), { min: 26, max: 64, constant: false }, 'weapon multiplier, rider and critical multiplier keep their stage');
  assert.deepEqual(boundsOfDiceExpression('d6'), { min: 1, max: 6, constant: false });
  assert.deepEqual(boundsOfDiceExpression('2d6rr<=2 + 3'), { min: 5, max: 15, constant: false }, 'a reroll mark does not change the reachable range');
  assert.deepEqual(boundsOfDiceExpression('1d4 - 5'), { min: -4, max: -1, constant: false });
  assert.deepEqual(boundsOfDiceExpression('7'), { min: 7, max: 7, constant: true });
});
test('dice bounds: unsupported / variable expressions produce NO numbers', () => {
  for (const bad of ['', '—', 'Varies', '2d8kh1 + 3', '@abilities.str.mod + 1d6', '1d6 * 1d6', '(1d6', '1d0', 'abc', '2d8 +', null, undefined]) assert.equal(boundsOfDiceExpression(bad), null, String(bad));
});
test('dice bounds contain every reachable total (exhaustive enumeration)', () => {
  const totals = (n, s) => { let t = [0]; for (let i = 0; i < n; i++) t = t.flatMap((x) => Array.from({ length: s }, (_, k) => x + k + 1)); return t; };
  for (const [f, n, s, k] of [['2d8 + 5', 2, 8, 5], ['3d6 + 2', 3, 6, 2], ['1d12', 1, 12, 0]]) { const b = boundsOfDiceExpression(f), t = totals(n, s).map((x) => x + k); assert.equal(b.min, Math.min(...t)); assert.equal(b.max, Math.max(...t)); }
});

test('one-handed lightsaber: normal attack and damage range (level 5, STR +3)', async () => {
  const w = saber('one-handed'); const A = hero([w]);
  const p = await buildWeaponLoadoutPreview(A, w);
  assert.equal(p.calculationStatus, 'established');
  assert.equal(p.attackBonus, 8, 'BAB 5 + STR 3');
  assert.equal(p.damageFormula, '2d6 + 5', 'weapon dice + half level 2 + STR 3');
  assert.deepEqual([p.minimumDamage, p.maximumDamage], [7, 17]);
  assert.equal(p.grip, 'one-handed'); assert.equal(p.effectivePosture, 'READIED'); assert.equal(p.ready, true);
});
test('two-handed grip doubles positive Strength in damage only; the attack bonus is unchanged', async () => {
  const one = await buildWeaponLoadoutPreview(hero([saber('one-handed')]), saber('one-handed'));
  const wT = saber('two-handed'); const two = await buildWeaponLoadoutPreview(hero([wT]), wT);
  assert.equal(two.attackBonus, one.attackBonus);
  assert.equal(two.damageFormula, '2d6 + 8');
  assert.deepEqual([two.minimumDamage, two.maximumDamage], [10, 20]);
  assert.equal(two.grip, 'two-handed');
  assert.deepEqual(two.occupiedAppendageIds, TWO, 'one physical weapon spanning both hands');
});
test('a light weapon wielded two-handed does not double Strength', async () => {
  const w = F.readiedWeapon('d1', { key: 'weapon-vibrodagger', wielded: 'two-handed', appendageIds: TWO }); const A = hero([w]);
  const p = await buildWeaponLoadoutPreview(A, w);
  assert.equal(p.damageFormula, '2d4 + 5'); assert.deepEqual([p.minimumDamage, p.maximumDamage], [7, 13]);
});
test('negative Strength: a penalty is not doubled by the two-handed grip', async () => {
  const w1 = saber('one-handed'), w2 = saber('two-handed');
  const a = await buildWeaponLoadoutPreview(hero([w1], { str: -2 }), w1), b = await buildWeaponLoadoutPreview(hero([w2], { str: -2 }), w2);
  assert.equal(a.damageFormula, '2d6'); assert.equal(b.damageFormula, a.damageFormula);
  assert.equal(a.attackBonus, 3, 'BAB 5 + STR -2');
});
test('ranged weapon: Dexterity feeds the attack, never the damage', async () => {
  const w = pistol(); const A = hero([w]);
  const p = await buildWeaponLoadoutPreview(A, w);
  assert.equal(p.attackBonus, 9); assert.equal(p.damageFormula, '3d6 + 2'); assert.deepEqual([p.minimumDamage, p.maximumDamage], [5, 20]);
});
test('condition-track penalty flows through the production attack resolver', async () => {
  const w = saber('one-handed');
  const clean = await buildWeaponLoadoutPreview(hero([w]), w);
  const hurt = await buildWeaponLoadoutPreview(hero([w], { derived: { damage: { conditionPenalty: -2 } } }), w);
  assert.equal(hurt.attackBonus, clean.attackBonus - 2);
});
test('level and ability changes are reflected on the next read (no cache)', async () => {
  const w = saber('one-handed'); const A = hero([w]);
  const before = await buildWeaponLoadoutPreview(A, w);
  A.system.level = 9; A.system.bab = 9; A.system.attributes.str = ab(4);
  const after = await buildWeaponLoadoutPreview(A, w);
  assert.equal(after.attackBonus, before.attackBonus + 4 + 1);
  assert.equal(after.damageFormula, '2d6 + 8', 'half level 4 + STR 4');
});

test('PARITY: preview attack total and damage formula equal the real rollAttack / rollDamage (one-handed, two-handed, light, ranged)', async () => {
  for (const mk of [() => saber('one-handed'), () => saber('two-handed'), () => F.readiedWeapon('d1', { key: 'weapon-vibrodagger', wielded: 'two-handed', appendageIds: TWO }), () => pistol()]) {
    const w = mk(); const A = hero([w]);
    const p = await buildWeaponLoadoutPreview(A, w);
    const real = await realRoll(A, w);
    const label = `${w.flags.swse.canonicalWeapon.identityKey}/${p.grip}`;
    assert.equal(p.attackBonus, real.attackBonus, `${label}: attack total`);
    assert.equal(norm(p.damageFormula), norm(real.damageFormula), `${label}: damage formula`);
    // the displayed range contains every total the rolled formula can produce
    const b = boundsOfDiceExpression(real.damageFormula);
    assert.equal(p.rawMinimumDamage, b.min); assert.equal(p.maximumDamage, b.max);
  }
});

test('read-only: the preview never writes the actor or the weapon (frozen documents: any write would throw)', async () => {
  const deepFreeze = (o, seen = new Set()) => { if (!o || typeof o !== 'object' || seen.has(o) || o.items === undefined && o.actor !== undefined) return o; seen.add(o); for (const k of Object.keys(o)) { if (k === 'actor' || k === 'items') continue; deepFreeze(o[k], seen); } return Object.freeze(o); };
  const w = saber('two-handed'); const A = hero([w]);
  deepFreeze(w); deepFreeze(A.system); deepFreeze(A.flags);
  const p = await buildWeaponLoadoutPreview(A, w); const m = await buildLoadoutPreviews(A);
  assert.equal(p.calculationStatus, 'established'); assert.ok(m.has(w.id));
});
test('two separate readied weapons get independent previews (no two-weapon penalty is invented)', async () => {
  const s = saber('one-handed', 's1'); s.system.weaponOccupancy.appendageIds = ['natural-arm-1'];
  const p = pistol('p1', ['natural-arm-2']);
  const A = hero([s, p]);
  const map = await buildLoadoutPreviews(A);
  assert.deepEqual([...map.keys()].sort(), ['p1', 's1']);
  const alone = await buildWeaponLoadoutPreview(hero([saber('one-handed', 's1')]), saber('one-handed', 's1'));
  assert.equal(map.get('s1').attackBonus, alone.attackBonus, 'holding a second weapon is not a two-weapon attack');
});
test('a weapon with no certified canonical identity gets no invented numbers', async () => {
  const w = { id: 'l1', name: 'Homebrew', type: 'weapon', flags: {}, system: { damage: '3d6', weaponCategory: 'ranged', attackBonus: 99 } };
  const p = await buildWeaponLoadoutPreview(hero([w]), w);
  assert.equal(p.calculationStatus, 'unresolved'); assert.equal(p.attackBonus, null); assert.equal(p.damageFormula, null); assert.equal(p.minimumDamage, null);
});
test('a profile with no ordinary damage shows no damage range', async () => {
  // Amphistaff Pin / Trip style forms deal no ordinary damage; any form that refuses composition must not show a number
  const w = F.readiedWeapon('x1', { key: 'weapon-tractor-beam', wielded: 'one-handed', appendageIds: ONE });
  const p = await buildWeaponLoadoutPreview(hero([w]), w);
  assert.equal(p.minimumDamage, null); assert.equal(p.maximumDamage, null);
});

// ---- workspace integration: slots, items and inspector read ONE set of numbers ----
const { buildEquipmentWorkspace, applyLoadoutPreviews } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-context.js');
const { readCombatReadiness } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const rowOf = (item) => ({ id: item.id, name: item.name, img: '', type: item.type, typeLabel: item.type, quantity: 1, weight: 1, value: 0, tags: [], equipped: false });
async function workspaceOf(actor, staleAttackViews = new Map()) {
  const readiness = readCombatReadiness(actor);
  const ws = buildEquipmentWorkspace(actor, { groups: [{ id: 'all', entries: Array.from(actor.items).map(rowOf) }], attackViews: staleAttackViews, readiness, isGM: true });
  return applyLoadoutPreviews(ws, await buildLoadoutPreviews(actor, { readiness }));
}
test('workspace: a two-handed weapon is ONE attack source spanning both hands, shown once with its own numbers', async () => {
  const w = saber('two-handed'); const A = hero([w]);
  const ws = await workspaceOf(A);
  const occupied = ws.slots.filter((s) => s.occupant);
  assert.equal(occupied.length, 2, 'both hands are occupied by the same weapon');
  assert.equal(occupied.filter((s) => s.occupant.isAnchor).length, 1, 'shown in full once; the other hand reads "occupied by"');
  assert.ok(occupied.every((s) => s.occupant.preview?.weaponId === 'w1'));
  const anchor = occupied.find((s) => s.occupant.isAnchor).occupant.preview;
  assert.deepEqual([anchor.attackLabel, anchor.damageRangeLabel, anchor.damageFormula, anchor.gripLabel], ['+8', '10–20', '2d6 + 8', 'Two-handed']);
});
test('workspace: the preview supersedes the stale per-item attack mirror (Item-level fields) everywhere', async () => {
  const w = saber('one-handed'); const A = hero([w]);
  const stale = new Map([['w1', { weaponId: 'w1', attackTotal: 99, damageFormula: '9d9' }]]);   // what the old mirror would have shown
  const ws = await workspaceOf(A, stale);
  const slot = ws.slots.find((s) => s.occupant);
  assert.equal(slot.occupant.attackLabel, ''); assert.equal(slot.occupant.damageLabel, '');
  assert.equal(slot.occupant.preview.attackLabel, '+8');
  for (const list of [ws.items, ws.entries]) { const it = list.find((i) => i.id === 'w1'); assert.equal(it.preview.damageRangeLabel, '7–17'); assert.equal(it.preview.attackBreakdown[0].label, 'BAB'); }
});
test('workspace: an unresolved weapon shows dashes, never numbers; sheets without previews keep their old behavior', async () => {
  const w = { id: 'l1', name: 'Homebrew', type: 'weapon', flags: {}, system: { weaponPosture: 'READIED', weaponOccupancy: { schemaVersion: 1, purpose: 'wield', appendageIds: ONE } } };
  const A = hero([w]);
  const ws = await workspaceOf(A);
  const it = ws.items.find((i) => i.id === 'l1');
  if (it.preview) { assert.equal(it.preview.attackLabel, '—'); assert.equal(it.preview.damageRangeLabel, '—'); assert.equal(it.preview.statusKey, 'unresolved'); }
  const untouched = buildEquipmentWorkspace(A, { groups: [{ id: 'all', entries: [rowOf(w)] }], readiness: readCombatReadiness(A), isGM: true });
  assert.equal(applyLoadoutPreviews(untouched, null), untouched, 'no previews map: workspace unchanged');
  assert.equal(untouched.hasLoadoutPreview, undefined);
});

// ---- feats, profiles, multipliers (real canonical records, parity with the real roll where the weapon can be fired headless) ----
let ufid = 0;
const mkItem = (type, name, extra = {}) => ({ id: `u${++ufid}`, type, name, flags: extra.flags ?? {}, system: extra.system ?? {} });
const focusFeat = (choice) => mkItem('feat', 'Zxq Renamed Label', { flags: { swse: { canonicalFeat: { identityKey: 'feat::saga-edition-core-rulebook::p89::weapon-focus' } } }, system: { selectedChoice: choice, abilityMeta: { modifiers: [{ target: 'attack.bonus', value: 1, type: 'untyped', enabled: true, predicates: ['attack.weapon-matches-selected-choice'] }] } } });
const specFeat = (choice) => mkItem('feat', 'Zxq Spec', { flags: { swse: { canonicalFeat: { identityKey: 'feat::saga-edition-core-rulebook::p91::weapon-specialization' } } }, system: { selectedChoice: choice } });
test('Weapon Focus raises the previewed attack; Weapon Specialization raises the damage bounds (preview equals the real roll)', async () => {
  const w = pistol(); const A0 = hero([w]); const base = await buildWeaponLoadoutPreview(A0, w);
  const withFocus = hero([w, focusFeat('pistols')]);
  const f = await buildWeaponLoadoutPreview(withFocus, w);
  assert.equal(f.attackBonus, base.attackBonus + 1);
  assert.equal((await realRoll(withFocus, w)).attackBonus, f.attackBonus, 'parity with the real attack');
  const withSpec = hero([w, specFeat('pistols')]);
  const sp = await buildWeaponLoadoutPreview(withSpec, w);
  assert.equal(sp.minimumDamage, base.minimumDamage + 2); assert.equal(sp.maximumDamage, base.maximumDamage + 2);
  assert.equal(norm((await realRoll(withSpec, w)).damageFormula), norm(sp.damageFormula), 'parity with the real damage roll');
});
test('the selected attack profile drives the preview (Variable Blaster low vs high setting)', async () => {
  const mkVB = (setting) => F.readiedWeapon('v1', { key: 'weapon-variable-blaster', wielded: 'one-handed', appendageIds: ONE, system: { weaponCategory: 'ranged' }, flags: { swse: { fireState: { v: 1, wielded: 'one-handed', settingProfile: setting } } } });
  const lo = mkVB('low'), hi = mkVB('high');
  const a = await buildWeaponLoadoutPreview(hero([lo]), lo), b = await buildWeaponLoadoutPreview(hero([hi]), hi);
  assert.equal(a.profileId, 'low'); assert.equal(b.profileId, 'high');
  assert.match(a.damageFormula, /^3d4/); assert.match(b.damageFormula, /^3d8/);
  assert.equal(norm((await realRoll(hero([hi]), hi)).damageFormula), norm(b.damageFormula), 'parity with the real roll of the selected profile');
});
test('a weapon damage multiplier keeps its stage: Light Concussion Missile Launcher (4d10) x 2', async () => {
  const w = F.readiedWeapon('m1', { key: 'weapon-light-concussion-missile-launcher', wielded: 'two-handed', appendageIds: TWO, system: { weaponCategory: 'ranged' } }); const A = hero([w]);
  const p = await buildWeaponLoadoutPreview(A, w);
  assert.match(p.damageFormula, /\(4d10( \+ \d+)?\) \* 2/, p.damageFormula);
  assert.equal(p.maximumDamage, boundsOfDiceExpression(p.damageFormula).max); assert.ok(p.maximumDamage >= 80);
});
const npcOf = (items) => { const a = F.actorOf(items, { type: 'npc' }); a.system = { species: 'Human', size: 'Medium', bab: 0, level: 3, npcProfile: { mode: 'play', sourceAuthority: 'statblock' }, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {} }; return a; };
const flatBlaster = (flatDamageFormula) => F.readiedWeapon('n1', { key: 'weapon-blaster-pistol', wielded: 'one-handed', appendageIds: ONE, system: { weaponCategory: 'ranged' }, flags: { swse: { npc: { useFlat: true, flatAttackBonus: 7, flatDamageFormula } } } });
test('NPC statblock-flat: the printed attack total and damage formula are preserved (not rebuilt from BAB / abilities)', async () => {
  const w = flatBlaster('2d6+3'); const A = npcOf([w]);
  const p = await buildWeaponLoadoutPreview(A, w);
  assert.equal(p.attackBonus, 7); assert.equal(p.damageFormula, '2d6+3'); assert.deepEqual([p.minimumDamage, p.maximumDamage], [5, 15]);
  assert.equal(p.calculationStatus, 'established');
});
test('an unparseable / non-dice damage expression is shown as Variable with NO numeric range', async () => {
  const w = flatBlaster('special (see text)'); const A = npcOf([w]);
  const p = await buildWeaponLoadoutPreview(A, w);
  assert.equal(p.calculationStatus, 'variable'); assert.equal(p.damageFormula, 'special (see text)');
  assert.equal(p.minimumDamage, null); assert.equal(p.maximumDamage, null);
  const ws = await workspaceOf(A);
  const slot = ws.slots.find((s) => s.occupant)?.occupant?.preview;
  if (slot) assert.equal(slot.damageRangeLabel, '—');
});
