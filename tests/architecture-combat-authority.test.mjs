/**
 * Combat authority guard: vehicle combat is a set of thin ADAPTERS over the shared SWSE combat authorities. This file pins the dependency
 * boundaries and the behavioural equivalences (not file counts or keywords): one owner per mechanic.
 *
 *   attack options / feats ........ CombatOptionResolver      (vehicle fire mode asks it; no feat-name lookup)
 *   grapple / control state ....... weapon-control-effects + GrappleStateEngine   (vehicle tractor beam is an adapter)
 *   damage / shields / DR / HP .... DamageMitigationManager + DamageResolutionEngine + ActorEngine
 *   action economy ................ ActionEconomyConsumption
 *   range bands and penalties ..... RangeEngine / getRangePenalty (vehicle adapter only measures squares)
 *   personal ammunition ........... AmmoSystem (never touches a vehicle weapon: they carry no ammunition pool)
 *   vehicle ammunition ............ VehicleAmmunitionService (the one ledger per launcher)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, install, state } from './helpers/vehicle-weapon-world.mjs';

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const read = f => fs.readFileSync(f, 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const vehicleModules = [...walk('scripts/domain/vehicles'), ...walk('scripts/engine/vehicles'), 'scripts/engine/combat/vehicle-attack-range.js', 'scripts/engine/combat/vehicle-attack-math.js']
  .filter(f => f.endsWith('.js') && !f.includes('generated') && !f.endsWith('vehicle-errata-migration.js'));   // (the errata migration corrects published DATA; it is not combat)

test('BOUNDARY: no vehicle module looks a feat up by display name, writes grapple state, or writes hit points / shields / condition directly', () => {
  for (const f of vehicleModules) {
    const src = strip(read(f));
    assert.doesNotMatch(src, /['"`]burst fire['"`]/i, `${f}: Burst Fire belongs to CombatOptionResolver`);
    assert.doesNotMatch(src, /flags\.swse\.grappleState|createActiveEffects|GrappleStateEngine\.(advancePair|clearPair|clearState)/, `${f}: grapple/control state belongs to weapon-control-effects + GrappleStateEngine`);
    assert.doesNotMatch(src, /['"`]system\.(hp\.value|shields\.value|conditionTrack\.current)['"`]/, `${f}: HP / shields / condition track are written by ActorEngine's damage resolution`);
  }
});

test('BOUNDARY: vehicle adapters reach the shared authorities', () => {
  assert.match(read('scripts/engine/vehicles/vehicle-fire-mode-service.js'), /CombatOptionResolver/);
  assert.match(read('scripts/engine/vehicles/vehicle-fire-mode-service.js'), /ActionEconomyConsumption\.spend\(/);
  assert.match(read('scripts/engine/vehicles/vehicle-tractor-beam.js'), /applyWeaponControlRecord/);
  assert.match(read('scripts/engine/vehicles/vehicle-tractor-beam.js'), /resolveVehicleAttackRange|controlDeclarationOf/);
  assert.match(read('scripts/engine/combat/vehicle-attack-range.js'), /RangeEngine/);
  assert.match(read('scripts/engine/combat/damage-mitigation-manager.js'), /isShieldbuster/);
  // the autofire penalty has one definition
  assert.match(read('scripts/combat/rolls/enhanced-rolls.js'), /AUTOFIRE_ATTACK_PENALTY/);
  assert.match(read('scripts/domain/vehicles/vehicle-fire-mode.js'), /AUTOFIRE_ATTACK_PENALTY/);
  assert.doesNotMatch(strip(read('scripts/domain/vehicles/vehicle-fire-mode.js')), /=\s*-5\b/);
});

test('BOUNDARY: range penalties have one definition (the vehicle adapter measures squares and picks a band; it prints no penalty)', () => {
  const src = strip(read('scripts/domain/vehicles/vehicle-weapon-range.js'));
  assert.doesNotMatch(src, /(short|medium|long|pointBlank)\s*:\s*-?\d+\s*[,}]/, 'no band penalty literals');
});

test('BOUNDARY: sheet controls call services, never the actor engine', () => {
  const ops = strip(read('scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js'));
  assert.doesNotMatch(ops, /ActorEngine|\.update\(|setFlag/);
});

test('STATE: a vehicle weapon carries no personal-ammunition pool, so AmmoSystem cannot spend a second ledger for the same shot', async () => {
  world();
  const { AmmoSystem } = await import('../scripts/engine/inventory/ammo-system.js');
  const installed = await install('proton-torpedo-launcher');
  assert.equal(AmmoSystem.weaponUsesAmmunition(installed), false);
  assert.equal(installed.system?.ammunition === undefined || installed.system.ammunition === null || !installed.system.ammunition.max, true);
  assert.ok(state().vehicle);
});

test('EQUIVALENCE: vehicle Burst Fire gets the SAME option result as the character attack for the same actor and weapon', async () => {
  const { CombatOptionResolver } = await import('../scripts/engine/combat/combat-option-resolver.js');
  const { burstFireOptionOf } = await import('../scripts/engine/vehicles/vehicle-fire-mode-service.js');
  const rules = JSON.parse(read('packs/feats.db').split('\n').find(l => l.includes('"name":"Burst Fire"'))).system.abilityMeta.rules;
  const items = [{ type: 'feat', name: 'Burst Fire', system: { abilityMeta: { rules } } }];
  const gunner = { type: 'character', name: 'G', items: { contents: items, [Symbol.iterator]: () => items[Symbol.iterator]() }, system: { abilities: { str: { total: 14, value: 14, mod: 2 } } } };
  const weapon = { id: 'w', name: 'Some cannon', type: 'weapon', system: { meleeOrRanged: 'ranged', weaponCategory: 'ranged' } };
  const ctx = { autofire: true, attackMode: 'autofire', combatOptions: { burstFire: true }, attackOptions: { burstFire: true } };
  const m = CombatOptionResolver.collectAttackModifiers(gunner, weapon, ctx);
  const v = burstFireOptionOf(gunner, weapon);
  assert.deepEqual([v.available, v.attackModifier, v.damageExtraWeaponDice], [true, m.attackBonus, m.damageExtraWeaponDice], 'the same option result: feat ownership, penalty and extra dice come from the resolver');
});
