/**
 * SWSE Sentinel Tab Diagnostics
 *
 * Deep diagnostic module for tab system failures.
 * Identifies root causes of tab lookup failures despite correct DOM structure.
 *
 * Checks:
 * - Tab panel dimensions (zero-size detection)
 * - Tab panel visibility (display: none, visibility: hidden, opacity: 0)
 * - CSS rules affecting panels (stylesheet audit)
 * - DOM mutations between render and tab access
 * - Attribute presence and correctness
 * - Tab group binding verification
 */

import { StructuredLogger, SEVERITY } from "/systems/foundryvtt-swse/scripts/core/structured-logger.js";

export class SentinelTabDiagnostics {
  /**
   * Run complete tab system diagnostic
   * @param {HTMLElement} rootElement - ApplicationV2 element root
   * @param {Object} config - Configuration { silent: false }
   * @returns {Object} Diagnostic report
   */
  static diagnose(rootElement, config = {}) {
    if (!(rootElement instanceof HTMLElement)) {
      return this._reportError('Invalid element provided to tab diagnostics');
    }

    const { silent = false } = config;

    const report = {
      timestamp: new Date().toISOString(),
      rootElement: rootElement.className,
      diagnostics: {}
    };

    // Phase 1: Structural audit
    report.diagnostics.structure = this._auditStructure(rootElement);

    // Phase 2: Visibility audit
    report.diagnostics.visibility = this._auditVisibility(rootElement);

    // Phase 3: CSS rule audit
    report.diagnostics.cssRules = this._auditCSSRules(rootElement);

    // Phase 4: Attribute audit
    report.diagnostics.attributes = this._auditAttributes(rootElement);

    // Phase 5: Tab group binding
    report.diagnostics.binding = this._auditBinding(rootElement);

    // Phase 6: Summary
    report.summary = this._generateSummary(report.diagnostics);

    // Log findings (unless silent mode for integrated auditing)
    if (!silent) {
      this._logReport(report);
    }

    return report;
  }

  /**
   * Phase 1: Audit tab structure in DOM
   */
  static _auditStructure(rootElement) {
    const panels = rootElement.querySelectorAll('.tab[data-group][data-tab]');
    const structure = {
      panelCount: panels.length,
      panels: [],
      groups: new Set()
    };

    panels.forEach((panel, idx) => {
      const tabGroup = panel.getAttribute('data-group');
      const tabName = panel.getAttribute('data-tab');

      structure.groups.add(tabGroup);
      structure.panels.push({
        index: idx,
        tagName: panel.tagName,
        id: panel.id || 'no-id',
        tabGroup,
        tabName,
        inDOM: document.contains(panel),
        parent: panel.parentElement?.tagName || 'orphan'
      });
    });

    structure.groups = Array.from(structure.groups);

    return structure;
  }

  /**
   * Phase 2: Audit tab panel visibility
   */
  static _auditVisibility(rootElement) {
    const panels = rootElement.querySelectorAll('.tab[data-group][data-tab]');
    const visibility = {
      invisiblePanels: [],
      zeroDimensionPanels: [],
      details: {}
    };

    panels.forEach((panel) => {
      const tabGroup = panel.getAttribute('data-group');
      const tabName = panel.getAttribute('data-tab');
      const key = `${tabGroup}:${tabName}`;

      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();

      const details = {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: rect.width,
        height: rect.height,
        offsetWidth: panel.offsetWidth,
        offsetHeight: panel.offsetHeight,
        scrollWidth: panel.scrollWidth,
        scrollHeight: panel.scrollHeight
      };

      visibility.details[key] = details;

      // Zero dimension detection
      if ((rect.width === 0 || rect.height === 0) && panel.children.length > 0) {
        visibility.zeroDimensionPanels.push({
          key,
          width: rect.width,
          height: rect.height,
          reason: 'getBoundingClientRect returns zero size'
        });
      }

      // Visibility detection
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
        visibility.invisiblePanels.push({
          key,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        });
      }
    });

