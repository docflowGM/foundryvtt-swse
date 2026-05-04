/**
 * scripts/engine/store/store-constants.js
 *
 * Engine-level configuration for store
 * (UI-only config remains in apps/store/store-constants.js)
 */

/**
 * Compendium pack names (SSOT locations)
 * Weapons and armor use subtype-first pattern (like vehicles).
 * Master packs remain as fallback aggregate references only.
 */
export const STORE_PACKS = {
  // Weapons: use subtype packs for store inventory
  WEAPON_PACKS: [
    'foundryvtt-swse.weapons-simple',
    'foundryvtt-swse.weapons-pistols',
    'foundryvtt-swse.weapons-rifles',
    'foundryvtt-swse.weapons-heavy',
    'foundryvtt-swse.weapons-grenades',
    'foundryvtt-swse.weapons-exotic',
    'foundryvtt-swse.weapons-lightsabers'
  ],
  WEAPONS_CANONICAL: 'foundryvtt-swse.weapons',

  // Armor: use subtype packs for store inventory
  ARMOR_PACKS: [
    'foundryvtt-swse.armor-light',
    'foundryvtt-swse.armor-medium',
    'foundryvtt-swse.armor-heavy',
    'foundryvtt-swse.armor-shields'
  ],
  ARMOR_CANONICAL: 'foundryvtt-swse.armor',

  // Equipment: subtype-first where available, aggregate fallback remains canonical.
  EQUIPMENT_PACKS: [
    'foundryvtt-swse.equipment-accessories',
    'foundryvtt-swse.equipment-computers',
    'foundryvtt-swse.equipment-communications',
    'foundryvtt-swse.equipment-detection',
    'foundryvtt-swse.equipment-explosives',
    'foundryvtt-swse.equipment-life-support',
    'foundryvtt-swse.equipment-medical',
    'foundryvtt-swse.equipment-survival',
    'foundryvtt-swse.equipment-tools',
    'foundryvtt-swse.equipment-upgrades'
  ],
  EQUIPMENT: 'foundryvtt-swse.equipment',

  // Droids: current single-source
  DROIDS: 'foundryvtt-swse.droids',

  // Vehicles: use subtype packs for store inventory
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
  CACHE_KEY: 'swse-store-cache-v3',
  CACHE_TTL: 1000 * 60 * 60 * 24  // 24 hours
};
