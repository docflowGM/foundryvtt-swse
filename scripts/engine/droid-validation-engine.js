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
}
