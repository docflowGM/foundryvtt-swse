/**
 * pricing.js
 * -----------
 * Centralized pricing engine for SWSE Store 2.0.
 *
 * Applies:
 *  - GM markup
 *  - GM discount
 *  - minimum cost sanity rules
 *  - used-price logic for vehicles
 */

/* -------------------------------------------------------------- */
/* SETTINGS HELPERS (from Foundry settings)                       */
/* -------------------------------------------------------------- */

function getMarkupPercent() {
  return Number(game.settings.get('foundryvtt-swse', 'storeMarkup') ?? 0);
}

function getDiscountPercent() {
  return Number(game.settings.get('foundryvtt-swse', 'storeDiscount') ?? 0);
}

/* -------------------------------------------------------------- */
/* PRICE CALCULATION                                              */
/* -------------------------------------------------------------- */

/**
 * Calculate a final cost given a base cost.
 * Applies markup and discount.
 */
export function calculateFinalCost(base) {
  if (!base || isNaN(base) || base < 0) {return null;}

  const markup = getMarkupPercent();     // +%
  const discount = getDiscountPercent(); // -%

  let result = base;

  // (1 + markup%) → multiply
  result *= 1 + markup / 100;

  // (1 - discount%) → multiply
  result *= 1 - discount / 100;

  // Round to nearest whole credit
  result = Math.round(result);

  // Never allow negative or nonsense values
  return Math.max(result, 0);
}

/**
 * Calculate used vehicle cost (usually 50%).
 */
export function calculateUsedCost(base) {
  const used = base * 0.5;
  return calculateFinalCost(used);
}

/* -------------------------------------------------------------- */
/* ITEM ENRICHMENT                                                */
/* -------------------------------------------------------------- */

/**
 * Apply pricing to a normalized StoreItem.
 * Mutates the object to set:
 *   item.finalCost
 *   item.finalCostUsed (vehicles)
 *
 * @param {StoreItem} item
 * @returns {StoreItem}
 */
export function applyPricing(item) {
  const base = item.cost;

  if (base !== null && base !== undefined) {
    item.finalCost = calculateFinalCost(base);
  } else {
    item.finalCost = null;
  }

  // Vehicles get both new + used prices
  if (item.type === 'vehicle' && base != null) {
    item.finalCostUsed = calculateUsedCost(base);
  }

  return item;
}

/**
 * Apply pricing to an entire list.
 */
export function applyPricingAll(items) {
  return items.map(i => applyPricing(i));
}
