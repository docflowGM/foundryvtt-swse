/**
 * WE-L1 (Complete Weapon Ecosystem): aftermarket proton torpedo and concussion missile LAUNCHERS through the Shipyard, with the
 * ammunition bought per unit (real TransactionEngine charge, one transaction with the ledger) and fired through the finite-ammunition
 * ledger, the starship-scale single-target splash and the lock-on projectile engine (P6C-3B/3C/3D) -- the first COMPLETE launcher
 * family in the codebase. Stock launcher groups are covered by p30; nothing here is a statblock.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as J from '../scripts/domain/vehicles/vehicle-installation-jobs.js';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import * as A from '../scripts/domain/vehicles/vehicle-ammunition-ledger.js';
import { LAUNCHER_CAPACITY } from '../scripts/domain/vehicles/vehicle-launcher-capacity.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import { resolveVehicleWeaponAuthority } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

installSystemsResolver(); installFoundryStubs();
const { VehicleInstallationService: S } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { VehicleAmmunitionService, readAftermarketLedgers } = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
const { VehicleProjectileService } = await import('../scripts/engine/vehicles/vehicle-projectile-service.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const { SWSEChat } = await import('../scripts/chat/swse-chat.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const printed = JSON.parse(readFileSync('data/audits/vehicles/p6a/print-verified-components-v2.json', 'utf8'));
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const catalogRow = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
const HULLS = { fighter: 'core-incom-t-65b-x-wing-starfighter', frigate: 'cw-c-9979-landing-craft' };

// launcher id, ammunition id, ammunition damage, units price, EP, launcher price, standard capacity, hull
const ROWS = [
  ['proton-torpedo-launcher', 'proton-torpedo', '9d10x2', 800, 1, 2500, 3, 'fighter'],
  ['concussion-missile-launcher-light', 'concussion-missile-light', '7d10x2', 500, 2, 2000, 6, 'fighter'],
  ['concussion-missile-launcher-medium', 'concussion-missile-medium', '9d10x2', 750, 5, 3500, 16, 'fighter'],
  ['concussion-missile-launcher-heavy', 'concussion-missile-heavy', '9d10x5', 2000, 20, 30000, 30, 'frigate']
];

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
const rules = { resolveEpBudget: () => ({ state: 'known', total: 60 }), resolveUninstallRefund: () => null, allowEpShortfall: false, resolveNonstandard: () => ({ nonstandard: false, basis: 'FIXTURE' }) };
const GM_MOUNT = { mountKey: 'tube-1', arc: 'omni', operatorRole: 'pilot', reason: 'launch tube fitted at the yard' };

let src, vehicle, owner, items, seq = 0;
function world({ hull = 'fighter', credits = 500000, gm = true } = {}) {
  src = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === HULLS[hull]));
  src.system.ownedByActorId = 'owner1';
  items = new Items();
  vehicle = { ...src, id: 'veh1', name: 'Test hull', isOwner: true, items, getActiveTokens: () => [token(0, 0)], getRollData: () => ({}), toObject() { return structuredClone(src); } };
  owner = { id: 'owner1', name: 'Owner', isOwner: true, system: { credits }, flags: {}, toObject() { return { system: this.system }; }, getFlag: () => [] };
  Object.assign(globalThis.game, { user: Object.assign(globalThis.game.user ?? {}, { id: gm ? 'gm1' : 'u1', isGM: gm }), actors: { get: id => ({ owner1: owner, veh1: vehicle })[id], contents: [] }, users: new Map(), combat: null });
  ActorEngine.applyMutationPlan = async (actor, plan) => {
    if (actor.id === 'veh1') for (const [k, v] of Object.entries(plan.set ?? {})) { const m = /^flags\.swse\.(.+)$/.exec(k); if (m) src.flags.swse[m[1]] = structuredClone(v); }
    if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
  };
  const snaps = new Map();
  SnapshotManager.createSnapshot = async actor => { const t = snaps.size + 1; snaps.set(`${actor.id}:${t}`, { credits: actor.system?.credits, flags: structuredClone(src.flags) }); return { timestamp: t }; };
  SnapshotManager.restoreSnapshot = async (actor, ts) => { const s = snaps.get(`${actor.id}:${ts}`); if (s && actor.id === 'owner1') actor.system.credits = s.credits; if (s && actor.id === 'veh1') Object.assign(src.flags.swse, structuredClone(s.flags.swse)); return true; };
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const d of data) { const id = 'i' + (++seq); items.set(id, { id, ...structuredClone(d), actor: vehicle }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) items.delete(id); };
  // actor writes land on the in-memory flags as ActorEngine would apply them ("==" replaces the stored object)
  ActorEngine.updateActor = async (actor, data) => {
    for (const [path, value] of Object.entries(data)) {
      const parts = path.split('.'); let o = actor;
      for (const k of parts.slice(0, -1)) o = (o[k] ??= {});
      const last = parts.at(-1); o[last.startsWith('==') ? last.slice(2) : last] = structuredClone(value);
    }
  };
  S.rules = rules;
}
const jobs = hull => J.readJobs(src.flags, HULLS[hull]).jobs;
const entries = hull => L.readCertifiedInstallations(src.flags, HULLS[hull]).entries;
const managed = () => items.contents.filter(i => i.flags?.swse?.vehicleInstalledWeapon);
const ledgerOf = installId => readAftermarketLedgers(vehicle)[installId];
const conserved = l => l.loaded + l.reserve + l.expended === l.payload;
const catalogOf = id => new Map([[id, catalogRow(id)]]);

async function buyLauncher(id, hull) {
  const start = await S.startJob({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), mount: GM_MOUNT });
  assert.equal(start.success, true, `${id}: ${JSON.stringify(start)}`);
  const job = jobs(hull)[0];
  assert.equal((await S.logWorkDays({ ownerActor: owner, vehicle, jobId: job.jobId, days: J.describeJob(job).daysRequired })).success, true);
  const done = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, total: 99 });
  assert.equal(done.success, true, `${id}: ${JSON.stringify(done)}`);
  return { entry: entries(hull)[0], weapon: managed()[0], done };
}

const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = globalThis.game.settings ?? { get: () => undefined };
const realPost = SWSEChat.postRoll; SWSEChat.postRoll = async () => ({ id: 'm' });
test.after(() => { SWSEChat.postRoll = realPost; });
const vtarget = (reflex = 15, id = 'tgt') => ({ id, type: 'vehicle', items: [], system: { size: 'medium', defenses: { reflex: { total: reflex } } }, getActiveTokens: () => [token(300, 0)] });
async function withD20(d20, fn) {
  const r0 = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
  try { return await fn(); } finally { RollEngine.safeRoll = r0; }
}
const shoot = (veh, w, d20, { reflex = 15, aim = false, followUp = null, target = vtarget(reflex) } = {}) =>
  withD20(d20, async () => { log.length = 0; return rollAttack(veh, w, { abstractCrewQuality: 'normal', target, ...(aim ? { aim: true } : {}), ...(followUp ? { guidedFollowUp: followUp } : {}) }); });
const withCombat = (actorsIn, round, fn) => { const prev = globalThis.game.combat; globalThis.game.combat = { id: 'c1', round, combatants: { contents: actorsIn.map(a => ({ actor: a })) } }; return Promise.resolve(fn()).finally(() => { globalThis.game.combat = prev; }); };

// ----------------------------------------------------------------------------------------------------------------------
test('SOURCE: launcher and ammunition rows equal their PDF-verified Table 3-5 cells; capacity is the printed standard; unpromoted launchers stay unpromoted', () => {
  const pr = new Map();
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.source?.table === '3-5' && o.printedName) pr.set(o.printedName.toLowerCase(), o); Object.values(o).forEach(walk); } })(printed);
  const printedOf = name => pr.get(name.toLowerCase().replace(/^(\w+) (\w+) (\w+), (\w+)$/, '$1 $2 $3, $4'));
  for (const [id, ammoId, damage, price, ep, cost, capacity] of ROWS) {
    const launcher = weapons.find(w => w.id === id), ammo = weapons.find(w => w.id === ammoId);
    assert.deepEqual([launcher.emplacementPoints, launcher.cost, launcher.damage, launcher.ammunition, launcher.category], [ep, cost, 'See Ammunition', ammoId, 'Weapon'], id);
    assert.deepEqual([ammo.damage, ammo.cost, ammo.category, ammo.emplacementPoints], [damage, price, 'Ammunition', 0], ammoId);
    const pl = printedOf(launcher.name), pa = printedOf(ammo.name);
    assert.ok(pl && pa, `${id}: printed rows exist`);
    assert.deepEqual([pl.emplacementPoints, pl.cost.credits, pl.source.printedPage, pl.damageStatus], [ep, cost, 47, 'NOT_STATED'], id);
    assert.deepEqual([pa.damage, pa.damageStatus, pa.cost.credits, pa.emplacementPoints], [damage, 'PDF_VERIFIED', price, 0], ammoId);
    const fx = E.EFFECTS[id];
    assert.deepEqual([fx.kind, fx.damage, fx.ammunition.id, fx.ammunition.price, fx.ammunition.capacity, fx.guided, fx.area], ['weapon', damage, ammoId, price, capacity, true, { kind: 'splash', squares: 4 }], id);
    assert.equal(fx.ammunition.capacity, LAUNCHER_CAPACITY[id].standard, 'one capacity authority');
    assert.equal(cert[id].status, 'MECHANIC_SPECIFIED'); assert.equal(cert[id].effectTest, 'tests/vehicle-universal-phase4e-p33-aftermarket-launchers.test.mjs');
    assert.notEqual(cert[ammoId]?.status, 'MECHANIC_SPECIFIED', 'ammunition is a consumable, never an installation');
  }
  // launchers whose special rules are not implemented, and capacity expansion, are NOT promoted
  for (const id of ['ion-bomb-rack', 'discord-missile-launcher', 'gravity-mine-launcher', 'proton-grenade-launcher'])
    assert.notEqual(cert[id]?.status, 'MECHANIC_SPECIFIED', id);
});

for (const [id, ammoId, damage, price, ep, cost, capacity, hull] of ROWS) {
  test(`${id}: purchase -> install -> empty -> buy ammunition -> GM reload -> fire -> damage -> removal`, async () => {
    world({ hull });
    const c0 = owner.system.credits;
    const { entry, weapon, done } = await buyLauncher(id, hull);
    assert.equal(c0 - owner.system.credits, cost, 'the printed launcher price was charged once');
    assert.deepEqual([entry.catalogId, entry.epCost, entry.executable], [id, ep, true]);
    assert.equal(done.weaponItems.success, true);
    assert.equal(weapon.name, weapons.find(w => w.id === id).name);
    assert.equal(weapon.system.damage, damage, "the Item's damage is its ammunition's printed damage");
    assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'CERTIFIED_INSTALLATION');

    // the authority: a finite-ammunition guided launcher with the printed 4-square splash, derived from the certified spec (never the Item)
    const auth = resolveVehicleWeaponAuthority(weapon);
    assert.deepEqual([auth.ok, auth.origin, auth.area, auth.ammunition.origin, auth.ammunition.guided, auth.ammunition.capacity, auth.ammunition.ammunition, auth.ammunition.unitPrice],
      [true, 'installed', { kind: 'splash', squares: 4 }, 'aftermarket', true, capacity, ammoId, price]);

    // NOTHING is bought yet: an empty launcher cannot fire, and looking at it creates no ammunition and no charge
    const c1 = owner.system.credits;
    assert.equal(await shoot(vehicle, weapon, 20), null); assert.match(log.join('|'), /AMMO_LAUNCHER_EMPTY|empty/i);
    assert.equal(owner.system.credits, c1); assert.equal(ledgerOf(entry.installId), undefined);

    // BUY: credits and ledger change together; ammunition arrives in RESERVE, not in the launcher
    const units = Math.min(capacity, 4);
    const buy = await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: entry.installId, units });
    assert.equal(buy.success, true, JSON.stringify(buy));
    assert.equal(c1 - owner.system.credits, units * price, 'units x the printed per-unit price');
    assert.deepEqual([buy.cost, ledgerOf(entry.installId).payload, ledgerOf(entry.installId).reserve, ledgerOf(entry.installId).loaded, ledgerOf(entry.installId).expended], [units * price, units, units, 0, 0]);
    assert.equal(conserved(ledgerOf(entry.installId)), true);
    assert.equal(await shoot(vehicle, weapon, 20), null, 'reserve is not loaded: the launcher is still empty');

    // GM RELOAD (V-P6C-06: moves reserve to loaded, creates nothing, no action cost invented); a player cannot
    globalThis.game.user.isGM = false;
    assert.equal((await VehicleAmmunitionService.gmReload(vehicle, weapon, { user: globalThis.game.user })).reason, A.AMMO_REASONS.GM_ONLY);
    globalThis.game.user.isGM = true;
    const rl = await VehicleAmmunitionService.gmReload(vehicle, weapon, { user: globalThis.game.user });
    assert.deepEqual([rl.ok, rl.moved, ledgerOf(entry.installId).loaded, ledgerOf(entry.installId).reserve, ledgerOf(entry.installId).payload], [true, units, units, 0, units]);

    // FIRE: one unit per launch (hit or miss), the ordinary vehicle attack, damage = ammunition dice x its multiplier
    const shot = await shoot(vehicle, weapon, 15);
    assert.ok(shot, log.join('|'));
    assert.equal(shot.attackDomain, 'vehicle-abstract-crew'); assert.equal(shot.vehicleAmmoSpend.spent, true);
    assert.deepEqual([ledgerOf(entry.installId).loaded, ledgerOf(entry.installId).expended, conserved(ledgerOf(entry.installId))], [units - 1, 1, true]);
    const [, dice, mult] = /^(\d+d10)x(\d+)/.exec(damage);
    assert.equal(buildDamageFormula(resolveDamageComposition(vehicle, weapon, { weapon })), `(${dice}) * ${mult}`);
    if (hull === 'frigate') assert.equal(shot.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty').length, 1, 'a capital launcher carries the Core -20 against a smaller target once');
    // the 4-square splash is an ordinary area: at CHARACTER scale it is refused before any cost
    const before = JSON.stringify(ledgerOf(entry.installId));
    log.length = 0;
    assert.equal(await shoot(vehicle, weapon, 15, { target: { id: 'trooper', type: 'character', items: [], system: { defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(300, 0)] } }), null);
    assert.match(log.join('|'), /INSTALLED_AREA_/); assert.equal(JSON.stringify(ledgerOf(entry.installId)), before, 'a refused attack spends nothing');

    // EMPTY AGAIN: spend the rest, then the next launch is refused
    for (let i = 1; i < units; i++) assert.ok(await shoot(vehicle, weapon, 15), `shot ${i + 1}`);
    assert.deepEqual([ledgerOf(entry.installId).loaded, ledgerOf(entry.installId).expended], [0, units]);
    assert.equal(await shoot(vehicle, weapon, 15), null);

    // REMOVAL: the installation, the Item and the right to fire go; the orphaned record is never read for another installation
    const rm = await S.uninstall({ ownerActor: owner, vehicle, installId: entry.installId });
    assert.equal(rm.success, true, JSON.stringify(rm));
    assert.equal(managed().length, 0);
    assert.equal(await shoot(vehicle, weapon, 15), null);
  });
}

test('credits: an unaffordable or malformed purchase changes nothing; the transaction is one unit with the ledger', async () => {
  world();
  const { entry } = await buyLauncher('proton-torpedo-launcher', 'fighter');
  const id = entry.installId;
  const wallet = () => owner.system.credits;
  owner.system.credits = 1500;                                    // two torpedoes cost 1,600
  let before = [wallet(), JSON.stringify(readAftermarketLedgers(vehicle))];
  let r = await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units: 2 });
  assert.deepEqual([r.success, r.reasons], [false, ['INSUFFICIENT_CREDITS']]);
  assert.deepEqual([wallet(), JSON.stringify(readAftermarketLedgers(vehicle))], before, 'neither credits nor ledger moved');
  owner.system.credits = 100000;
  for (const units of [0, -1, 1.5, '3', null, undefined, Infinity]) {
    r = await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units });
    assert.equal(r.success, false, String(units)); assert.deepEqual(r.reasons, ['AMMO_PURCHASE_QUANTITY_INVALID']);
  }
  assert.equal(wallet(), 100000);
  assert.deepEqual((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: 'nope', units: 1 })).reasons, ['INSTALL_NOT_FOUND']);
  // a laser cannon is not an ammunition launcher
  const laser = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'laser-cannon-light', catalog: catalogOf('laser-cannon-light'), reason: 'refit', mount: { ...GM_MOUNT, mountKey: 'wing' } });
  assert.equal(laser.success, true);
  const laserId = entries('fighter').find(e => e.catalogId === 'laser-cannon-light').installId;
  assert.deepEqual((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: laserId, units: 1 })).reasons, ['INSTALLATION_IS_NOT_AN_AMMUNITION_LAUNCHER']);
  // a stranger cannot spend someone else's wallet on this vehicle
  globalThis.game.user.isGM = false;
  assert.deepEqual((await S.purchaseAmmunition({ ownerActor: { ...owner, id: 'stranger' }, vehicle, installId: id, units: 1 })).reasons, ['OWNER_VEHICLE_NOT_ASSOCIATED']);
  globalThis.game.user.isGM = true;
});

test('integrity: the ammunition flag is guarded; hand-edited ledgers are refused; deleting the Item cannot refill the launcher', async () => {
  world();
  const { entry, weapon } = await buyLauncher('proton-torpedo-launcher', 'fighter');
  const id = entry.installId;
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units: 3 })).success, true);
  assert.equal((await VehicleAmmunitionService.gmReload(vehicle, weapon, { user: globalThis.game.user })).ok, true);
  assert.ok(await shoot(vehicle, weapon, 15));
  const l = ledgerOf(id);
  assert.deepEqual([l.loaded, l.reserve, l.expended, l.payload], [2, 0, 1, 3]);

  // the write guard: nothing but the service may change the flag, in any of its spellings
  const next = { [id]: { ...l, loaded: 3 } };
  for (const changes of [{ 'flags.swse.vehicleAmmunition': next }, { flags: { swse: { vehicleAmmunition: next } } }, { 'flags.swse.==vehicleAmmunition': next }, { flags: { swse: { '==vehicleAmmunition': next } } }, { 'flags.swse.-=vehicleAmmunition': null }])
    assert.equal(L.isLedgerUpdateAllowed('veh1', changes), false, JSON.stringify(Object.keys(changes)));
  L.authorizeFlagWrite('veh1', 'vehicleAmmunition', next);
  assert.equal(L.isLedgerUpdateAllowed('veh1', { 'flags.swse.==vehicleAmmunition': next }), true, 'the authorized exact value passes');
  assert.equal(L.isLedgerUpdateAllowed('veh1', { 'flags.swse.==vehicleAmmunition': { [id]: { ...l, loaded: 2 } } }), false, 'any other value does not');
  L.clearLedgerWrite('veh1');

  // an edit that slips past the guard is still refused by the model: conservation and capacity
  const keep = structuredClone(src.flags.swse.vehicleAmmunition);
  for (const edit of [x => { x.loaded = 9; }, x => { x.payload = 99; }, x => { x.capacity = 99; x.loaded = 3; }, x => { x.reserve = 5; }, x => { x.launcherId = 'laser-cannon-light'; }, x => { x.launchers = 2; }, x => { x.expended = 0; }]) {
    src.flags.swse.vehicleAmmunition = structuredClone(keep); edit(src.flags.swse.vehicleAmmunition[id]);
    const c = await VehicleAmmunitionService.canLaunch(vehicle, weapon);
    assert.equal(c.ok, false, JSON.stringify(src.flags.swse.vehicleAmmunition[id]));
    assert.equal(await shoot(vehicle, weapon, 15), null);
  }
  src.flags.swse.vehicleAmmunition = keep;

  // deleting the owned Item and letting the Shipyard re-create it does not refill the launcher (the ledger belongs to the installation)
  items.delete(weapon.id);
  assert.equal((await S.reconcileWeaponItems({ vehicle })).success, true);
  const again = managed()[0];
  assert.notEqual(again.id, weapon.id);
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended, ledgerOf(id).payload], [2, 1, 3]);
  assert.equal(resolveVehicleWeaponAuthority(again).ammunition.installId, id);
  assert.ok(await shoot(vehicle, again, 15));
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended], [1, 2]);
});

test('LOCK-ON: an aimed aftermarket launch that misses leaves one projectile; the follow-up is free; a second miss self-destructs it', async () => {
  world();
  const { entry, weapon } = await buyLauncher('proton-torpedo-launcher', 'fighter');
  const id = entry.installId;
  await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units: 3 });
  await VehicleAmmunitionService.gmReload(vehicle, weapon, { user: globalThis.game.user });
  const launch = await shoot(vehicle, weapon, 2, { reflex: 40, aim: true });
  assert.equal(launch.isHit, false);
  const proj = launch.guidedProjectile;
  assert.ok(proj, 'a projectile exists'); assert.deepEqual([proj.state, proj.launcherItemId, proj.targetId], ['awaiting-follow-up', weapon.id, 'tgt']);
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended], [2, 1]);
  const fu = await withCombat([vehicle, vtarget()], 2, () => shoot(vehicle, weapon, 19, { followUp: proj.id, reflex: 15 }));
  assert.ok(fu, log.join('|'));
  assert.equal(fu.atkBonus, launch.atkBonus - 5);
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended, conserved(ledgerOf(id))], [2, 1, true], 'the follow-up is not another launch');
  assert.equal(VehicleProjectileService.read(vehicle, proj.id).state, 'hit');
  const l2 = await shoot(vehicle, weapon, 2, { reflex: 40, aim: true });
  const fu2 = await shoot(vehicle, weapon, 2, { followUp: l2.guidedProjectile.id, reflex: 40 });
  assert.equal(fu2.isHit, false); assert.equal(VehicleProjectileService.read(vehicle, l2.guidedProjectile.id).state, 'self-destructed');
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended], [1, 2]);
});

test('a failed roll refunds the launch (aftermarket storage); nothing is spent by a refused attack', async () => {
  world();
  const { entry, weapon } = await buyLauncher('proton-torpedo-launcher', 'fighter');
  const id = entry.installId;
  await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units: 2 });
  await VehicleAmmunitionService.gmReload(vehicle, weapon, { user: globalThis.game.user });
  const r0 = RollEngine.safeRoll; RollEngine.safeRoll = async () => { throw new Error('dice exploded'); };
  try { await assert.rejects(() => rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target: vtarget() }), /dice exploded/); } finally { RollEngine.safeRoll = r0; }
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended, conserved(ledgerOf(id))], [2, 0, true], 'the launch was refunded');
  // a user who may not operate the vehicle spends nothing
  vehicle.isOwner = false; globalThis.game.user.isGM = false;
  assert.equal(await shoot(vehicle, weapon, 15), null);
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).expended], [2, 0]);
  vehicle.isOwner = true; globalThis.game.user.isGM = true;
});

test('hull restriction: the heavy concussion launcher refuses a starfighter and is bought by a Colossal (frigate) hull', async () => {
  world({ hull: 'fighter' });
  const refused = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'concussion-missile-launcher-heavy', catalog: catalogOf('concussion-missile-launcher-heavy'), mount: GM_MOUNT });
  assert.equal(refused.success, false); assert.ok(refused.reasons.some(r => r.startsWith('SIZE_')));
  assert.equal(owner.system.credits, 500000);
  world({ hull: 'frigate' });
  assert.equal((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'concussion-missile-launcher-heavy', catalog: catalogOf('concussion-missile-launcher-heavy'), mount: GM_MOUNT })).success, true);
});

// ----------------------------------------------------------------------------------------------------------------------
// Sheet glue: the panel shows the ledger; the buttons call the governed services (nothing on the sheet writes the ledger itself)
// ----------------------------------------------------------------------------------------------------------------------
import { createRequire } from 'node:module';
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
const { runShipyardAction, describeReasons } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js');
let Handlebars = null;
try { Handlebars = createRequire(new URL('../tools/release/package.json', import.meta.url))('handlebars'); } catch { /* optional locally */ }
if (!Handlebars && process.env.SWSE_REQUIRE_HANDLEBARS === '1') throw new Error('handlebars required');

