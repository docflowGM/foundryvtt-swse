/**
 * sentinel-sheet-guardrails.js — Monitor sheet context and listener health
 *
 * Tracks violations detected by defensive guardrails:
 * - Missing context keys (hydration failures)
 * - Listener accumulation (memory leaks)
 * - Render quality issues
 *
 * Provides API for guardrail functions to report violations to Sentinel.
 * Non-invasive, aggregating, auto-escalating on frequency.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export class SentinelSheetGuardrails {
  static #violationCounts = new Map();
  static #sheetInstances = new Set();

  static init() {
    SentinelEngine.registerLayer("sheet-guardrails", {
      enabled: true,
      readOnly: true,
      description: "Defensive guardrails monitoring for sheet context and listener health",
      // Layer init (called by SentinelEngine.bootstrap)
      init: () => {
        console.log("[SWSE Sentinel] Sheet-Guardrails layer ready");
      }
    });

    console.log("[SWSE Sentinel] Sheet-Guardrails layer initialized");
  }

  /**
   * Report a missing context key violation
   * Called from validateContextContract() in character-sheet.js
   *
   * @param {string} sheetName - Sheet class name (e.g. "SWSEV2CharacterSheet")
   * @param {string[]} missing - Array of missing context keys
   * @param {object} context - The actual context object (for debugging)
   */
  static reportMissingContextKeys(sheetName, missing, context = {}) {
    const aggregateKey = `sheet-guardrails-missing-keys-${sheetName}`;
    const missingList = missing.join(", ");

    // Count unique missing keys across violations
    const violationKey = `${sheetName}-${missing.sort().join('|')}`;
    const count = (this.#violationCounts.get(violationKey) || 0) + 1;
    this.#violationCounts.set(violationKey, count);

    // Only escalate after repeated violations
    let severity = SentinelEngine.SEVERITY.WARN;
    if (count > 3) {
      severity = SentinelEngine.SEVERITY.ERROR;
    }

    SentinelEngine.report(
      "sheet-guardrails",
      severity,
      `${sheetName} missing context keys on render`,
      {
        sheetName,
        missing,
        missingCount: missing.length,
        violationCount: count,
        contextKeys: Object.keys(context).slice(0, 20) // Sample first 20 keys
      },
      {
        aggregateKey,
        category: "context-hydration",
        subcode: `MISSING_KEYS_${missing[0] || "UNKNOWN"}`,
        source: "validateContextContract()"
      }
    );
  }

  /**
   * Report a listener accumulation violation
   * Called from watchListenerCount() in character-sheet.js
   *
   * @param {string} sheetName - Sheet class name
   * @param {number} elementCount - Total DOM element count
   * @param {number} threshold - Threshold that was exceeded
   */
  static reportListenerAccumulation(sheetName, elementCount, threshold = 50) {
    const aggregateKey = `sheet-guardrails-listener-leak-${sheetName}`;
    const thresholdLimit = threshold * 2;

    let severity = SentinelEngine.SEVERITY.WARN;
    if (elementCount > thresholdLimit * 1.5) {
      severity = SentinelEngine.SEVERITY.ERROR;
    }
    if (elementCount > thresholdLimit * 3) {
      severity = SentinelEngine.SEVERITY.CRITICAL;
    }

    SentinelEngine.report(
      "sheet-guardrails",
      severity,
      `${sheetName} possible listener accumulation (${elementCount} DOM elements)`,
      {
        sheetName,
        elementCount,
        threshold: thresholdLimit,
        percentageOver: Math.round(((elementCount - thresholdLimit) / thresholdLimit) * 100),
        recommendation: "Check browser DevTools Memory tab for heap snapshot growth"
      },
      {
        aggregateKey,
        category: "memory-leak",
        subcode: "LISTENER_ACCUMULATION",
        source: "watchListenerCount()"
      }
    );
  }

  /**
   * Track sheet instance for statistical monitoring
   *
   * @param {string} sheetName - Sheet class name
   */
  static trackSheetInstance(sheetName) {
    this.#sheetInstances.add(sheetName);
  }

  /**
   * Get aggregated violation summary
   * Useful for dashboards/debugging
   */
  static getViolationSummary() {
    const summary = {
      totalViolations: this.#violationCounts.size,
      sheetsMonitored: Array.from(this.#sheetInstances),
      violations: Object.fromEntries(
        Array.from(this.#violationCounts.entries()).map(([key, count]) => [key, count])
      )
    };

    return summary;
  }

  /**
   * Reset violation tracking (useful for test runs)
   */
  static reset() {
    this.#violationCounts.clear();
    this.#sheetInstances.clear();
  }
}

// Auto-init
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    // Safely check setting, default to true if not registered
    let enabled = true;
    try {
      enabled = game.settings.get?.("foundryvtt-swse", "sentinelSheetGuardrails") ?? true;
    } catch (e) {
      // Setting not registered, use default (enabled)
      enabled = true;
    }

    if (enabled) {
      SentinelSheetGuardrails.init();
    }
  });
}
