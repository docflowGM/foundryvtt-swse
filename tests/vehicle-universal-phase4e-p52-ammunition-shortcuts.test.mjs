/**
 * The vehicle sheet's Buy Ammunition shortcuts and the store's vehicle-ammunition context: one workflow behind both buttons; only this vehicle's launchers'
 * ammunition is offered; published prices and totals; personal credits and Party Fund payment; the weapon button preselects the launcher; no free ammunition
 * from opening the sheet or the store; concurrent checkout is refused; ammunition lands in the RESERVE.
 */
import test from 'node:test';
import { readFileSync } from 'node:fs';
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
const SC = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-ammunition-shortcuts.js');
const SV = await import('../scripts/apps/store/store-vehicle-ammunition.js');
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


globalThis.game.settings = { get: () => undefined };
globalThis.ui = { notifications: { warn: m => warns.push(String(m)), error() {}, info: m => infos.push(String(m)) } };
const warns = [], infos = [];
const { LedgerService } = await import('../scripts/engine/store/ledger-service.js');
const fakeStore = (actor, vehicleAmmunition) => { const s = { actor, renders: 0, render() { this.renders++; }, closed: 0, close() { this.closed++; } }; SV.initVehicleAmmunitionContext(s, { vehicleAmmunition }); return s; };

test('SHEET: only a finite-ammunition weapon gets Buy Ammo; the Combat tab gets one global button; an unresolved price is a disabled state, never an invented one', () => {
  const { v, w } = reset();
  const panel = SC.attachAmmunitionShortcuts({ mounts: [{ weaponId: w.id, name: 'Proton' }, { weaponId: 'laser', name: 'Laser cannon' }] }, v);
  assert.equal(panel.hasAmmoOffers, true);
  assert.deepEqual([panel.mounts[0].ammoOffer?.canBuy, panel.mounts[0].ammoOffer?.priceLabel, panel.mounts[1].ammoOffer], [true, 'Proton Torpedo · 800 credits each', null]);
  assert.match(panel.mounts[0].ammoOffer.stockLabel, /3 \/ 3 loaded · 3 reserve/);
  assert.equal(SC.attachAmmunitionShortcuts({ mounts: [{ weaponId: 'laser' }] }, { items: new Items(), flags: {} }).hasAmmoOffers, false);
  const html = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
  assert.match(html, /vehiclePanels\.weaponMountPanel\.hasAmmoOffers[\s\S]{0,200}data-weapon-action="buy-ammo-all"/, 'the global button heads the Combat tab');
  assert.match(readFileSync('templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs', 'utf8'), /data-weapon-action="buy-ammo" data-item-id="\{\{mount\.weaponId\}\}"/);
});

test('BOTH BUTTONS open the same store context: global lists everything, the weapon button preselects its launcher', async () => {
  const { v, owner, w } = reset(); setUser(false);
  const opened = [];
  const deps2 = { notify: { warn() {}, info() {} }, openAmmunitionStore: async (veh, o) => { opened.push([veh.id, o.launcherKey]); return { app: true }; } };
  await OPS.runWeaponAction({ action: 'buy-ammo-all', itemId: null, vehicle: v }, deps2);
  await OPS.runWeaponAction({ action: 'buy-ammo', itemId: w.id, vehicle: v }, deps2);
  assert.deepEqual(opened, [['veh1', null], ['veh1', `stock:${w.id}`]]);
  const bad = await OPS.runWeaponAction({ action: 'buy-ammo', itemId: 'laser', vehicle: v }, deps2);
  assert.equal(bad.reason, 'LAUNCHER_NOT_A_FINITE_AMMUNITION_WEAPON');
  // openVehicleAmmunitionStore -> the existing SWSEStore.open(actor, options)
  const calls = [];
  const Store = { open: async (actor, o) => { calls.push([actor.id, o]); return { app: true }; } };
  globalThis.game.user.character = owner;
  const app = await SC.openVehicleAmmunitionStore(v, { launcherKey: `stock:${w.id}`, store: Store, game: globalThis.game });
  assert.ok(app);
  assert.deepEqual([calls[0][0], calls[0][1].vehicleAmmunition, calls[0][1].entryOrigin, calls[0][1].closeAfterCheckout], ['owner1', { vehicleId: 'veh1', launcherKey: `stock:${w.id}` }, 'vehicle-sheet-ammunition', false]);
  // no payer resolved: nobody is debited by default
  v.system.ownedByActorId = null; globalThis.game.user.character = null; warns.length = 0; calls.length = 0;
  assert.equal(await SC.openVehicleAmmunitionStore(v, { store: Store, game: globalThis.game, notify: globalThis.ui.notifications }), null);
  assert.equal(calls.length, 0);
  setUser(true);
});

