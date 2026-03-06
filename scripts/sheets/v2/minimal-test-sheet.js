const { HandlebarsApplicationMixin } = foundry.applications.api;
import { SentinelTabDiagnostics } from "/systems/foundryvtt-swse/scripts/governance/sentinel/tab-diagnostics.js";

export class SWSEMinimalTestSheet extends
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/minimal-test-sheet.hbs"
    }
  };

  static tabGroups = {
    primary: { initial: "overview" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      actorName: this.actor.name
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

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
