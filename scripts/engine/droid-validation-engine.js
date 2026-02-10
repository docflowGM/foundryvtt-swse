/**
 * Droid Validation Engine
 * Pure validation functions for droid configuration
 * Reusable from builder, actor sheets, or programmatic creation
 */

export class DroidValidationEngine {
  /**
   * Validate complete droid configuration
   * @param {Object} droidSystems - actor.system.droidSystems
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateDroidConfiguration(droidSystems) {
    const errors = [];

    if (!droidSystems) {
      return {
        valid: false,
        errors: ['Droid systems data missing']
      };
    }

    // Required: Degree
    if (!droidSystems.degree) {
      errors.push('Droid must have a degree selected (Third, Second, or First)');
    }

    // Required: Size
    if (!droidSystems.size) {
      errors.push('Droid must have a size selected');
    }

    // Required: Primary systems
    if (!droidSystems.locomotion?.id) {
      errors.push('Droid must have a locomotion system');
    }
    if (!droidSystems.processor?.id) {
      errors.push('Droid must have a processor');
    }

    // Required: At least one appendage
    if (!droidSystems.appendages || droidSystems.appendages.length === 0) {
      errors.push('Droid must have at least one appendage');
    }

    // Budget check
    if (droidSystems.credits && droidSystems.credits.remaining < 0) {
      errors.push(`Droid exceeds credit budget by ${Math.abs(droidSystems.credits.remaining)}`);
    }

    // Degree-specific constraints
    const degreeErrors = this._validateDegreeConstraints(droidSystems);
    errors.push(...degreeErrors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that appendage count matches degree
   * @param {Object} droidSystems
   * @returns {string[]} Error messages
   */
  static _validateDegreeConstraints(droidSystems) {
    const errors = [];
    const appendageCount = droidSystems.appendages?.length || 0;

    const constraints = {
      'Third-Degree': { min: 2, max: 4 },
      'Second-Degree': { min: 2, max: 6 },
      'First-Degree': { min: 2, max: 8 }
    };

    const constraint = constraints[droidSystems.degree];
    if (constraint) {
      if (appendageCount < constraint.min) {
        errors.push(`${droidSystems.degree} droids need at least ${constraint.min} appendages, have ${appendageCount}`);
      }
      if (appendageCount > constraint.max) {
        errors.push(`${droidSystems.degree} droids can have at most ${constraint.max} appendages, have ${appendageCount}`);
      }
    }

    return errors;
  }

  /**
   * Check if a system can be added (budget, constraints)
   * @param {Object} system - System to add
   * @param {Object} droidSystems - Current droid configuration
   * @returns {Object} { canAdd: boolean, reason: string }
   */
  static canAddSystem(system, droidSystems) {
    if (!system || !droidSystems) {
      return {
        canAdd: false,
        reason: 'Invalid system or droid data'
      };
    }

    const cost = system.cost || 0;
    const remaining = droidSystems.credits?.remaining || 0;

    if (cost > remaining) {
      return {
        canAdd: false,
        reason: `Insufficient credits. Need ${cost}, have ${remaining} remaining.`
      };
    }

    // Size restrictions
    if (system.sizeRestriction && droidSystems.size !== system.sizeRestriction) {
      return {
        canAdd: false,
        reason: `This system requires size ${system.sizeRestriction}, but droid is ${droidSystems.size}`
      };
    }

    // Degree prerequisites
    if (system.degreePrerequisite) {
      const degreeRank = this._degreeTier(droidSystems.degree);
      const systemRank = this._degreeTier(system.degreePrerequisite);
      if (systemRank > degreeRank) {
        return {
          canAdd: false,
          reason: `This system requires at least ${system.degreePrerequisite} degree`
        };
      }
    }

    return { canAdd: true };
  }

  /**
   * Helper: Convert degree to numeric tier for comparison
   */
  static _degreeTier(degree) {
    const tiers = {
      'Third-Degree': 1,
      'Second-Degree': 2,
      'First-Degree': 3
    };
    return tiers[degree] || 0;
  }

  /**
   * Calculate total cost and credits remaining
   */
  static calculateBudget(droidSystems) {
    if (!droidSystems) {
      return { total: 0, spent: 0, remaining: 0 };
    }

    let spent = 0;

    if (droidSystems.locomotion?.cost) spent += droidSystems.locomotion.cost;
    if (droidSystems.processor?.cost) spent += droidSystems.processor.cost;

    (droidSystems.appendages || []).forEach(a => {
      spent += a.cost || 0;
    });
    (droidSystems.accessories || []).forEach(a => {
      spent += a.cost || 0;
    });

    const total = droidSystems.credits?.total || 0;

    return {
      total,
      spent,
      remaining: total - spent
    };
  }

