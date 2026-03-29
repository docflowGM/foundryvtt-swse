/**
 * SENTINEL PARTIAL CONTRACT MONITOR
 *
 * Runtime enforcement and violation detection for partial/subpartial contracts.
 * Monitors panels, rows, and subpartials for contract violations during sheet rendering.
 *
 * Acts as the in-game supervisor that enforces the partial contract standard.
 */

import { partialRegistry } from './PartialRegistry.js';
import { PartialValidator } from './PartialValidator.js';

class SentinelPartialMonitor {
  constructor() {
    /**
     * Violation log
     * Array of {category, severity, panel, issue, ...} objects
     */
    this.violations = [];

    /**
     * Enable/disable monitoring
     */
    this.enabled = true;

    /**
     * Filter violations by severity
     * 'info' | 'warn' | 'error' | 'critical'
     */
    this.minSeverity = 'warn';
  }

  /**
   * Monitor panel context before render
   * @param {string} sheetType - 'character' | 'npc' | 'droid'
   * @param {string} panelName - Panel name (healthPanel, inventoryPanel, etc.)
   * @param {object} panelContext - Panel context object to validate
   * @param {Actor} actor - Parent actor (for context)
   * @returns {object} {valid: boolean, violations: []}
   */
  monitorPanelContext(sheetType, panelName, panelContext, actor) {
    if (!this.enabled) return {valid: true, violations: []};

    const violations = [];
    const metadata = partialRegistry.getPanel(sheetType, panelName);

    if (!metadata) {
      this._logViolation({
        category: 'registry-mismatch',
        severity: 'critical',
        panel: panelName,
        sheet: sheetType,
        violation: 'panel-not-registered',
        detail: `Panel "${panelName}" not found in registry for sheet "${sheetType}"`,
        actorId: actor?.id,
        actorName: actor?.name,
        recommendation: 'Register panel in PANEL_REGISTRY before use'
      });
      violations.push('Panel not registered');
      return {valid: false, violations};
    }

    // Validate context contract
    const contractValidation = PartialValidator.validatePanelContext(sheetType, panelName, panelContext);
    if (!contractValidation.valid) {
      for (const error of contractValidation.errors) {
        this._logViolation({
          category: 'context-contract-violation',
          severity: 'error',
          panel: panelName,
          sheet: sheetType,
          violation: 'missing-required-key',
          detail: error,
          actorId: actor?.id,
          actorName: actor?.name,
          recommendation: `Ensure builder returns all required keys: ${metadata.contextContract?.required?.join(', ')}`
        });
      }
      violations.push(...contractValidation.errors);
    }

    // Detect forbidden patterns
    const forbiddenPatterns = PartialValidator.detectForbiddenPatterns(panelContext);
    if (forbiddenPatterns.length > 0) {
      for (const pattern of forbiddenPatterns) {
        this._logViolation({
          category: 'forbidden-pattern-detected',
          severity: 'warn',
          panel: panelName,
          sheet: sheetType,
          violation: 'direct-actor-access',
          detail: pattern,
          actorId: actor?.id,
          actorName: actor?.name,
          recommendation: 'Ensure builder provides all data in panel context, not from actor'
        });
      }
      violations.push(...forbiddenPatterns);
    }

    return {
      valid: contractValidation.valid && forbiddenPatterns.length === 0,
      violations
    };
  }

  /**
   * Monitor row shape before ledger render
   * @param {array} rows - Array of row objects
   * @param {string} panelName - Panel that owns these rows
   * @param {string} sheetType - Sheet type
   * @returns {object} {valid: boolean, invalidRows: []}
   */
  monitorRowCollection(rows, panelName, sheetType) {
    if (!this.enabled || !Array.isArray(rows)) return {valid: true, invalidRows: []};

    const invalidRows = [];
    const panelMetadata = partialRegistry.getPanel(sheetType, panelName);

    if (!panelMetadata?.rowTransformer) {
      return {valid: true, invalidRows: []};
    }

    const transformerName = panelMetadata.rowTransformer;

    for (let i = 0; i < rows.length; i++) {
      const rowValidation = PartialValidator.validateRow(rows[i], transformerName);

      if (!rowValidation.valid) {
        invalidRows.push({
          index: i,
          errors: rowValidation.errors,
          row: rows[i]
        });

        this._logViolation({
          category: 'row-contract-violation',
          severity: 'error',
          panel: panelName,
          sheet: sheetType,
          rowIndex: i,
          missingKeys: rowValidation.errors.filter(e => e.includes('missing')),
          violation: 'row-shape-invalid',
          detail: `Row ${i} invalid: ${rowValidation.errors[0]}`,
          recommendation: `Verify transformer "${transformerName}" produces all required fields`
        });
      }
    }

    return {
      valid: invalidRows.length === 0,
      invalidRows
    };
  }

