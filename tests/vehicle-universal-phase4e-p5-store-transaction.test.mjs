import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import * as E from '../scripts/domain/vehicles/vehicle-store-eligibility.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = key => actors.find(a => a.system.vehicleSourceEntryKey === key).flags.swse.universalVehicleSource.source;
const XW = 'core-incom-t-65b-x-wing-starfighter';

// ---------- D. authoritative merchant offer ----------
test('charge must equal the merchant (policy-applied) offer; cart value alone is not authority', () => {
  const r = rec(XW);
  const ok = E.evaluateVehicleMerchantPurchase(r, { merchantPrice: 175000, cartPrice: 175000 });
  assert.equal(ok.ok, true);
  assert.equal(ok.offerPrice, 175000);
  assert.equal(ok.publishedPrice, 150000, 'published price kept alongside the offer for audit');
  assert.deepEqual(E.evaluateVehicleMerchantPurchase(r, { merchantPrice: 175000, cartPrice: 1 }).reasons, ['CART_PRICE_MISMATCH']);
  assert.deepEqual(E.evaluateVehicleMerchantPurchase(r, { merchantPrice: 175000, cartPrice: 9e9 }).reasons, ['CART_PRICE_MISMATCH']);
  for (const bad of [null, 0, -1, NaN, undefined]) {
    assert.deepEqual(E.evaluateVehicleMerchantPurchase(r, { merchantPrice: bad, cartPrice: 150000 }).reasons, ['MERCHANT_OFFER_UNAVAILABLE']);
  }
});

test('new and used published prices; non-priced and unpublished-used stay blocked even with a merchant price', () => {
  const r = rec(XW);
  assert.equal(E.evaluateVehicleMerchantPurchase(r, { condition: 'used', merchantPrice: 65000, cartPrice: 65000 }).ok, true);
  const nfs = actors.map(a => a.flags.swse.universalVehicleSource.source).find(x => x.economics?.priceNew?.status === 'not-for-sale');
  assert.deepEqual(E.evaluateVehicleMerchantPurchase(nfs, { merchantPrice: 50000, cartPrice: 50000 }).reasons, ['NOT_FOR_SALE_PUBLISHED']);
  const amb = actors.map(a => a.flags.swse.universalVehicleSource.source).find(x => x.economics?.priceNew?.status === 'ambiguous');
  assert.deepEqual(E.evaluateVehicleMerchantPurchase(amb, { merchantPrice: 50000, cartPrice: 50000 }).reasons, ['PRICE_AMBIGUOUS_IN_SOURCE']);
  const noUsed = actors.map(a => a.flags.swse.universalVehicleSource.source).find(x => x.economics?.priceNew?.status === 'priced' && x.economics?.priceUsed?.status !== 'priced');
  assert.deepEqual(E.evaluateVehicleMerchantPurchase(noUsed, { condition: 'used', merchantPrice: 10, cartPrice: 10 }).reasons, ['USED_PRICE_NOT_PUBLISHED']);
  const gm = E.evaluateVehicleMerchantPurchase(nfs, { merchantPrice: 70000, cartPrice: 70000,
    gmOffer: { authorizedByGM: true, price: 70000, userId: 'gm1', reason: 'Table ruling' } });
  assert.equal(gm.ok, true);
  assert.equal(gm.authority, 'gm-override');
});

// ---------- checkout harness ----------
const src = readFileSync('scripts/apps/store/store-checkout.js', 'utf8');
const slice = (from, to) => src.slice(src.indexOf(from), src.indexOf(to));

