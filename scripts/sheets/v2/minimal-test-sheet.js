const { HandlebarsApplicationMixin } = foundry.applications.api;
import { SentinelTabDiagnostics } from "/systems/foundryvtt-swse/scripts/governance/sentinel/tab-diagnostics.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";

export class SWSEMinimalTestSheet extends
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/minimal-test-sheet.hbs"
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["swse", "sheet", "actor", "character", "minimal-test", "v2"],
    width: 600,
    height: 500,
    tabs: [
      {
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-content",
        initial: "overview"
      }
    ]
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      actorName: this.actor.name
    };
  }

  async _onRender(context, options) {
    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // Use dynamic dimensions instead of hardcoding 600x500
    const isFirstRenderEver = !this.rendered;
    if (isFirstRenderEver) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;
    if (shouldCenter) {
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;
    }

    await super._onRender(context, options);

    // Ensure tabs are activated
    const tabNav = this.element?.querySelector('[data-group="primary"]');
    if (tabNav) {
      const firstTab = tabNav.querySelector('a.item');
      if (firstTab) {
        firstTab.classList.add('active');
        const tabName = firstTab.getAttribute('data-tab');
        const tabPanel = this.element.querySelector(`.tab[data-group="primary"][data-tab="${tabName}"]`);
        if (tabPanel) {
          tabPanel.classList.add('active');
        }
      }
    }

    // Run tab diagnostics on the minimal test sheet
    if (this.element instanceof HTMLElement) {
      console.log('📋 Running SentinelTabDiagnostics on minimal test sheet...');
      SentinelTabDiagnostics.diagnose(this.element);

      // Also test if tabs are health
      const isHealthy = SentinelTabDiagnostics.isHealthy(this.element);
      console.log(`✅ Tab system health: ${isHealthy ? 'HEALTHY' : 'BROKEN'}`);
    }
  }
}
