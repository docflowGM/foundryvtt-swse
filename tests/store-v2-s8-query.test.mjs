import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Store V2 S8: ONE navigation predicate (matchesStoreQuery) over the canonical listing. Deterministic, offline.
// Timings are printed as OFFLINE MEASUREMENTS of pure code (not Foundry measurements) and only loosely bounded.
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, items: { contents: [] }, actors: { contents: [], get: () => null }, users: [], settings: { settings: { has: () => true }, get: () => 0, set: async () => {} }, i18n: { localize: k => k, format: k => k } } });
globalThis.foundry.utils ??= {};
const C = await import('/systems/foundryvtt-swse/scripts/engine/store/store-catalog.js');
const S = await import('/systems/foundryvtt-swse/scripts/apps/store/store-shared.js');
const { UNIVERSAL_VEHICLE_PACKS } = await import('/systems/foundryvtt-swse/scripts/domain/vehicles/universal-vehicle-pack-registry.js');

const rows = pack => fs.readFileSync(new URL(`../packs/${pack}.db`, import.meta.url), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const listings = [];
for (const spec of C.STORE_ITEM_DOMAINS) for (const pack of spec.packs) for (const r of rows(pack.replace('foundryvtt-swse.', '')))
  listings.push(C.buildIndexedListing({ _id: r._id, name: r.name, img: r.img, type: r.type, system: r.system }, { domain: spec.domain, pack }));
let v = 0;
for (const spec of UNIVERSAL_VEHICLE_PACKS) for (let i = 0; i < 39; i++, v++)
  listings.push(C.buildVehicleListing({ packName: spec.name, documentId: `${spec.name}-${i}`, uuid: `Compendium.foundryvtt-swse.${spec.name}.${i}`, sourceEntryKey: `k${v}`, name: `V${v}`, img: '',
    category: spec.categories[0], vehicleBucket: spec.name.slice('vehicles-'.length), vehicleFamily: spec.family, size: i % 2 ? 'Large' : 'Huge',
    economics: { priceNew: { status: 'priced', amountCredits: 1000 + v }, priceUsed: { status: 'absent' } } }));
assert.ok(listings.length > 1000);
let n = 0; const ok = m => console.log(`  [${++n}] ${m} OK`);

// Category keys come from the canonical catalog category (exact map), and partition the catalog.
const keys = new Map();
for (const l of listings) keys.set(S.storeItemCategoryKey(l), (keys.get(S.storeItemCategoryKey(l)) ?? 0) + 1);
assert.equal([...keys.values()].reduce((a, b) => a + b, 0), listings.length);
for (const k of ['weapons', 'armor', 'droids', 'vehicles', 'gear', 'implants']) assert.ok(keys.get(k) > 0, k);
for (const [k, c] of keys) assert.equal(listings.filter(l => S.matchesStoreQuery(l, { currentCategory: k })).length, c, `${k}: predicate agrees with the category partition`);
ok(`category keys partition ${listings.length} listings: ${JSON.stringify(Object.fromEntries(keys))}`);

// Subcategories partition each category (nothing falls through).
for (const k of keys.keys()) {
  const subs = new Set(listings.filter(l => S.storeItemCategoryKey(l) === k).map(l => S.getStoreNavigationSubcategory(l)));
  let sum = 0; for (const sub of subs) sum += listings.filter(l => S.matchesStoreQuery(l, { currentCategory: k, currentSubcategory: sub })).length;
  assert.equal(sum, keys.get(k), `${k}: subcategories partition the category`);
}
assert.equal(S.getStoreNavigationSubcategory(listings.find(l => l.type === 'vehicle')).includes('Unclassified'), false, 'pack-owned vehicle categories classify');
ok('subcategory facets partition every category');

// Vehicle facet.
const huge = listings.filter(l => S.matchesStoreQuery(l, { currentCategory: 'vehicles', currentVehicleSize: 'huge' }));
assert.ok(huge.length > 0 && huge.length < listings.filter(l => l.type === 'vehicle').length);
assert.ok(huge.every(l => /huge/i.test(l.system.size)));
ok('vehicle facets filter through the same predicate');

// Loose offline timing: 200 full-catalog passes with three representative queries.
const t0 = performance.now();
for (let i = 0; i < 200; i++) for (const q of [{ currentCategory: 'weapons' }, { currentCategory: 'vehicles', currentVehicleSize: 'huge' }, { currentCategory: 'droids', currentSubcategory: '4th-Degree: Security & Battle' }])
  listings.filter(l => S.matchesStoreQuery(l, q));
const ms = performance.now() - t0;
console.log(`  offline measurement: ${listings.length} listings x 600 filter passes in ${ms.toFixed(1)} ms (${(ms / 600).toFixed(3)} ms per full-catalog pass)`);
assert.ok(ms < 5000, 'pure filtering stays cheap');
ok('pure navigation filtering is cheap (offline measurement printed)');

// Static: one pipeline, no per-surface copies.
const read = f => fs.readFileSync(f, 'utf8');
for (const f of ['scripts/apps/store/store-main.js', 'scripts/ui/shell/StoreSurfaceService.js', 'scripts/ui/shell/StoreSurfaceController.js']) {
  const src = read(f);
  for (const name of ['normalizeStoreFilterValue', 'normalizeAvailabilityText', 'positiveCreditOrNull', 'resolveVehicleStoreCosts', 'vehiclePriceStatusLabel', 'storeItemCategoryKey'])
    assert.doesNotMatch(src, new RegExp(`function _?${name}\\(`), `${f}: ${name} is defined once, in store-shared.js`);
}
assert.ok(!fs.existsSync('scripts/apps/store/store-filters.js'), 'dead DOM filter module deleted');
assert.match(read('scripts/ui/shell/StoreSurfaceService.js'), /const visibleItems = allItems;/, 'the shell does not re-filter what the store instance already narrowed');
const main = read('scripts/apps/store/store-main.js');
const fnStart = main.indexOf('  _buildItemsWithSuggestions() {');
assert.ok(fnStart > 0 && main.indexOf('matchesStoreQuery(item, this)', fnStart) < main.indexOf('this._viewFromItem(item)', fnStart), 'filter precedes view-model construction');
ok('single filter pipeline: shared helpers defined once, filter runs before view building, shell does not re-filter');
console.log(`store-v2-s8-query: ${n} checks ok`);
