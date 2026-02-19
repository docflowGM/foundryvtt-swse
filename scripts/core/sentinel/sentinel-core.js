/**
 * SWSE Sentinel Runtime Kernel
 *
 * Central integrity layer managing all diagnostic systems
 * - Modular layer architecture
 * - Structured logging with severity levels
 * - Mode-based activation (OFF, DEV, STRICT, PRODUCTION)
 * - Non-invasive, non-mutating observation
 */

export class SentinelEngine {
  static MODES = {
    OFF: 0,
    DEV: 1,
    STRICT: 2,
    PRODUCTION: 3
  };

  static SEVERITY = {
    INFO: 0,
    WARN: 1,
    ERROR: 2,
    CRITICAL: 3
  };

  static #mode = SentinelEngine.MODES.OFF;
  static #layers = new Map();
  static #bootId = null;
  static #initialized = false;
  static #reportLog = [];
  static #severityThreshold = SentinelEngine.SEVERITY.INFO;

  // ========== PHASE 1: Aggregation / Bundling System ==========
  static #aggregates = new Map();

  // ========== PHASE 2: Health State Manager ==========
  static #healthState = 'HEALTHY';
  static #severityCounters = {
    WARN: 0,
    ERROR: 0,
    CRITICAL: 0
  };
  static #layerWarnCounts = new Map();

  // ========== PHASE 3: Hook Monitor ==========
  static #hookCalls = new Map();
  static #hookWindow = 500; // milliseconds

  // ========== PHASE 4: Performance Tracker ==========
  static #timers = new Map();
  static #performanceMetrics = new Map();

  // ========== PHASE 6: Strict Mode Mutation Guard ==========
  static #frozenObjects = new WeakSet();

  // ========== PHASE 7: Crash Snapshot Reporter ==========
  static #lastSnapshot = null;

  // ========== Boot Success Banner ==========
  static #bootComplete = false;

  /**
   * Bootstrap the Runtime Kernel
   * Reads settings and activates configured layers
   */
  static bootstrap() {
    if (this.#initialized) return;
    this.#initialized = true;
    this.#bootId = `boot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine mode from settings
    const devMode = game.settings.get('foundryvtt-swse', 'devMode');
    const sentinelMode = game.settings.get('foundryvtt-swse', 'sentinelMode');

    if (!devMode && sentinelMode === 'OFF') {
      this.#mode = this.MODES.OFF;
      return;
    }

    this.#mode = this.MODES[sentinelMode] || this.MODES.DEV;

    // Initialize all registered layers
    for (const [name, layer] of this.#layers) {
      if (layer.enabled) {
        try {
          layer.init();
        } catch (err) {
          this.report('kernel', this.SEVERITY.ERROR, `Failed to initialize layer: ${name}`, {
            error: err.message,
            stack: err.stack
          });
        }
      }
    }

    this.report('kernel', this.SEVERITY.INFO, 'Runtime Kernel Active', {
      mode: Object.keys(this.MODES)[this.#mode],
      layers: Array.from(this.#layers.entries())
        .filter(([_, layer]) => layer.enabled)
        .map(([name, _]) => name)
    });
  }

  /**
   * Register a diagnostic layer
   * @param {string} name - Layer identifier
   * @param {Object} layer - Layer with init() method
   */
  static registerLayer(name, layer) {
    if (this.#layers.has(name)) {
      console.warn(`[SENTINEL] Layer already registered: ${name}`);
      return;
    }

    // Determine if layer is enabled from settings
    const settingKey = `sentinel${name.charAt(0).toUpperCase() + name.slice(1)}`;
    let enabled = true;

    try {
      enabled = game.settings.get('foundryvtt-swse', settingKey);
    } catch {
      // Setting may not exist yet, default to true
      enabled = true;
    }

    this.#layers.set(name, {
      ...layer,
      enabled,
      name
    });
  }

  /**
   * Central reporting system
   * All logging routes through here
   * @param {string} layer - Source layer name
   * @param {number} severity - SEVERITY constant
   * @param {string} message - Human-readable message
   * @param {Object} meta - Additional context
   * @param {Object} options - Aggregation options { aggregateKey, sample, threshold }
   */
  static report(layer, severity, message, meta = {}, options = {}) {
    if (this.#mode === this.MODES.OFF) return;
    if (severity < this.#severityThreshold) return;

    // ========== PHASE 1: Aggregation Logic ==========
    const { aggregateKey, sample = true, threshold = 50 } = options;
    if (aggregateKey) {
      return this.#handleAggregation(layer, severity, message, meta, aggregateKey, sample, threshold);
    }

    // Standard report flow
    const severityName = Object.keys(this.SEVERITY)[severity];
    const report = {
      layer,
      severity: severityName,
      message,
      meta,
      timestamp: Date.now(),
      correlationId: this.#bootId,
      aggregated: false
    };

    this.#reportLog.push(report);

    // ========== PHASE 2: Health State Update ==========
    this.#updateHealthState(layer, severity);

    // Console output with color coding
    this.#logToConsole(report);
  }

  /**
   * PHASE 1: Handle aggregation
   * @private
   */
  static #handleAggregation(layer, severity, message, meta, aggregateKey, sample, threshold) {
    if (!this.#aggregates.has(aggregateKey)) {
      this.#aggregates.set(aggregateKey, {
        layer,
        message,
        count: 0,
        samples: [],
        severity,
        firstSeen: Date.now(),
        escalated: false
      });
    }

    const agg = this.#aggregates.get(aggregateKey);
    agg.count++;

    // Store up to 5 samples
    if (sample && agg.samples.length < 5) {
      agg.samples.push({ meta, timestamp: Date.now() });
    }

    // Check for escalation
    if (agg.count > threshold && !agg.escalated) {
      agg.escalated = true;
      agg.severity = Math.min(agg.severity + 1, this.SEVERITY.CRITICAL);
    }
  }

  /**
   * PHASE 2: Update health state based on severity
   * @private
   */
  static #updateHealthState(layer, severity) {
    const severityName = Object.keys(this.SEVERITY)[severity];

    // Count severity occurrences
    this.#severityCounters[severityName]++;

    // Track per-layer warnings
    const warnCount = (this.#layerWarnCounts.get(layer) || 0) + 1;
    this.#layerWarnCounts.set(layer, warnCount);

    // State transitions
    if (severity === this.SEVERITY.CRITICAL) {
      this.#setHealthState('CRITICAL');
      this.#dumpCriticalSnapshot();
    } else if (severity === this.SEVERITY.ERROR && this.#severityCounters.ERROR >= 3) {
      this.#setHealthState('UNSTABLE');
    } else if (severity === this.SEVERITY.WARN && warnCount >= 5) {
      if (this.#healthState !== 'UNSTABLE' && this.#healthState !== 'CRITICAL') {
        this.#setHealthState('DEGRADED');
      }
    }
  }

  /**
   * PHASE 2: Set health state with transition logging
   * @private
   */
  static #setHealthState(newState) {
    if (this.#healthState !== newState) {
      const oldState = this.#healthState;
      this.#healthState = newState;

      if (oldState !== newState) {
        const report = {
          layer: 'engine',
          severity: newState === 'HEALTHY' ? 'INFO' : 'WARN',
          message: `System health changed: ${oldState} → ${newState}`,
          meta: { from: oldState, to: newState },
          timestamp: Date.now(),
          correlationId: this.#bootId,
          aggregated: false
        };

        this.#reportLog.push(report);
        this.#logToConsole(report);
      }
    }
  }

  /**
   * Format and output report to console
   * @private
   */
  static #logToConsole(report) {
    const { severity, message, layer, meta } = report;

    let color, icon;
    switch (severity) {
      case 'INFO':
        color = 'color:cyan;';
        icon = 'ℹ';
        break;
      case 'WARN':
        color = 'color:orange;font-weight:bold;';
        icon = '⚠';
        break;
      case 'ERROR':
        color = 'color:red;font-weight:bold;';
        icon = '✘';
        break;
      case 'CRITICAL':
        color = 'color:red;background:yellow;font-weight:bold;';
        icon = '🔴';
        break;
      default:
        color = '';
        icon = '';
    }

    const prefix = `%c[SWSE SENTINEL] [${layer}] ${icon}`;
    if (Object.keys(meta).length > 0) {
      console.log(prefix, color, message, meta);
    } else {
      console.log(prefix, color, message);
    }
  }

  /**
   * Set runtime mode
   * @param {number} mode - MODES constant
   */
  static setMode(mode) {
    this.#mode = mode;
    this.report('kernel', this.SEVERITY.INFO, 'Mode changed', { mode: Object.keys(this.MODES)[mode] });
  }

  /**
   * Get current mode
   */
  static getMode() {
    return this.#mode;
  }

  /**
   * Get all reports since boot
   */
  static getReports(layerFilter = null, severityFilter = null) {
    let reports = this.#reportLog;

    if (layerFilter) {
      reports = reports.filter(r => r.layer === layerFilter);
    }

    if (severityFilter !== null) {
      reports = reports.filter(r => this.SEVERITY[r.severity] >= severityFilter);
    }

    return reports;
  }

  /**
   * Clear report log
   */
  static clearReports() {
    this.#reportLog = [];
  }

  /**
   * Check if Sentinel is active
   */
  static isActive() {
    return this.#mode !== this.MODES.OFF;
  }

  /**
   * Export diagnostics snapshot
   */
  static exportDiagnostics() {
    return {
      bootId: this.#bootId,
      mode: Object.keys(this.MODES)[this.#mode],
      initialized: this.#initialized,
      layers: Array.from(this.#layers.entries()).map(([name, layer]) => ({
        name,
        enabled: layer.enabled
      })),
      reports: this.#reportLog,
      health: this.#healthState,
      aggregates: this.#getAggregatesSummary()
    };
  }

  // ========== PHASE 1: Aggregation / Bundling System ==========

  /**
   * Flush all aggregates and log summary
   * Called after boot, after normalization, before shutdown
   */
  static flushAggregates() {
    if (this.#aggregates.size === 0) return;

    for (const [key, agg] of this.#aggregates.entries()) {
      const severityName = Object.keys(this.SEVERITY)[agg.severity];
      const message = `[AGGREGATED] ${agg.message} (${agg.count} occurrences)`;

      // Build sample list
      const sampleList = agg.samples
        .map(s => `- ${JSON.stringify(s.meta).substring(0, 80)}`)
        .join('\n');

      const report = {
        layer: agg.layer,
        severity: severityName,
        message,
        meta: {
          aggregateKey: key,
          count: agg.count,
          escalated: agg.escalated,
          samples: agg.samples.map(s => s.meta)
        },
        timestamp: Date.now(),
        correlationId: this.#bootId,
        aggregated: true
      };

      this.#reportLog.push(report);
      this.#logToConsole(report);
    }

    this.#aggregates.clear();
  }

  /**
   * Get summary of aggregates without flushing
   * @private
   */
  static #getAggregatesSummary() {
    const summary = {};
    for (const [key, agg] of this.#aggregates.entries()) {
      summary[key] = {
        count: agg.count,
        severity: Object.keys(this.SEVERITY)[agg.severity],
        escalated: agg.escalated
      };
    }
    return summary;
  }

  // ========== PHASE 2: Health State Manager ==========

  /**
   * Get current health state
   */
  static getHealthState() {
    return this.#healthState;
  }

  /**
   * Reset health state (for testing or recovery)
   */
  static resetHealthState() {
    this.#healthState = 'HEALTHY';
    this.#severityCounters = { WARN: 0, ERROR: 0, CRITICAL: 0 };
    this.#layerWarnCounts.clear();
  }

  // ========== PHASE 3: Hook Monitor ==========

  /**
   * Track hook invocation (called by Sentry)
   * @param {string} hookName - Hook identifier
   * @param {number} windowMs - Time window for detection (default 500ms)
   */
  static trackHookCall(hookName, windowMs = this.#hookWindow) {
    const now = performance.now();

    if (!this.#hookCalls.has(hookName)) {
      this.#hookCalls.set(hookName, []);
    }

    const calls = this.#hookCalls.get(hookName);
    calls.push(now);

    // Clean old calls outside window
    const filtered = calls.filter(t => now - t < windowMs);
    this.#hookCalls.set(hookName, filtered);

    // Detect recursion: > 25 calls in window
    if (filtered.length > 25) {
      this.report('sentry', this.SEVERITY.CRITICAL, 'Possible hook recursion detected', {
        hookName,
        callsInWindow: filtered.length,
        windowMs
      });
    }
  }

  // ========== PHASE 4: Performance Tracker ==========

  /**
   * Start named timer
   * @param {string} label - Timer identifier
   */
  static startTimer(label) {
    this.#timers.set(label, performance.now());
  }

  /**
   * End named timer and record metric
   * @param {string} label - Timer identifier
   * @returns {number} Elapsed milliseconds
   */
  static endTimer(label) {
    const start = this.#timers.get(label);
    if (!start) {
      console.warn(`[SENTINEL] Timer not started: ${label}`);
      return 0;
    }

    const elapsed = performance.now() - start;
    this.#timers.delete(label);

    // Track rolling average
    if (!this.#performanceMetrics.has(label)) {
      this.#performanceMetrics.set(label, {
        samples: [],
        average: 0
      });
    }

    const metric = this.#performanceMetrics.get(label);
    metric.samples.push(elapsed);

    // Keep last 10 samples
    if (metric.samples.length > 10) {
      metric.samples.shift();
    }

    metric.average = metric.samples.reduce((a, b) => a + b, 0) / metric.samples.length;

    // Warn if exceeds 2x baseline
    const baseline = 16; // ~60fps target
    if (elapsed > baseline * 2) {
      this.report('sentry', this.SEVERITY.WARN, `Performance threshold exceeded: ${label}`, {
        elapsed: elapsed.toFixed(2) + 'ms',
        baseline: baseline + 'ms',
        average: metric.average.toFixed(2) + 'ms'
      });
    }

    return elapsed;
  }

  /**
   * Get performance metrics snapshot
   */
  static getPerformanceMetrics() {
    const metrics = {};
    for (const [label, data] of this.#performanceMetrics.entries()) {
      metrics[label] = {
        average: data.average.toFixed(2),
        samples: data.samples.length,
        min: Math.min(...data.samples).toFixed(2),
        max: Math.max(...data.samples).toFixed(2)
      };
    }
    return metrics;
  }

  // ========== PHASE 6: Strict Mode Mutation Guard ==========

  /**
   * Freeze object for strict mode
   * @param {Object} obj - Object to freeze
   * @param {string} label - Label for reporting
   */
  static freezeStrict(obj, label = 'object') {
    if (this.#mode !== this.MODES.STRICT) return;

    try {
      Object.freeze(obj);
      this.#frozenObjects.add(obj);
    } catch (err) {
      this.report('engine', this.SEVERITY.CRITICAL, `Failed to freeze ${label}`, {
        label,
        error: err.message
      });
    }
  }

  /**
   * Detect mutation attempt (called by Sentry on error)
   * @param {string} label - Context label
   * @param {Error} error - Original mutation error
   */
  static reportMutationAttempt(label, error) {
    if (this.#mode === this.MODES.STRICT) {
      this.report('engine', this.SEVERITY.CRITICAL, `Mutation detected in STRICT mode: ${label}`, {
        label,
        message: error?.message,
        type: error?.name
      });
    }
  }

  // ========== PHASE 7: Crash Snapshot Reporter ==========

  /**
   * Generate and log critical snapshot
   * @private
   */
  static #dumpCriticalSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      correlationId: this.#bootId,
      mode: Object.keys(this.MODES)[this.#mode],
      healthState: this.#healthState,
      lastReports: this.#reportLog.slice(-10).map(r => ({
        severity: r.severity,
        layer: r.layer,
        message: r.message,
        timestamp: r.timestamp
      })),
      layerCounts: Array.from(this.#layerWarnCounts.entries()).reduce((acc, [layer, count]) => {
        acc[layer] = count;
        return acc;
      }, {}),
      registrySizes: this.#getRegistrySizes(),
      activeHooks: Array.from(this.#hookCalls.entries())
        .filter(([_, calls]) => calls.length > 0)
        .map(([hook, calls]) => ({ hook, count: calls.length }))
    };

    this.#lastSnapshot = snapshot;

    // Print structured output
    console.error(
      '%c=== SENTINEL CRITICAL SNAPSHOT ===',
      'color:red;background:yellow;font-weight:bold;'
    );
    console.error(
      `%cCorrelation ID: ${snapshot.correlationId}\nMode: ${snapshot.mode}\nHealth: ${snapshot.healthState}`,
      'color:red;font-weight:bold;'
    );
    console.error('Last 10 reports:', snapshot.lastReports);
    console.error('Layer warning counts:', snapshot.layerCounts);
    console.error('Registry sizes:', snapshot.registrySizes);
    console.error('Active hooks:', snapshot.activeHooks);
    console.error('%c===================================', 'color:red;background:yellow;font-weight:bold;');
  }

  /**
   * Dump critical snapshot on demand
   */
  static dumpSnapshot() {
    if (this.#lastSnapshot) {
      console.log('Last Critical Snapshot:', this.#lastSnapshot);
      return this.#lastSnapshot;
    }
    console.log('No critical snapshot yet.');
    return null;
  }

  /**
   * Get registry sizes
   * @private
   */
  static #getRegistrySizes() {
    const sizes = {};
    try {
      if (window.SWSEData) {
        if (window.SWSEData.TalentTreeDB) sizes.TalentTreeDB = Object.keys(window.SWSEData.TalentTreeDB).length;
        if (window.SWSEData.TalentDB) sizes.TalentDB = Object.keys(window.SWSEData.TalentDB).length;
        if (window.SWSEData.SpeciesDB) sizes.SpeciesDB = Object.keys(window.SWSEData.SpeciesDB).length;
        if (window.SWSEData.ClassDB) sizes.ClassDB = Object.keys(window.SWSEData.ClassDB).length;
        if (window.SWSEData.FeatDB) sizes.FeatDB = Object.keys(window.SWSEData.FeatDB).length;
      }
    } catch (err) {
      // Silently fail
    }
    return sizes;
  }

  // ========== Public API & Shutdown ==========

  /**
   * Shutdown sequence
   * Flush aggregates and prepare for close
   */
  static shutdown() {
    this.flushAggregates();
    this.report('engine', this.SEVERITY.INFO, 'Sentinel shutdown initiated', {
      totalReports: this.#reportLog.length,
      finalHealth: this.#healthState
    });
  }

  /**
   * Get structured status for public API
   */
  static getStatus() {
    return {
      mode: Object.keys(this.MODES)[this.#mode],
      healthState: this.#healthState,
      totalReports: this.#reportLog.length,
      aggregates: this.#getAggregatesSummary(),
      correlationId: this.#bootId,
      metrics: this.getPerformanceMetrics()
    };
  }

  // ========== Boot Success Banner ==========

  /**
   * Mark boot complete and emit success banner
   * Only emits once, only if system is healthy (not CRITICAL)
   */
  static markBootComplete() {
    if (this.#bootComplete) return; // Already emitted
    if (this.#healthState === 'CRITICAL') {
      this.report('engine', this.SEVERITY.INFO, 'Boot completed with critical issues — check Sentinel snapshot', {
        health: this.#healthState
      });
      return;
    }

    this.#bootComplete = true;

    // Print ASCII SWSE banner
    const banner = `
  ___   _    _  ______  ______
 / ___| | |  | ||  ____||  ____|
| |     | |__| || |__   | |__
| |     |  __  ||  __|  |  __|
 \\ \\___| | || || |     | |
  \\____| |_||_||_|     |_|
`;

    console.log(
      '%c' + banner,
      'color:cyan;font-family:monospace;font-weight:bold;font-size:12px;'
    );

    console.log(
      '%c✦ The Galaxy has loaded, may the Force be with you! ✦',
      'color:cyan;font-weight:bold;font-size:14px;text-align:center;'
    );

    // Log through Sentinel
    this.report('engine', this.SEVERITY.INFO, 'The Galaxy has loaded, may the Force be with you!', {
      health: this.#healthState,
      totalReports: this.#reportLog.length,
      bootDuration: Date.now() - (this.#bootId ? parseInt(this.#bootId.split('-')[1]) : Date.now())
    });
  }
}
