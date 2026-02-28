/**
 * MulticlassPolicy Engine
 *
 * Configurable policy layer for multiclass behavior.
 * Supports RAW (standard Saga rules) and ENHANCED (houserule) modes.
 *
 * Policy injection point: Class-add flow in ProgressionEngine
 * Does NOT modify BAB, Defense, DerivedCalculator, or mutation paths.
 */

export class MulticlassPolicy {
  /**
   * Evaluate multiclass policy for a given class addition.
   *
   * Reads individual feature flags to determine behavior.
   * All flags off = RAW (Standard Saga Rules)
   *
   * @param {Actor} actor - The actor gaining a class level
   * @param {Object} newClassData - ClassModel for the new class being added
   * @param {Object} context - Context object with progression state
   * @returns {Object} Policy result with grants and restrictions
   */
  static evaluate(actor, newClassData, context = {}) {
    const enhancedEnabled = game.settings.get("foundryvtt-swse", "multiclassEnhancedEnabled");

    // If enhanced mode disabled, always use RAW
    if (!enhancedEnabled) {
      return this._rawPolicy(actor, newClassData);
    }

    // Enhanced enabled: evaluate features
    return this._enhancedPolicy(actor, newClassData, context);
  }

  /**
   * RAW Policy: Standard Saga multiclass rules (unchanged behavior)
   *
   * - Base → Base: 1 starting feat
   * - Prestige → any: 0 starting feats
   * - No skill retraining
   * - No bonus skill trainings
   * - Standard skill selection pool
   *
   * @private
   */
  static _rawPolicy(actor, newClassData) {
    const isBase = newClassData.baseClass === true;
    const startingFeats = isBase ? 1 : 0;

    return {
      mode: "RAW",
      startingFeatGrants: startingFeats,
      startingFeatIds: [], // Empty in RAW; feats come from class data
      retrainAllowed: false,
      bonusSkillTrainings: 0,
      skillSelectionPool: new Set(newClassData.classSkills || []),
      exploitGuard: null
    };
  }

  /**
   * ENHANCED Policy: Granular feature-flag driven multiclass expansion
   *
   * Reads individual feature flags to determine behavior:
   * - multiclassRetraining: Allow skill retraining
   * - multiclassExtraStartingFeats: Grant full starting feat list
   * - multiclassBonusSkillDelta: Grant delta skill trainings
   *
   * Prestige classes ALWAYS use RAW behavior, regardless of flags.
   *
   * @private
   */
  static _enhancedPolicy(actor, newClassData, context = {}) {
    // CRITICAL: Prestige classes must never receive enhanced behavior
    if (newClassData.prestigeClass === true || newClassData.baseClass !== true) {
      return this._rawPolicy(actor, newClassData);
    }

    // Get existing base classes from progression
    const classLevels = actor.system?.progression?.classLevels || [];
    const baseClassesAdded = classLevels.filter(cl => {
      const classData = context.classDataCache?.[cl.class];
      return classData?.baseClass === true;
    });

    // If no existing base classes, fall back to RAW
    // (Enhanced features only apply to base→base multiclass)
    if (baseClassesAdded.length === 0) {
      return this._rawPolicy(actor, newClassData);
    }

    // Get original first base class for comparison
    const originalBaseClass = baseClassesAdded[0];
    const originalBaseClassData = context.classDataCache?.[originalBaseClass.class];

    if (!originalBaseClassData) {
      return this._rawPolicy(actor, newClassData);
    }

    // Read individual feature flags
    const allowRetraining = game.settings.get("foundryvtt-swse", "multiclassRetraining");
    const allowExtraFeats = game.settings.get("foundryvtt-swse", "multiclassExtraStartingFeats");
    const allowBonusSkills = game.settings.get("foundryvtt-swse", "multiclassBonusSkillDelta");

    // Calculate skill training delta (only relevant if bonus skills enabled)
    let bonusSkillTrainings = 0;
    if (allowBonusSkills) {
      const originalTrainings = originalBaseClassData.trainedSkills || 0;
      const newTrainings = newClassData.trainedSkills || 0;
      bonusSkillTrainings = Math.max(0, newTrainings - originalTrainings);
    }

    // Get full starting feat list (only relevant if extra feats enabled)
    let startingFeatIds = [];
    let startingFeatGrants = 1; // Default: always at least 1 from RAW
    if (allowExtraFeats) {
      startingFeatIds = this._getStartingFeatIds(newClassData);
      startingFeatGrants = startingFeatIds.length || 1;
    }

    // Aggregate skill pool: union of all class skills from possessed classes + new class
    const aggregatedSkills = new Set();

    // Add skills from all existing classes
    for (const classLevel of classLevels) {
      const classData = context.classDataCache?.[classLevel.class];
      if (classData?.classSkills) {
        classData.classSkills.forEach(skill => aggregatedSkills.add(skill));
      }
    }

    // Add skills from new class
    if (newClassData.classSkills) {
      newClassData.classSkills.forEach(skill => aggregatedSkills.add(skill));
    }

    return {
      mode: "ENHANCED",
      flags: {
        retraining: allowRetraining,
        extraStartingFeats: allowExtraFeats,
        bonusSkillDelta: allowBonusSkills
      },
      startingFeatGrants: startingFeatGrants,
      startingFeatIds: startingFeatIds,
      retrainAllowed: allowRetraining,
      bonusSkillTrainings: bonusSkillTrainings,
      skillSelectionPool: aggregatedSkills,
      exploitGuard: {
        classId: newClassData.id,
        originalBaseClassId: originalBaseClassData.id,
        deltaSkillTrainings: bonusSkillTrainings,
        grantedAt: new Date().toISOString(),
        enabledFlags: {
          retraining: allowRetraining,
          extraFeats: allowExtraFeats,
          bonusSkills: allowBonusSkills
        }
      }
    };
  }

