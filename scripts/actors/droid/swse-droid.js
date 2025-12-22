// ============================================
// FILE: module/actors/swse-droid.js
// Droid Actor Sheet (Blueprint + Operational)
// ============================================

import { SWSECharacterSheet } from "../character/swse-character-sheet.js";
import { SWSELogger } from "../../utils/logger.js";
import { DROID_SYSTEMS } from "../../scripts/data/droid-systems.js";

export class SWSEDroidSheet extends SWSECharacterSheet {

  // -----------------------------------------------------------------------
  // Default Options
  // -----------------------------------------------------------------------
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "droid", "swse-app"],
      template: "systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs",
      width: 840,
      height: 780,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "main"
      }],
      scrollY: [".sheet-body"]
    });
  }

  // -----------------------------------------------------------------------
  // Data Preparation
  // -----------------------------------------------------------------------
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = context.system;

    // ---------------------------------------------------------------------
    // View Mode
    // ---------------------------------------------------------------------
    context.viewMode =
      this.actor.getFlag("foundryvtt-swse", "viewMode") || "operational";

    // ---------------------------------------------------------------------
    // Droid Identity
    // ---------------------------------------------------------------------
    system.isDroid = true;

    // ---------------------------------------------------------------------
    // Structural (Blueprint-Level) Context
    // ---------------------------------------------------------------------
    context.droidBlueprint = {
      locomotionCatalog: DROID_SYSTEMS.locomotion,
      processorCatalog: DROID_SYSTEMS.processors,
      appendageCatalog: DROID_SYSTEMS.appendages
    };

    // ---------------------------------------------------------------------
    // Actor Structural State
    // ---------------------------------------------------------------------
    context.droidStructure = {
      locomotion: system.locomotion ?? [],
      activeLocomotion: system.activeLocomotion ?? null,
      processor: system.processor ?? null,
      appendages: system.appendages ?? []
    };

    // ---------------------------------------------------------------------
    // Equipment (Items)
    // ---------------------------------------------------------------------
    context.droidEquipment = this._prepareDroidEquipment(context.items);

    // ---------------------------------------------------------------------
    // Warnings / UX Hints (NON-ENFORCING)
    // ---------------------------------------------------------------------
    context.droidWarnings = this._prepareDroidWarnings(system, context.items);

    return context;
  }

  // -----------------------------------------------------------------------
  // Activate Listeners
  // -----------------------------------------------------------------------
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Toggle Blueprint ↔ Operational
    html.find("[data-toggle-mode]").on("click", async (event) => {
      event.preventDefault();

      const scope = "foundryvtt-swse";
      const current =
        this.actor.getFlag(scope, "viewMode") || "operational";

      await this.actor.setFlag(
        scope,
        "viewMode",
        current === "operational" ? "blueprint" : "operational"
      );

      this.render(false);
    });

    SWSELogger.log("SWSE | Droid sheet listeners activated");
  }

  // =======================================================================
  // PREPARATION HELPERS (READ-ONLY)
  // =======================================================================

  _prepareDroidEquipment(items) {
    return {
      armor: items.filter(i => i.type === "droidArmor"),
      shields: items.filter(i => i.type === "shieldGenerator"),
      systems: items.filter(i => i.type === "droidSystem"),
      weapons: items.filter(i => i.type === "weapon")
    };
  }

  _prepareDroidWarnings(system, items) {
    const warnings = [];

    // --------------------------------------------------
    // No locomotion
    // --------------------------------------------------
    if (!system.locomotion || system.locomotion.length === 0) {
      warnings.push({
        type: "locomotion",
        message: "Droid has no locomotion system installed."
      });
    }

    // --------------------------------------------------
    // Multiple locomotion, none active
    // --------------------------------------------------
    if (
      (system.locomotion?.length ?? 0) > 1 &&
      !system.activeLocomotion
    ) {
      warnings.push({
        type: "locomotion",
        message: "Multiple locomotion systems installed; no active system selected."
      });
    }

    // --------------------------------------------------
    // Built-in armor vs worn armor
    // --------------------------------------------------
    const hasBuiltIn = system.droidArmor?.installed === true;
    const hasWorn = items.some(
      i => i.type === "armor" && i.system?.equipped
    );

    if (hasBuiltIn && hasWorn) {
      warnings.push({
        type: "armor",
        message:
          "Built-in droid armor does not stack with worn armor. Only the better armor bonus applies."
      });
    }

    // --------------------------------------------------
    // Missing processor
    // --------------------------------------------------
    if (!system.processor) {
      warnings.push({
        type: "processor",
        message: "Droid has no processor defined."
      });
    }

    // --------------------------------------------------
    // Behavioral inhibitors disabled
    // --------------------------------------------------
    if (system.processor?.behavioralInhibitors === false) {
      warnings.push({
        type: "inhibitors",
        message:
          "Behavioral inhibitors are disabled. Droid may act outside ethical constraints."
      });
    }

    return warnings;
  }

  // -----------------------------------------------------------------------
  // Safe No-Op Stubs (Parent Compatibility)
  // -----------------------------------------------------------------------
  updateSummary() {}
  prepareItems() {}
}