/**
 * Sentinel Reporter - File Export Utility
 * Generates and exports comprehensive audit reports as .log files
 *
 * This module provides functionality to save Sentinel audit findings to disk
 * for permanent record-keeping and analysis.
 */

import { SentinelEngine } from './sentinel-core.js';
import { auditCSSHealth } from './css-auditor.js';
import { generateMigrationReport } from './migration-auditor.js';

export class SentinelReporter {
  /**
   * Generate a comprehensive audit report with all findings
   * @returns {string} Formatted report text
   */
  static generateFullReport() {
    const timestamp = new Date().toISOString();
    const lines = [];

    lines.push('═'.repeat(80));
    lines.push('SENTINEL COMPREHENSIVE AUDIT REPORT');
    lines.push('═'.repeat(80));
    lines.push(`Generated: ${timestamp}`);
    lines.push(`System: SWSE (Foundry VTT v13)`);
    lines.push('');

    // SECTION 1: System Status
    lines.push('┌' + '─'.repeat(78) + '┐');
    lines.push('│ SECTION 1: SYSTEM STATUS                                                  │');
    lines.push('└' + '─'.repeat(78) + '┘');
    const status = SentinelEngine.getStatus();
    lines.push(`Status: ${status.status}`);
    lines.push(`Health: ${status.health}`);
    lines.push(`Uptime: ${(status.uptime / 1000).toFixed(2)}s`);
    lines.push('');

    // SECTION 2: Health State
    lines.push('┌' + '─'.repeat(78) + '┐');
    lines.push('│ SECTION 2: HEALTH STATE                                                   │');
    lines.push('└' + '─'.repeat(78) + '┘');
    try {
      const healthState = SentinelEngine.getHealthState() || {};
      lines.push(`Overall Health: ${healthState.overall || 'UNKNOWN'}`);
      const warnings = healthState.warnings || [];
      const errors = healthState.errors || [];
      lines.push(`Warnings: ${warnings.length}`);
      lines.push(`Errors: ${errors.length}`);
      if (warnings.length > 0) {
        lines.push('  Warnings:');
        warnings.forEach((w, i) => {
          lines.push(`    ${i + 1}. ${w}`);
        });
      }
      if (errors.length > 0) {
        lines.push('  Errors:');
        errors.forEach((e, i) => {
          lines.push(`    ${i + 1}. ${e}`);
        });
      }
    } catch (err) {
      lines.push(`⚠️  Health state unavailable: ${err.message}`);
    }
    lines.push('');

    // SECTION 3: Performance Metrics
    lines.push('┌' + '─'.repeat(78) + '┐');
    lines.push('│ SECTION 3: PERFORMANCE METRICS                                            │');
    lines.push('└' + '─'.repeat(78) + '┘');
    try {
      const perf = SentinelEngine.getPerformanceMetrics() || {};
      lines.push(`Render Cycles: ${perf.renderCount || 0}`);
      lines.push(`Average Render Time: ${perf.avgRenderTime ? perf.avgRenderTime.toFixed(2) : '0.00'}ms`);
      lines.push(`Peak Render Time: ${perf.peakRenderTime ? perf.peakRenderTime.toFixed(2) : '0.00'}ms`);
      lines.push(`Total Events: ${perf.totalEvents || 0}`);
    } catch (err) {
      lines.push(`⚠️  Performance metrics unavailable: ${err.message}`);
    }
    lines.push('');

    // SECTION 4: CSS Health Audit
    lines.push('┌' + '─'.repeat(78) + '┐');
    lines.push('│ SECTION 4: CSS HEALTH AUDIT                                              │');
    lines.push('└' + '─'.repeat(78) + '┘');
    try {
      const cssReport = auditCSSHealth();
      lines.push(this._formatCSSReport(cssReport));
    } catch (err) {
      lines.push(`⚠️  CSS audit failed: ${err.message}`);
    }
    lines.push('');

    // SECTION 5: Migration/Integrity Report
    lines.push('┌' + '─'.repeat(78) + '┐');
    lines.push('│ SECTION 5: MIGRATION & INTEGRITY REPORT                                  │');
    lines.push('└' + '─'.repeat(78) + '┘');
    try {
      const migReport = generateMigrationReport();
      lines.push(this._formatMigrationReport(migReport));
    } catch (err) {
      lines.push(`⚠️  Migration audit failed: ${err.message}`);
    }
    lines.push('');

    // SECTION 6: All Reports by Layer
    lines.push('┌' + '─'.repeat(78) + '┐');
    lines.push('│ SECTION 6: DETAILED FINDINGS BY LAYER                                    │');
    lines.push('└' + '─'.repeat(78) + '┘');
    try {
      const allReports = SentinelEngine.getReports() || [];

      if (allReports.length === 0) {
        lines.push('✓ No issues detected');
      } else {
        // Group by layer
        const byLayer = {};
        allReports.forEach(report => {
          if (!byLayer[report.layer]) {
            byLayer[report.layer] = [];
          }
          byLayer[report.layer].push(report);
        });

        Object.keys(byLayer).sort().forEach(layer => {
          lines.push('');
          lines.push(`LAYER: ${layer.toUpperCase()}`);
          lines.push('─'.repeat(60));

          const reports = byLayer[layer];
          reports.forEach((report, idx) => {
            lines.push(`${idx + 1}. [${report.severity ? report.severity.toUpperCase() : 'UNKNOWN'}] ${report.message || 'No message'}`);
            if (report.context) {
              lines.push(`   Context: ${JSON.stringify(report.context)}`);
            }
            if (report.timestamp) {
              lines.push(`   Time: ${new Date(report.timestamp).toISOString()}`);
            }
          });
        });
      }
    } catch (err) {
      lines.push(`⚠️  Failed to retrieve reports: ${err.message}`);
    }
    lines.push('');

    // Footer
    lines.push('═'.repeat(80));
    lines.push('END OF REPORT');
    lines.push('═'.repeat(80));

    return lines.join('\n');
  }

