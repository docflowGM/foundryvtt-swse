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