test('SHEET: the view model lists each launcher with its ledger; only a GM sees the reload; the template renders the buttons', async () => {
  world();
  const { entry, weapon } = await buyLauncher('proton-torpedo-launcher', 'fighter');
  const id = entry.installId;
  const wrapActor = () => ({ ...structuredClone(src), id: 'veh1', isOwner: true, items: [], toObject: () => structuredClone(src) });
  const catalog = new Map([['proton-torpedo-launcher', catalogRow('proton-torpedo-launcher')]]);
  const view = isGM => buildVehicleSchemaViewModel(wrapActor(), { catalog, isGM, canAct: true });
  let l = view(true).shipyard.launchers[0];
  assert.deepEqual([l.installId, l.name, l.capacity, l.unitPrice, l.loaded, l.reserve, l.expended, l.bought, l.canReload], [id, 'Proton Torpedo Launcher', 3, 800, 0, 0, 0, 0, false]);
  await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units: 3 });
  l = view(true).shipyard.launchers[0];
  assert.deepEqual([l.loaded, l.reserve, l.bought, l.canReload], [0, 3, 3, true], 'reserve can be loaded by a GM');
  assert.equal(view(false).shipyard.launchers[0].canReload, false, 'a player cannot');
  await VehicleAmmunitionService.gmReload(vehicle, weapon, { user: globalThis.game.user });
  assert.deepEqual([view(true).shipyard.launchers[0].loaded, view(true).shipyard.launchers[0].canReload], [3, false], 'a full launcher cannot be reloaded');
  assert.equal(view(true).shipyard.hasLaunchers, true);
  // the installable list now carries the launchers as ordinary Shipyard options (GM certifies the mount)
  assert.ok(view(true).shipyard.options.some(o => o.id === 'proton-torpedo-launcher' && o.requiresGmMount === true));

  if (Handlebars) {
    const tpl = Handlebars.compile(readFileSync('templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs', 'utf8'));
    const html = isGM => tpl({ view: { ...view(isGM), shipyard: { ...view(isGM).shipyard, canAct: true, isGM } }, swse: {}, canAct: true });
    const gm = html(true), player = html(false);
    assert.match(gm, /data-shipyard-action="buy-ammunition" data-install-id="[^"]+"/);
    assert.match(gm, /Proton Torpedo Launcher<\/strong> — loaded 3 \/ 3 · reserve 0 · expended 0 · bought 3 · 800 cr each/);
    assert.doesNotMatch(gm, /data-shipyard-action="gm-reload"/, 'a full launcher shows no reload');
    assert.doesNotMatch(player, /gm-reload/);
  }
});

