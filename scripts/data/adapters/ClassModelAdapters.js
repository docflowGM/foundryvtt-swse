/**
 * ============================================
 * CLASS MODEL ADAPTERS
 * ============================================
 *
 * Thin translators that convert ClassModel to subsystem-specific schemas.
 *
 * This is where schema differences are explicitly documented and handled.
 * No subsystem talks to raw data anymore — they all go through adapters.
 *
 * ============================================
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Adapt ClassModel for the Progression Engine
 *
 * Progression Engine expects:
 * - baseAttackBonus: "low"|"medium"|"high" (not babProgression: "slow"|"medium"|"fast")
 * - skillPoints: trainedSkills value
 * - levelProgression: object keyed by level {1: {...}, 2: {...}} NOT array
 * - prestigeClass: !baseClass (inverted logic)
 *
 * @param {ClassModel} classModel
 * @returns {Object} Progression-engine-compatible class data
 */
export function adaptClassForProgression(classModel) {
  // Map babProgression to baseAttackBonus (different terminology)
  const babMap = {
    'slow': 'low',
    'medium': 'medium',
    'fast': 'high'
  };

  // Convert levelProgression array → object keyed by level
  const featuresByLevel = {};
  for (const entry of classModel.levelProgression) {
    featuresByLevel[entry.level] = {
      features: entry.features || [],
      bonusFeats: entry.bonus_feats || 0,
      talents: entry.bonus_talents || 0,
      forcePoints: entry.force_points || 0
    };
  }

  return {
    name: classModel.name,
    hitDie: classModel.hitDie,
    skillPoints: classModel.trainedSkills,
    baseAttackBonus: babMap[classModel.babProgression],
    classSkills: classModel.classSkills,
    startingFeats: classModel.startingFeatures.map(f => f.name || f),
    talentTrees: classModel.talentTreeNames,
    defenses: classModel.defenses,
    forceSensitive: classModel.forceSensitive,
    prestigeClass: !classModel.baseClass,  // Invert for progression logic
    levelProgression: featuresByLevel,  // Object keyed by level
    _canonical: classModel  // Keep reference to source
  };
}

/**
 * Adapt ClassModel for CharGen UI
 *
 * CharGen expects:
 * - hitDie: string "1d6" (not integer 6)
 * - talentTrees: array of tree names
 * - classSkills: array
 * - trainedSkills: OR skillPoints (either name works)
 *
 * @param {ClassModel} classModel
 * @returns {Object} CharGen-compatible class data
 */
export function adaptClassForCharGen(classModel) {
  return {
    id: classModel.id,
    name: classModel.name,
    sourceId: classModel.sourceId,

    baseClass: classModel.baseClass,
    prestigeClass: classModel.prestigeClass,

    hitDie: `1d${classModel.hitDie}`,  // Convert int → string format
    babProgression: classModel.babProgression,

    trainedSkills: classModel.trainedSkills,
    classSkills: classModel.classSkills,

    talentTrees: classModel.talentTreeNames,
    talentTreeIds: classModel.talentTreeIds,

    defenses: classModel.defenses,

    startingFeatures: classModel.startingFeatures,
    levelProgression: classModel.levelProgression,  // Keep as array

    forceSensitive: classModel.forceSensitive,
    grantsForcePoints: classModel.grantsForcePoints,
    forcePointBase: classModel.forcePointBase,

    role: classModel.role,

    baseHp: classModel.baseHp,
    startingCredits: classModel.startingCredits,

    description: classModel.description,
    img: classModel.img,

    _canonical: classModel  // Keep reference
  };
}

/**
 * Adapt ClassModel for Engine (SystemInitHooks) mutation
 *
 * Engine normalizer mutates classDoc.system in-place, maintaining dual properties.
 * This adapter returns data suitable for that mutation pattern.
 *
 * @param {ClassModel} classModel
 * @returns {Object} System-compatible format
 */
