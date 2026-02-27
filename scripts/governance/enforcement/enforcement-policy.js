/**
 * PHASE 5B-1: Enforcement Policy Foundation
 *
 * The single authority for governance decisions.
 *
 * Pure, stateless, deterministic policy engine.
 * Does NOT:
 *   - Call AbilityEngine or PrerequisiteChecker
 *   - Inspect actor data or items
 *   - Know about tiers, mentors, or suggestions
 *   - Emit hooks or log decisions
 *   - Mutate state
 *
 * Only evaluates:
 *   - governanceMode (normal | override | freeBuild)
 *   - strictEnforcement toggle
 *   - violation severity (error | warning | structural)
 *
 * Returns deterministic decision:
 *   - ALLOW: Mutation may proceed
 *   - WARN: Mutation allowed but should show warning
 *   - BLOCK: Mutation must be rejected
 *
 * Contract: Same inputs = Same output (guaranteed)
 */

import { GovernanceSystem } from '../governance-system.js';

export class EnforcementPolicy {
  // Decision outcomes
  static DECISION = {
    ALLOW: 'allow',     // Mutation proceeds, no warning
    WARN: 'warn',       // Mutation proceeds, show warning
    BLOCK: 'block'      // Mutation rejected
  };

  // Violation severity levels
  static SEVERITY = {
    NONE: 'none',               // No violations
    WARNING: 'warning',         // Temporary, likely fixable
    ERROR: 'error',             // Blocking violation
    STRUCTURAL: 'structural'    // Permanent incompatibility
  };

  /**
   * Evaluate a proposed mutation against governance policy
   *
   * PURE FUNCTION - No side effects, no state mutation
   *
   * @param {Actor} actor - The actor being mutated
   * @param {Object} violations - Violations found: { severity, count }
   * @param {Object} options - { strictEnforcement }
   * @returns {EnforcementDecision}
   *
   * @example
   * const decision = EnforcementPolicy.evaluate(actor, { severity: 'error', count: 2 });
   * if (decision.outcome === 'block') {
   *   throw new Error(decision.reason);
   * }
   */
  static evaluate(actor, violations = {}, options = {}) {
    // Get governance policy
    const policy = this._getPolicy(actor, options);

    // Get violation severity (none if not provided)
    const severity = violations.severity ?? this.SEVERITY.NONE;
    const count = violations.count ?? 0;

    // Determine decision based on policy and violations
    const decision = this._determineDecision(policy, severity, count);

    // Return EnforcementDecision contract
    return {
      outcome: decision,
      reason: this._getReason(policy, severity, count, decision),
      policy: {
        mode: policy.mode,
        strictEnforcement: policy.strictEnforcement
      },
      violations: {
        severity,
        count
      }
    };
  }

  /**
   * Check if mutations should be blocked
   *
   * @param {Actor} actor - The actor being mutated
   * @param {Object} violations - Violations found: { severity, count }
   * @returns {boolean} - true if should block
   */
  static shouldBlock(actor, violations = {}) {
    const decision = this.evaluate(actor, violations);
    return decision.outcome === this.DECISION.BLOCK;
  }

  /**
   * Check if mutation should warn
   *
   * @param {Actor} actor - The actor being mutated
   * @param {Object} violations - Violations found: { severity, count }
   * @returns {boolean} - true if should warn
   */
  static shouldWarn(actor, violations = {}) {
    const decision = this.evaluate(actor, violations);
    return decision.outcome === this.DECISION.WARN;
  }

  /**
   * Get enforcement policy for an actor
   *
   * @private
   * @param {Actor} actor - The actor
   * @param {Object} options - Override options
   * @returns {Object} { mode, strictEnforcement }
   */
  static _getPolicy(actor, options = {}) {
    // Initialize governance if needed
    if (!actor.system.governance) {
      GovernanceSystem.initializeGovernance(actor);
    }

    return {
      mode: actor.system.governance.enforcementMode ?? GovernanceSystem.ENFORCEMENT_MODES.NORMAL,
      strictEnforcement: options.strictEnforcement ?? game.settings.get('foundryvtt-swse', 'strictEnforcementEnabled')
    };
  }

