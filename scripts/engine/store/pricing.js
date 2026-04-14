/**
 * pricing.js
 * -----------
 * Centralized pricing engine for SWSE Store 2.0.
 *
 * Applies:
 *  - GM markup
 *  - GM discount
 *  - minimum cost sanity rules
 *  - structured new/used vehicle pricing (when available)
 *
 * Policy:
 *  - Scalar items: apply markup to baseCost
 *  - Conditional items (new/used): apply markup to both new and used separately
 *  - Unavailable/missing: no final cost
 */

import { resolveStoreCost } from '/systems/foundryvtt-swse/scripts/engine/store/cost-registry.js';

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

/* -------------------------------------------------------------- */
/* ITEM ENRICHMENT                                                */
/* -------------------------------------------------------------- */

/**
 * Apply pricing to a normalized StoreItem.
 * Mutates the object to set:
 *   item.finalCost (scalar items or selected condition)
 *   item.finalCostNew (conditional items)
 *   item.finalCostUsed (conditional items)
 *
 * @param {StoreItem} item
 * @returns {StoreItem}
 */
export function applyPricing(item) {
  // Build a cost record for resolver (simplified version)
  const costRecord = {
    costStatus: item.costStatus,
    pricingMode: item.pricingMode,
    baseCost: item.cost,
    baseCostNew: item.costNew,
    baseCostUsed: item.costUsed
  };

  // Resolve costs using registry resolver
  const markup = getMarkupPercent();
  const resolved = resolveStoreCost(costRecord, { markup });

  // Assign final costs
  item.finalCost = resolved.cost;
  item.finalCostNew = resolved.costNew;
  item.finalCostUsed = resolved.costUsed;
  item.usedCondition = resolved.usedCondition;

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
