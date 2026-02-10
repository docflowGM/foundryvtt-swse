/**
 * UI-only constants for SWSE Store
 *
 * SSOT constants (STORE_PACKS, MIN_COSTS) moved to engine/store-constants.js
 * This file contains only UI configuration.
 */

/**
 * Availability types for UI filtering
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
    LOADING_MESSAGE: 'Loading store inventory...',
    CHECKOUT_ANIMATION_MS: 700
};
