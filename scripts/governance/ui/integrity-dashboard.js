/**
 * PHASE 5B-4: Integrity Dashboard
 *
 * Exposes complete compliance state for an actor.
 * Unified interface for all governance and violation data.
 *
 * Used by:
 *   - UI sheets (integrity banner, violation lists)
 *   - External systems (audit trails, reports)
 *   - Debugging and diagnostics
 */

import { MissingPrereqsTracker } from '../integrity/missing-prereqs-tracker.js';
import { PrerequisiteIntegrityChecker } from '../integrity/prerequisite-integrity-checker.js';
import { SeverityClassifier } from '../integrity/severity-classifier.js';
import { GovernanceSystem } from '../governance-system.js';
import { EnforcementPolicy } from '../enforcement/enforcement-policy.js';
import { SWSELogger } from '../utils/logger.js';

export class IntegrityDashboard {
  /**
   * Get complete compliance state for an actor
   *
   * @param {Actor} actor - The actor to evaluate
   * @returns {DashboardState} - Complete compliance information
   */
  static getState(actor) {
    if (!actor) {
      return this._emptyState();
    }

    try {
      // Get all tracking data
      const missingPrereqs = MissingPrereqsTracker.getMissingPrereqs(actor);
      const snapshot = PrerequisiteIntegrityChecker.getSnapshot(actor.id);
      const governance = GovernanceSystem.initializeGovernance(actor);

      // Build compliance state
      return {
        // Actor identification
        actor: {
          id: actor.id,
          name: actor.name,
          type: actor.type
        },

        // Compliance status
        compliance: {
          isCompliant: missingPrereqs.length === 0,
          totalViolations: missingPrereqs.length,
          evaluatedAt: snapshot?.evaluatedAt || Date.now()
        },

        // Severity breakdown
        severity: this._getSeverityBreakdown(missingPrereqs),

        // Detailed violations
        violations: missingPrereqs.map(violation =>
          this._buildViolationDetail(violation)
        ),

        // Governance context
        governance: {
          mode: governance.enforcementMode,
          visibilityMode: governance.visibilityMode,
          approvedBy: governance.approvedBy,
          reason: governance.reason,
          timestamp: governance.timestamp
        },

        // Enforcement policy
        policy: this._getPolicyState(actor),

        // Recommendations
        recommendations: this._getRecommendations(missingPrereqs),

        // Summary
        summary: this._buildSummary(actor, missingPrereqs)
      };

    } catch (err) {
      SWSELogger.error('[INTEGRITY-DASHBOARD] getState error:', err);
      return this._emptyState();
    }
  }

  /**
   * Get severity breakdown
   * @private
   */
  static _getSeverityBreakdown(violations) {
    const summary = SeverityClassifier.summarizeSeverity(
      Object.fromEntries(violations.map((v, i) => [i, v]))
    );

    return {
      overall: summary.overall,
      structural: summary.structural,
      error: summary.error,
      warning: summary.warning,
      none: summary.none,
      description: SeverityClassifier.describe(summary.overall)
    };
  }

  /**
   * Build detail for single violation
   * @private
   */
  static _buildViolationDetail(violation) {
    return {
      itemId: violation.itemId,
      itemName: violation.itemName,
      itemType: violation.itemType,

      // Severity and blocking
      severity: violation.severity,
      severityDescription: SeverityClassifier.describe(violation.severity),
      cssClass: SeverityClassifier.getCSSClass(violation.severity),

      // What's missing
      missingPrereqs: violation.missingPrereqs || [],
      blockingReasons: violation.blockingReasons || [],
      permanentlyBlocked: violation.permanentlyBlocked || false,

      // Detection context
      detectedAt: violation.detectionContext?.evaluatedAt,

      // Recommendations
      recommendations: this._getItemRecommendations(violation)
    };
  }

