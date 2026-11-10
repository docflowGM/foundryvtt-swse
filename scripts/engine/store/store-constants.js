import { UNIVERSAL_VEHICLE_PACK_NAMES } from '../../domain/vehicles/universal-vehicle-pack-registry.js';

/**
 * scripts/engine/store/store-constants.js
 *
 * Engine-level configuration for store
 * (UI-only config remains in apps/store/store-constants.js)
 */

/**
 * Compendium pack names (SSOT locations)
 * Weapons and armor use subtype-first pattern (like vehicles).
 * Aggregate master packs are not store inventory and have no fallback role.
 */
export const STORE_PACKS = {
  // Weapons: canonical subtype packs are the only store inventory
  WEAPON_PACKS: [
    'foundryvtt-swse.weapons-simple',
    'foundryvtt-swse.weapons-pistols',
    'foundryvtt-swse.weapons-rifles',
    'foundryvtt-swse.weapons-heavy',
    'foundryvtt-swse.weapons-grenades',
    'foundryvtt-swse.weapons-exotic',
    'foundryvtt-swse.weapons-lightsabers'
  ],

  // Armor: use subtype packs for store inventory
  ARMOR_PACKS: [
    'foundryvtt-swse.armor-light',
    'foundryvtt-swse.armor-medium',
    'foundryvtt-swse.armor-heavy',
    'foundryvtt-swse.armor-shields'
  ],

  // Equipment: subtype-first where available, aggregate fallback remains canonical.
  // Pack names must match system.json declarations exactly.
  EQUIPMENT_PACKS: [
    'foundryvtt-swse.equipment-comlinks',    // communications & sensors
    'foundryvtt-swse.equipment-medical',     // medpacs & stims
    'foundryvtt-swse.equipment-other',       // accessories, explosives, life support, misc
    'foundryvtt-swse.equipment-security',    // locks, scanners, detection
    'foundryvtt-swse.equipment-survival',    // field gear & rations
    'foundryvtt-swse.equipment-tech',        // computers & slicing tools
    'foundryvtt-swse.equipment-tools'        // general tools
  ],

  // Droids: current single-source
  DROIDS: 'foundryvtt-swse.droids',

  // Every vehicle Actor comes from exactly one canonical publication pack.
  // No 316-ship/aggregate/old-emplacement fallbacks.
  VEHICLE_PACKS: UNIVERSAL_VEHICLE_PACK_NAMES.map(name=>'foundryvtt-swse.'+name)

};

/**
 * Business rules (engine-enforced)
 */
export const STORE_RULES = {
  // Default markup/discount applied by engine
  DEFAULT_MARKUP: 0,
  DEFAULT_DISCOUNT: 0,

  // Minimum costs for custom creations
  MIN_COSTS: {
    DROID: 1000,
    STARSHIP: 5000
  },

};
