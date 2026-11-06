/**
 * Shieldbuster torpedoes (Starships of the Galaxy, Shieldbuster Torpedoes; owner interpretation V-P6C-13), through the SHARED mitigation:
 * Shield Rating meets the full damage; an attack exceeding SR costs 10 SR instead of 5; what reaches the hull is halved; Damage Reduction follows.
 * The flag comes from the weapon authority (the certified launcher), never from a name.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, VehicleAmmunitionService, ActorEngine, world, install, shootD20, targetAt, state } from './helpers/vehicle-weapon-world.mjs';

const { buildDamagePacket, finalizeDamagePacketForTarget, buildDamageApplyOptions } = await import('../scripts/engine/combat/damage-packet-builder.js');
const { resolveVehicleWeaponAuthority } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');

class Items extends Map { [Symbol.iterator]() { return this.values(); } get contents() { return [...this.values()]; } filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); } }
const defender = ({ hp = 400, sr = 0, dr = 0 } = {}) => ({ id: 'def', name: 'Defender', type: 'vehicle', flags: { swse: {} }, effects: [], items: new Items(), getFlag() { return undefined; }, setFlag: async () => {},
  system: { size: 'medium', hp: { value: hp, max: 400 }, conditionTrack: { current: 0 }, ...(dr ? { damageReduction: dr } : {}),
    derived: { damageThreshold: 999, damage: { threshold: 999, reduction: dr }, hp: { value: hp, max: 400 }, shield: { current: sr, stored: false }, ...(dr ? { damageReduction: { value: dr, highestValue: dr } } : {}) } } });
const realUpdate = ActorEngine.updateActor;
ActorEngine.updateActor = async () => {};
test.after(() => { ActorEngine.updateActor = realUpdate; });
async function applyFrom(workflowContext, rolled, t) {
  const packet = finalizeDamagePacketForTarget(buildDamagePacket({ attacker: null, target: t, weapon: null, amount: rolled, options: { damageType: null, hit: workflowContext?.damage?.hit }, workflowContext }), t);
  const options = buildDamageApplyOptions(packet);
  return (await ActorEngine.applyDamage(t, { amount: packet.amount, type: options.damageType, source: 'x', sourceActor: null, options })).resolution;
}
async function launcher(id) {
  world();
  const w = await install(id);
  const { vehicle, owner } = state();
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: w.flags.swse.vehicleInstalledWeapon.installId, units: 3 })).success, true);
  await VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
  return w;
}

test('AUTHORITY: the certified shieldbuster launcher is flagged; it has no printed splash; the proton torpedo is untouched', async () => {
  const sb = await launcher('shieldbuster-torpedo-launcher');
  const a = resolveVehicleWeaponAuthority(sb);
  assert.deepEqual([a.ok, a.shieldbuster, a.area, a.damageRaw], [true, true, undefined, '10d10x2']);
  const pt = resolveVehicleWeaponAuthority(await install('proton-torpedo-launcher', null, 'turret-2'));
  assert.deepEqual([pt.shieldbuster, !!pt.area], [undefined, true]);
});

test('MITIGATION: SR at full damage, SR -10, hull halved, then DR; no shield: half; a proton torpedo keeps SR -5 and no halving', async () => {
  const sb = await launcher('shieldbuster-torpedo-launcher');
  const hit = await shootD20(15, sb, targetAt(1), {});
  assert.equal(hit.isHit, true);
  assert.equal(hit.workflowContext.ruleData.shieldbuster, true);
  // SR 10, DR 5, rolled 44: (44 - 10) = 34 -> halved 17 -> DR 5 -> 12
  const shielded = await applyFrom(hit.workflowContext, 44, defender({ sr: 10, dr: 5 }));
  assert.equal(shielded.damageToHP, 12, JSON.stringify(shielded.mitigation));
  assert.equal(shielded.mitigation.shield.degraded, 10, 'a shieldbuster costs 10 SR');
  // no shield, no DR: half of 44
  assert.equal((await applyFrom(hit.workflowContext, 44, defender())).damageToHP, 22);
  // damage that does not exceed SR: absorbed, no SR loss
  const absorbed = await applyFrom(hit.workflowContext, 8, defender({ sr: 10 }));
  assert.deepEqual([absorbed.damageToHP, absorbed.mitigation.shield.degraded], [0, 0]);
  // the ordinary torpedo through the SAME pipeline
  const pt = await launcher('proton-torpedo-launcher');
  const phit = await shootD20(15, pt, targetAt(2), {});
  const plain = await applyFrom(phit.workflowContext, 44, defender({ sr: 10, dr: 5 }));
  assert.equal(plain.damageToHP, 29);
  assert.equal(plain.mitigation.shield.degraded, 5);
});
