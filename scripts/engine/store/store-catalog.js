/**
 * store-catalog.js
 * ----------------
 * The Store's single, read-only, index-first catalog.
 *
 *   canonical pack index  ->  typed StoreListing  ->  (on demand) hydrated source record
 *
 * - Listings come from `pack.getIndex({ fields })` of an EXPLICIT list of canonical packs. No world
 *   Items or Actors are ever retail stock, no aggregate-pack fallback, no browser-storage copy of documents.
 * - A listing id is the exact source identity `<packId>.<documentId>`. There are no aliases, no generated
 *   ids and no de-duplication by name/price: two records are two listings.
 * - Category is read from the record's canonical classification fields (store-taxonomy.js).
 * - Prices are typed cost records (cost-registry.js; vehicles via the vehicle domain).
 * - Stock droids are listed only when positively certified in data/store/stock-droid-certification.json.
 * - The full source record is hydrated only for an inspected product or a purchase (`hydrateStoreListing`).
 */
import { STORE_PACKS } from '/systems/foundryvtt-swse/scripts/engine/store/store-constants.js';
import { classifyListing } from '/systems/foundryvtt-swse/scripts/engine/store/store-taxonomy.js';
import { buildStoreCostRecord } from '/systems/foundryvtt-swse/scripts/engine/store/cost-registry.js';

/** domain -> packs. Pack ids are the canonical subtype packs registered in system.json. */
export const STORE_ITEM_DOMAINS = Object.freeze([
  { domain: 'weapon', documentName: 'Item', packs: STORE_PACKS.WEAPON_PACKS },
  { domain: 'armor', documentName: 'Item', packs: STORE_PACKS.ARMOR_PACKS },
  { domain: 'equipment', documentName: 'Item', packs: STORE_PACKS.EQUIPMENT_PACKS },
  { domain: 'droid', documentName: 'Actor', packs: [STORE_PACKS.DROIDS] }
]);

/**
 * Index fields per domain: everything the browse list, filters and cards read. Long prose and heavy
 * statblock blobs are deliberately NOT indexed; they load with the inspected product (hydration).
 * tests/store-v2-s1-catalog.test.mjs enumerates every key of every canonical pack record and fails if a
 * key is neither indexed nor on the test's explicit hydrate-only list.
 */
export const INDEX_SYSTEM_KEYS = Object.freeze({
  weapon: ['combat', 'ammunition', 'equippable', 'economics', 'properties', 'traits', 'rangeProfile', 'weaponType', 'proficiency', 'range',
    'damageType', 'category', 'subcategory', 'weaponCategory', 'attackAttribute', 'damage', 'equipped', 'cost', 'costNumeric', 'attackBonus', 'weight',
    'schemaVersion', 'autofire', 'baseBuildDc', 'baseCost', 'chassisId', 'constructible', 'installedUpgrades', 'subtype', 'upgradeSlots'],
  armor: ['limits', 'defense', 'equippable', 'sourcebook', 'economics', 'damageReduction', 'availability', 'armorType', 'category', 'equipped',
    'armorProficiency', 'cost', 'costNumeric', 'armorCheckPenalty', 'features', 'traits', 'charges', 'defenseBonus', 'maxDexBonus', 'fortBonus',
    'speedPenalty', 'weight', 'reflexBonus', 'fortitudeBonus', 'maxDex', 'equipmentPerceptionBonus', 'schemaVersion', 'shieldRating',
    'armorProficiencyRequired', 'activated', 'currentSR'],
  equipment: ['tags', 'traits', 'modifiers', 'normalizationStatus', 'container', 'equippable', 'economics', 'sourcebook', 'source', 'equipmentTypeLabel',
    'equipmentType', 'implantEffects', 'availability', 'restriction', 'category', 'equipmentBucket', 'equipmentBucketLabel', 'itemRole', 'itemRoleLabel',
    'weightLabel', 'size', 'equipped', 'integrated', 'page', 'cost', 'costNumeric', 'value', 'sourceStatus', 'weight', 'properties', 'quantity',
    'schemaVersion', 'implantCategory', 'implantEffectId', 'flags', 'damage', 'damageType', 'installCost', 'equipmentStoreSubcategory', 'installed',
    'active', 'isImplant', 'implant', 'implantTrainingRelevant', 'staticSheetPolicy'],
  droid: ['droidSystemText', 'degree', 'droidDegreeKey', 'droidRole', 'droidRoleLabel', 'type', 'category', 'costNumeric', 'cost', 'cl', 'incomplete',
    'senses', 'baseAttackBonus', 'grapple', 'initiative', 'perception', 'reflexDefense', 'flatFooted', 'fortitudeDefense', 'willDefense', 'HP',
    'damageThreshold', 'speed', 'damageReduction']
});
const AVAILABILITY_CLASSES = ['illegal', 'military', 'restricted', 'licensed', 'rare'];
const RARITY_LABELS = { illegal: 'Illegal', military: 'Military', restricted: 'Restricted', licensed: 'Licensed', rare: 'Rare', standard: 'Standard' };

