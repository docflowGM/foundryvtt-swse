import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import * as E from '../scripts/domain/vehicles/vehicle-store-eligibility.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;
const byKey = new Map(actors.map(a => [a.system.vehicleSourceEntryKey, a]));
const find = pred => rec(actors.find(a => pred(rec(a))));

test('catalog: all 429 browsable with unique identity; published price classes match certified baseline', () => {
  const listing = E.buildVehicleCatalogListing(actors);
  assert.equal(listing.total, 429);
  assert.deepEqual(listing.issues, []);
  assert.equal(new Set(listing.entries.map(e => e.sourceEntryKey)).size, 429);
  assert.deepEqual(listing.counts, { priced: 271, 'not-for-sale': 142, ambiguous: 9, absent: 7 });
  assert.equal(listing.entries.filter(e => e.purchasable.new).length, 271);
  const duplicated = E.buildVehicleCatalogListing([actors[0], actors[0]]);
  assert.equal(duplicated.total, 1);
  assert.match(duplicated.issues[0], /DUPLICATE_SOURCE_IDENTITY/);
});

test('only published prices are purchasable; no number is ever fabricated', () => {
  for (const a of actors) {
    const r = rec(a);
    const n = E.evaluateVehiclePurchase(r, { condition: 'new' });
    const u = E.evaluateVehiclePurchase(r, { condition: 'used' });
    const pn = r.economics?.priceNew, pu = r.economics?.priceUsed;
    assert.equal(n.ok, pn?.status === 'priced');
    if (n.ok) assert.equal(n.offerPrice, pn.amountCredits);
    else { assert.equal(n.offerPrice, null); assert.ok(n.reasons.length === 1); }
    assert.equal(u.ok, pu?.status === 'priced');
    if (u.ok) {
      assert.equal(u.offerPrice, pu.amountCredits); // published used price, not a fraction of new
    } else assert.equal(u.offerPrice, null);
  }
});

test('blocked reasons are specific', () => {
  const nfs = find(r => r.economics?.priceNew?.status === 'not-for-sale');
  const amb = find(r => r.economics?.priceNew?.status === 'ambiguous');
  const none = find(r => !r.economics?.priceNew);
  assert.deepEqual(E.evaluateVehiclePurchase(nfs).reasons, ['NOT_FOR_SALE_PUBLISHED']);
  assert.deepEqual(E.evaluateVehiclePurchase(amb).reasons, ['PRICE_AMBIGUOUS_IN_SOURCE']);
  assert.deepEqual(E.evaluateVehiclePurchase(none).reasons, ['PRICE_NOT_STATED_IN_SOURCE']);
  const noUsed = find(r => r.economics?.priceNew?.status === 'priced' && r.economics?.priceUsed?.status !== 'priced');
  const used = E.evaluateVehiclePurchase(noUsed, { condition: 'used' });
  assert.deepEqual(used.reasons, ['USED_PRICE_NOT_PUBLISHED']);
  assert.deepEqual(E.evaluateVehiclePurchase(noUsed, { condition: 'mint' }).reasons, ['CONDITION_INVALID']);
  assert.deepEqual(E.evaluateVehiclePurchase({}).reasons, ['VEHICLE_NOT_SOURCE_BACKED']);
});

test('offer price (store policy) must be positive; published price is recorded alongside', () => {
  const r = rec(byKey.get('core-incom-t-65b-x-wing-starfighter'));
  const ok = E.evaluateVehiclePurchase(r, { offerPrice: 175000 });
  assert.equal(ok.ok, true);
  assert.equal(ok.publishedPrice, 150000);
  assert.equal(ok.offerPrice, 175000);
  for (const bad of [0, -5, NaN, '9']) assert.deepEqual(E.evaluateVehiclePurchase(r, { offerPrice: bad }).reasons, ['OFFER_PRICE_INVALID']);
});

test('GM override sells an unpriced vehicle only with complete recorded authority', () => {
  const nfs = find(r => r.economics?.priceNew?.status === 'not-for-sale');
  const good = E.evaluateVehiclePurchase(nfs, { gmOffer: { authorizedByGM: true, price: 90000, userId: 'u1', reason: ' table ruling ' } });
  assert.equal(good.ok, true);
  assert.equal(good.authority, 'gm-override');
  assert.deepEqual(good.gmOverride, { userId: 'u1', reason: 'table ruling', publishedStatus: 'not-for-sale' });
  for (const gm of [{ price: 9, userId: 'u', reason: 'x' }, { authorizedByGM: true, price: 0, userId: 'u', reason: 'x' },
    { authorizedByGM: true, price: 9, reason: 'x' }, { authorizedByGM: true, price: 9, userId: 'u', reason: '  ' }])
    assert.deepEqual(E.evaluateVehiclePurchase(nfs, { gmOffer: gm }).reasons, ['GM_OFFER_AUTHORITY_INCOMPLETE']);
  // a GM offer does not replace an existing published price
  const priced = rec(byKey.get('core-incom-t-65b-x-wing-starfighter'));
  assert.equal(E.evaluateVehiclePurchase(priced, { gmOffer: { authorizedByGM: true, price: 1, userId: 'u', reason: 'x' } }).authority, 'published');
});

