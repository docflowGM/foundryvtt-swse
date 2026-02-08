/**
 * Centralized property accessor for CharGen system
 * Handles inconsistent property naming in compendium data
 *
 * This utility provides normalized access to class, talent, feat, and skill data
 * that may have properties with either snake_case or camelCase naming.
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Property name mappings for compendium data
 * Format: { preferredName: [variant1, variant2, ...] }
 */
const PROPERTY_MAPPINGS = {
  // Class properties
  hitDie: ['hit_die', 'hitDie'],
  trainedSkills: ['trained_skills', 'trainedSkills', 'trained'],
  talentTrees: ['talent_trees', 'talentTrees', 'talent_tree'],
  babProgression: ['bab_progression', 'babProgression', 'bab'],
  startingCredits: ['starting_credits', 'startingCredits'],
  startingFeatures: ['starting_features', 'startingFeatures'],
  levelProgression: ['level_progression', 'levelProgression'],
  classSkills: ['class_skills', 'classSkills'],

  // Talent properties (tree is the standard property name in TalentDataModel)
  tree: ['tree', 'talent_tree', 'talentTree'],

  // Skill properties (normalized to camelCase per data model)
  gatherInformation: ['gatherInformation', 'gather_information', 'gatherInfo', 'gather-information'],
  treatInjury: ['treatInjury', 'treat_injury', 'treat-injury'],
  useComputer: ['useComputer', 'use_computer', 'use-computer'],
  useTheForce: ['useTheForce', 'use_the_force', 'use-the-force'],
  knowledgeBureaucracy: ['knowledgeBureaucracy', 'knowledge_bureaucracy'],
  knowledgeGalacticLore: ['knowledgeGalacticLore', 'knowledge_galactic_lore'],
  knowledgeLifeSciences: ['knowledgeLifeSciences', 'knowledge_life_sciences'],
  knowledgePhysicalSciences: ['knowledgePhysicalSciences', 'knowledge_physical_sciences'],
  knowledgeSocialSciences: ['knowledgeSocialSciences', 'knowledge_social_sciences'],
  knowledgeTactics: ['knowledgeTactics', 'knowledge_tactics'],
  knowledgeTechnology: ['knowledgeTechnology', 'knowledge_technology']
};

/**
 * Get a property value from an object, checking all possible naming variants
 * @param {Object} obj - The object to get property from (e.g., classDoc.system)
 * @param {string} propertyName - The preferred property name
 * @param {*} defaultValue - Default value if property not found
 * @param {boolean} warnOnMissing - Whether to log a warning if property is missing
 * @returns {*} The property value or default
 */
export function getProperty(obj, propertyName, defaultValue = null, warnOnMissing = false) {
  if (!obj) {return defaultValue;}

  const variants = PROPERTY_MAPPINGS[propertyName] || [propertyName];

  for (const variant of variants) {
    if (obj.hasOwnProperty(variant) && obj[variant] !== undefined) {
      // Log if we found a non-preferred variant
      if (variant !== propertyName && variant !== variants[0]) {
        SWSELogger.log(`CharGen | Property accessor found "${variant}" instead of preferred "${propertyName}"`);
      }
      return obj[variant];
    }
  }

  // Property not found in any variant
  if (warnOnMissing) {
    SWSELogger.warn(`CharGen | Property "${propertyName}" not found. Checked variants:`, variants);
  }

  return defaultValue;
}

/**
 * Get class property from class document
 * @param {Object} classDoc - The class document
 * @param {string} propertyName - The property to get
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The property value
 */
export function getClassProperty(classDoc, propertyName, defaultValue = null) {
  if (!classDoc || !classDoc.system) {
    SWSELogger.warn(`CharGen | Invalid class document for property "${propertyName}"`);
    return defaultValue;
  }

  return getProperty(classDoc.system, propertyName, defaultValue, true);
}

