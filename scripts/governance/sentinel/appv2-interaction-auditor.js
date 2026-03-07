/**
 * AppV2 Interaction Auditor
 * Phase A: Automated audit of V2 sheets/apps for expand/scroll/tabs/buttons/partials
 * Phase B: Surgical remediation using foundation helpers
 *
 * Goal: Ensure all V2 interactions work on V13 without regressions
 * Non-negotiable: No rewrites, only surgical plumbing fixes
 */

export class AppV2InteractionAuditor {
  static AUDIT_VERSION = '1.0';

  /**
   * Run complete audit on an AppV2 instance
   * Returns detailed report for Phase B remediation
   */
  static async auditApp(app, appClass) {
    if (!app || !app.element) {
      return this._createFailureReport(appClass, 'App not rendered or element missing');
    }

    const report = {
      appClass,
      appId: app.id || `app-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      renderOk: false,
      checks: {
        render: { pass: false, details: [] },
        expand: { pass: null, details: [] },
        scroll: { pass: null, details: [] },
        tabs: { pass: null, details: [] },
        buttons: { pass: null, details: [] },
        partials: { pass: null, details: [] }
      },
      issues: [],
      fixes: []
    };

    try {
      // 1. Render check
      report.checks.render = this._checkRender(app);
      report.renderOk = report.checks.render.pass;

      if (!report.renderOk) {
        return report;
      }

      // 2. Expand/collapse check
      report.checks.expand = this._checkExpand(app);

      // 3. Scroll check
      report.checks.scroll = this._checkScroll(app);

      // 4. Tabs check
      report.checks.tabs = this._checkTabs(app);

      // 5. Button wiring check
      report.checks.buttons = this._checkButtonWiring(app);

      // 6. Partials hydration check
      report.checks.partials = this._checkPartials(app);

      // Aggregate issues
      Object.values(report.checks).forEach(check => {
        if (check.pass === false) {
          check.details.forEach(detail => {
            report.issues.push({
              category: Object.keys(report.checks).find(k => report.checks[k] === check),
              severity: detail.severity || 'ERROR',
              message: detail.message
            });
          });
        }
      });

    } catch (err) {
      report.checks.render.pass = false;
      report.checks.render.details.push({
        severity: 'ERROR',
        message: `Audit exception: ${err.message}`
      });
    }

    return report;
  }

  /**
   * Check 1: Render state
   */
  static _checkRender(app) {
    const details = [];
    let pass = true;

    // Element exists
    if (!(app.element instanceof HTMLElement)) {
      details.push({
        severity: 'ERROR',
        message: 'element is not HTMLElement'
      });
      pass = false;
    }

    // Content element resolves (AppV2 specific)
    if (app.contentElement && !(app.contentElement instanceof HTMLElement)) {
      details.push({
        severity: 'ERROR',
        message: 'contentElement exists but not HTMLElement'
      });
      pass = false;
    }

    // [data-application-content] exists (V13 contract)
    if (app.element && !app.element.querySelector('[data-application-content]')) {
      details.push({
        severity: 'WARN',
        message: 'Missing [data-application-content] (V13 contract element)'
      });
    }

    return { pass, details };
  }

  /**
   * Check 2: Expand/collapse support
   */
  static _checkExpand(app) {
    const root = app.element;
    const details = [];
    let pass = null; // N/A if not implemented

    // Find expand controls
    const expandControls = root.querySelectorAll('[data-action="expand"], .collapse-toggle, [aria-expanded]');

    if (expandControls.length === 0) {
      return { pass: null, details: [{ message: 'No expand/collapse controls found (N/A)' }] };
    }

    // If expand is present, verify it works
    pass = true;
    let expandCount = 0;

    for (const ctrl of expandControls) {
      expandCount++;
      const isAriaExpanded = ctrl.hasAttribute('aria-expanded');
      const hasToggleClass = ctrl.classList.contains('collapse-toggle') || ctrl.classList.contains('expand-toggle');

      if (!isAriaExpanded && !hasToggleClass) {
        details.push({
          severity: 'WARN',
          message: `Expand control #${expandCount} missing aria-expanded or toggle class`
        });
      }
    }

    if (expandCount > 0) {
      details.push({
        message: `Found ${expandCount} expand/collapse controls`
      });
    }

    return { pass, details };
  }

  /**
   * Check 3: Scroll containers
   */
  static _checkScroll(app) {
    const root = app.element;
    const details = [];
    let pass = true;

    // Preferred: contentElement should be scrollable
    if (app.contentElement) {
      const computed = window.getComputedStyle(app.contentElement);
      const overflow = computed.overflowY;

      if (overflow !== 'auto' && overflow !== 'scroll') {
        details.push({
          severity: 'WARN',
          message: `contentElement has overflow-y: ${overflow} (expected auto/scroll)`
        });
      }

      // Check if container has non-zero height
      const rect = app.contentElement.getBoundingClientRect();
      if (rect.height === 0) {
        details.push({
          severity: 'ERROR',
          message: 'contentElement has zero height (will not scroll)'
        });
        pass = false;
      }
    }

    // Check for common scroll containers
    const scrollContainers = root.querySelectorAll('.sheet-body, [data-scroll-container]');
    if (scrollContainers.length > 0) {
      details.push({
        message: `Found ${scrollContainers.length} potential scroll container(s)`
      });
    }

    return { pass, details };
  }

  /**
   * Check 4: Tab switching
   */
  static _checkTabs(app) {
    const root = app.element;
    const details = [];
    let pass = null; // N/A if no tabs

    // Find tab groups
    const tabGroups = root.querySelectorAll('[data-tab-group]');
    if (tabGroups.length === 0) {
      return { pass: null, details: [{ message: 'No tab groups found (N/A)' }] };
    }

    pass = true;

    for (const group of tabGroups) {
      const groupName = group.getAttribute('data-tab-group');

      // Find tab buttons for this group
      const tabButtons = root.querySelectorAll(`[data-action="tab"][data-tab-group="${groupName}"], [data-action="tab"][data-tab]`);
      const tabPanels = root.querySelectorAll(`[data-tab-group="${groupName}"][data-tab]`);

      if (tabButtons.length === 0) {
        details.push({
          severity: 'ERROR',
          message: `Tab group "${groupName}": No tab buttons found ([data-action="tab"])`
        });
        pass = false;
      }

      if (tabPanels.length === 0) {
        details.push({
          severity: 'ERROR',
          message: `Tab group "${groupName}": No tab panels found ([data-tab-group="${groupName}"][data-tab])`
        });
        pass = false;
      }

      if (tabButtons.length > 0 && tabPanels.length > 0) {
        // Verify initial tab exists
        const initialTab = group.querySelector('[data-action="tab"].active');
        if (!initialTab) {
          details.push({
            severity: 'WARN',
            message: `Tab group "${groupName}": No active tab marked (should have .active class)`
          });
        }

        details.push({
          message: `Tab group "${groupName}": ${tabButtons.length} buttons, ${tabPanels.length} panels`
        });
      }
    }

    return { pass, details };
  }

  /**
   * Check 5: Button wiring (event handlers)
   */
  static _checkButtonWiring(app) {
    const root = app.element;
    const details = [];
    let pass = true;

    // Find all interactive controls
    const interactiveSelectors = '[data-action], button, a.clickable, [role="button"]';
    const controls = root.querySelectorAll(interactiveSelectors);

    if (controls.length === 0) {
      return { pass: null, details: [{ message: 'No interactive controls found (N/A)' }] };
    }

    details.push({
      message: `Found ${controls.length} interactive control(s)`
    });

    // Check for required system actions
    const requiredActions = ['delete', 'approve', 'reject', 'purchase', 'use'];
    for (const action of requiredActions) {
      const found = root.querySelector(`[data-action="${action}"]`);
      if (found) {
        // Check if handler is wired
        // This is hard to verify without running - just report presence
        details.push({
          message: `Required action "${action}" found - verify handler in _onRender`
        });
      }
    }

    return { pass, details };
  }

  /**
   * Check 6: Partials hydration
   */
  static _checkPartials(app) {
    const root = app.element;
    const details = [];
    let pass = true;

    // Common partial panel selectors
    const panelSelectors = [
      '.holo-panel',
      '.panel',
      '[role="region"]',
      '.card',
      '.item-list',
      '.section'
    ];

    for (const selector of panelSelectors) {
      const panels = root.querySelectorAll(selector);
      for (const panel of panels) {
        // Check if panel is empty (no children with content)
        const children = panel.querySelectorAll('*');
        if (children.length === 0 || panel.textContent.trim().length === 0) {
          const panelId = panel.id || panel.className || 'unnamed';
          details.push({
            severity: 'WARN',
            message: `Empty partial panel: ${selector} (${panelId}) - check context hydration`
          });
        }
      }
    }

    if (details.length === 0) {
      details.push({
        message: 'Partial panels appear to be hydrated'
      });
    }

    return { pass, details };
  }

  /**
   * Generate human-readable report
   */
  static generateReport(reports) {
    const table = [];
    let errorCount = 0;
    let warnCount = 0;

    for (const report of reports) {
      const checkStatus = {
        expand: report.checks.expand.pass === null ? 'N/A' : (report.checks.expand.pass ? '✓' : '✗'),
        scroll: report.checks.scroll.pass === null ? 'N/A' : (report.checks.scroll.pass ? '✓' : '✗'),
        tabs: report.checks.tabs.pass === null ? 'N/A' : (report.checks.tabs.pass ? '✓' : '✗'),
        buttons: report.checks.buttons.pass === null ? 'N/A' : (report.checks.buttons.pass ? '✓' : '✗'),
        partials: report.checks.partials.pass === null ? 'N/A' : (report.checks.partials.pass ? '✓' : '✗')
      };

      table.push({
        class: report.appClass,
        render: report.renderOk ? '✓' : '✗',
        ...checkStatus,
        issues: report.issues.length
      });

      errorCount += report.issues.filter(i => i.severity === 'ERROR').length;
      warnCount += report.issues.filter(i => i.severity === 'WARN').length;
    }

    return {
      summary: {
        totalApps: reports.length,
        errors: errorCount,
        warnings: warnCount,
        timestamp: new Date().toISOString()
      },
      table,
      reports
    };
  }

  static _createFailureReport(appClass, message) {
    return {
      appClass,
      appId: `unknown`,
      timestamp: new Date().toISOString(),
      renderOk: false,
      checks: {
        render: { pass: false, details: [{ severity: 'ERROR', message }] },
        expand: { pass: null, details: [] },
        scroll: { pass: null, details: [] },
        tabs: { pass: null, details: [] },
        buttons: { pass: null, details: [] },
        partials: { pass: null, details: [] }
      },
      issues: [{
        category: 'render',
        severity: 'ERROR',
        message
      }],
      fixes: []
    };
  }
}
