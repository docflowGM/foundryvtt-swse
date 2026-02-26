/**
 * scripts/engine/store/store-constants.js
 *
 * Engine-level configuration for store
 * (UI-only config remains in apps/store/store-constants.js)
 */

/**
 * Compendium pack names (SSOT locations)
 */
export const STORE_PACKS = {
  WEAPONS: 'foundryvtt-swse.weapons',
  ARMOR: 'foundryvtt-swse.armor',
  EQUIPMENT: 'foundryvtt-swse.equipment',
  DROIDS: 'foundryvtt-swse.droids',
  VEHICLE_PACKS: [
    'foundryvtt-swse.vehicles-walkers',
    'foundryvtt-swse.vehicles-speeders',
    'foundryvtt-swse.vehicles-starships',
    'foundryvtt-swse.vehicles-stations'
  ],
  VEHICLES_CANONICAL: 'foundryvtt-swse.vehicles'
};

/**
 * Business rules (engine-enforced)
 */
export const STORE_RULES = {
  // Default markup/discount applied by engine
  DEFAULT_MARKUP: 0,
  DEFAULT_DISCOUNT: 0,

  // Used item multiplier
  USED_CONDITION_MULTIPLIER: 0.5,

  // Minimum costs for custom creations
  MIN_COSTS: {
    DROID: 1000,
    STARSHIP: 5000
  },

  // Cache invalidation
  CACHE_KEY: 'swse-store-cache-v1',
  CACHE_TTL: 1000 * 60 * 60 * 24  // 24 hours
};
