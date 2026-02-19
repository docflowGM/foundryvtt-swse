/**
 * SWSE SENTRY
 *
 * Runtime surface guard - monitors runtime symptoms only.
 *
 * STRICT JURISDICTION:
 * Sentry detects and reports ONLY:
 * - CSS contamination (global selectors, dangerous properties)
 * - Zero-dimension renders
 * - Layout collapse
 * - Missing DOM nodes in sheets
 * - Hook storms (excessive calls)
 * - Unhandled promise rejections
 * - Script load failures
 * - Runtime JS errors
 * - Performance threshold violations
 *
 * Sentry does NOT:
 * - Validate registry integrity
 * - Validate compendium data
 * - Scan imports
 * - Analyze circular imports
 * - Validate V2 compliance (that's Investigator)
 * - Mutate any system state
 *
 * Communication:
 * - Imports SentinelEngine only
 * - Reports via SentinelEngine.report("sentry", ...)
 * - Does NOT import Investigator
 * - Does NOT call Investigator functions
 */

import { SentinelEngine } from './sentinel-core.js';

export const Sentry = {
  _initialized: false,
  _hookCallCounts: new Map(),
  _lastRenderCycleTime: 0,
  _renderCycleWindow: 16, // ~60fps

  /**
   * Initialize runtime surface monitoring
   * Called during system ready
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    if (SentinelEngine.getMode() === SentinelEngine.MODES.OFF) return;

    this._attachRenderHooks();
    this._attachErrorHandlers();
    this._attachHookTracking();
    this._scanInitialCSS();

    SentinelEngine.report('sentry', SentinelEngine.SEVERITY.INFO, 'Runtime surface guard activated', {
      monitoring: [
        'renderApplicationV2',
        'renderDocumentSheetV2',
        'global errors',
        'unhandled rejections',
        'hook frequency',
        'CSS properties'
      ]
    });
  },

  /**
   * JURISDICTION: Runtime DOM monitoring
   * Detect zero-dimension renders, collapse, missing elements
   */
  _attachRenderHooks() {
    Hooks.on('renderApplicationV2', (app) => {
      requestAnimationFrame(() => {
        const el = app.element;
        if (!el) {
          SentinelEngine.report('sentry', SentinelEngine.SEVERITY.ERROR, 'ApplicationV2 rendered without element', {
            appName: app.constructor.name
          });
          return;
        }

        const width = el.offsetWidth;
        const height = el.offsetHeight;

        if (width === 0 || height === 0) {
          SentinelEngine.report(
            'sentry',
            SentinelEngine.SEVERITY.ERROR,
            'ApplicationV2 rendered with zero dimensions',
            {
              appName: app.constructor.name,
              width,
              height
            }
          );
        }

        if (!el.querySelector('.window-content')) {
          SentinelEngine.report(
            'sentry',
            SentinelEngine.SEVERITY.WARN,
            'ApplicationV2 missing window-content',
            {
              appName: app.constructor.name
            }
          );
        }
      });
    });

    Hooks.on('renderDocumentSheetV2', (sheet) => {
      requestAnimationFrame(() => {
        const el = sheet.element;
        if (!el) {
          SentinelEngine.report('sentry', SentinelEngine.SEVERITY.ERROR, 'DocumentSheetV2 rendered without element', {
            sheetName: sheet.constructor.name,
            document: sheet.document?.name || 'unknown'
          });
          return;
        }

        const width = el.offsetWidth;
        const height = el.offsetHeight;

        if (width === 0 || height === 0) {
          SentinelEngine.report(
            'sentry',
            SentinelEngine.SEVERITY.ERROR,
            'DocumentSheetV2 rendered with zero dimensions',
            {
              sheetName: sheet.constructor.name,
              document: sheet.document?.name || 'unknown',
              width,
              height
            }
          );
        }
      });
    });

    // Watch for window collapse
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.window-app').forEach(win => {
        const rect = win.getBoundingClientRect();
        if (rect.height < 100 && rect.height > 0) {
          SentinelEngine.report('sentry', SentinelEngine.SEVERITY.WARN, 'Window approaching collapse', {
            title: win.querySelector('.window-title')?.textContent || 'unknown',
            height: rect.height.toFixed(0) + 'px'
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  },

  /**
   * JURISDICTION: Global error handling
   * Detect unhandled promise rejections and runtime errors
   */
  _attachErrorHandlers() {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const isSWSE = reason?.stack?.includes('systems/foundryvtt-swse');

      SentinelEngine.report(
        'sentry',
        isSWSE ? SentinelEngine.SEVERITY.ERROR : SentinelEngine.SEVERITY.WARN,
        'Unhandled promise rejection',
        {
          message: reason?.message || String(reason),
          isSWSE,
          stack: reason?.stack?.substring(0, 200)
        }
      );
    });

    const originalOnError = window.onerror;
    window.onerror = (msg, url, line, col, error) => {
      const isSWSE = url && url.includes('systems/foundryvtt-swse');

      SentinelEngine.report(
        'sentry',
        isSWSE ? SentinelEngine.SEVERITY.ERROR : SentinelEngine.SEVERITY.WARN,
        'Global runtime error',
        {
          message: msg,
          file: url,
          line,
          col,
          isSWSE
        }
      );

      if (originalOnError) {
        return originalOnError(msg, url, line, col, error);
      }
    };
  },

  /**
   * JURISDICTION: Hook storm detection
   * Detect excessive hook call frequency in single cycle
   */
  _attachHookTracking() {
    const originalCall = Hooks.call;
    const self = this;

    Hooks.call = function(hook, ...args) {
      self._trackHookCall(hook);
      return originalCall.apply(this, [hook, ...args]);
    };
  },

  /**
   * Track hook call frequency
   * @private
   */
  _trackHookCall(hookName) {
    const now = performance.now();

    if (now - this._lastRenderCycleTime > this._renderCycleWindow) {
      this._hookCallCounts.clear();
      this._lastRenderCycleTime = now;
    }

    const count = (this._hookCallCounts.get(hookName) || 0) + 1;
    this._hookCallCounts.set(hookName, count);

    if (hookName === 'updateActor' && count > 50) {
      SentinelEngine.report('sentry', SentinelEngine.SEVERITY.ERROR, 'Hook storm detected: updateActor', {
        hook: hookName,
        callsInWindow: count,
        windowMs: this._renderCycleWindow
      });
    }

    if (count > 500) {
      SentinelEngine.report('sentry', SentinelEngine.SEVERITY.ERROR, 'Excessive hook calls detected', {
        hook: hookName,
        callsInWindow: count,
        windowMs: this._renderCycleWindow
      });
    }
  },

  /**
   * JURISDICTION: CSS contamination
   * Detect global selectors and dangerous CSS properties
   */
  _scanInitialCSS() {
    const dangerousSelectors = ['.app', '.window-app', '.window-content', 'body', 'html', '*'];
    const dangerousProperties = ['contain', 'mask-image', '-webkit-mask-image', 'overflow: hidden'];

    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes('systems/foundryvtt-swse')) continue;

      try {
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText) continue;

          const selector = rule.selectorText;
          const cssText = rule.cssText;

          if (dangerousSelectors.some(sel => selector.includes(sel))) {
            SentinelEngine.report('sentry', SentinelEngine.SEVERITY.CRITICAL, 'Dangerous CSS selector detected', {
              file: sheet.href,
              selector,
              rule: cssText.substring(0, 150)
            });
          }

          if (dangerousProperties.some(prop => cssText.includes(prop))) {
            SentinelEngine.report('sentry', SentinelEngine.SEVERITY.ERROR, 'Dangerous CSS property detected', {
              file: sheet.href,
              selector,
              property: dangerousProperties.find(p => cssText.includes(p)),
              rule: cssText.substring(0, 150)
            });
          }
        }
      } catch (err) {
        // CORS or parsing errors - acceptable
      }
    }
  }
};
