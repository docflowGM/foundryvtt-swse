import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Store V2 catalog and pricing: a Store purchase creates the COMPENDIUM record the listing came from (canonical identity, effects, full
// system data) -- never the normalized store listing, which silently drops `flags` (flags.swse.canonicalWeapon) -- and the price the Store
// displays, puts in the cart and charges is one calculation (base system.cost x GM markup x GM discount). Real pack records
// (packs/*.db, generated from data/canonical), the real normalizer / pricing / checkout plan builder / weapon runtime / Modification V2
// catalog. Transaction safety (insufficient credits, double click, rollback, H7 cost validation) is covered by ti2-commerce-integrity.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {};
globalThis.foundry.utils ??= {};
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };
globalThis.ui = { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
const settings = { storeMarkup: 0, storeDiscount: 0 };
globalThis.game = { ...(globalThis.game ?? {}), user: { isGM: true, id: 'gm' }, items: { get: () => null, contents: [] }, actors: { contents: [], get: () => null },
  settings: { settings: { has: () => true }, get: (_s, k) => settings[k], set: async (_s, k, v) => { settings[k] = v; return v; } } };

const { buildIndexedListing, storeItemDocumentData, isListingOfferable, STORE_ITEM_DOMAINS } = await import('/systems/foundryvtt-swse/scripts/engine/store/store-catalog.js');
const { applyPricing } = await import('/systems/foundryvtt-swse/scripts/engine/store/pricing.js');
const { createItemPlans } = await import('/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js');
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { resolveArmorData } = await import('/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js');
const P = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-install-service.js');
HouseRuleService.getNumber = (key, fallback = 0) => (Number.isFinite(Number(settings[key])) ? Number(settings[key]) : fallback);

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const record = (pack, pred) => { for (const l of fs.readFileSync(new URL(`../packs/${pack}.db`, import.meta.url), 'utf8').split('\n')) { if (!l.trim()) continue; const d = JSON.parse(l); if (pred(d)) return d; } throw new Error(`no record in ${pack}`); };
// a compendium Document as the loader hands it to the Store (toObject + uuid), and the cached form (plain data with the loader annotation)
const asDocument = (data, pack) => ({ ...JSON.parse(JSON.stringify(data)), uuid: `Compendium.foundryvtt-swse.${pack}.Item.${data._id}`, toObject() { const { toObject, uuid, ...rest } = this; return JSON.parse(JSON.stringify(rest)); } });
const asCached = (data, pack) => ({ ...JSON.parse(JSON.stringify(data)), __storeSource: { source: 'compendium', pack: `foundryvtt-swse.${pack}`, documentId: data._id, uuid: `Compendium.foundryvtt-swse.${pack}.Item.${data._id}` } });
// index-first listing + the hydrated source record (what hydrateStoreListing attaches for an inspected / purchased product)
const listing = (raw) => {
  const pack = /Compendium\.(.+?)\.Item\./.exec(raw.uuid ?? raw.__storeSource.uuid)[1];
  const domain = raw.type;
  const entry = { _id: raw._id, name: raw.name, img: raw.img, type: raw.type, system: raw.system };
  const l = buildIndexedListing(entry, { domain, pack });
  const doc = JSON.parse(JSON.stringify(raw)); delete doc.uuid; delete doc.toObject;
  doc._stats = { ...(doc._stats ?? {}), compendiumSource: l.sourceUuid };
  return applyPricing(Object.assign(l, { doc, system: doc.system, hydrated: true }));
};
const buy = (storeItem) => createItemPlans([{ id: storeItem.id, name: storeItem.name, cost: storeItem.finalCost, item: storeItem }])[0].add.items[0];

const PISTOL = record('weapons-pistols', (d) => d.name === 'Blaster Pistol');
const ARMOR = record('armor-light', (d) => d.system?.cost > 0);
const GEAR = record('equipment-tools', (d) => d.system?.cost > 0);

{
  for (const [label, raw] of [['document', asDocument(PISTOL, 'weapons-pistols')]]) {
    const owned = buy(listing(raw));
    assert.equal(owned.flags?.swse?.canonicalWeapon?.identityKey, 'weapon-blaster-pistol', `${label}: canonical weapon identity kept`);
    assert.deepEqual(owned.system, PISTOL.system, `${label}: the full canonical system data`);
    assert.equal(owned.type, 'weapon'); assert.equal(owned.name, 'Blaster Pistol');
    assert.equal(owned._stats?.compendiumSource, `Compendium.foundryvtt-swse.weapons-pistols.${PISTOL._id}`, `${label}: provenance`);
    assert.ok(!Object.keys(owned).some((k) => k.startsWith('__store') || ['costStatus', 'finalCost', 'doc', 'canonicalId'].includes(k)), `${label}: no store-view fields in the Item`);
    const dmg = rt.resolveCanonicalDamage({ ...owned, id: 'owned' }, {});
    assert.equal(dmg.source, 'canonical', `${label}: resolves through the canonical weapon runtime`); assert.equal(dmg.base, '3d6');
  }
  // the defect: the normalized listing alone has no flags -> no canonical identity; such a purchase is refused instead of creating it
  const view = listing(asDocument(PISTOL, 'weapons-pistols'));
  assert.equal('flags' in { ...view, doc: undefined }, false, 'the listing view itself carries no flags');
  const { doc, ...viewOnly } = view;
  assert.throws(() => createItemPlans([{ id: view.id, name: view.name, cost: view.finalCost, item: viewOnly }]), /no source document; purchase refused/);
  ok('weapon: a purchased Blaster Pistol is the canonical record (identityKey, full system, provenance) and resolves through the canonical weapon runtime (3d6); a listing without its source record is refused');
}
{
  const owned = buy(listing(asDocument(ARMOR, 'armor-light')));
  assert.equal(owned.type, 'armor'); assert.deepEqual(owned.system, ARMOR.system, 'full canonical armor data');
  assert.deepEqual(owned.effects ?? [], ARMOR.effects ?? []); assert.deepEqual(owned.flags ?? {}, ARMOR.flags ?? {});
  const a = resolveArmorData({ ...owned, system: { ...owned.system, equipped: true } });
  assert.equal(a.armorType, resolveArmorData(ARMOR).armorType); assert.equal(a.reflexBonus, resolveArmorData(ARMOR).reflexBonus);
  const gear = buy(listing(asDocument(GEAR, 'equipment-tools')));
  assert.equal(gear.type, 'equipment'); assert.deepEqual(gear.system, GEAR.system); assert.deepEqual(gear.flags, GEAR.flags, 'gear flags (bucket) kept');
  assert.equal(gear.system.weight, GEAR.system.weight); assert.equal(gear.system.cost, GEAR.system.cost);
  ok(`armor (${ARMOR.name}) and gear (${GEAR.name}): the purchased Item is the canonical record (system, effects, flags); armor statistics resolve as from the compendium`);
}
{
  const data = await P.loadModificationData({ fetchText: async (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8') });
  const pistol = { ...buy(listing(asDocument(PISTOL, 'weapons-pistols'))), id: 'p1', flags: buy(listing(asDocument(PISTOL, 'weapons-pistols'))).flags };
  const mods = P.listDomainModifications({ data, item: pistol, weaponLookup: await P.productionWeaponLookup() });
  const scope = mods.find((m) => m.typedDefinitionId === 'sv-targeting-scope-standard::weapon');
  assert.ok(scope && !scope.hard.some((h) => h.code === 'SLOT_STATE_UNRESOLVED'), 'Modification V2 resolves the bought weapon\'s slots (canonical identity): ' + JSON.stringify(scope?.hard));
  const armorMods = P.listDomainModifications({ data, item: { ...buy(listing(asDocument(ARMOR, 'armor-light'))), id: 'a1' } });
  assert.ok(armorMods.length > 0, 'Modification V2 lists armor modifications for bought armor');
  ok('Modification V2 sees the bought weapon\'s canonical identity (slot state resolves) and lists armor modifications for bought armor');
}
{
  // one price authority: base system.cost x (1 + markup%) x (1 - discount%), the same number displayed, put in the cart and charged
  settings.storeMarkup = 0; settings.storeDiscount = 0;
  assert.equal(listing(asDocument(PISTOL, 'weapons-pistols')).finalCost, PISTOL.system.cost);
  settings.storeMarkup = 10; settings.storeDiscount = 20;
  const priced = listing(asDocument(PISTOL, 'weapons-pistols'));
  assert.equal(priced.finalCost, Math.round(PISTOL.system.cost * 1.1 * 0.8), 'markup and the GM discount are both applied (the discount was ignored before)');
  const { addItemToCart } = await import('/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js');
  const store = { cart: { items: [] }, itemsById: new Map([[priced.id, priced]]) };
  await addItemToCart(store, priced.id, null);
  assert.equal(store.cart.items.length, 1, 'added to the cart');
  assert.equal(store.cart.items[0].cost, priced.finalCost, 'the cart charges exactly the displayed final price');
  settings.storeMarkup = 0; settings.storeDiscount = 0;
  // a missing price is never a zero price: it is not listed for sale
  const missing = listing(asDocument({ ...GEAR, _id: 'nocost', system: { ...GEAR.system, cost: undefined, costNumeric: undefined, price: undefined } }, 'equipment-tools'));
  assert.equal(missing.costStatus, 'missing'); assert.equal(missing.finalCost, null);
  assert.equal(isListingOfferable(missing), false, 'not offered');
  const zero = listing(asDocument({ ...GEAR, _id: 'zerocost', system: { ...GEAR.system, cost: 0, costNumeric: 0, price: undefined } }, 'equipment-tools'));
  assert.equal(zero.finalCost, null, 'a 0 placeholder price is not sold for 0 credits');
  ok('pricing: one calculation (base x markup x discount) for display and cart; missing or 0 prices are never sold as free');
}
{
  // the aggregate equipment pack holds the same records as the subtype packs; the Store reads the explicit subtype packs only (no aggregate, no fallback)
  const catalogSrc = fs.readFileSync(new URL('../scripts/engine/store/store-catalog.js', import.meta.url), 'utf8');
  assert.doesNotMatch(catalogSrc, /STORE_PACKS\.EQUIPMENT\b|WEAPONS_CANONICAL|ARMOR_CANONICAL/);
  assert.equal(STORE_ITEM_DOMAINS.find((d) => d.domain === 'equipment').packs.length, 7);
  const ids = (f) => fs.readFileSync(new URL(`../packs/${f}`, import.meta.url), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)._id);
  const sub = fs.readdirSync(new URL('../packs/', import.meta.url)).filter((f) => /^equipment-[a-z]+\.db$/.test(f)).flatMap(ids);
  assert.equal(new Set(sub).size, sub.length, 'no duplicate ids across the equipment subtype packs');
  assert.deepEqual(new Set(ids('equipment.db')), new Set(sub), 'the aggregate is exactly the subtype records (so loading both listed every gear item twice)');
  ok('catalog: gear comes from the 7 equipment subtype packs only (each record once); the identical aggregate is not inventory');
}
console.log(`store-v2-purchase-integrity: ${n} checks ok`);
