/**
 * suggestion-constants.js
 * Centralized constants for all suggestion engines
 * Extracted from magic strings/numbers for Phase-4 hygiene
 */

// ====== ARCHETYPE MAPPINGS ======
// Shared by Force Secret and Force Technique engines

export const PRESTIGE_ARCHETYPE_MAP = {
  'Jedi Guardian': 'jedi_guardian',
  'Jedi Sentinel': 'jedi_sentinel',
  'Jedi Consular': 'jedi_consular',
  'Jedi Ace Pilot': 'jedi_ace_pilot',
  'Jedi Healer': 'jedi_healer',
  'Jedi Battlemaster': 'jedi_battlemaster',
  'Jedi Shadow': 'jedi_shadow',
  'Jedi Weapon Master': 'jedi_weapon_master',
  'Jedi Mentor': 'jedi_mentor',
  'Jedi Seer': 'jedi_seer',
  'Jedi Archivist': 'jedi_archivist',
  'Sith Marauder': 'sith_marauder',
  'Sith Assassin': 'sith_assassin',
  'Sith Acolyte': 'sith_acolyte',
  'Sith Alchemist': 'sith_alchemist',
  'Sith Mastermind': 'sith_mastermind',
  'Sith Juggernaut': 'sith_juggernaut',
  'Emperor\'s Shield': 'emperors_shield',
  'Imperial Knight Errant': 'imperial_knight_errant',
  'Imperial Knight Inquisitor': 'imperial_knight_inquisitor'
};

export const BASE_ARCHETYPE_MAP = {
  'Jedi': 'jedi_consular',
  'Soldier': 'jedi_guardian',
  'Scout': 'jedi_sentinel',
  'Scoundrel': 'jedi_shadow',
  'Noble': 'jedi_mentor'
};

export const DEFAULT_ARCHETYPE = 'neutral';

// ====== FORCE SECRET ENGINE THRESHOLDS ======

// Archetype bonus thresholds for tier assignment
export const FORCE_SECRET_ARCHETYPE_THRESHOLDS = {
  PERFECT_FIT_MIN: 1.7,
  EXCELLENT_MATCH_MIN: 1.4,
  GOOD_MATCH_MIN: 1.0
};

// Institution bonus thresholds
export const FORCE_SECRET_INSTITUTION_THRESHOLDS = {
  ANTI_ALIGNMENT_MAX: 0.5,
  ANTI_ALIGNMENT_PENALTY: 0.3,
  ALIGNED_MIN: 1.2
};

// Dark Side Point ratios for institution inference
export const FORCE_SECRET_DSP_THRESHOLDS = {
  SITH_RATIO: 0.6,
  JEDI_RATIO: 0.3
};

// ====== FORCE TECHNIQUE ENGINE THRESHOLDS ======

// Archetype bonus thresholds for power synergy tiers
export const FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS = {
  HIGH_SYNERGY_MIN: 1.5,
  MED_SYNERGY_MIN: 1.2,
  LOW_SYNERGY_MIN: 1.0
};

// Power synergy penalty when no associated power is known
export const FORCE_TECHNIQUE_NO_POWER_PENALTY = 0.5;

// ====== STARSHIP MANEUVER ENGINE ======

// Force-related identifiers
export const FORCE_IDENTIFIERS = {
  USE_THE_FORCE: 'Use the Force',
  TARGET_SENSE: 'Target Sense',
  FORCE_TRAINED_TAG: 'force_trained'
};

// Maneuver names for pattern matching
export const MANEUVER_NAMES = {
  EVASIVE_ACTION: 'Evasive Action',
  TARGET_SENSE: 'Target Sense',
  FORMATION: 'Formation',
  DEFLECTOR: 'Deflector'
};

// Scoring adjustments
export const MANEUVER_SCORING = {
  FORMATION_BOOST: 2,
  EVASIVE_BOOST: 3,
  DEFLECTOR_BOOST_PER_WIS: 1,
  TARGET_SENSE_PENALTY: -10,
  SKILL_AFFINITY_BOOST: 3,
  SKILL_THRESHOLD_MULTIPLIER: 2
};

// Skill thresholds
export const MANEUVER_SKILL_THRESHOLDS = {
  HIGH_PILOTING_MIN: 4,
  LOW_PILOTING_MAX: 3
};

// Item types for filtering
export const ITEM_TYPES = {
  FORCE_POWER: 'forcepower',
  FEAT: 'feat',
  FEAT_TYPE_FORCE: 'force'
};

// System paths
export const SYSTEM_PATHS = {
  PRESTIGE_CLASS: 'system.swse.prestigeClass',
  BASE_CLASS: 'system.swse.class',
  DARK_SIDE_POINTS: 'system.swse.darkSidePoints',
  MAX_DARK_SIDE_POINTS: 'system.swse.maxDarkSidePoints',
  INSTITUTION: 'system.swse.institution',
  PILOTING_SKILL: 'system.skills.piloting.bonus',
  WISDOM_MOD: 'system.abilities.wis.mod'
};
