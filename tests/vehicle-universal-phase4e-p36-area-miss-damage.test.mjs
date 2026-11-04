/**
 * WE-3 (V-P6C-07, owner ruling 2026-11-04, PROJECT_INTERPRETATION): an ordinary splash / area weapon resolved against ONE target at
 * starship scale keeps the area-attack miss rule of the Core (Special Combat Rules: Area Attacks, p. 155): a hit deals full damage and
 * a miss deals HALF. Shield Rating and Damage Reduction apply afterwards through the existing damage authorities; single-target weapons
 * are untouched; a natural 1 keeps the engine's existing no-damage rule.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, VehicleAmmunitionService, ActorEngine, actors, HULLS, world, install, log, targetAt, shootD20, state, tokenAt, setAttackerToken, GM_MOUNT, catalogOf } from './helpers/vehicle-weapon-world.mjs';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';

const { resolveDamageDisposition, buildDamagePacket, finalizeDamagePacketForTarget, buildDamageApplyOptions } = await import('../scripts/engine/combat/damage-packet-builder.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const defender = ({ hp = 200, sr = 0, dr = 0, dt = 99 } = {}) => ({
  id: 'def', name: 'Defender', type: 'vehicle', flags: { swse: {} }, effects: [], items: new Items(), getFlag() { return undefined; }, setFlag: async () => {},
  system: { size: 'medium', hp: { value: hp, max: 200 }, conditionTrack: { current: 0 }, ...(dr ? { damageReduction: dr } : {}),
    derived: { damageThreshold: dt, damage: { threshold: dt, reduction: dr }, hp: { value: hp, max: 200 }, shield: { current: sr, stored: false }, ...(dr ? { damageReduction: { value: dr, highestValue: dr } } : {}) } }
});
const realUpdate = ActorEngine.updateActor;
/** The chat-card damage chain: workflow context -> packet (disposition) -> target rules -> ActorEngine.applyDamage. */
async function applyFrom(workflowContext, rolled, t) {
  const hit = workflowContext?.damage?.hit;
  const packet = finalizeDamagePacketForTarget(buildDamagePacket({ attacker: null, target: t, weapon: null, amount: rolled, options: { damageType: null, hit }, workflowContext }), t);
  const options = buildDamageApplyOptions(packet);
  return { packet, res: (await ActorEngine.applyDamage(t, { amount: packet.amount, type: options.damageType, source: 'x', sourceActor: null, options })).resolution };
}
ActorEngine.updateActor = async () => {};            // the defender's HP write is not under test; the resolution it returns is
test.after(() => { ActorEngine.updateActor = realUpdate; });

async function launcherWorld() {
  world();
  const w = await install('proton-torpedo-launcher');
  const installId = w.flags.swse.vehicleInstalledWeapon.installId;
  const { vehicle, owner } = state();
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId, units: 3 })).success, true);
  await VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
  return w;
}
const reflex = 15;     // the X-wing's attack is +5: d20 15 hits (20 vs 15), d20 5 misses (10 vs 15), d20 1 is a natural 1

test('LAUNCHER: a splash torpedo that MISSES deals half damage; a hit deals full; a natural 1 deals none (the engine\'s existing rule)', async () => {
  const w = await launcherWorld();
  const hit = await shootD20(15, w, targetAt(2), {});
  const miss = await shootD20(5, w, targetAt(2), {});
  const nat1 = await shootD20(1, w, targetAt(2), {});
  assert.deepEqual([hit.isHit, miss.isHit, nat1.isHit], [true, false, false]);
  for (const r of [hit, miss, nat1]) assert.equal(r.workflowContext.ruleData.halfDamageOnMiss, true, 'the rule travels with the attack to the damage roll');
  const d = r => resolveDamageDisposition(r.workflowContext);
  assert.deepEqual([d(hit).damageAllowed, d(hit).multiplier], [true, 1]);
  assert.deepEqual([d(miss).damageAllowed, d(miss).multiplier], [true, 0.5]);
  assert.deepEqual([d(nat1).damageAllowed, d(nat1).multiplier], [false, 0]);
  assert.match(d(miss).reason, /Miss deals half damage/);
});

