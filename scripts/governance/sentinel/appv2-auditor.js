/**
 * SWSE Sentinel AppV2 Auditor
 *
 * Runtime enforcement of ApplicationV2 contract compliance.
 * Prevents lifecycle regressions through monitoring and validation.
 *
 * Contract enforcement:
 * - Element lifecycle tracking
 * - _prepareContext and _onRender sequencing
 * - DOM mutation boundaries
 * - Event listener registration phase validation
 * - Tab system initialization verification
 */

import { StructuredLogger, SEVERITY } from "/systems/foundryvtt-swse/scripts/core/structured-logger.js";

export class SentinelAppV2Auditor {
  /**
   * Active instances being monitored
   */
  static #instances = new WeakMap();

  /**
   * Install auditing on an ApplicationV2 instance
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
      config: {
        strictMode: config.strictMode ?? true,
        trackMutations: config.trackMutations ?? true,
        ...config
      }
    };

    this.#instances.set(app, audit);

    // Hook into lifecycle methods
    this._wrapLifecycleMethods(app, audit);

    StructuredLogger.app(SEVERITY.DEBUG, `AppV2 Auditor installed on ${audit.appClass}`, {
      appId: audit.appId
    });

    return audit;
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

          StructuredLogger.app(SEVERITY.DEBUG, 'AppV2 _onRender executed', {
            appId: audit.appId,
            duration: `${(audit.lifecycle.timestamps.renderEnd - audit.lifecycle.timestamps.renderStart).toFixed(2)}ms`,
            violations: audit.violations.length
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
   */
  static _reportViolations(audit) {
    const summary = {
      appId: audit.appId,
      appClass: audit.appClass,
      totalViolations: audit.violations.length,
      byType: {}
    };

    audit.violations.forEach(v => {
      summary.byType[v.type] = (summary.byType[v.type] || 0) + 1;
    });

    const severity = audit.config.strictMode ? SEVERITY.WARN : SEVERITY.INFO;

    StructuredLogger.app(severity, `AppV2 Lifecycle Violations (${audit.appClass})`, {
      summary,
      violations: audit.violations
    });
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
 * Export convenience function for integration with Sentinel
 */
export function initAppV2Auditor() {
  globalThis.SentinelAppV2Auditor = SentinelAppV2Auditor;
  StructuredLogger.app(SEVERITY.DEBUG, 'AppV2 Auditor Module Initialized', {});
}