export function rarityOf(availability) {
  const text = String(availability ?? '').toLowerCase();
  if (!text) return { rarityClass: null, rarityLabel: null };
  const rarityClass = AVAILABILITY_CLASSES.find(c => text.includes(c)) ?? 'standard';
  return { rarityClass, rarityLabel: RARITY_LABELS[rarityClass] };
}

const listingBase = ({ id, sourcePack, sourceUuid, rawId, name, img, type, system, cls, costRecord }) => ({
  id, rawId, sourcePack, sourceUuid, name, img: img || 'icons/svg/mystery-man.svg', type,
  category: cls.category, subcategory: cls.subcategory, classified: cls.classified,
  availability: String(system.availability ?? '').toLowerCase(),
  ...rarityOf(system.availability),
  costStatus: costRecord.costStatus, pricingMode: costRecord.pricingMode,
  cost: costRecord.baseCost, costNew: costRecord.baseCostNew, costUsed: costRecord.baseCostUsed,
  requiresCondition: costRecord.requiresCondition, defaultCondition: costRecord.defaultCondition,
  unavailabilityReason: costRecord.unavailabilityReason, rawCostSource: costRecord.rawCostSource,
  finalCost: null, finalCostNew: null, finalCostUsed: null, usedCondition: null,
  system, hydrated: false, doc: null
});

/** Pure: one index entry of a canonical item/droid pack -> StoreListing. */
export function buildIndexedListing(entry, { domain, pack }) {
  const rawId = entry._id ?? entry.id;
  if (!rawId) throw new Error(`STORE_CATALOG_INDEX_ENTRY_WITHOUT_ID: ${pack}`);
  const system = entry.system ?? {};
  const type = entry.type ?? (domain === 'droid' ? 'droid' : domain);
  return listingBase({
    id: `${pack}.${rawId}`, rawId, sourcePack: pack, sourceUuid: `Compendium.${pack}.${rawId}`,
    name: String(entry.name ?? '').trim() || 'Unnamed', img: entry.img, type, system,
    cls: classifyListing(domain, { system, pack }),
    costRecord: buildStoreCostRecord({ type, system })
  });
}

/** Pure: one VehiclePackDataLoader index entry -> StoreListing (published economics, pack-owned category). */
export function buildVehicleListing(entry) {
  const pack = `foundryvtt-swse.${entry.packName}`;
  const system = {
    vehicleSourceEntryKey: entry.sourceEntryKey, vehicleBucket: entry.vehicleBucket, vehicleFamily: entry.vehicleFamily,
    category: entry.category, model: entry.model, size: entry.size, vehicleCrewLabel: entry.crew, cargo: entry.cargo,
    consumables: entry.consumables, challengeLevel: entry.cl, vehicleMovementRaw: entry.speed,
    vehicleSourceBook: entry.sourceBook, vehicleSourcePage: entry.sourcePage, shieldRating: entry.sr,
    vehiclePublishedShieldStatus: entry.srStatus, vehicleHyperdriveLabel: entry.hyperdrive,
    vehicleAstrogationSupportLabel: entry.astrogation
  };
  const listing = listingBase({
    id: `${pack}.${entry.documentId}`, rawId: entry.documentId, sourcePack: pack, sourceUuid: entry.uuid,
    name: entry.name, img: entry.img, type: 'vehicle', system,
    cls: classifyListing('vehicle', { packName: pack }),
    costRecord: buildStoreCostRecord({ type: 'vehicle', economics: entry.economics })
  });
  listing.sourceEntryKey = entry.sourceEntryKey;
  listing.economics = entry.economics ?? null;
  return listing;
}

