/**
 * sentinel-update-atomicity.js — Monitor for non-atomic updates and loops
 *
 * Validates:
 * - Updates are atomic (one update per UX action, not bursts)
 * - No update loops (same field updated multiple times)
 * - Debounced to avoid false positives
 *
 * Integrates with ActorEngine loop detector.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export class SentinelUpdateAtomicity {
  static updateTracking = new Map(); // actorId → { updates: [], lastCheck: timestamp }
  static debounceTimers = new Map(); // actorId → timer
  static DEBOUNCE_WINDOW = 250; // ms
  static UPDATE_BURST_THRESHOLD = 3; // 3+ updates in window = burst

  static init() {
    SentinelEngine.registerLayer("update-atomicity", {
      enabled: true,
      readOnly: true,
      description: "Update loop and atomicity monitoring"
    });

    // Hook into actor updates
    Hooks.on("preUpdateActor", (actor, updates) => {
      this.trackUpdate(actor, updates);
    });

    console.log("[SWSE Sentinel] Update-Atomicity layer initialized");
  }

  /**
   * Track an update and debounce analysis
   */
  static trackUpdate(actor, updates) {
    if (!actor || !actor.id) return;

    const actorId = actor.id;

    // Create tracking entry if needed
    if (!this.updateTracking.has(actorId)) {
      this.updateTracking.set(actorId, {
        updates: [],
        lastCheck: Date.now()
      });
    }

    const tracking = this.updateTracking.get(actorId);

    // Record update
    tracking.updates.push({
      timestamp: Date.now(),
      fields: Object.keys(updates),
      source: this._getUpdateSource()
    });

    // Clear old debounce timer
    if (this.debounceTimers.has(actorId)) {
      clearTimeout(this.debounceTimers.get(actorId));
    }

    // Set new debounce timer to analyze after quiet period
    const timer = setTimeout(() => {
      this._analyzeUpdatePattern(actor, tracking);
      this.debounceTimers.delete(actorId);
    }, this.DEBOUNCE_WINDOW);

    this.debounceTimers.set(actorId, timer);
  }

  /**
   * Analyze updates in current window for patterns
   */
  static _analyzeUpdatePattern(actor, tracking) {
    const now = Date.now();
    const window = 500; // Look back 500ms

    // Filter updates in current window
    const recentUpdates = tracking.updates.filter(
      u => now - u.timestamp < window
    );

    if (recentUpdates.length === 0) {
      tracking.updates = []; // Clear stale updates
      return;
    }

    // Check for burst (3+ updates in 500ms)
    if (recentUpdates.length >= this.UPDATE_BURST_THRESHOLD) {
      const burstDuration = Math.max(...recentUpdates.map(u => u.timestamp)) -
                            Math.min(...recentUpdates.map(u => u.timestamp));

      SentinelEngine.report({
        aggregationKey: `sentinel-update-atomicity-${actor.id}-burst`,
        severity: "WARN",
        layer: "update-atomicity",
        title: `Potential non-atomic update: ${recentUpdates.length} updates in ${burstDuration}ms`,
        details: {
          actorId: actor.id,
          actorName: actor.name,
          updateCount: recentUpdates.length,
          duration: burstDuration,
          updates: recentUpdates.map(u => ({
            fields: u.fields,
            source: u.source
          })),
          timestamp: now
        },
        timestamp: now
      });
    }

    // Check for field repetition (same field updated multiple times)
    const fieldCounts = {};
    for (const update of recentUpdates) {
      for (const field of update.fields) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    }

    const repeatedFields = Object.entries(fieldCounts)
      .filter(([, count]) => count > 1)
      .map(([field]) => field);

    if (repeatedFields.length > 0) {
      SentinelEngine.report({
        aggregationKey: `sentinel-update-atomicity-${actor.id}-repeated-fields`,
        severity: "INFO",
        layer: "update-atomicity",
        title: `Fields updated multiple times: ${repeatedFields.join(", ")}`,
        details: {
          actorId: actor.id,
          actorName: actor.name,
          repeatedFields,
          totalUpdates: recentUpdates.length,
          timestamp: now
        },
        timestamp: now,
        devOnly: true
      });
    }

    // Clear updates after analysis
    tracking.updates = [];
  }

  /**
   * Detect update source (UI, engine, macro, etc.)
   * @private
   */
  static _getUpdateSource() {
    // Examine call stack to determine source
    const stack = new Error().stack || "";

    if (stack.includes("ActorEngine")) return "ActorEngine";
    if (stack.includes("CharacterSheet")) return "CharacterSheet";
    if (stack.includes("Dialog")) return "Dialog";
    if (stack.includes("Macro")) return "Macro";
    if (stack.includes("Hook")) return "Hook";

    return "Unknown";
  }
}

// Auto-init
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    if (game.settings.get?.("foundryvtt-swse", "sentinelUpdateAtomicity") ?? true) {
      SentinelUpdateAtomicity.init();
    }
  });
}
