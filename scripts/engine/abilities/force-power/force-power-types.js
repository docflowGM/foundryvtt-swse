/**
 * FORCE_POWER Execution Model — Type Definitions
 *
 * Force Powers are single-activation abilities that consume Force Points
 * and may have frequency limits (per encounter, per day, etc.).
 */

/**
 * FORCE_POWER execution model identifier
 * @type {string}
 */
export const FORCE_POWER_MODEL = 'FORCE_POWER';

/**
 * Force Power frequency limit types
 * @enum {string}
 */
export const ForcePowerFrequencyType = Object.freeze({
  UNLIMITED: 'unlimited',        // Can be used any number of times
  ENCOUNTER: 'encounter',        // Once per encounter (reset on combat end)
  ROUND: 'round',                // Once per round (reset on next round)
  DAY: 'day',                     // Once per day (reset on rest)
  SCENE: 'scene'                 // Once per scene (reset on scene change)
});

/**
 * Force Power activation action types
 * Used to track action economy (standard, move, swift, free)
 * @enum {string}
 */
export const ForcePowerActionType = Object.freeze({
  STANDARD: 'standard',          // Uses standard action
  MOVE: 'move',                  // Uses move action
  SWIFT: 'swift',                // Uses swift action
  FREE: 'free',                  // Free action (1/round cap)
  REACTION: 'reaction',          // Reaction (1/round cap)
  FULL_ROUND: 'full_round'       // Uses full round action
});

/**
 * Force Power cost types (currently Force Points only, extensible)
 * @enum {string}
 */
export const ForcePowerCostType = Object.freeze({
  FORCE_POINTS: 'force_points',  // Standard cost in Force Points
  DARK_SIDE: 'dark_side'         // Dark Side power (costs DSP)
});

/**
 * Force Power descriptor (affects alignment bonuses)
 * @enum {string}
 */
export const ForcePowerDescriptor = Object.freeze({
  LIGHT: 'light',                // Light side power (bonus for light aligned)
  DARK: 'dark',                  // Dark side power (bonus for dark aligned)
  UNIVERSAL: 'universal'         // Works for any alignment
});

/**
 * Standard FORCE_POWER ability structure
 * @typedef {Object} ForcePowerAbility
 * @property {string} executionModel - Must be 'FORCE_POWER'
 * @property {Object} abilityMeta - Execution model metadata
 * @property {ForcePowerFrequencyType} [abilityMeta.frequency] - Usage frequency limit
 * @property {number} [abilityMeta.maxUses] - Max uses per frequency window
 * @property {ForcePowerActionType} [abilityMeta.actionType] - Action cost
 * @property {number} [abilityMeta.forcePointCost] - Force Points required
 * @property {ForcePowerDescriptor} [abilityMeta.descriptor] - Light/Dark/Universal
 * @property {boolean} [abilityMeta.darkSideOption] - Can be used with Dark Side
 * @property {number} [abilityMeta.baseDC] - Base DC for power check (if applicable)
 */
