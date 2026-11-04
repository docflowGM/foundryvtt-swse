/**
 * WE-5 (owner ruling V-P6C-08): Autofire and Burst Fire of an autofire-capable vehicle weapon. Capability comes from the sealed/certified authority
 * (a double / quad / fire-linked cannon or an autoblaster), never a name. Autofire: -5, starship-scale single target, half damage on a miss.
 * Burst Fire: the named operator owns the feat; -5, +2 dice before the multiplier, not an area attack.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, install, state, shootD20, targetAt, log } from './helpers/vehicle-weapon-world.mjs';
import fs from 'node:fs';
import { resolveVehicleFireMode, requestedVehicleFireMode, FIRE_MODE_REASONS } from '../scripts/domain/vehicles/vehicle-fire-mode.js';
import { resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

const { VehicleFireModeService, burstFireOptionOf } = await import('../scripts/engine/vehicles/vehicle-fire-mode-service.js');
const { resolveDamageDisposition } = await import('../scripts/engine/combat/damage-packet-builder.js');
const total = r => r.roll?.total ?? r.attackRoll?.total ?? r.total;
// the REAL Burst Fire feat record: its ATTACK_OPTION rule is what CombatOptionResolver reads (no name lookup anywhere in the vehicle path)
const burstRules = JSON.parse(fs.readFileSync('packs/feats.db', 'utf8').split('\n').filter(l => l.includes('"name":"Burst Fire"')).map(l => l)[0]).system.abilityMeta.rules;
const feat = name => ({ type: 'feat', name, system: { abilityMeta: { rules: burstRules } } });
const gunner = (...feats) => { const items = feats.map(feat); return { type: 'character', name: 'G', items: { contents: items, [Symbol.iterator]: () => items[Symbol.iterator]() }, system: { abilities: { str: { total: 14, value: 14, mod: 2 } } } }; };

test('PURE: capability, scale, named operator and the feat are each required', () => {
  const cap = { ok: true, autofireCapable: true }, plain = { ok: true };
  assert.deepEqual(resolveVehicleFireMode({ requested: 'single', authority: plain, scale: 'starship' }), { ok: true, mode: 'single' });
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: plain, scale: 'starship' }).reason, FIRE_MODE_REASONS.NOT_CAPABLE);
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: null, scale: 'starship' }).reason, FIRE_MODE_REASONS.NOT_CAPABLE);
  const a = resolveVehicleFireMode({ requested: 'autofire', authority: cap, scale: 'starship' });
  assert.deepEqual([a.ok, a.attackPenalty, a.extraDice, a.halfDamageOnMiss], [true, -5, 0, true]);
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: cap, scale: 'character' }).reason, FIRE_MODE_REASONS.AREA_AT_CHARACTER_SCALE);
  assert.equal(resolveVehicleFireMode({ requested: 'autofire', authority: cap, scale: null }).reason, FIRE_MODE_REASONS.UNKNOWN_SCALE);
  const w = { id: 'w', name: 'Double Blaster Cannon', type: 'weapon', system: {} };
  assert.equal(resolveVehicleFireMode({ requested: 'burst', authority: cap, operatorActor: null, scale: 'starship' }).reason, FIRE_MODE_REASONS.NO_NAMED_OPERATOR);
  assert.equal(resolveVehicleFireMode({ requested: 'burst', authority: cap, operatorActor: gunner(), scale: 'starship', burstOption: burstFireOptionOf(gunner(), w) }).reason, FIRE_MODE_REASONS.NO_FEAT);
  for (const scale of ['starship', 'character']) {
    const g = gunner('Burst Fire');
    const b = resolveVehicleFireMode({ requested: 'burst', authority: cap, operatorActor: g, scale, burstOption: burstFireOptionOf(g, w) });
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
  assert.deepEqual([resolveDamageDisposition((await shootD20(2, dbl, targetAt(1), {})).workflowContext).damageAllowed], [false], 'single fire: a miss deals nothing');
  assert.equal(await shootD20(15, dbl, targetAt(1), { autofire: true }), null, 'not set to autofire: refused, not switched for free');
  assert.match(log.join('|'), /AUTOFIRE_MODE_NOT_SET/);
  const set = await VehicleFireModeService.setMode({ vehicle: state().vehicle, weapon: dbl, mode: 'autofire' });
  assert.equal(set.ok, true, JSON.stringify(set));
  const auto = await shootD20(15, dbl, targetAt(1), { autofire: true });
  assert.ok(single && auto, log.join('|'));
  assert.equal(total(single) - total(auto), 5, 'autofire is exactly -5 against the same single attack');
  const miss = await shootD20(2, dbl, targetAt(1), { autofire: true });
  const d = resolveDamageDisposition(miss.workflowContext);
  assert.deepEqual([d.damageAllowed, d.multiplier], [true, 0.5]);
  assert.equal(miss.workflowContext.ruleData.halfDamageOnMiss, true);
  // burst: abstract crew has no feats
  assert.equal(await shootD20(15, dbl, targetAt(1), { fireMode: 'burst' }), null);
  assert.match(log.join('|'), /BURST_FIRE_REQUIRES_A_NAMED_OPERATOR/);
  // a weapon without autofire capability
  const plain = await install('laser-cannon-light', null, 'turret-2');
  assert.equal(await shootD20(15, plain, targetAt(1), { autofire: true }), null);
  assert.deepEqual(await VehicleFireModeService.setMode({ vehicle: state().vehicle, weapon: plain, mode: 'autofire' }), { ok: false, reason: 'AUTOFIRE_CAPABILITY_NOT_ESTABLISHED' });
  // back to single fire (swift): a miss deals nothing again
  assert.equal((await VehicleFireModeService.setMode({ vehicle: state().vehicle, weapon: dbl, mode: 'single' })).ok, true);
  assert.equal(resolveDamageDisposition((await shootD20(2, dbl, targetAt(1), {})).workflowContext).damageAllowed, false);
});

test('STOCK: a group is autofire-capable exactly when its record prints an autofire attack figure equal to its attack total less 5', async () => {
  const { actors } = await import('./helpers/vehicle-weapon-world.mjs');
  const { assessStockWeaponGroups } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-groups.js');
  let capable = 0, executableCapable = 0;
  for (const d of actors) for (const g of assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups) {
    const v = g.evidence?.autofireAttackBonus ?? g.evidence?.autofireBonus;
    const expected = typeof v === 'number' && g.attackBonusPrinted !== null && g.attackBonusPrinted - v === 5 && !g.ammunition;
    assert.equal(g.autofireCapable === true, expected, g.groupKey);
    if (g.autofireCapable) { capable++; if (g.executable) executableCapable++; }
  }
  assert.ok(capable >= 100 && executableCapable >= 50, `${capable} capable, ${executableCapable} executable`);
});

test('SHEET: the firing-mode view lists only autofire-capable weapons and the action drives the swift-action service', async () => {
  const { buildWeaponOpsView, runWeaponAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js');
  world();
  const dbl = await install('blaster-cannon-light', 'cannon-double');
  await install('laser-cannon-light', null, 'turret-2');
  const { vehicle } = state();
  vehicle.items.contents ??= [...vehicle.items.values()];
  const view = buildWeaponOpsView(vehicle, { isGM: true });
  assert.deepEqual(view.fireModes.map(r => r.itemId), [dbl.id], 'a plain cannon has no mode switch');
  assert.deepEqual([view.fireModes[0].mode, view.fireModes[0].canSwitchToAutofire, view.fireModes[0].canSwitchToSingle, view.fireModes[0].cost], ['single', true, false, 'Swift action to set autofire (switching back is free)']);
  const said = [];
  const r = await runWeaponAction({ action: 'fire-mode-autofire', itemId: dbl.id, vehicle }, { service: VehicleFireModeService, notify: { info: m => said.push(m), warn: m => said.push('W ' + m) } });
  assert.equal(r.ok, true, said.join('|'));
  const after = buildWeaponOpsView(vehicle, { isGM: true }).fireModes[0];
  assert.deepEqual([after.mode, after.canSwitchToAutofire, after.canSwitchToSingle], ['autofire', false, true]);
  assert.equal(buildWeaponOpsView(vehicle, { isGM: false }).canAct, vehicle.isOwner === true);
});
