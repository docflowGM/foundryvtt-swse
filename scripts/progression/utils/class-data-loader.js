/**
 * Class Data Loader
 * Loads class data from compendium instead of hardcoded PROGRESSION_RULES
 * This ensures prestige classes and all other classes are available
 */

import { swseLogger } from '../../utils/logger.js';

/**
 * Cache for loaded class data
 * @type {Map<string, Object>}
 */
let classDataCache = null;
let loadPromise = null;

/**
 * Load all class data from compendium
 * @returns {Promise<Map<string, Object>>} Map of class name to class data
 */
export async function loadClassData() {
  // Return cached data if available
  if (classDataCache) {
    return classDataCache;
  }

  // If already loading, wait for that promise
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = _loadFromCompendium();

  try {
    classDataCache = await loadPromise;
    return classDataCache;
  } finally {
    loadPromise = null;
  }
}

/**
 * Load class data from swse.classes compendium
 * @private
 */
async function _loadFromCompendium() {
  const cache = new Map();

  try {
    const pack = game.packs.get('swse.classes');

    if (!pack) {
      swseLogger.error('Class Data Loader: swse.classes compendium not found');
      return cache;
    }

    const docs = await pack.getDocuments();
    swseLogger.log(`Class Data Loader: Loaded ${docs.length} classes from compendium`);

    for (const doc of docs) {
      const classData = _normalizeClassData(doc);
      cache.set(doc.name, classData);
    }

    swseLogger.log(`Class Data Loader: Normalized ${cache.size} classes`, Array.from(cache.keys()));

  } catch (err) {
    swseLogger.error('Class Data Loader: Failed to load classes from compendium', err);
  }

  return cache;
}

/**
 * Normalize class document to expected format
 * @param {Document} doc - Class document from compendium
 * @returns {Object} Normalized class data
 */
function _normalizeClassData(doc) {
  const system = doc.system || {};

  // Parse hit die (e.g., "1d10" -> 10)
  let hitDie = 6; // Default
  if (system.hit_die) {
    const match = system.hit_die.match(/\d+d(\d+)/);
    if (match) {
      hitDie = parseInt(match[1]);
    }
  }

  // Determine skill points from trained skills or default
  let skillPoints = 4; // Default
  if (system.trainedSkills !== null && system.trainedSkills !== undefined) {
    skillPoints = parseInt(system.trainedSkills) || 4;
  }

  // Map babProgression to baseAttackBonus format
  let baseAttackBonus = "medium";
  if (system.babProgression === "fast") {
    baseAttackBonus = "high";
  } else if (system.babProgression === "slow") {
    baseAttackBonus = "low";
  } else if (system.babProgression === "medium") {
    baseAttackBonus = "medium";
  }

  // Get save progressions from defenses
  const defenses = system.defenses || {};

  // SWSE uses a simplified system: defenses are listed as numbers
  // Fort/Ref/Will defenses in the compendium represent the bonus per 2 levels
  // High saves: +2/2 levels (0, 1, 1, 2, 2, 3, 3, 4...)
  // Low saves: +0/3 levels (0, 0, 0, 1, 1, 1, 2, 2, 2...)

  const fortSave = (defenses.fortitude >= 2) ? "high" : "low";
  const refSave = (defenses.reflex >= 2) ? "high" : "low";
  const willSave = (defenses.will >= 2) ? "high" : "low";

  return {
    name: doc.name,
    hitDie: hitDie,
    skillPoints: skillPoints,
    baseAttackBonus: baseAttackBonus,
    classSkills: system.class_skills || [],
    startingFeats: [], // Starting feats are handled separately
    talentTrees: system.talent_trees || [],
    fortSave: fortSave,
    refSave: refSave,
    willSave: willSave,
    forceSensitive: system.forceSensitive || false,
    prestigeClass: !system.base_class,
    _raw: system // Keep raw data for reference
  };
}

/**
 * Get class data for a specific class
 * @param {string} className - Name of the class
 * @returns {Promise<Object|null>} Class data or null if not found
 */
export async function getClassData(className) {
  const cache = await loadClassData();
  const classData = cache.get(className);

  if (!classData) {
    swseLogger.warn(`Class Data Loader: Class not found: ${className}`);
  }

  return classData || null;
}

/**
 * Invalidate cache (force reload on next access)
 */
export function invalidateClassDataCache() {
  swseLogger.log('Class Data Loader: Cache invalidated');
  classDataCache = null;
  loadPromise = null;
}

/**
 * Check if cache is populated
 * @returns {boolean}
 */
export function isClassDataCached() {
  return classDataCache !== null;
}
