/**
 * SWSE CSS Auditor - Runtime CSS Invariant Validation
 *
 * Detects CSS violations of SWSE assumptions:
 * - No overflow clipping (sidebar, windows)
 * - No zero-size elements
 * - No stacking context violations
 * - No forbidden properties (transform, filter on layouts)
 * - FontAwesome renders correctly
 * - Theme CSS variables resolved
 * - No critical UI hidden
 *
 * All checks are logged with structured error codes for debugging.
 */

/**
 * Safe accessor for devMode setting
 * Uses _dev-mode module if available, otherwise returns false
 */
function getDevMode() {
  return game.modules.get('_dev-mode')?.active ?? false;
}

/**
 * Log overflow violations (clipped content)
 * @param {string} selector - CSS selector to check
 * @param {string} label - Human-readable label
 */
export function auditOverflow(selector, label) {
  if (!getDevMode()) {return;}

  const el = document.querySelector(selector);
  if (!el) {return;}

  const style = getComputedStyle(el);
  if (style.overflow === 'hidden' && el.scrollHeight > el.clientHeight) {
    console.warn(
      `🟨 [CSS.OVERFLOW.CLIPPED] ${label} is clipping content`,
      {
        selector,
        overflow: style.overflow,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      }
    );
  }
}

/**
 * Log zero-size elements (invisible but rendered)
 * @param {HTMLElement} el - Element to check
 * @param {string} label - Human-readable label
 */
export function auditZeroSize(el, label) {
  if (!getDevMode()) {return;}
  if (!el) {return;}

  const rect = el.getBoundingClientRect();
  if ((rect.width === 0 || rect.height === 0) && el.children.length > 0) {
    console.warn(
      `🟨 [CSS.ZERO_SIZE_ELEMENT] ${label} has zero size but contains content`,
      {
        width: rect.width,
        height: rect.height,
        childCount: el.children.length
      }
    );
  }
}

/**
 * Log stacking context violations (z-index without positioning)
 * @param {HTMLElement} el - Element to check
 * @param {string} label - Human-readable label
 */
export function auditStackingContext(el, label) {
  if (!getDevMode()) {return;}
  if (!el) {return;}

  const style = getComputedStyle(el);
  if (style.zIndex !== 'auto' && style.position === 'static') {
    console.warn(
      `🟨 [CSS.ZINDEX_NO_POSITION] ${label} has z-index without positioning`,
      { zIndex: style.zIndex, position: style.position }
    );
  }
}

/**
 * Log forbidden CSS properties (transform, filter on layout containers)
 * Enforces CSS containment contract at runtime.
 * @param {HTMLElement} el - Element to check
 * @param {string} label - Human-readable label
 * @param {string[]} forbidden - List of forbidden properties
 */
export function auditForbiddenStyles(el, label, forbidden = ['transform', 'filter', 'backdrop-filter']) {
  if (!getDevMode()) {return;}
  if (!el) {return;}

  const style = getComputedStyle(el);
  for (const prop of forbidden) {
    if (style[prop] && style[prop] !== 'none') {
      console.error(
        `🟥 [CSS.FORBIDDEN_PROPERTY] ${label} uses forbidden property: ${prop}`,
        { property: prop, value: style[prop] }
      );
    }
  }
}

/**
 * Log broken FontAwesome icons (missing font, wrong version)
 * Detects the "X icon" failure pattern.
 */
export function auditIcons() {
  if (!getDevMode()) {return;}

  const icons = document.querySelectorAll('i.fa, i.fa-solid, i.fas, [class*="fa-"]');
  const issues = [];

  icons.forEach(icon => {
    const style = getComputedStyle(icon);
    if (!style.fontFamily.includes('Font Awesome') && !style.fontFamily.includes('FontAwesome')) {
      issues.push({
        class: icon.className,
        fontFamily: style.fontFamily
      });
    }
  });

  if (issues.length > 0) {
    console.warn(
      `🟨 [CSS.ICON.FONT_MISSING] ${issues.length} icons not using FontAwesome font`,
      issues.slice(0, 5) // Show first 5 only
    );
  }
}

/**
 * Log missing CSS variables (theme not fully applied)
 * @param {string} varName - CSS variable name (e.g. "--swse-accent-color")
 * @param {string} expectedFallback - Expected fallback value
 */
export function auditCSSVariable(varName, expectedFallback) {
  if (!getDevMode()) {return;}

  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!value || value === expectedFallback) {
    console.warn(
      `🟨 [CSS.VAR.MISSING] CSS variable "${varName}" is missing or using fallback`,
      { varName, value: value || 'undefined', fallback: expectedFallback }
    );
  }
}

