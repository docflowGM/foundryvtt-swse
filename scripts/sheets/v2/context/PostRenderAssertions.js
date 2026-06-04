import { PANEL_REGISTRY } from './PANEL_REGISTRY.js';

/**
 * PostRenderAssertions
 *
 * Registry-driven post-render DOM validation.
 * Verifies that rendered DOM matches panel context contracts defined in PANEL_REGISTRY.
 *
 * Runs after every render to detect template/context drift.
 * In production: logs warnings only
 * In strict mode (CONFIG.SWSE.strictMode): throws on critical violations
 *
 * Validates:
 * - Expected root nodes exist
 * - Expected/optional elements match contractual counts
 * - Critical panels are fully rendered
 */

export class PostRenderAssertions {
  /**
   * Log an assertion violation with appropriate severity
   */
  static _reportViolation(message, critical = false) {
    const isStrict = CONFIG?.SWSE?.strictMode ?? false;
    const severity = critical && isStrict ? 'error' : 'warn';
    console[severity](`[PostRender] ${message}`);

    if (critical && isStrict) {
      throw new Error(`[PostRender Contract] ${message}`);
    }
  }

  /**
   * Parse range string like "3..3" or "0..99" to {min, max}
   */
  static _parseRange(rangeStr) {
    if (typeof rangeStr === 'number') return { min: rangeStr, max: rangeStr };
    if (!rangeStr || !rangeStr.includes('..')) return null;
    const [min, max] = rangeStr.split('..').map(Number);
    return { min, max };
  }

