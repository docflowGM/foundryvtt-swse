/**
 * sentinel-debug-api.js — GM-facing debug and dashboard API
 *
 * Provides:
 * - SWSE.debug.sentinel.dashboard() — Categorized report view
 * - SWSE.debug.sentinel.export() — JSON export for sharing/PRs
 * - SWSE.debug.sentinel.clear() — Clear all reports
 * - SWSE.debug.sentinel.health() — System health summary
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import { SENTINEL_CATEGORIES, getCategoryConfig, getAllCategories } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-categories.js";
import { SentinelSourceMapper } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-source-mapper.js";

export const SentinelDebugAPI = {
  /**
   * Print categorized dashboard to console
   * GM-only, formatted for readability
   */
  dashboard() {
    if (!game.user?.isGM) {
      console.warn('[SWSE Sentinel] Debug dashboard is GM-only');
      return;
    }

    const reports = SentinelEngine.getReports();
    if (reports.length === 0) {
      console.log('%c[SWSE Sentinel] No reports yet — system is healthy!', 'color:green;font-weight:bold;');
      return;
    }

    // Group by category
    const byCategory = {};
    for (const report of reports) {
      const cat = report.category || 'UNCATEGORIZED';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(report);
    }

    // Print header
    const health = SentinelEngine.getHealthState();
    const healthColor = health === 'CRITICAL' ? 'red' : health === 'UNSTABLE' ? 'orange' : health === 'DEGRADED' ? 'orange' : 'green';
    console.log(`%c═══════════════════════════════════════════`, `color:${healthColor};`);
    console.log(`%c SYSTEM HEALTH: ${health.toUpperCase()}`, `color:${healthColor};font-weight:bold;font-size:14px;`);
    console.log(`%c${reports.length} total reports`, `color:${healthColor};`);
    console.log(`%c═══════════════════════════════════════════`, `color:${healthColor};`);

    // Print by category
    const categories = getAllCategories();
    for (const categoryConfig of categories) {
      const catReports = byCategory[categoryConfig.code] || [];
      if (catReports.length === 0) continue;

      console.log(`\n%c${categoryConfig.label} (${catReports.length})`, 'font-weight:bold;color:#2196F3;');

      // Sort by severity
      const severityOrder = { CRITICAL: 0, ERROR: 1, WARN: 2, INFO: 3 };
      catReports.sort((a, b) =>
        (severityOrder[a.severity] ?? 999) - (severityOrder[b.severity] ?? 999)
      );

      // Print first 5 per category
      for (const report of catReports.slice(0, 5)) {
        this._printReport(report, categoryConfig);
      }

      if (catReports.length > 5) {
        console.log(`  … and ${catReports.length - 5} more`);
      }
    }

    console.log(`\n%c═══════════════════════════════════════════`, `color:${healthColor};`);
    console.log(`%cExport: SWSE.debug.sentinel.export()`, 'color:gray;');
    console.log(`%cClear:  SWSE.debug.sentinel.clear()`, 'color:gray;');
    console.log(`%c═══════════════════════════════════════════`, `color:${healthColor};`);
  },

  /**
   * Print a single report with formatting
   * @private
   */
  _printReport(report, categoryConfig) {
    const severityColors = {
      CRITICAL: 'background:red;color:white;',
      ERROR: 'color:red;',
      WARN: 'color:orange;',
      INFO: 'color:gray;'
    };

    const color = severityColors[report.severity] || '';
    const subcode = report.subcode ? ` [${report.subcode}]` : '';
    const location = report.source?.file
      ? ` (${SentinelSourceMapper.formatLocation(report.source.file, report.source.line).display})`
      : '';

    console.log(
      `  %c[${report.severity}]${subcode}%c ${report.message}${location}`,
      color,
      ''
    );

    // Print evidence if present
    if (report.evidence && Object.keys(report.evidence).length > 0) {
      const evidence = [];
      for (const [key, value] of Object.entries(report.evidence)) {
        if (value) {
          evidence.push(`${key}: ${value}`);
        }
      }
      if (evidence.length > 0) {
        console.log(`    Evidence: ${evidence.join(' | ')}`);
      }
    }
  },

  /**
   * Export all reports as JSON
   * Useful for pasting into issues/PRs
   */
  export() {
    if (!game.user?.isGM) {
      console.warn('[SWSE Sentinel] Export is GM-only');
      return null;
    }

    const reports = SentinelEngine.getReports();
    const status = SentinelEngine.getStatus();
    const metrics = SentinelEngine.getPerformanceMetrics();

    const exported = {
      metadata: {
        timestamp: new Date().toISOString(),
        worldName: game.world?.name,
        systemVersion: game.system?.version,
        health: status.healthState,
        mode: status.mode
      },
      summary: {
        totalReports: reports.length,
        correlationId: status.correlationId
      },
      reports: reports.map(r => ({
        layer: r.layer,
        category: r.category || 'UNCATEGORIZED',
        severity: r.severity,
        message: r.message,
        subcode: r.subcode,
        timestamp: new Date(r.timestamp).toISOString(),
        source: r.source ? {
          file: r.source.file,
          line: r.source.line,
          column: r.source.column,
          display: SentinelSourceMapper.formatLocation(r.source.file, r.source.line).display
        } : null,
        evidence: r.evidence || {}
      })),
      metrics,
      byCategory: this._getCategorySummary(reports)
    };

    // Copy to clipboard
    const json = JSON.stringify(exported, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      console.log('%c✓ Sentinel export copied to clipboard', 'color:green;font-weight:bold;');
    }).catch(() => {
      console.log('%cSentinel export:', 'font-weight:bold;');
      console.log(json);
    });

    return exported;
  },

  /**
   * Summarize reports by category
   * @private
   */
  _getCategorySummary(reports) {
    const summary = {};
    for (const cat of Object.values(SENTINEL_CATEGORIES)) {
      const catReports = reports.filter(r => r.category === cat.code);
      if (catReports.length > 0) {
        const bySeverity = { CRITICAL: 0, ERROR: 0, WARN: 0, INFO: 0 };
        for (const report of catReports) {
          bySeverity[report.severity]++;
        }
        summary[cat.code] = {
          label: cat.label,
          total: catReports.length,
          severity: bySeverity
        };
      }
    }
    return summary;
  },

  /**
   * Quick health status
   */
  health() {
    const status = SentinelEngine.getStatus();
    console.log('%c═══ SENTINEL HEALTH ═══', 'color:#2196F3;font-weight:bold;');
    console.log(`Health: ${status.healthState}`);
    console.log(`Mode: ${status.mode}`);
    console.log(`Total Reports: ${status.totalReports}`);
    console.log('%c═══════════════════════', 'color:#2196F3;');
    return status;
  },

  /**
   * Clear all reports (GM-only)
   */
  clear() {
    if (!game.user?.isGM) {
      console.warn('[SWSE Sentinel] Clear is GM-only');
      return;
    }

    if (!confirm('Clear all Sentinel reports?')) {
      return;
    }

    SentinelEngine.clearReports();
    SentinelEngine.resetHealthState();
    console.log('%c✓ Sentinel reports cleared', 'color:green;');
  }
};

/**
 * Install debug API into SWSE namespace
 */
export function installSentinelDebugAPI() {
  if (!globalThis.SWSE) {
    globalThis.SWSE = {};
  }
  if (!globalThis.SWSE.debug) {
    globalThis.SWSE.debug = {};
  }

  globalThis.SWSE.debug.sentinel = SentinelDebugAPI;

  console.log('[SWSE Sentinel] Debug API installed: SWSE.debug.sentinel.*');
}
