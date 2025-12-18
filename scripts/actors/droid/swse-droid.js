// ============================================
// FILE: module/actors/swse-droid.js
// Modernized Droid Actor Sheet (FVTT v13+ compatible)
// ============================================

import { SWSECharacterSheet } from '../character/swse-character-sheet.js';
import { SWSELogger } from '../../utils/logger.js';

export class SWSEDroidSheet extends SWSECharacterSheet {

  // --------------------------------------------
  // Default Options (v13+ safe)
  // --------------------------------------------
  static get defaultOptions() {
    const options = super.defaultOptions;

    return foundry.utils.mergeObject(options, {
      classes: ["swse", "sheet", "actor", "droid", "swse-app"],
      template: "systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs",
      width: 800,
      height: 720,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'main'
      }],
      // Ensures proper scroll behavior in modern Foundry
      scrollY: [".sheet-body"]
    });
  }

  // --------------------------------------------
  // Data Preparation
  // --------------------------------------------
  async getData(options = {}) {
    const context = await super.getData(options);

    // Use modern flag scope "foundryvtt-swse"
    context.viewMode = this.actor.getFlag("foundryvtt-swse", "viewMode") || "operational";

    // Add any droid-specific computed values here
    context.system.isDroid = true;

    return context;
  }

  // --------------------------------------------
  // Activate UI Listeners (v13+ safe)
  // --------------------------------------------
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Toggle between Operational Mode ↔ Blueprint Mode
    html.find("[data-toggle-mode]").on("click", async (event) => {
      event.preventDefault();

      const flagScope = "foundryvtt-swse";
      const current = this.actor.getFlag(flagScope, "viewMode") || "operational";
      const next = current === "operational" ? "blueprint" : "operational";

      await this.actor.setFlag(flagScope, "viewMode", next);

      // Re-render but don't close and reopen the sheet
      this.render(false);
    });

    SWSELogger.log("SWSE | Droid sheet listeners activated");
  }

  // --------------------------------------------
  // Safe no-op method stubs (prevent parent errors)
  // --------------------------------------------
  /** If parent sheet expects hooks like updateSummary() */
  updateSummary() { /* no-op */ }

  /** If parent calls special rendering steps */
  prepareItems() { /* no-op */ }
}