test('PACKET: half damage then Shield Rating and Damage Reduction through the existing authorities (a miss of N equals a hit of N/2)', async () => {
  const w = await launcherWorld();
  const miss = await shootD20(5, w, targetAt(2), {}), hit = await shootD20(15, w, targetAt(2), {});
  for (const [sr, dr] of [[0, 0], [10, 0], [0, 5], [10, 5], [30, 0]]) {
    const m = await applyFrom(miss.workflowContext, 44, defender({ sr, dr }));
    const h = await applyFrom(hit.workflowContext, 22, defender({ sr, dr }));
    assert.equal(m.packet.amount, 22, `SR ${sr} DR ${dr}: the missed splash packet carries half of the rolled 44`);
    assert.deepEqual([m.res.damageToHP, m.res.hpAfter], [h.res.damageToHP, h.res.hpAfter], `SR ${sr} DR ${dr}: identical to a hit of 22`);
  }
  // the full-damage hit for comparison: SR 10 + DR 5 off 44 vs off 22
  const full = await applyFrom(hit.workflowContext, 44, defender({ sr: 10, dr: 5 })), half = await applyFrom(miss.workflowContext, 44, defender({ sr: 10, dr: 5 }));
  assert.ok(full.res.damageToHP > half.res.damageToHP);
});

test('SINGLE-TARGET WEAPONS are untouched: a missed laser cannon deals nothing', async () => {
  world();
  const w = await install('laser-cannon-light');
  const miss = await shootD20(5, w, targetAt(2), {});
  assert.equal(miss.isHit, false);
  assert.notEqual(miss.workflowContext?.ruleData?.halfDamageOnMiss, true);
  const d = resolveDamageDisposition(miss.workflowContext);
  assert.deepEqual([d.damageAllowed, d.multiplier], [false, 0]);
  assert.equal((await applyFrom(miss.workflowContext, 44, defender())).packet.amount, 0);
});

test('STOCK: the executable splash groups follow the same rule; their single-target siblings do not', async () => {
  const groups = actors.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.filter(g => g.executable && g.area).map(g => ({ key: d.flags.swse.canonicalPublication.sourceEntryKey, g })));
  assert.ok(groups.length >= 3, 'the executable ordinary-splash stock groups');
  const key = groups[0].key;
  world();                                    // (sets the globals the stock arming and attack paths read)
  const doc = actors.find(d => d.flags.swse.canonicalPublication.sourceEntryKey === key);
  const veh = Object.assign(structuredClone(doc), { id: 'sveh', isOwner: true, items: new Items(), getActiveTokens: () => [tokenAt(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  let n = 0;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'si' + (++n); veh.items.set(id, { id, ...structuredClone(x), actor: veh }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, ids) => {};
  globalThis.game.user.id = 'u1';
  await armStockWeaponsOnCreate(veh, {}, 'u1');
  const split = veh.items.contents.filter(i => i.flags?.swse?.vehicleStockWeapon);
  const splash = split.find(i => i.flags.swse.vehicleStockWeapon.groupKey === groups[0].g.groupKey);
  assert.ok(splash, 'the splash group is armed');
  const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
  const { RollEngine } = await import('../scripts/engine/roll-engine.js');
  const roll = async (item, d20) => {
    const r0 = RollEngine.safeRoll;
    RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
    try { return await rollAttack(veh, item, { abstractCrewQuality: 'normal', target: { ...targetAt(1), system: { size: 'medium', defenses: { reflex: { total: 40 } } } } }); } finally { RollEngine.safeRoll = r0; }
  };
  const miss = await roll(splash, 5);
  assert.ok(miss, 'the stock splash attack resolves at starship scale (a vehicle target)');
  assert.equal(miss.isHit, false);
  const d = resolveDamageDisposition(miss.workflowContext);
  assert.deepEqual([d.damageAllowed, d.multiplier], [true, 0.5], `${groups[0].g.label}: half damage on a miss`);
  const plain = split.find(i => !assessStockWeaponGroups(veh.flags.swse.universalVehicleSource.source).groups.find(g => g.groupKey === i.flags.swse.vehicleStockWeapon.groupKey)?.area);
  if (plain) {
    const m2 = await roll(plain, 5);
    if (m2) assert.deepEqual([resolveDamageDisposition(m2.workflowContext).damageAllowed, resolveDamageDisposition(m2.workflowContext).multiplier], [false, 0], 'a single-target group: no damage on a miss');
  }
});
