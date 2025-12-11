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
    const pack = game.packs.get('foundryvtt-swse.classes');

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

  // Get flat defense bonuses from compendium
  // These are STATIC values that don't scale with level
  // E.g., Jedi always gives Fort +1, Ref +1, Will +1 regardless of level count
  const defenses = {
    fortitude: system.defenses?.fortitude || 0,
    reflex: system.defenses?.reflex || 0,
    will: system.defenses?.will || 0
  };

  // Parse level progression to extract features by level
  const levelProgression = system.level_progression || [];
  const featuresByLevel = {};

  for (const levelData of levelProgression) {
    const level = levelData.level;
    const features = levelData.features || [];

    featuresByLevel[level] = {
      features: features,
      bonusFeats: features.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
      talents: features.filter(f => f.type === 'talent_choice').length,
      forcePoints: levelData.force_points
    };
  }

  // Extract starting feats from level 1 or starting_features
  const startingFeatures = system.starting_features || [];
  const level1Features = levelProgression.find(l => l.level === 1)?.features || [];
  const startingFeats = [];

  // Look for automatic feats (not choices) in starting features and level 1
  for (const feature of [...startingFeatures, ...level1Features]) {
    // Skip feat_choice and talent_choice - those are selections, not automatic grants
    if (feature.type !== 'feat_choice' && feature.type !== 'talent_choice') {
      if (feature.type === 'feat' || feature.name?.includes('Proficiency') || feature.name?.includes('Sensitivity')) {
        startingFeats.push(feature.name);
      }
    }
  }

  return {
    name: doc.name,
    hitDie: hitDie,
    skillPoints: skillPoints,
    baseAttackBonus: baseAttackBonus,
    classSkills: system.class_skills || [],
    startingFeats: startingFeats,
    talentTrees: system.talent_trees || [],
    defenses: defenses, // Flat defense bonuses (fortitude, reflex, will)
    forceSensitive: system.forceSensitive || false,
    prestigeClass: !system.base_class,
    levelProgression: featuresByLevel, // Parsed level progression
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
