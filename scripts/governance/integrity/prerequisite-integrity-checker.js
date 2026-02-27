/**
 * Prerequisite Integrity Checker
 * PHASE 3: Mutation Integrity Enforcement
 *
 * Evaluates all owned abilities and tracks which ones violate prerequisites.
 * This system ensures that mutations cannot create invalid states.
 *
 * Architecture:
 * - Evaluated AFTER every ability mutation (called from ActorEngine)
 * - Re-evaluates ALL abilities to detect integrity violations
 * - Tracks missingPrereqs for each ability
 * - Reports violations to Sentinel for enforcement
 *
 * Authority:
 * - Uses PrerequisiteChecker for rule evaluation (sovereign legality source)
 * - Uses AbilityEngine for legality assessment (sovereign authority)
 * - Never interprets rules directly (delegates to authorities)
 */

import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';
import { AbilityEngine } from '../../engine/abilities/AbilityEngine.js';
import { SWSELogger } from '../../utils/logger.js';
import { MissingPrereqsTracker } from './missing-prereqs-tracker.js';
import { SeverityClassifier } from './severity-classifier.js';

export class PrerequisiteIntegrityChecker {

  /**
   * INTEGRITY SNAPSHOT
   * Stores the current prerequisite state for an actor.
   * Used to detect when violations appear/disappear.
   *
   * {
   *   actorId: {
   *     evaluatedAt: timestamp,
   *     violations: {
   *       itemId: {
   *         itemName: string,
   *         itemType: string,
   *         missingPrereqs: string[],
   *         severity: 'warning' | 'error',
   *         firstDetectedAt: timestamp
   *       }
   *     },
   *     summary: {
   *       totalViolations: number,
   *       violationsByType: object
   *     }
   *   }
   * }
   */
  static #integritySnapshots = new Map();

  /**
   * Evaluate all abilities on an actor for prerequisite violations.
   * Called AFTER every mutation (ability creation, deletion, or modification).
   *
   * Returns both current violations and a diff from last evaluation.
   * Updates actor's missingPrerequisites tracking field.
   *
   * @param {Actor} actor - Actor to evaluate
   * @returns {Promise<Object>} Integrity report with violations and diffs
   */
  static async evaluate(actor) {
    if (!actor || !actor.id) {
      SWSELogger.warn('[PREREQ-INTEGRITY] evaluate() called with invalid actor');
      return { violations: {}, diffs: { new: [], resolved: [], changed: [] }, summary: {} };
    }

    try {
      // Get current snapshot
      const previousSnapshot = this.#integritySnapshots.get(actor.id);

      // Evaluate all items
      const currentViolations = this._evaluateAllItems(actor);

      // Build new snapshot
      const newSnapshot = {
        actorId: actor.id,
        evaluatedAt: Date.now(),
        violations: currentViolations,
        summary: this._buildSummary(currentViolations)
      };

      // Compute diffs
      const diffs = previousSnapshot
        ? this._computeDiffs(previousSnapshot, newSnapshot)
        : { new: Object.keys(currentViolations), resolved: [], changed: [] };

      // Store snapshot for next evaluation
      this.#integritySnapshots.set(actor.id, newSnapshot);

      // Update actor's missingPrerequisites tracking
      await MissingPrereqsTracker.updateTracking(actor, currentViolations);

      // Report any violations
      if (Object.keys(currentViolations).length > 0) {
        this._reportViolations(actor, currentViolations, diffs);
      }

      return {
        violations: currentViolations,
        diffs,
        summary: newSnapshot.summary
      };

    } catch (err) {
      SWSELogger.error('[PREREQ-INTEGRITY] Evaluation error:', err);
      return { violations: {}, diffs: { new: [], resolved: [], changed: [] }, summary: {}, error: err.message };
    }
  }

  /**
   * Evaluate all items on an actor for prerequisite violations.
   * @private
   *
   * @param {Actor} actor - Actor to evaluate
   * @returns {Object} Violations map {itemId: violationDetail}
   */
  static _evaluateAllItems(actor) {
    const violations = {};

    // Evaluate all items
    for (const item of actor.items) {
      // Skip items that don't have prerequisites
      if (!this._shouldEvaluateItem(item)) {
        continue;
      }

      // Evaluate this item
      const assessment = AbilityEngine.evaluateAcquisition(actor, item);

      // If not legal, track as violation
      if (!assessment.legal) {
        violations[item.id] = {
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          missingPrereqs: assessment.missingPrereqs || [],
          blockingReasons: assessment.blockingReasons || [],
          permanentlyBlocked: assessment.permanentlyBlocked || false,
          severity: this._classifySeverity(assessment),
          detectionContext: {
            actorName: actor.name,
            evaluatedAt: Date.now()
          }
        };
      }
    }

    return violations;
  }

  /**
   * Determine if an item should be evaluated for prerequisite violations.
   * Some items (like world items without prerequisites) are exempt.
   * @private
   */
  static _shouldEvaluateItem(item) {
    // Skip items without types (shouldn't happen, but defensive)
    if (!item.type) return false;

    // Only evaluate items that CAN have prerequisites
    const evaluableTypes = ['feat', 'talent', 'class', 'power', 'forcepower'];
    if (!evaluableTypes.includes(item.type)) {
      return false;
    }

    // Skip if item has no prerequisite data
    if (!item.system?.prerequisite &&
        !item.system?.prerequisites &&
        !item.system?.prereqassets) {
      return false;
    }

    return true;
  }

