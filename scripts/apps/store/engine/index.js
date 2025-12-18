/**
 * index.js
 * ---------
 * Master store index builder for SWSE Store 2.0.
 *
 * Combines:
 *   - loader.js       → loads raw Foundry items/actors
 *   - normalizer.js   → cleans + normalizes all entries
 *   - categorizer.js  → assigns categories/subcategories
 *   - pricing.js      → applies markup, discount, used prices
 *
 * Output: storeIndex = {
 *   allItems: [],
 *   byId: Map(id → item),
 *   byType: Map(type → items[]),
 *   byCategory: Map(category → Map(subcat → items[])),
 *   metadata: {...}
 * }
 */

import { loadRawStoreData } from "./loader.js";
import { normalizeStoreItem } from "./normalizer.js";
import { categorizeItem } from "./categorizer.js";
import { applyPricing } from "./pricing.js";

/* ----------------------------------------------------------- */
/* CATEGORY STRUCTURE BUILDER                                   */
/* ----------------------------------------------------------- */

function ensureCategoryStructure(index, cat, sub) {
  if (!index.byCategory.has(cat)) {
    index.byCategory.set(cat, new Map());
  }
  const subMap = index.byCategory.get(cat);

  if (!subMap.has(sub)) {
    subMap.set(sub, []);
  }
  return subMap;
}

/* ----------------------------------------------------------- */
/* TYPE STRUCTURE BUILDER                                       */
/* ----------------------------------------------------------- */

function ensureTypeStructure(index, type) {
  if (!index.byType.has(type)) {
    index.byType.set(type, []);
  }
  return index.byType.get(type);
}

/* ----------------------------------------------------------- */
/* MAIN ENTRY POINT                                             */
/* ----------------------------------------------------------- */

/**
 * Build the full store index.
 *
 * @param {Object} opts
 * @param {Boolean} opts.useCache - whether to use cached raw data
 *
 * @returns {Promise<storeIndex>}
 */
export async function buildStoreIndex({ useCache = true } = {}) {
  /* -------------------------------------- */
  /* 1. Load raw data                        */
  /* -------------------------------------- */
  const raw = await loadRawStoreData({ useCache });

  /* -------------------------------------- */
  /* 2. Normalize all items & actors         */
  /* -------------------------------------- */
  const normalized = [
    ...raw.items.map(normalizeStoreItem),
    ...raw.actors.map(normalizeStoreItem)
  ];

  /* -------------------------------------- */
  /* 3. Categorize + apply pricing           */
  /* -------------------------------------- */
  const processed = normalized
    .map(i => categorizeItem(i))
    .map(i => applyPricing(i));

  /* -------------------------------------- */
  /* 4. Build index structures               */
  /* -------------------------------------- */

  const index = {
    allItems: processed,
    byId: new Map(),
    byType: new Map(),
    byCategory: new Map(),
    metadata: raw.metadata
  };

  for (const item of processed) {
    // ID lookup
    index.byId.set(item.id, item);

    // Type grouping
    const typeGroup = ensureTypeStructure(index, item.type);
    typeGroup.push(item);

    // Category grouping
    const cat = item.category || "Other";
    const sub = item.subcategory || "Misc";

    const subMap = ensureCategoryStructure(index, cat, sub);
    subMap.get(sub).push(item);
  }

  /* -------------------------------------- */
  /* 5. Sort each subgroup                   */
  /* -------------------------------------- */

  for (const [, subMap] of index.byCategory.entries()) {
    for (const [sub, arr] of subMap.entries()) {
      arr.sort((a, b) => {
        const ac = a.finalCost ?? Infinity;
        const bc = b.finalCost ?? Infinity;
        if (ac !== bc) return ac - bc;
        return a.name.localeCompare(b.name);
      });
    }
  }

  return index;
}

/**
 * Convenience loader:
 * Build without using cache.
 */
export async function rebuildStoreIndex() {
  return buildStoreIndex({ useCache: false });
}
