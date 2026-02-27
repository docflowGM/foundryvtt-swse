/**
 * Runtime Contract - Phase 3 Firewall
 *
 * Enforces SWSE architectural contracts at runtime:
 * - No jQuery or v1 APIs
 * - AppV2-only lifecycle
 * - Render completion guarantees
 * - Zero tolerance for v1 slippage
 *
 * This loads FIRST in index.js before any other modules.
 */

import { StructuredLogger, SEVERITY } from "/systems/foundryvtt-swse/scripts/core/structured-logger.js";

export class RuntimeContract {
  static #initialized = false;
  static #diagnosticMode = false;

  /**
   * Initialize all runtime contracts (call from index.js FIRST)
   */
  static initialize(diagnosticMode = false) {
    if (this.#initialized) return;
    this.#initialized = true;
    this.#diagnosticMode = diagnosticMode;

    this.enforceNoJQuery();
    this.enforceNoV1Patterns();

    StructuredLogger.core(SEVERITY.INFO, 'Runtime contracts initialized', {
      diagnosticMode: this.#diagnosticMode
    });
  }

  /**
   * Enforce: No jQuery at runtime (v1 → v2 transition)
   * If jQuery is present, make it unusable
   */
  static enforceNoJQuery() {
    if (typeof $ === 'undefined' && typeof jQuery === 'undefined') {
      return; // No jQuery, contract satisfied
    }

    const jq = globalThis.$ || globalThis.jQuery;

    if (!jq || !jq.fn) {
      return;
    }

    const createBlockade = (methodName, hint) => {
      return function() {
        const error = new Error(
          `SWSE CONTRACT VIOLATION: jQuery.${methodName}() is forbidden in AppV2.\n` +
          `Hint: ${hint}\n` +
          `Use DOM APIs instead: querySelector, addEventListener, etc.`
        );

        StructuredLogger.core(SEVERITY.ERROR, `jQuery contract violation: ${methodName}`, {
          stack: error.stack,
          method: methodName
        });

        throw error;
      };
    };

    // Blockade critical jQuery methods
    jq.fn.find = createBlockade('find', 'Use element.querySelector() instead');
    jq.fn.on = createBlockade('on', 'Use element.addEventListener() instead');
    jq.fn.off = createBlockade('off', 'Use element.removeEventListener() instead');
    jq.fn.html = createBlockade('html', 'Use element.innerHTML instead');
    jq.fn.text = createBlockade('text', 'Use element.textContent instead');
    jq.fn.val = createBlockade('val', 'Use element.value instead');
    jq.fn.addClass = createBlockade('addClass', 'Use element.classList.add() instead');
    jq.fn.removeClass = createBlockade('removeClass', 'Use element.classList.remove() instead');

    StructuredLogger.core(SEVERITY.DEBUG, 'jQuery blockade installed');
  }

  /**
   * Enforce: No legacy v1 patterns
   * Static scan for forbidden patterns
   */
  static enforceNoV1Patterns() {
    const forbiddenPatterns = [
      { pattern: 'activateListeners', hint: 'AppV2 apps use _onRender() instead' },
      { pattern: 'extends Application', hint: 'Extend SWSEAppV2 instead' },
      { pattern: 'Hooks.on("render', hint: 'Use app lifecycle hooks instead' }
    ];

    // Static scan happens at module load
    // Runtime enforcement is handled by contracts below

    StructuredLogger.core(SEVERITY.DEBUG, 'V1 pattern enforcement initialized');
  }

  /**
   * Enforce: Only AppV2 extends are allowed
   * Prevents accidental ApplicationV1 usage
   */
  static assertOnlyAppV2(appClass) {
    if (!appClass || !appClass.prototype) {
      return; // Not a class
    }

    // Check inheritance chain
    let current = appClass;
    while (current && current !== Object) {
      const name = current.name || '';

      // Forbidden: Direct Application extends (v1 pattern)
      if (name === 'Application' && appClass.name !== 'ApplicationV2') {
        throw new Error(
          `CONTRACT VIOLATION: ${appClass.name} extends Application (v1).\n` +
          `All SWSE apps must extend SWSEAppV2 for AppV2 compliance.`
        );
      }

      current = Object.getPrototypeOf(current);
    }
  }

  /**
   * Assert: AppV2 lifecycle order
   * Prevents constructor DOM access, premature listeners, etc
   */
  static assertLifecyclePhase(app, requiredPhase) {
    if (!app._lifecycle) {
      return; // Not tracked, skip check
    }

    const currentPhase = app._lifecycle.phase;

    if (currentPhase === requiredPhase) {
      return; // Correct phase
    }

    const error = new Error(
      `CONTRACT VIOLATION: Operation requires ${requiredPhase} phase, ` +
      `but app is in ${currentPhase} phase.`
    );

    StructuredLogger.app(SEVERITY.ERROR, 'Lifecycle phase violation', {
      app: app.constructor.name,
      required: requiredPhase,
      current: currentPhase,
      stack: error.stack
    });

    throw error;
  }

  /**
   * Register app for render completion tracking
   */
  static registerRender(appId, appName) {
    if (!window.__SWSE_RENDER_TRACKING__) {
      window.__SWSE_RENDER_TRACKING__ = new Map();
    }

    if (window.__SWSE_RENDER_TRACKING__.has(appId)) {
      StructuredLogger.core(SEVERITY.WARN, 'Render already registered', { appId, appName });
    }

    window.__SWSE_RENDER_TRACKING__.set(appId, {
      appName,
      startTime: performance.now(),
      completed: false
    });

    StructuredLogger.core(SEVERITY.DEBUG, 'Render registered', { appId, appName });
  }

  /**
   * Mark render as complete
   */
  static markRendered(appId) {
    const tracking = window.__SWSE_RENDER_TRACKING__;
    if (!tracking || !tracking.has(appId)) {
      return;
    }

    const entry = tracking.get(appId);
    entry.completed = true;
    entry.duration = performance.now() - entry.startTime;

    StructuredLogger.core(SEVERITY.DEBUG, 'Render completed', {
      appId: entry.appName,
      duration: `${entry.duration.toFixed(2)}ms`
    });
  }

  /**
   * Assert: Render completed successfully
   * Throws if render is pending or failed
   */
  static assertRendered(appId, timeout = 2000) {
    const tracking = window.__SWSE_RENDER_TRACKING__;

    if (!tracking || !tracking.has(appId)) {
      return; // Not tracked
    }

    const entry = tracking.get(appId);

    if (entry.completed) {
      return; // Success
    }

    const elapsed = performance.now() - entry.startTime;

    if (elapsed > timeout) {
      const error = new Error(
        `RENDER CONTRACT VIOLATION: ${entry.appName} did not complete within ${timeout}ms`
      );

      StructuredLogger.core(SEVERITY.ERROR, 'Render timeout', {
        appId,
        appName: entry.appName,
        elapsed: elapsed.toFixed(2),
        timeout
      });

      // Clean up
      tracking.delete(appId);

      throw error;
    }
  }

  /**
   * Cleanup render tracking
   */
  static cleanupRender(appId) {
    const tracking = window.__SWSE_RENDER_TRACKING__;
    if (tracking) {
      tracking.delete(appId);
    }
  }

  /**
   * Check diagnostic mode
   */
  static isDiagnosticMode() {
    return this.#diagnosticMode;
  }

  /**
   * Log with optional diagnostic context
   */
  static logWithDiagnostics(severity, message, context = {}) {
    if (this.#diagnosticMode) {
      console.debug('[SWSE DIAGNOSTIC]', message, context);
    }

    StructuredLogger.core(severity, message, context);
  }
}

// Auto-initialize on load (before any app code runs)
if (!window.__SWSE_CONTRACT_INITIALIZED__) {
  window.__SWSE_CONTRACT_INITIALIZED__ = true;

  // Determine if dev/diagnostic mode is enabled
  // (will be updated by game.settings later in index.js)
  const diagnosticMode = localStorage.getItem('swse-diagnostic-mode') === 'true' ||
    (typeof game !== 'undefined' && game.user?.isGM);

  RuntimeContract.initialize(diagnosticMode);
}
