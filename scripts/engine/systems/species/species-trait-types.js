/**
 * Species Trait Type Constants
 * Pure data enums for trait classification and targeting
 * No functions, no side-effects, safe to import in any context
 */

/**
 * Trait type classification
 * Used to categorize species traits for processing and display
 */
export const SPECIES_TRAIT_TYPES = Object.freeze({
  // Numeric modifiers
  BONUS: 'bonus',                     // Flat always-on bonuses (+2 Fortitude, +5 Persuasion)
  PENALTY: 'penalty',                 // Permanent negatives (-2 Will Defense)
  CONDITIONAL_BONUS: 'conditionalBonus', // State-dependent (+2 damage when at half HP)

  // Roll modifications
  REROLL: 'reroll',                   // Skill/attack rerolls (Duros Pilot reroll)

  // Physical traits
  MOVEMENT: 'movement',               // Flight, swim speed, glide
  SENSE: 'sense',                     // Darkvision, blindsense, scent
  NATURAL_WEAPON: 'naturalWeapon',    // Claws, bite, gore

  // Resistances
  IMMUNITY: 'immunity',               // Complete immunity (poison, disease, Force)
  RESISTANCE: 'resistance',           // Partial protection (+5 vs Force powers)

  // Special abilities
  REGENERATION: 'regeneration',       // Auto-healing (Gen'Dai, Trandoshan)
  PROFICIENCY: 'proficiency',         // Weapon/armor proficiencies
  ENVIRONMENTAL: 'environmental',     // Breathe water, cold adaptation
  ONCE_PER_ENCOUNTER: 'oncePerEncounter',   // Limited-use abilities
  SPECIAL_ACTION: 'specialAction',    // Unique actions (Anzat drain, sonic bellow)
  RULE_OVERRIDE: 'ruleOverride',      // Exceptions to core rules (Miraluka Force sight)

  // Grants
  FEAT_GRANT: 'featGrant',            // Grants a feat (Human bonus feat)
  SKILL_GRANT: 'skillGrant',          // Grants trained skill (Human skilled)
  FORCE_SENSITIVITY: 'forceSensitivity' // Grants Force Sensitivity
});

/**
 * Trait type list for iteration
 */
export const TRAIT_TYPE_LIST = Object.freeze(Object.values(SPECIES_TRAIT_TYPES));

/**
 * Valid targets for bonuses/penalties
 * Used to normalize and validate bonus application
 */
export const BONUS_TARGETS = Object.freeze({
  // Defense types
  FORTITUDE: 'fortitude',
  REFLEX: 'reflex',
  WILL: 'will',

  // Abilities
  STR: 'str',
  DEX: 'dex',
  CON: 'con',
  INT: 'int',
  WIS: 'wis',
  CHA: 'cha',

  // Combat
  MELEE_ATTACK: 'meleeAttack',
  RANGED_ATTACK: 'rangedAttack',
  MELEE_DAMAGE: 'meleeDamage',
  RANGED_DAMAGE: 'rangedDamage',
  INITIATIVE: 'initiative',
  GRAPPLE: 'grapple',

  // Skills (use skill keys from character-data-model)
  ACROBATICS: 'acrobatics',
  CLIMB: 'climb',
  DECEPTION: 'deception',
  ENDURANCE: 'endurance',
  GATHER_INFORMATION: 'gatherInformation',
  JUMP: 'jump',
  KNOWLEDGE_BUREAUCRACY: 'knowledgeBureaucracy',
  KNOWLEDGE_GALACTIC_LORE: 'knowledgeGalacticLore',
  KNOWLEDGE_LIFE_SCIENCES: 'knowledgeLifeSciences',
  KNOWLEDGE_PHYSICAL_SCIENCES: 'knowledgePhysicalSciences',
  KNOWLEDGE_SOCIAL_SCIENCES: 'knowledgeSocialSciences',
  KNOWLEDGE_TACTICS: 'knowledgeTactics',
  KNOWLEDGE_TECHNOLOGY: 'knowledgeTechnology',
  MECHANICS: 'mechanics',
  PERCEPTION: 'perception',
  PERSUASION: 'persuasion',
  PILOT: 'pilot',
  RIDE: 'ride',
  STEALTH: 'stealth',
  SURVIVAL: 'survival',
  SWIM: 'swim',
  TREAT_INJURY: 'treatInjury',
  USE_COMPUTER: 'useComputer',
  USE_THE_FORCE: 'useTheForce',

  // Other
  SPEED: 'speed',
  DAMAGE_THRESHOLD: 'damageThreshold'
});

