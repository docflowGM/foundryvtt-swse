/**
 * sentinel-init.js — Sentinel system initialization
 *
 * Called during system boot to initialize all Sentinel layers and debug APIs.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import { installSentinelDebugAPI } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-debug-api.js";

/**
 * Initialize Sentinel at system ready
 */
export function initializeSentinelGovernance() {
  Hooks.once("ready", () => {
    console.log("[SWSE Sentinel] Initializing diagnostic system...");

    // Bootstrap core engine (loads all registered layers)
    SentinelEngine.bootstrap();

    // Install GM debug API
    installSentinelDebugAPI();

    // Initialize all auto-init layers
    try {
      // Import and init passive layers
      import("/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-mall-cop.js")
        .then(m => m.SentinelMallCop.init?.());
    } catch (e) {
      console.warn("[Sentinel] Failed to init mall-cop", e);
    }

    // Mark boot complete and emit banner
    SentinelEngine.markBootComplete?.();
  });
}

/**
 * Install Sentinel API into global scope for GM access
 */
export function installSentinelAPI() {
  if (!globalThis.SWSE) {
    globalThis.SWSE = {};
  }

  // Expose SentinelEngine as SWSE.sentinel
  globalThis.SWSE.sentinel = {
    getReports: (layer, severity) => SentinelEngine.getReports(layer, severity),
    getStatus: () => SentinelEngine.getStatus(),
    getHealth: () => SentinelEngine.getHealthState(),
    exportDiagnostics: () => SentinelEngine.exportDiagnostics(),
    clearReports: () => SentinelEngine.clearReports()
  };

  console.log("[SWSE] Sentinel API installed (SWSE.sentinel.*)");
  console.log("[SWSE] Debug API installed (SWSE.debug.sentinel.*)");
}
