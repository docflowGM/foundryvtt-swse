/**
 * PASSIVE/STATE Subtype — State-Dependent Predicate Library
 *
 * Implements state-dependent bonuses that apply when specific game state
 * conditions are met at calculation time.
 *
 * Architecture:
 * - Pure functions (no mutations)
 * - Read-only game state inspection
 * - Deterministic evaluation
 * - No evaluation strings (predicate names only)
 *
 * Usage:
 * const bonus = evaluateStatePredicates(actor, ['defense.against-ranged', 'movement.while-moving'], context);
 */

/**
 * Predicate definitions.
 * Each predicate is a pure function that inspects actor state and returns boolean/number.
 *
 * Naming convention: "category.descriptor"
 * - defense.* — Defense-related predicates
 * - attack.* — Attack-related predicates
 * - skill.* — Skill-related predicates
 * - movement.* — Movement state predicates
 * - proximity.* — Proximity to allies/enemies
 * - turn.* — Turn/round state
 * - target.* — Target condition state
 */
export const PASSIVE_STATE_PREDICATES = {
  // ============================================
  // DEFENSE PREDICATES
  // ============================================

  /**
   * Applies when attack is ranged (melee attacks do not trigger)
   */
  "defense.against-ranged": (actor, context) => {
    return context?.attackType === 'ranged' || false;
  },

  /**
   * Applies when attack is melee (ranged attacks do not trigger)
   */
  "defense.against-melee": (actor, context) => {
    return context?.attackType === 'melee' || false;
  },

  /**
   * Applies when defending against Fortitude DC
   */
  "defense.fortitude": (actor, context) => {
    return context?.defenseType === 'fortitude' || false;
  },

  /**
   * Applies when defending against Reflex DC
   */
  "defense.reflex": (actor, context) => {
    return context?.defenseType === 'reflex' || false;
  },

  /**
   * Applies when defending against Will DC
   */
  "defense.will": (actor, context) => {
    return context?.defenseType === 'will' || false;
  },

  // ============================================
  // ATTACK PREDICATES
  // ============================================

  /**
   * Applies when attack hits
   */
  "attack.when-hit": (actor, context) => {
    return context?.hitResult === true || false;
  },

  /**
   * Applies when attack misses
   */
  "attack.when-miss": (actor, context) => {
    return context?.hitResult === false || false;
  },

  /**
   * Applies when using melee weapon
   */
  "attack.with-melee": (actor, context) => {
    return context?.weapon?.system?.attackAttribute === 'str' || false;
  },

  /**
   * Applies when using ranged weapon
   */
  "attack.with-ranged": (actor, context) => {
    return context?.weapon?.system?.attackAttribute === 'dex' || false;
  },


  /**
   * Applies when the current ranged attack/damage context is inside point-blank range.
   * The combat UI or caller may provide one of these explicit signals:
   * - context.pointBlankRange === true
   * - context.rangeBand === 'point_blank' or 'point-blank'
   * - context.isPointBlank === true
   *
   * If no caller supplies range context, this safely returns false rather than
   * guessing distances.
   */
  "range.within-point-blank": (actor, context) => {
    if (context?.pointBlankRange === true || context?.isPointBlank === true) return true;
    const band = String(context?.rangeBand || context?.rangeCategory || '').toLowerCase().replace(/_/g, '-');
    return band === 'point-blank' || band === 'pointblank';
  },

  // ============================================
  // MOVEMENT PREDICATES
  // ============================================

  /**
   * Applies when character moved at least 2 squares this turn
   */
  "movement.while-moving": (actor, context) => {
    const movementUsed = actor.system?.derived?.movement?.movementUsed || 0;
    return movementUsed >= 2 || false;
  },

  /**
   * Applies when character is stationary (zero movement this turn)
   */
  "movement.while-stationary": (actor, context) => {
    const movementUsed = actor.system?.derived?.movement?.movementUsed || 0;
    return movementUsed === 0 || false;
  },

  // ============================================
  // PROXIMITY PREDICATES
  // ============================================

  /**
   * Returns count of allies within 12 squares (for "for each ally" mechanics)
   * Used as dynamic modifier value, not boolean
   */
  "proximity.count-allies-within-12": (actor, context) => {
    const nearbyAllies = context?.nearbyAllies || [];
    return nearbyAllies.filter(a => {
      const distance = context?.getDistance?.(actor, a) || 0;
      return distance <= 12;
    }).length || 0;
  },

  /**
   * Returns count of allies within 6 squares
   */
  "proximity.count-allies-within-6": (actor, context) => {
    const nearbyAllies = context?.nearbyAllies || [];
    return nearbyAllies.filter(a => {
      const distance = context?.getDistance?.(actor, a) || 0;
      return distance <= 6;
    }).length || 0;
  },

  /**
   * Boolean: At least one ally within 6 squares
   */
  "proximity.ally-nearby": (actor, context) => {
    const nearbyAllies = context?.nearbyAllies || [];
    return nearbyAllies.some(a => {
      const distance = context?.getDistance?.(actor, a) || 0;
      return distance <= 6;
    }) || false;
  },

  // ============================================
  // TURN/ROUND STATE PREDICATES
  // ============================================

  /**
   * Applies on character's current turn
   */
  "turn.on-current-turn": (actor, context) => {
    return actor.system?.derived?.isCurrentTurn === true || false;
  },

  /**
   * Applies when it's not character's turn
   */
  "turn.not-current-turn": (actor, context) => {
    return actor.system?.derived?.isCurrentTurn !== true || false;
  },

  /**
   * Applies once per round (checks if ability already used this round)
   * NOTE: Requires external tracking in context.usedOncePerRound
   */
  "turn.once-per-round": (actor, context) => {
    // Check if this ability/modifier has been used this round
    const lastUsedRound = context?.lastUsedRound || -1;
    const currentRound = context?.currentRound || 0;
    return lastUsedRound !== currentRound || false;
  },

  // ============================================
  // SKILL-SPECIFIC PREDICATES
  // ============================================

  /**
   * Applies only to Pilot skill checks
   */
  "skill.pilot": (actor, context) => {
    return context?.skillName === 'pilot' || false;
  },

  /**
   * Applies only to Deception skill checks
   */
  "skill.deception": (actor, context) => {
    return context?.skillName === 'deception' || false;
  },

  /**
   * Applies only to Perception skill checks
   */
  "skill.perception": (actor, context) => {
    return context?.skillName === 'perception' || false;
  },

  /**
   * Applies only to Athletics skill checks
   */
  "skill.athletics": (actor, context) => {
    return context?.skillName === 'athletics' || false;
  },

  /**
   * Applies only to Stealth skill checks
   */
  "skill.stealth": (actor, context) => {
    return context?.skillName === 'stealth' || false;
  },

  /**
   * Applies only to Acrobatics skill checks
   */
  "skill.acrobatics": (actor, context) => {
    return context?.skillName === 'acrobatics' || false;
  },

  // ============================================
  // TARGET CONDITION PREDICATES
  // ============================================

  /**
   * Target is flanked (can be used for attacker bonuses)
   */
  "target.is-flanked": (actor, context) => {
    const target = context?.target;
    return target?.system?.derived?.isFlanked === true || false;
  },

  /**
   * Target is prone
   */
  "target.is-prone": (actor, context) => {
    const target = context?.target;
    return target?.system?.derived?.isProne === true || false;
  },

  /**
   * Target is stunned
   */
  "target.is-stunned": (actor, context) => {
    const target = context?.target;
    return target?.system?.derived?.isStunned === true || false;
  },

  /**
   * Target is disabled (0 or fewer HP)
   */
  "target.is-disabled": (actor, context) => {
    const target = context?.target;
    return (target?.system?.hp || 0) <= 0 || false;
  },

  // ============================================
  // VEHICLE-SPECIFIC PREDICATES
  // ============================================

  /**
   * Actor is a vehicle (used for vehicle-only bonuses)
   */
  "vehicle.is-vehicle": (actor, context) => {
    return actor.type === 'vehicle' || false;
  },

  /**
   * Actor is a character (not a vehicle)
   */
  "vehicle.is-character": (actor, context) => {
    return actor.type === 'character' || false;
  },
};

