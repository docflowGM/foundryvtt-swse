/**
 * loader.js
 * ----------
 * Loads world items, compendium items, droids & vehicles into raw arrays.
 * Supports caching for fast reloads.
 *
 * Output shape:
 * {
 *   items: [ FoundryItem | plainObject ],
 *   actors: [ FoundryActor | plainObject ],
 *   metadata: {
 *     version,
 *     loadedAt,
 *     packsUsed: [],
 *     missingPacks: [],
 *     sourceCounts: {},
 *     itemCount,
 *     actorCount
 *   }
 * }
 */

import { STORE_PACKS, STORE_RULES } from "/systems/foundryvtt-swse/scripts/engine/store/store-constants.js";

const { CACHE_KEY, CACHE_TTL } = STORE_RULES;

/* ------------------------------------------- */
/* CACHE HELPERS                                */
/* ------------------------------------------- */

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {return null;}

    const parsed = JSON.parse(raw);

    // Expired cache?
    if (Date.now() - parsed.metadata.loadedAt > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('SWSE Store | Cache load failed:', err);
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('SWSE Store | Cache save failed:', err);
  }
}


function flattenPackNames(value) {
  if (Array.isArray(value)) return value.flatMap(flattenPackNames);
  return typeof value === 'string' ? [value] : [];
}

function countBySource(docs = []) {
  const counts = {};
  for (const doc of docs) {
    const source = doc?.pack || 'world';
    counts[source] = (counts[source] || 0) + 1;
  }
  return counts;
}

function mergeSourceCounts(...sources) {
  const merged = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source || {})) {
      merged[key] = (merged[key] || 0) + Number(value || 0);
    }
  }
  return merged;
}

/* ------------------------------------------- */
/* SAFE FETCH HELPERS                           */
/* ------------------------------------------- */

async function safeGetPackDocuments(packName) {
  const pack = game.packs.get(packName);
  if (!pack) {
    console.warn(`SWSE Store | Missing pack: ${packName}`);
    return { docs: [], found: false, packName };
  }

  try {
    const docs = await pack.getDocuments();
    return { docs, found: true, packName };
  } catch (err) {
    console.error(`SWSE Store | Cannot load pack: ${packName}`, err);
    return { docs: [], found: false, packName };
  }
}

/* ------------------------------------------- */
/* MAIN LOADER                                   */
/* ------------------------------------------- */

/**
 * Load *raw* store data (no normalization/categorization yet)
 *
 * @param {Object} opts
 * @param {Boolean} opts.useCache - whether to load from cache first
 *
 * @returns {Promise<{ items: [], actors: [], metadata: {} }>}
 */
export async function loadRawStoreData({ useCache = true } = {}) {
  // Check cache
  if (useCache) {
    const cached = loadCache();
    if (cached) {return cached;}
  }

  /* ------------------------------------------- */
  /* LOAD WORLD ITEMS                             */
  /* ------------------------------------------- */

  const worldItems = game.items.contents || [];

  // P0-4: Filter world actors to only include droid/vehicle types (not PCs/NPCs)
  // This prevents player characters from appearing as store inventory
  const worldActors = (game.actors.contents || [])
    .filter(a => a && a.type && (a.type === 'droid' || a.type === 'vehicle'));

  /* ------------------------------------------- */
  /* LOAD PACK ITEMS                              */
  /* ------------------------------------------- */

  const itemPackNames = [STORE_PACKS.WEAPONS, STORE_PACKS.ARMOR, STORE_PACKS.EQUIPMENT];
  const itemPackResults = await Promise.all(itemPackNames.map(safeGetPackDocuments));
  const packItemDocs = itemPackResults.flatMap(result => result.docs);

  /* ------------------------------------------- */
  /* LOAD PACK ACTORS (droids + vehicles)         */
  /* ------------------------------------------- */

  const actorPackNames = [STORE_PACKS.DROIDS, ...STORE_PACKS.VEHICLE_PACKS];
  const actorPackResults = await Promise.all(actorPackNames.map(safeGetPackDocuments));
  let packActorDocs = actorPackResults.flatMap(result => result.docs);

  // Canonical vehicles pack fallback: only use when split vehicle packs return no actors.
  if (packActorDocs.length === 0 && STORE_PACKS.VEHICLES_CANONICAL) {
    const canonicalVehicles = await safeGetPackDocuments(STORE_PACKS.VEHICLES_CANONICAL);
    if (canonicalVehicles.found) {
      actorPackResults.push(canonicalVehicles);
      packActorDocs = canonicalVehicles.docs;
    }
  }

  const missingPacks = [...itemPackResults, ...actorPackResults]
    .filter(result => !result.found)
    .map(result => result.packName);

  /* ------------------------------------------- */
  /* MERGE SOURCES                                */
  /* ------------------------------------------- */

  const allItems = [...worldItems, ...packItemDocs]
    .filter(item => item.type !== 'weaponUpgrade'); // Exclude weaponUpgrades - they're not store inventory
  const allActors = [...worldActors, ...packActorDocs];

  const itemSourceCounts = mergeSourceCounts(countBySource(worldItems), countBySource(packItemDocs));
  const actorSourceCounts = mergeSourceCounts(countBySource(worldActors), countBySource(packActorDocs));

  /* ------------------------------------------- */
  /* BUILD METADATA                                */
  /* ------------------------------------------- */

  const metadata = {
    version: 2,
    loadedAt: Date.now(),
    packsUsed: flattenPackNames([
      STORE_PACKS.WEAPONS,
      STORE_PACKS.ARMOR,
      STORE_PACKS.EQUIPMENT,
      STORE_PACKS.DROIDS,
      STORE_PACKS.VEHICLE_PACKS,
      STORE_PACKS.VEHICLES_CANONICAL
    ]),
    missingPacks,
    sourceCounts: {
      items: itemSourceCounts,
      actors: actorSourceCounts,
      worldItems: worldItems.length,
      worldActors: worldActors.length,
      packItems: packItemDocs.length,
      packActors: packActorDocs.length,
      filteredItems: allItems.length,
      filteredActors: allActors.length
    },
    itemCount: allItems.length,
    actorCount: allActors.length
  };

  const result = {
    items: allItems.map(i => i.toObject ? i.toObject() : i),
    actors: allActors.map(a => a.toObject ? a.toObject() : a),
    metadata
  };

  saveCache(result);

  return result;
}

/**
 * Force flush the cache.
 */
export function clearStoreCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    ui.notifications.info('SWSE Store cache cleared. The store will rebuild next time it opens.');
  } catch (err) {
    console.warn('SWSE Store | Failed to clear cache:', err);
  }
}
