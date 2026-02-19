/**
 * SWSE Sentinel Runtime Kernel
 *
 * Central integrity layer managing all diagnostic systems
 * - Modular layer architecture
 * - Structured logging with severity levels
 * - Mode-based activation (OFF, DEV, STRICT, PRODUCTION)
 * - Non-invasive, non-mutating observation
 */

export class Sentinel {
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

  static #mode = Sentinel.MODES.OFF;
  static #layers = new Map();
  static #bootId = null;
  static #initialized = false;
  static #reportLog = [];
  static #severityThreshold = Sentinel.SEVERITY.INFO;

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
   */
  static report(layer, severity, message, meta = {}) {
    if (this.#mode === this.MODES.OFF) return;
    if (severity < this.#severityThreshold) return;

    const report = {
      layer,
      severity: Object.keys(this.SEVERITY)[severity],
      message,
      meta,
      timestamp: Date.now(),
      correlationId: this.#bootId
    };

    this.#reportLog.push(report);

    // Console output with color coding
    this.#logToConsole(report);
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
      reports: this.#reportLog
    };
  }
}