export function adaptClassForEngineMutation(classModel) {
  return {
    // Both naming conventions maintained (engine's pattern)
    hit_die: `1d${classModel.hitDie}`,
    hitDie: `1d${classModel.hitDie}`,

    bab_progression: classModel.babProgression,
    babProgression: classModel.babProgression,

    class_skills: classModel.classSkills,
    classSkills: classModel.classSkills,

    talent_trees: classModel.talentTreeNames,
    talentTrees: classModel.talentTreeNames,

    level_progression: classModel.levelProgression,
    levelProgression: classModel.levelProgression,

    trained_skills: classModel.trainedSkills,
    trainedSkills: classModel.trainedSkills,

    defenses: classModel.defenses,
    base_class: classModel.baseClass,
    baseClass: classModel.baseClass,

    starting_features: classModel.startingFeatures,
    startingFeatures: classModel.startingFeatures,

    force_sensitive: classModel.forceSensitive,
    forceSensitive: classModel.forceSensitive,

    grants_force_points: classModel.grantsForcePoints,
    grantsForcePoints: classModel.grantsForcePoints,

    force_point_base: classModel.forcePointBase,
    forcePointBase: classModel.forcePointBase,

    _canonical: classModel
  };
}

/**
 * Adapt ClassModel for Loader backward-compatibility
 *
 * class-data-loader returns data with different schema.
 * This adapter converts canonical model to what loader-dependent code expects.
 *
 * Used during transition: LoaderAdapter wraps old getClassData() calls
 * until all consumers are migrated.
 *
 * Loader schema:
 * - baseAttackBonus: "low"|"medium"|"high"
 * - skillPoints: trainedSkills
 * - levelProgression: object keyed by level
 * - prestigeClass: boolean
 * - forceSensitive: boolean (inferred)
 *
 * @param {ClassModel} classModel
 * @returns {Object} Loader-compatible class data
 */
export function adaptClassForLoaderCompatibility(classModel) {
  const babMap = {
    'slow': 'low',
    'medium': 'medium',
    'fast': 'high'
  };

  const featuresByLevel = {};
  for (const entry of classModel.levelProgression) {
    const validFeatures = entry.features.filter(f => f && typeof f === 'object');
    featuresByLevel[entry.level] = {
      features: validFeatures,
      bonusFeats: validFeatures.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
      talents: validFeatures.filter(f => f.type === 'talent_choice').length,
      forcePoints: entry.force_points || 0
    };
  }

  return {
    name: classModel.name,
    hitDie: classModel.hitDie,
    skillPoints: classModel.trainedSkills,
    baseAttackBonus: babMap[classModel.babProgression],
    classSkills: classModel.classSkills,
    startingFeats: classModel.startingFeatures
      .filter(f => f.type !== 'feat_choice' && f.type !== 'talent_choice')
      .map(f => f.name || f),
    talentTrees: classModel.talentTreeNames,
    defenses: classModel.defenses,
    forceSensitive: classModel.forceSensitive,
    prestigeClass: !classModel.baseClass,
    levelProgression: featuresByLevel,
    _raw: null,  // Loader kept _raw for debugging, we don't need it
    _canonical: classModel
  };
}

/**
 * Get the correct adapter for a target subsystem
 *
 * Usage:
 * const adapter = getAdapterFor('progression');
 * const adapted = adapter(classModel);
 *
 * @param {"progression"|"chargen"|"engine"|"loader"} target
 * @returns {Function} Adapter function
 */
export function getAdapterFor(target) {
  const adapters = {
    progression: adaptClassForProgression,
    chargen: adaptClassForCharGen,
    engine: adaptClassForEngineMutation,
    loader: adaptClassForLoaderCompatibility
  };

  if (!adapters[target]) {
    throw new Error(`[ClassModelAdapters] Unknown adapter target: ${target}`);
  }

  return adapters[target];
}

/**
 * Log adapter selection (for debugging schema mismatches)
 */
export function logAdapterSelection(target, classModel) {
  SWSELogger.log(`[Adapters] Adapting "${classModel.name}" for: ${target}`);
}
