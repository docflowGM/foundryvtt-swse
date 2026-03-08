/**
 * UNLOCK Execution Model — Type Definitions
 *
 * UNLOCK abilities grant system access or capabilities without performing an action.
 * They apply permanent (or long-term) capability unlocks to an actor.
 */

/**
 * UNLOCK execution model identifier
 * @type {string}
 */
export const UNLOCK_MODEL = 'UNLOCK';

/**
 * Grant categories for UNLOCK abilities
 * @enum {string}
 */
export const GrantCategory = Object.freeze({
  SYSTEM_ACCESS: 'SYSTEM_ACCESS',      // Unlock Force domains, attunement, special system flags
  PROFICIENCY: 'PROFICIENCY',           // Grant weapon/armor proficiencies
  DOMAIN_ACCESS: 'DOMAIN_ACCESS',       // Unlock Force domain access
  SKILL_TRAINING: 'SKILL_TRAINING'      // Mark skills as trained/class skills
});

/**
 * Proficiency types for PROFICIENCY grants
 * @enum {string}
 */
export const ProficiencyType = Object.freeze({
  WEAPON: 'weapon',                     // Weapon proficiency
  ARMOR: 'armor',                       // Armor proficiency
  SHIELD: 'shield',                     // Shield proficiency
  EXOTIC: 'exotic'                      // Exotic weapon proficiency
});

/**
 * System access capability types
 * @enum {string}
 */
export const SystemAccessType = Object.freeze({
  FORCE_SENSITIVITY: 'force_sensitivity',  // Grants Force Sensitivity (prerequisite for all Force abilities)
  FORCE_ATTUNEMENT: 'force_attunement',    // Grants attunement status
  JEDI_CLASS_ACCESS: 'jedi_class_access',  // Unlock Jedi class selection
  SITH_CLASS_ACCESS: 'sith_class_access',  // Unlock Sith class selection
  SCOUNDREL_CLASS_ACCESS: 'scoundrel_class_access',  // Unlock Scoundrel class selection
  SOLDIER_CLASS_ACCESS: 'soldier_class_access'      // Unlock Soldier class selection
});

/**
 * Standard UNLOCK ability structure
 * @typedef {Object} UnlockAbility
 * @property {string} executionModel - Must be 'UNLOCK'
 * @property {Object} abilityMeta - Execution model metadata
 * @property {Array<Grant>} abilityMeta.grants - Array of grants to apply
 */

/**
 * Grant object structure (polymorphic by category)
 * @typedef {Object} Grant
 * @property {GrantCategory} category - Grant category
 * @property {string} [description] - Human-readable description of what's granted
 */

/**
 * SYSTEM_ACCESS grant
 * @typedef {Grant} SystemAccessGrant
 * @property {GrantCategory} category - Always 'SYSTEM_ACCESS'
 * @property {SystemAccessType} capability - The system capability being unlocked
 * @property {Object} [effects] - Optional effects (e.g., Force Point adjustments)
 */

/**
 * PROFICIENCY grant
 * @typedef {Grant} ProficiencyGrant
 * @property {GrantCategory} category - Always 'PROFICIENCY'
 * @property {ProficiencyType} proficiencyType - Type of proficiency
 * @property {Array<string>} proficiencies - List of specific proficiencies to grant
 *   (e.g., ['longsword', 'greataxe'] for weapons; ['light armor', 'medium armor'] for armor)
 */

/**
 * DOMAIN_ACCESS grant
 * @typedef {Grant} DomainAccessGrant
 * @property {GrantCategory} category - Always 'DOMAIN_ACCESS'
 * @property {Array<string>} domains - List of Force domain IDs/slugs to unlock
 */

/**
 * SKILL_TRAINING grant
 * @typedef {Grant} SkillTrainingGrant
 * @property {GrantCategory} category - Always 'SKILL_TRAINING'
 * @property {Array<string>} skills - List of skill IDs/slugs to mark as trained/class skills
 * @property {boolean} [asClassSkill] - If true, mark as class skill (affects skill points)
 */