/* ------------------------------------------------------------------ */
/* Loading (Foundry runtime; RUNTIME_UNVERIFIED)                       */
/* ------------------------------------------------------------------ */

let _catalog = null;
let _catalogPromise = null;

const entriesOf = index => Array.isArray(index) ? index : Array.from(index?.values?.() ?? index ?? []);

async function loadDroidCertification() {
  const res = await fetch('systems/foundryvtt-swse/data/store/stock-droid-certification.json');
  if (!res.ok) throw new Error(`STORE_DROID_CERTIFICATION_UNAVAILABLE: ${res.status}`);
  return res.json();
}

async function buildCatalog() {
  const items = [];
  const metadata = { version: 8, loadedAt: Date.now(), packsUsed: [], missingPacks: [], uncertifiedDroids: 0, unclassified: 0, vehicleCatalog: { complete: false, error: null } };
  let certified = null;

  for (const spec of STORE_ITEM_DOMAINS) {
    for (const pack of spec.packs) {
      const compendium = game.packs.get(pack);
      if (!compendium || compendium.documentName !== spec.documentName) { metadata.missingPacks.push(pack); continue; }
      metadata.packsUsed.push(pack);
      const fields = [...INDEX_SYSTEM_KEYS[spec.domain].map(k => `system.${k}`), 'name', 'img', 'type'];
      for (const entry of entriesOf(await compendium.getIndex({ fields }))) {
        if (spec.domain === 'droid') {
          certified ??= await loadDroidCertification();
          if (certified.records?.[entry._id]?.certified !== true) { metadata.uncertifiedDroids += 1; continue; }
        }
        items.push(buildIndexedListing(entry, { domain: spec.domain, pack }));
      }
    }
  }

  try {
    const { VehiclePackDataLoader } = await import('/systems/foundryvtt-swse/scripts/core/vehicle-pack-data-loader.js');
    const vehicles = await VehiclePackDataLoader.loadVehicleIndex();
    for (const entry of vehicles) items.push(buildVehicleListing(entry));
    metadata.vehicleCatalog = { complete: true, error: null, count: vehicles.length };
  } catch (err) {
    // A partial vehicle catalog is never shown.
    metadata.vehicleCatalog = { complete: false, error: String(err?.message ?? err) };
    try { ui?.notifications?.error?.(`SWSE Store: vehicle catalog is incomplete (${metadata.vehicleCatalog.error}). Vehicles are hidden.`); } catch (_e) { /* no UI */ }
  }

  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`STORE_CATALOG_DUPLICATE_SOURCE_IDENTITY: ${item.id}`);
    seen.add(item.id);
    if (!item.classified) metadata.unclassified += 1;
  }
  metadata.itemCount = items.length;
  return { items, metadata };
}

/** The catalog for this session. Source packs are static, so it is built once; `refresh` rebuilds it. */
export async function loadStoreCatalog({ refresh = false } = {}) {
  if (refresh) { _catalog = null; _catalogPromise = null; }
  if (_catalog) return _catalog;
  _catalogPromise ??= buildCatalog().then(c => (_catalog = c)).catch(err => { _catalogPromise = null; throw err; });
  return _catalogPromise;
}

export function clearStoreCatalog() { _catalog = null; _catalogPromise = null; _hydrated.clear(); }

/* ------------------------------------------------------------------ */
/* Hydration                                                           */
/* ------------------------------------------------------------------ */

/**
 * Load the full canonical source record of a listing (inspect / purchase). Verifies identity against the
 * listing; a mismatch throws. Idempotent. Vehicles are hydrated by VehiclePackDataLoader at purchase.
 */
const _hydrated = new Map();   // listing id -> { doc, system, hydrated } (source records are static per session)
const _inflight = new Map();

