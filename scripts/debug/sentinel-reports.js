/**
 * SWSE Sentinel Reports
 * Structured system diagnostics & analysis
 */

import { SWSEDebugger } from "./swse-debugger.js";

export class SentinelReports {
  /* ===============================
     HEALTH REPORT
  =============================== */

  static generateHealthReport() {
    const renderTimes = SWSEDebugger.metrics.renderTimes;
    const avgRender = renderTimes.length
      ? renderTimes.reduce((a, b) => a + b.duration, 0) / renderTimes.length
      : 0;

    const maxRender = renderTimes.length
      ? Math.max(...renderTimes.map(r => r.duration))
      : 0;

    const crashCount = Object.values(SWSEDebugger.metrics.crashFingerprints).reduce(
      (a, b) => a + b,
      0
    );

    return {
      avgRenderTime: parseFloat(avgRender.toFixed(2)),
      maxRenderTime: maxRender,
      totalRenderSamples: renderTimes.length,
      crashCount,
      uniqueCrashSignatures: Object.keys(SWSEDebugger.metrics.crashFingerprints).length,
      memory: performance.memory
        ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          }
        : null,
      uptime: Date.now() - SWSEDebugger.bootTime
    };
  }

  /* ===============================
     CRASH REPORT
  =============================== */

  static generateCrashReport() {
    const fingerprints = SWSEDebugger.metrics.crashFingerprints;

    // Sort by frequency
    const sorted = Object.entries(fingerprints)
      .sort((a, b) => b[1] - a[1])
      .map(([signature, count]) => ({
        signature,
        count,
        percentage: ((count / Object.values(fingerprints).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
      }));

    const recentErrors = SWSEDebugger.events
      .filter(e => e.type.startsWith("error"))
      .slice(-50);

    return {
      totalCrashes: Object.values(fingerprints).reduce((a, b) => a + b, 0),
      uniqueSignatures: sorted.length,
      topCrashes: sorted.slice(0, 10),
      recentErrors
    };
  }

  /* ===============================
     PERFORMANCE REPORT
  =============================== */

  static generatePerformanceReport() {
    const renderTimes = SWSEDebugger.metrics.renderTimes;
    const prepareTimes = SWSEDebugger.metrics.prepareTimes;

    // Group renders by class
    const rendersByClass = {};
    renderTimes.forEach(r => {
      if (!rendersByClass[r.className]) {
        rendersByClass[r.className] = [];
      }
      rendersByClass[r.className].push(r.duration);
    });

    const renderClassStats = Object.entries(rendersByClass).map(([className, durations]) => ({
      className,
      count: durations.length,
      avg: parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)),
      min: Math.min(...durations),
      max: Math.max(...durations)
    }));

    return {
      renderTimes,
      prepareTimes,
      rendersByClass: renderClassStats.sort((a, b) => b.avg - a.avg),
      slowestRenderers: renderClassStats.slice(0, 5),
      slowRenderThreshold: 120,
      slowRendersDetected: renderClassStats.filter(r => r.avg > 120)
    };
  }

  /* ===============================
     SETTINGS & FLAG INTEGRITY
  =============================== */

  static generateIntegrityReport() {
    const settingsEvents = SWSEDebugger.events.filter(e => e.type === "settings:get");
    const flagGetEvents = SWSEDebugger.events.filter(e => e.type === "flag:get");
    const flagSetEvents = SWSEDebugger.events.filter(e => e.type === "flag:set");

    const uniqueSettingsKeys = [...new Set(settingsEvents.map(e => e.payload.key))];
    const uniqueFlagScopes = [...new Set([...flagGetEvents, ...flagSetEvents].map(e => e.payload.scope))];

    return {
      settingsAccessCount: settingsEvents.length,
      settingsUniqueKeys: uniqueSettingsKeys.length,
      settingsKeys: uniqueSettingsKeys,
      flagGetCount: flagGetEvents.length,
      flagSetCount: flagSetEvents.length,
      flagTotalAccess: flagGetEvents.length + flagSetEvents.length,
      uniqueFlagScopes,
      flagDocumentTypes: [...new Set([...flagGetEvents, ...flagSetEvents].map(e => e.payload.doc))]
    };
  }

  /* ===============================
     ACTOR MUTATION AUDIT
  =============================== */

  static generateMutationReport() {
    const actorUpdates = SWSEDebugger.events.filter(e => e.type === "actor:update");

    const actorMutations = {};
    actorUpdates.forEach(e => {
      const actor = e.payload.actor;
      if (!actorMutations[actor]) {
        actorMutations[actor] = {
          count: 0,
          fieldsTouched: new Set()
        };
      }
      actorMutations[actor].count++;
      (e.payload.keys || []).forEach(k => actorMutations[actor].fieldsTouched.add(k));
    });

    const actorStats = Object.entries(actorMutations).map(([name, data]) => ({
      actor: name,
      updateCount: data.count,
      uniqueFields: data.fieldsTouched.size,
      fieldsTouched: Array.from(data.fieldsTouched)
    }));

    return {
      totalActorUpdates: actorUpdates.length,
      actorsTouched: actorStats.length,
      actorStats: actorStats.sort((a, b) => b.updateCount - a.updateCount)
    };
  }

  /* ===============================
     CLASSIFICATION REPORT
  =============================== */

  static generateClassificationReport() {
    // Get latest classification from Sentinel if available
    if (window.__SWSE_SENTINEL__?.getHealthDetails) {
      return window.__SWSE_SENTINEL__.getHealthDetails();
    }

    return {
      state: "UNKNOWN",
      reasons: [],
      timestamp: Date.now()
    };
  }

  /* ===============================
     FULL FORENSIC BUNDLE
  =============================== */

  static generateFullReport() {
    return {
      generatedAt: new Date().toISOString(),
      systemId: game.system.id,
      foundryVersion: game.version,
      classification: this.generateClassificationReport(),
      health: this.generateHealthReport(),
      crashes: this.generateCrashReport(),
      performance: this.generatePerformanceReport(),
      integrity: this.generateIntegrityReport(),
      mutations: this.generateMutationReport(),
      rawEventCount: SWSEDebugger.events.length
    };
  }

  static exportFullReport() {
    const data = this.generateFullReport();

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swse-sentinel-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log("SWSE SENTINEL REPORT EXPORTED", data);
  }
}
