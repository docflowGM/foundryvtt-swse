/**
 * Performance Layer - Tracks initialization and render performance
 *
 * Monitors:
 * - Registry build time
 * - Feature index build time
 * - Sheet render duration
 * - Overall system initialization time
 */

import { Sentinel } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export const PerformanceLayer = {
  #measurements = new Map(),
  #slowThresholds = {
    'registry-build': 500,    // 500ms
    'feature-index': 1000,    // 1s
    'sheet-render': 250,      // 250ms
    'app-render': 1000        // 1s
  },

  /**
   * Initialize performance tracking
   */
  init() {
    this.measureInitialization();
    this.attachRenderTimings();
  },

  /**
   * Measure system initialization time
   */
  measureInitialization() {
    const perfStart = performance.now();

    Hooks.once('ready', () => {
      const perfEnd = performance.now();
      const duration = perfEnd - perfStart;

      if (duration > 5000) {
        Sentinel.report('performance', Sentinel.SEVERITY.WARN, 'Slow system initialization', {
          duration: `${duration.toFixed(2)}ms`,
          threshold: '5000ms'
        });
      } else {
        Sentinel.report('performance', Sentinel.SEVERITY.INFO, 'System initialization complete', {
          duration: `${duration.toFixed(2)}ms`
        });
      }
    });
  },

  /**
   * Attach timing to render hooks
   */
  attachRenderTimings() {
    Hooks.on('renderApplicationV2', (app) => {
      const startTime = performance.now();

      requestAnimationFrame(() => {
        const duration = performance.now() - startTime;
        const threshold = this.#slowThresholds['app-render'];

        if (duration > threshold) {
          Sentinel.report('performance', Sentinel.SEVERITY.WARN, 'Slow application render', {
            appName: app.constructor.name,
            duration: `${duration.toFixed(2)}ms`,
            threshold: `${threshold}ms`
          });
        }

        this.#storeMeasurement('app-render', app.constructor.name, duration);
      });
    });

    Hooks.on('renderDocumentSheetV2', (sheet) => {
      const startTime = performance.now();

      requestAnimationFrame(() => {
        const duration = performance.now() - startTime;
        const threshold = this.#slowThresholds['sheet-render'];

        if (duration > threshold) {
          Sentinel.report('performance', Sentinel.SEVERITY.WARN, 'Slow sheet render', {
            sheetName: sheet.constructor.name,
            document: sheet.document?.name || 'unknown',
            duration: `${duration.toFixed(2)}ms`,
            threshold: `${threshold}ms`
          });
        }

        this.#storeMeasurement('sheet-render', sheet.constructor.name, duration);
      });
    });
  },

  /**
   * Store measurement for analysis
   * @private
   */
  #storeMeasurement(category, name, duration) {
    const key = `${category}:${name}`;
    if (!this.#measurements.has(key)) {
      this.#measurements.set(key, []);
    }
    this.#measurements.get(key).push(duration);
  },

  /**
   * Get performance report
   */
  getReport() {
    const report = {};

    for (const [key, durations] of this.#measurements) {
      const avg = durations.reduce((a, b) => a + b) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);

      report[key] = {
        calls: durations.length,
        avg: `${avg.toFixed(2)}ms`,
        max: `${max.toFixed(2)}ms`,
        min: `${min.toFixed(2)}ms`
      };
    }

    return report;
  }
};
