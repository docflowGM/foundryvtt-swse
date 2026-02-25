/**
 * CSS Layer - Detects CSS corruption and dangerous selectors
 *
 * Monitors for:
 * - Global selector overrides (.app, .window-app, body, html, *)
 * - Dangerous properties (contain, mask-image, overflow: hidden)
 * - Unscoped selectors (missing system-foundryvtt-swse namespace)
 * - Width/height constraints on core UI elements
 */

import { Sentinel } from '../sentinel-core.js';

export const CSSLayer = {
  /**
   * Initialize CSS monitoring
   */
  init() {
    this.scanExistingCSS();
    this.monitorDynamicCSS();
  },

  /**
   * Scan all existing stylesheets for violations
   */
  scanExistingCSS() {
    const dangerousSelectors = [
      '.app',
      '.window-app',
      '.window-content',
      '.flexrow',
      '.flexcol',
      '.ui-control',
      'button',
      'html',
      'body',
      '*'
    ];

    const dangerousProperties = [
      'contain',
      'mask-image',
      '-webkit-mask-image',
      'overflow: hidden',
      'height: 100%',
      'position: absolute'
    ];

    let swseViolations = 0;
    let globalViolations = 0;
    let scopeViolations = 0;

    for (const sheet of document.styleSheets) {
      // Only audit SWSE system stylesheets
      if (!sheet.href || !sheet.href.includes('systems/foundryvtt-swse')) continue;

      try {
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText) continue;

          const selector = rule.selectorText;
          const cssText = rule.cssText;

          // Check for dangerous global selectors
          if (dangerousSelectors.some(sel => selector === sel || selector.startsWith(sel + ' '))) {
            swseViolations++;
            Sentinel.report('css', Sentinel.SEVERITY.CRITICAL, 'Dangerous global selector in SWSE CSS', {
              file: sheet.href,
              selector,
              rule: cssText.substring(0, 200)
            });
            globalViolations++;
          }

          // Check for dangerous CSS properties
          if (dangerousProperties.some(prop => cssText.includes(prop))) {
            swseViolations++;
            Sentinel.report('css', Sentinel.SEVERITY.ERROR, 'Dangerous CSS property detected', {
              file: sheet.href,
              selector,
              property: dangerousProperties.find(prop => cssText.includes(prop)),
              rule: cssText.substring(0, 200)
            });
          }

          // Check for unscoped selectors
          if (!selector.includes('system-foundryvtt-swse') && !selector.includes(':root')) {
            scopeViolations++;
            Sentinel.report('css', Sentinel.SEVERITY.WARN, 'Unscoped SWSE selector detected', {
              file: sheet.href,
              selector
            });
          }
        }
      } catch (err) {
        // CORS or parsing errors
        Sentinel.report('css', Sentinel.SEVERITY.WARN, 'Could not inspect stylesheet (CORS or parse error)', {
          file: sheet.href,
          error: err.message
        });
      }
    }

    if (swseViolations === 0) {
      Sentinel.report('css', Sentinel.SEVERITY.INFO, 'CSS audit complete - no violations', {
        sheetsScanned: document.styleSheets.length,
        swseViolations,
        scopeWarnings: scopeViolations
      });
    } else {
      Sentinel.report('css', Sentinel.SEVERITY.ERROR, 'CSS audit complete with violations', {
        swseViolations,
        globalViolations,
        scopeWarnings: scopeViolations
      });
    }
  },

  /**
   * Monitor new stylesheets added after init
   */
  monitorDynamicCSS() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.tagName === 'STYLE' && node.textContent.includes('window-app')) {
              Sentinel.report('css', Sentinel.SEVERITY.WARN, 'Dynamic style injection detected', {
                content: node.textContent.substring(0, 100)
              });
            }
          }
        }
      }
    });

    observer.observe(document.head, { childList: true });
  }
};
