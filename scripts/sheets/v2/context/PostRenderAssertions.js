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
        console.log(`[PostRender] ${panelKey} aspect ratio: ${aspectRatio}`);
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

    // Check root exists
    const root = html?.querySelector?.(rootSelector);
    if (!root) {
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

    console.log(`[PostRender] ✓ ${panelKey} passed`, {
      root: rootSelector,
      elements: Object.keys(expectedElements).length,
      svgBacked: def.svgBacked ?? false
    });
  }

  /**
   * Run all registry-driven assertions after render
   */
  static runAll(html, context) {
    console.group('[PostRender] Registry-Driven Panel DOM Assertions');
    try {
      const panelKeys = Object.keys(PANEL_REGISTRY);
      for (const panelKey of panelKeys) {
        this._assertPanel(panelKey, html, context);
      }
      console.log('[PostRender] All assertions completed');
    } catch (err) {
      console.error('[PostRender] ASSERTION FAILED (strict mode):', err.message);
      if (CONFIG?.SWSE?.strictMode) throw err;
    }
    console.groupEnd();
  }
}