  /**
   * Classify severity of a violation using Phase 5B-3 severity model.
   * PHASE 5B-3: Enhanced severity classification
   * @private
   */
  static _classifySeverity(assessment) {
    return SeverityClassifier.classifyViolation(assessment);
  }

  /**
   * Build summary statistics about violations.
   * PHASE 5B-3: Enhanced with all severity levels
   * @private
   */
  static _buildSummary(violations) {
    const violationsByType = {};
    const violationsBySeverity = { none: 0, warning: 0, error: 0, structural: 0 };
    let totalMissing = 0;

    for (const violation of Object.values(violations)) {
      // By item type
      violationsByType[violation.itemType] = (violationsByType[violation.itemType] || 0) + 1;

      // By severity
      const severity = violation.severity || 'warning';
      violationsBySeverity[severity] = (violationsBySeverity[severity] || 0) + 1;

      // Total missing prerequisites
      totalMissing += violation.missingPrereqs?.length || 0;
    }

    return {
      totalViolations: Object.keys(violations).length,
      structuralCount: violationsBySeverity.structural,
      errorCount: violationsBySeverity.error,
      warningCount: violationsBySeverity.warning,
      totalMissingPrereqs: totalMissing,
      violationsByType,
      overallSeverity: SeverityClassifier.getOverallSeverity(violations)
    };
  }

  /**
   * Compute differences between two integrity snapshots.
   * Shows which violations are new, resolved, or changed.
   * @private
   */
  static _computeDiffs(previous, current) {
    const newViolations = [];
    const resolvedViolations = [];
    const changedViolations = [];

    // Find new violations (in current but not in previous)
    for (const [itemId, violation] of Object.entries(current.violations)) {
      if (!previous.violations[itemId]) {
        newViolations.push({
          itemId,
          itemName: violation.itemName,
          missingPrereqs: violation.missingPrereqs
        });
      }
    }

    // Find resolved violations (in previous but not in current)
    for (const [itemId, violation] of Object.entries(previous.violations)) {
      if (!current.violations[itemId]) {
        resolvedViolations.push({
          itemId,
          itemName: violation.itemName,
          wasBlocking: violation.missingPrereqs
        });
      }
    }

    // Find changed violations (in both, but different missing prerequisites)
    for (const [itemId, violation] of Object.entries(current.violations)) {
      if (previous.violations[itemId]) {
        const prev = previous.violations[itemId];
        const curr = violation;

        // Check if missing prerequisites changed
        const prevMissing = new Set(prev.missingPrereqs || []);
        const currMissing = new Set(curr.missingPrereqs || []);

        if (prevMissing.size !== currMissing.size ||
            ![...prevMissing].every(p => currMissing.has(p))) {
          changedViolations.push({
            itemId,
            itemName: violation.itemName,
            previousMissing: prev.missingPrereqs,
            currentMissing: curr.missingPrereqs
          });
        }
      }
    }

    return {
      new: newViolations,
      resolved: resolvedViolations,
      changed: changedViolations
    };
  }

  /**
   * Report integrity violations to Sentinel.
   * @private
   */
  static _reportViolations(actor, violations, diffs) {
    const summary = this._buildSummary(violations);

    SWSELogger.warn(`[PREREQ-INTEGRITY] Violations detected on ${actor.name}`, {
      summary,
      newViolations: diffs.new.length,
      resolvedViolations: diffs.resolved.length,
      changedViolations: diffs.changed.length
    });

    // Log details for each violation
    for (const [itemId, violation] of Object.entries(violations)) {
      SWSELogger.debug(`[PREREQ-INTEGRITY] Violation: ${violation.itemName} (${violation.itemType})`, {
        severity: violation.severity,
        missingPrereqs: violation.missingPrereqs,
        permanently: violation.permanentlyBlocked
      });
    }

    // Emit hook for external systems
    if (typeof Hooks !== 'undefined') {
      Hooks.callAll('swse.prerequisiteViolation', {
        actor,
        violations,
        summary,
        diffs
      });
    }
  }

  /**
   * Get the current integrity snapshot for an actor.
   * Used for debugging and testing.
   * @static
   */
  static getSnapshot(actorId) {
    return this.#integritySnapshots.get(actorId) || null;
  }

  /**
   * Clear all snapshots (useful for testing).
   * @static
   */
  static clearSnapshots() {
    this.#integritySnapshots.clear();
  }

  /**
   * Get stats on all tracked actors.
   * @static
   */
  static getTrackingStats() {
    const stats = {
      trackedActors: this.#integritySnapshots.size,
      totalViolations: 0,
      actorDetails: []
    };

    for (const [actorId, snapshot] of this.#integritySnapshots.entries()) {
      const violationCount = Object.keys(snapshot.violations).length;
      stats.totalViolations += violationCount;
      stats.actorDetails.push({
        actorId,
        violationCount,
        evaluatedAt: new Date(snapshot.evaluatedAt).toISOString()
      });
    }

    return stats;
  }
}