test('STORE CONTEXT: lists only this vehicle\'s launcher ammunition with published prices; the weapon context preselects 1 unit; the fund option exists only when enabled', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const global = fakeStore(owner, { vehicleId: 'veh1', launcherKey: null });
  let view = await SV.buildVehicleAmmunitionView(global);
  assert.deepEqual([view.hasRows, view.rows.length, view.rows[0].unitPrice, view.rows[0].priceLabel, view.rows[0].quantity, view.total], [true, 1, 800, '800 credits each', 0, 0]);
  const weapon = fakeStore(owner, { vehicleId: 'veh1', launcherKey: key });
  view = await SV.buildVehicleAmmunitionView(weapon);
  assert.deepEqual([view.rows[0].selected, view.rows[0].quantity, view.total, view.canConfirm], [true, 1, 800, true]);
  assert.deepEqual([view.showPaymentChoice, view.payments.map(p => p.id)], [true, ['credits', 'party-fund']]);
  assert.match(view.payments[1].note, /10,000/);
  fundState.enabled = false;
  view = await SV.buildVehicleAmmunitionView(weapon);
  assert.deepEqual([view.showPaymentChoice, view.payments.map(p => p.id), JSON.stringify(view).includes('10,000'), JSON.stringify(view).includes('Party Fund')], [false, ['credits'], false, false], 'no inactive controls or balances');
  const html = readFileSync('templates/apps/store/store-card-grid.hbs', 'utf8');
  assert.match(html, /currentView 'vehicle-ammunition'/);
  assert.match(html, /data-vehicle-ammo-qty/);
  assert.match(html, /showPaymentChoice/);
  setUser(true);
});

test('CHECKOUT with personal credits: published price x quantity, the reserve rises, nothing is loaded, credits fall once; cancelled / unselected checkout moves nothing', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const before = structuredClone(ledgerOf(w));
  const s = fakeStore(owner, { vehicleId: 'veh1', launcherKey: key });
  s.vehicleAmmo.quantities[key] = 4;
  // cancel: nothing happens
  await s.close();
  assert.deepEqual([owner.system.credits, ledgerOf(w)], [100000, before]);
  const r = await SV.confirmVehicleAmmunition(s);
  assert.equal(r.success, true, JSON.stringify(r));
  assert.deepEqual([owner.system.credits, ledgerOf(w).reserve, ledgerOf(w).loaded], [100000 - 3200, before.reserve + 4, before.loaded]);
  assert.ok(infos.some(m => /reserve/.test(m)));
  assert.deepEqual(s.vehicleAmmo.quantities, {}, 'the basket is cleared');
  assert.equal((await SV.confirmVehicleAmmunition(s)).reason, 'NOTHING_SELECTED', 'repeating a checkout buys nothing');
  assert.equal(owner.system.credits, 100000 - 3200);
  setUser(true);
});

