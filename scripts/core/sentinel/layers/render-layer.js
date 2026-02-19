/**
 * Render Layer - Detects AppV2 and rendering failures
 *
 * Monitors for:
 * - Zero-dimension renders (width or height = 0)
 * - Missing window structure elements
 * - Collapsed windows (< 100px height)
 * - Unresponsive application renders
 */

import { Sentinel } from '../sentinel-core.js';

export const RenderLayer = {
  #renderTiming = new Map(),

  /**
   * Initialize render monitoring
   */
  init() {
    this.attachApplicationV2Hook();
    this.attachDocumentSheetV2Hook();
    this.attachWindowCollapseWatcher();
  },

  /**
   * Hook renderApplicationV2 to catch zero-dimension apps
   */
  attachApplicationV2Hook() {
    Hooks.on('renderApplicationV2', (app) => {
      const startTime = performance.now();

      requestAnimationFrame(() => {
        const el = app.element;
        if (!el) {
          Sentinel.report('render', Sentinel.SEVERITY.ERROR, 'ApplicationV2 rendered without element', {
            appName: app.constructor.name
          });
          return;
        }

        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const duration = performance.now() - startTime;

        // Check dimensions
        if (width === 0 || height === 0) {
          Sentinel.report('render', Sentinel.SEVERITY.ERROR, 'ApplicationV2 rendered with zero dimensions', {
            appName: app.constructor.name,
            width,
            height,
            renderDuration: `${duration.toFixed(2)}ms`
          });
        }

        // Check for missing window-content
        if (!el.querySelector('.window-content')) {
          Sentinel.report('render', Sentinel.SEVERITY.WARN, 'ApplicationV2 missing window-content element', {
            appName: app.constructor.name
          });
        }

        // Track render performance
        if (duration > 250) {
          Sentinel.report('render', Sentinel.SEVERITY.WARN, 'Slow ApplicationV2 render detected', {
            appName: app.constructor.name,
            duration: `${duration.toFixed(2)}ms`
          });
        }

        if (duration > 1000) {
          Sentinel.report('render', Sentinel.SEVERITY.ERROR, 'Very slow ApplicationV2 render', {
            appName: app.constructor.name,
            duration: `${duration.toFixed(2)}ms`
          });
        }
      });
    });
  },

  /**
   * Hook renderDocumentSheetV2 to catch zero-dimension sheets
   */
  attachDocumentSheetV2Hook() {
    Hooks.on('renderDocumentSheetV2', (sheet) => {
      const startTime = performance.now();

      requestAnimationFrame(() => {
        const el = sheet.element;
        if (!el) {
          Sentinel.report('render', Sentinel.SEVERITY.ERROR, 'DocumentSheetV2 rendered without element', {
            sheetName: sheet.constructor.name,
            document: sheet.document?.name || 'unknown'
          });
          return;
        }

        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const duration = performance.now() - startTime;

        if (width === 0 || height === 0) {
          Sentinel.report('render', Sentinel.SEVERITY.ERROR, 'DocumentSheetV2 rendered with zero dimensions', {
            sheetName: sheet.constructor.name,
            document: sheet.document?.name || 'unknown',
            width,
            height,
            renderDuration: `${duration.toFixed(2)}ms`
          });
        }

        if (duration > 500) {
          Sentinel.report('render', Sentinel.SEVERITY.WARN, 'Slow DocumentSheetV2 render', {
            sheetName: sheet.constructor.name,
            document: sheet.document?.name || 'unknown',
            duration: `${duration.toFixed(2)}ms`
          });
        }
      });
    });
  },

  /**
   * Watch for window collapse after render
   */
  attachWindowCollapseWatcher() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.window-app').forEach(win => {
        const rect = win.getBoundingClientRect();

        if (rect.height < 100 && rect.height > 0) {
          Sentinel.report('render', Sentinel.SEVERITY.WARN, 'Window approaching collapse', {
            height: `${rect.height.toFixed(0)}px`,
            width: `${rect.width.toFixed(0)}px`,
            title: win.querySelector('.window-title')?.textContent || 'unknown'
          });
        }

        if (rect.height === 0) {
          Sentinel.report('render', Sentinel.SEVERITY.ERROR, 'Window fully collapsed', {
            title: win.querySelector('.window-title')?.textContent || 'unknown'
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
  }
};
