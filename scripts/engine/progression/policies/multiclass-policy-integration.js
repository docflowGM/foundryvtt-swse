/**
 * Multiclass Policy Integration
 *
 * Applies MulticlassPolicy evaluation results to actor state.
 * Handles slot creation, skill trainings, and history tracking.
 *
 * Called by feature dispatcher when class_level feature is processed.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MulticlassPolicy } from "./multiclass-policy.js";
import { FeatSlotSchema } from "../feats/feat-slot-schema.js";

export class MulticlassPolicyIntegration {
  /**
   * Apply multiclass policy to a new class level.
   *
   * This is called from the feature dispatcher when a class_level feature is processed.
   * It evaluates policy, creates slots, tracks history, and applies exploit guards.
   *
   * @param {Actor} actor - The actor being modified
   * @param {Object} newClassData - ClassModel for the new class
   * @param {Object} engine - ProgressionEngine instance (has pending data)
   * @returns {Promise<Object>} Result { success, policyApplied, slots, history }
   */
  static async applyPolicy(actor, newClassData, engine) {
    try {
      // Build context with class data cache
      const context = await this._buildContext(actor);

      // Evaluate policy
      const policyResult = MulticlassPolicy.evaluate(actor, newClassData, context);

      SWSELogger.log(
        `[MulticlassPolicy] Evaluated ${newClassData.id}: mode=${policyResult.mode}, ` +
        `featGrants=${policyResult.startingFeatGrants}, ` +
        `bonusSkills=${policyResult.bonusSkillTrainings}`
      );

      // Validate against history
      const historyValidation = MulticlassPolicy.validateHistoryEntry(
        actor,
        newClassData.id,
        policyResult
      );

      if (!historyValidation.valid) {
        SWSELogger.warn(`[MulticlassPolicy] History validation failed: ${historyValidation.reason}`);
        return {
          success: false,
          reason: historyValidation.reason,
          policyApplied: null
        };
      }

      // Create feat slots from starting feat list (ENHANCED only)
      const newSlots = this._createFeatSlots(newClassData, policyResult, actor);

      // Stage skill trainings (added to engine pending data)
      const skillTrainings = this._stageSkillTrainings(policyResult, engine);

      // Record in history
      const history = MulticlassPolicy.recordPolicyApplication(
        actor,
        newClassData.id,
        policyResult
      );

      return {
        success: true,
        policyApplied: policyResult,
        slots: newSlots,
        skillTrainings: skillTrainings,
        history: history
      };

    } catch (err) {
      SWSELogger.error("[MulticlassPolicy] Failed to apply policy:", err);
      return {
        success: false,
        reason: err.message,
        policyApplied: null
      };
    }
  }

  /**
   * Build context object with class data cache for policy evaluation.
   * @private
   */
  static async _buildContext(actor) {
    const { getClassData } = await import("../utils/class-data-loader.js");

    const classLevels = actor.system?.progression?.classLevels || [];
    const classDataCache = {};

    // Load class data for all classes the actor has
    for (const classLevel of classLevels) {
      if (!classDataCache[classLevel.class]) {
        const classData = await getClassData(classLevel.class);
        if (classData) {
          classDataCache[classLevel.class] = classData;
        }
      }
    }

    return { classDataCache };
  }

  /**
   * Create feat slots based on policy result.
   *
   * In RAW mode: No extra slots created (class provides 1 starting feat via normal flow)
   * In ENHANCED mode: Create one slot for each starting feat
   *
   * @private
   */
  static _createFeatSlots(newClassData, policyResult, actor) {
    const slots = [];

    // ENHANCED mode: Create slots for each starting feat in the class
    if (policyResult.mode === "ENHANCED") {
      const currentLevel = (actor.system?.progression?.classLevels?.length || 0) + 1;

      // Create feat slots for enhanced starting feats
      for (let i = 0; i < policyResult.startingFeatGrants; i++) {
        const slot = FeatSlotSchema.createHeroicSlot(
          "multiclassPolicy",
          currentLevel
        );

        slots.push(slot);

        SWSELogger.log(
          `[MulticlassPolicy] Created feat slot (${i + 1}/${policyResult.startingFeatGrants}) ` +
          `for ${newClassData.id}`
        );
      }
    }

    return slots;
  }

  /**
   * Stage skill trainings for later application.
   *
   * Bonusly trained skills from multiclass are tracked separately
   * and merged into skill selection pool.
   *
   * @private
   */
  static _stageSkillTrainings(policyResult, engine) {
    if (!engine.data) {
      engine.data = {};
    }

    if (!engine.data.multiclassBonusSkillTrainings) {
      engine.data.multiclassBonusSkillTrainings = [];
    }

    // Stage bonus skill trainings (delta from new class)
    const trainings = [];
    for (let i = 0; i < policyResult.bonusSkillTrainings; i++) {
      trainings.push({
        source: "multiclassPolicy",
        order: i
      });
    }

    engine.data.multiclassBonusSkillTrainings.push(...trainings);

    SWSELogger.log(
      `[MulticlassPolicy] Staged ${trainings.length} bonus skill trainings`
    );

    return trainings;
  }

  /**
   * Update actor's multiclassHistory in progression state.
   *
   * Must be called during ActorEngine update to persist history.
   *
   * @param {Object} actorUpdates - The update object for actor.system.progression
   * @param {Object} history - History entries from recordPolicyApplication()
   */
  static updateHistoryInActor(actorUpdates, history) {
    if (!actorUpdates.progression) {
      actorUpdates.progression = {};
    }

    if (!actorUpdates.progression.multiclassHistory) {
      actorUpdates.progression.multiclassHistory = {};
    }

    // Merge history entries
    Object.assign(actorUpdates.progression.multiclassHistory, history);
  }

  /**
   * Get current multiclass policy configuration for display.
   * @returns {Object} { mode, description }
   */
  static getConfiguration() {
    return {
      mode: MulticlassPolicy.getMode(),
      description: MulticlassPolicy.getDescription()
    };
  }
}

export default MulticlassPolicyIntegration;
