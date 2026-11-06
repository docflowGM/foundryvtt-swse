/**
 * Vehicle ammunition paid from the Holonet Party Fund (owner addendum): a REQUEST in the existing GM approval queue; nothing is deducted or delivered
 * until a GM approves and the settlement succeeds; the fund and the vehicle reserve change together or not at all; a request settles at most once;
 * rejected / stale / unauthorized / insufficient / disabled cases move no credits and deliver nothing; delivery goes to the RESERVE (no auto-reload).
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
SnapshotManager.getSnapshot = (_actor, ts) => ({ schemaVersion: 2, scope: 'full-actor', timestamp: ts });   // TI-2: recovery must be retrievable from the actor
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

test('OPTIONS: the Party Fund appears only when the existing world setting is on; the balance only for someone allowed to spend for the vehicle', async () => {
  const { v, owner } = reset(); setUser(false);
  let o = await P.options({ vehicle: v, requesterActor: owner });
  assert.deepEqual([o.partyFund.enabled, o.partyFund.available, o.partyFund.balance, o.personal.available, o.offers.length], [true, true, 10000, true, 1]);
  o = await P.options({ vehicle: v, requesterActor: { id: 'stranger' } });
  assert.deepEqual([o.partyFund.enabled, o.partyFund.available, o.partyFund.balance, o.personal.available], [true, false, null, false], 'no balance for a stranger');
  fundState.enabled = false;
  o = await P.options({ vehicle: v, requesterActor: owner });
  assert.deepEqual([o.partyFund.enabled, o.partyFund.available, o.partyFund.balance], [false, false, null], 'disabled: no option and no misleading balance');
  setUser(true);
});

test('REQUEST: enters the GM queue with identity, vehicle, launcher, ammunition, quantity, price and total; deducts and delivers NOTHING; rejected when the fund is disabled or the requester is not an owner', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const before = structuredClone(ledgerOf(w));
  const r = await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 4 });
  assert.equal(r.success, true, JSON.stringify(r));
  assert.match(r.message, /No credits have been deducted and no ammunition has been delivered/);
  const q = P.pendingRequests();
  assert.equal(q.length, 1);
  assert.deepEqual([q[0].approvalKind, q[0].state, q[0].paymentSource, q[0].ownerActorId, q[0].vehicleId, q[0].launcherKey, q[0].ammunitionId, q[0].units, q[0].unitPrice, q[0].costCredits],
    [AMMO_REQUEST_KIND, 'pending', 'party-fund', 'owner1', 'veh1', key, 'proton torpedo', 4, 800, 3200]);
  assert.deepEqual([fundState.balance, owner.system.credits, ledgerOf(w)], [10000, 100000, before], 'nothing moved');
  assert.equal(v.flags.swse.ammunitionPurchaseRequests[q[0].id].state, 'pending', 'persistent record on the vehicle');
  // service-layer rejections, whatever the client submitted
  assert.equal((await P.requestPartyFund({ vehicle: v, requesterActor: { id: 'stranger' }, launcherKey: key, units: 1 })).reason, REQUEST_REASONS.NOT_AUTHORIZED);
  assert.equal((await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 0 })).reason, REQUEST_REASONS.QUANTITY_INVALID);
  assert.equal((await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: 'stock:nope', units: 1 })).reason, REQUEST_REASONS.LAUNCHER_CHANGED);
  fundState.enabled = false;
  assert.equal((await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 1 })).reason, REQUEST_REASONS.PARTY_FUND_DISABLED);
  assert.equal(P.pendingRequests().length, 1);
  setUser(true);
});

test('APPROVAL: only a GM; the fund is debited with a ledger entry and the RESERVE rises together; nothing is loaded; it settles once', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const { requestId } = await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 4 });
  const before = structuredClone(ledgerOf(w));
  assert.equal((await P.approve({ requestId, user: { isGM: false, id: 'p1' } })).reason, REQUEST_REASONS.GM_ONLY, 'an owner cannot approve their own request');
  assert.deepEqual([fundState.balance, ledgerOf(w)], [10000, before]);
  setUser(true);
  const r = await P.approve({ requestId, user: globalThis.game.user });
  assert.deepEqual([r.success, r.state, r.cost, r.balance], [true, 'approved', 3200, 6800]);
  const after = ledgerOf(w);
  assert.deepEqual([after.reserve, after.loaded, after.payload, after.bought], [before.reserve + 4, before.loaded, before.payload + 4, 4], 'reserve rose; the magazine was not touched');
  assert.equal(L.validateLedger(after, groups().find(g => g.label === 'proton torpedoes').ammunition).ok, true);
  assert.deepEqual([fundState.ledger.length, fundState.ledger[0].type, fundState.ledger[0].amount, fundState.ledger[0].requestId], [1, 'vehicle-ammunition', -3200, requestId]);
  assert.equal(owner.system.credits, 100000, 'the player\'s own credits are untouched');
  assert.deepEqual([P.pendingRequests().length, v.flags.swse.ammunitionPurchaseRequests[requestId].state], [0, 'approved']);
  assert.ok(notes.some(n => /approved/i.test(n.message)), 'the requester was told');
  // duplicate approval: nothing moves again
  assert.equal((await P.approve({ requestId, user: globalThis.game.user })).reason, REQUEST_REASONS.NOT_FOUND);
  assert.deepEqual([fundState.balance, ledgerOf(w).reserve], [6800, after.reserve]);
});

test('CONCURRENT approvals settle once; a request in "settling" is never retried', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const { requestId } = await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 2 });
  setUser(true);
  const results = await Promise.all([P.approve({ requestId }), P.approve({ requestId }), P.approve({ requestId })]);
  assert.equal(results.filter(r => r.success).length, 1);
  assert.deepEqual([fundState.balance, fundState.ledger.length], [10000 - 1600, 1]);
  // a persisted "settling" record (another client, or a crash) blocks a second settlement
  setUser(false);
  const second = await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 1 });
  queue = queue.map(q => (q.id === second.requestId ? { ...q, state: 'settling' } : q));
  setUser(true);
  assert.equal((await P.approve({ requestId: second.requestId })).reason, REQUEST_REASONS.IN_PROGRESS);
  assert.equal(fundState.balance, 10000 - 1600);
});

test('REJECTION: nothing is deducted or delivered; the requester is told; the state is recorded', async () => {
  const { v, owner, w, key } = reset(); setUser(false);
  const { requestId } = await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 3 });
  const before = structuredClone(ledgerOf(w));
  assert.equal((await P.reject({ requestId, user: { isGM: false } })).reason, REQUEST_REASONS.GM_ONLY);
  setUser(true);
  const r = await P.reject({ requestId, reason: 'not now', user: globalThis.game.user });
  assert.deepEqual([r.success, r.state], [true, 'rejected']);
  assert.deepEqual([fundState.balance, fundState.ledger.length, ledgerOf(w), P.pendingRequests().length], [10000, 0, before, 0]);
  assert.equal(v.flags.swse.ammunitionPurchaseRequests[requestId].state, 'rejected');
  assert.ok(notes.some(n => /rejected/i.test(n.message) && /No credits were deducted/.test(n.message)));
  assert.equal((await P.reject({ requestId, user: globalThis.game.user })).reason, REQUEST_REASONS.NOT_FOUND, 'cannot be decided twice');
});

test('REVALIDATION: insufficient fund keeps it pending; a disabled fund keeps it pending; ownership change, stale price and a changed launcher FAIL it without moving anything', async () => {
  // insufficient balance
  let s = reset(); setUser(false);
  let req = await P.requestPartyFund({ vehicle: s.v, requesterActor: s.owner, launcherKey: s.key, units: 4 });
  fundState.balance = 3000; setUser(true);
  assert.equal((await P.approve({ requestId: req.requestId })).reason, REQUEST_REASONS.INSUFFICIENT_FUND);
  assert.deepEqual([fundState.balance, P.pendingRequests()[0].state, ledgerOf(s.w).reserve], [3000, 'pending', 3], 'still pending, nothing moved');
  fundState.balance = 10000;
  // the fund is switched off while the request waits
  fundState.enabled = false;
  assert.equal((await P.approve({ requestId: req.requestId })).reason, REQUEST_REASONS.PARTY_FUND_DISABLED);
  assert.equal(P.pendingRequests()[0].state, 'pending');
  fundState.enabled = true;
  // the requester stops being an owner
  s.v.system.ownedByActorId = 'someone-else';
  const lost = await P.approve({ requestId: req.requestId });
  assert.deepEqual([lost.success, lost.state, lost.reason], [false, 'failed', REQUEST_REASONS.OWNER_CHANGED]);
  assert.deepEqual([fundState.balance, ledgerOf(s.w).reserve, P.pendingRequests().length], [10000, 3, 0]);
  // a stale price
  s = reset(); setUser(false);
  req = await P.requestPartyFund({ vehicle: s.v, requesterActor: s.owner, launcherKey: s.key, units: 2 });
  queue = queue.map(q => ({ ...q, unitPrice: 700, costCredits: 1400 })); setUser(true);
  assert.equal((await P.approve({ requestId: req.requestId })).reason, REQUEST_REASONS.PRICE_CHANGED);
  assert.deepEqual([fundState.balance, fundState.ledger.length], [10000, 0]);
  // the launcher was deleted / reconfigured
  s = reset(); setUser(false);
  req = await P.requestPartyFund({ vehicle: s.v, requesterActor: s.owner, launcherKey: s.key, units: 2 });
  s.v.items.delete(s.w.id); setUser(true);
  assert.equal((await P.approve({ requestId: req.requestId })).reason, REQUEST_REASONS.LAUNCHER_CHANGED);
  assert.deepEqual([fundState.balance, fundState.ledger.length], [10000, 0]);
});

test('FAILED DELIVERY after the debit restores the fund (proven); an unprovable rollback is preserved as INDETERMINATE and never retried', async () => {
  let s = reset(); setUser(false);
  let req = await P.requestPartyFund({ vehicle: s.v, requesterActor: s.owner, launcherKey: s.key, units: 2 });
  setUser(true);
  const realWrite = ActorEngine.updateOwnedItems;
  ActorEngine.updateOwnedItems = async () => { throw new Error('delivery write failed'); };
  const failed = await P.approve({ requestId: req.requestId });
  assert.deepEqual([failed.success, failed.state, failed.reason], [false, 'failed', REQUEST_REASONS.DELIVERY_FAILED]);
  assert.deepEqual([fundState.balance, fundState.ledger.length, ledgerOf(s.w).reserve], [10000, 0, 3], 'the debit and its ledger entry were restored');
  assert.equal(s.v.flags.swse.ammunitionPurchaseRequests[req.requestId].state, 'failed');
  // restore cannot be proven
  s = reset(); setUser(false);
  req = await P.requestPartyFund({ vehicle: s.v, requesterActor: s.owner, launcherKey: s.key, units: 2 });
  setUser(true); fundState.failRestore = true;
  const bad = await P.approve({ requestId: req.requestId });
  ActorEngine.updateOwnedItems = realWrite;
  assert.deepEqual([bad.success, bad.state, bad.reason], [false, 'indeterminate', REQUEST_REASONS.ROLLBACK_UNPROVEN]);
  assert.equal(P.pendingRequests()[0].state, 'indeterminate', 'preserved for GM reconciliation');
  fundState.failRestore = false;
  const again = await P.approve({ requestId: req.requestId });
  assert.deepEqual([again.success, again.reason], [false, REQUEST_REASONS.NOT_PENDING], 'never retried blindly');
  assert.ok(notes.some(n => n.gm && /INDETERMINATE/.test(n.message)));
});

test('SAME WORKFLOW: the personal-credits path is the existing transaction; both payment sources share one quote and one offer list', async () => {
  const { v, owner, w, key } = reset(); setUser(true);
  const quote = P.quote({ vehicle: v, launcherKey: key, units: 3 });
  assert.deepEqual([quote.success, quote.unitPrice, quote.total], [true, 800, 2400]);
  const paid = await P.buyWithCredits({ vehicle: v, ownerActor: owner, launcherKey: key, units: 3 });
  assert.deepEqual([paid.success, paid.cost, owner.system.credits, ledgerOf(w).loaded], [true, 2400, 100000 - 2400, 3]);
  setUser(false);
  const req = await P.requestPartyFund({ vehicle: v, requesterActor: owner, launcherKey: key, units: 3 });
  assert.deepEqual([req.request.unitPrice * req.request.units, req.request.costCredits], [2400, 2400]);
  setUser(true);
});