  /**
   * Monitor subpartial data before render
   * @param {object} data - Data passed to subpartial
   * @param {string} subpartialName - Subpartial name
   * @param {string} panelName - Panel that owns this subpartial
   * @returns {object} {valid: boolean, violations: []}
   */
  monitorSubpartialData(data, subpartialName, panelName) {
    if (!this.enabled) return {valid: true, violations: []};

    const violations = [];
    const subpartialConfig = partialRegistry.getSubpartial(subpartialName);

    if (!subpartialConfig) {
      this._logViolation({
        category: 'registry-mismatch',
        severity: 'error',
        partial: subpartialName,
        panel: panelName,
        violation: 'subpartial-not-registered',
        detail: `Subpartial "${subpartialName}" not found in manifest`,
        recommendation: 'Register subpartial in parent panel PANEL_REGISTRY.subpartials array'
      });
      violations.push('Subpartial not registered');
      return {valid: false, violations};
    }

    // Verify data source is correct
    const dataSourceValidation = this._validateSubpartialDataSource(data, subpartialConfig);
    if (!dataSourceValidation.valid) {
      this._logViolation({
        category: 'subpartial-data-source-mismatch',
        severity: 'warn',
        partial: subpartialName,
        panel: panelName,
        violation: 'unexpected-data-source',
        detail: `Subpartial expects ${subpartialConfig.dataSource} but received ${typeof data}`,
        recommendation: `Parent should pass ${subpartialConfig.dataSource} context to subpartial`
      });
      violations.push(`Data source mismatch: expected ${subpartialConfig.dataSource}`);
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Monitor SVG panel structure
   * @param {object} panelContext - SVG panel context
   * @param {string} panelName - Panel name
   * @returns {object} {valid: boolean, violations: []}
   */
  monitorSvgPanelContract(panelContext, panelName) {
    if (!this.enabled) return {valid: true, violations: []};

    const violations = [];
    const metadata = partialRegistry.getPanel('character', panelName); // Check any sheet for metadata

    if (!metadata || metadata.type !== 'svg') {
      return {valid: true, violations: []};
    }

    // Check SVG metadata
    if (!panelContext.imagePath) {
      violations.push('Missing imagePath');
      this._logViolation({
        category: 'svg-contract-violation',
        severity: 'error',
        panel: panelName,
        violation: 'missing-svg-metadata',
        detail: 'SVG panel missing imagePath',
        recommendation: 'Provide valid SVG path in builder context'
      });
    }

    if (!panelContext.safeArea) {
      violations.push('Missing safeArea');
      this._logViolation({
        category: 'svg-contract-violation',
        severity: 'error',
        panel: panelName,
        violation: 'missing-safe-area',
        detail: 'SVG panel missing safe area definition',
        recommendation: 'Define safeArea {x, y, width, height} in builder'
      });
    }

    if (!panelContext.anchors || Object.keys(panelContext.anchors).length === 0) {
      violations.push('Missing or empty anchors');
      this._logViolation({
        category: 'svg-contract-violation',
        severity: 'warn',
        panel: panelName,
        violation: 'no-anchor-points',
        detail: 'SVG panel has no anchor points defined',
        recommendation: 'Define anchors in builder context if socketed subpartials are used'
      });
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Monitor rendered DOM for post-render assertions
   * @param {string} sheetType - 'character' | 'npc' | 'droid'
   * @param {string} panelName - Panel name
   * @param {HTMLElement} panelElement - Rendered panel DOM
   * @returns {object} {valid: boolean, failedAssertions: []}
   */
  monitorPostRenderAssertions(sheetType, panelName, panelElement) {
    if (!this.enabled) return {valid: true, failedAssertions: []};

    const failedAssertions = [];
    const metadata = partialRegistry.getPanel(sheetType, panelName);

    if (!metadata?.postRenderAssertions || metadata.postRenderAssertions.length === 0) {
      return {valid: true, failedAssertions: []};
    }

    for (const assertion of metadata.postRenderAssertions) {
      try {
        const element = panelElement.querySelector(assertion.selector);
        if (!element) {
          failedAssertions.push({
            selector: assertion.selector,
            error: 'Element not found'
          });
          this._logViolation({
            category: 'post-render-assertion-failed',
            severity: 'error',
            panel: panelName,
            violation: 'missing-dom-element',
            detail: `Post-render assertion failed: selector "${assertion.selector}" not found`,
            recommendation: assertion.errorMessage || 'Check template output'
          });
        } else {
          const result = assertion.expectation(element);
          if (!result) {
            failedAssertions.push({
              selector: assertion.selector,
              error: assertion.errorMessage || 'Expectation failed'
            });
            this._logViolation({
              category: 'post-render-assertion-failed',
              severity: 'error',
              panel: panelName,
              violation: 'assertion-expectation-failed',
              detail: `Post-render assertion failed: ${assertion.errorMessage}`,
              recommendation: 'Check template structure and CSS'
            });
          }
        }
      } catch (error) {
        failedAssertions.push({
          selector: assertion.selector,
          error: error.message
        });
        this._logViolation({
          category: 'post-render-assertion-error',
          severity: 'warn',
          panel: panelName,
          violation: 'assertion-threw',
          detail: `Post-render assertion threw error: ${error.message}`,
          recommendation: 'Check assertion expectation function for bugs'
        });
      }
    }

    return {
      valid: failedAssertions.length === 0,
      failedAssertions
    };
  }

  /**
   * Audit registry consistency
   * @returns {array} Array of issues found
   */
  auditRegistry() {
    const issues = partialRegistry.auditConsistency();

    for (const issue of issues) {
      const severity = issue.severity === 'error' ? 'critical' : 'warn';
      this._logViolation({
        category: 'registry-consistency',
        severity,
        panel: issue.panel,
        violation: issue.issue,
        detail: issue.issue,
        recommendation: `${issue.expected || 'Check registry entry'}`
      });
    }

    return issues;
  }

  /**
   * Get all violations
   * @param {string} severity - Optional filter: 'info' | 'warn' | 'error' | 'critical'
   * @returns {array}
   */
  getViolations(severity = null) {
    if (!severity) {
      return this.violations;
    }
    return this.violations.filter(v => v.severity === severity);
  }

  /**
   * Clear violation log
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Get violation summary
   * @returns {object} {total, byCategory, bySeverity}
   */
  getSummary() {
    const byCategory = {};
    const bySeverity = {info: 0, warn: 0, error: 0, critical: 0};

    for (const v of this.violations) {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      bySeverity[v.severity || 'info']++;
    }

    return {
      total: this.violations.length,
      byCategory,
      bySeverity
    };
  }

  /**
   * Log violations to console with formatting
   * @param {string} minSeverity - Minimum severity to log ('info' | 'warn' | 'error' | 'critical')
   */
  logViolations(minSeverity = 'warn') {
    const severityOrder = {info: 0, warn: 1, error: 2, critical: 3};
    const minOrder = severityOrder[minSeverity] || 1;

    console.group('🔴 Sentinel Partial Contract Violations');

    for (const v of this.violations) {
      if (severityOrder[v.severity || 'info'] >= minOrder) {
        const icon = {info: 'ℹ️', warn: '⚠️', error: '❌', critical: '🔴'}[v.severity || 'info'];
        console.log(
          `${icon} [${v.panel || 'system'}] ${v.violation}: ${v.detail}`
        );
        if (v.recommendation) {
          console.log(`   ➜ ${v.recommendation}`);
        }
      }
    }

    const summary = this.getSummary();
    console.log(
      `\nSummary: ${summary.total} violations (${summary.bySeverity.critical} critical, ${summary.bySeverity.error} errors, ${summary.bySeverity.warn} warnings)`
    );

    console.groupEnd();
  }

  /**
   * Inject visual dev overlay for broken panels
   * @param {HTMLElement} sheetElement - Sheet root element
   */
  injectDevOverlay(sheetElement) {
    if (!CONFIG.SWSE?.sheets?.v2?.strictMode) {
      return; // Only in dev/strict mode
    }

    const errorPanels = {};

    for (const violation of this.violations) {
      if (violation.severity === 'error' || violation.severity === 'critical') {
        if (violation.panel) {
          if (!errorPanels[violation.panel]) {
            errorPanels[violation.panel] = [];
          }
          errorPanels[violation.panel].push(violation.violation);
        }
      }
    }

    // Mark broken panels in UI
    for (const [panelName, issues] of Object.entries(errorPanels)) {
      const panelClass = `.swse-panel--${panelName}`;
      const panelElement = sheetElement.querySelector(panelClass);

      if (panelElement) {
        panelElement.classList.add('swse-contract-broken');
        panelElement.setAttribute('data-violation', issues[0]);

        // Inject small warning banner
        const banner = document.createElement('div');
        banner.className = 'swse-violation-banner';
        banner.innerHTML = `
          <span class="violation-icon">⚠️</span>
          <span class="violation-text">Sentinel: ${panelName} contract violation</span>
        `;
        panelElement.insertBefore(banner, panelElement.firstChild);
      }
    }
  }

  // ===== Private Methods =====

  _logViolation(violation) {
    // Apply default severity
    if (!violation.severity) {
      violation.severity = 'warn';
    }

    this.violations.push({
      timestamp: new Date().toISOString(),
      ...violation
    });

    // Auto-log critical violations immediately
    if (violation.severity === 'critical') {
      console.error(
        `🔴 Sentinel Critical: [${violation.panel || 'system'}] ${violation.violation}`,
        violation
      );
    }
  }

  _validateSubpartialDataSource(data, subpartialConfig) {
    const sourceType = subpartialConfig.dataSource;

    switch (sourceType) {
      case 'row':
        // Expecting row object with standard fields
        return {
          valid: data && typeof data === 'object' && ('id' in data || 'uuid' in data)
        };

      case 'parent-property':
        // Expecting nested property from parent context
        return {
          valid: data && typeof data === 'object'
        };

      case 'nested-context':
        // Expecting a sub-view-model
        return {
          valid: data && typeof data === 'object'
        };

      default:
        return {valid: false};
    }
  }
}

// Export singleton instance
export const sentinelPartialMonitor = new SentinelPartialMonitor();
