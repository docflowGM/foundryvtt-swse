/**
 * ArchetypeDefinitions
 *
 * Unified archetype system integrating with mentor-archetype-paths.js
 * Provides both class-specific and generic archetype definitions.
 *
 * Primary source: mentor-archetype-paths.js (class-specific character concepts)
 * Fallback: Generic role-based archetypes for non-class-specific scenarios
 */

import { SWSELogger } from '../utils/logger.js';
import { ARCHETYPE_PATHS } from './mentor-archetype-paths.js';

/**
 * Generic role-based archetypes (fallback for non-class scenarios)
 * These map to the 3 core roles: guardian, striker, controller
 */
const GENERIC_ARCHETYPES = {
  "guardian": {
    key: "guardian",
    displayName: "Guardian",
    description: "Defensive, survivable character who protects allies and holds ground.",
    roleBias: { guardian: 1.5 },
    focusAttributes: ["con", "str"],
    philosophyStatement: "Endure so others do not fall."
  },
  "striker": {
    key: "striker",
    displayName: "Striker",
    description: "Offensive, high-damage character who eliminates threats decisively.",
    roleBias: { striker: 1.5 },
    focusAttributes: ["str", "dex"],
    philosophyStatement: "Hit hard and finish fast."
  },
  "controller": {
    key: "controller",
    displayName: "Controller",
    description: "Support, control-focused character who influences the battlefield.",
    roleBias: { controller: 1.5 },
    focusAttributes: ["wis", "int"],
    philosophyStatement: "Master the situation, not just the combat."
  }
};

/**
 * Default detection weights (can be overridden per world)
 */
export const DEFAULT_ARCHETYPE_WEIGHTS = {
  signalWeight: 1.0,          // Base multiplier for all signals
  attributeWeight: 1.0,       // How much attribute investment matters
  featWeight: 1.0,            // How much feat choice matters
  talentWeight: 1.0,          // How much talent tree matters
  skillWeight: 1.0            // How much skill investment matters
};

/**
 * Get archetype configuration (class-specific or generic)
 * @param {string} className - The character class (e.g., "Jedi", "Soldier")
 * @returns {Object} Dictionary of archetype definitions for the class
 */
export function getArchetypeConfig(className = null) {
  if (!className) {
    SWSELogger.log('[ArchetypeDefinitions] No class specified, returning generic archetypes');
    return { ...GENERIC_ARCHETYPES };
  }

  if (ARCHETYPE_PATHS[className]) {
    SWSELogger.log(`[ArchetypeDefinitions] Loading class-specific archetypes for "${className}"`);
    // Convert mentor archetype paths to standard format
    const classArchetypes = {};
    for (const [archetypeKey, archetypeData] of Object.entries(ARCHETYPE_PATHS[className])) {
      classArchetypes[archetypeKey] = {
        key: archetypeKey,
        ...archetypeData,
        // Add sensible defaults if not present
        focusAttributes: archetypeData.focusAttributes || [],
        focusSkills: archetypeData.focusSkills || [],
        talentKeywords: archetypeData.talentKeywords || []
      };
    }
    return classArchetypes;
  }

  SWSELogger.log(`[ArchetypeDefinitions] Class "${className}" not found, returning generic archetypes`);
  return { ...GENERIC_ARCHETYPES };
}

/**
 * Get all archetypes for a specific class
 * @param {string} className - The character class
 * @returns {Array} Array of archetype definitions
 */
export function getClassArchetypes(className) {
  const config = getArchetypeConfig(className);
  return Object.values(config);
}

/**
 * Get a specific archetype by key, optionally for a class
 * @param {string} archetypeKey - The archetype key (e.g., "guardian", "striker", "duelist")
 * @param {string} className - Optional: the character class
 * @returns {Object|null} Archetype definition or null
 */
export function getArchetypeByKey(archetypeKey, className = null) {
  const config = getArchetypeConfig(className);
  return config[archetypeKey] || null;
}

/**
 * List all archetype keys for a class
 * @param {string} className - The character class
 * @returns {Array<string>} Array of archetype keys
 */
export function listArchetypeKeys(className = null) {
  const config = getArchetypeConfig(className);
  return Object.keys(config);
}

/**
 * Get archetype display name
 * @param {string} archetypeKey - The archetype key
 * @param {string} className - Optional: the character class
 * @returns {string} Display name (e.g., "Jedi Guardian", "Scout Striker")
 */
export function getArchetypeDisplayName(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  if (!archetype) return null;
  return archetype.displayName || archetypeKey;
}

/**
 * Get archetype description
 * @param {string} archetypeKey - The archetype key
 * @param {string} className - Optional: the character class
 * @returns {string} Description of the archetype
 */
export function getArchetypeDescription(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  if (!archetype) return null;
  return archetype.description || "";
}

/**
 * Get archetype philosophy statement (mentor wisdom)
 * @param {string} archetypeKey - The archetype key
 * @param {string} className - Optional: the character class
 * @returns {string} Philosophy statement
 */
export function getArchetypePhilosophy(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  if (!archetype) return null;
  return archetype.philosophyStatement || "";
}

/**
 * Get archetype mentor quote
 * @param {string} archetypeKey - The archetype key
 * @param {string} className - Optional: the character class
 * @returns {string} Mentor quote about the archetype
 */
export function getArchetypeMentorQuote(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  if (!archetype) return null;
  return archetype.mentorQuote || "";
}

/**
 * Get archetype focus attributes
 * @param {string} archetypeKey - The archetype key
 * @param {string} className - Optional: the character class
 * @returns {Array<string>} Focus attribute abbreviations (e.g., ["str", "con"])
 */
export function getArchetypeFocusAttributes(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  if (!archetype) return [];
  return archetype.focusAttributes || [];
}

/**
 * Get archetype role bias multipliers
 * @param {string} archetypeKey - The archetype key
 * @param {string} className - Optional: the character class
 * @returns {Object} Role bias multipliers (e.g., { guardian: 1.2, striker: 0.8 })
 */
export function getArchetypeRoleBias(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  if (!archetype) return {};
  return archetype.roleBias || {};
}
