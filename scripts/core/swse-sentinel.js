/**
 * SWSE Hybrid Sentinel Engine
 * CSS + Layout + AppV2 Guard (Phases 1-6)
 *
 * Detects:
 * - Dangerous CSS selectors
 * - Illegal layout overrides
 * - AppV2 zero-dimension renders
 * - Sheet collapse after render
 * - Containment/mask usage
 * - Global style pollution
 *
 * DEV MODE ONLY — Never blocks runtime
 */

export class SWSESentinel {
  static initialized = false;

  /**
   * PHASE 1 — CSS GLOBAL OVERRIDE SCANNER
   * Detects dangerous selectors and properties
   */
  static scanCSSForDanger() {
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

    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes('systems/foundryvtt-swse')) continue;

      try {
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText) continue;

          const selector = rule.selectorText;
          const cssText = rule.cssText;

          if (dangerousSelectors.some(sel => selector.includes(sel))) {
            console.error(
              '%c[SWSE SENTINEL] Dangerous selector detected',
              'color:red;font-weight:bold;',
              {
                file: sheet.href,
                selector,
                rule: cssText
              }
            );
          }

          if (dangerousProperties.some(prop => cssText.includes(prop))) {
            console.error(
              '%c[SWSE SENTINEL] Dangerous CSS property detected',
              'color:orange;font-weight:bold;',
              {
                file: sheet.href,
                selector,
                rule: cssText
              }
            );
          }
        }
      } catch (err) {
        console.warn('[SWSE SENTINEL] Could not inspect stylesheet:', sheet.href);
      }
    }
  }

  /**
   * PHASE 2 — APPV2 ZERO-DIMENSION RENDER GUARD
   * Detects applications rendered with zero dimensions
   */
  static attachRenderGuards() {
    // Watch renderApplicationV2
    Hooks.on('renderApplicationV2', (app) => {
      requestAnimationFrame(() => {
        const el = app.element;
        if (!el) return;

        if (el.offsetWidth === 0 || el.offsetHeight === 0) {
          console.error(
            '%c[SWSE SENTINEL] Application rendered with zero dimensions',
            'color:red;font-size:14px;',
            {
              appName: app.constructor.name,
              width: el.offsetWidth,
              height: el.offsetHeight
            }
          );
        }
      });
    });

    // Watch renderDocumentSheetV2
    Hooks.on('renderDocumentSheetV2', (sheet) => {
      requestAnimationFrame(() => {
        const el = sheet.element;
        if (!el) return;

        if (el.offsetWidth === 0 || el.offsetHeight === 0) {
          console.error(
            '%c[SWSE SENTINEL] Document sheet rendered with zero dimensions',
            'color:red;font-size:14px;',
            {
              sheetName: sheet.constructor.name,
              width: el.offsetWidth,
              height: el.offsetHeight
            }
          );
        }
      });
    });
  }

  /**
   * PHASE 3 — LAYOUT COLLAPSE OBSERVER
   * MutationObserver watching for window collapse
   */
  static attachLayoutObserver() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.window-app').forEach(win => {
        const rect = win.getBoundingClientRect();
        if (rect.height < 100) {
          console.error(
            '%c[SWSE SENTINEL] Window collapse detected',
            'color:purple;font-weight:bold;',
            {
              element: win,
              height: rect.height,
              width: rect.width
            }
          );
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  /**
   * PHASE 4 — NAMESPACE ENFORCEMENT
   * Checks that SWSE styles are properly scoped
   */
  static enforceNamespace() {
    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes('systems/foundryvtt-swse')) continue;

      try {
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText) continue;

          if (!rule.selectorText.includes('system-foundryvtt-swse')) {
            console.warn(
              '%c[SWSE SENTINEL] Unscoped selector detected',
              'color:yellow;font-weight:bold;',
              {
                file: sheet.href,
                selector: rule.selectorText
              }
            );
          }
        }
      } catch (err) {
        // Silently skip CORS-blocked sheets
      }
    }
  }

  /**
   * PHASE 5 — SAFE MODE TOGGLE
   * When safeMode is enabled, skips layout CSS loading
   */
  static checkSafeMode() {
    if (game.settings.get('foundryvtt-swse', 'safeMode')) {
      console.log(
        '%c[SWSE SENTINEL] Safe Mode Enabled — Layout CSS Disabled',
        'color:cyan;font-size:12px;'
      );
      return true;
    }
    return false;
  }

  /**
   * PHASE 6 — BOOTSTRAP
   * Activate all guards when ready (if devMode enabled)
   */
  static bootstrap() {
    if (!game.settings.get('foundryvtt-swse', 'devMode')) return;

    if (this.initialized) return;
    this.initialized = true;

    console.log(
      '%c[SWSE SENTINEL] Hybrid Guard Active',
      'color:cyan;font-weight:bold;font-size:14px;'
    );

    this.scanCSSForDanger();
    this.enforceNamespace();
    this.attachRenderGuards();
    this.attachLayoutObserver();

    if (this.checkSafeMode()) {
      console.log(
        '%c[SWSE SENTINEL] Safe mode is active — recommend disabling problematic layout CSS',
        'color:yellow;'
      );
    }
  }
}

/**
 * Activate sentinel on ready hook
 */
Hooks.once('ready', () => {
  SWSESentinel.bootstrap();
});
