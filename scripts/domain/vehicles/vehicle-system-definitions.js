/**
 * VEHICLE_SYSTEM_DEFINITIONS — Canonical Registry for Vehicle Modifications
 * PHASE 5: Single source of truth for vehicle system costs and properties
 *
 * Architecture:
 * - All costs defined here (never in UI, never in DOM, never in actor data)
 * - All compatibility rules defined here
 * - All effects defined here
 * - No mutation is allowed to this registry (immutable configuration)
 */

export const VEHICLE_SYSTEM_DEFINITIONS = {
  // ========================================
  // ENGINES
  // ========================================
  engine_basic: {
    id: 'engine_basic',
    slot: 'engine',
    name: 'Basic Engine',
    cost: 5000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['speeder', 'transport', 'walker'] },
    effects: [
      { target: 'system.speed.base', type: 'set', value: 30 }
    ]
  },

  engine_standard: {
    id: 'engine_standard',
    slot: 'engine',
    name: 'Standard Engine',
    cost: 12000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['speeder', 'transport', 'walker', 'interceptor'] },
    effects: [
      { target: 'system.speed.base', type: 'set', value: 50 }
    ]
  },

  engine_advanced: {
    id: 'engine_advanced',
    slot: 'engine',
    name: 'Advanced Engine',
    cost: 25000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['interceptor', 'fighter'] },
    effects: [
      { target: 'system.speed.base', type: 'set', value: 80 }
    ]
  },

  // ========================================
  // ARMOR PLATING
  // ========================================
  armor_light: {
    id: 'armor_light',
    slot: 'armor',
    name: 'Light Plating',
    cost: 3000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['speeder', 'transport', 'walker'] },
    effects: [
      { target: 'system.defense.armor', type: 'add', value: 2 }
    ]
  },

  armor_heavy: {
    id: 'armor_heavy',
    slot: 'armor',
    name: 'Heavy Plating',
    cost: 8000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['transport', 'walker', 'interceptor'] },
    effects: [
      { target: 'system.defense.armor', type: 'add', value: 5 }
    ]
  },

  armor_reinforced: {
    id: 'armor_reinforced',
    slot: 'armor',
    name: 'Reinforced Plating',
    cost: 15000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['fighter', 'gunship'] },
    effects: [
      { target: 'system.defense.armor', type: 'add', value: 8 }
    ]
  },

  // ========================================
  // WEAPONS MOUNTS
  // ========================================
  mount_light: {
    id: 'mount_light',
    slot: 'weapon_mount',
    name: 'Light Weapon Mount',
    cost: 2000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['speeder', 'transport'] },
    effects: []
  },

  mount_heavy: {
    id: 'mount_heavy',
    slot: 'weapon_mount',
    name: 'Heavy Weapon Mount',
    cost: 5000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['interceptor', 'fighter', 'gunship'] },
    effects: []
  },

  // ========================================
  // SENSORS & TARGETING
  // ========================================
  sensor_basic: {
    id: 'sensor_basic',
    slot: 'sensor',
    name: 'Basic Sensor',
    cost: 1500,
    resaleMultiplier: 0.5,
    compatibility: { type: ['speeder', 'transport', 'walker'] },
    effects: [
      { target: 'system.perception.base', type: 'add', value: 1 }
    ]
  },

  sensor_advanced: {
    id: 'sensor_advanced',
    slot: 'sensor',
    name: 'Advanced Sensor',
    cost: 4000,
    resaleMultiplier: 0.5,
    compatibility: { type: ['interceptor', 'fighter', 'gunship'] },
    effects: [
      { target: 'system.perception.base', type: 'add', value: 3 }
    ]
  }
};

/**
 * Get a vehicle system definition by ID
 * @param {string} systemId
 * @returns {Object|undefined}
 */
export function getVehicleSystemDefinition(systemId) {
  return VEHICLE_SYSTEM_DEFINITIONS[systemId];
}

/**
 * Check if system is compatible with vehicle type
 * @param {Object} systemDef
 * @param {string} vehicleType
 * @returns {boolean}
 */
export function isVehicleSystemCompatible(systemDef, vehicleType) {
  if (!systemDef?.compatibility) return true;
  const types = systemDef.compatibility.type || [];
  if (types.length === 0) return true;
  return types.includes(vehicleType);
}

/**
 * Get all systems for a specific slot
 * @param {string} slot
 * @returns {Array}
 */
export function getVehicleSystemsBySlot(slot) {
  return Object.values(VEHICLE_SYSTEM_DEFINITIONS).filter(
    sys => sys.slot === slot
  );
}
