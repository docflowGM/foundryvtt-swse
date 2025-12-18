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
 *     itemCount,
 *     actorCount
 *   }
 * }
 */

import { STORE_PACKS } from "../store-constants.js";

const CACHE_KEY = "swse-store-cache-v1";   // bump this to invalidate all caches
const CACHE_TTL = 1000 * 60 * 60 * 24;     // 24 hours

/* ------------------------------------------- */
/* CACHE HELPERS                                */
/* ------------------------------------------- */

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Expired cache?
    if (Date.now() - parsed.metadata.loadedAt > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("SWSE Store | Cache load failed:", err);
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("SWSE Store | Cache save failed:", err);
  }
}

/* ------------------------------------------- */
/* SAFE FETCH HELPERS                           */
/* ------------------------------------------- */

async function safeGetPackDocuments(packName) {
  const pack = game.packs.get(packName);
  if (!pack) {
    console.warn(`SWSE Store | Missing pack: ${packName}`);
    return [];
  }

  try {
    const docs = await pack.getDocuments();
    return docs;
  } catch (err) {
    console.error(`SWSE Store | Cannot load pack: ${packName}`, err);
    return [];
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
    if (cached) return cached;
  }

  /* ------------------------------------------- */
  /* LOAD WORLD ITEMS                             */
  /* ------------------------------------------- */

  const worldItems = game.items.contents || [];
  const worldActors = game.actors.contents || [];

  /* ------------------------------------------- */
  /* LOAD PACK ITEMS                              */
  /* ------------------------------------------- */

  const packItemDocs = [
    ...(await safeGetPackDocuments(STORE_PACKS.WEAPONS)),
    ...(await safeGetPackDocuments(STORE_PACKS.ARMOR)),
    ...(await safeGetPackDocuments(STORE_PACKS.EQUIPMENT)),
  ];

  /* ------------------------------------------- */
  /* LOAD PACK ACTORS (droids + vehicles)         */
  /* ------------------------------------------- */

  const packActorDocs = [
    ...(await safeGetPackDocuments(STORE_PACKS.DROIDS)),
    ...(await safeGetPackDocuments(STORE_PACKS.VEHICLES)),
  ];

  /* ------------------------------------------- */
  /* MERGE SOURCES                                */
  /* ------------------------------------------- */

  const allItems = [...worldItems, ...packItemDocs];
  const allActors = [...worldActors, ...packActorDocs];

  /* ------------------------------------------- */
  /* BUILD METADATA                                */
  /* ------------------------------------------- */

  const metadata = {
    version: 1,
    loadedAt: Date.now(),
    packsUsed: Object.values(STORE_PACKS),
    itemCount: allItems.length,
    actorCount: allActors.length,
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
    ui.notifications.info("SWSE Store cache cleared. The store will rebuild next time it opens.");
  } catch (err) {
    console.warn("SWSE Store | Failed to clear cache:", err);
  }
}
