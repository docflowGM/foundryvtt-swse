/**
 * WE-5 (owner ruling V-P6C-08): Autofire and Burst Fire of an autofire-capable vehicle weapon. Capability comes from the sealed/certified authority
 * (a double / quad / fire-linked cannon or an autoblaster), never a name. Autofire: -5, starship-scale single target, half damage on a miss.
 * Burst Fire: the named operator owns the feat; -5, +2 dice before the multiplier, not an area attack.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, install, shootD20, targetAt, log } from './helpers/vehicle-weapon-world.mjs';
import { resolveVehicleFireMode, requestedVehicleFireMode, FIRE_MODE_REASONS } from '../scripts/domain/vehicles/vehicle-fire-mode.js';
import { resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

const { resolveDamageDisposition } = await import('../scripts/engine/combat/damage-packet-builder.js');
const total = r => r.roll?.total ?? r.attackRoll?.total ?? r.total;
const feat = name => ({ type: 'feat', name });
const gunner = (...feats) => ({ type: 'character', items: { contents: feats.map(feat) } });

test('PURE: capability, scale, named operator and the feat are each required', () => {
  const cap = { ok: true, autofireCapable: true }, plain = { ok: true };
  assert.deepEqual(resolveVehicleFireMode({ requested: 'single', authority: plain, scale: 'starship' }), { ok: true, mode: 'single' });
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: plain, scale: 'starship' }).reason, FIRE_MODE_REASONS.NOT_CAPABLE);
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: null, scale: 'starship' }).reason, FIRE_MODE_REASONS.NOT_CAPABLE);
  const a = resolveVehicleFireMode({ requested: 'autofire', authority: cap, scale: 'starship' });
  assert.deepEqual([a.ok, a.attackPenalty, a.extraDice, a.halfDamageOnMiss], [true, -5, 0, true]);
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: cap, scale: 'character' }).reason, FIRE_MODE_REASONS.AREA_AT_CHARACTER_SCALE);
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: cap, scale: null }).reason, FIRE_MODE_REASONS.UNKNOWN_SCALE);
  assert.equal(resolveVehicleFireMode({ requested: 'burst', authority: cap, operatorActor: null, scale: 'starship' }).reason, FIRE_MODE_REASONS.NO_NAMED_OPERATOR);
  assert.equal(resolveVehicleFireMode({ requested: 'burst', authority: cap, operatorActor: gunner(), scale: 'starship' }).reason, FIRE_MODE_REASONS.NO_FEAT);
  for (const scale of ['starship', 'character']) {
    const b = resolveVehicleFireMode({ requested: 'burst', authority: cap, operatorActor: gunner('Burst Fire'), scale });
    assert.deepEqual([b.ok, b.attackPenalty, b.extraDice, b.halfDamageOnMiss], [true, -5, 2, false], 'burst is single-target: not an area attack');
  }
  assert.equal(requestedVehicleFireMode({ autofire: true }), 'autofire');
  assert.equal(requestedVehicleFireMode({ fireMode: 'burst' }), 'burst');
  assert.equal(requestedVehicleFireMode({}), 'single');
});

test('DAMAGE: burst dice are added before the multiplier; only an autofire-capable weapon carries them', async () => {
  world();
  const dbl = await install('blaster-cannon-light', 'cannon-double');
  const base = resolveVehicleWeaponDamage(dbl), burst = resolveVehicleWeaponDamage(dbl, { fireModeExtraDice: 2 });
  const n = f => Number(/^(\d+)d/.exec(f)[1]);
  assert.equal(n(burst.formula), n(base.formula) + 2);
  assert.equal(burst.multiplier, base.multiplier);
  const plain = await install('laser-cannon-light', null, 'turret-2');
  assert.equal(resolveVehicleWeaponDamage(plain, { fireModeExtraDice: 2 }).reason, 'VEHICLE_FIRE_MODE_DICE_NOT_ALLOWED');
});

test('ATTACK: autofire on a double cannon is -5 with half damage on a miss; a plain cannon refuses; burst with an abstract crew refuses', async () => {
  world();
  const dbl = await install('blaster-cannon-light', 'cannon-double');
  const single = await shootD20(15, dbl, targetAt(1), {});
  const auto = await shootD20(15, dbl, targetAt(1), { autofire: true });
  assert.ok(single && auto, log.join('|'));
  assert.equal(total(single) - total(auto), 5, 'autofire is exactly -5 against the same single attack');
  const miss = await shootD20(2, dbl, targetAt(1), { autofire: true });
  const d = resolveDamageDisposition(miss.workflowContext);
  assert.deepEqual([d.damageAllowed, d.multiplier], [true, 0.5]);
  assert.equal(miss.workflowContext.ruleData.halfDamageOnMiss, true);
  // a single attack of the same weapon keeps "miss deals nothing"
  const smiss = await shootD20(2, dbl, targetAt(1), {});
  assert.deepEqual([resolveDamageDisposition(smiss.workflowContext).damageAllowed], [false]);
  // burst: abstract crew has no feats
  assert.equal(await shootD20(15, dbl, targetAt(1), { fireMode: 'burst' }), null);
  assert.match(log.join('|'), /BURST_FIRE_REQUIRES_A_NAMED_OPERATOR/);
  // a weapon without autofire capability
  const plain = await install('laser-cannon-light', null, 'turret-2');
  assert.equal(await shootD20(15, plain, targetAt(1), { autofire: true }), null);
  assert.match(log.join('|'), /AUTOFIRE_CAPABILITY_NOT_ESTABLISHED/);
});
