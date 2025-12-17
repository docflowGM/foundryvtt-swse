/**
 * Constants for SWSE Store
 * Centralized configuration to avoid hardcoded values
 */

/**
 * Compendium pack names used by the store
 */
export const STORE_PACKS = {
    WEAPONS: 'foundryvtt-foundryvtt-swse.weapons',
    ARMOR: 'foundryvtt-foundryvtt-swse.armor',
    EQUIPMENT: 'foundryvtt-foundryvtt-swse.equipment',
    DROIDS: 'foundryvtt-foundryvtt-swse.droids',
    VEHICLES: 'foundryvtt-foundryvtt-swse.vehicles'
};

/**
 * Valid weapon subcategories
 */
export const WEAPON_SUBCATEGORIES = {
    MELEE: ['simple', 'advanced', 'lightsaber', 'exotic'],
    RANGED: ['simple', 'pistol', 'rifle', 'heavy', 'exotic', 'grenade']
};

/**
 * Availability types for filtering
 */
export const AVAILABILITY_TYPES = [
    'Standard',
    'Licensed',
    'Restricted',
    'Military',
    'Illegal',
    'Rare'
];

/**
 * Store UI configuration
 */
export const STORE_CONFIG = {
    SEARCH_DEBOUNCE_MS: 300,
    DEFAULT_MARKUP: 0,
    DEFAULT_DISCOUNT: 0,
    MIN_MARKUP: -100,
    MAX_MARKUP: 1000,
    MIN_DISCOUNT: 0,
    MAX_DISCOUNT: 100,
    LOADING_MESSAGE: "Loading store inventory...",
    CHECKOUT_ANIMATION_MS: 700
};

/**
 * Minimum costs for custom creations
 */
export const MIN_COSTS = {
    DROID: 1000,
    STARSHIP: 5000
};
