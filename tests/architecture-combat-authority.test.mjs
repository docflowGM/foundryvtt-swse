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
    assert.doesNotMatch(src, /flags\.swse\.grappleState|GrappleStateEngine\.(advancePair|clearPair|clearState)/, `${f}: grapple/control state belongs to weapon-control-effects + GrappleStateEngine`);
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

// ---- production reachability: what the module entry point (system.json esmodules -> index.js) can actually load ----
const ROOT = process.cwd();
function reachableFromIndex() {
  const toFile = s => (s.startsWith('/systems/foundryvtt-swse/') ? path.join(ROOT, s.slice('/systems/foundryvtt-swse/'.length)) : null);
  const resolve = (from, s) => (s.startsWith('.') ? path.resolve(path.dirname(from), s) : toFile(s));
  const re = /(?:import\s+(?:[^'"]*?from\s+)?|import\(\s*|export\s+[^'"]*?from\s+)['"]([^'"]+)['"]/g;
  const seen = new Set(), q = [path.join(ROOT, 'index.js')];
  while (q.length) {
    const f = q.pop();
    if (!f || seen.has(f) || !fs.existsSync(f)) continue;
    seen.add(f);
    for (const m of read(f).matchAll(re)) { const t = resolve(f, m[1]); if (t) q.push(t); }
  }
  return seen;
}

test('PRODUCTION: the vehicle guards, arming hooks and every shared authority a vehicle attack needs are reachable from index.js; the legacy duplicates are gone', () => {
  const seen = reachableFromIndex();
  for (const f of [
    'scripts/actors/vehicle/vehicle-precreate-hooks.js',          // provenance / ledger / shipyard-Item guards + stock arming (was registered only in an unloaded file)
    'scripts/engine/vehicles/vehicle-errata-migration-service.js',
    'scripts/combat/rolls/attacks.js', 'scripts/engine/combat/combat-option-resolver.js', 'scripts/engine/combat/damage-mitigation-manager.js',
    'scripts/engine/combat/weapon-control-effects.js', 'scripts/engine/combat/grapple-state-engine.js', 'scripts/engine/combat/vehicle-attack-range.js',
    'scripts/engine/vehicles/vehicle-fire-mode-service.js', 'scripts/engine/vehicles/vehicle-ammunition-service.js', 'scripts/engine/vehicles/vehicle-tractor-beam.js'
  ]) assert.ok(seen.has(path.join(ROOT, f)), `${f} must be reachable from index.js`);
  for (const f of ['scripts/combat/systems/vehicle/vehicle-weapons.js', 'scripts/actors/vehicle/swse-vehicle-core.js']) {
    assert.equal(fs.existsSync(f), false, `${f} is a retired duplicate vehicle combat path`);
  }
  assert.doesNotMatch(read('index.js'), /SWSEVehicleWeapons|SWSEVehicleCore/);
});

// (hook registration is verified exactly-once, with handler behaviour, in vehicle-universal-phase4e-p42-startup-and-operator.test.mjs)

test('BOUNDARY: no vehicle module registers a combat-turn hook or owns a second turn processor (the control engine\'s turn hook is the only one)', () => {
  for (const f of vehicleModules) assert.doesNotMatch(strip(read(f)), /Hooks\.(on|once)\(\s*['"](combatTurn|combatRound|updateCombat|combatStart|deleteCombat)/, f);
  const tractor = strip(read('scripts/engine/vehicles/vehicle-tractor-beam.js'));
  assert.doesNotMatch(tractor, /ActorEngine|updateEmbeddedDocuments|setFlag|Hooks\./, 'the tractor adapter holds no state and no hook');
});

test('ACTIONS: setting autofire spends exactly one swift action (the FireStateStore convention: only the costly form is priced); no-ops, switching back and refusals spend none; a failed write rolls the action back', async () => {
  world();
  const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
  const { VehicleFireModeService } = await import('../scripts/engine/vehicles/vehicle-fire-mode-service.js');
  const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
  const dbl = await install('blaster-cannon-light', 'cannon-double');
  const plain = await install('laser-cannon-light', null, 'turret-2');
  const { vehicle } = state();
  const spends = [], rollbacks = [];
  const realSpend = ActionEconomyConsumption.spend, realUpdate = ActorEngine.updateActor;
  ActionEconomyConsumption.spend = async (a, type, meta) => { spends.push(type); return { allowed: true, rollback: async () => { rollbacks.push(type); } }; };
  try {
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire' })).ok, true);
    assert.deepEqual(spends, ['swift']);
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire' })).unchanged, true);
    assert.equal(spends.length, 1, 'already in that mode: nothing spent');
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: plain, mode: 'autofire' })).ok, false);
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'burst' })).ok, false, 'invalid mode');
    const owned = vehicle.isOwner; vehicle.isOwner = false;
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'single', user: { isGM: false } })).reason, 'FIRE_MODE_NOT_AUTHORIZED');
    vehicle.isOwner = owned;
    assert.equal(spends.length, 1, 'refusals spend nothing');
    assert.equal((await VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'single' })).ok, true);
    assert.equal(spends.length, 1, 'switching back to single fire is not priced');
    ActorEngine.updateActor = async () => { throw new Error('write failed'); };
    await assert.rejects(VehicleFireModeService.setMode({ vehicle, weapon: dbl, mode: 'autofire' }), /write failed/);
    assert.deepEqual([spends.length, rollbacks], [2, ['swift']], 'the failed write rolled its action back');
  } finally { ActionEconomyConsumption.spend = realSpend; ActorEngine.updateActor = realUpdate; }
});

test('STATE: a launcher has exactly one ammunition balance: an Item cannot claim both stock and installed provenance, and the stock/aftermarket stores are exclusive', async () => {
  world();
  const { resolveVehicleWeaponAuthority } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');
  const { VehicleAmmunitionService } = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
  const w = await install('proton-torpedo-launcher');
  const both = { ...w, flags: { swse: { ...w.flags.swse, vehicleStockWeapon: { sourceEntryKey: 'x', groupKey: 'y' } } }, actor: w.actor, system: w.system };
  assert.equal(resolveVehicleWeaponAuthority(both).ok, false);
  assert.match(resolveVehicleWeaponAuthority(both).reason, /BOTH_STOCK_AND_INSTALLED/);
  const family = VehicleAmmunitionService.familyOf(w);
  assert.equal(family.origin, 'aftermarket');
  assert.equal(w.flags.swse.vehicleAmmo, undefined, 'an aftermarket launcher keeps no Item-level ledger (the vehicle flag is its only balance)');
});
