/**
 * sentinel-sheet-hydration.js — Monitor sheet tab/panel content presence
 *
 * Validates that sheets render with expected content:
 * - Tabs have data (rows, cards, lists)
 * - Panels not half-loaded or broken
 * - Empty states properly shown when appropriate
 *
 * Passive monitoring, sampled, rate-limited, non-mutating.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-engine.js";

export class SentinelSheetHydration {
  static CHECKED_INSTANCES = new Set();
  static MAX_INSTANCES_PER_CLASS = 3;

  static init() {
    SentinelEngine.registerLayer("sheet-hydration", {
      enabled: true,
      readOnly: true,
      description: "Sheet/panel content presence monitoring"
    });

    // Hook into renders
    Hooks.on("renderApplicationV2", (app) => this.monitorRender(app));

    console.log("[SWSE Sentinel] Sheet-Hydration layer initialized");
  }

  /**
   * Monitor a sheet render for content presence
   */
  static monitorRender(app) {
    if (!app || !app.element) return;

    const appClass = app.constructor.name;
    const appId = app.appId || app.id;

    // Sample: check first N instances per class
    const instanceKey = `${appClass}`;
    const instanceCount = Array.from(this.CHECKED_INSTANCES)
      .filter(k => k.startsWith(instanceKey))
      .length;

    if (instanceCount >= this.MAX_INSTANCES_PER_CLASS) {
      return; // Already sampled enough of this class
    }

    this.CHECKED_INSTANCES.add(`${instanceKey}-${appId}`);

    // Route to appropriate validator
    if (appClass.includes("Character") || appClass.includes("Actor")) {
      this._validateCharacterSheet(app, appClass);
    } else if (appClass.includes("Store")) {
      this._validateStoreSheet(app, appClass);
    } else if (appClass.includes("Dialog")) {
      this._validateDialog(app, appClass);
    }
  }

  /**
   * Validate character sheet tabs have content
   */
  static _validateCharacterSheet(app, appClass) {
    const element = app.element;
    if (!element) return;

    // Known tabs in SWSE character sheet
    const tabsToCheck = [
      { tabName: "overview", selector: ".health-panel, [data-tab=overview]" },
      { tabName: "skills", selector: "[data-tab=skills] .skill-row, .skills-list" },
      { tabName: "inventory", selector: "[data-tab=inventory] .inventory-row, .item-grid" },
      { tabName: "combat", selector: "[data-tab=combat] .combat-action, .action-card" }
    ];

    for (const { tabName, selector } of tabsToCheck) {
      const hasContent = element.querySelector(selector);

      if (!hasContent) {
        // Check if there's an empty-state message instead
        const emptyState = element.querySelector(
          `[data-tab=${tabName}] .empty-state, [data-tab=${tabName}] .no-items`
        );

        if (!emptyState) {
          SentinelEngine.report({
            aggregationKey: `sentinel-sheet-hydration-${appClass}-${tabName}-empty`,
            severity: "WARN",
            layer: "sheet-hydration",
            title: `Character sheet "${tabName}" tab appears empty (no content or empty-state)`,
            details: {
              appClass,
              tabName,
              hasContent: false,
              hasEmptyState: !!emptyState,
              selector
            },
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Validate store sheet has inventory
   */
  static _validateStoreSheet(app, appClass) {
    const element = app.element;
    if (!element) return;

    const cards = element.querySelectorAll(
      ".store-card, .swse-store-card, [data-item-id]"
    );

    if (cards.length === 0) {
      const hasEmptyState = element.querySelector(
        ".empty-state, .no-items, [role=status]"
      );

      if (!hasEmptyState) {
        SentinelEngine.report({
          aggregationKey: `sentinel-sheet-hydration-${appClass}-no-items`,
          severity: "WARN",
          layer: "sheet-hydration",
          title: `Store sheet appears empty (no cards and no empty-state)`,
          details: {
            appClass,
            cardCount: 0,
            hasEmptyState: !!hasEmptyState
          },
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Validate dialog has required sections
   */
  static _validateDialog(app, appClass) {
    const element = app.element;
    if (!element) return;

    // Common dialog sections to check
    const sections = element.querySelectorAll(
      "section, [role=main], form > fieldset, .dialog-section"
    );

    if (sections.length === 0) {
      SentinelEngine.report({
        aggregationKey: `sentinel-sheet-hydration-${appClass}-no-sections`,
        severity: "INFO",
        layer: "sheet-hydration",
        title: `Dialog "${appClass}" has no recognized sections`,
        details: {
          appClass,
          sectionCount: 0
        },
        timestamp: Date.now(),
        devOnly: true
      });
    }
  }
}

// Auto-init
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    if (game.settings.get?.("foundryvtt-swse", "sentinelSheetHydration") ?? true) {
      SentinelSheetHydration.init();
    }
  });
}
