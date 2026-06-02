/**
 * normalizer.js
 * --------------
 * Convert raw Foundry items & actors into clean, normalized StoreItem objects.
 * These normalized objects are the ONLY form the store UI should ever consume.
 */

import { buildStoreCostRecord } from '/systems/foundryvtt-swse/scripts/engine/store/cost-registry.js';

const STORE_FLAG_SCOPE = 'foundryvtt-swse';

function slugifyStoreIdentity(value, fallback = 'unknown') {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function readFlag(obj, scope, key) {
  return obj?.flags?.[scope]?.[key] ?? obj?.flags?.swse?.[key] ?? null;
}

function sourceIdToPack(sourceId) {
  const text = String(sourceId || '');
  const match = text.match(/^Compendium\.([^\s.]+\.[^\s.]+)\./);
  return match?.[1] || null;
}

function sourceIdToDocId(sourceId) {
  const text = String(sourceId || '');
  const match = text.match(/^Compendium\.[^\s.]+\.[^\s.]+\.([^\s.]+)$/);
  return match?.[1] || null;
}

function buildStoreIdentity(obj, prefix = 'item') {
  const sys = obj?.system || {};
  const rawId = obj?._id || obj?.id || obj?.__storeSource?.documentId || null;
  const coreSourceId = readFlag(obj, 'core', 'sourceId');
  const storeSource = obj?.__storeSource || readFlag(obj, STORE_FLAG_SCOPE, 'storeSource') || {};
  const pack = storeSource.pack
    || storeSource.collection
    || obj?.pack
    || sourceIdToPack(coreSourceId)
    || null;
  const docId = rawId || sourceIdToDocId(coreSourceId) || slugifyStoreIdentity(obj?.name || sys.name || prefix);
  const typePart = slugifyStoreIdentity(prefix || obj?.type || sys.type || 'item', 'item');
  const namePart = slugifyStoreIdentity(obj?.name || sys.name || docId, 'unnamed');
  const sourcePart = pack ? String(pack).trim() : 'world';
  const docPart = rawId ? String(rawId).trim() : slugifyStoreIdentity(docId || namePart, namePart);
  const canonicalId = pack
    ? `${sourcePart}.${docPart}`
    : `world.${typePart}.${docPart}`;
  const uuid = storeSource.uuid
    || obj?.uuid
    || (pack && rawId ? `Compendium.${pack}.${rawId}` : null);

  return {
    id: canonicalId,
    canonicalId,
    rawId,
    sourcePack: pack || 'world',
    sourceUuid: uuid,
    sourceId: coreSourceId || uuid || null,
    sourceKey: `${sourcePart}:${slugifyStoreIdentity(docId || namePart, namePart)}`
  };
}

export function getStoreItemLookupIds(item = {}) {
  return [...new Set([
    item.id,
    item.canonicalId,
    item.rawId,
    item.sourceId,
    item.sourceUuid,
    item.sourceKey
  ]
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .map(value => String(value)))];
}

/* ----------------------------------------------- */
/* RARITY CLASSIFICATION (ENGINE)                   */
/* ----------------------------------------------- */

function getRarityClass(availability) {
  if (!availability) return null;
  const avail = String(availability).toLowerCase();
  if (avail.includes('illegal')) return 'illegal';
  if (avail.includes('military')) return 'military';
  if (avail.includes('restricted')) return 'restricted';
  if (avail.includes('licensed')) return 'licensed';
  if (avail.includes('rare')) return 'rare';
  return 'standard';
}

function getRarityLabel(rarityClass) {
  const labels = {
    illegal: 'Illegal',
    military: 'Military',
    restricted: 'Restricted',
    licensed: 'Licensed',
    rare: 'Rare',
    standard: 'Standard'
  };
  return labels[rarityClass] || 'Unknown';
}

/* ----------------------------------------------- */
/* ID HELPERS                                       */
/* ----------------------------------------------- */

function ensureId(obj, prefix = 'item') {
  return buildStoreIdentity(obj, prefix).id;
}

/* ----------------------------------------------- */
/* IMAGE & STRING HELPERS                           */
/* ----------------------------------------------- */

function safeImg(obj) {
  const img = obj.img || obj.system?.img || null;
  if (!img || typeof img !== 'string' || img.trim() === '') {
    return 'icons/svg/mystery-man.svg';
  }
  return img;
}

function safeString(v, fallback = '') {
  if (v === undefined || v === null) {return fallback;}
  return String(v).trim();
}

/* ----------------------------------------------- */
/* COST NORMALIZATION VIA REGISTRY                 */
/* ----------------------------------------------- */

function extractCostRecord(obj) {
  // Use the authoritative cost registry/resolver
  const costRecord = buildStoreCostRecord(obj);
  return costRecord;
}

/* ----------------------------------------------- */
/* TYPE NORMALIZATION                               */
/* ----------------------------------------------- */

function normalizeType(obj) {
  const type = safeString(obj.type || obj.system?.type || '').toLowerCase();

  // Canonical item types for store indexing
  if (['weapon', 'armor', 'equipment', 'tech', 'tool'].includes(type)) {return type;}
  if (type === 'droid') {return 'droid';}
  if (type === 'vehicle') {return 'vehicle';}

  // Actors representing droids/vehicles
  if (obj.system?.isDroid) {return 'droid';}
  if (obj.system?.isVehicle) {return 'vehicle';}

  // Default bucket
  return 'equipment';
}

/* ----------------------------------------------- */
/* AVAILABILITY / RARITY                            */
/* ----------------------------------------------- */

function extractAvailability(obj) {
  const sys = obj.system || {};
  const v =
    safeString(sys.availability) ||
    safeString(sys.avail) ||
    safeString(sys.sourcebook?.availability) ||
    '';
  return v.toLowerCase();
}

function extractRarity(obj) {
  const availability = extractAvailability(obj);
  const rarityClass = getRarityClass(availability);
  return {
    rarityClass,
    rarityLabel: rarityClass ? getRarityLabel(rarityClass) : null
  };
}

/* ----------------------------------------------- */
/* MAIN NORMALIZER                                  */
/* ----------------------------------------------- */

/**
 * Convert raw document → normalized store object.
 *
 * @param {Object} raw - Foundry Item or Actor (as document or plain object)
 * @returns {StoreItem}
 */
export function normalizeStoreItem(raw) {
  const sys = raw.system || {};

  const identity = buildStoreIdentity(raw, raw.type || 'item');
  const id = identity.id || ensureId(raw, raw.type || 'item');
  const name = safeString(raw.name || sys.name || 'Unnamed Item');
  const img = safeImg(raw);
  const type = normalizeType(raw);

  // Extract full cost record with registry
  const costRecord = extractCostRecord(raw);

  const { rarityClass, rarityLabel } = extractRarity(raw);

  return {
    id,
    canonicalId: identity.canonicalId,
    rawId: identity.rawId,
    sourcePack: identity.sourcePack,
    sourceUuid: identity.sourceUuid,
    sourceId: identity.sourceId,
    sourceKey: identity.sourceKey,
    name,
    img,
    type,          // weapon, armor, equipment, droid, vehicle
    category: null, // filled in by categorizer.js
    availability: extractAvailability(raw),
    rarityClass,
    rarityLabel,

    // cost fields - preserve all pricing modes
    costStatus: costRecord.costStatus,              // priced | conditional | unavailable | missing
    pricingMode: costRecord.pricingMode,            // single | new-used | none
    cost: costRecord.baseCost,                      // scalar base cost (if priced)
    costNew: costRecord.baseCostNew,                // new condition cost (if conditional)
    costUsed: costRecord.baseCostUsed,              // used condition cost (if conditional)
    requiresCondition: costRecord.requiresCondition, // true if new/used selection required
    defaultCondition: costRecord.defaultCondition,  // null (let UI decide)
    unavailabilityReason: costRecord.unavailabilityReason, // reason if unavailable
    rawCostSource: costRecord.rawCostSource,        // source field for debugging

    // Final costs (filled in by pricing.js)
    finalCost: null,      // scalar final cost after markup
    finalCostNew: null,   // new final cost after markup (vehicles)
    finalCostUsed: null,  // used final cost after markup (vehicles)
    usedCondition: null,  // which condition was used ('new' | 'used' | null)

    // direct access to system data
    system: sys,

    // reference to original doc (optional for debugging)
    doc: raw
  };
}

/**
 * Normalize an array of raw items into store items.
 *
 * @param {Array} rawItems - Array of raw Foundry items
 * @returns {Array<StoreItem>}
 */
export function normalizeItems(rawItems) {
  return (rawItems || []).map(normalizeStoreItem);
}

/**
 * Normalize an array of raw actors into store actors.
 * Treats droids and vehicles as actor types.
 *
 * @param {Array} rawActors - Array of raw Foundry actors
 * @returns {Array<StoreItem>}
 */
export function normalizeActors(rawActors) {
  return (rawActors || []).map(normalizeStoreItem);
}

/**
 * Filter and validate normalized items.
 * Removes items that shouldn't appear in the store.
 *
 * CONSTRAINT: Services are NOT store inventory entities.
 * They are contextual expenses managed separately.
 * This filter enforces that store items are tangible goods.
 *
 * @param {Array<StoreItem>} items
 * @returns {Array<StoreItem>}
 */
/**
 * Return a compact validation issue for a normalized store item.
 * Null means the item can proceed into categorization/pricing.
 */
export function getStoreItemValidationIssue(item = {}) {
  if (!item.name || String(item.name).trim() === '') {
    return { reason: 'missing_name', level: 'warn' };
  }

  if (!item.type) {
    return { reason: 'missing_type', level: 'warn' };
  }

  if (item.doc?.flags?.swse?.excludeFromStore || item.doc?.flags?.[STORE_FLAG_SCOPE]?.excludeFromStore) {
    return { reason: 'excluded_by_flag', level: 'debug' };
  }

  if (item.type === 'service') {
    return { reason: 'service_not_inventory', level: 'debug' };
  }

  if (item.costStatus === 'unavailable') {
    return { reason: item.unavailabilityReason || 'unavailable', level: 'debug' };
  }

  if (item.costStatus === 'missing') {
    return { reason: 'missing_cost', level: 'warn' };
  }

  const isPriced = item.costStatus === 'priced' || item.costStatus === 'conditional';
  if (!isPriced) {
    return { reason: 'invalid_cost_status', level: 'warn' };
  }

  return null;
}

function compactItemExample(item = {}, issue = {}) {
  return {
    name: item.name || 'Unnamed Item',
    id: item.id || item.rawId || item._id || null,
    rawId: item.rawId || null,
    sourcePack: item.sourcePack || 'world',
    type: item.type || null,
    reason: issue.reason || 'unknown'
  };
}

export function summarizeStoreValidation(items = []) {
  const summary = {
    total: Array.isArray(items) ? items.length : 0,
    valid: 0,
    invalid: 0,
    byReason: {},
    examples: []
  };

  for (const item of items || []) {
    const issue = getStoreItemValidationIssue(item);
    if (!issue) {
      summary.valid += 1;
      continue;
    }
    summary.invalid += 1;
    summary.byReason[issue.reason] = (summary.byReason[issue.reason] || 0) + 1;
    if (summary.examples.length < 12 && issue.level !== 'debug') {
      summary.examples.push(compactItemExample(item, issue));
    }
  }

  return summary;
}

function logValidationSummary(summary, logger = globalThis.swseLogger || console) {
  if (!summary?.invalid) return;
  const warnReasons = Object.entries(summary.byReason || {})
    .filter(([reason]) => !['excluded_by_flag', 'service_not_inventory', 'notPubliclyAvailable'].includes(reason));
  const payload = {
    total: summary.total,
    valid: summary.valid,
    invalid: summary.invalid,
    byReason: summary.byReason,
    examples: summary.examples
  };

  if (warnReasons.length > 0) {
    logger.warn?.('[Store] Excluded invalid catalog entries', payload);
  } else {
    logger.debug?.('[Store] Excluded non-purchasable catalog entries', payload);
  }
}

/**
 * Filter and validate normalized items.
 * Logging is summarized once instead of emitted per item.
 *
 * @param {Array} items - items to validate
 * @param {Object} options
 * @param {Boolean} options.logSummary - whether to emit a compact aggregate log
 * @returns {Array} valid items
 */
export function filterValidStoreItems(items, options = {}) {
  const { logSummary = false } = options || {};
  const list = Array.isArray(items) ? items : [];
  const filtered = list.filter(item => !getStoreItemValidationIssue(item));
  if (logSummary) {
    logValidationSummary(summarizeStoreValidation(list));
  }
  return filtered;
}
