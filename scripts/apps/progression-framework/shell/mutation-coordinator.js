/**
 * MutationCoordinator — Phase 3
 *
 * Coordinates the three-phase flow for applying character mutations:
 * 1. Validate (check that all selections are legal and complete)
 * 2. Compile (create explicit mutation plan from projection)
 * 3. Apply (execute mutations atomically)
 *
 * This separates the validation phase from the mutation phase,
 * allowing the confirm button to fail gracefully if validation doesn't pass.
 *
 * Usage:
 *   const coordinator = new MutationCoordinator();
 *   const result = await coordinator.confirmAndApply(shell, actor);
 *   if (!result.success) {
 *     displayValidationErrors(result.errors, result.warnings);
 *     return;
 *   }
 *   // Continue to next step or finalize
 */

import { ProjectionEngine } from './projection-engine.js';
import { MutationPlan } from './mutation-plan.js';
import { PrereqAdapter } from './prereq-adapter.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';
import { swseLogger } from '../../../utils/logger.js';

export class MutationCoordinator {
  /**
   * Run the full confirm→validate→apply flow.
   *
   * @param {Object} shell - ProgressionShell instance
   * @param {Actor} actor - Actor to apply mutations to
   * @returns {Promise<{success: boolean, errors: string[], warnings: string[], plan?: Object}>}
   */
  async confirmAndApply(shell, actor) {
    if (!shell?.progressionSession) {
      return {
        success: false,
        errors: ['No progression session available'],
        warnings: [],
      };
    }

    try {
      // Phase 1: Get or build current projection
      const projection = shell.progressionSession.currentProjection ||
                         ProjectionEngine.buildProjection(shell.progressionSession, actor);

      if (!projection) {
        return {
          success: false,
          errors: ['Failed to build character projection'],
          warnings: [],
        };
      }

      // Phase 2: Validate projection completeness and legality
      const validationResult = await this._validateProjection(projection, shell, actor);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        };
      }

      // Phase 3: Compile mutation plan
      const plan = MutationPlan.compileFromProjection(projection, actor, {
        mode: shell.mode || 'chargen',
      });

      // Phase 4: Validate mutation plan
      const planValidation = MutationPlan.validate(plan);
      if (!planValidation.isValid) {
        return {
          success: false,
          errors: planValidation.errors,
          warnings: planValidation.warnings,
        };
      }

      // Phase 5: Apply mutations atomically
      const applyResult = await MutationPlan.apply(plan, actor);
      if (!applyResult.success) {
        return {
          success: false,
          errors: applyResult.errors,
          warnings: [],
        };
      }

      swseLogger.log('[MutationCoordinator] Confirm/apply succeeded:', {
        mutations: applyResult.appliedMutations,
        actor: actor.name,
      });

      return {
        success: true,
        errors: [],
        warnings: validationResult.warnings || [],
        plan,
      };
    } catch (err) {
      swseLogger.error('[MutationCoordinator] Error in confirm/apply flow:', err);
      return {
        success: false,
        errors: [err.message || 'Unknown error during confirmation'],
        warnings: [],
      };
    }
  }

  /**
   * Validate the projection for completeness and legality.
   *
   * @param {Object} projection - Projected character
   * @param {Object} shell - ProgressionShell
   * @param {Actor} actor - Actor
   * @returns {Promise<{isValid: boolean, errors: string[], warnings: string[]}>}
   * @private
   */
  async _validateProjection(projection, shell, actor) {
    const errors = [];
    const warnings = [];

    // Check required identity selections
    if (!projection?.identity?.species && !projection?.identity?.class) {
      // For droid, species is optional
      const isDroid = projection?.identity?.class === 'Droid';
      if (!isDroid) {
        errors.push('Species selection is required');
      }
    }

    if (!projection?.identity?.class) {
      errors.push('Class selection is required');
    }

    // Check attributes are assigned
    if (!projection?.attributes || Object.keys(projection.attributes).length === 0) {
      errors.push('Character attributes must be assigned');
    } else {
      // Validate attribute values are in valid range
      const validAttrs = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      for (const attr of validAttrs) {
        const value = projection.attributes[attr];
        if (value === undefined || value === null) {
          errors.push(`Attribute ${attr} not assigned`);
        } else if (value < 3 || value > 18) {
          errors.push(`Attribute ${attr} out of range (3-18): ${value}`);
        }
      }
    }

    // Check dirty nodes (if any require re-validation)
    if (shell.progressionSession?.dirtyNodes && shell.progressionSession.dirtyNodes.size > 0) {
      warnings.push(
        `${shell.progressionSession.dirtyNodes.size} skill(s) or ability(ies) ` +
        `may have become invalid and should be reviewed`
      );
    }

    // Check projected warnings
    if (projection?.derived?.warnings && Array.isArray(projection.derived.warnings)) {
      warnings.push(...projection.derived.warnings);
    }

    // Validate feats/talents against projected attributes via PrereqAdapter
    try {
      const mockActor = PrereqAdapter.buildEvaluationContext(
        projection,
        shell.progressionSession,
        actor
      );

      // Sample validation: check if feats are still legal with projected attributes
      if (projection?.abilities?.feats && Array.isArray(projection.abilities.feats)) {
        for (const feat of projection.abilities.feats) {
          const featName = feat.name || feat.id || feat;
          const assessment = AbilityEngine.evaluateAcquisition(mockActor, { name: featName });
          if (!assessment.legal) {
            // Don't block on feat illegality (might be house rule or deferred)
            // Just warn
            warnings.push(`Feat "${featName}" may no longer be legal with current attributes`);
          }
        }
      }
    } catch (err) {
      swseLogger.warn('[MutationCoordinator] Error validating feats against projected state:', err);
      // Don't block; this is a secondary check
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
