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
 * @param {Object} item - Item object or Document
 * @returns {Object} Item with finalCost property
 */
export function addFinalCost(item) {
    const baseCost = Number(item.system?.cost) || 0;
    // Convert Foundry Document to plain object if necessary
    const plainItem = item.toObject ? item.toObject() : item;

    // Ensure ID is properly preserved (check both id and _id)
    const itemId = item.id || item._id || plainItem.id || plainItem._id;

    return {
        ...plainItem,
        id: itemId,  // Preserve ID for item selection
        _id: itemId, // Preserve both ID formats
        finalCost: calculateFinalCost(baseCost)
    };
}

/**
 * Add calculated final cost to an actor (droid/vehicle) with used option
 * @param {Object} actor - Actor object or Document
 * @param {boolean} includeUsed - Whether to calculate used price (50% of base)
 * @returns {Object} Actor with finalCost property (and finalCostUsed if includeUsed)
 */
export function addActorFinalCost(actor, includeUsed = false) {
    const baseCost = Number(actor.system?.cost) || 0;
    // Convert Foundry Document to plain object if necessary
    const plainActor = actor.toObject ? actor.toObject() : actor;

    // Ensure ID is properly preserved (check both id and _id)
    const actorId = actor.id || actor._id || plainActor.id || plainActor._id;

    const result = {
        ...plainActor,
        id: actorId,  // Preserve ID for actor selection
        _id: actorId, // Preserve both ID formats
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