test('SHEET ACTIONS: buy-ammunition asks for units and calls the purchase service; gm-reload calls the GM service; neither writes anything itself', async () => {
  const calls = [];
  const service = {
    purchaseAmmunition: async a => { calls.push(['buy', a.installId, a.units, a.ownerActor?.id]); return { success: true, units: a.units, cost: a.units * 800 }; },
    reloadLauncher: async a => { calls.push(['reload', a.installId]); return { success: true, moved: 2 }; }
  };
  const said = [];
  const owner1 = { id: 'o1', type: 'character' };
  const deps = { service, notify: { info: m => said.push('info:' + m), warn: m => said.push('warn:' + m) }, askUnits: async () => 2,
    game: { user: { isGM: false, character: owner1 }, actors: { get: () => owner1, contents: [owner1] } } };
  const veh = { id: 'veh1', isOwner: true, system: { ownedByActorId: 'o1' }, flags: { swse: {} } };
  const r = await runShipyardAction({ action: 'buy-ammunition', installId: 'inst9', vehicle: veh }, deps);
  assert.equal(r.success, true); assert.deepEqual(calls[0], ['buy', 'inst9', 2, 'o1']);
  assert.match(said.at(-1), /Bought 2 for 1600 credits; it is in the launcher's reserve/);
  assert.deepEqual((await runShipyardAction({ action: 'buy-ammunition', vehicle: veh }, deps)).reasons, ['NOTHING_SELECTED']);
  assert.deepEqual((await runShipyardAction({ action: 'buy-ammunition', installId: 'inst9', vehicle: veh }, { ...deps, askUnits: async () => null })).reasons, ['CANCELLED']);
  assert.equal(calls.length, 1, 'a cancelled or empty request buys nothing');
  await runShipyardAction({ action: 'gm-reload', installId: 'inst9', vehicle: veh }, deps);
  assert.deepEqual(calls[1], ['reload', 'inst9']); assert.match(said.at(-1), /Loaded 2 from reserve/);
  assert.match(describeReasons(['AMMO_PURCHASE_QUANTITY_INVALID', 'INSUFFICIENT_CREDITS', 'AMMO_GM_OPERATION_ONLY']), /whole number of units.*Not enough credits.*Only a GM can load/);
});

test('SERVICE: reloadLauncher is GM-only, finds the launcher by installation id and moves reserve to loaded', async () => {
  world();
  const { entry } = await buyLauncher('concussion-missile-launcher-light', 'fighter');
  const id = entry.installId;
  await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: id, units: 4 });
  globalThis.game.user.isGM = false;
  assert.deepEqual((await S.reloadLauncher({ vehicle, installId: id })).reasons, ['GM_REQUIRED']);
  globalThis.game.user.isGM = true;
  assert.deepEqual((await S.reloadLauncher({ vehicle, installId: 'nope' })).reasons, ['WEAPON_ITEM_MISSING']);
  const r = await S.reloadLauncher({ vehicle, installId: id, amount: 3 });
  assert.deepEqual([r.success, r.moved, ledgerOf(id).loaded, ledgerOf(id).reserve], [true, 3, 3, 1]);
  assert.equal((await S.reloadLauncher({ vehicle, installId: id })).success, true);
  assert.deepEqual([ledgerOf(id).loaded, ledgerOf(id).reserve], [4, 0]);
  assert.deepEqual((await S.reloadLauncher({ vehicle, installId: id })).reasons, [A.AMMO_REASONS.NOTHING_TO_RELOAD]);
});