  /**
   * Get recommendations for specific violation
   * @private
   */
  static _getItemRecommendations(violation) {
    const recommendations = [];

    if (violation.permanentlyBlocked) {
      recommendations.push({
        action: 'remove',
        reason: 'Incompatible with current character build',
        severity: 'critical'
      });
    } else if (violation.missingPrereqs.length > 0) {
      recommendations.push({
        action: 'acquire',
        items: violation.missingPrereqs,
        reason: `Required prerequisites for ${violation.itemName}`,
        severity: violation.severity === 'error' ? 'critical' : 'advisory'
      });
    }

    return recommendations;
  }

  /**
   * Get all recommendations
   * @private
   */
  static _getRecommendations(violations) {
    const recommendations = [];

    // Structural violations: remove incompatible items
    const structural = violations.filter(v => v.severity === 'structural');
    if (structural.length > 0) {
      recommendations.push({
        action: 'audit',
        reason: `${structural.length} incompatible item(s) detected`,
        severity: 'critical',
        items: structural.map(v => v.itemName)
      });
    }

    // Error violations: acquire missing prerequisites
    const errors = violations.filter(v => v.severity === 'error' && !v.permanentlyBlocked);
    if (errors.length > 0) {
      const allMissing = [...new Set(errors.flatMap(v => v.missingPrereqs))];
      recommendations.push({
        action: 'acquire',
        reason: `Acquire prerequisites for ${errors.length} item(s)`,
        severity: 'critical',
        items: allMissing
      });
    }

    // Warning violations: consider fixing
    const warnings = violations.filter(v => v.severity === 'warning');
    if (warnings.length > 0) {
      recommendations.push({
        action: 'review',
        reason: `${warnings.length} advisory violation(s) found`,
        severity: 'advisory',
        items: warnings.map(v => v.itemName)
      });
    }

    return recommendations;
  }

  /**
   * Get enforcement policy state
   * @private
   */
  static _getPolicyState(actor) {
    const policy = EnforcementPolicy._getPolicy(actor);

    return {
      enforcementMode: policy.mode,
      strictEnforcement: policy.strictEnforcement,
      description: this._describePolicyMode(policy.mode),
      blocking: EnforcementPolicy.shouldBlock(actor, { severity: 'error', count: 1 })
    };
  }

  /**
   * Describe policy mode
   * @private
   */
  static _describePolicyMode(mode) {
    const descriptions = {
      'normal': 'Standard enforcement: illegal builds are blocked',
      'override': 'Override mode: enforcement disabled (GM approval)',
      'freeBuild': 'Free Build mode: enforcement disabled (no restrictions)'
    };

    return descriptions[mode] || 'Unknown policy mode';
  }

  /**
   * Build compliance summary
   * @private
   */
  static _buildSummary(actor, violations) {
    const governance = GovernanceSystem.initializeGovernance(actor);
    const severity = SeverityClassifier.summarizeSeverity(
      Object.fromEntries(violations.map((v, i) => [i, v]))
    );

    return {
      actor: actor.name,
      isCompliant: violations.length === 0,
      totalViolations: violations.length,
      governance: {
        mode: governance.enforcementMode,
        approvedBy: governance.approvedBy
      },
      severity: {
        overall: severity.overall,
        breakdown: {
          structural: severity.structural,
          error: severity.error,
          warning: severity.warning
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export dashboard state as JSON (for reports/debugging)
   * @returns {Object} JSON-serializable state
   */
  static exportState(actor) {
    const state = this.getState(actor);

    return {
      actor: state.actor,
      compliance: state.compliance,
      severity: state.severity,
      violationCount: state.violations.length,
      governance: state.governance,
      policy: state.policy,
      recommendationCount: state.recommendations.length,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Empty state (for errors)
   * @private
   */
  static _emptyState() {
    return {
      actor: { id: null, name: 'Unknown', type: null },
      compliance: { isCompliant: false, totalViolations: 0 },
      severity: {
        overall: 'error',
        structural: 0,
        error: 0,
        warning: 0,
        description: 'Unable to determine compliance state'
      },
      violations: [],
      governance: {
        mode: 'normal',
        visibilityMode: 'banner',
        approvedBy: null,
        reason: null,
        timestamp: null
      },
      policy: { enforcementMode: 'normal', strictEnforcement: false },
      recommendations: [],
      summary: {}
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.IntegrityDashboard = IntegrityDashboard;
}