  /**
   * Format CSS audit report for display
   * @private
   */
  static _formatCSSReport(report) {
    const lines = [];
    lines.push(`Status: ${report.healthy ? '✓ HEALTHY' : '⚠️  ISSUES DETECTED'}`);
    if (report.totalRules > 0) {
      lines.push(`Total CSS Rules Checked: ${report.totalRules}`);
    }
    if (report.issues && report.issues.length > 0) {
      lines.push(`Issues Found: ${report.issues.length}`);
      report.issues.forEach((issue, i) => {
        lines.push(`  ${i + 1}. ${issue.type}: ${issue.description}`);
        if (issue.selector) {
          lines.push(`     Selector: ${issue.selector}`);
        }
      });
    }
    return lines.join('\n');
  }

  /**
   * Format migration audit report for display
   * @private
   */
  static _formatMigrationReport(report) {
    const lines = [];
    lines.push(`Status: ${report.valid ? '✓ VALID' : '⚠️  ISSUES'}`);
    if (!report.valid && report.errors) {
      lines.push(`Errors: ${report.errors.length}`);
      report.errors.forEach((err, i) => {
        lines.push(`  ${i + 1}. ${err}`);
      });
    }
    if (report.summary) {
      lines.push(`Summary: ${report.summary}`);
    }
    return lines.join('\n');
  }

  /**
   * Save report to file in Documents folder
   * This requires the user to have granted cowork directory access
   * @param {string} filename - Name of file (without .log extension)
   * @returns {Promise<boolean>} Success status
   */
  static async saveReportToDocuments(filename = 'swse-sentinel-audit') {
    try {
      const report = this.generateFullReport();

      // Create a blob and download it
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      ui.notifications?.info(`Sentinel audit report saved as ${filename}.log`);
      return true;
    } catch (err) {
      console.error('Failed to save report:', err);
      ui.notifications?.error(`Failed to save report: ${err.message}`);
      return false;
    }
  }

  /**
   * Get report as string (for console display)
   * @returns {string} Formatted report
   */
  static getReportAsString() {
    return this.generateFullReport();
  }

  /**
   * Print report to console
   */
  static printReport() {
    console.log(this.generateFullReport());
  }
}
