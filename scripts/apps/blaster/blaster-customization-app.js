/**
 * BLASTER CUSTOMIZATION APPLICATION
 *
 * Tactical weapon modification UI with:
 * - Bolt color selector (red, blue, green, yellow)
 * - FX type selection (standard, heavy, ion)
 * - Live bolt preview (SVG)
 * - Real-time configuration sync
 *
 * Pure UI layer. All mutations routed to BlasterCustomizationEngine.
 *
 * Extends ModificationModalShell for unified layout and lifecycle management
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { BlasterCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/blaster-customization-engine.js";
import { BLASTER_BOLT_COLORS } from "/systems/foundryvtt-swse/scripts/data/blaster-config.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class BlasterCustomizationApp extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    this.selectedBoltColor = item.flags?.swse?.boltColor || "red";
    this.selectedFxType = item.flags?.swse?.fxType || "standard";
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "swse-blaster-customization",
    classes: ["swse", "blaster-customization", "swse-theme-holo"],
    window: {
      icon: "fas fa-gun",
      title: "Blaster Configuration",
      resizable: true
    },
    position: { width: 900, height: 600 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/blaster/blaster-customization.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    return {
      ...context,
      actor: this.actor,
      item: this.item,
      itemName: this.item.name,
      selectedBoltColor: this.selectedBoltColor,
      selectedFxType: this.selectedFxType,
      boltColors: Object.keys(BLASTER_BOLT_COLORS),
      colorMap: BLASTER_BOLT_COLORS,
      boltColorHex: BLASTER_BOLT_COLORS[this.selectedBoltColor] || "#ff3333",
      fxTypes: ["standard", "heavy", "ion"],
      fxDescriptions: {
        standard: "Normal bolt velocity and dispersal",
        heavy: "Increased bolt size and impact energy",
        ion: "Electromagnetic discharge, anti-shield"
      }
    };
  }

  attachEventListeners(root) {
    // Set CSS variable for live bolt glow
    root.style.setProperty(
      "--selected-bolt-color",
      BLASTER_BOLT_COLORS[this.selectedBoltColor] || "#ff3333"
    );

    // Bolt color selection
    root.querySelectorAll(".blaster-color-cell").forEach(el => {
      const color = el.dataset.color;
      const isSelected = color === this.selectedBoltColor;

      if (isSelected) {
        el.classList.add("selected");
      }

      el.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove previous selection
        root.querySelectorAll(".blaster-color-cell").forEach(c => c.classList.remove("selected"));

        // Set new selection
        el.classList.add("selected");
        this.selectedBoltColor = color;

        // Update live bolt color
        root.style.setProperty(
          "--selected-bolt-color",
          BLASTER_BOLT_COLORS[color]
        );
      });
    });

    // FX type selection
    root.querySelectorAll(".blaster-fx-button").forEach(btn => {
      const fx = btn.dataset.fx;
      const isSelected = fx === this.selectedFxType;

      if (isSelected) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove previous selection
        root.querySelectorAll(".blaster-fx-button").forEach(b => b.classList.remove("selected"));

        // Set new selection
        btn.classList.add("selected");
        this.selectedFxType = fx;
      });
    });

    // Apply button
    const applyBtn = root.querySelector(".blaster-apply-button");
    applyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#applyChanges();
    });
  }

  async #applyChanges() {
    try {
      // Call engine to persist changes
      const result = await BlasterCustomizationEngine.apply(this.actor, this.item, {
        boltColor: this.selectedBoltColor,
        fxType: this.selectedFxType
      });

      if (!result.success) {
        ui.notifications.warn(`Configuration failed: ${result.reason}`);
        return;
      }

      ui.notifications.info("⚡ Blaster reconfigured!");
      this.close();
    } catch (err) {
      SWSELogger.error("Configuration failed:", err);
      ui.notifications.error("Unexpected error during configuration.");
    }
  }

}
