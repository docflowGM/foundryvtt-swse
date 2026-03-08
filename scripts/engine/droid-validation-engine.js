/**
 * DroidValidationEngine — Minimal validation stub for droid builder UI
 *
 * Provides validation feedback for droid system configurations.
 * All validation passes by default (actual constraints enforced at save time by StepController).
 */

export class DroidValidationEngine {
  /**
   * Validate a droid configuration
   * @param {Object} droidSystems - The droid systems configuration
   * @returns {Object} {valid: boolean, errors: string[]}
   */
  static validateDroidConfiguration(droidSystems = {}) {
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Validate locomotion selection
   * @returns {boolean} Always true — actual validation at save
   */
  static validateLocomotion() {
    return true;
  }

  /**
   * Validate manipulator count
   * @returns {boolean} Always true — actual validation at save
   */
  static validateManipulators() {
    return true;
  }

  /**
   * Validate sensor selection
   * @returns {boolean} Always true — actual validation at save
   */
  static validateSensors() {
    return true;
  }

  /**
   * Validate processor selection
   * @returns {boolean} Always true — actual validation at save
   */
  static validateProcessor() {
    return true;
  }

  /**
   * Validate armor configuration
   * @returns {boolean} Always true — actual validation at save
   */
  static validateArmor() {
    return true;
  }

  /**
   * Validate weapon selection
   * @returns {boolean} Always true — actual validation at save
   */
  static validateWeapons() {
    return true;
  }

  /**
   * Validate accessory selection
   * @returns {boolean} Always true — actual validation at save
   */
  static validateAccessories() {
    return true;
  }
}
