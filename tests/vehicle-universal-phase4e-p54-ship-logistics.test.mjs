/**
 * Ship logistics (SotG pp. 10 and 14): published fuel pricing by size and the four consumption events (idempotent, never below zero); the fuel tank is an explicit GM
 * configuration (never derived from Consumables); the printed Consumables value is the MAXIMUM (source data) and the remaining supply is mutable state; purchases
 * (personal credits, or GM-approved Party Fund requests) never exceed a capacity and roll back atomically; docking and maintenance are GM-administered reference
 * only; the V2 sheet performs no logistics arithmetic and no direct resource mutation.
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
import * as G from '../scripts/domain/vehicles/vehicle-logistics.js';
import { readFileSync } from 'node:fs';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');
const { VehicleAmmunitionService } = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
const { VehicleInstallationService } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { ammunitionOffers, offerFor } = await import('../scripts/engine/vehicles/vehicle-ammunition-shop.js');
const LS = await import('../scripts/engine/vehicles/vehicle-logistics-service.js');
const { VehicleLogisticsService: V } = LS;
const { isLedgerUpdateAllowed } = await import('../scripts/domain/vehicles/vehicle-installation-ledger.js');
const SV = await import('../scripts/apps/store/store-vehicle-ammunition.js');
const SC = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-ammunition-shortcuts.js');
const OPS = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js');
const PS = await import('../scripts/engine/vehicles/vehicle-ammunition-purchase-service.js');
const { VehicleAmmunitionPurchaseService: P, REQUEST_STATES, REQUEST_REASONS, deps, AMMO_REQUEST_KIND } = PS;

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


// ---- the existing Party Fund + approval queue, replaced by in-memory equivalents with the same contract ---------------------------------------
const fundState = { enabled: true, balance: 10000, ledger: [], failNextSet: false, failRestore: false };
deps.fund = async () => ({ isEnabled: () => fundState.enabled, balance: () => fundState.balance, ledger: () => structuredClone(fundState.ledger),
  setBalance: async v => { if (fundState.failRestore && fundState.restoring) throw new Error('restore failed'); fundState.balance = Math.max(0, v); },
  appendLedger: async e => { fundState.ledger.push({ id: 'l' + fundState.ledger.length, ...e }); },
  setLedger: async l => { if (fundState.failRestore) throw new Error('restore failed'); fundState.ledger = structuredClone(l); } });
let queue = [];
deps.queue = { read: () => structuredClone(queue), write: async l => { queue = structuredClone(l); } };
const notes = [];
deps.notify = async (req, message, o = {}) => { notes.push({ id: req?.id, message, gm: !!o.gm }); };
function reset({ rule = true } = {}) { fundState.enabled = true; fundState.balance = 10000; fundState.ledger = []; fundState.failRestore = false; queue = []; notes.length = 0; failAsset = false; return setup(rule); }
function setup(included = true) {
  const { v, owner } = vehicle();
  createItems(v, sync(v, { included }).create);
  const w = launcher(v);
  return { v, owner, w, key: `stock:${w.id}` };
}
const setUser = (isGM, id = isGM ? 'gm1' : 'p1') => { Object.assign(globalThis.game.user, { isGM, id }); return globalThis.game.user; };
const ledgerOf = w => w.flags.swse.vehicleAmmo;


// the scaffold's mutation-plan stub also applies `set` flag paths to the vehicle (as ActorEngine.applyMutationPlan does)
const baseApply = ActorEngine.applyMutationPlan;
ActorEngine.applyMutationPlan = async (actor, plan) => { await baseApply(actor, plan); if (actor.id === 'veh1') for (const [k, val] of Object.entries(plan.set ?? {})) if (k.startsWith('flags.')) setPath(actor, k, val); };
const GM_USER = () => setUser(true);
function ship({ size = 'Gargantuan', credits = 100000 } = {}) {
  const r = reset(); r.v.system.size = size; r.owner.system.credits = credits; GM_USER(); return r;
}

test('PRICING (SotG p. 14): 50 cr per fuel-day for Colossal or smaller; x100 per larger size; unknown sizes are unresolved, never guessed', () => {
  for (const s of ['Large', 'Gargantuan', 'Colossal', 'colossal']) assert.equal(G.fuelPricePerDay(s), 50, s);
  assert.deepEqual([G.fuelPricePerDay('Colossal (frigate)'), G.fuelPricePerDay('Colossal (cruiser)'), G.fuelPricePerDay('Colossal (station)')], [5000, 500000, 50000000]);
  assert.deepEqual([G.fuelPricePerDay(''), G.fuelPricePerDay(null), G.fuelPricePerDay('mega')], [null, null, null]);
  assert.equal(G.maintenanceReferenceCost('Colossal (frigate)'), 20000, 'four fuel-days');
  assert.equal(G.maintenanceReferenceCost('Large'), 200);
  assert.equal(G.consumablesCost(5, 14), 700, '10 cr x 5 living occupants x 14 days');
  assert.deepEqual(Object.keys(G.FUEL_EVENTS), ['realspace-day', 'hyperspace-day', 'atmosphere-hour', 'combat-hour', 'lightspeed-jump']);
});

test('OCCUPANTS: assigned living crew and GM passengers count; droids never do; a GM override replaces the total; nothing established = refused', () => {
  const crew = [{ id: 'a', type: 'character' }, { id: 'b', type: 'npc' }, { id: 'd', type: 'droid' }, { id: 'a', type: 'character' }];
  assert.deepEqual(G.livingOccupants({ crewActors: crew, passengers: 3 }), { count: 5, basis: 'ASSIGNED_CREW_AND_GM_PASSENGERS' });
  assert.deepEqual(G.livingOccupants({ crewActors: crew, passengers: 3, override: 2 }), { count: 2, basis: 'GM_OVERRIDE' });
  assert.deepEqual(G.livingOccupants({ crewActors: [{ id: 'd', type: 'droid' }] }), { count: 0, basis: 'NOT_ESTABLISHED' });
});

test('FUEL: unresolved until the GM configures a tank (never derived from Consumables); then partial buys, capacity enforced, source labeled GM_CONFIGURED', async () => {
  const { v, owner } = ship({ size: 'Large' });
  let view = V.view(v);
  assert.deepEqual([view.fuel.state, view.fuel.capacity, view.fuel.capacityBasis, view.fuel.pricePerDay, view.fuel.canBuy, view.fuel.disabledReason], ['UNRESOLVED', null, null, 50, false, 'FUEL_CAPACITY_NOT_CONFIGURED']);
  assert.equal((await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 1 })).success, false);
  setUser(false);
  assert.equal((await V.gmConfigureFuel(v, { capacity: 10, reason: 'x', user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.GM_ONLY);
  GM_USER();
  assert.equal((await V.gmConfigureFuel(v, { capacity: 10, reason: ' ', user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.REASON_REQUIRED);
  assert.equal((await V.gmConfigureFuel(v, { capacity: 10, current: 6, reason: 'table ruling', user: globalThis.game.user })).success, true);
  view = V.view(v);
  assert.deepEqual([view.fuel.state, view.fuel.capacity, view.fuel.capacityBasis, view.fuel.current, view.fuel.label, view.fuel.percent], ['CONFIGURED', 10, 'GM_CONFIGURED', 6, '6 / 10 fuel-days', 60]);
  const start = owner.system.credits;
  const buy = await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 3 });
  assert.deepEqual([buy.success, buy.cost, buy.resulting, owner.system.credits, V.view(v).fuel.current], [true, 150, 9, start - 150, 9]);
  const over = await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 2 });
  assert.deepEqual([over.success, over.reason, owner.system.credits], [false, 'FUEL_PURCHASE_EXCEEDS_CAPACITY', start - 150]);
  assert.equal((await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 1 })).success, true);
  assert.equal((await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 1 })).reason, 'FUEL_PURCHASE_EXCEEDS_CAPACITY', 'a full tank buys nothing');
  // a capital ship pays the published multiple
  const big = ship({ size: 'Colossal (frigate)' }); await V.gmConfigureFuel(big.v, { capacity: 4, current: 0, reason: 'r', user: globalThis.game.user });
  assert.equal(V.quoteFuel(big.v, 2).cost, 10000);
});

const ID = Object.fromEntries(['e1', 'e2', 'e3', 'e4', 'e5'].map((k, i) => [k, G.newFuelEventId(1700000000000 + i * 1000, 'r' + i)]));

test('FUEL CONSUMPTION: an authoritative event spends one fuel-day per unit, once per event id; never below zero; GM only; a sheet render spends nothing', async () => {
  const { v } = ship();
  await V.gmConfigureFuel(v, { capacity: 5, current: 3, reason: 'r', user: globalThis.game.user });
  for (let i = 0; i < 4; i++) V.view(v);                                                       // rendering consumes nothing
  assert.equal(V.view(v).fuel.current, 3);
  assert.equal((await V.consumeFuel(v, { event: 'lightspeed-jump', eventId: ID.e1, user: globalThis.game.user })).remaining, 2);
  assert.equal((await V.consumeFuel(v, { event: 'lightspeed-jump', eventId: ID.e1, user: globalThis.game.user })).reason, 'FUEL_EVENT_ALREADY_PROCESSED');
  assert.equal(V.view(v).fuel.current, 2, 'the duplicate spent nothing');
  assert.equal((await V.consumeFuel(v, { event: 'combat-hour', quantity: 3, eventId: ID.e2, user: globalThis.game.user })).reason, 'FUEL_INSUFFICIENT');
  assert.equal(V.view(v).fuel.current, 2, 'nothing half-spent');
  assert.equal((await V.consumeFuel(v, { event: 'warp', eventId: ID.e3, user: globalThis.game.user })).reason, 'FUEL_EVENT_UNKNOWN');
  assert.equal((await V.consumeFuel(v, { event: 'atmosphere-hour', quantity: 2, eventId: ID.e4, user: globalThis.game.user })).remaining, 0);
  setUser(false);
  assert.equal((await V.consumeFuel(v, { event: 'realspace-day', eventId: ID.e5, user: globalThis.game.user })).reason, 'LOGISTICS_GM_OPERATION');
  GM_USER();
});

test('CONSUMABLES: the printed value is the MAXIMUM (source data); initialization is once; remaining is separate state; partial resupply; full ships and over-buys are refused; cost = 10 x living occupants x days', async () => {
  const { v, owner } = ship();
  assert.equal(V.view(v).consumables.initialized, false);
  assert.equal(V.view(v).consumables.canBuy, false);
  assert.equal((await V.initialize(v, { user: globalThis.game.user })).success, true);
  let c = V.view(v).consumables;
  assert.deepEqual([c.printed, c.maxDays, c.remainingDays, c.initialized, c.percent], ['5 days', 5, 5, true, 100]);
  assert.equal((await V.initialize(v, { user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.ALREADY_INITIALIZED, 'never re-initialized');
  // full: nothing can be bought into the same capacity
  const full = await V.purchaseSupplies({ ownerActor: owner, vehicle: v, days: 1 });
  assert.equal(full.success, false);
  // no living occupant is established yet: refused, never an assumed crew complement
  await V.gmSetConsumables(v, { remainingDays: 1, reason: 'used', user: globalThis.game.user });
  assert.equal(V.view(v).consumables.disabledReason, 'LIVING_OCCUPANTS_NOT_ESTABLISHED');
  assert.equal((await V.purchaseSupplies({ ownerActor: owner, vehicle: v, days: 2 })).reason, 'LIVING_OCCUPANTS_NOT_ESTABLISHED');
  assert.equal((await V.gmSetOccupants(v, { passengers: 4, reason: 'passengers', user: globalThis.game.user })).success, true);
  c = V.view(v).consumables;
  assert.deepEqual([c.occupants, c.occupantsBasis, c.canBuy], [4, 'ASSIGNED_CREW_AND_GM_PASSENGERS', true]);
  const start = owner.system.credits;
  const part = await V.purchaseSupplies({ ownerActor: owner, vehicle: v, days: 2 });
  assert.deepEqual([part.success, part.cost, part.resulting, owner.system.credits, V.view(v).consumables.remainingDays], [true, 80, 3, start - 80, 3], '10 x 4 occupants x 2 days');
  const over = await V.purchaseSupplies({ ownerActor: owner, vehicle: v, days: 3 });
  assert.deepEqual([over.success, over.reason, owner.system.credits], [false, 'CONSUMABLES_PURCHASE_EXCEEDS_MAXIMUM', start - 80]);
  assert.equal((await V.purchaseSupplies({ ownerActor: owner, vehicle: v, days: 2 })).resulting, 5);
  assert.equal((await V.purchaseSupplies({ ownerActor: owner, vehicle: v, days: 1 })).reason, 'CONSUMABLES_AT_MAXIMUM');
  // the GM cannot set the remaining supply above the maximum
  assert.equal((await V.gmSetConsumables(v, { remainingDays: 6, reason: 'x', user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.QUANTITY_INVALID);
  // the printed value itself is untouched
  assert.equal(v.flags.swse.universalVehicleSource.source.capacity.consumables.raw, '5 days');
});

test('ATOMIC: a failed write or too few credits changes neither the credits nor the resource; a stranger cannot buy', async () => {
  const { v, owner } = ship({ credits: 100 });
  await V.gmConfigureFuel(v, { capacity: 10, current: 0, reason: 'r', user: globalThis.game.user });
  const before = structuredClone(v.flags.swse.shipLogistics);
  const poor = await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 5 });                 // 250 > 100
  assert.deepEqual([poor.success, poor.reasons, owner.system.credits, v.flags.swse.shipLogistics], [false, ['INSUFFICIENT_CREDITS'], 100, before]);
  setUser(false);
  assert.deepEqual((await V.purchaseFuel({ ownerActor: { id: 'stranger' }, vehicle: v, days: 1 })).reasons, ['OWNER_VEHICLE_NOT_ASSOCIATED']);
  GM_USER();
  // a write failure after the debit: the real transaction rolls the wallet back
  const real = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (actor, plan) => { if (actor.id === 'veh1') throw new Error('asset write failed'); if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits']; };
  const broken = await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 1 });
  ActorEngine.applyMutationPlan = real;
  assert.deepEqual([broken.success, owner.system.credits, v.flags.swse.shipLogistics], [false, 100, before]);
});

test('PARTY FUND: fuel and supplies use the same request / GM approval / settlement core; no payment or delivery while pending; duplicate approval and a stale basis change nothing', async () => {
  const { v, owner } = ship();
  await V.gmConfigureFuel(v, { capacity: 10, current: 2, reason: 'r', user: globalThis.game.user });
  setUser(false);
  const req = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 4 });
  assert.equal(req.success, true, JSON.stringify(req));
  assert.deepEqual([req.request.approvalKind, req.request.days, req.request.unitPrice, req.request.costCredits], [PS.LOGISTICS_REQUEST_KIND, 4, 50, 200]);
  assert.deepEqual([fundState.balance, owner.system.credits, V.view(v).fuel.current], [10000, 100000, 2], 'nothing paid or delivered while pending');
  assert.equal((await P.approve({ requestId: req.requestId, user: { isGM: false } })).reason, REQUEST_REASONS.GM_ONLY);
  GM_USER();
  const ok = await P.approve({ requestId: req.requestId });
  assert.deepEqual([ok.success, fundState.balance, V.view(v).fuel.current, owner.system.credits], [true, 9800, 6, 100000]);
  assert.equal((await P.approve({ requestId: req.requestId })).reason, REQUEST_REASONS.NOT_FOUND, 'cannot settle twice');
  assert.equal(V.view(v).fuel.current, 6);
  // a capacity that no longer fits fails with nothing moved
  setUser(false);
  const big = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 4 });
  assert.equal(big.success, true);
  GM_USER();
  await V.gmConfigureFuel(v, { capacity: 7, reason: 'smaller tank', user: globalThis.game.user });
  const stale = await P.approve({ requestId: big.requestId });
  assert.deepEqual([stale.success, stale.state, fundState.balance], [false, 'failed', 9800]);
  // supplies: the living-occupant basis is part of the price
  await V.initialize(v, { user: globalThis.game.user }); await V.gmSetConsumables(v, { remainingDays: 0, reason: 'r', user: globalThis.game.user }); await V.gmSetOccupants(v, { passengers: 2, reason: 'r', user: globalThis.game.user });
  setUser(false);
  const sup = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'supplies', days: 3 });
  assert.deepEqual([sup.success, sup.request.costCredits], [true, 60]);
  GM_USER();
  await V.gmSetOccupants(v, { passengers: 5, reason: 'more people', user: globalThis.game.user });
  const changed = await P.approve({ requestId: sup.requestId });
  assert.deepEqual([changed.success, changed.state, V.view(v).consumables.remainingDays], [false, 'failed', 0]);
  // disabled fund: refused at the service layer
  fundState.enabled = false; setUser(false);
  assert.equal((await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 1 })).reason, REQUEST_REASONS.PARTY_FUND_DISABLED);
  GM_USER();
});

test('PARTY FUND rollback: a failed resource delivery after the debit restores the fund; nothing is duplicated', async () => {
  const { v, owner } = ship();
  await V.gmConfigureFuel(v, { capacity: 10, current: 0, reason: 'r', user: globalThis.game.user });
  setUser(false);
  const req = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 3 });
  GM_USER();
  const real = ActorEngine.updateActor;
  ActorEngine.updateActor = async (a, data) => { if (Object.keys(data).some(k => k.includes('shipLogistics'))) throw new Error('write failed'); return real(a, data); };
  const r = await P.approve({ requestId: req.requestId });
  ActorEngine.updateActor = real;
  assert.deepEqual([r.success, r.state, fundState.balance, fundState.ledger.length, V.view(v).fuel.current], [false, 'failed', 10000, 0, 0]);
});

test('PERSISTENCE: reopening the sheet, resynchronizing weapons and re-running initialization never refill fuel or supplies', async () => {
  const { v } = ship();
  await V.initialize(v, { user: globalThis.game.user });
  await V.gmConfigureFuel(v, { capacity: 10, current: 4, reason: 'r', user: globalThis.game.user });
  await V.gmSetConsumables(v, { remainingDays: 2, reason: 'r', user: globalThis.game.user });
  const before = structuredClone(v.flags.swse.shipLogistics);
  for (let i = 0; i < 3; i++) { V.view(v); sync(v); await V.initialize(v, { user: globalThis.game.user }); await V.initializeOnCreate(v, 'gm1'); }
  assert.deepEqual(v.flags.swse.shipLogistics, before);
  // the resource is a guarded flag: only the service writes it
  assert.equal(isLedgerUpdateAllowed('veh1', { 'flags.swse.shipLogistics': { schema: 'x' } }), false);
  assert.equal(isLedgerUpdateAllowed('veh1', { 'flags.swse.==shipLogistics': { schema: 'x' } }), false);
});

test('DOCKING AND MAINTENANCE are GM-administered reference information: no charging operation exists, nothing is billed, simplified upkeep is not added', () => {
  const { v } = ship({ size: 'Colossal (frigate)' });
  const view = V.view(v);
  assert.deepEqual([view.docking.administration, view.maintenance.administration, view.maintenance.referenceCost, view.docking.dockingPerDay, view.docking.storagePerMonth, view.simplified.perMonth], ['GM_ADMINISTERED', 'GM_ADMINISTERED', 20000, 20, 200, 2000]);
  for (const k of Object.getOwnPropertyNames(V)) assert.doesNotMatch(k, /dock|maint|upkeep|charge/i, `no ${k} operation`);
  const sheet = readFileSync('templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs', 'utf8');
  assert.doesNotMatch(sheet, /data-weapon-action="(buy-docking|buy-maintenance|pay-upkeep)/);
  assert.match(sheet, /GM Administered/);
});

test('V2 SHEET: presentation only -- no logistics arithmetic, no direct resource mutation, no formulas, no second copy of the state', () => {
  const files = ['scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js', 'scripts/sheets/v2/vehicle-sheet/vehicle-logistics-dialogs.js', 'scripts/sheets/v2/vehicle-sheet/vehicle-ammunition-shortcuts.js', 'scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js'];
  for (const f of files) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.doesNotMatch(src, /fuelPricePerDay|consumablesCost|planFuelPurchase|planSuppliesPurchase|planFuelConsumption|livingOccupants|maintenanceReferenceCost|consumablesMaxDays/, `${f}: formulas belong to the domain`);
    assert.doesNotMatch(src, /shipLogistics|LOGISTICS_FLAG|updateActor|TransactionEngine|setFlag/, `${f}: no direct resource mutation`);
  }
  const sheetSrc = readFileSync('scripts/sheets/v2/vehicle-actor-sheet.js', 'utf8');
  assert.doesNotMatch(sheetSrc, /fuelPricePerDay|consumablesCost|shipLogistics/);
  const tpl = readFileSync('templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs', 'utf8');
  const logistics = tpl.slice(tpl.indexOf('swse-vehicle-logistics-panel'), tpl.indexOf('view.weaponOps.hasAmmoRows'));
  assert.doesNotMatch(logistics, /\{\{\s*\(?\s*(add|sub|subtract|multiply|mul|divide|math|sum|calc)\b/i, 'no arithmetic helpers in the template');
  assert.match(logistics, /view\.logistics\.fuel\.percent/, 'bars are projections of service-derived percents');
});

test('AMMUNITION AND WEAPON WORKFLOWS are unaffected: the ammunition purchase and the logistics purchase share the store context but not state', async () => {
  const { v, owner, w, key } = ship();
  const before = structuredClone(ledgerOf(w));
  await V.gmConfigureFuel(v, { capacity: 3, current: 0, reason: 'r', user: globalThis.game.user });
  await V.purchaseFuel({ ownerActor: owner, vehicle: v, days: 3 });
  assert.deepEqual(ledgerOf(w), before, 'fuel purchases never touch an ammunition ledger');
  const r = await P.buyWithCredits({ vehicle: v, ownerActor: owner, launcherKey: key, units: 1 });
  assert.equal(r.success, true);
  assert.equal(V.view(v).fuel.current, 3, 'ammunition purchases never touch fuel');
});

const fakeStore = (actor, vehicleAmmunition) => { const st = { actor, render() {}, close() {} }; SV.initVehicleAmmunitionContext(st, { vehicleAmmunition }); return st; };
globalThis.ui = { notifications: { warn() {}, error() {}, info() {} } };

test('STORE: Buy Fuel and Buy Supplies open the same store context in their own mode; totals come from the service; personal and Party Fund payment; never past capacity', async () => {
  const { v, owner } = ship({ size: 'Large' });
  await V.gmConfigureFuel(v, { capacity: 10, current: 6, reason: 'r', user: globalThis.game.user });
  setUser(false);
  const fuel = fakeStore(owner, { vehicleId: 'veh1', mode: 'fuel' });
  let view = await SV.buildVehicleAmmunitionView(fuel);
  assert.deepEqual([view.title, view.rows.length, view.rows[0].unitPrice, view.rows[0].quantity, view.total, view.rows[0].stockLabel, view.showPaymentChoice], ['Buy Fuel', 1, 50, 1, 50, '6 / 10 fuel-days', true]);
  fuel.vehicleAmmo.quantities['resource:fuel'] = 5;
  view = await SV.buildVehicleAmmunitionView(fuel);
  assert.deepEqual([view.rows[0].lineError, view.canConfirm], ['FUEL_PURCHASE_EXCEEDS_CAPACITY', false], 'past the tank: blocked in the context');
  fuel.vehicleAmmo.quantities['resource:fuel'] = 4;
  const start = owner.system.credits;
  const r = await SV.confirmVehicleAmmunition(fuel);
  assert.deepEqual([r.success, V.view(v).fuel.current, owner.system.credits], [true, 10, start - 200]);
  // the Party Fund path asks the GM instead
  GM_USER(); await V.gmConfigureFuel(v, { capacity: 20, reason: 'bigger', user: globalThis.game.user }); setUser(false);
  const f2 = fakeStore(owner, { vehicleId: 'veh1', mode: 'fuel' }); f2.vehicleAmmo.payment = 'party-fund'; f2.vehicleAmmo.quantities['resource:fuel'] = 2;
  const r2 = await SV.confirmVehicleAmmunition(f2);
  assert.deepEqual([r2.success, P.pendingRequests().length, V.view(v).fuel.current, fundState.balance], [true, 1, 10, 10000]);
  // supplies mode
  GM_USER(); await V.initialize(v, { user: globalThis.game.user }); await V.gmSetConsumables(v, { remainingDays: 1, reason: 'r', user: globalThis.game.user }); await V.gmSetOccupants(v, { passengers: 3, reason: 'r', user: globalThis.game.user }); setUser(false);
  const sup = fakeStore(owner, { vehicleId: 'veh1', mode: 'supplies' });
  view = await SV.buildVehicleAmmunitionView(sup);
  assert.deepEqual([view.title, view.rows[0].unitPrice, view.total, view.rows[0].stockLabel], ['Buy Supplies', 30, 30, '1 / 5 days · 3 living occupant(s)']);
  sup.vehicleAmmo.quantities['resource:supplies'] = 4;
  assert.equal((await SV.confirmVehicleAmmunition(sup)).success, true);
  assert.deepEqual([V.view(v).consumables.remainingDays, owner.system.credits], [5, start - 200 - 120]);
  setUser(true);
});

test('SHEET BUTTONS: Buy Fuel / Buy Supplies open the store context; GM controls go to the service; the Ship Logistics section is part of the vehicle sheet', async () => {
  const { v } = ship();
  const opened = [];
  const deps2 = { notify: { warn() {}, info() {} }, openAmmunitionStore: async (veh, o) => { opened.push([veh.id, o.mode]); return { app: true }; },
    logistics: { initialize: async () => ({ success: true }), gmConfigureFuel: async (veh, val) => ({ success: true, val }), gmSetOccupants: async () => ({ success: true }), gmSetConsumables: async () => ({ success: true }), consumeFuel: async (veh, val) => ({ success: true, val }), newFuelEventId: () => G.newFuelEventId(), fuelEvents: G.FUEL_EVENTS },
    askFuelConfig: async () => ({ capacity: 5, current: null, reason: 'r' }), askFuelEvent: async () => ({ event: 'lightspeed-jump', quantity: 1 }) };
  await OPS.runWeaponAction({ action: 'buy-fuel', vehicle: v }, deps2);
  await OPS.runWeaponAction({ action: 'buy-supplies', vehicle: v }, deps2);
  assert.deepEqual(opened, [['veh1', 'fuel'], ['veh1', 'supplies']]);
  assert.equal((await OPS.runWeaponAction({ action: 'logistics-config-fuel', vehicle: v }, deps2)).success, true);
  assert.equal((await OPS.runWeaponAction({ action: 'logistics-fuel-event', vehicle: v }, deps2)).success, true);
  const tpl = readFileSync('templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs', 'utf8');
  for (const a of ['buy-fuel', 'buy-supplies', 'logistics-config-fuel', 'logistics-fuel-event', 'logistics-occupants', 'logistics-consumables']) assert.match(tpl, new RegExp(`data-weapon-action="${a}"`));
  const view = V.view(v);
  assert.equal(view.fuel.source, 'Starships of the Galaxy, printed p. 14');
});

test('DELIVERY IS NOT A FREE DOOR: deliverPurchased needs a GM and the persisted settlement record; initialize cannot be self-granted by an owner', async () => {
  const { v, owner } = ship();
  await V.gmConfigureFuel(v, { capacity: 10, current: 0, reason: 'r', user: globalThis.game.user });
  const args = { vehicle: v, resource: 'fuel', days: 3, unitPrice: 50 };
  // a player calling it directly, with or without a request id
  setUser(false);
  assert.equal((await V.deliverPurchased({ ...args, requestId: 'x', user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.GM_ONLY);
  GM_USER();
  // a GM with no record, an unknown record, or a record that is not mid-settlement
  assert.equal((await V.deliverPurchased({ ...args, user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.SETTLEMENT_NOT_AUTHORIZED);
  assert.equal((await V.deliverPurchased({ ...args, requestId: 'nope', user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.SETTLEMENT_NOT_AUTHORIZED);
  setUser(false);
  const req = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 3 });
  GM_USER();
  assert.equal((await V.deliverPurchased({ ...args, requestId: req.requestId, user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.SETTLEMENT_NOT_AUTHORIZED, 'a merely pending request authorizes nothing');
  assert.equal(V.view(v).fuel.current, 0);
  // the genuine settlement delivers once; replaying the same call afterwards delivers nothing
  assert.equal((await P.approve({ requestId: req.requestId })).success, true);
  assert.equal(V.view(v).fuel.current, 3);
  assert.equal((await V.deliverPurchased({ ...args, requestId: req.requestId, user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.SETTLEMENT_NOT_AUTHORIZED, 'duplicate settlement');
  assert.equal(V.view(v).fuel.current, 3);
  // a record for different amounts does not authorize other amounts
  setUser(false);
  const small = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 1 });
  GM_USER();
  queue = queue.map(q => (q.id === small.requestId ? { ...q, state: 'settling' } : q));
  assert.equal((await V.deliverPurchased({ ...args, days: 5, requestId: small.requestId, user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.SETTLEMENT_NOT_AUTHORIZED);
  // initialization: an owner cannot grant themselves supplies on an existing vehicle
  setUser(false);
  assert.equal((await V.initialize(v, { user: globalThis.game.user })).reason, G.LOGISTICS_REASONS.GM_ONLY);
  assert.equal((await V.initialize(v, { user: globalThis.game.user, system: true })).reason, G.LOGISTICS_REASONS.GM_ONLY, 'there is no system bypass flag');
  assert.equal((await V.initializeOnCreate(v, 'p1')).reason, G.LOGISTICS_REASONS.CREATION_ONLY, 'the vehicle is not freshly created');
  assert.equal(V.view(v).consumables.initialized, false);
  // the creation route: the creating user, a just-created vehicle, once
  const fresh = ship().v; setUser(false, 'p1');
  fresh._stats = { createdTime: Date.now() };
  assert.equal((await V.initializeOnCreate(fresh, 'someone-else')).reason, G.LOGISTICS_REASONS.CREATION_ONLY);
  assert.equal((await V.initializeOnCreate(fresh, 'p1')).success, true);
  assert.equal(V.view(fresh).consumables.initialized, true);
  assert.equal((await V.initializeOnCreate(fresh, 'p1')).reason, G.LOGISTICS_REASONS.ALREADY_INITIALIZED);
  fresh._stats = { createdTime: Date.now() - 3600000 };
  GM_USER();
});

test('FUEL EVENT IDEMPOTENCY is permanent: after far more than the stored window, an old id is still refused and a fresh id is accepted', async () => {
  const { v } = ship();
  await V.gmConfigureFuel(v, { capacity: 1000, current: 1000, reason: 'r', user: globalThis.game.user });
  const base = 1700000000000, ids = Array.from({ length: 260 }, (_, i) => G.newFuelEventId(base + i * 1000, 'x' + i));
  for (const id of ids) assert.equal((await V.consumeFuel(v, { event: 'realspace-day', eventId: id, user: globalThis.game.user })).success, true);
  assert.equal(V.view(v).fuel.current, 1000 - 260);
  assert.ok(v.flags.swse.shipLogistics.events.length <= 200, 'storage stays bounded');
  for (const id of [ids[0], ids[10], ids[59]]) assert.equal((await V.consumeFuel(v, { event: 'realspace-day', eventId: id, user: globalThis.game.user })).reason, 'FUEL_EVENT_STALE_REISSUE', `${id}: dropped from the window, refused by the floor`);
  assert.equal((await V.consumeFuel(v, { event: 'realspace-day', eventId: ids[259], user: globalThis.game.user })).reason, 'FUEL_EVENT_ALREADY_PROCESSED', 'still in the window');
  assert.equal(V.view(v).fuel.current, 1000 - 260, 'no replay spent anything');
  assert.equal((await V.consumeFuel(v, { event: 'realspace-day', eventId: V.newFuelEventId(), user: globalThis.game.user })).success, true);
  assert.equal((await V.consumeFuel(v, { event: 'realspace-day', eventId: 'not-an-id', user: globalThis.game.user })).reason, 'FUEL_EVENT_UNKNOWN');
});

test('STORE / SHEET: supplies pricing and the basket total come from the services; UI code holds no pricing arithmetic', async () => {
  const { v } = ship();
  await V.initialize(v, { user: globalThis.game.user }); await V.gmSetOccupants(v, { passengers: 3, reason: 'r', user: globalThis.game.user });
  assert.equal(V.view(v).consumables.pricePerDay, 30);
  for (const f of ['scripts/apps/store/store-vehicle-ammunition.js', 'scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js', 'scripts/sheets/v2/vehicle-sheet/vehicle-ammunition-shortcuts.js']) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.doesNotMatch(src, /perPersonDay|\bunitPrice\s*\*|\*\s*(units|quantity|occupants)|\.reduce\s*\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\s*\+/, `${f}: no pricing arithmetic`);
  }
});

test('FUEL EVENT IDS (integrity): same-millisecond ids, out-of-order processing and a backward clock never reject a genuinely new event; a replay never spends', async () => {
  const { v } = ship();
  await V.gmConfigureFuel(v, { capacity: 1000, current: 1000, reason: 'r', user: globalThis.game.user });
  const gm = globalThis.game.user, use = id => V.consumeFuel(v, { event: 'combat-hour', eventId: id, user: gm });
  const realNow = Date.now;
  try {
    // two ids made in the same millisecond are distinct and both accepted
    Date.now = () => 1800000000000;
    const a = V.newFuelEventId(v), b = V.newFuelEventId(v);
    assert.notEqual(a, b);
    // processed out of the order they were issued
    assert.equal((await use(b)).success, true);
    assert.equal((await use(a)).success, true, 'an older-issued id is not falsely rejected');
    assert.equal(V.view(v).fuel.current, 998);
    // the clock moves backward: the next id is still newer than everything recorded
    Date.now = () => 1700000000000;
    const c = V.newFuelEventId(v);
    assert.ok(G.fuelEventTime(c) > Math.max(G.fuelEventTime(a), G.fuelEventTime(b)));
    assert.equal((await use(c)).success, true);
    // replays: in the window, then far past it
    assert.equal((await use(c)).reason, 'FUEL_EVENT_ALREADY_PROCESSED');
    for (let i = 0; i < 230; i++) assert.equal((await use(V.newFuelEventId(v))).success, true);
    const before = V.view(v).fuel.current;
    for (const old of [a, b, c]) assert.equal((await use(old)).reason, 'FUEL_EVENT_STALE_REISSUE', 'a replay is refused and spends nothing');
    assert.equal(V.view(v).fuel.current, before);
    // a genuinely new event (a freshly issued id) is accepted; an id issued long ago and never used is refused as stale with a clear remedy
    assert.equal((await use(V.newFuelEventId(v))).success, true);
    assert.equal(V.view(v).fuel.current, before - 1);
  } finally { Date.now = realNow; }
});

test('PARTY FUND DELIVERY is once per settlement, even while the request stays `settling`', async () => {
  const { v, owner } = ship();
  await V.gmConfigureFuel(v, { capacity: 20, current: 0, reason: 'r', user: globalThis.game.user });
  setUser(false);
  const req = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 4 });
  GM_USER();
  queue = queue.map(q => (q.id === req.requestId ? { ...q, state: 'settling' } : q));            // the settlement core has claimed it and is mid-flight
  const call = () => V.deliverPurchased({ vehicle: v, resource: 'fuel', days: 4, unitPrice: 50, requestId: req.requestId, user: globalThis.game.user });
  const results = await Promise.all([call(), call(), call()]);
  assert.equal(results.filter(r => r.success).length, 1, 'concurrent calls deliver once');
  assert.equal(V.view(v).fuel.current, 4);
  const again = await call();
  assert.deepEqual([again.success, again.reason, V.view(v).fuel.current], [false, G.LOGISTICS_REASONS.SETTLEMENT_ALREADY_DELIVERED, 4], 'a repeat while still settling adds nothing');
  assert.equal(v.flags.swse.shipLogistics.deliveries.length, 1);
  assert.equal(v.flags.swse.shipLogistics.deliveries[0].id, req.requestId, 'recorded in the same write as the delivery');
  // a different settlement is independent
  setUser(false);
  const req2 = await P.requestResourcePartyFund({ vehicle: v, requesterActor: owner, resource: 'fuel', days: 2 });
  GM_USER();
  assert.equal((await P.approve({ requestId: req2.requestId })).success, true);
  assert.equal(V.view(v).fuel.current, 6);
});
