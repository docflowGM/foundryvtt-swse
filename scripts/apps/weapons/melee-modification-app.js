/**
 * MELEE WEAPON MODIFICATION APPLICATION
 *
 * Customization for non-lightsaber melee weapons with:
 * - Upgrade selection (multi-select)
 * - Accent color customization
 * - Cost preview
 * - Complete modification pipeline integration
 * - SLOT ENFORCEMENT via UpgradeRulesEngine
 *
 * CRITICAL: Routes ALL mutations through ModificationIntentBuilder
 * NO direct item.update() calls
 *
 * Extends ModificationModalShell for unified layout and lifecycle management
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { ModificationIntentBuilder } from "/systems/foundryvtt-swse/scripts/engine/crafting/modification-intent-builder.js";
import { UpgradeRulesEngine } from "/systems/foundryvtt-swse/scripts/apps/upgrade-rules-engine.js";
import { MELEE_UPGRADES, DEFAULT_MELEE_ACCENT } from "/systems/foundryvtt-swse/scripts/data/melee-upgrades.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class MeleeWeaponModificationApp extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    // Start with currently installed upgrades
    this.selectedUpgrades = item.flags?.swse?.meleeUpgrades || [];
    this.accentColor = item.flags?.swse?.accentColor || DEFAULT_MELEE_ACCENT;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "swse-melee-modification",
    classes: ["swse", "melee-modification", "swse-theme-holo"],
    window: {
      icon: "fas fa-sword",
      title: "Weapon Customization",
      resizable: true
    },
    position: { width: 900, height: 650 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/weapons/melee-modification.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Calculate total cost
    let totalCreditCost = 0;
    const selectedDetails = [];

    for (const upgradeId of this.selectedUpgrades) {
      const upgrade = MELEE_UPGRADES[upgradeId];
      if (upgrade) {
        totalCreditCost += upgrade.costCredits || 0;
        selectedDetails.push(upgrade);
      }
    }

    // Check actor credits
    const actorCredits = this.actor.system?.credits || 0;
    const canAfford = actorCredits >= totalCreditCost;

    // Calculate slot usage and validation
    const totalSlots = this.item.system?.upgradeSlots || 2;
    const currentUpgrades = this.item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = this.selectedUpgrades.length;
    const totalSlotUsage = currentSlotUsage + newSlotUsage;
    const canFitSlots = totalSlotUsage <= totalSlots;
    const slotsRemaining = Math.max(0, totalSlots - currentSlotUsage);

    return {
      ...context,
      actor: this.actor,
      item: this.item,
      itemName: this.item.name,
      selectedUpgrades: this.selectedUpgrades,
      selectedDetails,
      accentColor: this.accentColor,
      allUpgrades: Object.entries(MELEE_UPGRADES).map(([id, upgrade]) => ({
        id,
        ...upgrade,
        selected: this.selectedUpgrades.includes(id)
      })),
      totalCreditCost,
      actorCredits,
      canAfford,
      affordabilityClass: canAfford ? "can-afford" : "cannot-afford",
      // Slot information
      totalSlots,
      currentSlotUsage,
      newSlotUsage,
      totalSlotUsage,
      slotsRemaining,
      canFitSlots,
      slotWarning: totalSlotUsage > totalSlots ? `⚠️ Exceeds available slots by ${totalSlotUsage - totalSlots}` : null,
      slotAtLimit: slotsRemaining === 1
    };
  }

  attachEventListeners(root) {
    // Upgrade selection (multi-select)
    root.querySelectorAll(".melee-upgrade-card").forEach(card => {
      const upgradeId = card.dataset.upgrade;
      const isSelected = this.selectedUpgrades.includes(upgradeId);

      if (isSelected) {
        card.classList.add("selected");
      }

      card.addEventListener("click", (e) => {
        e.preventDefault();

        if (this.selectedUpgrades.includes(upgradeId)) {
          // Deselect
          this.selectedUpgrades = this.selectedUpgrades.filter(id => id !== upgradeId);
          card.classList.remove("selected");
        } else {
          // Select
          this.selectedUpgrades.push(upgradeId);
          card.classList.add("selected");
        }

        // Re-render to update cost
        this.render();
      });
    });

    // Accent color selector
    root.querySelectorAll(".melee-accent-option").forEach(btn => {
      const color = btn.dataset.accent;
      const isSelected = color === this.accentColor;

      if (isSelected) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove previous selection
        root.querySelectorAll(".melee-accent-option").forEach(b => b.classList.remove("selected"));

        // Set new selection
        btn.classList.add("selected");
        this.accentColor = color;

        // Update preview
        const preview = root.querySelector(".melee-weapon-visual");
        if (preview) {
          preview.style.setProperty("--accent-color", this.#getColorHex(color));
        }
      });
    });

    // Apply button
    const applyBtn = root.querySelector(".melee-apply-button");
    applyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#applyModifications();
    });
  }

  async #applyModifications() {
    // VALIDATION 1: Check slots before proceeding
    const totalSlots = this.item.system?.upgradeSlots || 2;
    const currentUpgrades = this.item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = this.selectedUpgrades.length;
    const totalSlotUsage = currentSlotUsage + newSlotUsage;

    if (totalSlotUsage > totalSlots) {
      ui.notifications.warn(
        `Modification exceeds available slots. Need ${totalSlotUsage}, have ${totalSlots} available.`
      );
      return;
    }

    // VALIDATION 2: Check credits
    const totalCost = this.#calculateTotalCost();
    const actorCredits = this.actor.system?.credits || 0;

    if (actorCredits < totalCost) {
      ui.notifications.warn(`Insufficient credits. Need ${totalCost}, have ${actorCredits}`);
      return;
    }

    try {
      // Build intent via builder
      const intent = ModificationIntentBuilder.buildGenericIntent(
        this.actor,
        this.item,
        [
          { path: "flags.swse.meleeUpgrades", value: this.selectedUpgrades },
          { path: "flags.swse.accentColor", value: this.accentColor }
        ],
        { type: "credits", amount: totalCost }
      );

      // Add slot validation metadata to intent
      intent.validation = {
        slots: {
          available: totalSlots,
          needed: newSlotUsage,
          currentUsage: currentSlotUsage,
          totalUsage: totalSlotUsage,
          valid: totalSlotUsage <= totalSlots
        },
        credits: {
          available: actorCredits,
          needed: totalCost,
          valid: actorCredits >= totalCost
        }
      };

      // Execute with cost validation
      const result = await ModificationIntentBuilder.executeIntentWithCost(
        this.actor,
        this.item,
        intent,
        totalCost
      );

      if (!result.success) {
        ui.notifications.warn(`Modification failed: ${result.reason}`);
        return;
      }

      ui.notifications.info("⚔️ Weapon customized!");
      this.close();
    } catch (err) {
      SWSELogger.error("Weapon modification failed:", err);
      ui.notifications.error("Unexpected error during modification.");
    }
  }

  #calculateTotalCost() {
    let total = 0;
    for (const upgradeId of this.selectedUpgrades) {
      const upgrade = MELEE_UPGRADES[upgradeId];
      if (upgrade) {
        total += upgrade.costCredits || 0;
      }
    }
    return total;
  }

  #getColorHex(colorName) {
    // Return hex color for accent
    const colors = {
      "steel": "#a0a0a0",
      "gold": "#d4af37",
      "copper": "#b87333",
      "silver": "#c0c0c0",
      "black": "#1a1a1a",
      "crimson": "#dc143c"
    };
    return colors[colorName] || "#a0a0a0";
  }

}
