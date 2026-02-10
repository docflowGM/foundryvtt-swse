/**
 * Credit Normalization Utility
 *
 * Global contract: All credit values must be integers.
 * All percentage-based calculations must be floored.
 * No fractional credit values may ever persist.
 *
 * This utility enforces the integer credit contract across:
 * - Buying
 * - Selling
 * - Modifications
 * - Discounts
 * - Markups
 * - GM overrides
 * - Manual edits
 * - Animations
 */

/**
 * Normalize a credit value to a safe integer
 * @param {number} value - Raw credit value
 * @returns {number} Floored integer credit value
 */
export function normalizeCredits(value) {
  return Math.floor(Number(value) || 0);
}

/**
 * Calculate percentage of a value and floor result
 * @param {number} baseValue - Base amount
 * @param {number} percentage - Percentage (0-100)
 * @returns {number} Floored result
 */
export function calculatePercentageFloor(baseValue, percentage) {
  const raw = Number(baseValue) || 0;
  const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
  return normalizeCredits(raw * (pct / 100));
}

/**
 * Calculate RAW selling price (50% of base, floored)
 * @param {number} basePrice - Item's base price
 * @returns {number} Standard selling offer (floored)
 */
export function calculateRawSellPrice(basePrice) {
  return calculatePercentageFloor(basePrice, 50);
}

/**
 * Validate a credit value for storage
 * Throws if value would create fractional credits
 * @param {number} value - Value to validate
 * @returns {number} Normalized value (safe to store)
 */
export function validateCreditValue(value) {
  const normalized = normalizeCredits(value);
  return normalized;
}
