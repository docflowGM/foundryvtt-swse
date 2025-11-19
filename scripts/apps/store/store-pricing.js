/**
 * Pricing calculations for SWSE Store
 * Handles price calculations, discounts, and markups
 */

/**
 * Calculate final cost with markup/discount
 * @param {number} baseCost - Base cost of item
 * @returns {number} Final cost after markup and discount
 */
export function calculateFinalCost(baseCost) {
    const markup = Number(game.settings.get("swse", "storeMarkup")) || 0;
    const discount = Number(game.settings.get("swse", "storeDiscount")) || 0;
    return Math.round(baseCost * (1 + markup / 100) * (1 - discount / 100));
}

/**
 * Add calculated final cost to an item
 * @param {Object} item - Item object
 * @returns {Object} Item with finalCost property
 */
export function addFinalCost(item) {
    const baseCost = Number(item.system?.cost) || 0;
    return {
        ...item,
        id: item.id || item._id,  // Preserve ID for item selection
        _id: item._id || item.id, // Preserve both ID formats
        finalCost: calculateFinalCost(baseCost)
    };
}

/**
 * Add calculated final cost to an actor (droid/vehicle) with used option
 * @param {Object} actor - Actor object
 * @param {boolean} includeUsed - Whether to calculate used price (50% of base)
 * @returns {Object} Actor with finalCost property (and finalCostUsed if includeUsed)
 */
export function addActorFinalCost(actor, includeUsed = false) {
    const baseCost = Number(actor.system?.cost) || 0;
    const result = {
        ...actor,
        finalCost: calculateFinalCost(baseCost)
    };

    if (includeUsed) {
        result.finalCostUsed = calculateFinalCost(baseCost * 0.5);
    }

    return result;
}

/**
 * Get current store markup percentage
 * @returns {number} Markup percentage
 */
export function getStoreMarkup() {
    return Number(game.settings.get("swse", "storeMarkup")) || 0;
}

/**
 * Get current store discount percentage
 * @returns {number} Discount percentage
 */
export function getStoreDiscount() {
    return Number(game.settings.get("swse", "storeDiscount")) || 0;
}
