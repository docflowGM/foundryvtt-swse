/**
 * LIGHTSABER CONSTRUCTION APPLICATION
 *
 * Cinematic builder UI with:
 * - Holographic energy rod color selector
 * - Live blade beam preview
 * - Color-reactive panels
 * - Construction mechanics integration
 *
 * Pure UI layer. All mutations routed to LightsaberConstructionEngine.
 *
 * Extends ModificationModalShell for unified layout and lifecycle management
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";
import { BLADE_COLOR_MAP, VARIES_COLOR_LIST, DEFAULT_BLADE_COLOR } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { MirajAttunementApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/miraj-attunement-app.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class LightsaberConstructionApp extends ModificationModalShell {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedBladeColor = DEFAULT_BLADE_COLOR;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "swse-lightsaber-construction",
    classes: ["swse", "lightsaber-construction", "swse-theme-holo"],
    window: {
      icon: "fas fa-lightsaber",
      title: "Lightsaber Construction",
      resizable: true
    },
    position: { width: 900, height: 700 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/applications/lightsaber/lightsaber-construction.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get available options from engine
    const constructionOptions = LightsaberConstructionEngine.getConstructionOptions(this.actor);

    // Determine color options based on selected crystal
    let colorOptions = [];
    if (this.selectedCrystal) {
      const colorOpts = this.selectedCrystal.system?.lightsaber?.colorOptions;
      if (colorOpts === "varies") {
        colorOptions = VARIES_COLOR_LIST;
      } else if (Array.isArray(colorOpts)) {
        colorOptions = colorOpts;
      }
    }

    return {
      ...context,
      actor: this.actor,
      chassis: constructionOptions.chassis,
      crystals: constructionOptions.crystals,
      accessories: constructionOptions.accessories,
      selectedChassis: this.selectedChassis,
      selectedCrystal: this.selectedCrystal,
      selectedAccessories: this.selectedAccessories || [],
      selectedBladeColor: this.selectedBladeColor,
      colorOptions,
      colorMap: BLADE_COLOR_MAP,
      bladeColorHex: BLADE_COLOR_MAP[this.selectedBladeColor] || "#00ffff"
    };
  }

  attachEventListeners(root) {
    // Set CSS variable for live blade glow
    root.style.setProperty(
      "--selected-blade-color",
      BLADE_COLOR_MAP[this.selectedBladeColor] || "#00ffff"
    );

    // Chassis selection
    root.querySelectorAll("[data-chassis-id]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const id = el.dataset.chassisId;
        const chassis = this.actor.items.get(id);
        this.selectedChassis = chassis;
        this.selectedBladeColor = DEFAULT_BLADE_COLOR;
        this.render();
      });
    });

    // Crystal selection
    root.querySelectorAll("[data-crystal-id]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const id = el.dataset.crystalId;
        const crystal = this.actor.items.get(id);
        this.selectedCrystal = crystal;
        this.render();

        // Trigger resonance pulse
        const bladeEl = root.querySelector(".ls-live-blade");
        if (bladeEl) {
          bladeEl.classList.add("resonating");
          setTimeout(() => bladeEl.classList.remove("resonating"), 600);
        }
      });
    });

    // Accessory selection (multi-select)
    root.querySelectorAll("[data-accessory-id]").forEach(el => {
      const id = el.dataset.accessoryId;
      const isSelected = this.selectedAccessories?.includes(id);
      if (isSelected) {
        el.classList.add("selected");
      }

      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (!this.selectedAccessories) this.selectedAccessories = [];

        if (this.selectedAccessories.includes(id)) {
          this.selectedAccessories = this.selectedAccessories.filter(aid => aid !== id);
        } else {
          this.selectedAccessories.push(id);
        }
        el.classList.toggle("selected");
      });
    });

    // Blade color selection (energy rods)
    root.querySelectorAll(".ls-color-cell").forEach(el => {
      const color = el.dataset.color;
      const isSelected = color === this.selectedBladeColor;

      if (isSelected) {
        el.classList.add("selected");
      }

      el.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove previous selection
        root.querySelectorAll(".ls-color-cell").forEach(c => c.classList.remove("selected"));

        // Set new selection
        el.classList.add("selected");
        this.selectedBladeColor = color;

        // Update live beam color
        root.style.setProperty(
          "--selected-blade-color",
          BLADE_COLOR_MAP[color]
        );
      });
    });

    // Build button
    const buildBtn = root.querySelector(".ls-build-button");
    buildBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#attemptBuild();
    });
  }

  async #attemptBuild() {
    if (!this.selectedChassis || !this.selectedCrystal) {
      ui.notifications.warn("Select a chassis and crystal to construct.");
      return;
    }

    try {
      // Step 1: Execute construction (pure engine call)
      const result = await LightsaberConstructionEngine.attemptConstruction(this.actor, {
        chassisItemId: this.selectedChassis.id,
        crystalItemId: this.selectedCrystal.id,
        accessoryItemIds: this.selectedAccessories || [],
        bladeColor: this.selectedBladeColor
      });

      if (!result.success) {
        ui.notifications.error(`Construction failed: ${result.reason}`);
        return;
      }

      // Step 2: Construction succeeded — fetch created weapon
      const createdWeapon = this.actor.items.get(result.itemId);
      if (!createdWeapon) {
        throw new Error("Created weapon not found in actor items");
      }

      // Step 3: Orchestrate Miraj attunement flow
      // Check if actor has Force Points and weapon was built by them
      const hasForcePoints = (this.actor.system?.resources?.forcePoints?.value ?? 0) >= 1;
      const isBuiltByActor = createdWeapon.flags?.swse?.builtBy === this.actor.id;
      const notYetAttuned = !createdWeapon.flags?.swse?.attunedBy;

      if (hasForcePoints && isBuiltByActor && notYetAttuned) {
        // Set CSS variable for Miraj glow to match blade color
        document.documentElement.style.setProperty(
          "--selected-blade-color",
          BLADE_COLOR_MAP[this.selectedBladeColor] || "#00ffff"
        );

        // Display Miraj attunement ritual (UI orchestration only)
        new MirajAttunementApp(this.actor, createdWeapon).render(true);

        // Close construction app after Miraj opens
        this.close();
      } else {
        // No Force Points or already attuned — just close and notify
        ui.notifications.info(
          `✨ Lightsaber constructed! DC: ${result.finalDc}, Roll: ${result.rollTotal}`
        );
        this.close();
      }
    } catch (err) {
      SWSELogger.error("Construction failed:", err);
      ui.notifications.error("Unexpected error during construction.");
    }
  }

}
