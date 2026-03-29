/**
 * PanelDiagnostics
 *
 * Tracks panel rendering performance and lifecycle for debugging and optimization.
 * Silent in normal mode, verbose in dev/strict modes.
 *
 * Helps identify:
 * - Which panels are expensive
 * - Which panels are rebuilt unnecessarily
 * - Performance regressions over time
 * - Contract violations
 */

export class PanelDiagnostics {
  constructor() {
    // Timing data: { panelName: [{ timestamp, duration, reason }] }
    this.timings = {};

    // Current render session
    this.currentSession = null;

    // Performance thresholds (ms)
    this.THRESHOLDS = {
      WARN_BUILDER: 5,    // Warn if builder takes >5ms
      WARN_RERENDER: 20,  // Warn if full rerender takes >20ms
      WARN_VALIDATOR: 2   // Warn if validator takes >2ms
    };

    // Dev mode flag
    this.devMode = CONFIG?.SWSE?.strictMode ?? false;
  }

  /**
   * Start a render session
   * @param {string} reason - Why render was triggered (mount, update, etc.)
   */
  startSession(reason) {
    this.currentSession = {
      reason,
      startTime: performance.now(),
      panelsBuilt: [],
      panelsSkipped: [],
      errors: []
    };
  }

  /**
   * Record a panel being built
   * @param {string} panelName - Name of panel
   * @param {number} duration - Time to build (ms)
   * @param {object} metadata - Additional info
   */
  recordPanelBuild(panelName, duration, metadata = {}) {
    if (!this.currentSession) return;

    this.currentSession.panelsBuilt.push({
      name: panelName,
      duration,
      ...metadata
    });

    // Initialize timing data for this panel
    if (!this.timings[panelName]) {
      this.timings[panelName] = [];
    }
    this.timings[panelName].push({
      timestamp: new Date(),
      duration,
      reason: this.currentSession.reason
    });

    // Keep only last 100 measurements per panel
    if (this.timings[panelName].length > 100) {
      this.timings[panelName].shift();
    }

    // Warn if exceeds threshold
    if (this.devMode && duration > this.THRESHOLDS.WARN_BUILDER) {
      console.warn(`[PERF] Panel builder exceeded threshold: ${panelName} took ${duration.toFixed(2)}ms (threshold: ${this.THRESHOLDS.WARN_BUILDER}ms)`);
    }
  }

  /**
   * Record a panel being skipped
   * @param {string} panelName - Name of panel
   * @param {string} reason - Why it was skipped
   */
  recordPanelSkipped(panelName, reason) {
    if (!this.currentSession) return;
    this.currentSession.panelsSkipped.push({ name: panelName, reason });
  }

  /**
   * Record a validation error
   * @param {string} panelName - Name of panel
   * @param {string} error - Error message
   */
  recordError(panelName, error) {
    if (!this.currentSession) return;
    this.currentSession.errors.push({ panel: panelName, error });
  }

  /**
   * Record a validator run
   * @param {string} panelName - Name of panel
   * @param {number} duration - Time to validate (ms)
   * @param {boolean} valid - Whether validation passed
   */
  recordValidation(panelName, duration, valid) {
    if (!this.devMode) return;

    if (duration > this.THRESHOLDS.WARN_VALIDATOR) {
      console.warn(`[PERF] Validator exceeded threshold: ${panelName} took ${duration.toFixed(2)}ms (threshold: ${this.THRESHOLDS.WARN_VALIDATOR}ms)`);
    }

    if (!valid) {
      console.warn(`[VALIDATION] ${panelName} contract validation failed`);
    }
  }

  /**
   * End current session and log results
   */
  endSession() {
    if (!this.currentSession) return;

    const duration = performance.now() - this.currentSession.startTime;
    const totalBuilt = this.currentSession.panelsBuilt.length;
    const totalSkipped = this.currentSession.panelsSkipped.length;
    const totalBuiltTime = this.currentSession.panelsBuilt.reduce((sum, p) => sum + p.duration, 0);

    if (!this.devMode && duration < this.THRESHOLDS.WARN_RERENDER) {
      // Silent in normal mode if under threshold
      this.currentSession = null;
      return;
    }

    // Log in dev mode or if slow
    if (this.devMode || duration > this.THRESHOLDS.WARN_RERENDER) {
      console.log(`[RENDER] ${this.currentSession.reason}: ${totalBuilt} panels built, ${totalSkipped} skipped`);
      console.log(`  Total build time: ${totalBuiltTime.toFixed(2)}ms`);
      console.log(`  Full render time: ${duration.toFixed(2)}ms`);

      if (this.currentSession.panelsBuilt.length > 0) {
        const slowest = this.currentSession.panelsBuilt.sort((a, b) => b.duration - a.duration)[0];
        console.log(`  Slowest: ${slowest.name} (${slowest.duration.toFixed(2)}ms)`);
      }

      if (this.currentSession.errors.length > 0) {
        console.error(`[RENDER ERRORS] ${this.currentSession.errors.length} error(s) during render`);
        for (const err of this.currentSession.errors) {
          console.error(`  ${err.panel}: ${err.error}`);
        }
      }
    }

    this.currentSession = null;
  }

  /**
   * Get average build time for a panel
   * @param {string} panelName - Name of panel
   * @returns {number} Average time in ms
   */
  getAverageTime(panelName) {
    if (!this.timings[panelName] || this.timings[panelName].length === 0) {
      return 0;
    }
    const total = this.timings[panelName].reduce((sum, t) => sum + t.duration, 0);
    return total / this.timings[panelName].length;
  }

  /**
   * Get diagnostic summary
   * @returns {object}
   */
  getSummary() {
    const summary = {};
    for (const [panelName, times] of Object.entries(this.timings)) {
      const durations = times.map(t => t.duration);
      summary[panelName] = {
        count: times.length,
        avgTime: durations.reduce((a, b) => a + b, 0) / durations.length,
        minTime: Math.min(...durations),
        maxTime: Math.max(...durations),
        lastReason: times[times.length - 1]?.reason || 'unknown'
      };
    }
    return summary;
  }

  /**
   * Log detailed diagnostics (for debugging)
   */
  logDiagnostics() {
    const summary = this.getSummary();
    console.table(summary);

    // Identify potential optimizations
    const expensive = Object.entries(summary)
      .filter(([_, stats]) => stats.avgTime > this.THRESHOLDS.WARN_BUILDER)
      .sort((a, b) => b[1].avgTime - a[1].avgTime);

    if (expensive.length > 0) {
      console.log('[OPTIMIZATION CANDIDATES]');
      for (const [panelName, stats] of expensive) {
        console.log(`  ${panelName}: avg ${stats.avgTime.toFixed(2)}ms (max ${stats.maxTime.toFixed(2)}ms)`);
      }
    }
  }

  /**
   * Clear all diagnostics
   */
  clear() {
    this.timings = {};
    this.currentSession = null;
  }
}

// Singleton instance
export const panelDiagnostics = new PanelDiagnostics();
