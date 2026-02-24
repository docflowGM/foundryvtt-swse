/**
 * DROID SYSTEM DEFINITIONS — Canonical Registry
 * PHASE 4: Single source of truth for droid modification costs and properties
 *
 * Architecture:
 * - All costs defined here (never in UI, never in DOM, never in actor data)
 * - All compatibility rules defined here
 * - All effects defined here
 * - No mutation is allowed to this registry (immutable configuration)
 */

export const DROID_SYSTEM_DEFINITIONS = {
  // ========================================
  // PROCESSORS
  // ========================================
  processor_basic: {
    id: 'processor_basic',
    slot: 'processor',
    name: 'Basic Processor',
    cost: 2000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['light', 'medium', 'heavy'] },
    effects: [
      { target: 'system.derived.initiative', type: 'add', value: 0 }
    ]
  },

  processor_standard: {
    id: 'processor_standard',
    slot: 'processor',
    name: 'Standard Processor',
    cost: 5000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['medium', 'heavy'] },
    effects: [
      { target: 'system.derived.initiative', type: 'add', value: 1 }
    ]
  },

  processor_advanced: {
    id: 'processor_advanced',
    slot: 'processor',
    name: 'Advanced Processor',
    cost: 10000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['heavy'] },
    effects: [
      { target: 'system.derived.initiative', type: 'add', value: 2 }
    ]
  },

  // ========================================
  // LOCOMOTION
  // ========================================
  locomotion_walker: {
    id: 'locomotion_walker',
    slot: 'locomotion',
    name: 'Walker Legs',
    cost: 3000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['light', 'medium', 'heavy'] },
    effects: [
      { target: 'system.speed.base', type: 'set', value: 30 }
    ]
  },

  locomotion_hover: {
    id: 'locomotion_hover',
    slot: 'locomotion',
    name: 'Hover Platform',
    cost: 6000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['medium', 'heavy'] },
    effects: [
      { target: 'system.speed.base', type: 'set', value: 40 }
    ]
  },

  locomotion_flight: {
    id: 'locomotion_flight',
    slot: 'locomotion',
    name: 'Flight System',
    cost: 15000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['light', 'medium'] },
    effects: [
      { target: 'system.speed.base', type: 'set', value: 60 }
    ]
  },

  // ========================================
  // ARMOR/SHIELDING
  // ========================================
  shield_light: {
    id: 'shield_light',
    slot: 'shield',
    name: 'Light Shield',
    cost: 4000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['light', 'medium', 'heavy'] },
    effects: [
      { target: 'defense.reflex', type: 'add', value: 1 }
    ]
  },

  shield_heavy: {
    id: 'shield_heavy',
    slot: 'shield',
    name: 'Heavy Shield',
    cost: 8000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['heavy'] },
    effects: [
      { target: 'defense.reflex', type: 'add', value: 2 }
    ]
  },

  // ========================================
  // SENSORS
  // ========================================
  sensor_basic: {
    id: 'sensor_basic',
    slot: 'sensor',
    name: 'Basic Sensors',
    cost: 2000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['light', 'medium', 'heavy'] },
    effects: []
  },

  sensor_advanced: {
    id: 'sensor_advanced',
    slot: 'sensor',
    name: 'Advanced Sensors',
    cost: 5000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['medium', 'heavy'] },
    effects: []
  },

  // ========================================
  // POWER CORE
  // ========================================
  power_standard: {
    id: 'power_standard',
    slot: 'power',
    name: 'Standard Power Core',
    cost: 3000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['light', 'medium', 'heavy'] },
    effects: []
  },

  power_long_life: {
    id: 'power_long_life',
    slot: 'power',
    name: 'Long-Life Power Core',
    cost: 6000,
    resaleMultiplier: 0.5,
    compatibility: { chassis: ['medium', 'heavy'] },
    effects: []
  }
};

/**
 * Get system definition by ID (server-authoritative)
 * @param {string} systemId - System ID
 * @returns {Object|null} System definition or null
 */
export function getDroidSystemDefinition(systemId) {
  return DROID_SYSTEM_DEFINITIONS[systemId] || null;
}

/**
 * Validate system compatibility
 * @param {string} systemId - System ID
 * @param {string} chassis - Chassis type
 * @returns {boolean} Whether system is compatible
 */
export function isSystemCompatible(systemId, chassis) {
  const system = getDroidSystemDefinition(systemId);
  if (!system) return false;
  if (!system.compatibility) return true;
  if (!system.compatibility.chassis) return true;
  return system.compatibility.chassis.includes(chassis);
}

/**
 * Get all systems for a slot
 * @param {string} slot - Slot name
 * @returns {Array} Systems for this slot
 */
export function getSystemsBySlot(slot) {
  return Object.values(DROID_SYSTEM_DEFINITIONS).filter(s => s.slot === slot);
}
