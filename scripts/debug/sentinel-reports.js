/**
 * SWSE Sentinel Reports
 * Structured system diagnostics & analysis
 *
 * Authority model:
 * - SentinelEngine: health classification, performance metrics authority, aggregates
 * - SWSEDebugger: raw forensic telemetry (crashes, events) for post-hoc analysis only
 *
 * Contract compliance:
 * - All exports snapshot data (copy, not live references)
 * - Never mutate SentinelEngine or SWSEDebugger state
 * - Read performance truth from SentinelEngine, not SWSEDebugger
 */

import { SentinelEngine } from "../governance/sentinel/sentinel-core.js";
import { SWSEDebugger } from "./swse-debugger.js";
import { SentinelConfig } from "./sentinel-config.js";

export class SentinelReports {
  /* ===============================
     HEALTH REPORT
  =============================== */

  static generateHealthReport() {
    // Get performance metrics from authoritative source (SentinelEngine)
    // SentinelEngine is sole authority for performance truth
    const engineMetrics = SentinelEngine.getPerformanceMetrics() || {};

    // Forensic data from SWSEDebugger: crash analysis
    const crashCount = Object.values(SWSEDebugger.metrics.crashFingerprints).reduce(
      (a, b) => a + b,
      0
    );

    // Snapshot memory (copy, not live reference per Contract #8)
    const memorySnapshot = performance.memory
      ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        }
      : null;

    return {
      // Authority: SentinelEngine
      performanceMetrics: engineMetrics,
      healthState: SentinelEngine.getHealthState(),
      healthDetails: SentinelEngine.getHealthDetails(),
      // Forensic: SWSEDebugger (for post-hoc analysis)
      crashCount,
      uniqueCrashSignatures: Object.keys(SWSEDebugger.metrics.crashFingerprints).length,
      // Snapshots (never live references)
      memory: memorySnapshot,
      uptime: Date.now() - SWSEDebugger.bootTime
    };
  }

  /* ===============================
     CRASH REPORT
  =============================== */

  static generateCrashReport() {
    // Snapshot fingerprints (copy, not live reference)
    const fingerprintSnapshot = { ...SWSEDebugger.metrics.crashFingerprints };

    // Sort by frequency
    const sorted = Object.entries(fingerprintSnapshot)
      .sort((a, b) => b[1] - a[1])
      .map(([signature, count]) => ({
        signature,
        count,
        percentage: ((count / Object.values(fingerprintSnapshot).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
      }));

    // Snapshot recent errors (copy array and contents)
    const recentErrors = SWSEDebugger.events
      .filter(e => e.type.startsWith("error"))
      .slice(-50)
      .map(e => ({ ...e }));  // snapshot each event object

    return {
      totalCrashes: Object.values(fingerprintSnapshot).reduce((a, b) => a + b, 0),
      uniqueSignatures: sorted.length,
      topCrashes: sorted.slice(0, 10),
      recentErrors
    };
  }

  /* ===============================
     PERFORMANCE REPORT
  =============================== */

  static generatePerformanceReport() {
    // Authority: SentinelEngine for real-time rolling metrics
    const engineMetrics = SentinelEngine.getPerformanceMetrics() || {};

    // Optional: snapshot raw forensic samples from SWSEDebugger for post-hoc analysis
    // These are auxiliary to SentinelEngine's rolling metrics
    const renderTimesSample = [...SWSEDebugger.metrics.renderTimes];  // snapshot (copy)
    const prepareTimesSample = [...SWSEDebugger.metrics.prepareTimes];  // snapshot (copy)

    // Group renders by class (from snapshot, not live reference)
    const rendersByClass = {};
    renderTimesSample.forEach(r => {
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
      // Authority: SentinelEngine
      engineMetrics,
      slowRenderThreshold: SentinelConfig.RENDER_SLOW_MS,
      // Forensic: SWSEDebugger snapshots
      forensicRenderSamples: renderTimesSample.slice(-100),  // last 100 only
      forensicPrepareSamples: prepareTimesSample.slice(-100),  // last 100 only
      rendersByClass: renderClassStats.sort((a, b) => b.avg - a.avg),
      slowestRenderers: renderClassStats.slice(0, 5),
      slowRendersDetected: renderClassStats.filter(r => r.avg > SentinelConfig.RENDER_SLOW_MS)
    };
  }

  /* ===============================
     SETTINGS & FLAG INTEGRITY
  =============================== */

  static generateIntegrityReport() {
    // Snapshot event arrays (copy, not live references)
    const settingsEvents = SWSEDebugger.events.filter(e => e.type === "settings:get").map(e => ({ ...e }));
    const flagGetEvents = SWSEDebugger.events.filter(e => e.type === "flag:get").map(e => ({ ...e }));
    const flagSetEvents = SWSEDebugger.events.filter(e => e.type === "flag:set").map(e => ({ ...e }));

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
    // Snapshot events (copy, not live references)
    const actorUpdates = SWSEDebugger.events
      .filter(e => e.type === "actor:update")
      .map(e => ({ ...e }));

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
    // Authority: SentinelEngine health classification
    // Direct import ensures deterministic path (not window bridge)
    return SentinelEngine.getHealthDetails() || {
      state: "UNKNOWN",
      reasons: [],
      timestamp: Date.now()
    };
  }

  /* ===============================
     FULL FORENSIC BUNDLE
  =============================== */

  static generateFullReport() {
    // Snapshot raw event count (don't hold live reference)
    const rawEventCount = SWSEDebugger.events.length;

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
      rawEventCount
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
