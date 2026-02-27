/**
 * PHASE 5B-3: Severity Classifier
 *
 * Classifies prerequisite violations into severity levels.
 *
 * Severity Levels:
 *   NONE (0) - No violations
 *   WARNING (1) - 1-2 missing prerequisites (likely fixable)
 *   ERROR (2) - 3+ missing or permanent incompatibility
 *   STRUCTURAL (3) - Class/species incompatibility (cannot be fixed)
 *
 * Used by:
 *   - PrerequisiteIntegrityChecker (classify violations)
 *   - EnforcementPolicy (determine blocking behavior)
 *   - IntegrityDashboard (display to user)
 */

import { EnforcementPolicy } from '../enforcement/enforcement-policy.js';

export class SeverityClassifier {
  /**
   * Classify a single violation
   *
   * @param {Object} assessment - Result from AbilityEngine.evaluateAcquisition()
   *   {
   *     legal: boolean,
   *     permanentlyBlocked: boolean,
   *     missingPrereqs: string[],
   *     blockingReasons: string[]
   *   }
   *
   * @returns {string} - Severity level
   */
  static classifyViolation(assessment) {
    if (!assessment) {
      return EnforcementPolicy.SEVERITY.NONE;
    }

    // STRUCTURAL: Permanent incompatibility (cannot be fixed)
    if (assessment.permanentlyBlocked === true) {
      return EnforcementPolicy.SEVERITY.STRUCTURAL;
    }

    // No violations
    if (assessment.legal === true) {
      return EnforcementPolicy.SEVERITY.NONE;
    }

    // ERROR: 3+ missing prerequisites
    const missingCount = assessment.missingPrereqs?.length || 0;
    if (missingCount >= 3) {
      return EnforcementPolicy.SEVERITY.ERROR;
    }

    // WARNING: 1-2 missing prerequisites (likely fixable)
    if (missingCount > 0) {
      return EnforcementPolicy.SEVERITY.WARNING;
    }

    // If assessment says not legal but no missing prereqs, it's structural
    if (!assessment.legal) {
      return EnforcementPolicy.SEVERITY.STRUCTURAL;
    }

    return EnforcementPolicy.SEVERITY.NONE;
  }

  /**
   * Classify all violations for an actor
   *
   * @param {Object} violations - Map of violations from PrerequisiteIntegrityChecker
   *   {
   *     itemId: {
   *       itemName: string,
   *       missingPrereqs: string[],
   *       permanentlyBlocked: boolean,
   *       ...
   *     }
   *   }
   *
   * @returns {Object} Violations with severity added/updated
   */
  static classifyAllViolations(violations) {
    const classified = {};

    for (const [itemId, violation] of Object.entries(violations)) {
      classified[itemId] = {
        ...violation,
        severity: this.classifyViolation({
          legal: false,
          permanentlyBlocked: violation.permanentlyBlocked,
          missingPrereqs: violation.missingPrereqs,
          blockingReasons: violation.blockingReasons
        })
      };
    }

    return classified;
  }

  /**
   * Get overall severity for a set of violations
   * Returns the highest severity found
   *
   * @param {Object} violations - Violations map
   * @returns {string} - Overall severity
   */
  static getOverallSeverity(violations) {
    const severities = Object.values(violations)
      .map(v => v.severity)
      .filter(s => s);

    // Structural > Error > Warning > None
    if (severities.includes(EnforcementPolicy.SEVERITY.STRUCTURAL)) {
      return EnforcementPolicy.SEVERITY.STRUCTURAL;
    }
    if (severities.includes(EnforcementPolicy.SEVERITY.ERROR)) {
      return EnforcementPolicy.SEVERITY.ERROR;
    }
    if (severities.includes(EnforcementPolicy.SEVERITY.WARNING)) {
      return EnforcementPolicy.SEVERITY.WARNING;
    }

    return EnforcementPolicy.SEVERITY.NONE;
  }

  /**
   * Build severity summary for violations
   *
   * @param {Object} violations - Violations map
   * @returns {Object} Summary with counts
   */
  static summarizeSeverity(violations) {
    const summary = {
      total: Object.keys(violations).length,
      none: 0,
      warning: 0,
      error: 0,
      structural: 0,
      overall: EnforcementPolicy.SEVERITY.NONE
    };

    for (const violation of Object.values(violations)) {
      const severity = violation.severity || EnforcementPolicy.SEVERITY.NONE;
      summary[severity] = (summary[severity] || 0) + 1;
    }

    summary.overall = this.getOverallSeverity(violations);
    return summary;
  }

  /**
   * Check if severity should block mutations
   *
   * @param {string} severity - Violation severity
   * @param {boolean} strictEnforcement - Is strict enforcement enabled?
   * @returns {boolean} - Should block?
   */
  static shouldBlock(severity, strictEnforcement = false) {
    if (strictEnforcement) {
      // Strict: block any violation
      return severity !== EnforcementPolicy.SEVERITY.NONE;
    }

    // Normal: block error and structural
    return [
      EnforcementPolicy.SEVERITY.ERROR,
      EnforcementPolicy.SEVERITY.STRUCTURAL
    ].includes(severity);
  }

  /**
   * Get human-readable description of severity
   *
   * @param {string} severity - Severity level
   * @returns {string} - Description
   */
  static describe(severity) {
    const descriptions = {
      [EnforcementPolicy.SEVERITY.NONE]: 'No violations',
      [EnforcementPolicy.SEVERITY.WARNING]: 'Advisory: Likely fixable prerequisites missing',
      [EnforcementPolicy.SEVERITY.ERROR]: 'Blocking: Critical prerequisites missing or violation count high',
      [EnforcementPolicy.SEVERITY.STRUCTURAL]: 'Blocking: Permanent incompatibility with current build'
    };

    return descriptions[severity] || 'Unknown severity';
  }

  /**
   * Get CSS class for severity (for UI)
   *
   * @param {string} severity - Severity level
   * @returns {string} - CSS class name
   */
  static getCSSClass(severity) {
    const classes = {
      [EnforcementPolicy.SEVERITY.NONE]: 'severity-none',
      [EnforcementPolicy.SEVERITY.WARNING]: 'severity-warning',
      [EnforcementPolicy.SEVERITY.ERROR]: 'severity-error',
      [EnforcementPolicy.SEVERITY.STRUCTURAL]: 'severity-structural'
    };

    return classes[severity] || 'severity-unknown';
  }

  /**
   * Export severity summary as JSON (for debugging)
   *
   * @param {Object} violations - Violations map
   * @returns {Object} - JSON-serializable summary
   */
  static exportSummary(violations) {
    const summary = this.summarizeSeverity(violations);

    return {
      total: summary.total,
      breakdown: {
        structural: summary.structural,
        error: summary.error,
        warning: summary.warning,
        none: summary.none
      },
      overall: summary.overall,
      description: this.describe(summary.overall)
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.SeverityClassifier = SeverityClassifier;
}