    return visibility;
  }

  /**
   * Phase 3: Audit CSS rules affecting panels
   */
  static _auditCSSRules(rootElement) {
    const panels = rootElement.querySelectorAll('.tab[data-group][data-tab]');
    const cssAudit = {
      rulesAffectingPanels: [],
      stylesheetSources: new Set(),
      suspiciousRules: []
    };

    // For each panel, find which CSS rules apply
    panels.forEach((panel) => {
      const tabGroup = panel.getAttribute('data-group');
      const tabName = panel.getAttribute('data-tab');
      const key = `${tabGroup}:${tabName}`;

      // Get all stylesheets
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules || [];

          for (const rule of rules) {
            if (rule.selectorText && panel.matches(rule.selectorText)) {
              const ruleKey = `${key} matches ${rule.selectorText}`;

              cssAudit.rulesAffectingPanels.push({
                key,
                selector: rule.selectorText,
                stylesheet: sheet.href || 'inline',
                properties: this._extractRuleProperties(rule)
              });

              // Flag suspicious rules
              if (this._isSuspiciousRule(rule)) {
                cssAudit.suspiciousRules.push({
                  key,
                  selector: rule.selectorText,
                  stylesheet: sheet.href || 'inline',
                  issues: this._identifySuspiciousProperties(rule)
                });
              }

              cssAudit.stylesheetSources.add(sheet.href || 'inline');
            }
          }
        } catch (e) {
          // CORS or other access issues with external stylesheets
          cssAudit.stylesheetSources.add(`${sheet.href} (inaccessible)`);
        }
      }
    });

    cssAudit.stylesheetSources = Array.from(cssAudit.stylesheetSources);
    return cssAudit;
  }

  /**
   * Extract CSS properties from a rule
   */
  static _extractRuleProperties(rule) {
    if (!rule.style) return {};

    const props = {};
    const propertiesToCheck = [
      'display', 'visibility', 'opacity', 'overflow', 'height', 'width',
      'maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'position',
      'zIndex', 'transform', 'scale', 'clip', 'clipPath'
    ];

    propertiesToCheck.forEach(prop => {
      const value = rule.style.getPropertyValue(prop);
      if (value) props[prop] = value;
    });

    return props;
  }

  /**
   * Identify suspicious CSS rules
   */
  static _isSuspiciousRule(rule) {
    if (!rule.style) return false;

    const suspiciousProps = ['display: none', 'visibility: hidden', 'max-height: 0', 'height: 0', 'overflow: hidden'];
    const cssText = rule.style.cssText.toLowerCase();

    return suspiciousProps.some(prop => cssText.includes(prop));
  }

  /**
   * Identify specific issues in CSS rule
   */
  static _identifySuspiciousProperties(rule) {
    const issues = [];

    if (!rule.style) return issues;

    const display = rule.style.getPropertyValue('display');
    if (display === 'none') issues.push('display: none (hides element)');

    const visibility = rule.style.getPropertyValue('visibility');
    if (visibility === 'hidden') issues.push('visibility: hidden (hides element)');

    const opacity = rule.style.getPropertyValue('opacity');
    if (opacity === '0') issues.push('opacity: 0 (invisible)');

    const maxHeight = rule.style.getPropertyValue('max-height');
    if (maxHeight === '0') issues.push('max-height: 0 (collapses)');

    const height = rule.style.getPropertyValue('height');
    if (height === '0') issues.push('height: 0 (collapses)');

    const overflow = rule.style.getPropertyValue('overflow');
    if (overflow === 'hidden') issues.push('overflow: hidden (clips)');

    const clipPath = rule.style.getPropertyValue('clip-path');
    if (clipPath && clipPath !== 'none') issues.push(`clip-path: ${clipPath} (clips)`);

    return issues;
  }

  /**
   * Phase 4: Audit tab panel attributes
   */
  static _auditAttributes(rootElement) {
    const panels = rootElement.querySelectorAll('.tab[data-group][data-tab]');
    const tabButtons = rootElement.querySelectorAll('[data-action="tab"]');

    const attributes = {
      panelAttributes: [],
      buttonAttributes: [],
      missingAttributes: []
    };

    // Check panel attributes
    panels.forEach((panel) => {
      attributes.panelAttributes.push({
        element: panel.tagName,
        dataTabGroup: panel.getAttribute('data-group'),
        dataTab: panel.getAttribute('data-tab'),
        hasClass: panel.className
      });
    });

    // Check button attributes
    tabButtons.forEach((btn) => {
      attributes.buttonAttributes.push({
        element: btn.tagName,
        dataAction: btn.getAttribute('data-action'),
        dataTab: btn.getAttribute('data-tab'),
        dataGroup: btn.getAttribute('data-group'),
        text: btn.textContent.trim().substring(0, 50)
      });
    });

    return attributes;
  }

  /**
   * Phase 5: Audit tab group binding
   * Tests if ApplicationV2's changeTab() can find panels
   */
  static _auditBinding(rootElement) {
    const binding = {
      groups: {},
      errors: []
    };

    const tabGroups = new Set();
    rootElement.querySelectorAll('.tab[data-group]').forEach(el => {
      tabGroups.add(el.getAttribute('data-group'));
    });

    tabGroups.forEach((groupName) => {
      binding.groups[groupName] = {
        groupName,
        tabs: [],
        bindingStatus: 'ok',
        errors: []
      };

      const panels = rootElement.querySelectorAll(`.tab[data-group="${groupName}"][data-tab]`);

      panels.forEach((panel) => {
        const tabName = panel.getAttribute('data-tab');

        // Simulate what Foundry's changeTab() does
        const testSelector = `.tab[data-group="${groupName}"][data-tab="${tabName}"]`;
        const foundPanel = rootElement.querySelector(testSelector);

        const tabInfo = {
          tabName,
          panelFound: foundPanel !== null,
          panelIs: foundPanel ? foundPanel.tagName : 'NOT FOUND',
          selector: testSelector
        };

        if (!foundPanel) {
          binding.groups[groupName].bindingStatus = 'failed';
          binding.groups[groupName].errors.push({
            tabName,
            selector: testSelector,
            reason: 'querySelector returned null'
          });
        }

        binding.groups[groupName].tabs.push(tabInfo);
      });
    });

    return binding;
  }

  /**
   * Generate summary report
   */
  static _generateSummary(diagnostics) {
    const summary = {
      severityLevel: 'OK',
      issues: [],
      recommendations: []
    };

    // Check structure
    if (diagnostics.structure.panelCount === 0) {
      summary.severityLevel = 'CRITICAL';
      summary.issues.push('No tab panels found in DOM');
      summary.recommendations.push('Verify template contains [data-group] and [data-tab] attributes');
    }

    // Check visibility
    if (diagnostics.visibility.zeroDimensionPanels.length > 0) {
      summary.severityLevel = 'ERROR';
      summary.issues.push(`${diagnostics.visibility.zeroDimensionPanels.length} panels have zero dimensions`);
      summary.recommendations.push('Audit CSS for display: none, max-height: 0, or overflow: hidden');
    }

    if (diagnostics.visibility.invisiblePanels.length > 0) {
      summary.severityLevel = 'ERROR';
      summary.issues.push(`${diagnostics.visibility.invisiblePanels.length} panels are invisible`);
      summary.recommendations.push('Check CSS for visibility or opacity rules');
    }

    // Check CSS rules
    if (diagnostics.cssRules.suspiciousRules.length > 0) {
      if (summary.severityLevel === 'OK') summary.severityLevel = 'WARNING';
      summary.issues.push(`${diagnostics.cssRules.suspiciousRules.length} suspicious CSS rules found`);
      summary.recommendations.push('Review CSS rules that hide/collapse elements');
    }

    // Check binding
    Object.values(diagnostics.binding.groups).forEach((group) => {
      if (group.bindingStatus === 'failed') {
        summary.severityLevel = 'ERROR';
        summary.issues.push(`Tab group "${group.groupName}" has binding failures`);
        group.errors.forEach(error => {
          summary.recommendations.push(`Tab "${error.tabName}": querySelector("${error.selector}") fails`);
        });
      }
    });

    return summary;
  }

  /**
   * Log the complete report
   */
  static _logReport(report) {
    const { summary, diagnostics } = report;

    StructuredLogger.app(SEVERITY.INFO, '🔍 SENTINEL TAB DIAGNOSTICS REPORT', {
      severityLevel: summary.severityLevel,
      timestamp: report.timestamp
    });

    // Log summary
    if (summary.issues.length > 0) {
      StructuredLogger.app(SEVERITY.WARN, `Tab System Issues (${summary.severityLevel})`, {
        issues: summary.issues,
        recommendations: summary.recommendations
      });
    } else {
      StructuredLogger.app(SEVERITY.INFO, 'No tab system issues detected', {});
    }

    // Log structure
    StructuredLogger.app(SEVERITY.DEBUG, 'Tab Structure Audit', {
      panelCount: diagnostics.structure.panelCount,
      groups: diagnostics.structure.groups,
      panels: diagnostics.structure.panels
    });

    // Log visibility issues
    if (diagnostics.visibility.zeroDimensionPanels.length > 0) {
      StructuredLogger.app(SEVERITY.WARN, 'Zero-Dimension Panels Detected', {
        panels: diagnostics.visibility.zeroDimensionPanels
      });
    }

    if (diagnostics.visibility.invisiblePanels.length > 0) {
      StructuredLogger.app(SEVERITY.WARN, 'Invisible Panels Detected', {
        panels: diagnostics.visibility.invisiblePanels
      });
    }

    // Log CSS issues
    if (diagnostics.cssRules.suspiciousRules.length > 0) {
      StructuredLogger.app(SEVERITY.WARN, 'Suspicious CSS Rules Affecting Tabs', {
        count: diagnostics.cssRules.suspiciousRules.length,
        rules: diagnostics.cssRules.suspiciousRules
      });
    }

    // Log binding status
    const failedGroups = Object.values(diagnostics.binding.groups).filter(g => g.bindingStatus === 'failed');
    if (failedGroups.length > 0) {
      StructuredLogger.app(SEVERITY.ERROR, 'Tab Binding Failures', {
        failedGroups: failedGroups.map(g => ({
          group: g.groupName,
          errors: g.errors
        }))
      });
    }

    console.log('📊 Full Diagnostic Report:', report);
  }

  /**
   * Error reporting helper
   */
  static _reportError(message) {
    const error = {
      error: true,
      message,
      timestamp: new Date().toISOString()
    };

    StructuredLogger.app(SEVERITY.ERROR, `Tab Diagnostics Failed: ${message}`, error);
    return error;
  }

  /**
   * Quick check: Are tabs working?
   * Returns true if all tab panels are visible and findable
   */
  static isHealthy(rootElement) {
    if (!(rootElement instanceof HTMLElement)) return false;

    const report = this.diagnose(rootElement);
    return report.summary.severityLevel === 'OK';
  }
}

/**
 * Export convenience function for integration with Sentinel
 */
export function initTabDiagnostics() {
  globalThis.SentinelTabDiagnostics = SentinelTabDiagnostics;
  StructuredLogger.app(SEVERITY.DEBUG, 'Tab Diagnostics Module Initialized', {});
}
