/**
 * SWSE SENTINEL ENGINE
 *
 * Central nervous system for runtime integrity diagnostics.
 *
 * Responsibilities:
 * - Centralized logging funnel
 * - Severity classification and escalation
 * - Mode management (OFF, DEV, STRICT, PRODUCTION)
 * - Correlation ID generation
 * - Event bus for report aggregation
 * - Summary reporting and analysis
 *
 * Does NOT:
 * - Perform detection logic
 * - Import Sentry or Investigator
 * - Mutate system data
 */

export const SentinelEngine = {
  // Configuration
  MODES: {
    OFF: 'OFF',
    DEV: 'DEV',
    STRICT: 'STRICT',
    PRODUCTION: 'PRODUCTION'
  },

  SEVERITY: {
    INFO: 0,
    WARN: 1,
    ERROR: 2,
    CRITICAL: 3
  },

  // Internal state
  _mode: 'OFF',
  _correlationId: null,
  _initialized: false,
  _reports: [],
  _listeners: new Map(),
  _severityCounts: {},
  _layerCounts: {},

  /**
   * Bootstrap the engine
   * Called once during system ready
   */
  bootstrap() {
    if (this._initialized) return;
    this._initialized = true;

    // Generate unique boot ID
    this._correlationId = `boot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Read mode from settings (or default to DEV if devMode enabled)
    try {
      const devMode = game.settings.get('foundryvtt-swse', 'devMode');
      const sentinelMode = game.settings.get('foundryvtt-swse', 'sentinelMode');
      this._mode = sentinelMode || (devMode ? this.MODES.DEV : this.MODES.OFF);
    } catch {
      this._mode = this.MODES.DEV;
    }

    // Initialize severity counters
    for (const sev in this.SEVERITY) {
      this._severityCounts[sev] = 0;
    }

    if (this._mode !== this.MODES.OFF) {
      this.report('engine', this.SEVERITY.INFO, 'Sentinel Engine bootstrapped', {
        mode: this._mode,
        correlationId: this._correlationId
      });
    }
  },

  /**
   * Central logging funnel
   * All diagnostic reports must flow through here
   *
   * @param {string} layer - Source layer (sentry, investigator, engine)
   * @param {number} severity - SEVERITY constant
   * @param {string} message - Human-readable message
   * @param {Object} meta - Additional context
   */
  report(layer, severity, message, meta = {}) {
    if (this._mode === this.MODES.OFF) return;

    const severityName = Object.keys(this.SEVERITY).find(
      k => this.SEVERITY[k] === severity
    );

    const report = {
      layer,
      severity: severityName,
      message,
      meta,
      timestamp: Date.now(),
      correlationId: this._correlationId
    };

    // Store report
    this._reports.push(report);

    // Update counters
    this._severityCounts[severityName] = (this._severityCounts[severityName] || 0) + 1;
    this._layerCounts[layer] = (this._layerCounts[layer] || 0) + 1;

    // Console output
    this._logToConsole(report);

    // Emit event for listeners
    this._emitEvent('report', report);

    // Check for escalation conditions
    this._checkEscalation();
  },

  /**
   * Console output with color coding
   * @private
   */
  _logToConsole(report) {
    const { layer, severity, message, meta } = report;

    let color, icon;
    switch (severity) {
      case 'INFO':
        color = 'color:cyan;font-size:11px;';
        icon = 'ℹ';
        break;
      case 'WARN':
        color = 'color:orange;font-weight:bold;font-size:11px;';
        icon = '⚠';
        break;
      case 'ERROR':
        color = 'color:red;font-weight:bold;font-size:11px;';
        icon = '✘';
        break;
      case 'CRITICAL':
        color = 'color:red;background:yellow;font-weight:bold;font-size:12px;';
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
  },

  /**
   * Check for escalation conditions
   * If multiple critical issues detected, escalate
   * @private
   */
  _checkEscalation() {
    // Count recent CRITICAL reports (last 500ms)
    const now = Date.now();
    const recentCriticals = this._reports.filter(
      r => r.severity === 'CRITICAL' && now - r.timestamp < 500
    );

    // Count recent ERRORs (last 500ms)
    const recentErrors = this._reports.filter(
      r => r.severity === 'ERROR' && now - r.timestamp < 500
    );

    // Escalation trigger: 3+ CRITICAL or 2+ CRITICAL + 2+ ERROR
    if (recentCriticals.length >= 3 || (recentCriticals.length >= 2 && recentErrors.length >= 2)) {
      this.report('engine', this.SEVERITY.CRITICAL, 'System integrity compromised - multiple critical issues detected', {
        criticalCount: recentCriticals.length,
        errorCount: recentErrors.length,
        timeWindow: '500ms'
      });
    }
  },

  /**
   * Register event listener
   * @param {string} event - Event name (report, etc.)
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  },

  /**
   * Emit internal event
   * @private
   */
  _emitEvent(event, data) {
    if (this._listeners.has(event)) {
      for (const callback of this._listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error('[SENTINEL] Event listener error:', err);
        }
      }
    }
  },

  /**
   * Set runtime mode
   * @param {string} mode - MODES constant
   */
  setMode(mode) {
    if (!this.MODES[mode]) {
      console.warn(`[SENTINEL] Invalid mode: ${mode}`);
      return;
    }
    this._mode = mode;
    this.report('engine', this.SEVERITY.INFO, 'Mode changed', { newMode: mode });
  },

  /**
   * Get current mode
   */
  getMode() {
    return this._mode;
  },

  /**
   * Get current status snapshot
   */
  getStatus() {
    return {
      mode: this._mode,
      correlationId: this._correlationId,
      initialized: this._initialized,
      totalReports: this._reports.length,
      severityCounts: { ...this._severityCounts },
      layerCounts: { ...this._layerCounts },
      layersActive: Object.keys(this._layerCounts)
    };
  },

  /**
   * Get all reports, optionally filtered
   * @param {string} layer - Filter by layer (optional)
   * @param {number} minSeverity - Filter by minimum severity (optional)
   */
  getReports(layer = null, minSeverity = null) {
    let reports = this._reports;

    if (layer) {
      reports = reports.filter(r => r.layer === layer);
    }

    if (minSeverity !== null) {
      reports = reports.filter(r => this.SEVERITY[r.severity] >= minSeverity);
    }

    return reports;
  },

  /**
   * Clear report history
   */
  clearReports() {
    this._reports = [];
    for (const key in this._severityCounts) {
      this._severityCounts[key] = 0;
    }
    this._layerCounts = {};
  }
};

/**
 * Export status to window for console access
 * Users can inspect: window.SWSE_SENTINEL_STATUS
 */
Hooks.once('ready', () => {
  window.SWSE_SENTINEL_STATUS = () => SentinelEngine.getStatus();
});
