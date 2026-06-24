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
import { normalizeStoreItem, filterValidStoreItems, summarizeStoreValidation, getStoreItemLookupIds } from "/systems/foundryvtt-swse/scripts/engine/store/normalizer.js";
import { categorizeItem } from "/systems/foundryvtt-swse/scripts/engine/store/categorizer.js";
import { applyPricing } from "/systems/foundryvtt-swse/scripts/engine/store/pricing.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";


/* ----------------------------------------------------------- */
/* DEDUPE HELPERS                                              */
/* ----------------------------------------------------------- */

function normalizeListingToken(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getComparableStoreCost(item = {}) {
  const candidates = [
    item.finalCost,
    item.finalCostNew,
    item.cost,
    item.costNew,
    item.finalCostUsed,
    item.costUsed
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return 0;
}

function buildStoreListingDedupeKey(item = {}) {
  const sys = item.system || {};
  const damage = sys.damage || sys.damageFormula || sys.baseDamage || '';
  const damageType = sys.damageType || sys.damageTypes || '';
  const availability = item.availability || sys.availability || '';
  return [
    normalizeListingToken(item.type || 'item'),
    normalizeListingToken(item.category || ''),
    normalizeListingToken(item.subcategory || ''),
    normalizeListingToken(item.name || ''),
    normalizeListingToken(availability),
    normalizeListingToken(damage),
    normalizeListingToken(Array.isArray(damageType) ? damageType.join(' ') : damageType),
    String(getComparableStoreCost(item))
  ].join('::');
}

function getStoreSourcePriority(item = {}) {
  const pack = String(item.sourcePack || item.doc?.__storeSource?.pack || '').toLowerCase();
  if (!pack || pack === 'world') return 30;
  // Split subtype packs are the intended store-facing inventory.  Aggregate
  // master packs are fallback/reference packs and should lose duplicate races.
  if ([
    'foundryvtt-swse.weapons',
    'foundryvtt-swse.armor',
    'foundryvtt-swse.equipment',
    'foundryvtt-swse.vehicles',
    'foundryvtt-swse.droids'
  ].includes(pack)) return 20;
  return 10;
}

function getDroidStatblockQuality(item = {}) {
  if ((item.type || item.doc?.type) !== 'droid') return 0;
  const system = item.system || item.doc?.system || {};
  const id = String(item.rawId || item.id || item.doc?._id || item.doc?.id || '');
  let score = 0;

  const hpMax = Number(system.hp?.max ?? system.hp?.value ?? 0) || 0;
  const reflexTotal = Number(system.defenses?.reflex?.total ?? system.reflexDefense ?? 0) || 0;
  const fortitudeTotal = Number(system.defenses?.fortitude?.total ?? system.fortitudeDefense ?? 0) || 0;
  const willTotal = Number(system.defenses?.will?.total ?? system.willDefense ?? 0) || 0;

  if (Number(system.HP) > 0 || hpMax > 10) score += 24;
  if (system.baseStats?.abilities) score += 24;
  if (system.reflexDefense !== undefined || reflexTotal > 10) score += 18;
  if (system.fortitudeDefense !== undefined || fortitudeTotal > 10) score += 10;
  if (system.willDefense !== undefined || willTotal > 10) score += 10;
  if (Array.isArray(system.attacks) || system.attacks?.melee?.length || system.attacks?.ranged?.length) score += 12;
  if (system.skills && Object.keys(system.skills).length) score += 8;
  if (system.droidSystems || system.droidSystemText || item.doc?.flags?.swse?.droidSystemText) score += 8;
  if (Number(system.costNumeric ?? system.cost ?? item.cost ?? 0) > 0) score += 2;

  const abilities = system.abilities || system.attributes || {};
  const stockDefaultAbilityKeys = ['str', 'dex', 'int', 'wis', 'cha'];
  const hasDefaultScores = stockDefaultAbilityKeys.every(key => {
    const block = abilities?.[key] || {};
    const value = Number(block.total ?? block.base ?? block.value ?? 10);
    return value === 10;
  });
  const hasDefaultDefenses = (!reflexTotal || reflexTotal === 10) && (!fortitudeTotal || fortitudeTotal === 10) && (!willTotal || willTotal === 10);
  if (hasDefaultScores && (hpMax === 10 || Number(system.HP ?? 0) === 10) && hasDefaultDefenses) score -= 30;
  if (id.startsWith('npc-')) score -= 40;
  return score;
}

function choosePreferredStoreListing(current, candidate) {
  if (!current) return candidate;

  if ((current.type === 'droid' || candidate.type === 'droid')
    && normalizeListingToken(current.name) === normalizeListingToken(candidate.name)) {
    const currentQuality = getDroidStatblockQuality(current);
    const candidateQuality = getDroidStatblockQuality(candidate);
    if (candidateQuality > currentQuality) return candidate;
    if (candidateQuality < currentQuality) return current;
  }

  const currentPriority = getStoreSourcePriority(current);
  const candidatePriority = getStoreSourcePriority(candidate);
  if (candidatePriority < currentPriority) return candidate;
  if (candidatePriority > currentPriority) return current;

  // If both are from the same kind of source, keep the one with richer system
  // data so the detail rail has the best available readout. Droid duplicate
  // races are handled above because schema-default actor husks can have many
  // fields while carrying no useful published statblock values.
  const currentFields = Object.keys(current.system || {}).length;
  const candidateFields = Object.keys(candidate.system || {}).length;
  if (candidateFields > currentFields) return candidate;
  return current;
}

function dedupeStoreListings(items = []) {
  const deduped = new Map();
  for (const item of items) {
    const key = buildStoreListingDedupeKey(item);
    deduped.set(key, choosePreferredStoreListing(deduped.get(key), item));
  }
  return Array.from(deduped.values());
}

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

function shouldLogStoreValidationSummary(validationSummary, level = 'warn') {
  const key = JSON.stringify({
    level,
    total: validationSummary?.total ?? 0,
    valid: validationSummary?.valid ?? 0,
    invalid: validationSummary?.invalid ?? 0,
    byReason: validationSummary?.byReason || {}
  });
  const cacheKey = '__swseStoreValidationSummaryLogKeys';
  const root = globalThis;
  root[cacheKey] ||= new Set();
  if (root[cacheKey].has(key)) return false;
  root[cacheKey].add(key);
  return true;
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
  const validationSummary = summarizeStoreValidation(normalized);
  if (validationSummary.invalid > 0) {
    const hasWarnableIssues = Object.keys(validationSummary.byReason || {})
      .some(reason => !['excluded_by_flag', 'service_not_inventory', 'notPubliclyAvailable'].includes(reason));
    const payload = {
      total: validationSummary.total,
      valid: validationSummary.valid,
      invalid: validationSummary.invalid,
      byReason: validationSummary.byReason,
      examples: validationSummary.examples
    };
    if (hasWarnableIssues) {
      if (shouldLogStoreValidationSummary(validationSummary, 'warn')) {
        SWSELogger.warn('[Store] Excluding invalid catalog entries', payload);
      }
    } else if (shouldLogStoreValidationSummary(validationSummary, 'debug')) {
      SWSELogger.debug('[Store] Excluding non-purchasable catalog entries', payload);
    }
  }

  const filtered = filterValidStoreItems(normalized);

  /* -------------------------------------- */
  /* 3. Categorize + apply pricing           */
  /* -------------------------------------- */
  const processed = dedupeStoreListings(filtered
    .map(i => categorizeItem(i))
    .map(i => applyPricing(i)));

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
    // ID lookup. The canonical ID is primary, but raw/UUID aliases are
    // retained so older cart entries and UI handlers can still resolve.
    for (const lookupId of getStoreItemLookupIds(item)) {
      index.byId.set(lookupId, item);
    }

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