  /**
   * Determine enforcement decision based on policy and violations
   *
   * DECISION MATRIX:
   *
   * Mode: FREEBUILD or OVERRIDE
   *   → Always ALLOW (enforcement disabled, but tracked)
   *
   * Mode: NORMAL + No violations
   *   → Always ALLOW
   *
   * Mode: NORMAL + Violations exist
   *   → strictEnforcement OFF:
   *       - error/structural severity → BLOCK
   *       - warning severity → WARN
   *   → strictEnforcement ON:
   *       - any severity → BLOCK
   *
   * @private
   */
  static _determineDecision(policy, severity, count) {
    // FREEBUILD or OVERRIDE modes: enforcement disabled
    if (policy.mode === GovernanceSystem.ENFORCEMENT_MODES.FREEBUILD ||
        policy.mode === GovernanceSystem.ENFORCEMENT_MODES.OVERRIDE) {
      return this.DECISION.ALLOW;
    }

    // No violations: always allow
    if (severity === this.SEVERITY.NONE) {
      return this.DECISION.ALLOW;
    }

    // NORMAL mode with violations
    if (policy.mode === GovernanceSystem.ENFORCEMENT_MODES.NORMAL) {
      // Strict enforcement: block any violation
      if (policy.strictEnforcement) {
        return this.DECISION.BLOCK;
      }

      // Normal enforcement: block errors/structural, warn on warnings
      if (severity === this.SEVERITY.ERROR || severity === this.SEVERITY.STRUCTURAL) {
        return this.DECISION.BLOCK;
      }

      if (severity === this.SEVERITY.WARNING) {
        return this.DECISION.WARN;
      }
    }

    // Default: allow (shouldn't reach here)
    return this.DECISION.ALLOW;
  }

  /**
   * Generate human-readable reason for decision
   *
   * @private
   */
  static _getReason(policy, severity, count, decision) {
    if (decision === this.DECISION.ALLOW) {
      if (severity === this.SEVERITY.NONE) {
        return 'No violations detected.';
      }
      if (policy.mode === GovernanceSystem.ENFORCEMENT_MODES.FREEBUILD) {
        return `Free Build mode: ${count} violation(s) allowed.`;
      }
      if (policy.mode === GovernanceSystem.ENFORCEMENT_MODES.OVERRIDE) {
        return `Override mode: ${count} violation(s) allowed.`;
      }
    }

    if (decision === this.DECISION.WARN) {
      return `${count} warning violation(s) detected. Mutation allowed but review recommended.`;
    }

    if (decision === this.DECISION.BLOCK) {
      if (policy.strictEnforcement) {
        return `Strict enforcement enabled: ${count} violation(s) detected. Mutation blocked.`;
      }
      if (severity === this.SEVERITY.STRUCTURAL) {
        return `Permanent incompatibility detected. Mutation blocked.`;
      }
      return `${count} critical violation(s) detected. Mutation blocked.`;
    }

    return 'Unknown policy decision.';
  }

  /**
   * Get policy evaluation as JSON (for debugging/logging)
   *
   * @param {Actor} actor - The actor
   * @param {Object} violations - Violations found
   * @returns {Object} - Policy evaluation snapshot
   */
  static exportPolicy(actor, violations = {}) {
    const policy = this._getPolicy(actor);
    const decision = this.evaluate(actor, violations);

    return {
      timestamp: new Date().toISOString(),
      actor: actor.name,
      policy: {
        enforcementMode: policy.mode,
        strictEnforcement: policy.strictEnforcement
      },
      violations: {
        severity: violations.severity ?? this.SEVERITY.NONE,
        count: violations.count ?? 0
      },
      decision: {
        outcome: decision.outcome,
        reason: decision.reason
      }
    };
  }
}

// Export for testing and debugging
if (typeof window !== 'undefined') {
  window.EnforcementPolicy = EnforcementPolicy;
}
