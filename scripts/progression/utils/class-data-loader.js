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
    swseLogger.log(`[CLASS-DATA-LOADER] Returning cached class data: ${classDataCache.size} classes`);
    return classDataCache;
  }

  // If already loading, wait for that promise
  if (loadPromise) {
    swseLogger.log('[CLASS-DATA-LOADER] Load already in progress, waiting...');
    return loadPromise;
  }

  // Start loading
  swseLogger.log('[CLASS-DATA-LOADER] Starting fresh class data load...');
  loadPromise = _loadFromCompendium();

  try {
    classDataCache = await loadPromise;
    swseLogger.log(`[CLASS-DATA-LOADER] Load complete with ${classDataCache.size} classes`);
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
    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Attempting to load from compendium...');
    swseLogger.log('[CLASS-DATA-LOADER] Available packs:', game.packs ? game.packs.size : 'PACKS NOT AVAILABLE');

    const pack = game.packs.get('foundryvtt-swse.classes');
    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Pack lookup result:`, pack ? 'FOUND' : 'NOT FOUND');

    if (!pack) {
      const errorMsg = 'Class Data Loader: foundryvtt-swse.classes compendium not found!';
      swseLogger.error(`[CLASS-DATA-LOADER] ERROR: ${errorMsg}`);
      swseLogger.error('[CLASS-DATA-LOADER] Available packs:', Array.from(game.packs.keys()));
      ui.notifications?.error(`${errorMsg} Character progression features will not work correctly. Please ensure the SWSE system is properly installed.`, { permanent: true });
      return cache;
    }

    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Fetching documents from pack...');
    const docs = await pack.getDocuments();
    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Retrieved ${docs ? docs.length : 'null/undefined'} documents`);

    if (!docs || docs.length === 0) {
      const errorMsg = 'Class Data Loader: Classes compendium is empty!';
      swseLogger.error(`[CLASS-DATA-LOADER] ERROR: ${errorMsg}`);
      ui.notifications?.error(`${errorMsg} No classes available for character creation.`, { permanent: true });
      return cache;
    }

    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Loaded ${docs.length} raw documents from compendium`);
    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Class names:', docs.map(d => d.name));

    for (const doc of docs) {
      try {
        swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Processing class "${doc.name}"...`);
        const classData = _normalizeClassData(doc);
        cache.set(doc.name, classData);
        swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Successfully normalized "${doc.name}"`);
      } catch (normalizeErr) {
        errors.push({ class: doc.name, error: normalizeErr.message });
        swseLogger.error(`[CLASS-DATA-LOADER] ERROR normalizing class "${doc.name}": ${normalizeErr.message}`, normalizeErr);
      }
    }

    swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Normalization complete. ${cache.size}/${docs.length} classes successfully loaded`);
    swseLogger.log('[CLASS-DATA-LOADER] _loadFromCompendium: Successfully normalized classes:', Array.from(cache.keys()));

    // Report normalization errors if any occurred
    if (errors.length > 0) {
      swseLogger.error(`[CLASS-DATA-LOADER] ERROR: ${errors.length} class(es) had normalization issues:`, errors);
      if (errors.length <= 3) {
        ui.notifications?.warn(`Some classes may not work correctly: ${errors.map(e => e.class).join(', ')}`);
      } else {
        ui.notifications?.warn(`${errors.length} classes had loading issues. Check console for details.`);
      }
    }

  } catch (err) {
    swseLogger.error('[CLASS-DATA-LOADER] CRITICAL ERROR in _loadFromCompendium:', err);
    swseLogger.error('[CLASS-DATA-LOADER] Error stack:', err.stack);
    ui.notifications?.error('Failed to load class data. Character progression may not work correctly.', { permanent: true });
  }

  swseLogger.log(`[CLASS-DATA-LOADER] _loadFromCompendium: Returning cache with ${cache.size} classes`);
  return cache;
}

/**
 * Normalize class document to expected format
 * @param {Document} doc - Class document from compendium
 * @returns {Object} Normalized class data
 */