  /**
   * Extract starting feat IDs from class data.
   *
   * In RAW mode, base classes grant 1 starting feat (determined elsewhere).
   * In ENHANCED mode, they grant the full list from startingFeatures.
   *
   * @private
   */
  static _getStartingFeatIds(classData) {
    if (!classData.startingFeatures || !Array.isArray(classData.startingFeatures)) {
      return [];
    }

    // Filter to feats only (exclude talents, force powers, etc.)
    // startingFeatures may contain mixed item types
    return classData.startingFeatures
      .filter(feature => feature.type === 'feat' || feature.itemType === 'feat')
      .map(feature => feature.id || feature.itemId)
      .filter(id => id);
  }

  /**
   * Validate that a multiclass history entry is safe to apply.
   *
   * Prevents:
   * - Duplicate delta skill trainings
   * - Prestige classes claiming enhanced benefits
   * - Removal and re-add exploits
   *
   * @param {Actor} actor
   * @param {String} classId
   * @param {Object} policyResult - Result from evaluate()
   * @returns {Object} { valid: boolean, reason: string }
   */
  static validateHistoryEntry(actor, classId, policyResult) {
    const history = actor.system?.progression?.multiclassHistory || {};

    // Check if this class has already had enhanced benefits applied
    if (history[classId]) {
      const existing = history[classId];

      // If delta skill trainings were already granted, reject duplicate
      if (existing.deltaSkillTrainings > 0 && policyResult.bonusSkillTrainings > 0) {
        return {
          valid: false,
          reason: `Delta skill trainings already granted for ${classId} in multiclass history`
        };
      }

      // If starting feats already granted in enhanced mode, reject duplicate
      if (existing.mode === "ENHANCED" && policyResult.mode === "ENHANCED") {
        return {
          valid: false,
          reason: `Enhanced benefits already applied for ${classId}`
        };
      }
    }

    return { valid: true, reason: null };
  }

  /**
   * Record multiclass policy application in actor history.
   * This prevents exploits from remove/re-add cycles.
   *
   * Called after policy is applied and mutations are committed.
   *
   * @param {Actor} actor
   * @param {String} classId
   * @param {Object} policyResult - Result from evaluate()
   * @returns {Object} Updated history entry
   */
  static recordPolicyApplication(actor, classId, policyResult) {
    const history = actor.system?.progression?.multiclassHistory || {};

    const entry = {
      classId: classId,
      mode: policyResult.mode,
      startingFeatGrants: policyResult.startingFeatGrants,
      retrainAllowed: policyResult.retrainAllowed,
      deltaSkillTrainings: policyResult.bonusSkillTrainings,
      appliedAt: new Date().toISOString(),
      exploitGuard: policyResult.exploitGuard
    };

    history[classId] = entry;
    return history;
  }

  /**
   * Get current multiclass policy configuration.
   * @returns {Object} { mode: "RAW"|"ENHANCED", flags: {...} }
   */
  static getConfiguration() {
    const enhancedEnabled = game.settings.get("foundryvtt-swse", "multiclassEnhancedEnabled");

    if (!enhancedEnabled) {
      return {
        mode: "RAW",
        enabled: false,
        flags: {
          retraining: false,
          extraStartingFeats: false,
          bonusSkillDelta: false
        }
      };
    }

    return {
      mode: "ENHANCED",
      enabled: true,
      flags: {
        retraining: game.settings.get("foundryvtt-swse", "multiclassRetraining"),
        extraStartingFeats: game.settings.get("foundryvtt-swse", "multiclassExtraStartingFeats"),
        bonusSkillDelta: game.settings.get("foundryvtt-swse", "multiclassBonusSkillDelta")
      }
    };
  }

  /**
   * Get human-readable policy description for UI.
   * @returns {String}
   */
  static getDescription() {
    const config = this.getConfiguration();

    if (!config.enabled) {
      return "RAW: Standard Saga multiclass rules (1 feat, no retraining, no bonus skills)";
    }

    const features = [];
    if (config.flags.retraining) features.push("skill retraining");
    if (config.flags.extraStartingFeats) features.push("full starting feats");
    if (config.flags.bonusSkillDelta) features.push("bonus skill trainings");

    if (features.length === 0) {
      return "Enhanced Mode enabled, but no features selected";
    }

    return `Enhanced: ${features.join(", ")}`;
  }
}
