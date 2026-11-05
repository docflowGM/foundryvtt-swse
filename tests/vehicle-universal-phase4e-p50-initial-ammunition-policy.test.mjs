/**
 * Owner house rule `initialVehicleAmmunitionIncluded` (default on): a NEW stock launcher starts with its published payload at no charge, or -- rule off --
 * empty so its initial ammunition is bought at the published per-round price. Existing ledgers are never refilled or changed (resync, replacement, a
 * deleted Item, changing the rule); the GM may deliberately grant up to the published payload; later purchases pay the published price and arrive in the
 * RESERVE; a GM-configured payload is the GM's own allocation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { digestUniversalVehicleSource } from '../scripts/domain/vehicles/vehicle-source-digest.js';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { buildStockWeaponItemData, executableModesOf, planStockWeaponItemSync, issuedKeyOf } from '../scripts/domain/vehicles/vehicle-stock-weapon-items.js';
import * as L from '../scripts/domain/vehicles/vehicle-ammunition-ledger.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');
const { VehicleAmmunitionService } = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
const { VehicleInstallationService } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { ammunitionOffers, offerFor } = await import('../scripts/engine/vehicles/vehicle-ammunition-shop.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const ARC = 'sotg-incom-subpro-arc-170-starfighter';
const GM = { isGM: true, id: 'gm1' };
class Items extends Map { [Symbol.iterator]() { return this.values(); } get contents() { return [...this.values()]; } filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); } }

function launcherDoc() {
  const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === ARC));
  const src = d.flags.swse.universalVehicleSource.source;
  const g = src.armament.firingGroups.find(x => x.label === 'proton torpedoes');
  g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', '"hardwareCount":1');
  d.flags.swse.universalVehicleSource.recordDigest = digestUniversalVehicleSource(src);
  return d;
}
const doc = launcherDoc(), record = doc.flags.swse.universalVehicleSource.source;
const groups = () => assessStockWeaponGroups(record).groups;
let seq = 0;
function vehicle({ credits = 100000 } = {}) {
  const v = Object.assign(structuredClone(doc), { id: 'veh1', isOwner: true, items: new Items(), getActiveTokens: () => [], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  v.system.ownedByActorId = 'owner1';
  const owner = { id: 'owner1', name: 'Owner', isOwner: true, system: { credits }, flags: {}, toObject() { return { system: structuredClone(this.system) }; }, getFlag: () => [] };
  Object.assign(globalThis.game, { user: Object.assign(globalThis.game.user ?? {}, { id: 'gm1', isGM: true }), actors: { get: id => ({ owner1: owner, veh1: v })[id], contents: [] }, users: new Map(), combat: null });
  return { v, owner };
}
const createItems = (v, data) => { for (const d of data) { const id = 'i' + (++seq); v.items.set(id, { id, ...structuredClone(d), actor: v, parent: v }); } };
const sync = (v, opts = {}) => planStockWeaponItemSync({ items: [...v.items.values()], record, ...opts });
const launcher = v => [...v.items.values()].find(i => i.name === 'proton torpedoes');
const setPath = (obj, key, value) => { const parts = key.split('.'); let o = obj; for (const q of parts.slice(0, -1)) o = (o[q.replace(/^==/, '')] ??= {}); o[parts.at(-1).replace(/^==/, '')] = structuredClone(value); };

// governed writes land on the in-memory objects; snapshots really restore (so a rollback is observable)
const snaps = [];
ActorEngine.updateOwnedItems = async (a, ups) => { for (const u of ups) { const it = a.items.get(u._id); for (const [k, val] of Object.entries(u)) if (k !== '_id') setPath(it, k, val); } };
ActorEngine.updateActor = async (a, data) => { for (const [k, val] of Object.entries(data)) setPath(a, k, val); };
let failAsset = false;
ActorEngine.applyMutationPlan = async (actor, plan) => {
  if (actor.id === 'veh1') { if (failAsset) throw new Error('asset write failed'); for (const u of plan.update?.items ?? []) { const it = actor.items.get(u._id); for (const [k, val] of Object.entries(u)) if (k !== '_id') setPath(it, k, val); } }
  if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
};
SnapshotManager.createSnapshot = async actor => { snaps.push({ actor, credits: actor.system?.credits, items: actor.items ? [...actor.items.values()].map(i => [i.id, structuredClone(i.flags)]) : null }); return { timestamp: snaps.length }; };
SnapshotManager.restoreSnapshot = async (actor, ref) => { const s = snaps[(typeof ref === 'number' ? ref : ref?.timestamp ?? snaps.length) - 1]; if (!s || s.actor.id !== actor.id) return false; if (actor.system) actor.system.credits = s.credits; for (const [id, flags] of s.items ?? []) if (actor.items.get(id)) actor.items.get(id).flags = flags; return true; };
globalThis.ui = { notifications: { warn() {}, error() {}, info() {} } };
globalThis.game.settings = globalThis.game.settings ?? { get: () => undefined };

test('RULE ON (default): a new stock launcher starts with its published payload at no charge', () => {
  const { v, owner } = vehicle();
  const plan = sync(v);                                         // included defaults to true
  createItems(v, plan.create);
  const l = launcher(v).flags.swse.vehicleAmmo;
  assert.deepEqual([l.payload, l.loaded, l.reserve, l.initial], [6, 3, 3, undefined]);
  assert.equal(L.validateLedger(l, groups().find(g => g.label === 'proton torpedoes').ammunition).ok, true);
  assert.equal(owner.system.credits, 100000, 'the initial ammunition costs the player nothing');
});

test('RULE OFF: a new stock launcher starts empty; its initial ammunition is bought at the published price; nothing is invented', async () => {
  const { v, owner } = vehicle();
  createItems(v, sync(v, { included: false }).create);
  const l = launcher(v).flags.swse.vehicleAmmo;
  assert.deepEqual([l.payload, l.loaded, l.reserve, l.initial], [0, 0, 0, 'purchased']);
  const fam = groups().find(g => g.label === 'proton torpedoes').ammunition;
  assert.equal(L.validateLedger(l, fam).ok, true);
  assert.equal((await VehicleAmmunitionService.canLaunch(v, launcher(v))).reason, L.AMMO_REASONS.EMPTY);
  // the shortcut offers it at the certified launcher's published price, and buying puts it in the RESERVE, not the magazine
  const offer = offerFor(v, `stock:${launcher(v).id}`);
  assert.deepEqual([offer.canBuy, offer.unitPrice, offer.loaded, offer.reserve], [true, 800, 0, 0]);
  const r = await VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor: owner, vehicle: v, launcherKey: offer.launcherKey, units: 4 });
  assert.equal(r.success, true, JSON.stringify(r));
  const after = launcher(v).flags.swse.vehicleAmmo;
  assert.deepEqual([after.payload, after.bought, after.reserve, after.loaded, owner.system.credits, r.cost], [4, 4, 4, 0, 100000 - 3200, 3200]);
  assert.equal(L.validateLedger(after, fam).ok, true);
});

test('NO REFILL: an existing launcher is never changed by resync, replacement, a deleted Item, or flipping the rule either way', () => {
  for (const [first, second] of [[true, false], [false, true]]) {
    const { v } = vehicle();
    createItems(v, sync(v, { included: first }).create);
    const before = structuredClone(launcher(v).flags.swse.vehicleAmmo);
    const again = sync(v, { included: second });
    assert.deepEqual([again.create.length, again.deleteIds.length], [0, 0], 'resync with the other rule setting changes nothing');
    // a stale managed Item is replaced: the valid ledger is carried over
    const it = launcher(v); it.name = 'tampered name';
    const repl = sync(v, { included: second });
    assert.equal(repl.create.length, 1);
    assert.deepEqual(repl.create[0].flags.swse.vehicleAmmo, before, 'replacement carries the existing ledger');
  }
});

test('ISSUED MARKER: a launcher whose initial ammunition was issued is never issued again, even if its Item was deleted', () => {
  const { v } = vehicle();
  const plan = sync(v);
  assert.ok(plan.issueKeys.length >= 1);
  createItems(v, plan.create);
  const issued = new Set(plan.issueKeys);
  v.items.clear();                                              // the Item is gone (deleted by hand): no ledger to carry
  const back = sync(v, { issued });
  const l = back.create.find(d => d.name === 'proton torpedoes').flags.swse.vehicleAmmo;
  assert.deepEqual([l.payload, l.loaded, l.initial], [0, 0, 'purchased'], 'it comes back EMPTY, not full');
  assert.equal(issuedKeyOf('a.b|single'), 'a%2Eb|single');
});

test('GM-CONFIGURED payload is the GM\'s own allocation and does not depend on the rule', () => {
  const g = groups().find(x => x.label === 'proton torpedoes');
  const gmGroup = { ...g, ammunition: { ...g.ammunition, gmConfigured: true, launchers: 2, initialLoaded: 4, allocation: 'gm-configured' } };
  for (const included of [true, false]) {
    const data = buildStockWeaponItemData(record, gmGroup, 'single', { included });
    assert.deepEqual([data.flags.swse.vehicleAmmo.loaded, data.flags.swse.vehicleAmmo.launchers, data.flags.swse.vehicleAmmo.allocation], [4, 2, 'gm-configured'], `rule ${included}`);
  }
});

test('GM GRANT: starting ammunition without a credit transaction, only up to the published payload, only on a launcher that started without it', async () => {
  const { v, owner } = vehicle();
  createItems(v, sync(v, { included: false }).create);
  const w = launcher(v);
  assert.equal((await VehicleAmmunitionService.gmGrantStartingAmmunition(v, w, { user: { isGM: false } })).reason, L.AMMO_REASONS.GM_ONLY);
  assert.equal((await VehicleAmmunitionService.gmGrantStartingAmmunition(v, w, { units: 7, user: GM })).reason, L.AMMO_REASONS.ALLOCATION_INVALID, 'never above the published payload');
  const r = await VehicleAmmunitionService.gmGrantStartingAmmunition(v, w, { units: 4, user: GM });
  assert.deepEqual([r.ok, r.ledger.payload, r.ledger.reserve, r.ledger.granted, r.ledger.loaded, owner.system.credits], [true, 4, 4, 4, 0, 100000]);
  assert.equal((await VehicleAmmunitionService.gmGrantStartingAmmunition(v, w, { user: GM })).ok, true, 'the rest of the published payload');
  assert.equal((await VehicleAmmunitionService.gmGrantStartingAmmunition(v, w, { user: GM })).reason, L.AMMO_REASONS.ALLOCATION_INVALID, 'no more free ammunition');
  // a launcher that started with its payload gets no grant
  const full = vehicle(); createItems(full.v, sync(full.v).create);
  assert.equal((await VehicleAmmunitionService.gmGrantStartingAmmunition(full.v, launcher(full.v), { user: GM })).reason, L.AMMO_REASONS.ALLOCATION_INVALID);
  // granted units can then be loaded by the existing GM reload; purchases still pay the published price
  assert.equal((await VehicleAmmunitionService.gmReload(v, w, { user: GM })).moved, 3);
});

test('RELOAD PRICING + ROLLBACK: later purchases pay the published price; insufficient credits and a failed write change nothing; no free ammunition from reading', async () => {
  const { v, owner } = vehicle({ credits: 1000 });
  createItems(v, sync(v).create);
  const key = `stock:${launcher(v).id}`;
  const snapshot = structuredClone(launcher(v).flags.swse.vehicleAmmo);
  for (let i = 0; i < 5; i++) { ammunitionOffers(v); await VehicleAmmunitionService.canLaunch(v, launcher(v)); }          // reading / opening the sheet creates nothing
  assert.deepEqual(launcher(v).flags.swse.vehicleAmmo, snapshot);
  const poor = await VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor: owner, vehicle: v, launcherKey: key, units: 2 });     // 1600 > 1000
  assert.deepEqual([poor.success, poor.reasons], [false, ['INSUFFICIENT_CREDITS']]);
  assert.deepEqual([launcher(v).flags.swse.vehicleAmmo, owner.system.credits], [snapshot, 1000]);
  failAsset = true;
  const broken = await VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor: owner, vehicle: v, launcherKey: key, units: 1 });
  failAsset = false;
  assert.equal(broken.success, false);
  assert.deepEqual([launcher(v).flags.swse.vehicleAmmo, owner.system.credits], [snapshot, 1000], 'credits and ledger rolled back together');
  const ok = await VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor: owner, vehicle: v, launcherKey: key, units: 1 });
  assert.deepEqual([ok.success, ok.cost, owner.system.credits, launcher(v).flags.swse.vehicleAmmo.reserve, launcher(v).flags.swse.vehicleAmmo.loaded], [true, 800, 200, snapshot.reserve + 1, snapshot.loaded]);
  // a stranger cannot buy for this vehicle; a missing ledger is never initialized by a purchase
  globalThis.game.user.isGM = false;
  assert.deepEqual((await VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor: { id: 'stranger' }, vehicle: v, launcherKey: key, units: 1 })).reasons, ['OWNER_VEHICLE_NOT_ASSOCIATED']);
  globalThis.game.user.isGM = true;
  delete launcher(v).flags.swse.vehicleAmmo;
  assert.deepEqual((await VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor: owner, vehicle: v, launcherKey: key, units: 1 })).reasons, ['AMMO_LEDGER_MISSING_OR_ALLOCATION_REQUIRED']);
  assert.equal(launcher(v).flags?.swse?.vehicleAmmo, undefined, 'the purchase did not create a ledger');
});

test('SHEET (GM): a launcher that started without its published ammunition shows a no-charge grant control; a launcher that started full does not', async () => {
  const { buildWeaponOpsView, runWeaponAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js');
  const { v } = vehicle(); createItems(v, sync(v, { included: false }).create);
  v.items.contents ??= [...v.items.values()];
  assert.deepEqual(buildWeaponOpsView(v, { isGM: true }).grantRows.map(r => [r.name, r.room]), [['proton torpedoes', 6]]);
  assert.equal(buildWeaponOpsView(v, { isGM: false }).hasGrantRows, false, 'GM only');
  const said = [];
  const r = await runWeaponAction({ action: 'ammo-grant', itemId: launcher(v).id, vehicle: v }, { service: {}, notify: { info: m => said.push(m), warn: m => said.push('W ' + m) } });
  assert.equal(r.ok, true, said.join('|'));
  assert.equal(buildWeaponOpsView(v, { isGM: true }).hasGrantRows, false, 'nothing left to grant');
  const full = vehicle(); createItems(full.v, sync(full.v).create);
  assert.equal(buildWeaponOpsView(full.v, { isGM: true }).hasGrantRows, false);
});
