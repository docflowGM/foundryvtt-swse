/**
 * CombatMechanicsEngine
 *
 * Owns: Rule variant interpretation and selection
 * Delegates to: DamageResolutionEngine, ThresholdEngine, ConditionEngine, MovementEngine, ModifierEngine, SkillEngine
 * Never owns: Damage calculation, threshold math, condition mutations, armor rules
 *
 * Contract:
 * - Returns rule variant DECISION STRUCTURE, not calculations
 * - Only decides WHICH rules to apply, not HOW to apply them
 * - Reads HouseRuleService for configuration
 * - Does NOT perform damage math
 * - Does NOT compute thresholds
 * - Does NOT apply condition state changes
 * - No direct actor.system writes
 * - No game.settings.get() calls
 *
 * Governance enforcement:
 * - Violates architecture if: performs damage calculations
 * - Violates architecture if: writes to actor.system directly
 * - Violates architecture if: calls game.settings.get()
 * - Violates architecture if: imports sheets or UI
 * - Violates architecture if: applies condition mutations directly
 */

import { swseLogger } from '../../utils/logger.js';
import { HouseRuleService } from '../system/HouseRuleService.js';

export class CombatMechanicsEngine {
  /**
   * Select death resolution rule variant for an actor.
   *
   * Determines:
   * - Whether instant death threshold applies
   * - Which threshold variant (RAW vs variant)
   * - Whether massive damage rules apply
   *
   * Returns DECISION STRUCTURE only. Actual damage is computed by DamageResolutionEngine.
   *
   * @param {Actor} actor - Target actor (for logging context)
   * @param {Object} options - Selection options
   * @returns {Object} Rule variant decision { useInstantDeath, thresholdVariant, applyMassiveDamage }
   */
  static selectDeathVariant(actor, options = {}) {
    try {
      swseLogger.debug(`[CombatMechanicsEngine] Selecting death variant for ${actor?.name ?? 'unknown'}`, {
        options
      });

      // ====================================================================
      // PHASE 1: Read house rules once
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[CombatMechanicsEngine] Loaded house rules for death variant`);

      // ====================================================================
      // PHASE 2: Determine instant death applicability
      // ====================================================================
      const useInstantDeath = houseRules.deathInstantDeath?.enabled ?? true;
      swseLogger.debug(`[CombatMechanicsEngine] Instant death rule: ${useInstantDeath ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 3: Select threshold variant
      // ====================================================================
      const thresholdVariantKey = houseRules.deathThresholdVariant?.value ?? 'RAW';
      const thresholdVariant = this.#normalizeThresholdVariant(thresholdVariantKey);
      swseLogger.debug(`[CombatMechanicsEngine] Threshold variant: ${thresholdVariant}`);

      // ====================================================================
      // PHASE 4: Determine massive damage applicability
      // ====================================================================
      const applyMassiveDamage = houseRules.massiveDamage?.enabled ?? true;
      swseLogger.debug(`[CombatMechanicsEngine] Massive damage rule: ${applyMassiveDamage ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 5: Return decision structure
      // ====================================================================
      const decision = {
        useInstantDeath,
        thresholdVariant,
        applyMassiveDamage,
        timestamp: new Date().toISOString()
      };

      swseLogger.log(`[CombatMechanicsEngine] Death variant decision made`, {
        actor: actor?.name ?? 'unknown',
        decision
      });

      return decision;

    } catch (err) {
      swseLogger.error(`[CombatMechanicsEngine] selectDeathVariant failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      // Return safe defaults on error
      return {
        useInstantDeath: true,
        thresholdVariant: 'RAW',
        applyMassiveDamage: true
      };
    }
  }

  /**
   * Select condition track resolution variant for an actor.
   *
   * Determines:
   * - Whether condition track is in effect
   * - Condition cap rules
   * - Recovery mechanics
   *
   * Returns DECISION STRUCTURE only.
   *
   * @param {Actor} actor - Target actor (for logging context)
   * @param {Object} options - Selection options
   * @returns {Object} Rule variant decision { conditionEnabled, conditionCap, recoveryVariant }
   */
  static selectConditionVariant(actor, options = {}) {
    try {
      swseLogger.debug(`[CombatMechanicsEngine] Selecting condition variant for ${actor?.name ?? 'unknown'}`, {
        options
      });

      // ====================================================================
      // PHASE 1: Read house rules once
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[CombatMechanicsEngine] Loaded house rules for condition variant`);

      // ====================================================================
      // PHASE 2: Determine if condition track is enabled
      // ====================================================================
      const conditionEnabled = houseRules.conditionTrackEnabled?.enabled ?? true;
      swseLogger.debug(`[CombatMechanicsEngine] Condition track: ${conditionEnabled ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 3: Select condition cap variant
      // ====================================================================
      const conditionCapVariant = houseRules.conditionCapVariant?.value ?? 'STANDARD';
      const conditionCap = this.#normalizeConditionCap(conditionCapVariant);
      swseLogger.debug(`[CombatMechanicsEngine] Condition cap variant: ${conditionCap}`);

      // ====================================================================
      // PHASE 4: Select recovery variant
      // ====================================================================
      const recoveryVariant = houseRules.conditionRecoveryVariant?.value ?? 'STANDARD';
      swseLogger.debug(`[CombatMechanicsEngine] Condition recovery variant: ${recoveryVariant}`);

      // ====================================================================
      // PHASE 5: Return decision structure
      // ====================================================================
      const decision = {
        conditionEnabled,
        conditionCap,
        recoveryVariant,
        timestamp: new Date().toISOString()
      };

      swseLogger.log(`[CombatMechanicsEngine] Condition variant decision made`, {
        actor: actor?.name ?? 'unknown',
        decision
      });

      return decision;

    } catch (err) {
      swseLogger.error(`[CombatMechanicsEngine] selectConditionVariant failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      // Return safe defaults on error
      return {
        conditionEnabled: true,
        conditionCap: 5,
        recoveryVariant: 'STANDARD'
      };
    }
  }

  /**
   * Select skill resolution variant for an actor.
   *
   * Determines:
   * - Skill difficulty class selection
   * - Critical success/failure rules
   * - Circumstance modifier rules
   *
   * Returns DECISION STRUCTURE only.
   *
   * @param {Actor} actor - Target actor (for logging context)
   * @param {Object} options - Selection options
   * @returns {Object} Rule variant decision { skillVariant, criticalRules, modifierRules }
   */
  static selectSkillVariant(actor, options = {}) {
    try {
      swseLogger.debug(`[CombatMechanicsEngine] Selecting skill variant for ${actor?.name ?? 'unknown'}`, {
        options
      });

      // ====================================================================
      // PHASE 1: Read house rules once
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[CombatMechanicsEngine] Loaded house rules for skill variant`);

      // ====================================================================
      // PHASE 2: Select skill variant
      // ====================================================================
      const skillVariant = houseRules.skillVariant?.value ?? 'RAW';
      swseLogger.debug(`[CombatMechanicsEngine] Skill variant: ${skillVariant}`);

      // ====================================================================
      // PHASE 3: Determine critical success rules
      // ====================================================================
      const criticalSuccess = houseRules.criticalSuccess?.enabled ?? false;
      swseLogger.debug(`[CombatMechanicsEngine] Critical success: ${criticalSuccess ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 4: Determine critical failure rules
      // ====================================================================
      const criticalFailure = houseRules.criticalFailure?.enabled ?? false;
      swseLogger.debug(`[CombatMechanicsEngine] Critical failure: ${criticalFailure ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 5: Select circumstance modifier rules
      // ====================================================================
      const modifierRules = houseRules.skillModifierRules?.value ?? 'STANDARD';
      swseLogger.debug(`[CombatMechanicsEngine] Skill modifier rules: ${modifierRules}`);

      // ====================================================================
      // PHASE 6: Return decision structure
      // ====================================================================
      const decision = {
        skillVariant,
        criticalSuccess,
        criticalFailure,
        modifierRules,
        timestamp: new Date().toISOString()
      };

      swseLogger.log(`[CombatMechanicsEngine] Skill variant decision made`, {
        actor: actor?.name ?? 'unknown',
        decision
      });

      return decision;

    } catch (err) {
      swseLogger.error(`[CombatMechanicsEngine] selectSkillVariant failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      // Return safe defaults on error
      return {
        skillVariant: 'RAW',
        criticalSuccess: false,
        criticalFailure: false,
        modifierRules: 'STANDARD'
      };
    }
  }

  /**
   * Select armor and defense variant for an actor.
   *
   * Determines:
   * - Armor class calculation method
   * - Armor damage reduction rules
   * - Shield bonus rules
   *
   * Returns DECISION STRUCTURE only.
   *
   * @param {Actor} actor - Target actor (for logging context)
   * @param {Object} options - Selection options
   * @returns {Object} Rule variant decision { armorVariant, shieldVariant, armorDamageReduction }
   */
  static selectArmorVariant(actor, options = {}) {
    try {
      swseLogger.debug(`[CombatMechanicsEngine] Selecting armor variant for ${actor?.name ?? 'unknown'}`, {
        options
      });

      // ====================================================================
      // PHASE 1: Read house rules once
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[CombatMechanicsEngine] Loaded house rules for armor variant`);

      // ====================================================================
      // PHASE 2: Select armor class variant
      // ====================================================================
      const armorVariant = houseRules.armorVariant?.value ?? 'RAW';
      swseLogger.debug(`[CombatMechanicsEngine] Armor variant: ${armorVariant}`);

      // ====================================================================
      // PHASE 3: Select shield bonus variant
      // ====================================================================
      const shieldVariant = houseRules.shieldVariant?.value ?? 'RAW';
      swseLogger.debug(`[CombatMechanicsEngine] Shield variant: ${shieldVariant}`);

      // ====================================================================
      // PHASE 4: Determine armor damage reduction applicability
      // ====================================================================
      const armorDamageReduction = houseRules.armorDamageReduction?.enabled ?? true;
      swseLogger.debug(`[CombatMechanicsEngine] Armor damage reduction: ${armorDamageReduction ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 5: Return decision structure
      // ====================================================================
      const decision = {
        armorVariant,
        shieldVariant,
        armorDamageReduction,
        timestamp: new Date().toISOString()
      };

      swseLogger.log(`[CombatMechanicsEngine] Armor variant decision made`, {
        actor: actor?.name ?? 'unknown',
        decision
      });

      return decision;

    } catch (err) {
      swseLogger.error(`[CombatMechanicsEngine] selectArmorVariant failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      // Return safe defaults on error
      return {
        armorVariant: 'RAW',
        shieldVariant: 'RAW',
        armorDamageReduction: true
      };
    }
  }

  /**
   * Select initiative and action economy variant for combat.
   *
   * Determines:
   * - Initiative method (d20 vs passive)
   * - Action economy variant
   * - Surprise rules
   *
   * Returns DECISION STRUCTURE only.
   *
   * @param {Object} options - Selection options
   * @returns {Object} Rule variant decision { initiativeMethod, actionEconomyVariant, surpriseRules }
   */
  static selectCombatStartVariant(options = {}) {
    try {
      swseLogger.debug(`[CombatMechanicsEngine] Selecting combat start variant`, {
        options
      });

      // ====================================================================
      // PHASE 1: Read house rules once
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[CombatMechanicsEngine] Loaded house rules for combat start`);

      // ====================================================================
      // PHASE 2: Select initiative method
      // ====================================================================
      const initiativeMethod = houseRules.initiativeMethod?.value ?? 'd20';
      swseLogger.debug(`[CombatMechanicsEngine] Initiative method: ${initiativeMethod}`);

      // ====================================================================
      // PHASE 3: Select action economy variant
      // ====================================================================
      const actionEconomyVariant = houseRules.actionEconomyVariant?.value ?? 'STANDARD';
      swseLogger.debug(`[CombatMechanicsEngine] Action economy variant: ${actionEconomyVariant}`);

      // ====================================================================
      // PHASE 4: Determine surprise rules
      // ====================================================================
      const surpriseRulesEnabled = houseRules.surpriseRules?.enabled ?? true;
      swseLogger.debug(`[CombatMechanicsEngine] Surprise rules: ${surpriseRulesEnabled ? 'ENABLED' : 'DISABLED'}`);

      // ====================================================================
      // PHASE 5: Return decision structure
      // ====================================================================
      const decision = {
        initiativeMethod,
        actionEconomyVariant,
        surpriseRulesEnabled,
        timestamp: new Date().toISOString()
      };

      swseLogger.log(`[CombatMechanicsEngine] Combat start variant decision made`, {
        decision
      });

      return decision;

    } catch (err) {
      swseLogger.error(`[CombatMechanicsEngine] selectCombatStartVariant failed`, {
        error: err
      });

      // Return safe defaults on error
      return {
        initiativeMethod: 'd20',
        actionEconomyVariant: 'STANDARD',
        surpriseRulesEnabled: true
      };
    }
  }

  /**
   * Normalize threshold variant to canonical form.
   *
   * @private
   */
  static #normalizeThresholdVariant(variant) {
    const variants = {
      'RAW': 'RAW',
      'CORE': 'CORE',
      'WEB_ENHANCEMENT': 'WEB_ENHANCEMENT',
      'VARIANT': 'VARIANT'
    };

    return variants[variant?.toUpperCase?.() || ''] || 'RAW';
  }

  /**
   * Normalize condition cap to numeric value.
   *
   * @private
   */
  static #normalizeConditionCap(variant) {
    const caps = {
      'STANDARD': 5,
      'VARIANT_6': 6,
      'VARIANT_UNLIMITED': 999
    };

    return caps[variant?.toUpperCase?.()] || 5;
  }
}