/**
 * Condition types for conditional bonuses
 * Used to determine when conditional bonuses apply
 */
export const CONDITIONS = Object.freeze({
  HALF_HP: 'halfHP',              // At or below half hit points
  CHARGING: 'charging',           // While charging
  SWIMMING: 'swimming',           // While swimming
  FLYING: 'flying',               // While flying
  IN_DARKNESS: 'inDarkness',      // In darkness/low light
  IN_COLD: 'inCold',              // In cold environment
  IN_WATER: 'inWater',            // Underwater
  AFTER_DAMAGE: 'afterDamage',    // After taking damage
  FORCE_POWER: 'forcePower'       // Against Force powers
});

/**
 * Skill display names mapping
 * Maps skill keys to human-readable names for UI display
 */
export const SKILL_DISPLAY_NAMES = Object.freeze({
  acrobatics: 'Acrobatics',
  climb: 'Climb',
  deception: 'Deception',
  endurance: 'Endurance',
  gatherInformation: 'Gather Information',
  initiative: 'Initiative',
  jump: 'Jump',
  knowledgeBureaucracy: 'Knowledge (Bureaucracy)',
  knowledgeGalacticLore: 'Knowledge (Galactic Lore)',
  knowledgeLifeSciences: 'Knowledge (Life Sciences)',
  knowledgePhysicalSciences: 'Knowledge (Physical Sciences)',
  knowledgeSocialSciences: 'Knowledge (Social Sciences)',
  knowledgeTactics: 'Knowledge (Tactics)',
  knowledgeTechnology: 'Knowledge (Technology)',
  mechanics: 'Mechanics',
  perception: 'Perception',
  persuasion: 'Persuasion',
  pilot: 'Pilot',
  ride: 'Ride',
  stealth: 'Stealth',
  survival: 'Survival',
  swim: 'Swim',
  treatInjury: 'Treat Injury',
  useComputer: 'Use Computer',
  useTheForce: 'Use the Force'
});

/**
 * Movement modes
 */
export const MOVEMENT_MODES = Object.freeze({
  WALK: 'walk',
  FLY: 'fly',
  SWIM: 'swim',
  CLIMB: 'climb',
  BURROW: 'burrow',
  GLIDE: 'glide'
});

/**
 * Sense types
 */
export const SENSE_TYPES = Object.freeze({
  DARKVISION: 'darkvision',
  LOW_LIGHT: 'lowLight',
  BLINDSENSE: 'blindsense',
  BLINDSIGHT: 'blindsight',
  SCENT: 'scent',
  TREMORSENSE: 'tremorsense',
  FORCE_SIGHT: 'forceSight'
});

/**
 * Immunity/resistance effect types
 */
export const EFFECT_TYPES = Object.freeze({
  POISON: 'poison',
  DISEASE: 'disease',
  FORCE: 'force',
  FIRE: 'fire',
  COLD: 'cold',
  ACID: 'acid',
  SONIC: 'sonic',
  ELECTRICITY: 'electricity',
  STUN: 'stun',
  DAZE: 'daze',
  MIND_AFFECTING: 'mindAffecting'
});

/**
 * Frequency for abilities
 */
export const FREQUENCIES = Object.freeze({
  AT_WILL: 'atWill',
  ONCE_PER_ROUND: 'oncePerRound',
  ONCE_PER_ENCOUNTER: 'oncePerEncounter',
  ONCE_PER_DAY: 'oncePerDay',
  ON_TURN_START: 'onTurnStart',
  ON_DAMAGE: 'onDamage'
});
