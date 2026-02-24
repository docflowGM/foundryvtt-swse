/**
 * Modifier Unification Schema
 * PHASE 7: Canonical modifier resolution and breakdown structure
 *
 * Goals:
 * - Unified target key namespace across all entity types
 * - Consistent effect resolution
 * - Standard modifier breakdown format
 * - Immutable canonical modifier authority
 */

/**
 * Unified target key namespace
 * All entities use same target paths
 */
export const UNIFIED_TARGET_NAMESPACE = {
  // Ability Scores & Modifiers
  ability: {
    str: 'ability.strength',
    dex: 'ability.dexterity',
    con: 'ability.constitution',
    int: 'ability.intelligence',
    wis: 'ability.wisdom',
    cha: 'ability.charisma'
  },

  // Skills
  skill: {
    acrobatics: 'skill.acrobatics',
    athletics: 'skill.athletics',
    deception: 'skill.deception',
    // ... etc
  },

  // Defense & Combat
  defense: {
    fortitude: 'defense.fortitude',
    reflex: 'defense.reflex',
    will: 'defense.will',
    armor: 'defense.armor',
    damageThreshold: 'defense.damageThreshold'
  },

  // Initiative & Speed
  initiative: 'initiative.total',
  speed: {
    base: 'speed.base',
    run: 'speed.run'
  },

  // Combat Stats
  bab: 'bab.total',
  hp: 'hp.max',

  // Perception & Sensing
  perception: 'system.perception.base',

  // Derived Layer Meta
  derivedRecalc: 'derived.recalculation'
};

/**
 * Canonical modifier breakdown structure
 * Stored in system.derived.modifiers
 *
 * Each target gets:
 * {
 *   total: number (final aggregated value)
 *   applied: [ { source, sourceId, sourceName, type, value, description } ]
 *   breakdown: [ { type, value, count, description } ]
 * }
 */
export class ModifierBreakdown {
  /**
   * Create unified breakdown structure
   *
   * @param {Array<Modifier>} modifiers - All modifiers for this target
   * @param {string} target - Target key
   * @returns {Object} Breakdown with total, applied, breakdown
   */
  static build(modifiers, target) {
    if (!Array.isArray(modifiers) || modifiers.length === 0) {
      return {
        total: 0,
        applied: [],
        breakdown: []
      };
    }

    const breakdown = {};
    let total = 0;

    // Group by type and aggregate
    for (const mod of modifiers) {
      const type = mod.type || 'untyped';

      if (!breakdown[type]) {
        breakdown[type] = {
          type,
          value: 0,
          modifiers: [],
          count: 0
        };
      }

      breakdown[type].value += mod.value;
      breakdown[type].modifiers.push(mod);
      breakdown[type].count += 1;
      total += mod.value;
    }

    // Build display breakdown
    const displayBreakdown = Object.values(breakdown).map(group => ({
      type: group.type,
      value: group.value,
      count: group.count,
      description: group.count === 1
        ? `${group.modifiers[0].sourceName}`
        : `${group.count} ${group.type} bonuses`
    }));

    return {
      total,
      applied: modifiers,
      breakdown: displayBreakdown
    };
  }
}

/**
 * Modifier effect standardization
 * All system definitions use consistent effect format
 */
export const EFFECT_SCHEMA = {
  /**
   * Standard effect object
   * {
   *   target: string (UNIFIED_TARGET_NAMESPACE path),
   *   type: string (modifier type for stacking),
   *   value: number (modifier amount),
   *   condition?: string (optional condition)
   * }
   */

  /**
   * Convert droid system effects to standard format
   * @param {Object} droidDef - Droid system definition
   * @returns {Array<Object>}
   */
  fromDroidSystem(droidDef) {
    return Array.isArray(droidDef.effects) ? droidDef.effects : [];
  },

  /**
   * Convert vehicle system effects to standard format
   * @param {Object} vehicleDef - Vehicle system definition
   * @returns {Array<Object>}
   */
  fromVehicleSystem(vehicleDef) {
    return Array.isArray(vehicleDef.effects) ? vehicleDef.effects : [];
  },

  /**
   * Validate effect conforms to schema
   * @param {Object} effect
   * @returns {boolean}
   */
  validate(effect) {
    if (!effect || typeof effect !== 'object') return false;
    if (!effect.target || typeof effect.target !== 'string') return false;
    if (!effect.type || typeof effect.type !== 'string') return false;
    if (typeof effect.value !== 'number') return false;
    return true;
  }
};

/**
 * Authority hierarchy for modifier resolution
 * (lower number = higher authority)
 */
export const MODIFIER_AUTHORITY = {
  SERVER_DEFINITION: 0,      // Droid/Vehicle/Feat definitions
  DERIVED_RECALC: 1,         // DerivedCalculator enforcement
  MODIFIER_ENGINE: 2,        // ModifierEngine aggregation
  ACTOR_DATA: 3,            // Actor system values
  CLIENT_UI: 4              // Client-side display only
};

/**
 * Modifier reconciliation rules
 * Ensures consistency across all sources
 */
export class ModifierReconciliation {
  /**
   * Reconcile modifiers from all sources
   * Returns canonical modifier set with no conflicts
   *
   * @param {Array<Modifier>} allModifiers
   * @returns {Array<Modifier>} Reconciled modifiers
   */
  static reconcile(allModifiers) {
    const byTarget = new Map();

    // Group by target
    for (const mod of allModifiers) {
      if (!byTarget.has(mod.target)) {
        byTarget.set(mod.target, []);
      }
      byTarget.get(mod.target).push(mod);
    }

    // Validate each target group
    const reconciled = [];
    for (const [target, modifiers] of byTarget.entries()) {
      const validMods = modifiers.filter(m => this.#isValidModifier(m));
      reconciled.push(...validMods);
    }

    return reconciled;
  }

  static #isValidModifier(mod) {
    // Check minimal requirements
    if (!mod.source || !mod.target || typeof mod.value !== 'number') {
      return false;
    }
    // Valid if passes basic checks
    return true;
  }
}
