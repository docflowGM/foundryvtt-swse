/**
 * ArchetypeLoader
 *
 * Loads archetypes from data/archetypes directory or falls back to class-archetypes.json
 * Supports both individual files and SSOT master file.
 * Fails gracefully on malformed files.
 */

import { SWSELogger } from '../../utils/logger.js';

const CACHE = new Map(); // id -> archetype
const CLASS_CACHE = new Map(); // className -> [archetypes]
let MASTER_ARCHETYPES = null; // class-archetypes.json fallback

/**
 * Load single archetype by ID (format: "class.archetypeKey")
 * @param {string} id - Archetype ID
 * @returns {Promise<Object|null>} Archetype or null if not found
 */
export async function loadArchetype(id) {
  if (!id) {return null;}
  if (CACHE.has(id)) {return CACHE.get(id);}

  const [classKey, archetypeKey] = id.split('.');
  if (!classKey || !archetypeKey) {return null;}

  try {
    // Try individual file first
    const url = `systems/foundryvtt-swse/data/archetypes/${classKey}/${archetypeKey}.json`;
    const response = await fetch(url);

    if (response.ok) {
      const archetype = await response.json();
      CACHE.set(id, archetype);
      return archetype;
    }
  } catch (err) {
    SWSELogger.debug(`[ArchetypeLoader] Individual file not found for ${id}, checking SSOT`);
  }

  // Fallback to SSOT master file
  const master = await _loadMasterArchetypes();
  const archetype = master?.[classKey]?.[archetypeKey];
  if (archetype) {
    CACHE.set(id, archetype);
    return archetype;
  }

  return null;
}

/**
 * Load all archetypes for a class
 * @param {string} className - Class name (jedi, soldier, etc.)
 * @returns {Promise<Array>} Array of archetype objects
 */
export async function loadArchetypesByClass(className) {
  if (!className) {return [];}
  if (CLASS_CACHE.has(className)) {return CLASS_CACHE.get(className);}

  try {
    const master = await _loadMasterArchetypes();
    const classData = master?.[className] || {};
    const archetypes = Object.entries(classData).map(([key, data]) => ({
      id: `${className}.${key}`,
      ...data
    }));
    CLASS_CACHE.set(className, archetypes);
    return archetypes;
  } catch (err) {
    SWSELogger.error(`[ArchetypeLoader] Failed to load archetypes for ${className}:`, err);
    return [];
  }
}

/**
 * Load all archetypes
 * @returns {Promise<Object>} { classKey -> [archetypes] }
 */
export async function loadAllArchetypes() {
  const master = await _loadMasterArchetypes();
  const result = {};

  for (const [classKey, classData] of Object.entries(master || {})) {
    result[classKey] = Object.entries(classData).map(([key, data]) => ({
      id: `${classKey}.${key}`,
      ...data
    }));
  }

  return result;
}

/**
 * Load master archetype data from class-archetypes.json (SSOT fallback)
 * @private
 */
async function _loadMasterArchetypes() {
  if (MASTER_ARCHETYPES) {return MASTER_ARCHETYPES;}

  try {
    const response = await fetch('systems/foundryvtt-swse/data/class-archetypes.json');
    if (!response.ok) {throw new Error(`Failed to load: ${response.statusText}`);}

    const data = await response.json();
    MASTER_ARCHETYPES = data.classes || {};
    return MASTER_ARCHETYPES;
  } catch (err) {
    SWSELogger.error('[ArchetypeLoader] Failed to load master archetypes:', err);
    return {};
  }
}

/**
 * Clear all caches
 */
export function clearCache() {
  CACHE.clear();
  CLASS_CACHE.clear();
  MASTER_ARCHETYPES = null;
}