function harness({ revalidate = 'real', plans = async () => [], credits = 5000, cartVehicles = [] } = {}) {
  const calls = { purchase: 0, plans: 0, history: 0, cleared: 0 };
  const fn = (start) => { const i = src.indexOf(start); return src.slice(i, src.indexOf('\n}\n', i) + 3); };
  const code = [
    fn('async function revalidateCart('),
    src.slice(src.indexOf('const purchasesInFlight'), src.indexOf('export async function checkout(')),
    fn('export async function checkout('),
    fn('async function checkoutUnguarded(')
  ].join('\n').replace(/\bexport\s+/g, '');
  const ui = { notifications: { warn() {}, error() {}, info() {} } };
  const ctx = {
    ui, game: { actors: { get: () => ({ id: 'a1' }) } }, console,
    SettingsHelper: { getSafe: () => true },
    storeI18n: k => k,
    LedgerService: { getCurrentCredits: () => credits },
    SWSELogger: { error(m, d) { if (process.env.DBG) console.log('LOGERR', m, d); }, warn() {} },
    isStoreItemPurchasable: () => ({ ok: true }),
    revalidateCartItems: () => ({ removed: [] }),
    validateCartQuantities: () => ({ ok: true }),
    collectStoreApprovalEntries: () => [],
    calculateCartTotal: cart => (cart.vehicles ?? []).reduce((n, v) => n + v.cost, 0),
    flattenCartForPurchase: () => [],
    clearCart: () => { calls.cleared++; },
    createItemPlans: () => [], createDroidPlans: async () => [],
    createVehiclePlans: async (...a) => { calls.plans++; return plans(...a); },
    logPurchaseToHistory: async () => { calls.history++; },
    StoreEngine: { canPurchase: () => ({ canPurchase: true }), purchase: async () => { calls.purchase++; return { success: true, transactionId: 't' }; } },
    getVehicleConditionCost: () => 150000, isValidVehicleConditionCost: v => Number.isFinite(v) && v > 0, getRandomDialogue: () => ''
  };
  if (revalidate === 'throws') ctx.game = { actors: { get: () => { throw new Error('boom'); } } };
  runInNewContext(code + '\nglobalThis.api = { checkout, revalidateCart };', ctx);
  const store = { actor: { id: 'a1' }, cart: { items: [], droids: [], vehicles: cartVehicles }, itemsById: new Map([['v1', { id: 'v1' }]]),
    animateCreditReconciliation: async () => {}, _persistCart: async () => {}, _handleCheckoutCompletion: async () => {} };
  return { api: ctx.api, store, calls };
}
const vehicleLine = { id: 'v1', name: 'X-wing', cost: 150000, condition: 'new' };

test('revalidateCart fails closed on an unexpected exception and keeps a diagnostic', async () => {
  const { api, store } = harness({ revalidate: 'throws' });
  const r = await api.revalidateCart(store, { id: 'a1' }, 10);
  assert.equal(r.valid, false);
  assert.match(r.error, /no credits were charged/);
  assert.equal(r.diagnostic, 'boom');
});

test('checkout: an unverifiable cart debits nothing and grants nothing', async () => {
  const { api, store, calls } = harness({ revalidate: 'throws', cartVehicles: [vehicleLine] });
  const r = await api.checkout(store, async () => {});
  assert.equal(r.success, false);
  assert.equal(calls.purchase, 0);
  assert.equal(calls.cleared, 0);
});

test('checkout: source/offer preflight failure happens before the debit', async () => {
  const { api, store, calls } = harness({ cartVehicles: [vehicleLine], credits: 1e6,
    plans: async () => { throw new Error('UNIVERSAL_VEHICLE_STORE_NOT_ELIGIBLE: x: CART_PRICE_MISMATCH'); } });
  const r = await api.checkout(store, async () => {});
  assert.equal(r.success, false);
  assert.equal(calls.plans, 1);
  assert.equal(calls.purchase, 0, 'no StoreEngine.purchase after a failed preflight');
  assert.equal(calls.cleared, 0, 'cart is kept');
});

test('checkout: insufficient credits stops before the transaction', async () => {
  const { api, store, calls } = harness({ cartVehicles: [vehicleLine], credits: 10 });
  const r = await api.checkout(store, async () => {});
  assert.equal(r.success, false);
  assert.equal(calls.purchase, 0);
});

test('checkout: verified cart purchases exactly once; a concurrent second checkout is refused', async () => {
  const h = harness({ cartVehicles: [vehicleLine], credits: 1e6 });
  let release; const gate = new Promise(r => { release = r; });
  const origPurchase = h.calls;
  // hold the first purchase open so a second click arrives while it is in flight
  const first = h.api.checkout(h.store, async () => {});
  const second = await h.api.checkout(h.store, async () => {});
  assert.equal(second.success, false);
  assert.equal(second.error, 'purchase-in-progress');
  release(); await gate;
  const r = await first;
  assert.equal(r.success, true);
  assert.equal(origPurchase.purchase, 1, 'credits settled once');
  assert.equal(origPurchase.cleared, 1);
  // the lock is released afterwards
  const third = await h.api.checkout(h.store, async () => {});
  assert.notEqual(third.error, 'purchase-in-progress');
});

test('createVehiclePlans verifies the merchant offer and runs inside the purchase lock', () => {
  const plans = slice('async function createVehiclePlans(', 'function flattenCartForPurchase(');
  assert.match(plans, /evaluateVehicleMerchantPurchase\(/);
  assert.match(plans, /merchantPrice: getVehicleConditionCost\(merchantItem, condition\)/);
  assert.match(plans, /cartPrice: vehicle\.cost/);
  assert.match(src, /async function buyVehicleUnguarded/);
  assert.match(src, /withPurchaseLock\(store\?\.actor\?\.id, \(\) => buyVehicleUnguarded/);
});
