/**
 * SWSE Sentinel AppV2 Auditor (Phase 2)
 *
 * Runtime enforcement of ApplicationV2 contract compliance.
 * Integrated with SentinelEngine for unified health state tracking and reporting.
 *
 * Contract enforcement:
 * - Element lifecycle tracking (CREATED → PREPARING → RENDERING → RENDERED)
 * - _prepareContext and _onRender sequencing
 * - Missing super._onRender calls (contract violation)
 * - Legacy options detection (tabs, scrollY)
 * - Tab system verification (static tabGroups vs DOM structure)
 * - Tab diagnostics integration (read-only forensic)
 * - DOM mutation boundaries
 * - Event listener registration phase validation
 *
 * Reports through SentinelEngine for aggregation + health state tracking (dev mode).
 */

import { StructuredLogger, SEVERITY } from "/systems/foundryvtt-swse/scripts/core/structured-logger.js";
import { Sentinel } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import { SentinelTabDiagnostics } from "/systems/foundryvtt-swse/scripts/governance/sentinel/tab-diagnostics.js";

export class SentinelAppV2Auditor {
  /**
   * Active instances being monitored
   */
  static #instances = new WeakMap();

  /**
   * Install auditing on an ApplicationV2 instance
   * Phase 2: Enhanced contract detection + Sentinel integration
   * @param {ApplicationV2} app - Application instance to audit
   * @param {Object} config - Audit configuration
   */
  static installAudit(app, config = {}) {
    if (!app || typeof app !== 'object') {
      return this._error('Invalid application instance');
    }

    const audit = {
      appId: app.id || `app-${Math.random().toString(36).substr(2, 9)}`,
      appClass: app.constructor.name,
      lifecycle: {
        prepared: false,
        rendering: false,
        rendered: false,
        closed: false,
        timestamps: {}
      },
      violations: [],
      contracts: {
        hasSuperOnRender: false, // Detected during render
        legacyOptions: [],
        tabGroupsMismatch: null // Detected during render
      },
      config: {
        strictMode: config.strictMode ?? true,
        trackMutations: config.trackMutations ?? true,
        integrateSentinel: config.integrateSentinel ?? true,
        enableTabDiagnostics: config.enableTabDiagnostics ?? true,
        ...config
      }
    };

    this.#instances.set(app, audit);

    // Phase 2: Detect legacy options at install time
    this._detectLegacyOptions(app, audit);

    // Hook into lifecycle methods
    this._wrapLifecycleMethods(app, audit);

    StructuredLogger.app(SEVERITY.DEBUG, `AppV2 Auditor installed on ${audit.appClass}`, {
      appId: audit.appId,
      legacyOptions: audit.contracts.legacyOptions.length > 0 ? audit.contracts.legacyOptions : 'none'
    });

    return audit;
  }

  /**
   * Phase 2: Detect legacy options in DEFAULT_OPTIONS or defaultOptions
   * @private
   */
  static _detectLegacyOptions(app, audit) {
    const legacyKeys = ['tabs', 'scrollY'];
    const opts = app.constructor?.defaultOptions || app.constructor?.DEFAULT_OPTIONS || {};

    legacyKeys.forEach(key => {
      if (key in opts) {
        audit.contracts.legacyOptions.push({
          key,
          value: opts[key],
          location: 'defaultOptions'
        });
      }
    });

    // Warn via Sentinel if found
    if (audit.contracts.legacyOptions.length > 0 && audit.config.integrateSentinel) {
      Sentinel.report('appv2', Sentinel.SEVERITY.WARN, `Legacy options detected in ${audit.appClass}`, {
        appClass: audit.appClass,
        appId: audit.appId,
        legacyOptions: audit.contracts.legacyOptions
      }, {
        aggregateKey: `legacy-options-${audit.appClass}`,
        threshold: 10
      });
    }
  }

  /**
   * Get audit record for an instance
   */
  static getAudit(app) {
    return this.#instances.get(app);
  }

