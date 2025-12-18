import { SWSECharacterSheet } from '../character/swse-character-sheet.js';
import { SWSELogger } from '../../utils/logger.js';

// ============================================
// FILE: module/actors/swse-droid.js
// Droid actor sheet
// ============================================

export class SWSEDroidSheet extends SWSECharacterSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "droid", "swse-app"],
      template: "systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs",
      width: 800,
      height: 720,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'main'
      }]
    });
  }

  getData() {
    const context = super.getData();
    // Add droid-specific data here
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Only add listeners if not read-only
    if (!this.options.editable) return;

    // Droid Mode Toggle (Operational <-> Blueprint)
    html.find("[data-toggle-mode]").click(async (ev) => {
      ev.preventDefault();
      const actor = this.actor;
      const current = actor.getFlag("swse", "viewMode") || "operational";
      const next = current === "operational" ? "blueprint" : "operational";

      await actor.setFlag("swse", "viewMode", next);
      this.render(false);
    });

    SWSELogger.log("SWSE | Droid sheet listeners activated");
  }

  // ============================================
  // INHERITED METHOD STUBS
  // These prevent errors when parent tries to call them
  // ============================================

}
