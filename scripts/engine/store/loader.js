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
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.actors) || !parsed.metadata) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    if (!parsed.metadata.loadedAt || !parsed.metadata.version || (parsed.items.length + parsed.actors.length) === 0) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

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

  const itemPackNames = [...STORE_PACKS.WEAPON_PACKS, ...STORE_PACKS.ARMOR_PACKS, ...(STORE_PACKS.EQUIPMENT_PACKS || []), STORE_PACKS.EQUIPMENT];
  const itemPackResults = await Promise.all(itemPackNames.map(safeGetPackDocuments));

  const weaponDocs = itemPackResults.filter(result => (STORE_PACKS.WEAPON_PACKS || []).includes(result.packName)).flatMap(result => result.docs);
  const armorDocs = itemPackResults.filter(result => (STORE_PACKS.ARMOR_PACKS || []).includes(result.packName)).flatMap(result => result.docs);
  const equipmentDocs = itemPackResults.filter(result => ([...(STORE_PACKS.EQUIPMENT_PACKS || []), STORE_PACKS.EQUIPMENT]).includes(result.packName)).flatMap(result => result.docs);

  let packItemDocs = [...weaponDocs, ...armorDocs, ...equipmentDocs];

  // Canonical weapons pack fallback: only use when split weapon packs return no items.
  if (weaponDocs.length === 0 && STORE_PACKS.WEAPONS_CANONICAL) {
    const canonicalWeapons = await safeGetPackDocuments(STORE_PACKS.WEAPONS_CANONICAL);
    if (canonicalWeapons.found) {
      itemPackResults.push(canonicalWeapons);
      packItemDocs = [...packItemDocs, ...canonicalWeapons.docs];
    }
  }

  // Canonical armor pack fallback: only use when split armor packs return no items.
  if (armorDocs.length === 0 && STORE_PACKS.ARMOR_CANONICAL) {
    const canonicalArmor = await safeGetPackDocuments(STORE_PACKS.ARMOR_CANONICAL);
    if (canonicalArmor.found) {
      itemPackResults.push(canonicalArmor);
      packItemDocs = [...packItemDocs, ...canonicalArmor.docs];
    }
  }

  if (equipmentDocs.length === 0 && STORE_PACKS.EQUIPMENT) {
    const canonicalEquipment = await safeGetPackDocuments(STORE_PACKS.EQUIPMENT);
    if (canonicalEquipment.found) {
      itemPackResults.push(canonicalEquipment);
      packItemDocs = [...packItemDocs, ...canonicalEquipment.docs];
    }
  }

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
    version: 3,
    loadedAt: Date.now(),
    packsUsed: flattenPackNames([
      STORE_PACKS.WEAPON_PACKS,
      STORE_PACKS.ARMOR_PACKS,
      STORE_PACKS.WEAPONS_CANONICAL,
      STORE_PACKS.ARMOR_CANONICAL,
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
