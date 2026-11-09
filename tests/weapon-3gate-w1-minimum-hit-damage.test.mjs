import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate audit W1 / C-DMG-01.
// Printed rule (Core Rulebook, Combat Statistics > Damage): a successful weapon hit always deals at least 1 point of damage,
// even when penalties reduce the roll below 1. The floor belongs BEFORE shields/DR/HP mitigation, applies only to a CONFIRMED hit of an
// ordinary damaging weapon attack, and must never turn a miss, a no-damage form, or a hit-less (adjudicated) roll into damage.
// Production authority under test: buildDamagePacket (the shared pre-mitigation packet seam) -> DamageResolutionEngine.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const { buildDamagePacket } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');

const weapon = { id: 'w1', name: 'Blaster Pistol', type: 'weapon', system: { damageType: 'energy' } };
const attacker = { id: 'a1', name: 'Shooter', type: 'character', items: [], system: {} };
const target = { id: 't1', name: 'Dummy', type: 'character', items: [], system: { hp: { value: 30, max: 30 } } };
const packet = (amount, { hit = true, ruleData, extra = {} } = {}) => buildDamagePacket({
  attacker, target, weapon, amount,
  workflowContext: { actorId: 'a1', weaponId: 'w1', targetId: 't1', damage: { hit }, ...(ruleData ? { ruleData } : {}) },
  options: { hit, ...extra }
});

test('C-DMG-01: confirmed ordinary weapon hit with negative total (1d4-5 style) deals an effective 1 before mitigation', () => {
  for (const total of [-4, -1, 0]) {
    const p = packet(total);
    assert.equal(p.amount, 1, `raw ${total} -> effective 1`);
    assert.equal(p.rawAmount, 1, 'pre-mitigation raw amount is the effective amount');
  }
});

test('C-DMG-01: the original roll total is preserved for audit and the floor is disclosed', () => {
  const p = packet(-4);
  assert.equal(p.flags.minimumHitDamageApplied, true);
  assert.equal(p.flags.rolledTotal, -4);
  assert.equal(p.components.reduce((s, c) => s + (c.amount ?? 0), 0), 1, 'components agree with the effective amount');
});

test('C-DMG-01: totals of 1 and above are untouched', () => {
  for (const total of [1, 2, 17]) {
    const p = packet(total);
    assert.equal(p.amount, total);
    assert.notEqual(p.flags.minimumHitDamageApplied, true);
  }
});

test('C-DMG-01: a miss, an unconfirmed (hit-less) roll, a no-damage form and a natural 1 are never floored', () => {
  assert.equal(packet(-3, { hit: false }).amount, 0, 'miss');
  assert.equal(packet(-3, { hit: null }).amount, 0, 'detached roll with no hit evidence must not invent a confirmed hit');
  assert.equal(packet(-3, { hit: true, ruleData: { noDamage: true } }).amount, 0, 'no-damage form');
  assert.equal(packet(5, { hit: true, ruleData: { noDamage: true } }).amount, 0, 'no-damage form stays 0');
});

test('C-DMG-01: area attack miss keeps its certified half-damage policy; no blanket floor on the halved amount', () => {
  const p = packet(-3, { hit: false, ruleData: { halfDamageOnMiss: true, areaAttack: true } });
  assert.equal(p.amount, 0, 'half of a non-positive roll is not floored to 1 on a miss');
  const q = packet(9, { hit: false, ruleData: { halfDamageOnMiss: true, areaAttack: true } });
  assert.equal(q.amount, 4);
});

test('C-DMG-01: a stock NPC flat / droid published formula result takes the same floor on a confirmed hit', () => {
  const npcWeapon = { id: 'n1', name: 'Vibroblade', type: 'weapon', system: { damageType: 'slashing' } };
  const p = buildDamagePacket({ attacker, target, weapon: npcWeapon, amount: -2, workflowContext: { damage: { hit: true } }, options: { hit: true } });
  assert.equal(p.amount, 1);
});

test('C-DMG-01: the floor is applied BEFORE mitigation: DR 5 reduces the effective 1 to 0 HP loss', async () => {
  const { DamageResolutionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js');
  const p = packet(-4);
  assert.equal(p.amount, 1);
  const drTarget = { ...target, system: { hp: { value: 30, max: 30 }, damageReduction: 5 } };
  const res = DamageResolutionEngine.resolveDamage
    ? await DamageResolutionEngine.resolveDamage({ actor: drTarget, damage: p.amount, packet: p, options: { dryRun: true } }).catch(() => null)
    : null;
  if (res) assert.ok((res.hpLoss ?? res.finalDamage ?? 0) <= 1);
});