  /**
   * Validate element count matches range
   */
  static _validateCount(actual, expected, label, critical = false) {
    if (typeof expected === 'number') {
      if (actual !== expected) {
        this._reportViolation(
          `${label}: expected ${expected}, got ${actual}`,
          critical
        );
        return false;
      }
    } else if (typeof expected === 'string' && expected.includes('..')) {
      const range = this._parseRange(expected);
      if (actual < range.min || actual > range.max) {
        this._reportViolation(
          `${label}: expected ${expected}, got ${actual}`,
          critical
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Validate SVG panel structure (Phase 4.5)
   * Checks for frame/content/overlay layers and positioned elements
   */
  static _assertSVGStructure(panelKey, root, def) {
    if (!def.svgBacked) {
      return; // Not an SVG-backed panel
    }

    const isCritical = def.postRenderAssertions?.critical ?? false;

    // Check frame layer (required for all SVG panels)
    const frameLayer = root?.querySelector?.('.swse-panel__frame');
    if (!frameLayer) {
      this._reportViolation(
        `${panelKey}: SVG frame layer (.swse-panel__frame) not found`,
        isCritical
      );
    }

    // Check content layer (required for panels with normal flow content)
    if (def.structure?.includes('content')) {
      const contentLayer = root?.querySelector?.('.swse-panel__content');
      if (!contentLayer) {
        this._reportViolation(
          `${panelKey}: Content layer (.swse-panel__content) missing from structure`,
          isCritical
        );
      }
    }

    // Check overlay layer (required for panels with positioned elements)
    if (def.structure?.includes('overlay')) {
      const overlayLayer = root?.querySelector?.('.swse-panel__overlay');
      if (!overlayLayer) {
        this._reportViolation(
          `${panelKey}: Overlay layer (.swse-panel__overlay) missing from structure`,
          isCritical
        );
      } else {
        // Validate positioned element count if specified
        const overlayAssertions = def.postRenderAssertions?.overlayElements;
        if (overlayAssertions) {
          for (const [selector, expectedCount] of Object.entries(overlayAssertions)) {
            const actual = overlayLayer.querySelectorAll(selector).length;
            this._validateCount(
              actual,
              expectedCount,
              `${panelKey} overlay ${selector}`,
              false // overlay elements non-critical
            );
          }
        }
      }
    }

    // Check aspect ratio if specified (Phase 4.3)
    if (def.structure?.aspectRatio) {
      const computedStyle = window?.getComputedStyle?.(root);
      const aspectRatio = computedStyle?.aspectRatio;
      if (aspectRatio && aspectRatio !== 'auto') {
        // Log for debugging but don't fail - aspect ratios are hints, not hard requirements
        this._debug(`${panelKey} aspect ratio: ${aspectRatio}`);
      }
    }
  }

  /**
   * Assert a single panel based on registry definition
   */
  static _assertPanel(panelKey, html, context) {
    const def = PANEL_REGISTRY[panelKey];
    if (!def || !def.postRenderAssertions) {
      return; // Panel has no assertions defined
    }

    const { rootSelector, expectedElements = {}, optionalElements = {}, critical = false } = def.postRenderAssertions;

    // Check root exists. Concept tabs can render the same panel data through
    // newer dashboard DOM instead of the legacy registry root selectors. Treat
    // those concept-dashboard roots as valid equivalents so diagnostics do not
    // spam false positives or mask real errors during gear-tab hydration tests.
    const root = html?.querySelector?.(rootSelector);
    if (!root) {
      const activeTab = html?.querySelector?.('.tab.active[data-tab]');
      const activeTabId = activeTab?.dataset?.tab ?? null;
      const activeConceptGear = html?.querySelector?.('.tab.active[data-tab="gear"] .swse-concept-dashboard, .tab.active[data-tab="gear"] .swse-concept-panel--ledger');
      if (activeConceptGear && ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'].includes(panelKey)) {
        return;
      }
      // VisibilityManager can report panels that are valid for the sheet at large
      // even when the currently active tab intentionally does not render them.
      // Only warn loudly for critical panels; otherwise keep the diagnostic quiet.
      if (!critical && activeTabId) {
        this._debug(`${panelKey} root (${rootSelector}) not present on active tab "${activeTabId}"; skipped.`);
        return;
      }
      this._reportViolation(`${panelKey} root (${rootSelector}) not found`, critical);
      return;
    }

    // Check expected elements
    for (const [selector, expectedCount] of Object.entries(expectedElements)) {
      const actual = root.querySelectorAll(selector).length;
      this._validateCount(actual, expectedCount, `${panelKey} ${selector}`, critical);
    }

    // Check optional elements (warn only, never critical)
    for (const [selector, expectedCount] of Object.entries(optionalElements)) {
      const actual = root.querySelectorAll(selector).length;
      this._validateCount(actual, expectedCount, `${panelKey} ${selector} (optional)`, false);
    }

    // Phase 4.5: Validate SVG structure for SVG-backed panels
    this._assertSVGStructure(panelKey, root, def);

    this._debug(`✓ ${panelKey} passed`, {
      root: rootSelector,
      elements: Object.keys(expectedElements).length,
      svgBacked: def.svgBacked ?? false
    });
  }

  /**
   * Run all registry-driven assertions after render
   *
   * @param {HTMLElement} html - Root DOM element
   * @param {Object} context - Render context
   * @param {Array<string>} visiblePanels - List of panel keys that should be checked (if null, check all)
   */
  static _diagnosticsEnabled() {
    return Boolean(
      CONFIG?.SWSE?.postRenderDiagnostics ||
      CONFIG?.SWSE?.strictMode ||
      game?.settings?.get?.('foundryvtt-swse', 'postRenderDiagnostics') ||
      globalThis.sessionStorage?.getItem?.('swse.postRenderAssertions') === '1'
    );
  }

  static _debug(message, data = undefined) {
    if (!this._diagnosticsEnabled()) return;
    if (data === undefined) console.debug?.(`[PostRender] ${message}`);
    else console.debug?.(`[PostRender] ${message}`, data);
  }

  static runAll(html, context, visiblePanels = null) {
    const diagnostics = this._diagnosticsEnabled();
    if (diagnostics) console.groupCollapsed?.('[PostRender] Registry-Driven Panel DOM Assertions');

    try {
      const shellSurface = context?.shellSurface ?? context?.shell?.surface ?? null;
      if (shellSurface && shellSurface !== 'sheet') {
        this._debug(`Skipping sheet-panel assertions while shell surface "${shellSurface}" is active.`);
        return;
      }

      // If no visible panels specified, check all registered panels (legacy behavior)
      const panelsToCheck = visiblePanels ?? Object.keys(PANEL_REGISTRY);

      for (const panelKey of panelsToCheck) {
        const def = PANEL_REGISTRY[panelKey];
        if (!def) {
          this._reportViolation(`Unknown panel: ${panelKey}`, false);
          continue;
        }
        this._assertPanel(panelKey, html, context);
      }
      this._debug('All assertions completed');
    } catch (err) {
      console.error('[PostRender] ASSERTION FAILED (strict mode):', err.message);
      if (CONFIG?.SWSE?.strictMode) throw err;
    } finally {
      if (diagnostics) console.groupEnd?.();
    }
  }
}
