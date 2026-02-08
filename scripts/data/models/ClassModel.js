/**
 * ============================================
 * CANONICAL CLASS MODEL
 * ============================================
 *
 * This is the single source of truth for class structure at runtime.
 *
 * All class data flows through here:
 * Raw Compendium → SSOT Normalizer → ClassModel
 *
 * Subsystems then adapt ClassModel to their needs:
 * ClassModel → ProgressionAdapter → Progression Engine
 * ClassModel → CharGenAdapter → CharGen UI
 * ClassModel → EngineAdapter → Character Sheet
 *
 * ============================================
 */

/**
 * @typedef {Object} ClassModel
 *
 * The canonical in-memory representation of a class.
 * All properties are guaranteed to be defined and type-safe.
 * This is the only schema that matters at runtime.
 *
 * @property {string} id - Normalized machine ID (lowercase, underscored)
 * @property {string} sourceId - Original Foundry document ID (_id)
 * @property {string} name - Display name
 *
 * @property {boolean} baseClass - Is this a base/core class (Soldier, Jedi, etc)?
 * @property {boolean} prestigeClass - Is this a prestige class? (Derived from !baseClass but explicit)
 *
 * @property {6|8|10|12} hitDie - Hit die value (canonical: always integer)
 * @property {"slow"|"medium"|"fast"} babProgression - BAB progression rate
 *
 * @property {number} trainedSkills - Skill points per level
 * @property {string[]} classSkills - List of class skills
 *
 * @property {string[]} talentTreeNames - Names of talent trees available
 * @property {string[]} talentTreeIds - IDs of talent trees (resolved during ClassesDB build)
 *
 * @property {Object} defenses - Flat defense bonuses
 * @property {number} defenses.fortitude - Fortitude save bonus
 * @property {number} defenses.reflex - Reflex save bonus
 * @property {number} defenses.will - Will save bonus
 *
 * @property {any[]} startingFeatures - Features granted at level 1
 * @property {LevelProgressionEntry[]} levelProgression - Features by level (array, not object)
 *
 * @property {boolean} forceSensitive - Can use Force Points?
 * @property {boolean} grantsForcePoints - Does this class grant FP at level-up?
 * @property {number|null} forcePointBase - Base FP for prestige classes (e.g., 7 for Jedi Master)
 *
 * @property {"force"|"combat"|"tech"|"leader"|"general"} role - Inferred from talent trees (for Suggestion Engine)
 *
 * @property {number} baseHp - Starting HP
 * @property {number|null} startingCredits - Starting credits (null if not specified)
 *
 * @property {string} description - Class description
 * @property {string} img - Icon URL
 */

/**
 * @typedef {Object} LevelProgressionEntry
 * @property {number} level - Level number (1–20)
 * @property {number} bab - Base Attack Bonus at this level
 * @property {number} force_points - FP granted at this level (if force-sensitive)
 * @property {any[]} features - Features granted at this level
 * @property {number} defense_bonus - Defense bonus at this level
 * @property {number} bonus_talents - Talent choices at this level
 * @property {number} bonus_feats - Feat choices at this level
 */

/**
 * Validate that an object conforms to ClassModel schema
 * @param {any} obj
 * @returns {boolean}
 */
export function isClassModel(obj) {
  if (!obj || typeof obj !== 'object') {return false;}

  const required = [
    'id', 'sourceId', 'name',
    'baseClass', 'prestigeClass',
    'hitDie', 'babProgression',
    'trainedSkills', 'classSkills',
    'talentTreeNames', 'talentTreeIds',
    'defenses', 'startingFeatures', 'levelProgression',
    'forceSensitive', 'grantsForcePoints',
    'baseHp', 'description', 'img'
  ];

  return required.every(key => key in obj);
}

/**
 * Create an empty/default ClassModel
 * @returns {ClassModel}
 */
export function createEmptyClassModel() {
  return {
    id: 'unknown',
    sourceId: '',
    name: 'Unknown Class',

    baseClass: false,
    prestigeClass: true,

    hitDie: 6,
    babProgression: 'medium',

    trainedSkills: 4,
    classSkills: [],

    talentTreeNames: [],
    talentTreeIds: [],

    defenses: {
      fortitude: 0,
      reflex: 0,
      will: 0
    },

    startingFeatures: [],
    levelProgression: [],

    forceSensitive: false,
    grantsForcePoints: true,
    forcePointBase: null,

    role: 'general',

    baseHp: 0,
    startingCredits: null,

    description: '',
    img: 'icons/svg/item-bag.svg'
  };
}
