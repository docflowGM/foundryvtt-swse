/**
 * Diagnostic Mode - Phase 3 Developer Tools
 *
 * When enabled (GM only by default), provides:
 * - Detailed lifecycle logging
 * - Render state overlays
 * - Performance metrics
 * - Data source inspection
 * - Contract violation details
 */

import { StructuredLogger, SEVERITY } from '../core/structured-logger.js';
import { RuntimeContract } from './runtime-contract.js';

export class DiagnosticMode {
  static #enabled = false;
  static #overlays = new Map();
  static #performanceMarkers = new Map();

  /**
   * Initialize diagnostic mode
   * Call from index.js after settings are loaded
   */
  static async initialize() {
    // Check if diagnostic mode is enabled
    try {
      this.#enabled = game?.settings?.get?.('foundryvtt-swse', 'diagnosticMode') ?? false;
    } catch {
      this.#enabled = false;
    }

    if (this.#enabled) {
      this.activate();
    }

    // Register the setting if not already registered
    try {
      if (!game?.settings?.get?.('core', '_settingsRegistered')) {
        // Settings not ready yet, will be registered in SystemInitHooks
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Activate diagnostic mode
   */
  static activate() {
    this.#enabled = true;

    StructuredLogger.core(SEVERITY.INFO, 'Diagnostic mode ENABLED', {
      user: game?.user?.name,
      timestamp: new Date().toISOString()
    });

    // Inject diagnostic UI elements
    this.injectDiagnosticPanel();

    // Start listening for render events
    this.setupRenderTracking();

    // Store in localStorage for persistence
    localStorage.setItem('swse-diagnostic-mode', 'true');
  }

  /**
   * Deactivate diagnostic mode
   */
  static deactivate() {
    this.#enabled = false;

    // Remove overlays
    this.#overlays.forEach(overlay => {
      overlay?.remove?.();
    });
    this.#overlays.clear();

    StructuredLogger.core(SEVERITY.INFO, 'Diagnostic mode DISABLED');

    localStorage.setItem('swse-diagnostic-mode', 'false');
  }

  /**
   * Check if diagnostic mode is active
   */
  static isActive() {
    return this.#enabled;
  }

  /**
   * Log checkpoint with timing
   */
  static checkpoint(label, phase, data = {}) {
    if (!this.#enabled) return;

    const marker = `swse-${phase}-${label}`;
    const startMarker = `${marker}-start`;

    if (!this.#performanceMarkers.has(startMarker)) {
      performance.mark(startMarker);
      this.#performanceMarkers.set(startMarker, performance.now());
    } else {
      performance.mark(marker);
      performance.measure(label, startMarker, marker);

      const measure = performance.getEntriesByName(label)[0];
      const duration = measure?.duration ?? 0;

      StructuredLogger.core(SEVERITY.DEBUG, `[DIAGNOSTIC] ${label} checkpoint`, {
        phase,
        duration: `${duration.toFixed(2)}ms`,
        ...data
      });

      this.#performanceMarkers.delete(startMarker);
    }
  }

  /**
   * Show overlay on element with metadata
   */
  static showElementOverlay(element, label, metadata = {}) {
    if (!this.#enabled || !(element instanceof HTMLElement)) return;

    try {
      const overlay = document.createElement('div');
      overlay.className = 'swse-diagnostic-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 255, 100, 0.1);
        border: 2px solid #00ff64;
        border-radius: 4px;
        pointer-events: none;
        z-index: 9999;
        font-size: 10px;
        color: #00ff64;
        padding: 4px;
        box-sizing: border-box;
        font-family: monospace;
        overflow: hidden;
      `;

      const info = document.createElement('div');
      info.style.cssText = 'background: rgba(0, 0, 0, 0.8); padding: 2px 4px; border-radius: 2px;';
      info.textContent = label;

      overlay.appendChild(info);

      // Position as absolute over element
      element.style.position = element.style.position || 'relative';
      element.appendChild(overlay);

      const overlayId = `${label}-${Math.random().toString(36).substr(2, 9)}`;
      this.#overlays.set(overlayId, overlay);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        try {
          overlay?.remove?.();
          this.#overlays.delete(overlayId);
        } catch {}
      }, 5000);
    } catch (error) {
      console.error('[DIAGNOSTIC] Overlay error:', error);
    }
  }

  /**
   * Log app lifecycle event
   */
  static logAppEvent(appName, event, data = {}) {
    if (!this.#enabled) return;

    StructuredLogger.app(SEVERITY.DEBUG, `[APP EVENT] ${appName}: ${event}`, {
      app: appName,
      event,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Log data mutation
   */
  static logMutation(source, action, target, oldValue, newValue) {
    if (!this.#enabled) return;

    StructuredLogger.data(SEVERITY.DEBUG, `[MUTATION] ${action}`, {
      source,
      action,
      target,
      old: this._sanitizeValue(oldValue),
      new: this._sanitizeValue(newValue)
    });
  }

  /**
   * Setup render event tracking
   */
  static setupRenderTracking() {
    // Hook into app render events
    Hooks.on('applicationWindowReady', (app) => {
      if (this.#enabled) {
        this.logAppEvent(app.constructor.name, 'applicationWindowReady', {
          appId: app.id,
          hasElement: !!app.element
        });
      }
    });

    Hooks.on('applicationDestroyed', (app) => {
      if (this.#enabled) {
        this.logAppEvent(app.constructor.name, 'applicationDestroyed', {
          appId: app.id
        });
      }
    });
  }

  /**
   * Inject diagnostic control panel
   */
  static injectDiagnosticPanel() {
    try {
      // Create a small panel in the corner
      const panel = document.createElement('div');
      panel.id = 'swse-diagnostic-panel';
      panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 20, 40, 0.95);
        border: 2px solid #00ff64;
        border-radius: 4px;
        padding: 10px;
        font-family: monospace;
        font-size: 11px;
        color: #00ff64;
        z-index: 10000;
        max-width: 300px;
        max-height: 200px;
        overflow-y: auto;
      `;

      panel.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold;">🔍 SWSE Diagnostic</div>
        <div id="swse-diagnostic-info">
          <div>Mode: <span style="color: #ffff00;">ACTIVE</span></div>
          <div>Renders: <span id="swse-render-count">0</span></div>
          <div>Errors: <span id="swse-error-count">0</span></div>
        </div>
        <button id="swse-diagnostic-close" style="
          background: #ff3333;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 2px;
          cursor: pointer;
          width: 100%;
          margin-top: 8px;
          font-family: monospace;
        ">Disable</button>
      `;

      document.body.appendChild(panel);

      // Close button
      document.getElementById('swse-diagnostic-close')?.addEventListener('click', () => {
        this.deactivate();
        panel?.remove?.();
      });
    } catch (error) {
      console.error('[DIAGNOSTIC] Panel injection failed:', error);
    }
  }

  /**
   * Sanitize values for logging (prevent huge objects)
   */
  static _sanitizeValue(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `Array(${value.length})`;
      }

      try {
        const str = JSON.stringify(value);
        if (str.length > 100) {
          return `Object(${str.length} chars)`;
        }
        return str;
      } catch {
        return typeof value;
      }
    }

    if (typeof value === 'string' && value.length > 50) {
      return `"${value.substring(0, 50)}..."`;
    }

    return value;
  }
}
