/**
 * DroidValidationEngine — Domain rule validator for droid construction
 *
 * Enforces core droid requirements:
 * 1. Must have Locomotion (movement system)
 * 2. Must have at least one Appendage (manipulators)
 * 3. Must have Processor (computing core)
 * 4. Must have Armor (protective covering)
 *
 * Used by:
 * - DroidBuilderApp (UI validation feedback)
 * - Chargen (droid creation)
 * - Store (custom droid purchases)
 * - Sheet (completion status)
 */

export class DroidValidationEngine {
  /**
   * Validate complete droid configuration
   * Checks all required systems are present
   *
   * @param {Object} droidSystems - The droid systems configuration from builder
   * @returns {Object} {valid: boolean, errors: string[]}
   */
  static validateDroidConfiguration(droidSystems = {}) {
    const errors = [];

    // Locomotion: required (single selection)
    if (!droidSystems.locomotion?.id) {
      errors.push('Locomotion (movement system) must be selected');
    }

    // Appendages: required (at least one)
    if (!Array.isArray(droidSystems.appendages) || droidSystems.appendages.length === 0) {
      errors.push('At least one Appendage (manipulator) must be selected');
    }

    // Processor: required (single selection)
    if (!droidSystems.processor?.id) {
      errors.push('Processor (computing core) must be selected');
    }

    // Armor: required (single selection)
    if (!droidSystems.armor?.id) {
      errors.push('Armor (protective covering) must be selected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate locomotion selection
   * @param {Object} locomotion - The locomotion component {id, name, cost, speed}
   * @returns {boolean} True if valid
   */
  static validateLocomotion(locomotion = {}) {
    return Boolean(locomotion.id);
  }

  /**
   * Validate appendages (manipulators) selection
   * Requires at least one appendage
   *
   * @param {Array} appendages - Array of selected appendage components
   * @returns {boolean} True if at least one is selected
   */
  static validateAppendages(appendages = []) {
    return Array.isArray(appendages) && appendages.length > 0;
  }

  /**
   * Validate sensor selection
   * Optional but if selected must have valid structure
   *
   * @param {Array} sensors - Array of selected sensor components
   * @returns {boolean} True if valid (empty is OK, non-empty must have ids)
   */
  static validateSensors(sensors = []) {
    if (!Array.isArray(sensors)) return false;
    // Sensors are optional, but if present all must have ids
    return sensors.every(s => Boolean(s.id));
  }

  /**
   * Validate processor selection
   * @param {Object} processor - The processor component {id, name, cost, bonus}
   * @returns {boolean} True if valid
   */
  static validateProcessor(processor = {}) {
    return Boolean(processor.id);
  }

  /**
   * Validate armor configuration
   * @param {Object} armor - The armor component {id, name, cost, bonus}
   * @returns {boolean} True if valid
   */
  static validateArmor(armor = {}) {
    return Boolean(armor.id);
  }

  /**
   * Validate weapon selection
   * Optional but if selected must have valid structure
   *
   * @param {Array} weapons - Array of selected weapon components
   * @returns {boolean} True if valid (empty is OK, non-empty must have ids)
   */
  static validateWeapons(weapons = []) {
    if (!Array.isArray(weapons)) return false;
    // Weapons are optional, but if present all must have ids
    return weapons.every(w => Boolean(w.id));
  }

  /**
   * Validate accessory selection
   * Optional but if selected must have valid structure
   *
   * @param {Array} accessories - Array of selected accessory components
   * @returns {boolean} True if valid (empty is OK, non-empty must have ids)
   */
  static validateAccessories(accessories = []) {
    if (!Array.isArray(accessories)) return false;
    // Accessories are optional, but if present all must have ids
    return accessories.every(a => Boolean(a.id));
  }
}
