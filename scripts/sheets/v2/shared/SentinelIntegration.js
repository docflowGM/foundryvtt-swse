/**
 * SENTINEL INTEGRATION HOOKS
 *
 * Helper functions to integrate Sentinel monitoring into sheet lifecycle.
 * Hooks into _prepareContext and _onRender to enforce contracts automatically.
 */

import { sentinelPartialMonitor } from './SentinelPartialMonitor.js';

class SentinelIntegration {
  /**
   * Monitor panel context during _prepareContext phase
   * Call this after building a panel context, before assigning to context.panels
   *
   * @param {string} sheetType - 'character' | 'npc' | 'droid'
   * @param {string} panelName - Panel name
   * @param {object} panelContext - Panel context to validate
   * @param {Actor} actor - Parent actor
   * @param {boolean} throwOnError - If true, throw error in strict mode
   * @returns {boolean} True if valid, false if violations
   *
   * @example
   * const healthPanel = buildHealthPanel(actor);
   * if (!SentinelIntegration.validatePanelBeforeRender('character', 'healthPanel', healthPanel, actor)) {
   *   if (CONFIG.SWSE.sheets.v2.strictMode) {
   *     throw new Error('Health panel contract violation');
   *   }
   * }
   * context.panels.healthPanel = healthPanel;
   */
  static validatePanelBeforeRender(sheetType, panelName, panelContext, actor, throwOnError = true) {
    const result = sentinelPartialMonitor.monitorPanelContext(sheetType, panelName, panelContext, actor);

    if (!result.valid && throwOnError && CONFIG.SWSE?.sheets?.v2?.strictMode) {
      throw new Error(
        `Sentinel: ${panelName} contract violation\n${result.violations.join('\n')}`
      );
    }

    return result.valid;
  }

  /**
   * Monitor row collection during _prepareContext phase
   * Call this after transforming rows for a ledger panel
   *
   * @param {array} rows - Array of row objects
   * @param {string} panelName - Panel name
   * @param {string} sheetType - Sheet type
   * @param {boolean} throwOnError - If true, throw in strict mode
   * @returns {boolean} True if all rows valid
   *
   * @example
   * const entries = actor.items.map(item => transformInventoryItemRow(item, actor));
   * if (!SentinelIntegration.validateRowsBeforeRender(entries, 'inventoryPanel', 'character')) {
   *   console.warn('Some rows have contract violations');
   * }
   */
  static validateRowsBeforeRender(rows, panelName, sheetType, throwOnError = true) {
    const result = sentinelPartialMonitor.monitorRowCollection(rows, panelName, sheetType);

    if (!result.valid && throwOnError && CONFIG.SWSE?.sheets?.v2?.strictMode) {
      const details = result.invalidRows.map(r => `Row ${r.index}: ${r.errors[0]}`).join('\n');
      throw new Error(
        `Sentinel: ${panelName} rows invalid\n${details}`
      );
    }

    return result.valid;
  }

  /**
   * Monitor subpartial data before render
   * Call in template or builder when passing data to subpartial
   *
   * @param {object} data - Data to pass to subpartial
   * @param {string} subpartialName - Subpartial name
   * @param {string} panelName - Panel that owns subpartial
   * @returns {boolean} True if valid
   *
   * @example
   * // In builder:
   * for (const row of entries) {
   *   SentinelIntegration.validateSubpartialDataBeforeRender(row, 'inventory-row-subpartial', 'inventoryPanel');
   * }
   */
  static validateSubpartialDataBeforeRender(data, subpartialName, panelName) {
    const result = sentinelPartialMonitor.monitorSubpartialData(data, subpartialName, panelName);

    if (!result.valid && CONFIG.SWSE?.sheets?.v2?.strictMode) {
      throw new Error(
        `Sentinel: ${subpartialName} data invalid\n${result.violations.join('\n')}`
      );
    }

    return result.valid;
  }

  /**
   * Monitor SVG panel during _prepareContext
   *
   * @param {object} svgPanelContext - SVG panel context
   * @param {string} panelName - Panel name
   * @returns {boolean} True if valid
   *
   * @example
   * const portraitPanel = buildDroidPortraitPanel(actor);
   * SentinelIntegration.validateSvgPanelBeforeRender(portraitPanel, 'portraitPanel');
   */
  static validateSvgPanelBeforeRender(svgPanelContext, panelName) {
    const result = sentinelPartialMonitor.monitorSvgPanelContract(svgPanelContext, panelName);

    if (!result.valid && CONFIG.SWSE?.sheets?.v2?.strictMode) {
      throw new Error(
        `Sentinel: ${panelName} SVG contract violation\n${result.violations.join('\n')}`
      );
    }

    return result.valid;
  }

