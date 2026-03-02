/**
 * Centralized Force training engine.
 * Handles Force ability attribute selection, Dark Side score, and Force point management.
 * Single source of truth for all Force-related calculations.
 */
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ForceTrainingEngine {
  /**
   * Get the force training attribute (wisdom or charisma).
   * @returns {string} 'wisdom' or 'charisma'
   */
  static getTrainingAttribute() {
    return SettingsHelper.getString('forceTrainingAttribute', 'wisdom');
  }

  /**
   * Get the force ability modifier for an actor.
   * Uses forceTrainingAttribute setting to determine if WIS or CHA.
   *
   * @param {Actor} actor - The actor to check
   * @returns {number} The modifier from the appropriate ability
   */
  static getForceAbilityModifier(actor) {
    const attribute = ForceTrainingEngine.getTrainingAttribute();

    if (attribute === 'charisma') {
      return actor.system.attributes.cha?.mod || 0;
    } else {
      return actor.system.attributes.wis?.mod || 0;
    }
  }

  /**
   * Check if Force Sensitive feat is restricted to Jedi only.
   * @returns {boolean} True if restriction is enabled
   */
  static isForceSensitiveJediOnly() {
    return SettingsHelper.getBoolean('forceSensitiveJediOnly', false);
  }

  /**
   * Get the maximum Dark Side Score for an actor.
   * Formula: Wisdom × darkSideMaxMultiplier
   *
   * @param {Actor} actor - The actor to calculate for
   * @returns {number} Maximum DSS
   */
  static getMaxDarkSideScore(actor) {
    const wisdomMod = actor.system.attributes.wis?.mod || 0;
    const multiplier = SettingsHelper.getNumber('darkSideMaxMultiplier', 1);
    return Math.max(0, wisdomMod * multiplier);
  }

  /**
   * Check if using Dark Side power should auto-increase DSS.
   * @returns {boolean} True if auto-increase is enabled
   */
  static shouldAutoIncreaseDarkSideScore() {
    return SettingsHelper.getBoolean('darkSidePowerIncreaseScore', true);
  }

  /**
   * Get the Dark Side temptation handling mode.
   * @returns {string} 'strict', 'lenient', or 'narrative'
   */
  static getDarkSideTemptationMode() {
    return SettingsHelper.getString('darkSideTemptation', 'strict');
  }

  /**
   * Check if Block and Deflect talents are combined.
   * @returns {boolean} True if combined, false if separate
   */
  static hasBlockDeflectCombined() {
    const setting = SettingsHelper.getString('blockDeflectTalents', 'separate');
    return setting === 'combined';
  }

  /**
   * Check if non-Jedi melee weapons can block attacks.
   * @returns {boolean} True if alternative block mechanic is enabled
   */
  static hasBlockMechanicalAlternative() {
    return SettingsHelper.getBoolean('blockMechanicalAlternative', false);
  }

  /**
   * Validate Force-related settings.
   * @returns {Array<string>} Array of validation errors (empty if valid)
   */
  static validateSettings() {
    const errors = [];

    const trainingAttr = ForceTrainingEngine.getTrainingAttribute();
    if (!['wisdom', 'charisma'].includes(trainingAttr)) {
      errors.push(
        `Invalid forceTrainingAttribute: "${trainingAttr}". Must be "wisdom" or "charisma"`
      );
    }

    const blockDeflect = SettingsHelper.getString('blockDeflectTalents', 'separate');
    if (!['separate', 'combined'].includes(blockDeflect)) {
      errors.push(
        `Invalid blockDeflectTalents: "${blockDeflect}". Must be "separate" or "combined"`
      );
    }

    const temptation = ForceTrainingEngine.getDarkSideTemptationMode();
    if (!['strict', 'lenient', 'narrative'].includes(temptation)) {
      errors.push(
        `Invalid darkSideTemptation: "${temptation}". Must be "strict", "lenient", or "narrative"`
      );
    }

    const maxDSS = SettingsHelper.getNumber('darkSideMaxMultiplier', 1);
    if (maxDSS < 0) {
      errors.push(
        `Invalid darkSideMaxMultiplier: ${maxDSS}. Must be non-negative`
      );
    }

    return errors;
  }

  /**
   * Get all Force training settings.
   * @returns {object} Settings object
   */
  static getSettings() {
    return {
      trainingAttribute: ForceTrainingEngine.getTrainingAttribute(),
      blockDeflectCombined: ForceTrainingEngine.hasBlockDeflectCombined(),
      blockMechanicalAlternative: ForceTrainingEngine.hasBlockMechanicalAlternative(),
      forceSensitiveJediOnly: ForceTrainingEngine.isForceSensitiveJediOnly(),
      darkSideMaxMultiplier: SettingsHelper.getNumber('darkSideMaxMultiplier', 1),
      darkSidePowerIncreaseScore: ForceTrainingEngine.shouldAutoIncreaseDarkSideScore(),
      darkSideTemptation: ForceTrainingEngine.getDarkSideTemptationMode()
    };
  }
}
