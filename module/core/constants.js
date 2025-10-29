// ============================================
// FILE: constants.js
// System-wide constants for SWSE
// ============================================

export const SWSE_CONSTANTS = {
  // Defense
  BASE_DEFENSE: 10,
  
  // Critical Hits
  DEFAULT_CRIT_RANGE: 20,
  
  // Ability Scores
  MIN_ABILITY_SCORE: 1,
  MAX_ABILITY_SCORE: 30,
  AVERAGE_ABILITY_SCORE: 10,
  
  // Character Level
  MIN_LEVEL: 1,
  MAX_LEVEL: 20,
  
  // Cover Bonuses
  COVER: {
    NONE: 0,
    PARTIAL: 2,
    COVER: 5,
    IMPROVED: 10
  },
  
  // Concealment
  CONCEALMENT: {
    NONE: 0,
    PARTIAL: 20,
    TOTAL: 50
  },
  
  // Condition Track Penalties
  CONDITION_PENALTIES: {
    NORMAL: 0,
    MINUS_1: -1,
    MINUS_2: -2,
    MINUS_5: -5,
    MINUS_10: -10,
    DISABLED: -10,
    UNCONSCIOUS: -10,
    DEAD: -100
  },
  
  // Size Modifiers
  SIZE_MODIFIERS: {
    FINE: -10,
    DIMINUTIVE: -5,
    TINY: -5,
    SMALL: 0,
    MEDIUM: 0,
    LARGE: 5,
    HUGE: 10,
    GARGANTUAN: 20,
    COLOSSAL: 50,
    COLOSSAL_FRIGATE: 100,
    COLOSSAL_CRUISER: 150,
    COLOSSAL_STATION: 200
  },
  
  // BAB Progression
  BAB_PROGRESSION: {
    FAST: 1.0,
    MEDIUM: 0.75,
    SLOW: 0.5
  },
  
  // Bonuses
  FLANKING_BONUS: 2,
  FORCE_POINT_BONUS: 2,
  TRAINED_SKILL_BONUS: 5,
  SKILL_FOCUS_BONUS: 5,
  WEAPON_FOCUS_BONUS: 1,
  WEAPON_SPECIALIZATION_BONUS: 1
};