function _normalizeClassData(doc) {
  const system = doc.system || {};
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: Starting normalization of "${doc.name}"`);
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: System data keys:`, Object.keys(system));

  // Parse hit die (e.g., "1d10" -> 10)
  // NOTE: Compendium may use camelCase 'hitDie' or snake_case 'hit_die'
  let hitDie = 6; // Default
  const hitDieString = system.hitDie || system.hit_die;
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" hitDieString: "${hitDieString}" -> parsed to ${hitDie}`);
  if (hitDieString) {
    const match = hitDieString.match(/\d+d(\d+)/);
    if (match) {
      hitDie = parseInt(match[1], 10);
      swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" hitDie parsed successfully: ${hitDie}`);
    }
  }

  // Determine skill points from trained skills or default
  // NOTE: Compendium may use camelCase 'trainedSkills' or snake_case 'trained_skills'
  let skillPoints = 4; // Default
  const trainedSkillsValue = system.trainedSkills ?? system.trained_skills;
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" trainedSkills raw value:`, trainedSkillsValue, '-> parsed to', skillPoints);
  if (trainedSkillsValue !== null && trainedSkillsValue !== undefined) {
    skillPoints = parseInt(trainedSkillsValue, 10) || 4;
    swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" skillPoints: ${skillPoints}`);
  }

  // Map babProgression to baseAttackBonus format
  let baseAttackBonus = "medium";
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" babProgression: "${system.babProgression}" -> `, baseAttackBonus);
  if (system.babProgression === "fast") {
    baseAttackBonus = "high";
  } else if (system.babProgression === "slow") {
    baseAttackBonus = "low";
  } else if (system.babProgression === "medium") {
    baseAttackBonus = "medium";
  }
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" final baseAttackBonus: ${baseAttackBonus}`);

  // Get flat defense bonuses from compendium
  // These are STATIC values that don't scale with level
  // E.g., Jedi always gives Fort +1, Ref +1, Will +1 regardless of level count
  const defenses = {
    fortitude: system.defenses?.fortitude || 0,
    reflex: system.defenses?.reflex || 0,
    will: system.defenses?.will || 0
  };
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" defenses:`, defenses);

  // Parse level progression to extract features by level
  // NOTE: Compendium may use camelCase 'levelProgression' or snake_case 'level_progression'
  const levelProgression = system.levelProgression || system.level_progression || [];
  const featuresByLevel = {};
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" levelProgression found:`, levelProgression ? 'YES' : 'NO', 'array length:', Array.isArray(levelProgression) ? levelProgression.length : 'N/A');

  // Validate that levelProgression is an array
  if (!Array.isArray(levelProgression)) {
    swseLogger.error(`[CLASS-DATA-LOADER] ERROR: level_progression is not an array for ${doc.name}, type: ${typeof levelProgression}`);
  } else {
    swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" Processing ${levelProgression.length} level entries`);
    for (const levelData of levelProgression) {
      if (!levelData || typeof levelData !== 'object') {
        swseLogger.error(`[CLASS-DATA-LOADER] ERROR: Invalid level data in ${doc.name}:`, levelData);
        continue;
      }

      // Normalize level number (compendium often stores as string)
      const levelKey = typeof levelData.level === "number"
        ? levelData.level
        : parseInt(levelData.level, 10);

      // Extract features array
      const features = Array.isArray(levelData.features) ? levelData.features : [];
      swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" Level ${levelKey}: ${features.length} features`);

      const validFeatures = features.filter(f => f && typeof f === 'object');

      featuresByLevel[levelKey] = {
        features: validFeatures,
        bonusFeats: validFeatures.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
        talents: validFeatures.filter(f => f.type === 'talent_choice').length,
        forcePoints: Number(levelData.force_points || 0)
      };
      swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" Level ${levelKey} processed: ${featuresByLevel[levelKey].bonusFeats} bonus feats, ${featuresByLevel[levelKey].talents} talents, ${featuresByLevel[levelKey].forcePoints} force points`);
    }
    swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" Total levels processed: ${Object.keys(featuresByLevel).length}`);
  }

  // Extract starting feats from level 1 or starting_features
  // NOTE: Compendium may use camelCase 'startingFeatures' or snake_case 'starting_features'
  const startingFeaturesRaw = system.startingFeatures || system.starting_features;
  const startingFeatures = Array.isArray(startingFeaturesRaw) ? startingFeaturesRaw : [];
  const level1Data = Array.isArray(levelProgression) ? levelProgression.find(l => l && l.level === 1) : null;
  const level1Features = Array.isArray(level1Data?.features) ? level1Data.features : [];
  const startingFeats = [];
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" startingFeatures found: ${startingFeatures.length}, level 1 features found: ${level1Features.length}`);

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
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" startingFeats extracted:`, startingFeats);

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
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" forceSensitive: ${forceSensitive} (flag: ${system.forceSensitive || system.force_sensitive}, startingFeat: ${hasForceStartingFeat}, keyword: ${hasForceKeywordInName})`);

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
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" prestigeClass: ${prestigeClass} (coreClass: ${isCoreClass}, prestigeFlag: ${hasPrestigeFlag}, baseClassFlag: ${hasBaseClassFlag})`);

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
    swseLogger.error(`[CLASS-DATA-LOADER] ERROR: talentTrees is not an array for ${doc.name}, type: ${typeof talentTrees}`);
    talentTrees = [];
  }
  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" talentTrees:`, talentTrees);

  // If a core/base class has no talent trees, warn – this usually indicates a data issue
  if (talentTrees.length === 0 && !prestigeClass) {
    swseLogger.warn(`[CLASS-DATA-LOADER] WARNING: Class "${doc.name}" has no talent trees defined and is not a prestige class`);
  }

  swseLogger.log(`[CLASS-DATA-LOADER] _normalizeClassData: "${doc.name}" - FINAL DATA:`, {
    name: doc.name,
    hitDie,
    skillPoints,
    baseAttackBonus,
    classSkillsCount: (system.classSkills || system.class_skills || []).length,
    startingFeatsCount: startingFeats.length,
    talentTreesCount: talentTrees.length,
    defensesCount: Object.values(defenses).filter(v => v > 0).length,
    forceSensitive,
    prestigeClass,
    levelProgressionLevels: Object.keys(featuresByLevel).length
  });

  return {
    name: doc.name,
    hitDie: hitDie,
    skillPoints: skillPoints,
    baseAttackBonus: baseAttackBonus,
    classSkills: system.classSkills || system.class_skills || [],
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
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Looking for class "${className}"`);
  const cache = await loadClassData();
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Cache loaded with ${cache.size} classes`);
  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Available classes:`, Array.from(cache.keys()));

  const classData = cache.get(className);

  if (!classData) {
    swseLogger.error(`[CLASS-DATA-LOADER] ERROR: Class not found: "${className}". Available classes:`, Array.from(cache.keys()));
    return null;
  }

  swseLogger.log(`[CLASS-DATA-LOADER] getClassData: Successfully retrieved class "${className}"`, classData);
  return classData;
}

/**
 * Invalidate cache (force reload on next access)
 */
export function invalidateClassDataCache() {
  swseLogger.log('[CLASS-DATA-LOADER] invalidateClassDataCache: Clearing cache');
  swseLogger.log(`[CLASS-DATA-LOADER] invalidateClassDataCache: Was cached: ${classDataCache !== null}, Load in progress: ${loadPromise !== null}`);
  classDataCache = null;
  loadPromise = null;
  swseLogger.log('[CLASS-DATA-LOADER] invalidateClassDataCache: Cache cleared successfully');
}

/**
 * Check if cache is populated
 * @returns {boolean}
 */
export function isClassDataCached() {
  const isCached = classDataCache !== null;
  swseLogger.log(`[CLASS-DATA-LOADER] isClassDataCached: ${isCached}, size: ${isCached ? classDataCache.size : 0}`);
  return isCached;
}
