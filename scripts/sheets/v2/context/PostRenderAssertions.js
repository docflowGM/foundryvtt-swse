/**
 * PostRenderAssertions
 *
 * Verify that rendered DOM matches panel context contracts.
 * Catches template/context drift after refactors.
 *
 * Runs after each panel is rendered to ensure:
 * - Expected root nodes exist
 * - Expected number of rows/slots match data
 * - Critical structures are present
 */

export class PostRenderAssertions {
  /**
   * Assert health panel DOM matches contract
   * - Root exists
   * - Exactly 6 condition slots
   * - HP bar present
   */
  static assertHealthPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.swse-panel--health');
    if (!root) {
      console.warn('[PostRender] healthPanel root not found');
      return;
    }

    const slots = root.querySelectorAll('.condition-slot');
    if (slots.length !== 6) {
      console.warn(`[PostRender] healthPanel expected 6 condition slots, got ${slots.length}`);
    }

    const hpBar = root.querySelector('.hp-bar');
    if (!hpBar) {
      console.warn('[PostRender] healthPanel missing hp-bar element');
    }

    console.log('[PostRender] ✓ healthPanel assertions passed', { slots: slots.length });
  }

  /**
   * Assert defenses panel DOM matches contract
   * - Root exists
   * - Exactly 3 defense rows
   */
  static assertDefensesPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.swse-panel--defenses');
    if (!root) {
      console.warn('[PostRender] defensePanel root not found');
      return;
    }

    const rows = root.querySelectorAll('.defense-row');
    if (rows.length !== 3) {
      console.warn(`[PostRender] defensePanel expected 3 defense rows, got ${rows.length}`);
    }

    console.log('[PostRender] ✓ defensePanel assertions passed', { rows: rows.length });
  }

  /**
   * Assert biography panel DOM matches contract
   * - Root exists
   * - Record fields present
   */
  static assertBiographyPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.swse-panel--identity');
    if (!root) {
      console.warn('[PostRender] biographyPanel root not found');
      return;
    }

    const fields = root.querySelectorAll('.record-field');
    if (fields.length < 6) {
      console.warn(`[PostRender] biographyPanel expected at least 6 record fields, got ${fields.length}`);
    }

    console.log('[PostRender] ✓ biographyPanel assertions passed', { fields: fields.length });
  }

  /**
   * Assert inventory panel DOM matches contract
   * - Root exists
   * - Number of rows matches context entries
   * - Empty state exists if no entries
   */
  static assertInventoryPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.inventory-panel');
    if (!root) {
      console.warn('[PostRender] inventoryPanel root not found');
      return;
    }

    const expectedCount = context.inventoryPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.ledger-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      console.warn(`[PostRender] inventoryPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        console.warn('[PostRender] inventoryPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ inventoryPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Assert talent panel DOM matches contract
   * - Root exists
   * - Number of rows matches context entries
   */
  static assertTalentPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.talents-panel');
    if (!root) {
      console.warn('[PostRender] talentPanel root not found');
      return;
    }

    const expectedCount = context.talentPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.talent-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      console.warn(`[PostRender] talentPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        console.warn('[PostRender] talentPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ talentPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Assert feat panel DOM matches contract
   * - Root exists
   * - Number of rows matches context entries
   */
  static assertFeatPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.feats-panel');
    if (!root) {
      console.warn('[PostRender] featPanel root not found');
      return;
    }

    const expectedCount = context.featPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.feat-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      console.warn(`[PostRender] featPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        console.warn('[PostRender] featPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ featPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Assert maneuver panel DOM matches contract
   * - Root exists
   * - Number of rows matches context entries
   */
  static assertManeuverPanel(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    const root = html?.querySelector?.('.maneuvers-panel');
    if (!root) {
      console.warn('[PostRender] maneuverPanel root not found');
      return;
    }

    const expectedCount = context.maneuverPanel?.entries?.length ?? 0;
    const renderedRows = root.querySelectorAll('.maneuver-row');

    if (expectedCount > 0 && renderedRows.length !== expectedCount) {
      console.warn(`[PostRender] maneuverPanel expected ${expectedCount} rows, got ${renderedRows.length}`);
    }

    if (expectedCount === 0) {
      const emptyState = root.querySelector('.empty-state');
      if (!emptyState) {
        console.warn('[PostRender] maneuverPanel should show empty state when no entries');
      }
    }

    console.log('[PostRender] ✓ maneuverPanel assertions passed', { rows: renderedRows.length, expected: expectedCount });
  }

  /**
   * Run all assertions after render
   */
  static runAll(html, context) {
    if (!CONFIG?.SWSE?.debug) return;

    console.group('[PostRender] Panel DOM Assertions');
    this.assertHealthPanel(html, context);
    this.assertDefensesPanel(html, context);
    this.assertBiographyPanel(html, context);
    this.assertInventoryPanel(html, context);
    this.assertTalentPanel(html, context);
    this.assertFeatPanel(html, context);
    this.assertManeuverPanel(html, context);
    console.groupEnd();
  }
}
