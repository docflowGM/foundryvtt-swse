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
 * Load class data from foundryvtt-swse.classes compendium
 * @private
 */
async function _loadFromCompendium() {
  const cache = new Map();
  const errors = [];

  try {
    const pack = game.packs.get('foundryvtt-swse.classes');

    if (!pack) {
      const errorMsg = 'Class Data Loader: foundryvtt-swse.classes compendium not found!';
      swseLogger.error(errorMsg);
      ui.notifications?.error(`${errorMsg} Character progression features will not work correctly. Please ensure the SWSE system is properly installed.`, { permanent: true });
      return cache;
    }

    const docs = await pack.getDocuments();

    if (!docs || docs.length === 0) {
      const errorMsg = 'Class Data Loader: Classes compendium is empty!';
      swseLogger.error(errorMsg);
      ui.notifications?.error(`${errorMsg} No classes available for character creation.`, { permanent: true });
      return cache;
    }

    swseLogger.log(`Class Data Loader: Loaded ${docs.length} classes from compendium`);

    for (const doc of docs) {
      try {
        const classData = _normalizeClassData(doc);
        cache.set(doc.name, classData);
      } catch (normalizeErr) {
        errors.push({ class: doc.name, error: normalizeErr.message });
        swseLogger.warn(`Class Data Loader: Failed to normalize class "${doc.name}": ${normalizeErr.message}`);
      }
    }

    swseLogger.log(`Class Data Loader: Normalized ${cache.size} classes`, Array.from(cache.keys()));

    // Report normalization errors if any occurred
    if (errors.length > 0) {
      swseLogger.warn(`Class Data Loader: ${errors.length} class(es) had normalization issues:`, errors);
      if (errors.length <= 3) {
        ui.notifications?.warn(`Some classes may not work correctly: ${errors.map(e => e.class).join(', ')}`);
      } else {
        ui.notifications?.warn(`${errors.length} classes had loading issues. Check console for details.`);
      }
    }

  } catch (err) {
    swseLogger.error('Class Data Loader: Failed to load classes from compendium', err);
    ui.notifications?.error('Failed to load class data. Character progression may not work correctly.', { permanent: true });
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
      hitDie = parseInt(match[1], 10);
    }
  }

  // Determine skill points from trained skills
  // Prestige classes typically have trainedSkills: 0
  // Base classes should have a positive value
  let skillPoints = 4; // Default for safety
  if (system.trainedSkills !== null && system.trainedSkills !== undefined) {
    skillPoints = parseInt(system.trainedSkills, 10);
    // Validate: base classes should have skill points > 0
    if (isNaN(skillPoints)) {
      swseLogger.warn(`Class Data Loader: Invalid trainedSkills value for ${doc.name}, using default 4`);
      skillPoints = 4;
    }
  } else {
    // trainedSkills is null/undefined - warn for base classes
    if (system.base_class === true || system.baseClass === true) {
      swseLogger.warn(`Class Data Loader: Base class "${doc.name}" has null trainedSkills, using default 4`);
    }
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

  // Validate that levelProgression is an array
  if (!Array.isArray(levelProgression)) {
    swseLogger.error(`Class Data Loader: level_progression is not an array for ${doc.name}, forcing to empty array`);
  } else if (levelProgression.length === 0) {
    swseLogger.error(`Class Data Loader: level_progression is empty for ${doc.name}! Class will not grant any features.`);
    ui.notifications?.warn(`Class "${doc.name}" has no level progression data. It will not grant feats, talents, or other features.`, { permanent: false });
  } else {
    for (const levelData of levelProgression) {
      if (!levelData || typeof levelData !== 'object') {
        swseLogger.warn(`Class Data Loader: Invalid level data in ${doc.name}`);
        continue;
      }

      // Normalize level number (compendium often stores as string)
      const levelKey = typeof levelData.level === "number"
        ? levelData.level
        : parseInt(levelData.level, 10);

      // Extract features array
      const features = Array.isArray(levelData.features) ? levelData.features : [];

      const validFeatures = features.filter(f => f && typeof f === 'object');

      featuresByLevel[levelKey] = {
        features: validFeatures,
        bonusFeats: validFeatures.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
        talents: validFeatures.filter(f => f.type === 'talent_choice').length,
        forcePoints: Number(levelData.force_points || 0)
      };
    }
  }

  // Extract starting feats from level 1 or starting_features
  const startingFeatures = Array.isArray(system.starting_features) ? system.starting_features : [];
  const level1Data = Array.isArray(levelProgression) ? levelProgression.find(l => l && l.level === 1) : null;
  const level1Features = Array.isArray(level1Data?.features) ? level1Data.features : [];
  const startingFeats = [];

  // Look for automatic feats (not choices) in starting features and level 1
  const allStartingFeatures = [...startingFeatures, ...level1Features].filter(f => f && typeof f === 'object');
  for (const feature of allStartingFeatures) {
    // Skip feat_choice and talent_choice - those are selections, not automatic grants
    if (feature.type !== 'feat_choice' && feature.type !== 'talent_choice') {
      if (feature.type === 'feat' || feature.name?.includes('Proficiency') || feature.name?.includes('Sensitivity')) {
        if (feature.name) {
          startingFeats.push(feature.name);
        }
      }
    }
  }

  // Detect force sensitivity from multiple sources
  // 1. Explicit forceSensitive flag in system data
  // 2. Starting feats that include "Force Sensitivity"
  // 3. Class name contains force-related keywords
  // 4. Talent trees include force-related trees
  const forceKeywords = ['force', 'jedi', 'sith', 'dark side', 'light side'];
  const hasForceKeywordInName = forceKeywords.some(keyword => doc.name.toLowerCase().includes(keyword));
  const hasForceStartingFeat = startingFeats.some(f => f.toLowerCase().includes('force sensitivity'));
  const hasForceTalentTree = (system.talent_trees || []).some(tree =>
    forceKeywords.some(keyword => tree.toLowerCase().includes(keyword))
  );

  const forceSensitive = system.forceSensitive === true ||
                         system.force_sensitive === true ||
                         hasForceStartingFeat ||
                         (hasForceKeywordInName && (hasForceTalentTree || hasForceStartingFeat));

  // Detect prestige class status from multiple sources
  // 1. Explicit base_class flag (if false or missing, it's prestige)
  // 2. Explicit prestige_class flag
  // 3. Required level > 1 in prerequisites
  const hasPrestigeFlag = system.prestige_class === true || system.prestigeClass === true;
  const hasBaseClassFlag = system.base_class === true || system.baseClass === true;
  const coreClasses = ['Soldier', 'Jedi', 'Noble', 'Scout', 'Scoundrel'];
  const isCoreClass = coreClasses.includes(doc.name);

  // If it's a core class, it's definitely not prestige
  // Otherwise, check flags - prestige if explicitly flagged or if not marked as base class
  const prestigeClass = !isCoreClass && (hasPrestigeFlag || !hasBaseClassFlag);

  // Normalize talent tree schema
  // Support multiple shapes:
  // - system.talentTrees (current compendium schema)
  // - system.talent_trees (older snake_case schema)
  // - system.talentTreeIds / talent_trees_ids (future-proofing)
  let talentTrees =
    system.talentTrees ||
    system.talent_trees ||
    system.talentTreeIds ||
    system.talent_trees_ids ||
    [];

  if (!Array.isArray(talentTrees)) {
    swseLogger.error(`Class Data Loader: talentTrees is not an array for ${doc.name}, forcing to empty array`);
    talentTrees = [];
  }

  // Filter out any null/undefined/empty values
  talentTrees = talentTrees.filter(tree => tree && typeof tree === 'string' && tree.trim().length > 0);

  // If a core/base class has no talent trees, warn – this usually indicates a data issue
  if (talentTrees.length === 0 && !prestigeClass) {
    swseLogger.error(`Class Data Loader: Base class "${doc.name}" has no talent trees defined! This will prevent talent selection.`);
    ui.notifications?.warn(`Base class "${doc.name}" is missing talent trees. Character creation may be incomplete.`, { permanent: false });
  }

  // Prestige classes can have no talent trees (they might grant other features)
  if (talentTrees.length === 0 && prestigeClass) {
    swseLogger.log(`Class Data Loader: Prestige class "${doc.name}" has no talent trees (this may be intentional)`);
  }

  // Validate and normalize class_skills array
  let classSkills = system.class_skills || [];
  if (!Array.isArray(classSkills)) {
    swseLogger.error(`Class Data Loader: class_skills is not an array for ${doc.name}, forcing to empty array`);
    classSkills = [];
  }
  // Filter out null/undefined/empty strings
  classSkills = classSkills.filter(skill => skill && typeof skill === 'string' && skill.trim().length > 0);

  return {
    name: doc.name,
    hitDie: hitDie,
    skillPoints: skillPoints,
    baseAttackBonus: baseAttackBonus,
    classSkills: classSkills,
    startingFeats: startingFeats,
    talentTrees: talentTrees,
    defenses: defenses, // Flat defense bonuses (fortitude, reflex, will)
    forceSensitive: forceSensitive,
    prestigeClass: prestigeClass,
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
