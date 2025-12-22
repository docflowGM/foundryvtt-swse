// FILE: module/actors/swse-droid.js
// Droid Actor Sheet
// FVTT v13+ / v15 compatible

import { SWSECharacterSheet } from "../character/swse-character-sheet.js";
import { SWSELogger } from "../../utils/logger.js";

export class SWSEDroidSheet extends SWSECharacterSheet {

  // --------------------------------------------
  // Default Options
  // --------------------------------------------
  static get defaultOptions() {
    const options = super.defaultOptions;

    return foundry.utils.mergeObject(options, {
      classes: ["swse", "sheet", "actor", "droid", "swse-app"],
      template: "systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs",
      width: 820,
      height: 760,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "main"
      }],
      scrollY: [".sheet-body"]
    });
  }

  // --------------------------------------------
  // Data Preparation
  // --------------------------------------------
  async getData(options = {}) {
    const context = await super.getData(options);

    const system = context.system;

    // --------------------------------------------
    // View Mode (Operational / Blueprint)
    // --------------------------------------------
    context.viewMode =
      this.actor.getFlag("foundryvtt-swse", "viewMode") || "operational";

    // --------------------------------------------
    // Droid Identity
    // --------------------------------------------
    system.isDroid = true;

    // --------------------------------------------
    // Droid-Specific Read-Only Context
    // --------------------------------------------
    context.droid = {
      // Built-in armor
      armor: this._prepareDroidArmor(system),

      // Worn humanoid armor (if any)
      wornArmor: this._prepareWornArmor(context.items),

      // Locomotion systems
      locomotion: system.locomotion ?? [],

      // Processor & inhibitors
      processor: system.processor ?? {},

      // Appendages
      appendages: system.appendages ?? [],

      // Shields
      shields: system.shields ?? {},

      // Hardened systems
      hardenedSystems: system.hardenedSystems ?? {},

      // Flags for UI warnings
      warnings: this._prepareDroidWarnings(system, context.items)
    };

    return context;
  }

  // --------------------------------------------
  // UI Listeners
  // --------------------------------------------
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Toggle Operational ↔ Blueprint
    html.find("[data-toggle-mode]").on("click", async (event) => {
      event.preventDefault();

      const scope = "foundryvtt-swse";
      const current =
        this.actor.getFlag(scope, "viewMode") || "operational";
      const next = current === "operational" ? "blueprint" : "operational";

      await this.actor.setFlag(scope, "viewMode", next);
      this.render(false);
    });

    SWSELogger.log("SWSE | Droid sheet listeners activated");
  }

  // =========================================================================
  // PREPARATION HELPERS (READ-ONLY)
  // =========================================================================

  _prepareDroidArmor(system) {
    const armor = system.droidArmor ?? {};

    return {
      installed: armor.installed ?? false,
      name: armor.name ?? null,
      category: armor.category ?? null,
      armorBonus: armor.armorBonus ?? 0,
      maxDex: armor.maxDex ?? null,
      armorCheckPenalty: armor.armorCheckPenalty ?? 0
    };
  }

  _prepareWornArmor(items) {
    const worn = items.find(
      i => i.type === "armor" && i.system?.equipped === true
    );

    if (!worn) return null;

    return {
      name: worn.name,
      armorBonus: worn.system?.armorBonus ?? 0,
      maxDex: worn.system?.maxDex ?? null,
      armorCheckPenalty: worn.system?.armorCheckPenalty ?? 0
    };
  }

  _prepareDroidWarnings(system, items) {
    const warnings = [];

    // Built-in vs worn armor
    const hasBuiltIn = system.droidArmor?.installed === true;
    const hasWornArmor = items.some(
      i => i.type === "armor" && i.system?.equipped === true
    );

    if (hasBuiltIn && hasWornArmor) {
      warnings.push({
        type: "armor",
        message:
          "Built-in droid armor does not stack with worn armor. Only the better armor bonus applies."
      });
    }

    // Multiple locomotion systems
    if ((system.locomotion?.length ?? 0) > 1) {
      warnings.push({
        type: "locomotion",
        message:
          "Multiple locomotion systems installed. Only one may be active at a time."
      });
    }

    // Behavioral inhibitors disabled
    if (system.processor?.behavioralInhibitors === false) {
      warnings.push({
        type: "inhibitors",
        message:
          "Behavioral inhibitors are disabled. Droid may act outside standard ethical constraints."
      });
    }

    return warnings;
  }

  // --------------------------------------------
  // Safe no-op stubs (parent compatibility)
  // --------------------------------------------
  updateSummary() {}
  prepareItems() {}
}