export async function hydrateStoreListing(listing) {
  if (!listing || listing.type === 'vehicle') return listing;
  if (listing.hydrated) return listing;
  if (!_hydrated.has(listing.id)) {
    if (!_inflight.has(listing.id)) {
      _inflight.set(listing.id, (async () => {
        const doc = await fromUuid(listing.sourceUuid);
        if (!doc || doc.id !== listing.rawId || doc.type !== listing.type || doc.name !== listing.name)
          throw new Error(`STORE_SOURCE_IDENTITY_MISMATCH: ${listing.id}`);
        const data = doc.toObject();
        data._stats = { ...(data._stats ?? {}), compendiumSource: listing.sourceUuid };
        data.__storeSource = { pack: listing.sourcePack, documentId: listing.rawId, uuid: listing.sourceUuid };
        _hydrated.set(listing.id, { doc: data, system: data.system ?? listing.system, hydrated: true });
      })().finally(() => _inflight.delete(listing.id)));
    }
    await _inflight.get(listing.id);
  }
  Object.assign(listing, _hydrated.get(listing.id));
  return listing;
}

export async function hydrateStoreListings(listings) {
  await Promise.all((listings ?? []).filter(Boolean).map(hydrateStoreListing));
}

/**
 * The Item data a Store purchase creates: the hydrated SOURCE record (flags, effects, full system), never the
 * lightweight listing. Returns a detached copy, or null when the listing has not been hydrated (the caller refuses).
 */
export function storeItemDocumentData(item) {
  const src = item?.doc ?? item;
  if (!src || typeof src !== 'object') return null;
  let data;
  if (typeof src.toObject === 'function') data = src.toObject();
  else if (src !== item || 'flags' in src || '_stats' in src) data = JSON.parse(JSON.stringify(src));
  else return null;
  if (!data || typeof data !== 'object' || typeof data.type !== 'string' || !data.name) return null;
  for (const key of Object.keys(data)) if (key.startsWith('__store')) delete data[key];
  const sourceUuid = item?.sourceUuid ?? src.uuid ?? null;
  if (sourceUuid) data._stats = { ...(data._stats ?? {}), compendiumSource: data._stats?.compendiumSource ?? sourceUuid };
  return data;
}

/** Listings that may be offered at all (typed cost state is priced or conditional). */
export function isListingOfferable(item = {}) {
  return item.costStatus === 'priced' || item.costStatus === 'conditional';
}

/* ------------------------------------------------------------------ */
/* Index structure the Store surfaces consume                          */
/* ------------------------------------------------------------------ */

/**
 * Build the browse index: offerable listings only (priced or conditional), merchant policy applied, grouped by
 * type and category. Non-offerable records are counted in metadata, never silently priced.
 * Listing objects are shared with the catalog (not cloned); pricing is re-applied on every build.
 */
export async function buildStoreIndex({ refresh = false } = {}) {
  const { applyPricing } = await import('/systems/foundryvtt-swse/scripts/engine/store/pricing.js');
  const catalog = await loadStoreCatalog({ refresh });
  const allItems = [];
  let notOffered = 0;
  for (const item of catalog.items) {
    if (!isListingOfferable(item)) { notOffered += 1; continue; }
    // Per-build copy: merchant policy mutates listings, the catalog's source listings stay pristine.
    allItems.push(applyPricing({ ...item, ...(_hydrated.get(item.id) ?? {}) }));
  }
  const priceOf = i => i.finalCost ?? i.finalCostNew ?? i.finalCostUsed ?? Infinity;
  allItems.sort((a, b) => priceOf(a) - priceOf(b) || a.name.localeCompare(b.name));

  const index = { allItems, byId: new Map(), byType: new Map(), byCategory: new Map(), metadata: { ...catalog.metadata, notOffered } };
  for (const item of allItems) {
    index.byId.set(item.id, item);
    if (!index.byType.has(item.type)) index.byType.set(item.type, []);
    index.byType.get(item.type).push(item);
    if (!index.byCategory.has(item.category)) index.byCategory.set(item.category, new Map());
    const subs = index.byCategory.get(item.category);
    if (!subs.has(item.subcategory)) subs.set(item.subcategory, []);
    subs.get(item.subcategory).push(item);
  }
  return index;
}