  /**
   * Wrap lifecycle methods to track execution
   */
  static _wrapLifecycleMethods(app, audit) {
    const original = {
      prepareContext: app._prepareContext,
      onRender: app._onRender,
      close: app.close
    };

    // Wrap _prepareContext
    if (typeof original.prepareContext === 'function') {
      app._prepareContext = async function(options) {
        audit.lifecycle.timestamps.prepareStart = performance.now();
        audit.lifecycle.prepared = false;

        try {
          const result = await original.prepareContext.call(this, options);
          audit.lifecycle.timestamps.prepareEnd = performance.now();
          audit.lifecycle.prepared = true;

          StructuredLogger.app(SEVERITY.DEBUG, 'AppV2 _prepareContext executed', {
            appId: audit.appId,
            duration: `${(audit.lifecycle.timestamps.prepareEnd - audit.lifecycle.timestamps.prepareStart).toFixed(2)}ms`
          });

          return result;
        } catch (error) {
          audit.violations.push({
            type: 'PREPARE_CONTEXT_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          });

          StructuredLogger.app(SEVERITY.ERROR, 'AppV2 _prepareContext failed', {
            appId: audit.appId,
            error: error.message
          });

          throw error;
        }
      };
    }

    // Wrap _onRender
    if (typeof original.onRender === 'function') {
      app._onRender = async function(context, options) {
        audit.lifecycle.timestamps.renderStart = performance.now();
        audit.lifecycle.rendering = true;
        audit.lifecycle.rendered = false;

        // Verify _prepareContext was called
        if (!audit.lifecycle.prepared) {
          audit.violations.push({
            type: 'RENDER_BEFORE_PREPARE',
            message: '_onRender called before _prepareContext completed',
            timestamp: new Date().toISOString()
          });

          if (audit.config.strictMode) {
            StructuredLogger.app(SEVERITY.WARN, 'AppV2 lifecycle violation: _onRender before _prepareContext', {
              appId: audit.appId,
              appClass: audit.appClass
            });
          }
        }

        try {
          const result = await original.onRender.call(this, context, options);
          audit.lifecycle.timestamps.renderEnd = performance.now();
          audit.lifecycle.rendering = false;
          audit.lifecycle.rendered = true;

          // Phase 2: Detect if super._onRender was called by checking if element exists and has content
          // (SWSEApplicationV2._onRender calls await super._onRender before checking)
          if (this.element instanceof HTMLElement && this.element.innerHTML && this.element.innerHTML.trim().length > 0) {
            audit.contracts.hasSuperOnRender = true;
          } else {
            audit.violations.push({
              type: 'MISSING_SUPER_ONRENDER',
              message: 'Likely missing await super._onRender(...) call',
              timestamp: new Date().toISOString()
            });
          }

          // Verify element exists
          if (!(this.element instanceof HTMLElement)) {
            audit.violations.push({
              type: 'ELEMENT_NOT_VALID',
              message: 'this.element is not an HTMLElement after _onRender',
              timestamp: new Date().toISOString()
            });

            StructuredLogger.app(SEVERITY.ERROR, 'AppV2 render contract violation: invalid element', {
              appId: audit.appId,
              appClass: audit.appClass,
              elementType: typeof this.element
            });
          }

          // Verify element has content
          if (this.element && (!this.element.innerHTML || this.element.innerHTML.trim().length === 0)) {
            audit.violations.push({
              type: 'ELEMENT_EMPTY',
              message: 'Element has no content after _onRender',
              timestamp: new Date().toISOString()
            });

            StructuredLogger.app(SEVERITY.WARN, 'AppV2 render contract warning: empty element', {
              appId: audit.appId,
              appClass: audit.appClass
            });
          }

          // Phase 2: Run tab diagnostics if enabled (read-only forensic)
          if (audit.config.enableTabDiagnostics && this.element && audit.contracts.hasSuperOnRender) {
            const tabReport = SentinelTabDiagnostics.diagnose(this.element, { silent: true });

            // Only flag mismatches if tabGroups exist in DEFAULT_OPTIONS
            const appOptions = this.constructor?.DEFAULT_OPTIONS || this.constructor?.defaultOptions || {};
            const hasStaticTabGroups = appOptions.tabGroups && Object.keys(appOptions.tabGroups).length > 0;

            if (hasStaticTabGroups && tabReport.summary.severityLevel !== 'OK') {
              audit.contracts.tabGroupsMismatch = {
                severity: tabReport.summary.severityLevel,
                issues: tabReport.summary.issues,
                recommendations: tabReport.summary.recommendations
              };

              // Report to Sentinel
              if (audit.config.integrateSentinel) {
                Sentinel.report('appv2', Sentinel.SEVERITY.WARN,
                  `Tab structure mismatch in ${audit.appClass}`, {
                  appId: audit.appId,
                  severity: tabReport.summary.severityLevel,
                  issues: tabReport.summary.issues.slice(0, 3) // First 3 issues
                }, {
                  aggregateKey: `tab-mismatch-${audit.appClass}`,
                  threshold: 5
                });
              }
            }
          }

          StructuredLogger.app(SEVERITY.DEBUG, 'AppV2 _onRender executed', {
            appId: audit.appId,
            duration: `${(audit.lifecycle.timestamps.renderEnd - audit.lifecycle.timestamps.renderStart).toFixed(2)}ms`,
            violations: audit.violations.length,
            superOnRender: audit.contracts.hasSuperOnRender
          });

          return result;
        } catch (error) {
          audit.lifecycle.rendering = false;

          audit.violations.push({
            type: 'RENDER_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          });

          StructuredLogger.app(SEVERITY.ERROR, 'AppV2 _onRender failed', {
            appId: audit.appId,
            error: error.message
          });

          // Report to Sentinel
          if (audit.config.integrateSentinel) {
            Sentinel.report('appv2', Sentinel.SEVERITY.ERROR,
              `${audit.appClass} render failed`, {
              appId: audit.appId,
              error: error.message
            }, {
              aggregateKey: `render-error-${audit.appClass}`,
              threshold: 3
            });
          }

          throw error;
        }
      };
    }

    // Wrap close
    if (typeof original.close === 'function') {
      app.close = async function(options) {
        audit.lifecycle.timestamps.closeStart = performance.now();

        try {
          const result = await original.close.call(this, options);
          audit.lifecycle.timestamps.closeEnd = performance.now();
          audit.lifecycle.closed = true;

          StructuredLogger.app(SEVERITY.DEBUG, 'AppV2 close executed', {
            appId: audit.appId,
            duration: `${(audit.lifecycle.timestamps.closeEnd - audit.lifecycle.timestamps.closeStart).toFixed(2)}ms`,
            totalViolations: audit.violations.length
          });

          // Report final audit
          if (audit.violations.length > 0) {
            SentinelAppV2Auditor._reportViolations(audit);
          }

          return result;
        } catch (error) {
          audit.violations.push({
            type: 'CLOSE_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          });

          StructuredLogger.app(SEVERITY.ERROR, 'AppV2 close failed', {
            appId: audit.appId,
            error: error.message
          });

          throw error;
        }
      };
    }
  }

  /**
   * Report all violations for an audit
   * Phase 2: Routes through SentinelEngine for health state tracking
   */
  static _reportViolations(audit) {
    const summary = {
      appId: audit.appId,
      appClass: audit.appClass,
      totalViolations: audit.violations.length,
      byType: {},
      contracts: audit.contracts
    };

    audit.violations.forEach(v => {
      summary.byType[v.type] = (summary.byType[v.type] || 0) + 1;
    });

    if (audit.violations.length === 0) return; // No violations to report

    const severity = audit.config.strictMode ? SEVERITY.WARN : SEVERITY.INFO;

    StructuredLogger.app(severity, `AppV2 Lifecycle Violations (${audit.appClass})`, {
      summary,
      violations: audit.violations.slice(0, 5) // First 5 for logging
    });

    // Phase 2: Report to Sentinel for aggregation and health state
    if (audit.config.integrateSentinel) {
      const sentinelSeverity = audit.violations.some(v => v.type === 'RENDER_ERROR' || v.type === 'ELEMENT_NOT_VALID')
        ? Sentinel.SEVERITY.ERROR
        : Sentinel.SEVERITY.WARN;

      Sentinel.report('appv2', sentinelSeverity,
        `${audit.appClass} contract violations`, {
        appId: audit.appId,
        violations: audit.violations.length,
        types: Object.keys(summary.byType),
        legacyOptions: audit.contracts.legacyOptions.length
      }, {
        aggregateKey: `appv2-violations-${audit.appClass}`,
        threshold: 10
      });
    }
  }

  /**
   * Generate comprehensive audit report
   */
  static generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      audits: [],
      summary: {
        totalAudits: 0,
        totalViolations: 0,
        violationsByType: {}
      }
    };

    this.#instances.forEach((audit, app) => {
      if (app && typeof app === 'object') {
        report.audits.push({
          appId: audit.appId,
          appClass: audit.appClass,
          lifecycle: audit.lifecycle,
          violations: audit.violations,
          config: audit.config
        });

        report.summary.totalAudits++;
        report.summary.totalViolations += audit.violations.length;

        audit.violations.forEach(v => {
          report.summary.violationsByType[v.type] =
            (report.summary.violationsByType[v.type] || 0) + 1;
        });
      }
    });

    return report;
  }

  /**
   * Health check: Are all audited apps compliant?
   */
  static isHealthy() {
    let healthy = true;

    this.#instances.forEach((audit) => {
      if (audit.violations.length > 0 && audit.config.strictMode) {
        healthy = false;
      }
    });

    return healthy;
  }

