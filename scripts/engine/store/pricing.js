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

/* -------------------------------------------------------------- */
/* P2-2: PRICING FREEZE (During Transaction)                     */
/* -------------------------------------------------------------- */

let _pricingFrozen = false;
let _frozenMarkup = null;
let _frozenDiscount = null;

/**
 * Freeze current pricing percentages during transaction
 * Prevents mid-purchase price changes from settings
 */
export function freezePricing() {
  if (_pricingFrozen) {
    return; // Already frozen
  }
  _pricingFrozen = true;
  _frozenMarkup = getMarkupPercent();
  _frozenDiscount = getDiscountPercent();
}

/**
 * Unfreeze pricing after transaction completes
 */
export function unfreezePricing() {
  _pricingFrozen = false;
  _frozenMarkup = null;
  _frozenDiscount = null;
}

/**
 * Check if pricing is currently frozen
 */
export function isPricingFrozen() {
  return _pricingFrozen;
}

/**
 * Internal: Get markup respecting frozen state
 */
function getMarkupPercent() {
  if (_pricingFrozen && _frozenMarkup !== null) {
    return _frozenMarkup;
  }
  return Number(game.settings.get('foundryvtt-swse', 'storeMarkup') ?? 0);
}

/**
 * Internal: Get discount respecting frozen state
 */
function getDiscountPercent() {
  if (_pricingFrozen && _frozenDiscount !== null) {
    return _frozenDiscount;
  }
  return Number(game.settings.get('foundryvtt-swse', 'storeDiscount') ?? 0);
}