// ---- cost-registry integration (module imports a Foundry path) ----
function registry() {
  const code = readFileSync('scripts/engine/store/cost-registry.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { buildCanonicalVehicleCostRecord: E.buildCanonicalVehicleCostRecord };
  runInNewContext(code + '\nglobalThis.R = { buildStoreCostRecord, resolveStoreCost, isStorePurchasable };', ctx);
  return ctx.R;
}

test('store cost record for canonical vehicles comes from published economics, not mirrored system.cost', () => {
  const R = registry();
  const x = actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter');
  const rc = R.buildStoreCostRecord(x);
  assert.equal(rc.pricingMode, 'new-used');
  assert.equal(rc.baseCostNew, 150000);
  assert.equal(rc.baseCostUsed, 65000);
  const hasNoUsed = actors.find(a => rec(a).economics?.priceNew?.status === 'priced' && rec(a).economics?.priceUsed?.status !== 'priced');
  const r2 = R.resolveStoreCost(R.buildStoreCostRecord(hasNoUsed), {});
  assert.equal(r2.costUsed, null, 'missing used price stays null, never 0');
  assert.ok(r2.costNew > 0);
  assert.equal(R.isStorePurchasable(R.buildStoreCostRecord(hasNoUsed), { condition: 'used' }), false);
  const nfs = actors.find(a => rec(a).economics?.priceNew?.status === 'not-for-sale');
  const rn = R.buildStoreCostRecord(nfs);
  assert.equal(rn.costStatus, 'unavailable');
  assert.deepEqual(JSON.parse(JSON.stringify(R.resolveStoreCost(rn, {}))), { cost: null, costNew: null, costUsed: null, usedCondition: null });
  // a tampered mirror cannot create a price
  const forged = structuredClone(nfs); forged.system.cost = 99999; forged.system.costNumeric = 99999;
  assert.equal(R.buildStoreCostRecord(forged).costStatus, 'unavailable');
  // non-canonical vehicles keep legacy pricing
  assert.equal(R.buildStoreCostRecord({ type: 'vehicle', system: { cost: 1000 }, flags: {} }).costStatus, 'priced');
});

test('every one of the 429 yields a store cost record consistent with its published state', () => {
  const R = registry();
  for (const a of actors) {
    const rc = R.buildStoreCostRecord(a), st = rec(a).economics?.priceNew?.status;
    if (st === 'priced') assert.equal(rc.baseCostNew, rec(a).economics.priceNew.amountCredits);
    else { assert.equal(rc.baseCostNew, null); assert.notEqual(rc.costStatus, 'conditional'); }
  }
});

// ---- static wiring guards ----
const checkout = readFileSync('scripts/apps/store/store-checkout.js', 'utf8');
const loader = readFileSync('scripts/engine/store/loader.js', 'utf8');
const constants = readFileSync('scripts/engine/store/store-constants.js', 'utf8');

test('checkout: source eligibility is evaluated before any debit, exact price on drift, no retired pack', () => {
  assert.match(checkout, /evaluateVehiclePurchase\(/);
  assert.doesNotMatch(checkout, /vehicle\.cost \* 0\.05/);
  assert.match(checkout, /currentPrice !== vehicle\.cost/);
  assert.doesNotMatch(checkout, /foundryvtt-swse\.vehicles['"`]/);
  for (const fn of ['buyVehicle', 'checkout']) {
    const body = checkout.slice(checkout.indexOf(`export async function ${fn}(`));
    assert.ok(body.indexOf('createVehiclePlans(') < body.indexOf('StoreEngine.purchase('), fn);
  }
});

test('loader: world vehicles are not inventory; catalog completeness enforced; legacy cache purged', () => {
  assert.match(loader, /a\.type === 'droid'\);/);
  assert.doesNotMatch(loader, /a\.type === 'vehicle'/);
  assert.match(loader, /loadVehicleIndex\(\)/);
  assert.match(loader, /filter\(doc => doc\?\.type !== 'vehicle'\)/);
  assert.match(loader, /version: 7/);
  assert.match(constants, /swse-store-cache-v6/);
  assert.match(constants, /LEGACY_CACHE_KEYS: \['swse-store-cache-v5'\]/);
});
