/**
 * normalizer.js
 * --------------
 * Convert raw Foundry items & actors into clean, normalized StoreItem objects.
 * These normalized objects are the ONLY form the store UI should ever consume.
 */

import { buildStoreCostRecord } from '/systems/foundryvtt-swse/scripts/engine/store/cost-registry.js';

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
  const id = obj._id || obj.id;
  if (id) {return id;}

  // STRICT: No fallback ID generation
  // Missing IDs indicate compendium data quality issues
  // Engine should fail loudly so GM fixes the source
  const logger = globalThis.swseLogger || console;
  logger.error(`[StoreEngine] Item has no canonical ID. Fix compendium data:`, {
    name: obj.name || 'Unknown',
    type: obj.type || 'unknown',
    source: obj.pack || 'world'
  });

  throw new Error(`SSOT Violation: Item "${obj.name || 'Unknown'}" (${obj.type || 'unknown'}) has no ID. Compendium data must have canonical id or _id field.`);
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

  const id = ensureId(raw, raw.type || 'item');
  const name = safeString(raw.name || sys.name || 'Unnamed Item');
  const img = safeImg(raw);
  const type = normalizeType(raw);

  // Extract full cost record with registry
  const costRecord = extractCostRecord(raw);

  const { rarityClass, rarityLabel } = extractRarity(raw);

  return {
    id,
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
 * P1-1: Enhanced filtering with detailed logging for excluded items
 * @param {Array} items - items to validate
 * @returns {Array} valid items
 */
export function filterValidStoreItems(items) {
  const logger = globalThis.swseLogger || console;

  return items.filter(item => {
    // Must have a name
    if (!item.name || item.name.trim() === '') {
      logger.warn(`[Store] Excluded item: no name`, {
        id: item.id || item._id,
        type: item.type
      });
      return false;
    }

    // Must have a valid type
    if (!item.type) {
      logger.warn(`[Store] Excluded item: no type`, {
        name: item.name,
        id: item.id || item._id
      });
      return false;
    }

    // Skip items explicitly excluded from store
    if (item.doc?.flags?.swse?.excludeFromStore) {
      logger.debug(`[Store] Excluded item: marked excludeFromStore`, {
        name: item.name,
        id: item.id || item._id
      });
      return false;
    }

    // Services are not store inventory items
    // They are contextual expenses, not purchasable goods
    if (item.type === 'service') {
      logger.debug(`[Store] Excluded item: type=service`, {
        name: item.name,
        id: item.id || item._id
      });
      return false;
    }

    // Exclude unavailable entries (explicit "not publicly available")
    if (item.costStatus === 'unavailable') {
      logger.debug(`[Store] Excluded item: unavailable`, {
        name: item.name,
        id: item.id || item._id,
        reason: item.unavailabilityReason
      });
      return false;
    }

    // Exclude missing pricing (no usable cost information)
    if (item.costStatus === 'missing') {
      logger.warn(`[Store] Excluded item: missing pricing`, {
        name: item.name,
        id: item.id || item._id,
        type: item.type
      });
      return false;
    }

    // Item must have valid pricing
    const isPriced = item.costStatus === 'priced' || item.costStatus === 'conditional';
    if (!isPriced) {
      logger.warn(`[Store] Excluded item: invalid pricing status`, {
        name: item.name,
        id: item.id || item._id,
        costStatus: item.costStatus,
        type: item.type
      });
      return false;
    }

    return true;
  });
}
