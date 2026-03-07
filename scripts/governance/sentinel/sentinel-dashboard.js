/**
 * sentinel-dashboard.js — GM-facing dashboard for Sentinel health reports
 *
 * Provides a quick overview of system health across all Sentinel layers.
 * Shows last N reports aggregated by layer and severity.
 *
 * Usage: game.swse.sentinelDashboard.render(true)
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

export class SentinelDashboard extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    id: "swse-sentinel-dashboard",
    tag: "section",
    window: {
      title: "System Health Dashboard",
      width: 800,
      height: 600,
      resizable: true
    },
    classes: ["swse", "sentinel-dashboard", "holo-console"]
  };

  static PARTS = {
    body: {
      template: "systems/foundryvtt-swse/templates/apps/sentinel-dashboard.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this.maxReportsPerLayer = options.maxReportsPerLayer ?? 10;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get all reports from Sentinel
    const allReports = globalThis.__SWSE_SENTINEL__?.getReports?.() || [];

    // Group by layer
    const byLayer = {};
    for (const report of allReports) {
      const layer = report.layer || "unknown";
      if (!byLayer[layer]) {
        byLayer[layer] = [];
      }
      byLayer[layer].push(report);
    }

    // Process by layer for display
    const layers = [];
    const severityOrder = { ERROR: 0, WARN: 1, INFO: 2 };

    for (const [layerName, reports] of Object.entries(byLayer)) {
      // Sort by severity, then by recency
      const sorted = reports
        .sort((a, b) => {
          const sevCmp = (severityOrder[a.severity] ?? 999) - (severityOrder[b.severity] ?? 999);
          if (sevCmp !== 0) return sevCmp;
          return (b.timestamp ?? 0) - (a.timestamp ?? 0);
        })
        .slice(0, this.maxReportsPerLayer);

      // Count by severity
      const severityCounts = { ERROR: 0, WARN: 0, INFO: 0 };
      for (const report of reports) {
        severityCounts[report.severity ?? "INFO"]++;
      }

      // Get health status
      const hasErrors = severityCounts.ERROR > 0;
      const hasWarnings = severityCounts.WARN > 0;
      const health = hasErrors ? "critical" : hasWarnings ? "warning" : "healthy";

      layers.push({
        name: layerName,
        health,
        severityCounts,
        reports: sorted.map(r => ({
          title: r.title,
          severity: r.severity ?? "INFO",
          timestamp: r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "unknown",
          details: typeof r.details === "object" ? JSON.stringify(r.details, null, 2) : r.details
        }))
      });
    }

    // Sort layers by health
    const healthOrder = { critical: 0, warning: 1, healthy: 2 };
    layers.sort((a, b) => (healthOrder[a.health] ?? 999) - (healthOrder[b.health] ?? 999));

    // Overall stats
    const totalErrors = Object.values(byLayer).reduce(
      (sum, reports) => sum + reports.filter(r => r.severity === "ERROR").length,
      0
    );
    const totalWarnings = Object.values(byLayer).reduce(
      (sum, reports) => sum + reports.filter(r => r.severity === "WARN").length,
      0
    );
    const totalInfos = Object.values(byLayer).reduce(
      (sum, reports) => sum + reports.filter(r => r.severity === "INFO").length,
      0
    );

    const overallHealth = totalErrors > 0 ? "critical" : totalWarnings > 0 ? "warning" : "healthy";

    return foundry.utils.mergeObject(context, {
      layers,
      stats: {
        totalLayers: layers.length,
        totalErrors,
        totalWarnings,
        totalInfos,
        overallHealth
      },
      isGM: game.user?.isGM ?? false
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    // Refresh button
    root.querySelector(".refresh-button")?.addEventListener("click", () => {
      this.render();
    });

    // Clear reports button (GM only)
    if (game.user?.isGM) {
      root.querySelector(".clear-button")?.addEventListener("click", () => {
        if (confirm("Clear all Sentinel reports?")) {
          globalThis.__SWSE_SENTINEL__?.clearReports?.();
          this.render();
        }
      });
    }

    // Toggle devOnly reports
    root.querySelector(".toggle-dev-only")?.addEventListener("change", (e) => {
      const showDevOnly = e.target.checked;
      root
        .querySelectorAll("[data-dev-only='true']")
        .forEach(el => {
          el.style.display = showDevOnly ? "" : "none";
        });
    });
  }
}
