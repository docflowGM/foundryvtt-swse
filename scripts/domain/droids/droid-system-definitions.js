import { DROID_PART_DEFINITION_MAP, resolveDroidSystemIdentity } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-part-schema.js";

/**
 * DROID SYSTEM DEFINITIONS — compatibility registry, NOT canonical.
 *
 * PHASE 1 — Droid Authority Consolidation update: this module (and the
 * private LEGACY_DROID_SYSTEM_DEFINITIONS catalog below, a *third*
 * independent droid-part id scheme alongside scripts/data/droid-part-schema.js
 * and scripts/domain/droids/droid-part-schema.js) is no longer used to
 * resolve droid modifiers. ModifierEngine._getDroidModModifiers() now
 * resolves installed components through
 * scripts/domain/droids/droid-installed-component-resolver.js against the
 * canonical registry in scripts/data/droid-part-schema.js. See
 * docs/audits/droid-authority-consolidation-phase-1.md for the full
 * authority graph and why scripts/data/droid-part-schema.js was selected as
 * canonical instead of this module.
 *
 * This file is retained only because scripts/domain/droids/
 * droid-slot-governance.js and droid-modification-factory.js still import
 * it, and those two are themselves only reachable through
 * droid-transaction-service.js, which nothing in the codebase currently
 * imports (verified dead at Phase 1 time). Do not add new consumers of
 * LEGACY_DROID_SYSTEM_DEFINITIONS or DROID_SYSTEM_DEFINITIONS — route new
 * droid-part rules through scripts/data/droid-part-schema.js instead.
 */

const LEGACY_DROID_SYSTEM_DEFINITIONS = {
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

export const DROID_SYSTEM_DEFINITIONS = Object.freeze({
  ...LEGACY_DROID_SYSTEM_DEFINITIONS,
  ...DROID_PART_DEFINITION_MAP
});

/**
 * Get system definition by ID (server-authoritative)
 * @param {string} systemId - System ID
 * @returns {Object|null} System definition or null
 */
export function getDroidSystemDefinition(systemId) {
  if (!systemId) return null;
  const key = String(systemId).trim();
  const slug = key.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return DROID_SYSTEM_DEFINITIONS[key]
    || DROID_SYSTEM_DEFINITIONS[slug]
    || resolveDroidSystemIdentity(systemId)
    || Object.values(DROID_SYSTEM_DEFINITIONS).find(def => String(def.name ?? '').toLowerCase() === key.toLowerCase())
    || null;
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
