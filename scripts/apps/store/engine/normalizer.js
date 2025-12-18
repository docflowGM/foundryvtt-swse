/**
 * normalizer.js
 * --------------
 * Convert raw Foundry items & actors into clean, normalized StoreItem objects.
 * These normalized objects are the ONLY form the store UI should ever consume.
 */

import { getRarityClass, getRarityLabel } from "../store-shared.js";

/* ----------------------------------------------- */
/* ID HELPERS                                       */
/* ----------------------------------------------- */

function ensureId(obj, prefix = "item") {
  const id = obj._id || obj.id;
  if (id) return id;

  // Fallback ID — stable and readable
  const generated = `${prefix}-${(obj.name || "unnamed")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 9)}`;

  return generated;
}

/* ----------------------------------------------- */
/* IMAGE & STRING HELPERS                           */
/* ----------------------------------------------- */

function safeImg(obj) {
  const img = obj.img || obj.system?.img || null;
  if (!img || typeof img !== "string" || img.trim() === "") {
    return "icons/svg/mystery-man.svg";
  }
  return img;
}

function safeString(v, fallback = "") {
  if (v === undefined || v === null) return fallback;
  return String(v).trim();
}

/* ----------------------------------------------- */
/* COST NORMALIZATION                               */
/* ----------------------------------------------- */

function normalizeNumber(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;

  const s = String(val).trim().toLowerCase();
  if (!s) return null;

  // Skip placeholders like "varies", "special", etc.
  const bad = ["varies", "see", "negotiat", "included", "n/a", "na", "unknown", "special"];
  if (bad.some(term => s.includes(term))) return null;

  // Strip currency symbols & text
  let cleaned = s
    .replace(/[,¢$€£₹]/g, "")
    .replace(/\s*cr\b/i, "")
    .replace(/\(.+?\)/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "—") return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBaseCost(obj) {
  const sys = obj.system || {};
  return (
    normalizeNumber(sys.cost) ??
    normalizeNumber(sys.price) ??
    null
  );
}

/* ----------------------------------------------- */
/* TYPE NORMALIZATION                               */
/* ----------------------------------------------- */

function normalizeType(obj) {
  const type = safeString(obj.type || obj.system?.type || "").toLowerCase();

  // Canonical item types for store indexing
  if (["weapon", "armor", "equipment", "tech", "tool"].includes(type)) return type;
  if (type === "droid") return "droid";
  if (type === "vehicle") return "vehicle";

  // Actors representing droids/vehicles
  if (obj.system?.isDroid) return "droid";
  if (obj.system?.isVehicle) return "vehicle";

  // Default bucket
  return "equipment";
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
    "";
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

  const id = ensureId(raw, raw.type || "item");
  const name = safeString(raw.name || sys.name || "Unnamed Item");
  const img = safeImg(raw);
  const type = normalizeType(raw);
  const baseCost = extractBaseCost(raw);

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

    // cost fields
    cost: baseCost,
    finalCost: null,      // pricing.js will fill this in
    finalCostUsed: null,  // for vehicles

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
 * @param {Array<StoreItem>} items
 * @returns {Array<StoreItem>}
 */
export function filterValidStoreItems(items) {
  return items.filter(item => {
    // Must have a name
    if (!item.name || item.name.trim() === "") return false;

    // Must have a valid type
    if (!item.type) return false;

    // Skip items explicitly excluded from store
    if (item.doc?.flags?.swse?.excludeFromStore) return false;

    // Must have either a cost or be a service item
    const hasCost = item.cost !== null && item.cost !== undefined && item.cost >= 0;
    if (!hasCost && item.type !== "service") return false;

    return true;
  });
}