  /**
   * Get degree constraints (for UI display)
   */
  static getDegreeConstraints(degree) {
    const constraints = {
      'Third-Degree': { min: 2, max: 4 },
      'Second-Degree': { min: 2, max: 6 },
      'First-Degree': { min: 2, max: 8 }
    };
    return constraints[degree] || { min: 0, max: 0 };
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2: STEP-SPECIFIC VALIDATION FUNCTIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Validate Locomotion step
   * Single-select system (user must choose exactly one)
   *
   * @param {Object} selectedValue - Locomotion object { id, name, cost, speed }
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateLocomotion(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    // Hard validation: required
    if (!selectedValue?.id) {
      errors.push('Locomotion system is required');
    }

    // Hard validation: must fit budget
    const budget = this.calculateBudget(droidSystems);
    if (selectedValue?.cost && selectedValue.cost > budget.remaining) {
      errors.push(
        `Locomotion cost ${selectedValue.cost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate Manipulators/Appendages step
   * Multi-select system (user must choose 1+ based on degree)
   *
   * @param {Array} selectedValue - Array of appendage objects
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateAppendages(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    const items = Array.isArray(selectedValue) ? selectedValue : [];

    // Hard validation: at least one required
    if (items.length === 0) {
      errors.push('Must select at least one manipulator');
    }

    // Hard validation: degree constraint
    const maxByDegree = {
      'Third-Degree': 4,
      'Second-Degree': 6,
      'First-Degree': 8
    };
    const max = maxByDegree[droidSystems.degree];
    if (max && items.length > max) {
      errors.push(
        `${droidSystems.degree} droids can have at most ${max} manipulators, selected ${items.length}`
      );
    }

    // Hard validation: budget
    const budget = this.calculateBudget(droidSystems);
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    if (totalCost > budget.remaining) {
      errors.push(
        `Manipulators cost ${totalCost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate Sensors step
   * Multi-select, optional system
   *
   * @param {Array} selectedValue - Array of sensor objects
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateSensors(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    const items = Array.isArray(selectedValue) ? selectedValue : [];

    // Soft validation: warn if no sensors
    if (items.length === 0) {
      warnings.push('No sensors selected; droid will have limited perception');
    }

    // Hard validation: budget
    const budget = this.calculateBudget(droidSystems);
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    if (totalCost > budget.remaining) {
      errors.push(
        `Sensors cost ${totalCost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate Processor step
   * Single-select system (user must choose exactly one)
   *
   * @param {Object} selectedValue - Processor object { id, name, cost, bonus }
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateProcessor(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    // Hard validation: required
    if (!selectedValue?.id) {
      errors.push('Processor is required');
    }

    // Hard validation: budget
    const budget = this.calculateBudget(droidSystems);
    if (selectedValue?.cost && selectedValue.cost > budget.remaining) {
      errors.push(
        `Processor cost ${selectedValue.cost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate Armor step
   * Single-select system (user must choose exactly one)
   *
   * @param {Object} selectedValue - Armor object { id, name, cost, bonus }
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateArmor(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    // Hard validation: required
    if (!selectedValue?.id) {
      errors.push('Armor is required');
    }

    // Hard validation: budget
    const budget = this.calculateBudget(droidSystems);
    if (selectedValue?.cost && selectedValue.cost > budget.remaining) {
      errors.push(
        `Armor cost ${selectedValue.cost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate Weapons step
   * Multi-select, optional system
   *
   * @param {Array} selectedValue - Array of weapon objects
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateWeapons(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    const items = Array.isArray(selectedValue) ? selectedValue : [];

    // Soft validation: warn if no weapons
    if (items.length === 0) {
      warnings.push('No weapons selected; droid will be defenseless in combat');
    }

    // Hard validation: budget
    const budget = this.calculateBudget(droidSystems);
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    if (totalCost > budget.remaining) {
      errors.push(
        `Weapons cost ${totalCost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate Accessories/Enhancements step
   * Multi-select, optional system
   *
   * @param {Array} selectedValue - Array of accessory objects
   * @param {Object} droidSystems - Full droid configuration
   * @param {Object} config - Step configuration
   * @returns {Object} { errors: string[], warnings: string[] }
   */
  static validateAccessories(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    const items = Array.isArray(selectedValue) ? selectedValue : [];

    // Hard validation: budget
    const budget = this.calculateBudget(droidSystems);
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    if (totalCost > budget.remaining) {
      errors.push(
        `Accessories cost ${totalCost} exceeds remaining budget ${budget.remaining}`
      );
    }

    return { errors, warnings };
  }
}
