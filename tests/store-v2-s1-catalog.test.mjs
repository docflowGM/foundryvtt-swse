import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Store V2 S1: the index-first canonical catalog. Real pack records (packs/*.db), the real taxonomy,
// cost registry and listing builders. Foundry runtime behaviour (pack.getIndex, fromUuid) is RUNTIME_UNVERIFIED.
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, items: { contents: [] }, actors: { contents: [], get: () => null }, users: [],
  settings: { settings: { has: () => true }, get: () => 0, set: async () => {} } } });
const C = await import('/systems/foundryvtt-swse/scripts/engine/store/store-catalog.js');
const T = await import('/systems/foundryvtt-swse/scripts/engine/store/store-taxonomy.js');
const R = await import('/systems/foundryvtt-swse/scripts/engine/store/cost-registry.js');
const { applyPricing } = await import('/systems/foundryvtt-swse/scripts/engine/store/pricing.js');

let n = 0;
const ok = m => console.log(`  [${++n}] ${m} OK`);
const rows = pack => fs.readFileSync(new URL(`../packs/${pack}.db`, import.meta.url), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

// 1. Index field coverage: every system key of every canonical record is indexed XOR explicitly hydrate-only.
const HYDRATE_ONLY = { weapon: ['description'], armor: ['description'], equipment: ['capabilities', 'skillHooks', 'description', 'notes', 'usage'],
  droid: ['droidSystems', 'attacks', 'baseStats', 'skills', 'description'] };
for (const spec of C.STORE_ITEM_DOMAINS) {
  const idx = new Set(C.INDEX_SYSTEM_KEYS[spec.domain]), heavy = new Set(HYDRATE_ONLY[spec.domain]);
  for (const k of idx) assert.ok(!heavy.has(k), `${spec.domain}.${k} is in both lists`);
  for (const pack of spec.packs) for (const r of rows(pack.replace('foundryvtt-swse.', ''))) for (const k of Object.keys(r.system ?? {}))
    assert.ok(idx.has(k) || heavy.has(k), `${pack} ${r.name}: system.${k} is neither indexed nor hydrate-only`);
}
ok('every system key of all 609 canonical weapon/armor/equipment/droid records is indexed or explicitly hydrate-only');

// 2. Listings: exact unique identity, canonical classification, typed cost.
const all = [];
for (const spec of C.STORE_ITEM_DOMAINS) for (const pack of spec.packs) for (const r of rows(pack.replace('foundryvtt-swse.', '')))
  all.push(C.buildIndexedListing({ _id: r._id, name: r.name, img: r.img, type: r.type, system: Object.fromEntries(C.INDEX_SYSTEM_KEYS[spec.domain].filter(k => k in r.system).map(k => [k, r.system[k]])) }, { domain: spec.domain, pack }));
assert.equal(all.length, 609);
assert.equal(new Set(all.map(l => l.id)).size, all.length, 'listing ids are unique source identities');
for (const l of all) { assert.equal(l.id, `${l.sourcePack}.${l.rawId}`); assert.equal(l.sourceUuid, `Compendium.${l.sourcePack}.${l.rawId}`); }
const unclassified = all.filter(l => !l.classified);
assert.deepEqual(unclassified.map(l => `${l.sourcePack}:${l.name}`), [], 'every canonical record classifies from its own fields');
const byCat = {}; for (const l of all) byCat[l.category] = (byCat[l.category] || 0) + 1;
ok(`609 records -> 609 unique exact ids, 0 unclassified (${JSON.stringify(byCat)})`);

// 3. Classification is read from canonical fields, never from the name.
assert.equal(T.classifyWeapon({ system: { subcategory: 'pistol' }, pack: 'x.weapons-pistols' }).subcategory, 'Pistols');
assert.equal(T.classifyWeapon({ system: { subcategory: 'simple', weaponCategory: 'melee' } }).subcategory, 'Simple Melee');
assert.equal(T.classifyWeapon({ system: {}, pack: 'foundryvtt-swse.weapons-lightsabers' }).subcategory, 'Lightsabers');
assert.equal(T.classifyWeapon({ system: {}, pack: 'foundryvtt-swse.weapons-pistols' }).classified, false, 'no subcategory + no pack default: Unclassified, not guessed');
assert.equal(T.classifyDroid({ system: { degree: 'Astromech Repair Droid' } }).classified, false, 'a droid name/role is not a degree');
assert.equal(T.classifyDroid({ system: { degree: '4th-Degree' } }).subcategory, '4th-Degree: Security & Battle');
assert.equal(T.classifyEquipment({ system: { equipmentBucket: 'medical' } }).category, 'Medical');
assert.equal(T.classifyEquipment({ system: {} }).classified, false);
assert.equal(T.classifyVehicle({ packName: 'foundryvtt-swse.vehicles-walkers' }).subcategory, 'Walkers');
assert.equal(T.classifyVehicle({ packName: 'foundryvtt-swse.vehicles' }).classified, false, 'a retired aggregate pack classifies nothing');
ok('taxonomy reads canonical fields only; missing/unknown fields are Unclassified (no regex/name inference)');

// 4. Cost: published system.cost only; missing/0 are never free; no costNumeric.
assert.equal(R.buildStoreCostRecord({ type: 'weapon', system: { cost: 500 } }).costStatus, 'priced');
for (const bad of [0, undefined, null, NaN, '500', -1]) assert.equal(R.buildStoreCostRecord({ type: 'weapon', system: { cost: bad, costNumeric: 500 } }).costStatus, 'missing', String(bad));
assert.equal(all.filter(l => l.type === 'droid' && l.costStatus !== 'priced').length, 22, '22 droid records publish no price and are not sold');
ok('item/droid price = published system.cost only; 0/missing/string/costNumeric never create a price');

// 5. Vehicle new/used pricing: published prices only, selectable per condition, never derived.
const econ = (n, u) => ({ priceNew: n == null ? { status: 'absent' } : n === 'nfs' ? { status: 'not-for-sale' } : { status: 'priced', amountCredits: n },
  priceUsed: u == null ? { status: 'absent' } : { status: 'priced', amountCredits: u } });
const veh = (e, key) => applyPricing(C.buildVehicleListing({ packName: 'vehicles-starfighters', documentId: key, uuid: `Compendium.foundryvtt-swse.vehicles-starfighters.${key}`, sourceEntryKey: key,
  name: key, img: '', category: 'starfighter', vehicleBucket: 'starfighters', vehicleFamily: 'starship', economics: e }));
const both = veh(econ(150000, 65000), 'both'), newOnly = veh(econ(100000, null), 'new-only'), usedOnly = veh(econ(null, 40000), 'used-only'),
  neither = veh(econ(null, null), 'neither'), nfs = veh(econ('nfs', null), 'nfs');
assert.deepEqual([both.finalCostNew, both.finalCostUsed], [150000, 65000]);
assert.deepEqual([newOnly.finalCostNew, newOnly.finalCostUsed], [100000, null], 'a used price is never manufactured from the new price');
assert.deepEqual([usedOnly.finalCostNew, usedOnly.finalCostUsed], [null, 40000]);
assert.equal(C.isListingOfferable(usedOnly), true);
assert.equal(C.isListingOfferable(neither), false); assert.equal(C.isListingOfferable(nfs), false);
assert.equal(both.sourceEntryKey, 'both'); assert.equal(both.system.vehicleSourceEntryKey, 'both');
assert.equal(both.subcategory, 'Starfighters');
const CR = R.buildStoreCostRecord({ type: 'vehicle', economics: econ(150000, 65000) });
assert.equal(R.resolveStoreCost(CR, { condition: 'used', markup: 10 }).cost, 71500);
assert.equal(R.resolveStoreCost(CR, { condition: 'new', markup: 10 }).cost, 165000);
assert.equal(R.isStorePurchasable(R.buildStoreCostRecord({ type: 'vehicle', economics: econ(null, 40000) }), { condition: 'new' }), false);
assert.equal(R.isStorePurchasable(R.buildStoreCostRecord({ type: 'vehicle', economics: econ(null, 40000) }), { condition: 'used' }), true);
ok('vehicles: both prices -> choose New/Used; new-only -> new only; used-only -> used only; neither/not-for-sale -> not offered; markup applied per condition, used never derived');

// 6. Droid certification manifest: positive, pinned to record content, covers the pack.
const cert = JSON.parse(fs.readFileSync(new URL('../data/store/stock-droid-certification.json', import.meta.url), 'utf8'));
const droids = rows('droids');
assert.equal(Object.keys(cert.records).length, droids.length);
for (const d of droids) {
  const c = cert.records[d._id]; assert.ok(c, `${d.name} has a certification entry`);
  assert.equal(c.recordHash, crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0, 16), `${d.name}: record changed since certification; regenerate`);
}
ok(`stock droid certification covers all ${droids.length} records and pins each record's content hash`);

// 6b. The three verification levels stay distinct: eligibility is never recorded as mechanical certification.
assert.equal(cert.mechanicalCertification, 'NOT_PERFORMED');
for (const r of Object.values(cert.records)) { assert.equal(r.mechanicalCertification, 'NOT_PERFORMED'); assert.equal(typeof r.sourceIdentity, 'boolean'); assert.equal(typeof r.importAcceptance, 'boolean'); }
assert.match(fs.readFileSync(new URL('../scripts/engine/store/store-catalog.js', import.meta.url), 'utf8'), /pin\.name !== entry\.name \|\| pin\.degree !== /, 'runtime re-checks the pinned identity');
ok('droid eligibility records source identity and import acceptance separately; mechanical certification is NOT_PERFORMED and never implied');

// 7. Architecture-negative guards.
const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
for (const gone of ['loader', 'normalizer', 'categorizer', 'index', 'compendium-schema']) assert.ok(!fs.existsSync(new URL(`../scripts/engine/store/${gone}.js`, import.meta.url)), `${gone}.js deleted`);
const catalogSrc = read('scripts/engine/store/store-catalog.js') + read('scripts/engine/store/store-taxonomy.js') + read('scripts/engine/store/cost-registry.js');
for (const banned of [/localStorage/, /getDocuments\(/, /game\.items/, /game\.actors/, /costNumeric\)/, /_id \|\|/, /StatblockQuality/i, /\.test\(/]) assert.doesNotMatch(catalogSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), banned, String(banned));
ok('architecture guards: legacy pipeline files deleted; no browser-storage cache, world documents, costNumeric, alias ids, statblock ranking or regex classification in the new catalog');
console.log(`store-v2-s1-catalog: ${n} checks ok`);