  /**
   * Monitor rendered panel DOM after _onRender
   * Call in _onRender after template renders and DOM is complete
   *
   * @param {string} sheetType - 'character' | 'npc' | 'droid'
   * @param {string} panelName - Panel name
   * @param {HTMLElement} panelElement - Rendered DOM element
   * @returns {boolean} True if all assertions passed
   *
   * @example
   * // In sheet._onRender():
   * const healthPanel = this.element.querySelector('.swse-panel--health');
   * SentinelIntegration.validatePanelDomAfterRender('character', 'healthPanel', healthPanel);
   */
  static validatePanelDomAfterRender(sheetType, panelName, panelElement) {
    if (!panelElement) {
      console.warn(`Sentinel: Panel element not found for ${panelName}`);
      return false;
    }

    const result = sentinelPartialMonitor.monitorPostRenderAssertions(sheetType, panelName, panelElement);

    if (!result.valid && CONFIG.SWSE?.sheets?.v2?.strictMode) {
      const details = result.failedAssertions.map(a => `${a.selector}: ${a.error}`).join('\n');
      throw new Error(
        `Sentinel: ${panelName} post-render assertions failed\n${details}`
      );
    }

    return result.valid;
  }

  /**
   * Audit registry consistency (can be called during setup or periodically)
   *
   * @returns {boolean} True if no issues found
   *
   * @example
   * // In sheet constructor:
   * const consistencyOk = SentinelIntegration.auditRegistryConsistency();
   * if (!consistencyOk) {
   *   console.warn('Registry inconsistency detected');
   * }
   */
  static auditRegistryConsistency() {
    const issues = sentinelPartialMonitor.auditRegistry();

    if (issues.length > 0) {
      console.warn(`Sentinel: Found ${issues.length} registry consistency issues`);
      if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
        for (const issue of issues) {
          console.error(`  - ${issue.panel}: ${issue.issue}`);
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Get violations and optionally log them
   *
   * @param {boolean} log - If true, log to console
   * @returns {array} Array of violations
   *
   * @example
   * const violations = SentinelIntegration.getViolations(true);
   * if (violations.length > 0) {
   *   // Handle violations
   * }
   */
  static getViolations(log = false) {
    const violations = sentinelPartialMonitor.getViolations();

    if (log && violations.length > 0) {
      sentinelPartialMonitor.logViolations('warn');
    }

    return violations;
  }

  /**
   * Clear violation log
   */
  static clearViolations() {
    sentinelPartialMonitor.clearViolations();
  }

  /**
   * Get violation summary
   * @returns {object} {total, byCategory, bySeverity}
   */
  static getViolationSummary() {
    return sentinelPartialMonitor.getSummary();
  }

  /**
   * Inject visual dev overlay for broken panels in strict mode
   *
   * @param {HTMLElement} sheetElement - Root sheet element
   *
   * @example
   * // In sheet._onRender():
   * SentinelIntegration.injectDevOverlayIfStrict(this.element);
   */
  static injectDevOverlayIfStrict(sheetElement) {
    if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
      sentinelPartialMonitor.injectDevOverlay(sheetElement);
    }
  }

  /**
   * Helper: Wrap a panel builder to automatically monitor its output
   *
   * @param {string} sheetType - Sheet type
   * @param {string} panelName - Panel name
   * @param {function} builderFn - Original builder function
   * @returns {function} Wrapped builder that validates output
   *
   * @example
   * const monitoredBuilder = SentinelIntegration.createMonitoredBuilder(
   *   'character',
   *   'healthPanel',
   *   buildHealthPanel
   * );
   * const context = monitoredBuilder(actor);
   */
  static createMonitoredBuilder(sheetType, panelName, builderFn) {
    return function monitoredBuilder(actor, ...args) {
      const context = builderFn(actor, ...args);

      try {
        SentinelIntegration.validatePanelBeforeRender(sheetType, panelName, context, actor, true);
      } catch (error) {
        if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
          throw error;
        } else {
          console.warn(`Sentinel: ${panelName} validation failed (non-strict mode)`, error.message);
        }
      }

      return context;
    };
  }

  /**
   * Helper: Wrap a row transformer to automatically monitor output
   *
   * @param {string} panelName - Panel that uses these rows
   * @param {string} sheetType - Sheet type
   * @param {function} transformerFn - Original transformer function
   * @returns {function} Wrapped transformer that validates output
   *
   * @example
   * const monitoredTransform = SentinelIntegration.createMonitoredTransformer(
   *   'inventoryPanel',
   *   'character',
   *   transformInventoryItemRow
   * );
   * const row = monitoredTransform(item, actor);
   */
  static createMonitoredTransformer(panelName, sheetType, transformerFn) {
    return function monitoredTransformer(source, ...args) {
      const row = transformerFn(source, ...args);

      // Basic row shape validation
      if (!row.id || !row.name) {
        console.warn(`Sentinel: Row transformer produced invalid row`, {panelName, row});
        if (CONFIG.SWSE?.sheets?.v2?.strictMode) {
          throw new Error(`Sentinel: ${panelName} row missing id or name`);
        }
      }

      return row;
    };
  }
}

export { SentinelIntegration };
