/**
 * DroidModValidator — Phase A Validation Engine
 *
 * Validates droid modifications:
 * - Hardpoint allocation constraints
 * - Credit budget availability
 * - Prerequisite requirements
 * - Modification conflict checks
 * - Installation/removal workflows
 */

import { DROID_HARDPOINT_ALLOCATION, validateModificationInstall } from '../data/droid-modifications.js';
import { swseLogger } from '../utils/logger.js';

export class DroidModValidator {
  /**
   * Validate the complete droid modifications state
   * @param {Object} droidSystems - actor.system.droidSystems
   * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
   */
  static validateDroidModifications(droidSystems) {
    const errors = [];
    const warnings = [];

    if (!droidSystems) {
      return {
        valid: false,
        errors: ['Droid systems data missing'],
        warnings: []
      };
    }

    // Check for mods array
    const mods = Array.isArray(droidSystems.mods) ? droidSystems.mods : [];
    if (mods.length === 0) {
      // No mods is OK, just informational
      return { valid: true, errors: [], warnings: ['No modifications installed'] };
    }

    // Validate hardpoint allocation
    const hardpointCheck = this._validateHardpointAllocation(droidSystems, mods);
    errors.push(...hardpointCheck.errors);
    warnings.push(...hardpointCheck.warnings);

    // Validate credit budget
    const creditCheck = this._validateCreditBudget(droidSystems, mods);
    errors.push(...creditCheck.errors);
    warnings.push(...creditCheck.warnings);

    // Validate individual modifications
    for (let i = 0; i < mods.length; i++) {
      const mod = mods[i];
      const modCheck = this._validateIndividualMod(mod, i, droidSystems);
      errors.push(...modCheck.errors);
      warnings.push(...modCheck.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate hardpoint allocation
   * @private
   */
  static _validateHardpointAllocation(droidSystems, mods) {
    const errors = [];
    const warnings = [];

    try {
      const degree = droidSystems.degree || 'Third-Degree';
      const size = droidSystems.size || 'medium';
      const allocation = DROID_HARDPOINT_ALLOCATION[degree]?.[size];

      if (!allocation) {
        errors.push(`Invalid droid degree (${degree}) or size (${size})`);
        return { errors, warnings };
      }

      const enabledMods = mods.filter(m => m.enabled !== false);
      const usedHardpoints = enabledMods.reduce((sum, m) => sum + (m.hardpointsRequired || 1), 0);

      if (usedHardpoints > allocation) {
        errors.push(
          `Hardpoint overallocation: Using ${usedHardpoints} of ${allocation} available ` +
          `(Degree: ${degree}, Size: ${size})`
        );
      } else if (usedHardpoints === allocation) {
        warnings.push(`All ${allocation} hardpoints are currently in use`);
      } else {
        const remaining = allocation - usedHardpoints;
        swseLogger.debug(`Droid has ${remaining} hardpoints available`);
      }
    } catch (err) {
      errors.push(`Error validating hardpoints: ${err.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate credit budget
   * @private
   */
  static _validateCreditBudget(droidSystems, mods) {
    const errors = [];
    const warnings = [];

    try {
      const credits = droidSystems.credits || {};
      const total = credits.total || 0;
      const spent = credits.spent || 0;
      const remaining = credits.remaining !== undefined ? credits.remaining : (total - spent);

      if (remaining < 0) {
        errors.push(
          `Credit budget exceeded: Spent ${spent} of ${total} available ` +
          `(${Math.abs(remaining)} credits over budget)`
        );
      } else if (remaining === 0) {
        warnings.push(`Credit budget fully expended`);
      } else {
        swseLogger.debug(`Droid has ${remaining} credits remaining`);
      }
    } catch (err) {
      errors.push(`Error validating credits: ${err.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate individual modification
   * @private
   */
  static _validateIndividualMod(mod, index, droidSystems) {
    const errors = [];
    const warnings = [];

    try {
      if (!mod) {
        errors.push(`Modification ${index} is null or undefined`);
        return { errors, warnings };
      }

      // Check required fields
      if (!mod.id) {
        errors.push(`Modification ${index} has no id`);
      }
      if (!mod.name) {
        warnings.push(`Modification ${index} has no name`);
      }

      // Check hardpoints
      if (!Number.isFinite(mod.hardpointsRequired) || mod.hardpointsRequired < 1) {
        errors.push(`Modification ${mod.name || index}: Invalid hardpoints required`);
      }

      // Check cost
      if (!Number.isFinite(mod.costInCredits) || mod.costInCredits < 0) {
        errors.push(`Modification ${mod.name || index}: Invalid cost in credits`);
      }

      // Validate modifiers array
      if (!Array.isArray(mod.modifiers)) {
        warnings.push(`Modification ${mod.name || index}: No modifiers array`);
      } else {
        for (let i = 0; i < mod.modifiers.length; i++) {
          const modCheck = this._validateModifierData(mod.modifiers[i], i, mod.name);
          errors.push(...modCheck.errors);
          warnings.push(...modCheck.warnings);
        }
      }

      // Check prerequisites if they exist
      if (mod.prerequisites) {
        const prereqCheck = this._validatePrerequisites(mod.prerequisites, droidSystems, mod.name);
        errors.push(...prereqCheck.errors);
        warnings.push(...prereqCheck.warnings);
      }
    } catch (err) {
      errors.push(`Error validating modification ${index}: ${err.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate modifier data within a modification
   * @private
   */
  static _validateModifierData(modifierData, index, modName) {
    const errors = [];
    const warnings = [];

    try {
      if (!modifierData || typeof modifierData !== 'object') {
        errors.push(`${modName}: Modifier ${index} is not an object`);
        return { errors, warnings };
      }

      // Check required fields
      if (!modifierData.target) {
        errors.push(`${modName}: Modifier ${index} has no target`);
      }

      if (!Number.isFinite(modifierData.value)) {
        errors.push(`${modName}: Modifier ${index} has invalid value`);
      }

      // Type is optional, defaults to 'untyped'
      const validTypes = ['untyped', 'competence', 'enhancement', 'circumstance', 'dodge', 'morale', 'insight', 'penalty'];
      const type = modifierData.type || 'untyped';
      if (!validTypes.includes(type)) {
        warnings.push(`${modName}: Modifier ${index} has unknown type "${type}"`);
      }
    } catch (err) {
      errors.push(`${modName}: Error validating modifier ${index}: ${err.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate modification prerequisites
   * @private
   */
  static _validatePrerequisites(prerequisites, droidSystems, modName) {
    const errors = [];
    const warnings = [];

    try {
      if (prerequisites.minLevel) {
        const droidLevel = droidSystems.level || 1;
        if (droidLevel < prerequisites.minLevel) {
          warnings.push(
            `${modName}: Requires droid level ${prerequisites.minLevel}, ` +
            `current level ${droidLevel}`
          );
        }
      }

      if (prerequisites.minDegree) {
        const degreeTier = this._degreeTier(droidSystems.degree || 'Third-Degree');
        const requiredTier = this._degreeTier(prerequisites.minDegree);
        if (degreeTier < requiredTier) {
          warnings.push(
            `${modName}: Requires minimum degree ${prerequisites.minDegree}`
          );
        }
      }

      if (prerequisites.sizeRestriction) {
        const size = droidSystems.size;
        if (size && size !== prerequisites.sizeRestriction) {
          errors.push(
            `${modName}: Requires size ${prerequisites.sizeRestriction}, ` +
            `droid is ${size}`
          );
        }
      }

      if (prerequisites.conflictsWith && Array.isArray(prerequisites.conflictsWith)) {
        const installedMods = (droidSystems.mods || [])
          .filter(m => m.enabled !== false)
          .map(m => m.id);
        for (const conflictId of prerequisites.conflictsWith) {
          if (installedMods.includes(conflictId)) {
            errors.push(`${modName}: Conflicts with installed modification "${conflictId}"`);
          }
        }
      }
    } catch (err) {
      errors.push(`${modName}: Error validating prerequisites: ${err.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Check if a modification can be installed
   * @param {Object} mod - Modification object
   * @param {Object} droidSystems - actor.system.droidSystems
   * @returns {Object} { canInstall: boolean, reason?: string }
   */
  static canInstallModification(mod, droidSystems) {
    return validateModificationInstall(mod, droidSystems);
  }

  /**
   * Check if a modification can be removed
   * @param {Object} mod - Modification object
   * @param {Object} droidSystems - actor.system.droidSystems
   * @returns {Object} { canRemove: boolean, reason?: string }
   */
  static canRemoveModification(mod, droidSystems) {
    // Check if other modifications depend on this one
    if (mod.id && droidSystems?.mods) {
      for (const otherMod of droidSystems.mods) {
        if (otherMod.id === mod.id) continue; // Skip self
        if (otherMod.enabled === false) continue; // Skip disabled
        if (otherMod.prerequisites?.requiredMods?.includes(mod.id)) {
          return {
            canRemove: false,
            reason: `Cannot remove: ${otherMod.name} depends on this modification`
          };
        }
      }
    }

    return { canRemove: true };
  }

  /**
   * Helper: Convert degree to numeric tier
   * @private
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
   * Get validation matrix for testing (7-test matrix)
   * @returns {Object} Test configuration
   */
  static getValidationMatrix() {
    return {
      tests: [
        {
          id: 'hardpoint-allocation',
          name: 'Hardpoint Allocation Validation',
          description: 'Verify hardpoint allocation respects degree and size limits',
          validates: ['allocation', 'degree', 'size']
        },
        {
          id: 'credit-budget',
          name: 'Credit Budget Validation',
          description: 'Verify credit spending does not exceed budget',
          validates: ['budget', 'spent', 'remaining']
        },
        {
          id: 'modifier-validation',
          name: 'Modifier Structure Validation',
          description: 'Verify all modifiers have required fields and valid types',
          validates: ['target', 'type', 'value']
        },
        {
          id: 'prerequisite-checks',
          name: 'Prerequisite Validation',
          description: 'Verify modifications meet level and degree requirements',
          validates: ['minLevel', 'minDegree', 'sizeRestriction']
        },
        {
          id: 'conflict-detection',
          name: 'Conflict Detection',
          description: 'Verify conflicting modifications are not simultaneously enabled',
          validates: ['conflicts', 'dependencies']
        },
        {
          id: 'modifier-injection',
          name: 'Modifier Injection',
          description: 'Verify droid mods are properly injected into modifier pipeline',
          validates: ['getAllModifiers', 'aggregateAll', 'applyAll']
        },
        {
          id: 'enabled-flag-respect',
          name: 'Enabled Flag Respect',
          description: 'Verify disabled modifications do not contribute to calculations',
          validates: ['enabled', 'disabled']
        }
      ]
    };
  }
}

export default DroidModValidator;
