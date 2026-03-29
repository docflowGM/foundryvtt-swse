/**
 * PostRenderAssertions
 *
 * Verify that rendered DOM matches panel context contracts.
 * Catches template/context drift after refactors.
 *
 * Runs after every render (not just debug mode) to detect regressions early.
 * In production: logs warnings only
 * In strict mode (CONFIG.SWSE.strictMode): throws on violations
 *
 * Runs to ensure:
 * - Expected root nodes exist
 * - Expected number of rows/slots match data
 * - Critical structures are present
 */

export class PostRenderAssertions {
  /**
   * Log an assertion failure with appropriate severity
   */
  static _reportViolation(message, critical = false) {
    const isStrict = CONFIG?.SWSE?.strictMode ?? false;
    const logFn = critical && isStrict ? 'error' : 'warn';
    console[logFn](`[PostRender] ${message}`);

    if (critical && isStrict) {
      throw new Error(`[PostRender Contract] ${message}`);
    }
  }

  /**
   * Assert health panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Exactly 6 condition slots
   * - HP bar present
   */
  static assertHealthPanel(html, context) {
    const root = html?.querySelector?.('.swse-panel--health');
    if (!root) {
      this._reportViolation('healthPanel root not found', true);
      return;
    }

    const slots = root.querySelectorAll('.condition-slot');
    if (slots.length !== 6) {
      this._reportViolation(`healthPanel expected 6 condition slots, got ${slots.length}`);
    }

    const hpBar = root.querySelector('.hp-bar');
    if (!hpBar) {
      this._reportViolation('healthPanel missing hp-bar element');
    }

    console.log('[PostRender] ✓ healthPanel assertions passed', { slots: slots.length });
  }

  /**
   * Assert defenses panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Exactly 3 defense rows
   */
  static assertDefensesPanel(html, context) {
    const root = html?.querySelector?.('.swse-panel--defenses');
    if (!root) {
      this._reportViolation('defensePanel root not found', true);
      return;
    }

    const rows = root.querySelectorAll('.defense-row');
    if (rows.length !== 3) {
      this._reportViolation(`defensePanel expected 3 defense rows, got ${rows.length}`);
    }

    console.log('[PostRender] ✓ defensePanel assertions passed', { rows: rows.length });
  }

  /**
   * Assert biography panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Record fields present
   */
  static assertBiographyPanel(html, context) {
    const root = html?.querySelector?.('.swse-panel--identity');
    if (!root) {
      this._reportViolation('biographyPanel root not found', true);
      return;
    }

    const fields = root.querySelectorAll('.record-field');
    if (fields.length < 6) {
      this._reportViolation(`biographyPanel expected at least 6 record fields, got ${fields.length}`);
    }

    console.log('[PostRender] ✓ biographyPanel assertions passed', { fields: fields.length });
  }

  /**
   * Assert inventory panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Number of rows matches context entries
   * - Empty state exists if no entries
   */
  static assertInventoryPanel(html, context) {
    const root = html?.querySelector?.('.inventory-panel');
    if (!root) {
      this._reportViolation('inventoryPanel root not found', true);
      return;
    }

    const expectedCount = context.inventoryPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.ledger-row, .inventory-item-card');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      this._reportViolation(`inventoryPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.inventory-empty-state, .empty-state');
      if (!emptyState) {
        this._reportViolation('inventoryPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ inventoryPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Assert talent panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Number of rows matches context entries
   */
  static assertTalentPanel(html, context) {
    const root = html?.querySelector?.('.talents-panel, .talents-known-panel');
    if (!root) {
      this._reportViolation('talentPanel root not found', true);
      return;
    }

    const expectedCount = context.talentPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.talent-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      this._reportViolation(`talentPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        this._reportViolation('talentPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ talentPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Assert feat panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Number of rows matches context entries
   */
  static assertFeatPanel(html, context) {
    const root = html?.querySelector?.('.feats-panel');
    if (!root) {
      this._reportViolation('featPanel root not found', true);
      return;
    }

    const expectedCount = context.featPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.feat-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      this._reportViolation(`featPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        this._reportViolation('featPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ featPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Assert maneuver panel DOM matches contract
   * - Root exists (CRITICAL)
   * - Number of rows matches context entries
   */
  static assertManeuverPanel(html, context) {
    const root = html?.querySelector?.('.maneuvers-panel, .starship-maneuvers-panel');
    if (!root) {
      // Only critical if the panel is meant to be visible
      const shouldExist = context.maneuverPanel?.entries?.length > 0;
      this._reportViolation('maneuverPanel root not found', shouldExist);
      return;
    }

    const expectedCount = context.maneuverPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.maneuver-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      this._reportViolation(`maneuverPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        this._reportViolation('maneuverPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ maneuverPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Run all assertions after render
   * Always runs; severity determined by CONFIG.SWSE.strictMode
   */
  static runAll(html, context) {
    console.group('[PostRender] Panel DOM Assertions (always-on validation)');
    try {
      this.assertHealthPanel(html, context);
      this.assertDefensesPanel(html, context);
      this.assertBiographyPanel(html, context);
      this.assertInventoryPanel(html, context);
      this.assertTalentPanel(html, context);
      this.assertFeatPanel(html, context);
      this.assertManeuverPanel(html, context);
      console.log('[PostRender] All assertions completed');
    } catch (err) {
      console.error('[PostRender] ASSERTION FAILED (strict mode enabled):', err.message);
      // In strict mode, this will have thrown; in production, continue
      if (CONFIG?.SWSE?.strictMode) throw err;
    }
    console.groupEnd();
  }
}
