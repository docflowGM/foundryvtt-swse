/**
 * Droid Modifications System — Phase A
 *
 * Defines the canonical structure for droid modifications (enhancements).
 * Modifications are hardware upgrades installed on droids via hardpoints.
 *
 * Storage:
 * - Primary: actor.system.droidSystems.mods (array of DroidModification objects)
 * - Metadata: actor.system.droidSystems.hardpoints (tracks available/used hardpoints)
 *
 * Each modification has:
 * - id, name, modifiers array, hardpointsRequired, costInCredits, level requirement
 * - enabled flag (can be toggled)
 * - source (feat, talent, item, etc.)
 *
 * Modifications contribute modifiers to the ModifierEngine via _getDroidModModifiers()
 */

export const DROID_MOD_TYPES = {
  // Sensor enhancements
  ADVANCED_SENSORS: 'advanced-sensors',
  TARGETING_COMPUTER: 'targeting-computer',
  SENSOR_JAMMING: 'sensor-jamming',

  // Movement enhancements
  JUMP_SERVOS: 'jump-servos',
  REPULSOR_LIFT_BOOST: 'repulsor-lift-boost',
  SPEED_GOVERNOR: 'speed-governor',

  // Combat enhancements
  WEAPON_HARDPOINT: 'weapon-hardpoint',
  ARMOR_PLATING: 'armor-plating',
  DEFLECTOR_SHIELD: 'deflector-shield',

  // Defensive/special
  STEALTH_COATING: 'stealth-coating',
  THERMAL_DAMPING: 'thermal-damping',
  REINFORCED_FRAME: 'reinforced-frame',

  // Utility
  EXPANDED_POWER_CORE: 'expanded-power-core',
  TOOL_KIT: 'tool-kit',
  COMMUNICATIONS_ARRAY: 'communications-array'
};

/**
 * Create a canonical DroidModification object
 * @param {string} id - Unique modification ID
 * @param {string} name - Display name
 * @param {Array} modifiers - Array of modifier objects { target, type, value }
 * @param {number} hardpointsRequired - Number of hardpoints this modification uses
 * @param {number} costInCredits - Cost in credits
 * @param {boolean} enabled - Is this modification active
 * @returns {Object} Canonical DroidModification
 */
export function createDroidModification(
  id,
  name,
  modifiers = [],
  hardpointsRequired = 1,
  costInCredits = 0,
  enabled = true
) {
  return {
    id: String(id),
    name: String(name),
    modifiers: Array.isArray(modifiers) ? modifiers : [],
    hardpointsRequired: Math.max(1, Number(hardpointsRequired) || 1),
    costInCredits: Math.max(0, Number(costInCredits) || 0),
    enabled: enabled === true,
    timestamp: Date.now()
  };
}

/**
 * Example droid modifications by type
 * These are baseline examples. Full modification tree is in compendium.
 */
