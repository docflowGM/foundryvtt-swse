/**
 * Aftermarket launchers through the same shortcuts: the offer list reads the sealed installation's ledger; personal credits and Party Fund purchases land in the
 * installation's RESERVE exactly like the Shipyard's own Buy-ammunition control (which stays authoritative and unchanged); mixed stock + aftermarket vehicles
 * list both; the guarded ledger flag is only written by the ammunition service.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, VehicleAmmunitionService, readAftermarketLedgers, world, install, state } from './helpers/vehicle-weapon-world.mjs';

const { ammunitionOffers, offerFor } = await import('../scripts/engine/vehicles/vehicle-ammunition-shop.js');
const PS = await import('../scripts/engine/vehicles/vehicle-ammunition-purchase-service.js');
const { VehicleAmmunitionPurchaseService: P, deps } = PS;

const fund = { enabled: true, balance: 50000, ledger: [] };
deps.fund = async () => ({ isEnabled: () => fund.enabled, balance: () => fund.balance, ledger: () => structuredClone(fund.ledger), setBalance: async v => { fund.balance = v; }, appendLedger: async e => { fund.ledger.push(e); }, setLedger: async l => { fund.ledger = structuredClone(l); } });
let queue = [];
deps.queue = { read: () => structuredClone(queue), write: async l => { queue = structuredClone(l); } };
deps.notify = async () => {};

async function ship() {
  world({ hull: 'frigate' });
  const w = await install('proton-torpedo-launcher', null, 'turret-1');
  const { vehicle, owner } = state();
  return { vehicle, owner, w, installId: w.flags.swse.vehicleInstalledWeapon.installId };
}
const ledgerOf = (vehicle, installId) => readAftermarketLedgers(vehicle)[installId];

test('OFFERS: an installed launcher with nothing bought is a valid empty offer at the certified price; unlimited weapons are not offered', async () => {
  const { vehicle, installId } = await ship();
  await install('laser-cannon-light', null, 'turret-2');
  const offers = ammunitionOffers(vehicle);
  assert.equal(offers.length, 1, 'the laser cannon has unlimited ammunition: no offer');
  assert.deepEqual([offers[0].origin, offers[0].installId, offers[0].launcherKey, offers[0].unitPrice, offers[0].canBuy, offers[0].loaded, offers[0].reserve, offers[0].capacity], ['aftermarket', installId, `installed:${installId}`, 800, true, 0, 0, 3]);
});

test('PERSONAL: the shortcut path and the Shipyard control buy identically (price, reserve, credits); nothing is loaded', async () => {
  const { vehicle, owner, installId } = await ship();
  const key = `installed:${installId}`;
  const start = owner.system.credits;
  const a = await P.buyWithCredits({ vehicle, ownerActor: owner, launcherKey: key, units: 2 });
  assert.deepEqual([a.success, a.cost, owner.system.credits], [true, 1600, start - 1600]);
  const b = await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId, units: 2 });
  assert.deepEqual([b.success, b.cost], [true, 1600]);
  const l = ledgerOf(vehicle, installId);
  assert.deepEqual([l.reserve, l.payload, l.loaded], [4, 4, 0]);
  assert.equal((await P.buyWithCredits({ vehicle, ownerActor: owner, launcherKey: 'installed:nope', units: 1 })).success, false);
  assert.equal((await P.buyWithCredits({ vehicle, ownerActor: owner, launcherKey: key, units: 0 })).success, false);
});

test('PARTY FUND on an aftermarket launcher: request, GM approval, reserve rise through the ammunition service; the guarded flag is not written by anything else', async () => {
  const { vehicle, owner, installId } = await ship();
  const key = `installed:${installId}`;
  const start = owner.system.credits;
  const req = await P.requestPartyFund({ vehicle, requesterActor: owner, launcherKey: key, units: 3 });
  assert.equal(req.success, true, JSON.stringify(req));
  assert.equal(ledgerOf(vehicle, installId), undefined, 'nothing delivered by a request');
  const ap = await P.approve({ requestId: req.requestId, user: { isGM: true, id: 'gm1' } });
  assert.deepEqual([ap.success, ap.cost, fund.balance, owner.system.credits], [true, 2400, 50000 - 2400, start]);
  const l = ledgerOf(vehicle, installId);
  assert.deepEqual([l.reserve, l.loaded, l.payload], [3, 0, 3]);
  assert.equal((await VehicleAmmunitionService.gmReload(vehicle, offerFor(vehicle, key) && state().vehicle.items.get(offerFor(vehicle, key).itemId), { user: { isGM: true, id: 'gm1' } })).moved, 3, 'loading stays the existing GM reload');
});

test('MIXED: the shop lists every finite-ammunition weapon of the vehicle and nothing else', async () => {
  const { vehicle } = await ship();
  await install('concussion-missile-launcher-light', null, 'turret-2');
  const offers = ammunitionOffers(vehicle);
  assert.deepEqual(offers.map(o => o.ammunitionId).sort(), ['concussion-missile-light', 'proton-torpedo']);
  assert.deepEqual(offers.map(o => o.unitPrice).sort((a, b) => a - b), [500, 800]);
});
