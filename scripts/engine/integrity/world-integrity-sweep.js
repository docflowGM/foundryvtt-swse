/**
 * PHASE 5C-1: World Integrity Sweep
 *
 * Full-world legality verification (read-only audit).
 *
 * Purpose:
 *   - Audit all actors in world for prerequisite violations
 *   - Generate compliance report
 *   - No mutations, no side effects
 *   - Can be run anytime
 *
 * Entry Points:
 *   - Manual GM button
 *   - System ready (version change check)
 *   - Post-migration
 *   - Scheduled diagnostics
 */

import { PrerequisiteIntegrityChecker } from './prerequisite-integrity-checker.js';
import { MissingPrereqsTracker } from './missing-prereqs-tracker.js';
import { SeverityClassifier } from '../governance/integrity/severity-classifier.js';
import { SWSELogger } from '../../utils/logger.js';

export class WorldIntegritySweep {
  /**
   * Run full-world integrity sweep
   *
   * @param {Object} options - Configuration
   *   {
   *     includeNPCs: boolean (default: true)
   *     includeCompanions: boolean (default: false)
   *     verbose: boolean (default: false)
   *   }
   *
   * @returns {Promise<SweepReport>}
   */
  static async run(options = {}) {
    const startTime = performance.now();

    const config = {
      includeNPCs: options.includeNPCs !== false,
      includeCompanions: options.includeCompanions || false,
      verbose: options.verbose || SWSELogger.isDev(),
      ...options
    };

    try {
      SWSELogger.log('[5C-1] Starting world integrity sweep...', {
        includeNPCs: config.includeNPCs,
        includeCompanions: config.includeCompanions
      });

      // Get actors to scan
      const actors = this._getActorsToScan(config);

      if (config.verbose) {
        SWSELogger.log(`[5C-1] Scanning ${actors.length} actors`);
      }

      // Scan each actor
      const violations = [];
      let actorsWithViolations = 0;

      for (const actor of actors) {
        const actorViolations = this._scanActor(actor);

        if (actorViolations.count > 0) {
          violations.push(actorViolations);
          actorsWithViolations++;

          if (config.verbose) {
            SWSELogger.log(`[5C-1] ${actor.name}: ${actorViolations.count} violations`, {
              structural: actorViolations.severities.structural,
              error: actorViolations.severities.error,
              warning: actorViolations.severities.warning
            });
          }
        }
      }

      // Build summary
      const summary = this._buildSummary(violations, actors.length);

      // Calculate elapsed time
      const elapsedMs = Math.round(performance.now() - startTime);

      const report = {
        actorCount: game.actors.contents.length,
        actorsScanned: actors.length,
        actorsWithViolations: actorsWithViolations,

        violations: violations,

        summary: summary,

        timestamp: Date.now(),
        elapsedMs: elapsedMs
      };

      // Log completion
      SWSELogger.log('[5C-1] World integrity sweep complete', {
        actorsScanned: actors.length,
        violations: summary.totalViolations,
        elapsedMs: elapsedMs
      });

      return report;

    } catch (err) {
      SWSELogger.error('[5C-1] Sweep failed:', err);
      return this._errorReport(err);
    }
  }

  /**
   * Get actors to scan based on config
   * @private
   */
  static _getActorsToScan(config) {
    return game.actors.contents.filter(actor => {
      // Always scan players
      if (actor.type === 'character') {
        return true;
      }

      // Include NPCs if configured
      if (config.includeNPCs && actor.type === 'npc') {
        return true;
      }

      // Include companions if configured
      if (config.includeCompanions && actor.type === 'companion') {
        return true;
      }

      return false;
    });
  }

  /**
   * Scan single actor for violations
   * @private
   */
  static _scanActor(actor) {
    const missing = MissingPrereqsTracker.getMissingPrereqs(actor);
    const severities = { warning: 0, error: 0, structural: 0 };

    const topViolations = [];

    for (const violation of missing) {
      const severity = violation.severity || 'warning';
      severities[severity]++;

      // Track top violations (most severe first)
      topViolations.push({
        itemName: violation.itemName,
        severity: severity,
        reason: violation.blockingReasons?.[0] || 'Unknown reason'
      });
    }

    // Sort by severity (structural > error > warning)
    topViolations.sort((a, b) => {
      const severityOrder = { structural: 0, error: 1, warning: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return {
      actorId: actor.id,
      actorName: actor.name,
      actorType: actor.type,
      violationCount: missing.length,
      severities: severities,
      topViolations: topViolations.slice(0, 5) // Top 5 violations
    };
  }

  /**
   * Build sweep summary
   * @private
   */
  static _buildSummary(violations, totalActorsScanned) {
    const summary = {
      totalActorsScanned: totalActorsScanned,
      actorsWithViolations: violations.length,
      percentWithIssues: totalActorsScanned > 0
        ? Math.round((violations.length / totalActorsScanned) * 100)
        : 0,

      totalViolations: 0,
      totalStructural: 0,
      totalError: 0,
      totalWarning: 0,

      violationsByType: {},
      violationsBySeverity: {}
    };

    for (const actor of violations) {
      summary.totalViolations += actor.violationCount;
      summary.totalStructural += actor.severities.structural;
      summary.totalError += actor.severities.error;
      summary.totalWarning += actor.severities.warning;

      // Track by actor type
      summary.violationsByType[actor.actorType] =
        (summary.violationsByType[actor.actorType] || 0) + actor.violationCount;
    }

    return summary;
  }

  /**
   * Error report (for failed sweeps)
   * @private
   */
  static _errorReport(error) {
    return {
      actorCount: game.actors?.contents?.length || 0,
      actorsScanned: 0,
      actorsWithViolations: 0,
      violations: [],
      summary: {
        totalViolations: 0,
        totalStructural: 0,
        totalError: 0,
        totalWarning: 0
      },
      error: error.message,
      timestamp: Date.now(),
      elapsedMs: 0
    };
  }

  /**
   * Export sweep report as JSON (for debugging/reports)
   *
   * @param {SweepReport} report
   * @returns {Object} JSON-serializable report
   */
  static exportReport(report) {
    return {
      timestamp: new Date(report.timestamp).toISOString(),
      summary: {
        actorsScanned: report.actorsScanned,
        actorsWithViolations: report.actorsWithViolations,
        percentWithIssues: report.summary.percentWithIssues,
        violations: {
          total: report.summary.totalViolations,
          structural: report.summary.totalStructural,
          error: report.summary.totalError,
          warning: report.summary.totalWarning
        }
      },
      violationsByType: report.summary.violationsByType,
      actorsWithMostViolations: report.violations
        .sort((a, b) => b.violationCount - a.violationCount)
        .slice(0, 10)
        .map(a => ({ name: a.actorName, violations: a.violationCount })),
      elapsedMs: report.elapsedMs
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.WorldIntegritySweep = WorldIntegritySweep;
}
