// ============================================
// FILE: scripts/actors/droid/swse-droid.js
// Droid Actor Sheet
// ============================================
//
// Responsibilities:
// - Present droid structural (blueprint) data
// - Present installed Item-based systems
// - Surface warnings & conflicts (non-enforcing)
// - Toggle Operational / Blueprint modes
//
// This file does NOT:
// - Apply rules math
// - Mutate actor state
// - Resolve armor, speed, ACP, or shields
// ============================================

import { SWSECharacterSheet } from "../character/swse-character-sheet.js";
import { SWSELogger } from "../../utils/logger.js";
import { DROID_SYSTEMS } from "../../data/droid-systems.js";

export class SWSEDroidSheet extends SWSECharacterSheet {

  /**
   * Prevent non-droid actors from using this sheet
   */
  static canUserUseSheet(user, sheet, actor) {
    // Only droids should use this sheet
    if (actor?.type && actor.type !== "droid") {
      return false;
    }
    return super.canUserUseSheet(user, sheet, actor);
  }

  // ---------------------------------------------------------------------
  // Default Options
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Data Preparation
  // ---------------------------------------------------------------------
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = context.system;

    // ---------------------------------------------------------------
    // View Mode (Operational / Blueprint)
    // ---------------------------------------------------------------
    context.viewMode =
      this.actor.getFlag("foundryvtt-swse", "viewMode") || "operational";

    // ---------------------------------------------------------------
    // Droid Identity
    // ---------------------------------------------------------------
    system.isDroid = true;

    // ---------------------------------------------------------------
    // Blueprint Catalogs (STATIC DATA)
    // ---------------------------------------------------------------
    context.droidBlueprint = {
      locomotion: DROID_SYSTEMS.locomotion,
      processors: DROID_SYSTEMS.processors,
      appendages: DROID_SYSTEMS.appendages
    };

    // ---------------------------------------------------------------
    // Actor Structural State (MUTATED BY HANDLER)
    // ---------------------------------------------------------------
    context.droidStructure = {
      locomotion: system.locomotion ?? [],
      activeLocomotion: system.activeLocomotion ?? null,
      processor: system.processor ?? null,
      appendages: system.appendages ?? []
    };

    // ---------------------------------------------------------------
    // Installed Equipment (ITEMS)
    // ---------------------------------------------------------------
    context.droidEquipment = this._prepareDroidEquipment(context.items);

    // ---------------------------------------------------------------
    // Non-Enforcing Warnings / UX Hints
    // ---------------------------------------------------------------
    context.droidWarnings = this._prepareDroidWarnings(system, context.items);

    // ---------------------------------------------------------------
    // Droid Skills: Replace CON-based skills with STR
    // ---------------------------------------------------------------
    if (system.skills) {
      // For droids, endurance uses STR instead of CON
      if (system.skills.endurance) {
        system.skills.endurance.selectedAbility = 'str';
      }
    }

    return context;
  }

  // ---------------------------------------------------------------------
  // Activate UI Listeners
  // ---------------------------------------------------------------------
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Toggle Blueprint ↔ Operational Mode
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

  // =====================================================================
  // PREPARATION HELPERS (READ-ONLY)
  // =====================================================================

  _prepareDroidEquipment(items) {
    return {
      droidArmor: items.filter(i => i.type === "droidArmor"),
      shields: items.filter(i => i.type === "shieldGenerator"),
      systems: items.filter(i => i.type === "droidSystem"),
      weapons: items.filter(i => i.type === "weapon")
    };
  }

  _prepareDroidWarnings(system, items) {
    const warnings = [];

    // ------------------------------------------------------------
    // Missing locomotion
    // ------------------------------------------------------------
    if (!system.locomotion || system.locomotion.length === 0) {
      warnings.push({
        type: "locomotion",
        message: "Droid has no locomotion system installed."
      });
    }

    // ------------------------------------------------------------
    // Multiple locomotion systems, no active selection
    // ------------------------------------------------------------
    if (
      (system.locomotion?.length ?? 0) > 1 &&
      !system.activeLocomotion
    ) {
      warnings.push({
        type: "locomotion",
        message:
          "Multiple locomotion systems installed, but none is marked active."
      });
    }

    // ------------------------------------------------------------
    // Built-in droid armor vs worn armor
    // ------------------------------------------------------------
    const hasBuiltIn = system.droidArmor?.installed === true;
    const hasWorn = items.some(
      i => i.type === "armor" && i.system?.equipped === true
    );

    if (hasBuiltIn && hasWorn) {
      warnings.push({
        type: "armor",
        message:
          "Built-in droid armor does not stack with worn armor. Only the better armor bonus applies."
      });
    }

    // ------------------------------------------------------------
    // Missing processor
    // ------------------------------------------------------------
    if (!system.processor) {
      warnings.push({
        type: "processor",
        message: "Droid has no processor defined."
      });
    }

    // ------------------------------------------------------------
    // Behavioral inhibitors disabled
    // ------------------------------------------------------------
    if (system.processor?.behavioralInhibitors === false) {
      warnings.push({
        type: "inhibitors",
        message:
          "Behavioral inhibitors are disabled. Droid may act outside standard ethical constraints."
      });
    }

    return warnings;
  }

  // ---------------------------------------------------------------------
  // Safe no-op stubs (parent compatibility)
  // ---------------------------------------------------------------------
  updateSummary() {}
  prepareItems() {}
}