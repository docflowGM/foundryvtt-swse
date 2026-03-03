/**
 * SWSE Sentinel Enforcement Core
 * Unified governance layer for ApplicationV2 render pipeline integrity
 *
 * Consolidates all guard logic into modular detection layers:
 * - Render Contract Layer (V1 contamination, HTML validation)
 * - Exception Layer (unhandled hook exceptions)
 * - Zero-Dimension Detection (layout measurement)
 * - DOM Integrity Layer (structural mutations)
 * - Layout Thrashing Detection (synchronous layout reads)
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import { SentinelReporter } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-reporter.js";

export class SentinelEnforcement {
  static #violations = [];
  static #maxViolations = 5000;
  static #renderPhase = false;
  static #currentRenderApp = null;
  static #hookulatePatch = null;
  static #layoutReadDetector = null;

  // PHASE 3.5: Mutation Forensics
  static #mutationObserver = null;
  static #mutationHistory = [];
  static #renderStack = [];
  static #maxMutations = 100;

  /**
   * Initialize unified enforcement layer
   */
  static init() {
    SentinelEngine.registerLayer('enforcement', {
      init: () => this._initializeEnforcement(),
      enabled: true
    });
  }

  /**
   * Register all enforcement hooks via Sentinel only
   * @private
   */
  static _initializeEnforcement() {
    // PHASE 3.5: Initialize mutation forensics during boot only
    this._initializeMutationForensics();

    // Hook 1: Render Contract Layer
    this._registerRenderContractLayer();

    // Hook 2: Exception Layer
    this._registerExceptionLayer();

    // Hook 3: Zero-Dimension Detection
    this._registerZeroDimensionDetection();

    // Hook 4: DOM Integrity Layer
    this._registerDOMIntegrityLayer();

    // Hook 5: Layout Thrashing Detection
    this._registerLayoutThashingDetection();

    SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.INFO,
      'Unified enforcement layer initialized', {
        layers: 6,
        mutations: 'tracking',
        violations: 0
      });
  }

  /**
   * LAYER 1: Render Contract Validation
   * Detects V1 jQuery contamination and structural violations
   * @private
   */
  static _registerRenderContractLayer() {
    Hooks.on('renderApplicationV2', (app, html, context) => {
      try {
        this.#currentRenderApp = app;
        this.#renderPhase = true;

        const appName = app?.constructor?.name || 'Unknown';

        // ✓ Guard: Validate HTML is HTMLElement, not jQuery
        if (html && html.jquery) {
          this._addViolation({
            type: 'V1_RENDER_CONTAMINATION',
            severity: 'CRITICAL',
            appName,
            message: 'renderApplicationV2 received jQuery object instead of HTMLElement',
            stack: new Error().stack
          });
          return;
        }

        // ✓ Guard: Validate HTML is HTMLElement
        if (!(html instanceof HTMLElement)) {
          this._addViolation({
            type: 'INVALID_RENDER_CONTRACT',
            severity: 'ERROR',
            appName,
            message: `renderApplicationV2 did not receive HTMLElement (received ${typeof html})`,
            metadata: { htmlType: html?.constructor?.name }
          });
          return;
        }

        // ✓ Guard: Validate app.element exists
        if (!app?.element) {
          this._addViolation({
            type: 'MISSING_APP_ELEMENT',
            severity: 'ERROR',
            appName,
            message: 'ApplicationV2 render hook fired before element created',
            stack: new Error().stack
          });
          return;
        }

        // ✓ Guard: Validate app.element is in DOM
        if (!document.body.contains(app.element)) {
          this._addViolation({
            type: 'ELEMENT_NOT_IN_DOM',
            severity: 'WARN',
            appName,
            message: 'ApplicationV2 element not yet attached to document',
            stack: new Error().stack
          });
          return;
        }

        SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.INFO,
          `Render contract validated: ${appName}`, { appName });

      } catch (err) {
        SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.ERROR,
          'Error in render contract layer', {
            error: err.message,
            stack: err.stack
          });
      } finally {
        this.#renderPhase = false;
        this.#currentRenderApp = null;
      }
    });
  }

  /**
   * LAYER 2: Exception Capture Layer
   * Wraps Foundry hook system to catch render hook exceptions
   * @private
   */
  static _registerExceptionLayer() {
    // Monitor the Hooks system itself for exceptions
    const origCallHook = Hooks.callAll;
    let isWrapped = false;

    if (!isWrapped) {
      isWrapped = true;
      Hooks.callAll = function(hookName, ...args) {
        if (hookName === 'renderApplicationV2' || hookName === 'renderDocumentSheetV2') {
          const app = args[0];
          const appName = app?.constructor?.name || 'Unknown';

          try {
            return origCallHook.call(this, hookName, ...args);
          } catch (err) {
            SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.CRITICAL,
              `RENDER HOOK EXCEPTION: ${hookName}`,
              {
                appName,
                errorMessage: err.message,
                errorName: err.name,
                stack: err.stack
              });
            // Do NOT rethrow - let app continue
            return;
          }
        }
        return origCallHook.call(this, hookName, ...args);
      };
    }
  }

  /**
   * PHASE 3.5: Initialize mutation forensics
   * Tracks DOM mutations during boot to diagnose layout collapse
   * @private
   */
  static _initializeMutationForensics() {
    // Only track during first 10 seconds of boot
    const stopAfter = 10000;
    let mutationStartTime = Date.now();

    // Wrap Application.prototype.render to capture render calls
    const origRender = Application.prototype.render;
    Application.prototype.render = function(...args) {
      const appName = this?.constructor?.name || 'Unknown';
      const elapsed = Date.now() - mutationStartTime;

      if (elapsed < stopAfter) {
        SentinelEnforcement.#renderStack.push({
          app: appName,
          timestamp: elapsed,
          args: args[0] === true ? 'force-render' : 'soft-render',
          stack: new Error().stack?.split('\n').slice(1, 4).join(' → ')
        });
      }

      return origRender.call(this, ...args);
    };

    // Attach mutation observer to sidebar and body
    this.#mutationObserver = new MutationObserver((mutations) => {
      const elapsed = Date.now() - mutationStartTime;

      if (elapsed < stopAfter) {
        mutations.forEach(mutation => {
          this.#mutationHistory.push({
            type: mutation.type,
            element: mutation.target?.id || mutation.target?.className || 'unknown',
            timestamp: elapsed,
            details: {
              addedNodes: mutation.addedNodes?.length || 0,
              removedNodes: mutation.removedNodes?.length || 0,
              attributeName: mutation.attributeName,
              oldValue: mutation.oldValue?.slice(0, 50)
            }
          });

          if (this.#mutationHistory.length > this.#maxMutations) {
            this.#mutationHistory.shift();
          }
        });
      }
    });

    // Start observing after ready hook
    Hooks.once('ready', () => {
      const sidebar = document.querySelector('#sidebar');
      if (sidebar) {
        this.#mutationObserver.observe(sidebar, {
          attributes: true,
          attributeOldValue: true,
          childList: true,
          subtree: true,
          characterData: false
        });
      }

      // Stop observing after timeout
      setTimeout(() => {
        this.#mutationObserver?.disconnect();
      }, stopAfter);
    });
  }

  /**
   * LAYER 3: Zero-Dimension Detection
   * Detects applications rendered with zero width/height
   * @private
   */
  static _registerZeroDimensionDetection() {
    Hooks.on('renderApplicationV2', (app) => {
      try {
        const appName = app?.constructor?.name || 'Unknown';
        const el = app.element;
        if (!el) return;

        // Single RAF - let layout stabilize once
        requestAnimationFrame(() => {
          try {
            if (!document.body.contains(el)) return;

            const width = el.offsetWidth;
            const height = el.offsetHeight;

            if (width === 0 || height === 0) {
              this._addViolation({
                type: 'ZERO_DIMENSION_RENDER',
                severity: 'ERROR',
                appName,
                message: `ApplicationV2 rendered with zero dimensions: ${width}x${height}`,
                metadata: { width, height }
              });

              SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.ERROR,
                'Zero-dimension render detected', {
                  appName,
                  width,
                  height
                });
            }

            // Check for missing .window-content
            if (!el.querySelector('.window-content')) {
              this._addViolation({
                type: 'MISSING_WINDOW_CONTENT',
                severity: 'WARN',
                appName,
                message: 'ApplicationV2 missing .window-content element',
                metadata: { html: el.outerHTML.substring(0, 200) }
              });

              SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.WARN,
                'Missing .window-content', { appName });
            }
          } catch (err) {
            SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.ERROR,
              'Error in zero-dimension detection', {
                error: err.message
              });
          }
        });
      } catch (err) {
        SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.ERROR,
          'Error in zero-dimension layer', {
            error: err.message,
            stack: err.stack
          });
      }
    });
  }

  /**
   * LAYER 4: DOM Integrity Layer
   * Detects unsafe DOM mutations during render phase
   * @private
   */
  static _registerDOMIntegrityLayer() {
    // Monkey-patch Element methods during render
    const origRemove = Element.prototype.remove;
    const origReplaceWith = Element.prototype.replaceWith;
    const origAppend = Element.prototype.append;
    const origPrepend = Element.prototype.prepend;

    Element.prototype.remove = function() {
      if (SentinelEnforcement.#renderPhase) {
        const isStructural = this.classList?.contains('window-app') ||
                            this.classList?.contains('window-content') ||
                            this.classList?.contains('window-header');
        if (isStructural) {
          SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.CRITICAL,
            'STRUCTURAL DOM MUTATION: .remove() called on core application element',
            {
              appName: SentinelEnforcement.#currentRenderApp?.constructor?.name,
              element: this.className,
              stack: new Error().stack
            });
        }
      }
      return origRemove.call(this);
    };

    Element.prototype.replaceWith = function(...args) {
      if (SentinelEnforcement.#renderPhase) {
        const isStructural = this.classList?.contains('window-app') ||
                            this.classList?.contains('window-content');
        if (isStructural) {
          SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.CRITICAL,
            'STRUCTURAL DOM MUTATION: .replaceWith() called on core application element',
            {
              appName: SentinelEnforcement.#currentRenderApp?.constructor?.name,
              element: this.className
            });
        }
      }
      return origReplaceWith.call(this, ...args);
    };
  }

  /**
   * LAYER 5: Layout Thrashing Detection
   * Instruments offsetWidth/Height/getBoundingClientRect during render
   * @private
   */
  static _registerLayoutThashingDetection() {
    // Create a wrapper that tracks layout reads during render phase
    const origOffsetWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'offsetWidth');
    const origOffsetHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'offsetHeight');
    const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;

    let readCount = 0;
    let inLayoutRead = false;

    // Wrap offsetWidth
    Object.defineProperty(Element.prototype, 'offsetWidth', {
      get() {
        if (SentinelEnforcement.#renderPhase && !inLayoutRead) {
          readCount++;
          if (readCount > 3) {
            inLayoutRead = true;
            SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.WARN,
              'Multiple layout reads during render phase',
              {
                appName: SentinelEnforcement.#currentRenderApp?.constructor?.name,
                readCount,
                type: 'offsetWidth'
              },
              { aggregateKey: 'layout_reads', sample: false, threshold: 50 });
            inLayoutRead = false;
          }
        }
        return origOffsetWidth.get.call(this);
      }
    });

    // Wrap offsetHeight
    Object.defineProperty(Element.prototype, 'offsetHeight', {
      get() {
        if (SentinelEnforcement.#renderPhase && !inLayoutRead) {
          readCount++;
          if (readCount > 3) {
            inLayoutRead = true;
            SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.WARN,
              'Multiple layout reads during render phase',
              {
                appName: SentinelEnforcement.#currentRenderApp?.constructor?.name,
                readCount,
                type: 'offsetHeight'
              },
              { aggregateKey: 'layout_reads', sample: false, threshold: 50 });
            inLayoutRead = false;
          }
        }
        return origOffsetHeight.get.call(this);
      }
    });

    // Wrap getBoundingClientRect
    Element.prototype.getBoundingClientRect = function() {
      if (SentinelEnforcement.#renderPhase && !inLayoutRead) {
        readCount++;
        if (readCount > 2) {
          inLayoutRead = true;
          SentinelEngine.report('enforcement', SentinelEngine.SEVERITY.WARN,
            'Layout thrashing: getBoundingClientRect during render',
            {
              appName: SentinelEnforcement.#currentRenderApp?.constructor?.name,
              readCount,
              type: 'getBoundingClientRect'
            },
            { aggregateKey: 'layout_reads', sample: false, threshold: 50 });
          inLayoutRead = false;
        }
      }
      return origGetBoundingClientRect.call(this);
    };
  }

  /**
   * Add violation to store
   * @private
   */
  static _addViolation(violation) {
    const fullViolation = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...violation
    };

    this.#violations.push(fullViolation);

    // Cap storage
    if (this.#violations.length > this.#maxViolations) {
      this.#violations.shift();
    }
  }

  /**
   * Get all violations
   */
  static getViolations(filter = null) {
    if (!filter) return this.#violations;

    return this.#violations.filter(v => {
      if (filter.type && v.type !== filter.type) return false;
      if (filter.severity && v.severity !== filter.severity) return false;
      if (filter.appName && !v.appName?.includes(filter.appName)) return false;
      return true;
    });
  }

  /**
   * Export violations as JSON
   */
  static exportViolations() {
    return {
      timestamp: Date.now(),
      foundryVersion: game.version,
      systemVersion: game.system.version,
      totalViolations: this.#violations.length,
      violations: this.#violations,
      violationsByType: this._groupViolationsByType(),
      violationsBySeverity: this._groupViolationsBySeverity()
    };
  }

  /**
   * Group violations by type
   * @private
   */
  static _groupViolationsByType() {
    const grouped = {};
    for (const v of this.#violations) {
      if (!grouped[v.type]) grouped[v.type] = 0;
      grouped[v.type]++;
    }
    return grouped;
  }

  /**
   * Group violations by severity
   * @private
   */
  static _groupViolationsBySeverity() {
    const grouped = {};
    for (const v of this.#violations) {
      if (!grouped[v.severity]) grouped[v.severity] = 0;
      grouped[v.severity]++;
    }
    return grouped;
  }

  /**
   * Clear all violations
   */
  static clearViolations() {
    this.#violations = [];
  }

  /**
   * Get summary report
   */
  static getSummary() {
    return {
      total: this.#violations.length,
      bySeverity: this._groupViolationsBySeverity(),
      byType: this._groupViolationsByType(),
      criticalCount: this.#violations.filter(v => v.severity === 'CRITICAL').length
    };
  }

  /**
   * PHASE 3.5: Public getters for mutation forensics
   * @public
   */
  static getMutationHistory() {
    return this.#mutationHistory;
  }

  static getRenderStack() {
    return this.#renderStack;
  }

  static getForensics() {
    return {
      mutations: this.#mutationHistory.slice(-20),
      renders: this.#renderStack.slice(-10),
      sidebarState: {
        display: getComputedStyle(document.querySelector('#scenes')).display,
        classes: document.querySelector('#scenes')?.className || 'missing',
        hasActive: document.querySelector('#scenes')?.classList.contains('active') || false
      }
    };
  }
}

// Expose enforcement API + PHASE 3.5 mutation forensics + reporting
if (typeof window !== 'undefined') {
  window._SWSE_Enforcement = {
    violations: () => SentinelEnforcement.getViolations(),
    export: () => SentinelEnforcement.exportViolations(),
    summary: () => SentinelEnforcement.getSummary(),
    clear: () => SentinelEnforcement.clearViolations(),

    // PHASE 3.5: Mutation forensics (using public getters)
    mutations: () => SentinelEnforcement.getMutationHistory(),
    renderStack: () => SentinelEnforcement.getRenderStack(),
    forensics: () => SentinelEnforcement.getForensics(),

    // Reporting: Generate and save comprehensive audit reports
    report: {
      getFullReport: () => SentinelReporter.getReportAsString(),
      printReport: () => SentinelReporter.printReport(),
      saveAsLog: (filename) => SentinelReporter.saveReportToDocuments(filename || 'swse-sentinel-audit')
    }
  };
}
