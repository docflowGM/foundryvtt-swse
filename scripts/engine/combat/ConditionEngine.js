/**
 * ConditionEngine
 *
 * Owns: Condition track logic, condition cap rules, condition penalty calculations
 * Delegates to: ModifierEngine (for penalty derivation), ActorEngine (mutations)
 * Never owns: Combat math, damage calculation, mutation application
 *
 * Contract:
 * - Returns structured condition state decisions, not mutations
 * - Reads HouseRuleService for configuration
 * - Delegates all mutations to ActorEngine
 * - No direct actor.system writes
 * - No game.settings.get() calls
 *
 * Governance enforcement:
 * - Violates architecture if: writes to actor.system directly
 * - Violates architecture if: calls game.settings.get()
 * - Violates architecture if: imports sheets or UI
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class ConditionEngine {
  /**
   * Calculate condition track step based on HP damage.
   *
   * Determines which condition track step (0-5) actor should be at
   * based on current HP, max HP, and house rule variant.
   *
   * Does NOT mutate actor - returns calculation only.
   *
   * @param {Actor} actor - Target actor (read-only)
   * @param {Object} options - Calculation options
   * @returns {Object} Condition state { currentStep, maxStep, penalty, penalties }
   */
  static calculateConditionStep(actor, options = {}) {
    try {
      swseLogger.debug(`[ConditionEngine] Calculating condition step for ${actor?.name ?? 'unknown'}`, {
        options
      });

      if (!actor) {
        throw new Error('calculateConditionStep() requires actor');
      }

      // ====================================================================
      // PHASE 1: Read house rules once
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[ConditionEngine] Loaded house rules for condition calculation`);

      // ====================================================================
      // PHASE 2: Determine if condition track is enabled
      // ====================================================================
      const conditionEnabled = houseRules.conditionTrackEnabled?.enabled ?? true;

      if (!conditionEnabled) {
        swseLogger.debug(`[ConditionEngine] Condition track disabled by house rule`);
        return {
          enabled: false,
          currentStep: 0,
          maxStep: 0,
          penalty: 0,
          penalties: { attacks: 0, defenses: 0, checks: 0 }
        };
      }

      // ====================================================================
      // PHASE 3: Get current condition step from actor state
      // ====================================================================
      const currentStep = actor.system.conditionTrack?.current ?? 0;
      swseLogger.debug(`[ConditionEngine] Current condition step: ${currentStep}`);

      // ====================================================================
      // PHASE 4: Determine max condition step (house rule variant)
      // ====================================================================
      const conditionCapVariant = houseRules.conditionCapVariant?.value ?? 'STANDARD';
      const maxStep = this.#getConditionCap(conditionCapVariant);
      swseLogger.debug(`[ConditionEngine] Condition cap: ${maxStep} (variant: ${conditionCapVariant})`);

      // ====================================================================
      // PHASE 5: Get penalty for current step
      // ====================================================================
      const penalty = this.#getConditionPenalty(currentStep);
      swseLogger.debug(`[ConditionEngine] Condition penalty: ${penalty}`);

      // ====================================================================
      // PHASE 6: Build detailed penalty breakdown
      // ====================================================================
      const penalties = this.#buildPenaltyBreakdown(currentStep, penalty);

      // ====================================================================
      // PHASE 7: Check if persistent condition applies
      // ====================================================================
      const persistent = actor.system.conditionTrack?.persistent ?? false;
      swseLogger.debug(`[ConditionEngine] Persistent condition: ${persistent ? 'YES' : 'NO'}`);

      // ====================================================================
      // PHASE 8: Return decision structure
      // ====================================================================
      const result = {
        enabled: true,
        currentStep,
        maxStep,
        penalty,
        penalties,
        persistent,
        canImprove: currentStep > 0 && !persistent,
        canWorsen: currentStep < maxStep,
        timestamp: new Date().toISOString()
      };

      swseLogger.log(`[ConditionEngine] Condition calculation complete`, {
        actor: actor.name,
        currentStep,
        maxStep,
        penalty,
        persistent
      });

      return result;

    } catch (err) {
      swseLogger.error(`[ConditionEngine] calculateConditionStep failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      return {
        enabled: false,
        currentStep: 0,
        maxStep: 0,
        penalty: 0,
        penalties: { attacks: 0, defenses: 0, checks: 0 }
      };
    }
  }

  /**
   * Apply a condition step change to an actor.
   * Delegates mutation to ActorEngine.
   *
   * @param {Actor} actor - Target actor
   * @param {number} newStep - New condition step (will be clamped 0-maxStep)
   * @param {Object} options - Change options
   * @returns {Promise<Object>} Result { success, actor, oldStep, newStep }
   */
  static async applyConditionStep(actor, newStep, options = {}) {
    try {
      if (!actor) {
        throw new Error('applyConditionStep() requires actor');
      }

      if (typeof newStep !== 'number' || !Number.isFinite(newStep)) {
        throw new Error(`Invalid condition step: ${newStep}`);
      }

      swseLogger.debug(`[ConditionEngine] Applying condition step change to ${actor.name}`, {
        newStep,
        options
      });

      // ====================================================================
      // PHASE 1: Read house rules to determine max step
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      const conditionCapVariant = houseRules.conditionCapVariant?.value ?? 'STANDARD';
      const maxStep = this.#getConditionCap(conditionCapVariant);

      // ====================================================================
      // PHASE 2: Clamp new step to valid range
      // ====================================================================
      const oldStep = actor.system.conditionTrack?.current ?? 0;
      const clampedStep = Math.max(0, Math.min(newStep, maxStep));

      swseLogger.debug(`[ConditionEngine] Condition step change`, {
        from: oldStep,
        requested: newStep,
        clamped: clampedStep,
        maxStep
      });

      if (clampedStep === oldStep) {
        swseLogger.debug(`[ConditionEngine] Condition step unchanged (${oldStep})`);
        return {
          success: false,
          reason: 'No change in condition step',
          actor,
          oldStep,
          newStep: oldStep
        };
      }

      // ====================================================================
      // PHASE 3: Apply through ActorEngine
      // ====================================================================
      await ActorEngine.setConditionStep(actor, clampedStep, options.source || 'ConditionEngine');

      swseLogger.log(`[ConditionEngine] Condition step applied to ${actor.name}`, {
        from: oldStep,
        to: clampedStep,
        penalty: this.#getConditionPenalty(clampedStep)
      });

      return {
        success: true,
        actor,
        oldStep,
        newStep: clampedStep
      };

    } catch (err) {
      swseLogger.error(`[ConditionEngine] applyConditionStep failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        newStep
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Improve condition track (move up by 1).
   * Delegates mutation to ActorEngine.
   *
   * @param {Actor} actor - Target actor
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   */
  static async improveCondition(actor, options = {}) {
    try {
      if (!actor) {
        throw new Error('improveCondition() requires actor');
      }

      const currentStep = actor.system.conditionTrack?.current ?? 0;
      const isPersistent = actor.system.conditionTrack?.persistent ?? false;

      if (currentStep === 0) {
        return {
          success: false,
          reason: 'Already at best condition (step 0)'
        };
      }

      if (isPersistent) {
        return {
          success: false,
          reason: 'Cannot improve persistent condition'
        };
      }

      return this.applyConditionStep(actor, currentStep - 1, {
        ...options,
        source: 'improveCondition'
      });

    } catch (err) {
      swseLogger.error(`[ConditionEngine] improveCondition failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Worsen condition track (move down by 1).
   * Delegates mutation to ActorEngine.
   *
   * @param {Actor} actor - Target actor
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   */
  static async worsenCondition(actor, options = {}) {
    try {
      if (!actor) {
        throw new Error('worsenCondition() requires actor');
      }

      const currentStep = actor.system.conditionTrack?.current ?? 0;
      const houseRules = HouseRuleService.getAll();
      const conditionCapVariant = houseRules.conditionCapVariant?.value ?? 'STANDARD';
      const maxStep = this.#getConditionCap(conditionCapVariant);

      if (currentStep >= maxStep) {
        return {
          success: false,
          reason: `Already at worst condition (step ${maxStep})`
        };
      }

      return this.applyConditionStep(actor, currentStep + 1, {
        ...options,
        source: 'worsenCondition'
      });

    } catch (err) {
      swseLogger.error(`[ConditionEngine] worsenCondition failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Set persistent condition flag (cannot recover naturally).
   * Delegates mutation to ActorEngine.
   *
   * @param {Actor} actor - Target actor
   * @param {boolean} persistent - Should condition be persistent?
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   */
  static async setPersistent(actor, persistent, options = {}) {
    try {
      if (!actor) {
        throw new Error('setPersistent() requires actor');
      }

      swseLogger.debug(`[ConditionEngine] Setting persistent condition to ${persistent} for ${actor.name}`);

      await ActorEngine.setConditionPersistent(actor, persistent, options.source || 'ConditionEngine');

      swseLogger.log(`[ConditionEngine] Persistent condition set to ${persistent} for ${actor.name}`);

      return {
        success: true,
        actor,
        persistent
      };

    } catch (err) {
      swseLogger.error(`[ConditionEngine] setPersistent failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        persistent
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Get condition cap (max step) for a variant.
   *
   * @private
   */
  static #getConditionCap(variant) {
    const caps = {
      'STANDARD': 5,
      'VARIANT_6': 6,
      'VARIANT_UNLIMITED': 999
    };

    return caps[variant?.toUpperCase?.()] || 5;
  }

  /**
   * Get penalty value for a condition step.
   *
   * @private
   */
  static #getConditionPenalty(step) {
    const penalties = {
      0: 0,   // Normal
      1: -1,  // -1
      2: -2,  // -2
      3: -5,  // -5
      4: -10, // -10 (half speed)
      5: -999 // Helpless (effectively infinite)
    };

    return penalties[step] ?? 0;
  }

  /**
   * Build detailed penalty breakdown for UI display.
   *
   * @private
   */
  static #buildPenaltyBreakdown(step, basePenalty) {
    // RAW: All checks receive the same penalty
    // - Attacks: -X
    // - Defenses: -X
    // - Ability/Skill checks: -X

    return {
      attacks: basePenalty,
      defenses: basePenalty,
      checks: basePenalty,
      applyToAll: step > 0
    };
  }
}
