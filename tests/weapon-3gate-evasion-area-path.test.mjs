import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate M-12 (Evasion): through the REAL attack workflow. A canonical area weapon's attack must mark the workflow so the packet rules can
// apply the target's Evasion / Improved Evasion (the project rule already encoded in damage-packet-rules + weapon-damage-packet-builder: an area attack
// that is not burst fire is Evasion-eligible). Before the fix, the canonical path set areaAttack + halfDamageOnMiss but never evasionApplies, so Evasion
// silently never applied to a canonical grenade, whatever its name.
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
const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { buildDamagePacket } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (l) => { const a = [...l]; a.get = (id) => a.find((i) => i.id === id); return a; };
let posted = [];
RollEngine.safeRoll = async (f) => ({ total: 2, formula: f, dice: [{ results: [{ result: 2 }] }] });
SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
ActionEconomyConsumption.spend = async () => ({ allowed: true, committed: true, rollback: async () => {} });
const target = (system = {}) => ({ id: 't', name: 'T', type: 'character', flags: { swse: {} }, effects: [], items: col([]), getFlag() {},
  system: { size: 'medium', hp: { value: 50, max: 50 }, conditionTrack: { current: 0 }, ...system, derived: { defenses: { reflex: { total: 30 }, fortitude: { total: 12 }, will: { total: 10 } }, damageThreshold: 20 } } });
const attackWorkflow = async (key, name) => {
  const w = F.readiedWeapon('g1', { key, wielded: 'one-handed', appendageIds: ['natural-arm-1'], system: { weaponCategory: 'ranged' } }); w.name = name;
  const A = F.actorOf([w]);
  A.system = { species: 'Human', size: 'Medium', bab: 5, level: 5, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, weaponProficiencies: ['simple', 'pistols', 'rifles'] };
  posted = [];
  assert.ok(await rollAttack(A, w, { target: target(), suppressChat: false }), 'the real attack executed');
  return { A, w, wf: posted.find((p) => p.context?.workflowContext).context.workflowContext };
};
const landed = (ctx, t, rolled, hit) => { const wf = JSON.parse(JSON.stringify(ctx.wf)); wf.damage = { ...wf.damage, hit };
  // buildDamagePacket already finalizes for the target (once, exactly as the chat card does); finalizing again would apply Improved Evasion twice
  return buildDamagePacket({ attacker: ctx.A, target: t, weapon: ctx.w, amount: rolled, workflowContext: wf, options: { hit } }); };

for (const name of ['Renamed Thing', 'Fragmentation Grenade']) {
  test(`area attack through the real workflow (${name}): the workflow marks it Evasion-eligible`, async () => {
    const ctx = await attackWorkflow('weapon-frag-grenade', name);
    assert.equal(ctx.wf.attack.isArea, true);
    assert.equal(ctx.wf.ruleData.evasionApplies, true, 'the canonical area workflow must carry evasionApplies');
  });
  test(`Evasion (${name}): a MISSED area attack deals no damage; without Evasion it deals half`, async () => {
    const ctx = await attackWorkflow('weapon-frag-grenade', name);
    const miss = landed(ctx, target({ evasion: true }), 20, false);
    assert.equal(miss.amount, 0); assert.equal(miss.flags.evasionNegatedDamage, true);
    assert.equal(landed(ctx, target(), 20, false).amount, 10, 'no Evasion: certified half damage on a miss');
    assert.equal(landed(ctx, target({ evasion: true }), 20, true).amount, 20, 'plain Evasion does not reduce a hit');
  });
  test(`Improved Evasion (${name}): a hit deals half, a miss deals none`, async () => {
    const ctx = await attackWorkflow('weapon-frag-grenade', name);
    assert.equal(landed(ctx, target({ improvedEvasion: true }), 20, true).amount, 10);
    assert.equal(landed(ctx, target({ improvedEvasion: true }), 20, false).amount, 0);
  });
}
test('a single-target attack ignores Evasion: the workflow is not marked, a miss deals nothing and a hit deals full damage', async () => {
  const ctx = await attackWorkflow('weapon-blaster-pistol', 'Blaster Pistol');
  assert.notEqual(ctx.wf.ruleData?.evasionApplies, true);
  assert.equal(landed(ctx, target({ improvedEvasion: true }), 20, true).amount, 20);
  assert.equal(landed(ctx, target({ improvedEvasion: true }), 20, false).amount, 0);
});

test('KNOWN GAP (WPN-M12-001, undecided): cover state is not carried from the attack to the damage stage, so the published area-attack cover damage negation cannot trigger in real play', async () => {
  const w = F.readiedWeapon('g3', { key: 'weapon-frag-grenade', wielded: 'one-handed', appendageIds: ['natural-arm-1'], system: { weaponCategory: 'ranged' } });
  const A = F.actorOf([w]);
  A.system = { species: 'Human', size: 'Medium', bab: 5, level: 5, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, weaponProficiencies: ['simple', 'pistols', 'rifles'] };
  posted = [];
  assert.ok(await rollAttack(A, w, { target: target(), suppressChat: false, cover: 'cover', targetContext: { mode: 'manual', defenseType: 'reflex', defenseValue: 15, coverBonus: 5 } }));
  const wf = posted.find((p) => p.context?.workflowContext).context.workflowContext;
  assert.equal(/cover/i.test(JSON.stringify(wf)), false, 'if this starts failing, cover now reaches damage: update WPN-M12-001 and the matrix');
});