/**
 * Evaluate all predicates for a modifier.
 * All predicates must evaluate to truthy for modifier to apply.
 *
 * @param {Actor} actor - The actor being evaluated
 * @param {string[]} predicateNames - Array of predicate names (e.g., ['defense.against-ranged', 'movement.while-moving'])
 * @param {Object} context - Context object with state information
 * @returns {boolean} - True if all predicates are truthy
 */
export function evaluateStatePredicates(actor, predicateNames, context = {}) {
  if (!Array.isArray(predicateNames) || predicateNames.length === 0) {
    return true; // No predicates = always apply
  }

  return predicateNames.every(predicateName => {
    const predicate = PASSIVE_STATE_PREDICATES[predicateName];
    if (!predicate) {
      console.warn(`Unknown PASSIVE/STATE predicate: ${predicateName}`);
      return false; // Unknown predicate = fail
    }

    try {
      const result = predicate(actor, context);
      // Handle both boolean and numeric results (numeric: use > 0)
      return Boolean(result);
    } catch (err) {
      console.error(`Error evaluating PASSIVE/STATE predicate '${predicateName}':`, err);
      return false;
    }
  });
}

/**
 * Evaluate all predicates and return dynamic modifier value.
 * Used for predicates that return numbers (e.g., "count-allies-within-12").
 *
 * @param {Actor} actor
 * @param {string[]} predicateNames
 * @param {Object} context
 * @returns {number} - Sum of all numeric predicate results
 */
export function evaluateStatePredicatesNumeric(actor, predicateNames, context = {}) {
  if (!Array.isArray(predicateNames) || predicateNames.length === 0) {
    return 0;
  }

  let total = 0;
  for (const predicateName of predicateNames) {
    const predicate = PASSIVE_STATE_PREDICATES[predicateName];
    if (!predicate) {
      console.warn(`Unknown PASSIVE/STATE predicate: ${predicateName}`);
      continue;
    }

    try {
      const result = predicate(actor, context);
      if (typeof result === 'number') {
        total += result;
      }
    } catch (err) {
      console.error(`Error evaluating PASSIVE/STATE predicate '${predicateName}':`, err);
    }
  }

  return total;
}

/**
 * Get all available predicate names (for documentation/validation)
 * @returns {string[]}
 */
export function getAvailablePredicates() {
  return Object.keys(PASSIVE_STATE_PREDICATES).sort();
}

/**
 * Validate that a predicate name exists
 * @param {string} predicateName
 * @returns {boolean}
 */
export function isValidPredicate(predicateName) {
  return predicateName in PASSIVE_STATE_PREDICATES;
}

/**
 * Get all predicates in a category (e.g., "defense.*")
 * @param {string} category
 * @returns {string[]}
 */
export function getPredicatesInCategory(category) {
  const prefix = category.endsWith('.') ? category : `${category}.`;
  return Object.keys(PASSIVE_STATE_PREDICATES).filter(name => name.startsWith(prefix));
}