test('CHECKOUT insufficient credits and a refused line change nothing; concurrent checkout is refused', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  owner.system.credits = 500;
  const s = fakeStore(owner, { vehicleId: 'veh1', launcherKey: key });
  s.vehicleAmmo.quantities[key] = 1;
  const before = structuredClone(ledgerOf(w));
  const poor = await SV.confirmVehicleAmmunition(s);
  assert.deepEqual([poor.success, poor.reason, owner.system.credits, ledgerOf(w)], [false, 'INSUFFICIENT_CREDITS', 500, before]);
  owner.system.credits = 100000;
  s.vehicleAmmo.quantities[key] = 2;
  const [a, b] = await Promise.all([SV.confirmVehicleAmmunition(s), SV.confirmVehicleAmmunition(s)]);
  assert.equal([a, b].filter(r => r.success).length, 1, 'the second concurrent checkout is refused');
  assert.equal(owner.system.credits, 100000 - 1600, 'charged once');
  setUser(true);
});

test('CHECKOUT with the Party Fund: a request is queued; nothing is charged or delivered; with the fund disabled the service refuses even a direct submission', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const before = structuredClone(ledgerOf(w));
  const s = fakeStore(owner, { vehicleId: 'veh1', launcherKey: key });
  s.vehicleAmmo.quantities[key] = 4; s.vehicleAmmo.payment = 'party-fund';
  const view = await SV.buildVehicleAmmunitionView(s);
  assert.deepEqual([view.confirmLabel, view.canConfirm, /No credits are deducted/.test(view.notice)], ['Submit Request to GM', true, true]);
  const r = await SV.confirmVehicleAmmunition(s);
  assert.equal(r.success, true, JSON.stringify(r));
  assert.ok(infos.some(m => /submitted to GM\. No credits have been deducted and no ammunition has been delivered/.test(m)));
  assert.deepEqual([P.pendingRequests().length, owner.system.credits, fundState.balance, ledgerOf(w)], [1, 100000, 10000, before]);
  // the GM approves later: the reserve rises, never the magazine
  setUser(true);
  const ap = await P.approve({ requestId: P.pendingRequests()[0].id });
  assert.equal(ap.success, true);
  assert.deepEqual([ledgerOf(w).reserve, ledgerOf(w).loaded, fundState.balance], [before.reserve + 4, before.loaded, 6800]);
  // disabled fund: a forced submission is refused at the service layer
  fundState.enabled = false; setUser(false);
  const forced = fakeStore(owner, { vehicleId: 'veh1', launcherKey: key });
  forced.vehicleAmmo.quantities[key] = 1; forced.vehicleAmmo.payment = 'party-fund';
  const fr = await SV.confirmVehicleAmmunition(forced);
  assert.equal(fr.success, false);
  assert.equal(P.pendingRequests().length, 0);
  setUser(true);
});

test('NO FREE AMMUNITION: opening the sheet, the store and the shop list again and again changes no ledger; a request across a reload is still pending', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const before = structuredClone(ledgerOf(w));
  for (let i = 0; i < 5; i++) { SC.attachAmmunitionShortcuts({ mounts: [{ weaponId: w.id }] }, v); await SV.buildVehicleAmmunitionView(fakeStore(owner, { vehicleId: 'veh1', launcherKey: key })); }
  assert.deepEqual(ledgerOf(w), before);
  await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 1 });
  // "reload": the queue is a persisted world setting; a fresh read finds the same pending request
  const persisted = JSON.parse(JSON.stringify(deps.queue.read()));
  assert.deepEqual([persisted.length, persisted[0].state, persisted[0].approvalKind], [1, 'pending', AMMO_REQUEST_KIND]);
  setUser(true);
});

test('GM APPROVALS SURFACE: the request is routed through the existing approve / deny operations and shown to the GM', async () => {
  const ops = readFileSync('scripts/ui/shell/gm/GMApprovalOperationsService.js', 'utf8');
  const surface = readFileSync('scripts/ui/shell/gm/GMApprovalsSurfaceService.js', 'utf8');
  assert.match(ops, /approvalKind === 'vehicle-ammunition-party-fund'\) return this\._approveVehicleAmmunition/);
  assert.match(ops, /approvals\[index\]\?\.approvalKind === 'vehicle-ammunition-party-fund'\) return this\._denyVehicleAmmunition/);
  assert.match(surface, /approval\?\.approvalKind === 'vehicle-ammunition-party-fund'\) return buildVehicleAmmunitionApprovalRequest/);
});