/**
 * Get talent property from talent document
 * @param {Object} talentDoc - The talent document
 * @param {string} propertyName - The property to get
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The property value
 */
export function getTalentProperty(talentDoc, propertyName, defaultValue = null) {
  if (!talentDoc || !talentDoc.system) {
    return defaultValue;
  }

  return getProperty(talentDoc.system, propertyName, defaultValue);
}

/**
 * Normalize a skill key to the standard snake_case format
 * @param {string} skillKey - The skill key in any format
 * @returns {string} The normalized skill key
 */
export function normalizeSkillKey(skillKey) {
  if (!skillKey) {return '';}

  // Check if this is a mapped skill name
  for (const [standardKey, variants] of Object.entries(PROPERTY_MAPPINGS)) {
    if (standardKey.includes('_') && variants.includes(skillKey)) {
      return standardKey;
    }
  }

  // If not found in mappings, return as lowercase with underscores
  return skillKey.toLowerCase().replace(/[- ]/g, '_');
}

/**
 * Get hit die size from class document
 * Handles formats like "1d10", "d10", or just "10"
 * @param {Object} classDoc - The class document
 * @returns {number} The die size (e.g., 10 for d10)
 */
export function getHitDie(classDoc) {
  const hitDieString = getClassProperty(classDoc, 'hitDie', '1d6');

  // Debug logging for hit die parsing
  SWSELogger.log(`CharGen | getHitDie() called for "${classDoc?.name}":`, {
    hitDieString,
    classDocSystem: classDoc?.system ? Object.keys(classDoc.system) : 'no system',
    systemHitDie: classDoc?.system?.hitDie,
    systemHitDieAlt: classDoc?.system?.hit_die
  });

  // Try to parse formats: "1d10", "d10", or "10"
  const match = hitDieString.match(/(\d+)$/);
  if (match && match[1]) {
    const result = parseInt(match[1], 10);
    SWSELogger.log(`CharGen | getHitDie() parsed "${hitDieString}" -> d${result} for "${classDoc?.name}"`);
    return result;
  }

  SWSELogger.warn(`CharGen | Could not parse hit die: "${hitDieString}", defaulting to d6`);
  return 6;
}

/**
 * Get number of trained skills from class document
 * @param {Object} classDoc - The class document
 * @returns {number} Number of trained skills allowed
 */
export function getTrainedSkills(classDoc) {
  const value = getClassProperty(classDoc, 'trainedSkills', 0);
  return Number(value) || 0;
}

/**
 * Get talent trees from class document
 * @param {Object} classDoc - The class document
 * @returns {Array<string>} Array of talent tree names
 */
export function getTalentTrees(classDoc) {
  const trees = getClassProperty(classDoc, 'talentTrees', []);
  return Array.isArray(trees) ? trees : [];
}

/**
 * Get talent tree name from talent document
 * Handles property name variants: tree, talent_tree, talentTree
 * @param {Object} talentDoc - The talent document
 * @returns {string} The talent tree name
 */
export function getTalentTreeName(talentDoc) {
  return getTalentProperty(talentDoc, 'tree', '');
}

/**
 * Validate class document has required properties
 * @param {Object} classDoc - The class document to validate
 * @returns {{valid: boolean, missing: Array<string>}} Validation result
 */
export function validateClassDocument(classDoc) {
  if (!classDoc || !classDoc.system) {
    return { valid: false, missing: ['system'] };
  }

  const requiredProperties = ['hitDie', 'babProgression', 'trainedSkills'];
  const missing = [];
  const warnings = [];

  for (const prop of requiredProperties) {
    const value = getClassProperty(classDoc, prop);
    if (value === null || value === undefined) {
      missing.push(prop);
    }
  }

  // Check talent trees exist (warning, not failure)
  const talentTrees = getTalentTrees(classDoc);
  if (!talentTrees || talentTrees.length === 0) {
    warnings.push(`Class "${classDoc.name}" has no talent trees defined`);
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
