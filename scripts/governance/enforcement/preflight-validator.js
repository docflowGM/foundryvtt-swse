/**
 * PHASE 5B-2: Preflight Validator
 *
 * Mutation gating layer that validates mutations before applying.
 *
 * Responsibilities:
 *   1. Validate mutation structure and constraints
 *   2. Evaluate legality of proposed changes
 *   3. Consult EnforcementPolicy for governance decisions
 *   4. Return structured preflight result
 *   5. Log for audit trail
 *
 * Does NOT:
 *   - Embed policy logic (delegates to EnforcementPolicy)
 *   - Emit hooks or make mutations
 *   - Know about UI or user experience
 *
 * Contract: PreflightResult
 */

import { EnforcementPolicy } from './enforcement-policy.js';
import { AbilityEngine } from '../../engine/abilities/AbilityEngine.js';
import { SWSELogger } from '../utils/logger.js';

export class PreflightValidator {
  /**
   * Validate a proposed mutation before applying
   *
   * @param {Actor} actor - The actor being mutated
   * @param {Object} mutation - The mutation to validate
   *   {
   *     operation: string (e.g., 'update', 'add-items', 'remove-items')
   *     updates: Object (field updates like {'system.level': 2})
   *     itemsToAdd: Item[] (items to add)
   *     itemsToRemove: Item[] (items to remove)
   *   }
   * @param {Object} context - Mutation context
   *   {
   *     source: string (where mutation came from)
   *     reason: string (why mutation is being applied)
   *     bypassValidation: boolean (skip validation, still evaluate policy)
   *   }
   *
   * @returns {PreflightResult}
   */
  static async validateBeforeMutation(actor, mutation, context = {}) {
    if (!actor) {
      return this._failResult('No actor provided');
    }

    // Step 1: Validate mutation structure
    const structureErrors = this._validateMutationStructure(mutation);
    if (structureErrors.length > 0) {
      return this._failResult('Invalid mutation structure', {
        errors: structureErrors
      });
    }

    // Step 2: Validate constraints (unless bypassed)
    const constraintErrors = !context.bypassValidation
      ? this._validateConstraints(actor, mutation)
      : [];

    // Step 3: Evaluate legality of proposed changes
    const legalityIssues = await this._evaluateLegality(actor, mutation);

    // Step 4: Combine all issues into violation summary
    const violations = this._summarizeViolations(constraintErrors, legalityIssues);

    // Step 5: Consult EnforcementPolicy for governance decision
    const decision = EnforcementPolicy.evaluate(actor, violations, context);

    // Step 6: Log for audit trail
    this._logPreflightEvaluation(actor, mutation, decision, context);

    // Return structured result
    return {
      allowed: decision.outcome !== EnforcementPolicy.DECISION.BLOCK,
      outcome: decision.outcome,
      reason: decision.reason,
      violations: {
        constraints: constraintErrors,
        legality: legalityIssues,
        severity: violations.severity,
        count: violations.count
      },
      policy: decision.policy,
      mutation: {
        operation: mutation.operation,
        itemCount: (mutation.itemsToAdd?.length || 0) + (mutation.itemsToRemove?.length || 0),
        fieldCount: Object.keys(mutation.updates || {}).length
      },
      context: {
        source: context.source || 'unknown',
        reason: context.reason || 'no reason provided',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Quick check: can mutation proceed without blocking?
   * Returns boolean for simple gate checks
   *
   * @param {Actor} actor
   * @param {Object} mutation
   * @returns {boolean}
   */
  static async canProceed(actor, mutation, context = {}) {
    const result = await this.validateBeforeMutation(actor, mutation, context);
    return result.allowed;
  }

  /**
   * Get severity for a mutation (useful for UI warnings)
   *
   * @param {Actor} actor
   * @param {Object} mutation
   * @returns {'allow' | 'warn' | 'block'}
   */
  static async getOutcome(actor, mutation, context = {}) {
    const result = await this.validateBeforeMutation(actor, mutation, context);
    return result.outcome;
  }

  /**
   * Validate mutation structure
   * @private
   */
  static _validateMutationStructure(mutation) {
    const errors = [];

    if (!mutation || typeof mutation !== 'object') {
      errors.push('Mutation must be an object');
      return errors;
    }

    if (!mutation.operation || typeof mutation.operation !== 'string') {
      errors.push('Mutation must have operation (string)');
    }

    if (mutation.updates && typeof mutation.updates !== 'object') {
      errors.push('Mutation.updates must be object or null');
    }

    if (mutation.itemsToAdd && !Array.isArray(mutation.itemsToAdd)) {
      errors.push('Mutation.itemsToAdd must be array or null');
    }

    if (mutation.itemsToRemove && !Array.isArray(mutation.itemsToRemove)) {
      errors.push('Mutation.itemsToRemove must be array or null');
    }

    return errors;
  }

  /**
   * Validate field constraints
   * (level must be 1-20, species can't be empty, etc.)
   * @private
   */
  static _validateConstraints(actor, mutation) {
    const errors = [];
    const constraints = this._getConstraints();

    for (const [path, value] of Object.entries(mutation.updates || {})) {
      const constraint = constraints[path];
      if (!constraint) continue;

      // Skip derived fields (shouldn't be set directly)
      if (constraint.isDerived) {
        errors.push(`Cannot set derived field: ${path}`);
        continue;
      }

      // Validate field value
      if (!constraint.validate(value)) {
        errors.push(`${path}: ${constraint.reason}`);
      }
    }

    return errors;
  }

  /**
   * Get field constraints
   * @private
   */
  static _getConstraints() {
    return {
      // Level constraints
      'system.level': {
        isDerived: false,
        validate: (value) => typeof value === 'number' && value >= 1 && value <= 20,
        reason: 'Level must be 1-20'
      },

      // Species constraints
      'system.species': {
        isDerived: false,
        validate: (value) => typeof value === 'string' && value.length > 0,
        reason: 'Species cannot be empty'
      },

      // Skill rank constraints
      'system.skills.*.ranks': {
        isDerived: false,
        validate: (value) => typeof value === 'number' && value >= 0 && value <= 5,
        reason: 'Skill ranks must be 0-5'
      },

      // No direct writes to derived fields
      'system.derived.baseAttackBonus': {
        isDerived: true,
        validate: () => false,
        reason: 'Derived field (set via class/feats)'
      },
      'system.derived.defenseBonus': {
        isDerived: true,
        validate: () => false,
        reason: 'Derived field (set via class/feats)'
      },
      'system.derived.hitPoints': {
        isDerived: true,
        validate: () => false,
        reason: 'Derived field (set via class/level)'
      }
    };
  }

  /**
   * Evaluate legality of proposed changes
   * (Would adding this item be legal? Would removing this class be legal?)
   * @private
   */
  static async _evaluateLegality(actor, mutation) {
    const issues = [];

    // Check items to add
    if (mutation.itemsToAdd && mutation.itemsToAdd.length > 0) {
      for (const item of mutation.itemsToAdd) {
        const evaluation = AbilityEngine.evaluateAcquisition(actor, item);
        if (!evaluation.legal) {
          issues.push({
            type: 'add',
            item: item.name,
            reason: evaluation.blockingReasons?.[0] || 'Illegal acquisition',
            missingPrereqs: evaluation.missingPrereqs,
            permanentlyBlocked: evaluation.permanentlyBlocked
          });
        }
      }
    }

    // Check items to remove
    // (Some items can't be removed if they're prerequisites for other items)
    if (mutation.itemsToRemove && mutation.itemsToRemove.length > 0) {
      for (const item of mutation.itemsToRemove) {
        // Check if removing this item would break prerequisites
        const dependents = this._checkItemDependents(actor, item);
        if (dependents.length > 0) {
          issues.push({
            type: 'remove',
            item: item.name,
            reason: 'Required by other items',
            dependents: dependents.map(d => d.name)
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check what items depend on a given item
   * @private
   */
  static _checkItemDependents(actor, item) {
    const dependents = [];
    const itemsOnActor = actor.items || [];

    for (const otherItem of itemsOnActor) {
      // Skip the item itself
      if (otherItem.id === item.id) continue;

      // Check if otherItem has prerequisites
      const prerequisites = otherItem.system?.prerequisites || [];
      if (prerequisites.some(p => p.name === item.name || p.id === item.id)) {
        dependents.push(otherItem);
      }
    }

    return dependents;
  }

  /**
   * Summarize violations into severity level
   * @private
   */
  static _summarizeViolations(constraintErrors, legalityIssues) {
    const allViolations = [...constraintErrors, ...legalityIssues];
    const count = allViolations.length;

    if (count === 0) {
      return {
        severity: EnforcementPolicy.SEVERITY.NONE,
        count: 0
      };
    }

    // Check if any legality issues are permanent blocks
    const hasStructuralIssue = legalityIssues.some(
      issue => issue.permanentlyBlocked === true
    );
    if (hasStructuralIssue) {
      return {
        severity: EnforcementPolicy.SEVERITY.STRUCTURAL,
        count
      };
    }

    // Check if we have many violations (escalate to error)
    if (count >= 3) {
      return {
        severity: EnforcementPolicy.SEVERITY.ERROR,
        count
      };
    }

    // Few violations = warning
    return {
      severity: EnforcementPolicy.SEVERITY.WARNING,
      count
    };
  }

  /**
   * Log preflight evaluation for audit trail
   * @private
   */
  static _logPreflightEvaluation(actor, mutation, decision, context) {
    if (!SWSELogger.isDev()) return; // Only log in dev mode

    SWSELogger.log('[PREFLIGHT] Mutation validation:', {
      actor: actor.name,
      operation: mutation.operation,
      decision: decision.outcome,
      reason: decision.reason,
      source: context.source || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Fail result (structure error or other blocking condition)
   * @private
   */
  static _failResult(reason, details = {}) {
    return {
      allowed: false,
      outcome: EnforcementPolicy.DECISION.BLOCK,
      reason: `Preflight validation failed: ${reason}`,
      violations: {
        constraints: details.errors || [],
        legality: [],
        severity: EnforcementPolicy.SEVERITY.ERROR,
        count: (details.errors || []).length
      },
      policy: {
        mode: 'unknown',
        strictEnforcement: false
      },
      mutation: {
        operation: 'unknown',
        itemCount: 0,
        fieldCount: 0
      },
      context: {
        source: 'validation',
        reason: 'structure error',
        timestamp: Date.now()
      }
    };
  }
}

// Export for testing and debugging
if (typeof window !== 'undefined') {
  window.PreflightValidator = PreflightValidator;
}
