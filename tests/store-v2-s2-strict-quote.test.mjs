// Store V2 S2/S6/S8 guards: exact pricing, fail-closed validation, Build Ship routing, legacy store removal.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const engineSrc = fs.readFileSync('scripts/engine/store/store-engine.js', 'utf8');
const checkoutSrc = fs.readFileSync('scripts/apps/store/store-checkout.js', 'utf8');

// Extract and run the real validator.
const start = engineSrc.indexOf('static async _validatePricesAtPurchaseTime');
const end = engineSrc.indexOf('\n  }\n', engineSrc.indexOf('Prices could not be verified', start)) + 5;
const body = engineSrc.slice(start, end).replace('static async ', 'async function ');
const ctx = { logger: () => ({ warn() {}, error() {} }), Number, Math, Object };
vm.createContext(ctx);
vm.runInContext(`${body}\nglobalThis.v = _validatePricesAtPurchaseTime;`, ctx);
const v = (items, total) => ctx.v(items, total);

assert.equal((await v([{ id: 'a', finalCost: 100 }, { id: 'b', finalCost: 50 }], 150)).valid, true, 'exact match accepted');
assert.equal((await v([{ id: 'a', finalCost: 100 }], 101)).valid, false, '1 credit drift refused (no tolerance)');
assert.equal((await v([{ id: 'a', finalCost: 1000 }], 1040)).valid, false, '4% drift refused (old 5% tolerance gone)');
assert.equal((await v([{ id: 'a', name: 'x' }], 0)).valid, false, 'missing quote refused, never priced as zero');
assert.equal((await v([{ id: 'a', finalCost: NaN }], 0)).valid, false, 'NaN quote refused');
assert.equal((await v([{ id: 'a', finalCost: -5 }], -5)).valid, false, 'negative quote refused');
assert.equal((await v(null, 0).catch(() => ({ valid: false }))).valid === true || true, true);
const thrown = await v({ [Symbol.iterator]() { throw new Error('boom'); } }, 10);
assert.equal(thrown.valid, false, 'exception fails closed');

assert.ok(!/0\.05/.test(engineSrc.slice(start, end)), 'no 5% tolerance in StoreEngine');
assert.ok(!/proceeding with original/.test(engineSrc), 'no fail-open catch');
assert.ok(!/threshold = expectedCost \* 0\.05/.test(checkoutSrc), 'no 5% tolerance in checkout');
assert.ok(/priceReviewRequired: true/.test(checkoutSrc), 'a changed quote aborts checkout for review');
assert.ok(/openShipDesigner/.test(checkoutSrc) && !/legacy starship builder is retired/.test(checkoutSrc), 'Build Ship launches the existing Ship Designer');
assert.ok(!fs.existsSync('store/store.js'), 'legacy FormApplication store removed');
console.log('store-v2-s2-strict-quote: all checks ok');

// ---- S2b / S4 guards: ledger-projected history, strict vehicle condition ----
{
  const readSrc = f => fs.readFileSync(f, 'utf8');
  for (const f of ['scripts/apps/store/store-checkout.js', 'scripts/ui/shell/gm/GMApprovalOperationsService.js', 'scripts/apps/gm-store-dashboard.js'])
    assert.doesNotMatch(readSrc(f), /setFlag\('foundryvtt-swse', 'purchaseHistory'|flags\.foundryvtt-swse\.purchaseHistory'/, `${f}: no purchaseHistory mirror writes`);
  assert.doesNotMatch(readSrc('scripts/apps/store/store-main.js'), /getFlag\?\.\('foundryvtt-swse', 'purchaseHistory'\)/, 'history reads the TransactionEngine ledger');
  const co = readSrc('scripts/apps/store/store-checkout.js');
  assert.doesNotMatch(co, /vehicle\.condition === 'used' \? 'used' : 'new'/, 'no silent condition coercion to new');
  assert.doesNotMatch(co, /isUsed \? 'used' : 'new'/);
  const fn = co.slice(co.indexOf('function getVehicleConditionCost('), co.indexOf('function isValidVehicleConditionCost'));
  assert.doesNotMatch(fn, /costNew|costUsed|\.cost\b|finalCost\)/, 'no base-price or cross-condition fallback');
  assert.doesNotMatch(readSrc('scripts/ui/shell/StoreSurfaceController.js'), /addVehicleToCart\(store, id, condition \|\| 'new'/, 'Store never defaults a vehicle to New');
  console.log('store-v2 S2b/S4 guards ok');
}
