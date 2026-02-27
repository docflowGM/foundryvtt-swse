/**
 * PHASE 5C-2: Migration Integrity Adapter
 *
 * Ensures system upgrades never silently corrupt actors.
 *
 * On system ready:
 *   - Check if system version changed
 *   - If changed: run WorldIntegritySweep
 *   - If violations found: notify GM
 *   - Provide link to repair panel
 *
 * Non-blocking, advisory notifications.
 */

import { WorldIntegritySweep } from "/systems/foundryvtt-swse/scripts/engine/integrity/world-integrity-sweep.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class MigrationIntegrityAdapter {
  /**
   * Settings key for storing last known version
   */
  static readonly VERSION_SETTING = 'lastSystemVersion';

  /**
   * Validate world integrity after migration
   *
   * @returns {Promise<MigrationReport>}
   */
  static async validatePostMigration() {
    try {
      const versionInfo = this._getVersionInfo();

      // Check if version changed
      const versionChanged = this._hasVersionChanged(versionInfo);

      const report = {
        versionChanged: versionChanged,
        oldVersion: versionInfo.stored,
        newVersion: versionInfo.current,
        timestamp: Date.now()
      };

      if (!versionChanged) {
        SWSELogger.log('[5C-2] No version change detected');
        return report;
      }

      // Version changed: run sweep
      SWSELogger.log('[5C-2] System version change detected', {
        from: versionInfo.stored,
        to: versionInfo.current
      });

      const sweepReport = await WorldIntegritySweep.run({
        includeNPCs: true,
        includeCompanions: false,
        verbose: true
      });

      // Add sweep results to report
      report.sweep = sweepReport;

      // Check if violations found
      const hasViolations = sweepReport.summary.totalViolations > 0;

      if (hasViolations) {
        report.requiresAttention = true;
        report.message = `[SWSE] Post-migration integrity check found ${sweepReport.summary.totalViolations} violation(s) across ${sweepReport.actorsWithViolations} actor(s). Check console for details.`;

        SWSELogger.warn('[5C-2] Post-migration violations detected:', {
          totalViolations: sweepReport.summary.totalViolations,
          actorsAffected: sweepReport.actorsWithViolations,
          breakdown: {
            structural: sweepReport.summary.totalStructural,
            error: sweepReport.summary.totalError,
            warning: sweepReport.summary.totalWarning
          }
        });

        // Notify GM in UI
        if (game.user?.isGM) {
          ui.notifications.warn(report.message);
        }
      } else {
        report.requiresAttention = false;
        report.message = '[SWSE] Post-migration integrity check passed. No violations detected.';

        SWSELogger.log('[5C-2] Post-migration integrity check passed');
      }

      // Store new version
      await this._storeCurrentVersion();

      return report;

    } catch (err) {
      SWSELogger.error('[5C-2] Migration integrity validation failed:', err);
      return this._errorReport(err);
    }
  }

  /**
   * Check if system version has changed
   * @private
   */
  static _hasVersionChanged(versionInfo) {
    // First migration (no stored version)
    if (!versionInfo.stored) {
      return false;
    }

    // Version mismatch
    return versionInfo.stored !== versionInfo.current;
  }

  /**
   * Get version information
   * @private
   */
  static _getVersionInfo() {
    const stored = game.settings?.get('foundryvtt-swse', this.VERSION_SETTING);
    const current = game.system?.version || game.data?.system?.version;

    return {
      stored: stored,
      current: current
    };
  }

  /**
   * Store current system version
   * @private
   */
  static async _storeCurrentVersion() {
    const version = game.system?.version || game.data?.system?.version;

    try {
      await game.settings.set('foundryvtt-swse', this.VERSION_SETTING, version);
      SWSELogger.log('[5C-2] Stored version:', version);
    } catch (err) {
      SWSELogger.warn('[5C-2] Failed to store version:', err);
    }
  }

  /**
   * Error report (for failed validation)
   * @private
   */
  static _errorReport(error) {
    return {
      versionChanged: false,
      oldVersion: null,
      newVersion: null,
      error: error.message,
      requiresAttention: true,
      message: `[SWSE] Migration integrity check failed: ${error.message}`,
      timestamp: Date.now()
    };
  }

  /**
   * Register migration hook (called on system init)
   * @static
   */
  static registerHook() {
    Hooks.once('ready', async () => {
      // Run post-migration check
      const report = await this.validatePostMigration();

      // Log report for GMs
      if (game.user?.isGM) {
        SWSELogger.log('[5C-2] Migration Integrity Report:', {
          versionChanged: report.versionChanged,
          oldVersion: report.oldVersion,
          newVersion: report.newVersion,
          violations: report.sweep?.summary?.totalViolations || 0,
          requiresAttention: report.requiresAttention
        });
      }
    });
  }

  /**
   * Export report as JSON (for records)
   * @static
   */
  static exportReport(report) {
    return {
      timestamp: new Date(report.timestamp).toISOString(),
      versionChange: {
        old: report.oldVersion,
        new: report.newVersion,
        changed: report.versionChanged
      },
      violations: report.sweep ? {
        total: report.sweep.summary.totalViolations,
        structural: report.sweep.summary.totalStructural,
        error: report.sweep.summary.totalError,
        warning: report.sweep.summary.totalWarning
      } : null,
      requiresAttention: report.requiresAttention,
      message: report.message,
      error: report.error || null
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.MigrationIntegrityAdapter = MigrationIntegrityAdapter;
}