export const DROID_MODIFICATION_EXAMPLES = {
  [DROID_MOD_TYPES.ADVANCED_SENSORS]: {
    id: DROID_MOD_TYPES.ADVANCED_SENSORS,
    name: 'Advanced Sensors',
    description: 'Upgrade sensor package for improved perception',
    hardpointsRequired: 1,
    costInCredits: 500,
    modifiers: [
      { target: 'skill.perception', type: 'enhancement', value: 2 },
      { target: 'initiative.total', type: 'enhancement', value: 1 }
    ],
    prerequisites: { minLevel: 2 },
    availability: 'Common'
  },

  [DROID_MOD_TYPES.TARGETING_COMPUTER]: {
    id: DROID_MOD_TYPES.TARGETING_COMPUTER,
    name: 'Targeting Computer',
    description: 'Computerized targeting system for ranged attacks',
    hardpointsRequired: 1,
    costInCredits: 750,
    modifiers: [
      { target: 'skill.rangedAttack', type: 'competence', value: 1 },
      { target: 'skill.rangedAttackBonus', type: 'competence', value: 2 }
    ],
    prerequisites: { minLevel: 3 },
    availability: 'Common'
  },

  [DROID_MOD_TYPES.ARMOR_PLATING]: {
    id: DROID_MOD_TYPES.ARMOR_PLATING,
    name: 'Armor Plating Enhancement',
    description: 'Additional armor plating for increased protection',
    hardpointsRequired: 2,
    costInCredits: 1000,
    modifiers: [
      { target: 'defense.fort', type: 'enhancement', value: 2 },
      { target: 'defense.reflex', type: 'enhancement', value: 1 },
      { target: 'hp.max', type: 'enhancement', value: 5 }
    ],
    prerequisites: { minLevel: 1 },
    availability: 'Common'
  },

  [DROID_MOD_TYPES.SPEED_GOVERNOR]: {
    id: DROID_MOD_TYPES.SPEED_GOVERNOR,
    name: 'Speed Governor Override',
    description: 'Bypass manufacturer speed limiters for increased movement',
    hardpointsRequired: 1,
    costInCredits: 600,
    modifiers: [
      { target: 'movement.speed', type: 'enhancement', value: 2 },
      { target: 'skill.acrobatics', type: 'circumstance', value: -1 }
    ],
    prerequisites: { minLevel: 3 },
    availability: 'Uncommon'
  },

  [DROID_MOD_TYPES.REINFORCED_FRAME]: {
    id: DROID_MOD_TYPES.REINFORCED_FRAME,
    name: 'Reinforced Frame',
    description: 'Strengthened structural framework',
    hardpointsRequired: 2,
    costInCredits: 800,
    modifiers: [
      { target: 'hp.max', type: 'enhancement', value: 10 },
      { target: 'skill.athletics', type: 'enhancement', value: 1 }
    ],
    prerequisites: { minLevel: 2 },
    availability: 'Uncommon'
  },

  [DROID_MOD_TYPES.STEALTH_COATING]: {
    id: DROID_MOD_TYPES.STEALTH_COATING,
    name: 'Stealth Coating',
    description: 'Light-absorbing surface treatment',
    hardpointsRequired: 2,
    costInCredits: 1500,
    modifiers: [
      { target: 'skill.stealth', type: 'enhancement', value: 3 },
      { target: 'skill.perception', type: 'circumstance', value: -1 }
    ],
    prerequisites: { minLevel: 5 },
    availability: 'Rare'
  }
};

/**
 * Hardpoint system
 * Tracks available hardpoints on a droid by degree and size
 */
export const DROID_HARDPOINT_ALLOCATION = {
  'Third-Degree': {
    small: 2,
    medium: 3,
    large: 4
  },
  'Second-Degree': {
    small: 3,
    medium: 4,
    large: 5
  },
  'First-Degree': {
    small: 4,
    medium: 5,
    large: 6
  }
};

/**
 * Validate if a modification can be installed
 * @param {Object} mod - Droid modification object
 * @param {Object} droidSystems - actor.system.droidSystems
 * @returns {Object} { canInstall: boolean, reason?: string }
 */
export function validateModificationInstall(mod, droidSystems) {
  if (!mod) {
    return { canInstall: false, reason: 'Modification not found' };
  }

  if (!droidSystems) {
    return { canInstall: false, reason: 'Droid systems not initialized' };
  }

  // Check hardpoint availability
  const degree = droidSystems.degree || 'Third-Degree';
  const size = droidSystems.size || 'medium';
  const allocation = DROID_HARDPOINT_ALLOCATION[degree]?.[size] || 3;
  const usedHardpoints = (droidSystems.mods || [])
    .filter(m => m.enabled !== false)
    .reduce((sum, m) => sum + (m.hardpointsRequired || 1), 0);

  if (usedHardpoints + (mod.hardpointsRequired || 1) > allocation) {
    return {
      canInstall: false,
      reason: `Insufficient hardpoints. Required: ${mod.hardpointsRequired}, Available: ${allocation - usedHardpoints}`
    };
  }

  // Check credit budget
  const creditsRemaining = droidSystems.credits?.remaining || 0;
  if ((mod.costInCredits || 0) > creditsRemaining) {
    return {
      canInstall: false,
      reason: `Insufficient credits. Required: ${mod.costInCredits}, Available: ${creditsRemaining}`
    };
  }

  // Check droid level prerequisite
  if (mod.prerequisites?.minLevel) {
    const droidLevel = droidSystems.level || 1;
    if (droidLevel < mod.prerequisites.minLevel) {
      return {
        canInstall: false,
        reason: `Requires droid level ${mod.prerequisites.minLevel}, current level ${droidLevel}`
      };
    }
  }

  return { canInstall: true };
}
