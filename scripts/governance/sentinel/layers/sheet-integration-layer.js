/**
 * Sheet Integration Audit Layer
 *
 * Monitors V2 character sheet integration health:
 * - Partials display correctness
 * - Roll engine routing (canonical vs bypass)
 * - Form field persistence
 * - Window position stability
 * - Atomic recalculation
 *
 * Phase A2 diagnostics reported to Sentinel for centralized governance.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export const SheetIntegrationLayer = {
  /**
   * Initialize sheet integration monitoring
   */
  init() {
    // Layer activates on-demand when audit runs
    // Findings are reported to Sentinel via reportAuditFindings()
  },

  /**
   * Report A2 audit findings to Sentinel
   * Called by SWSEV2CharacterSheetAudit.generateReport()
   */
  reportAuditFindings(auditResults) {
    if (!auditResults) return;

    const { findings, systemErrors, summary } = auditResults;

    // Report overall audit result
    const totalErrors = summary.errors;
    const totalWarnings = summary.warnings;
    const health = totalErrors === 0 ? 'HEALTHY' : 'DEGRADED';

    const auditSeverity = totalErrors > 0
      ? SentinelEngine.SEVERITY.ERROR
      : totalWarnings > 0
        ? SentinelEngine.SEVERITY.WARN
        : SentinelEngine.SEVERITY.INFO;

    SentinelEngine.report(
      'sheet-integration',
      auditSeverity,
      `Character Sheet Integration Audit: ${totalErrors} errors, ${totalWarnings} warnings`,
      {
        health,
        errors: totalErrors,
        warnings: totalWarnings,
        categories: summary.byCategory,
        timestamp: Date.now()
      }
    );

    // Report each category
    this._reportCategory('partials', findings.partials, 'Partial Display');
    this._reportCategory('rolls', findings.rolls, 'Roll Engine');
    this._reportCategory('fields', findings.fields, 'Field Persistence');
    this._reportCategory('position', findings.position, 'Position Stability');
    this._reportCategory('recalc', findings.recalc, 'Atomic Recalculation');

    // Report system errors
    if (systemErrors && systemErrors.length > 0) {
      systemErrors.forEach((err) => {
        SentinelEngine.report(
          'sheet-integration',
          SentinelEngine.SEVERITY.ERROR,
          `Sheet audit error: ${err}`,
          { errorMessage: err }
        );
      });
    }
  },

  /**
   * Report findings by category
   * @private
   */
  _reportCategory(categoryName, findings, displayName) {
    if (!findings || findings.length === 0) return;

    const errors = findings.filter(f => f.severity === 'ERROR');
    const warnings = findings.filter(f => f.severity === 'WARN');

    // Report errors
    errors.forEach((finding) => {
      SentinelEngine.report(
        'sheet-integration',
        SentinelEngine.SEVERITY.ERROR,
        `[A2] ${displayName}: ${finding.message}`,
        {
          category: categoryName,
          partial: finding.partial,
          field: finding.field,
          control: finding.control,
          fix: finding.fix,
          severity: 'ERROR'
        },
        { aggregateKey: `sheet-${categoryName}-error-${finding.message}` }
      );
    });

    // Report warnings
    warnings.forEach((finding) => {
      SentinelEngine.report(
        'sheet-integration',
        SentinelEngine.SEVERITY.WARN,
        `[A2] ${displayName}: ${finding.message}`,
        {
          category: categoryName,
          partial: finding.partial,
          field: finding.field,
          message: finding.message,
          fix: finding.fix,
          severity: 'WARN'
        },
        { aggregateKey: `sheet-${categoryName}-warn-${finding.message}` }
      );
    });
  },

  /**
   * Get sheet integration audit status from Sentinel
   */
  getStatus() {
    const reports = SentinelEngine.getReports('sheet-integration');
    const errors = reports.filter(r => r.severity === 'ERROR').length;
    const warnings = reports.filter(r => r.severity === 'WARN').length;

    return {
      healthy: errors === 0,
      errors,
      warnings,
      lastReport: reports[reports.length - 1] || null
    };
  },

  /**
   * Reset audit findings (for re-running audits)
   */
  reset() {
    // Sentinel doesn't expose report clearing, but new audits will create new reports
    // Reports are aggregated by the aggregateKey, so repeated audits are tracked
  }
};