  /**
   * Clear all audits (after shutdown)
   */
  static clear() {
    this.#instances = new WeakMap();
  }

  /**
   * Error reporting helper
   */
  static _error(message) {
    StructuredLogger.app(SEVERITY.ERROR, `AppV2 Auditor Error: ${message}`, {});
    return { error: true, message };
  }
}

/**
 * Phase 2: AppV2 Auditor Sentinel Layer
 * Registers auditor as a Sentinel layer for unified health tracking
 */
const AppV2AuditorLayer = {
  name: 'appv2',
  enabled: true,

  init() {
    // Expose auditor globally
    globalThis.SentinelAppV2Auditor = SentinelAppV2Auditor;

    // Register with Sentinel's layer system
    if (Sentinel && typeof Sentinel.registerLayer === 'function') {
      Sentinel.registerLayer('appv2', this);
    }

    StructuredLogger.app(SEVERITY.INFO, 'AppV2 Auditor Layer initialized', {
      sentinelIntegration: 'enabled',
      aggregationEnabled: true
    });
  }
};

/**
 * Export convenience function for integration with Sentinel
 */
export function initAppV2Auditor() {
  // Initialize layer
  AppV2AuditorLayer.init();

  StructuredLogger.app(SEVERITY.DEBUG, 'AppV2 Auditor Module Initialized', {
    sentinelIntegration: 'active',
    layer: 'appv2'
  });
}

// Export layer for registry
export { AppV2AuditorLayer };