/**
 * Log hidden elements (display:none, visibility:hidden on important UI)
 * @param {HTMLElement} el - Element to check
 * @param {string} label - Human-readable label
 */
export function auditHidden(el, label) {
  if (!getDevMode()) {return;}
  if (!el) {return;}

  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') {
    console.error(
      `🟥 [CSS.ELEMENT_HIDDEN] ${label} is hidden by CSS`,
      { display: style.display, visibility: style.visibility }
    );
  }
}

/**
 * CSS Health Report - Complete audit of all invariants
 * Provides snapshot of CSS state for debugging.
 * @returns {Object} Health report with pass/fail status
 */
export function auditCSSHealth() {
  if (!getDevMode()) {
    console.warn('[CSS Auditor] Skipped (dev mode disabled)');
    return false;
  }

  console.group('%c[SWSE CSS Health Audit]', 'color: #00ccff; font-weight: bold;');

  const results = [];

  // Test 1: Sidebar overflow
  const sidebarTest = () => {
    const sidebar = document.querySelector('#sidebar-content');
    if (sidebar) {
      const style = getComputedStyle(sidebar);
      const isClipped = style.overflow === 'hidden' && sidebar.scrollHeight > sidebar.clientHeight;
      return { pass: !isClipped, label: 'Sidebar overflow', hidden: isClipped };
    }
    return { pass: true, label: 'Sidebar overflow', reason: 'Sidebar not found' };
  };
  results.push(sidebarTest());

  // Test 2: Containment on layout containers
  const containmentTest = () => {
    const containers = document.querySelectorAll('#sidebar, .app.window-app');
    let allHave = true;
    for (const el of containers) {
      const style = getComputedStyle(el);
      if (style.contain !== 'layout paint') {
        allHave = false;
        break;
      }
    }
    return { pass: allHave, label: 'CSS containment applied' };
  };
  results.push(containmentTest());

  // Test 3: FontAwesome font
  const iconFontTest = () => {
    const icon = document.querySelector('i.fa, i.fa-solid');
    if (icon) {
      const style = getComputedStyle(icon);
      const hasFont = style.fontFamily.includes('Font Awesome') || style.fontFamily.includes('FontAwesome');
      return { pass: hasFont, label: 'FontAwesome font loaded' };
    }
    return { pass: true, label: 'FontAwesome font loaded', reason: 'No icons found' };
  };
  results.push(iconFontTest());

  // Test 4: No forbidden transforms on sidebar
  const forbiddenTest = () => {
    const sidebar = document.querySelector('#sidebar');
    if (sidebar) {
      const style = getComputedStyle(sidebar);
      const hasForbidden = (style.transform && style.transform !== 'none') ||
        (style.filter && style.filter !== 'none');
      return { pass: !hasForbidden, label: 'No forbidden CSS properties on sidebar' };
    }
    return { pass: true, label: 'No forbidden CSS properties on sidebar' };
  };
  results.push(forbiddenTest());

  // Test 5: No critical UI hidden
  const hiddenTest = () => {
    const criticalUI = document.querySelector('#sidebar, .app.window-app, .chargen-body');
    if (criticalUI) {
      const style = getComputedStyle(criticalUI);
      const isHidden = style.display === 'none' || style.visibility === 'hidden';
      return { pass: !isHidden, label: 'Critical UI is visible' };
    }
    return { pass: true, label: 'Critical UI is visible' };
  };
  results.push(hiddenTest());

  // Print results table
  const table = results.map(r => ({
    status: r.pass ? '✓' : '✗',
    test: r.label,
    details: r.reason || (r.hidden ? 'Content clipped' : 'OK')
  }));
  console.table(table);

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  if (failed > 0) {
    console.error(`CSS health FAILED: ${failed} violations found`);
    console.groupEnd();
    return false;
  } else {
    console.log(`✓ All ${passed} CSS tests passed`);
    console.groupEnd();
    return true;
  }
}

/**
 * Complete CSS audit including overflow, icons, variables, etc.
 * Called automatically after render in dev mode.
 */
export function runFullCSSAudit() {
  if (!getDevMode()) {return;}

  // Overflow checks
  auditOverflow('#sidebar', 'Sidebar');
  auditOverflow('.app.window-app', 'Application windows');
  auditOverflow('.chargen-body', 'CharGen body');

  // Forbidden property checks
  auditForbiddenStyles(document.querySelector('#sidebar'), 'Sidebar');
  auditForbiddenStyles(document.querySelector('.app.window-app'), 'Application windows');

  // Icon checks
  auditIcons();

  // Theme variable checks
  auditCSSVariable('--swse-accent-color', '#000');
  auditCSSVariable('--swse-text-color', '#fff');

  // Visibility checks
  auditHidden(document.querySelector('#sidebar'), 'Sidebar');
}
