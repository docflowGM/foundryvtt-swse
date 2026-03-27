/**
 * Template Observability — Phase 5 Work Package I
 *
 * Provides visibility into template validation, reconciliation, and user actions.
 *
 * Components:
 * 1. Validation Report Generator — What passed/failed on template load
 * 2. Audit Trail Tracker — All user actions (overrides, reconciliations)
 * 3. Debug Output — Detailed logs for troubleshooting
 * 4. Observability Summary — Single report of entire flow
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class TemplateObservability {
  /**
   * Generate validation report for display.
   * Shows what passed/failed when template was loaded.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Object} validationReport - From TemplateValidator
   * @returns {Object} Formatted report for UI
   */
  static generateValidationReport(session, validationReport) {
    if (!validationReport) {
      return {
        templateId: session.templateId,
        templateName: session.templateName,
        valid: true,
        issues: [],
        passCount: 0,
        failCount: 0,
      };
    }

    return {
      templateId: session.templateId,
      templateName: session.templateName,
      valid: validationReport.valid,
      timestamp: Date.now(),
      summary: this._buildValidationSummary(validationReport),
      details: {
        conflicts: validationReport.conflicts?.map((c) => ({
          node: c.node,
          current: c.current,
          reason: c.reason,
          severity: 'error',
        })) || [],
        invalid: validationReport.invalid?.map((i) => ({
          selection: i.selection,
          reason: i.reason,
          suggestion: i.suggestion,
          severity: 'error',
        })) || [],
        warnings: validationReport.warnings?.map((w) => ({
          node: w.node,
          text: w.text,
          severity: w.severity || 'warning',
        })) || [],
      },
      passCount: this._countPasses(validationReport),
      failCount: validationReport.conflicts?.length + validationReport.invalid?.length || 0,
      reconciliationNeeded: validationReport.reconciliationNeeded || false,
      dirtyNodes: validationReport.dirtyNodes || [],
    };
  }

  /**
   * Build human-readable validation summary.
   * @private
   */
  static _buildValidationSummary(validationReport) {
    const parts = [];

    if (validationReport.valid) {
      parts.push('✅ All template selections are valid');
    } else {
      parts.push('⚠️ Template has validation issues');
    }

    if (validationReport.conflicts?.length > 0) {
      parts.push(
        `${validationReport.conflicts.length} conflict${validationReport.conflicts.length === 1 ? '' : 's'}`
      );
    }

    if (validationReport.invalid?.length > 0) {
      parts.push(
        `${validationReport.invalid.length} invalid selection${validationReport.invalid.length === 1 ? '' : 's'}`
      );
    }

    if (validationReport.warnings?.length > 0) {
      parts.push(
        `${validationReport.warnings.length} warning${validationReport.warnings.length === 1 ? '' : 's'}`
      );
    }

    return parts.join(' · ');
  }

  /**
   * Count passed validations.
   * @private
   */
  static _countPasses(validationReport) {
    const total = 10; // Approximate: species, class, bg, attrs, skills, feats, talents, lang, forces, etc.
    const fails = (validationReport.conflicts?.length || 0) + (validationReport.invalid?.length || 0);
    return Math.max(0, total - fails);
  }

  /**
   * Generate audit trail report.
   * Shows all user actions during template flow.
   *
   * @param {ProgressionSession} session - Template session
   * @returns {Object} Audit trail report
   */
  static generateAuditReport(session) {
    const trail = session.auditTrail || [];

    const report = {
      templateId: session.templateId,
      templateName: session.templateName,
      totalEvents: trail.length,
      overrideCount: trail.filter((e) => e.type === 'override').length,
      resetCount: trail.filter((e) => e.type === 'reset').length,
      reconciliationCount: trail.filter((e) => e.reconciliationApplied).length,
      timeline: this._buildTimeline(trail),
      summary: this._buildAuditSummary(trail),
      overriddenNodes: this._extractOverriddenNodes(trail),
      affectedByReconciliation: this._extractAffectedByReconciliation(trail),
    };

    return report;
  }

  /**
   * Build timeline of events.
   * @private
   */
  static _buildTimeline(trail) {
    return trail.map((e, idx) => ({
      sequence: idx + 1,
      time: new Date(e.timestamp).toLocaleTimeString(),
      action: e.type === 'override' ? `Changed ${e.nodeId}` : `Reset ${e.nodeId}`,
      detail: this._formatEventDetail(e),
      affectedCount: e.affectedNodes?.length || 0,
    }));
  }

  /**
   * Format event detail for display.
   * @private
   */
  static _formatEventDetail(event) {
    if (event.type === 'override') {
      const affected = event.affectedNodes?.length || 0;
      return affected > 0 ? `Affected ${affected} downstream node${affected === 1 ? '' : 's'}` : 'No cascading impact';
    }

    return 'Returned to template value';
  }

  /**
   * Build audit summary.
   * @private
   */
  static _buildAuditSummary(trail) {
    const overrides = trail.filter((e) => e.type === 'override');
    const totalAffected = new Set(overrides.flatMap((e) => e.affectedNodes)).size;

    const parts = [];

    if (overrides.length === 0) {
      parts.push('No user overrides; all template selections maintained');
    } else {
      parts.push(`${overrides.length} override${overrides.length === 1 ? '' : 's'} made`);
      if (totalAffected > 0) {
        parts.push(`affecting ${totalAffected} downstream selection${totalAffected === 1 ? '' : 's'}`);
      }
    }

    return parts.join(', ');
  }

  /**
   * Extract overridden nodes from trail.
   * @private
   */
  static _extractOverriddenNodes(trail) {
    const overrides = trail.filter((e) => e.type === 'override');
    return [...new Set(overrides.map((e) => e.nodeId))];
  }

  /**
   * Extract nodes affected by reconciliation.
   * @private
   */
  static _extractAffectedByReconciliation(trail) {
    const reconciled = trail.filter((e) => e.reconciliationApplied);
    return [...new Set(reconciled.flatMap((e) => e.affectedNodes))];
  }

  /**
   * Generate complete observability summary.
   * Single report with validation, audit, and recommendations.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Object} validationReport - From TemplateValidator
   * @returns {Object} Complete observability summary
   */
  static generateCompleteSummary(session, validationReport) {
    const validation = this.generateValidationReport(session, validationReport);
    const audit = this.generateAuditReport(session);

    const summary = {
      templateId: session.templateId,
      templateName: session.templateName,
      generatedAt: new Date().toLocaleString(),
      sections: {
        validation,
        audit,
        recommendations: this._generateRecommendations(validation, audit),
      },
    };

    swseLogger.log('[TemplateObservability] Complete summary generated', {
      templateId: session.templateId,
      issues: validation.failCount,
      overrides: audit.overrideCount,
    });

    return summary;
  }

  /**
   * Generate recommendations based on validation and audit data.
   * @private
   */
  static _generateRecommendations(validation, audit) {
    const recommendations = [];

    // Recommendation 1: Validation issues
    if (!validation.valid) {
      recommendations.push({
        type: 'validation',
        severity: 'warning',
        message: `${validation.failCount} validation issue${validation.failCount === 1 ? '' : 's'} found`,
        action: 'Review validation report above before applying',
      });
    }

    // Recommendation 2: Override reconciliation
    if (audit.overrideCount > 0) {
      recommendations.push({
        type: 'override',
        severity: audit.reconciliationCount > 0 ? 'info' : 'caution',
        message: `${audit.overrideCount} user override${audit.overrideCount === 1 ? '' : 's'} made`,
        action: audit.reconciliationCount > 0
          ? `Reconciliation was applied to ${audit.affectedByReconciliation.length} downstream selection${audit.affectedByReconciliation.length === 1 ? '' : 's'}`
          : 'Verify affected selections match intent',
      });
    }

    // Recommendation 3: All clear
    if (validation.valid && audit.overrideCount === 0) {
      recommendations.push({
        type: 'complete',
        severity: 'success',
        message: 'Template is valid and unchanged',
        action: 'Ready to apply',
      });
    }

    return recommendations;
  }

  /**
   * Generate debug output for troubleshooting.
   * Comprehensive logs for development/support.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Object} validationReport - Optional validation report
   * @returns {string} Debug output (multiline)
   */
  static generateDebugOutput(session, validationReport = null) {
    const lines = [];

    lines.push('=== TEMPLATE DEBUG OUTPUT ===');
    lines.push(`Template: ${session.templateName} (${session.templateId})`);
    lines.push(`Mode: ${session.mode}, Subtype: ${session.subtype}`);
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push('');

    // Session state
    lines.push('--- SESSION STATE ---');
    lines.push(`Locked nodes: ${Array.from(session.lockedNodes || []).join(', ') || '(none)'}`);
    lines.push(`Dirty nodes: ${Array.from(session.dirtyNodes || []).join(', ') || '(none)'}`);
    lines.push(`Audit trail events: ${(session.auditTrail || []).length}`);
    lines.push('');

    // Draft selections
    lines.push('--- DRAFT SELECTIONS ---');
    for (const [key, value] of Object.entries(session.draftSelections || {})) {
      const status = value === null ? 'UNRESOLVED' : 'SET';
      const display = typeof value === 'object' ? JSON.stringify(value) : value;
      lines.push(`  ${key}: ${status} → ${display}`);
    }
    lines.push('');

    // Validation report
    if (validationReport) {
      lines.push('--- VALIDATION REPORT ---');
      lines.push(`Valid: ${validationReport.valid}`);
      lines.push(`Conflicts: ${validationReport.conflicts?.length || 0}`);
      lines.push(`Invalid: ${validationReport.invalid?.length || 0}`);
      lines.push(`Warnings: ${validationReport.warnings?.length || 0}`);

      if (validationReport.conflicts?.length > 0) {
        lines.push('Conflicts:');
        for (const c of validationReport.conflicts) {
          lines.push(`  - ${c.node}: ${c.reason}`);
        }
      }

      if (validationReport.invalid?.length > 0) {
        lines.push('Invalid selections:');
        for (const i of validationReport.invalid) {
          lines.push(`  - ${i.selection}: ${i.reason}`);
        }
      }
      lines.push('');
    }

    // Audit trail
    const trail = session.auditTrail || [];
    if (trail.length > 0) {
      lines.push('--- AUDIT TRAIL ---');
      for (const event of trail) {
        const time = new Date(event.timestamp).toISOString();
        lines.push(`  ${time}: ${event.type} ${event.nodeId}`);
        if (event.affectedNodes?.length > 0) {
          lines.push(`    → Affected: ${event.affectedNodes.join(', ')}`);
        }
      }
      lines.push('');
    }

    // Build signals
    if (session.templateSignals) {
      lines.push('--- BUILD SIGNALS ---');
      lines.push(`Explicit: ${JSON.stringify(session.templateSignals.explicit)}`);
      lines.push(`Inferred: ${JSON.stringify(session.templateSignals.inferred)}`);
      lines.push('');
    }

    lines.push('=== END DEBUG OUTPUT ===');

    return lines.join('\n');
  }

  /**
   * Export observability data as JSON.
   * For archiving or analysis.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Object} validationReport - Optional validation report
   * @returns {string} JSON string
   */
  static exportAsJSON(session, validationReport = null) {
    const data = {
      template: {
        id: session.templateId,
        name: session.templateName,
      },
      session: {
        mode: session.mode,
        subtype: session.subtype,
        lockedNodes: Array.from(session.lockedNodes || []),
        dirtyNodes: Array.from(session.dirtyNodes || []),
        draftSelections: session.draftSelections,
        templateSignals: session.templateSignals,
      },
      validation: validationReport || null,
      audit: this.generateAuditReport(session),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
}
