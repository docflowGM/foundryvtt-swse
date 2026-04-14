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

import { loadRawStoreData } from "/systems/foundryvtt-swse/scripts/engine/store/loader.js";
import { normalizeStoreItem, filterValidStoreItems } from "/systems/foundryvtt-swse/scripts/engine/store/normalizer.js";
import { categorizeItem } from "/systems/foundryvtt-swse/scripts/engine/store/categorizer.js";
import { applyPricing } from "/systems/foundryvtt-swse/scripts/engine/store/pricing.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
  /* 2B. Filter invalid items (P0-4)        */
  /* -------------------------------------- */
  const filtered = normalized.filter(item => {
    const isValid = filterValidStoreItems([item]).length > 0;
    if (!isValid) {
      SWSELogger.warn(`[Store] Excluding invalid item: ${item.name} (${item.id})`, {
        reason: item.cost == null ? 'missing_cost' : 'unknown'
      });
    }
    return isValid;
  });

  /* -------------------------------------- */
  /* 3. Categorize + apply pricing           */
  /* -------------------------------------- */
  const processed = filtered
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
    const cat = item.category || 'Other';
    const sub = item.subcategory || 'Misc';

    const subMap = ensureCategoryStructure(index, cat, sub);
    subMap.get(sub).push(item);
  }

  /* -------------------------------------- */
  /* 5. Sort each subgroup                   */
  /* -------------------------------------- */

  for (const [, subMap] of index.byCategory.entries()) {
    for (const [sub, arr] of subMap.entries()) {
      arr.sort((a, b) => {
        // For sorting, use the primary cost (scalar or new condition for vehicles)
        const getComparablePrice = (item) => {
          if (item.finalCost !== null) return item.finalCost;
          if (item.finalCostNew !== null) return item.finalCostNew; // Conditional: use new price
          return Infinity; // Missing pricing goes to end
        };

        const ac = getComparablePrice(a);
        const bc = getComparablePrice(b);
        if (ac !== bc) {return ac - bc;}
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
