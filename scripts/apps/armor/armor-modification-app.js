/**
 * ARMOR MODIFICATION APPLICATION
 *
 * Tactical armor customization with:
 * - Upgrade selection (multi-select)
 * - Cost preview and validation
 * - Token cost calculation
 * - Complete integration with modification engine
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
import { ARMOR_UPGRADES } from "/systems/foundryvtt-swse/scripts/data/armor-upgrades.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class ArmorModificationApp extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    // Start with currently installed upgrades
    this.selectedUpgrades = item.flags?.swse?.armorUpgrades || [];
    this.tintColor = item.flags?.swse?.tintColor || "#888888";
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "swse-armor-modification",
    classes: ["swse", "armor-modification", "swse-theme-holo"],
    window: {
      icon: "fas fa-shield",
      title: "Armor Configuration",
      resizable: true
    },
    position: { width: 900, height: 700 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/armor/armor-modification.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Calculate total cost and token cost
    let totalCreditCost = 0;
    const selectedDetails = [];

    for (const upgradeId of this.selectedUpgrades) {
      const upgrade = ARMOR_UPGRADES[upgradeId];
      if (upgrade) {
        totalCreditCost += upgrade.costCredits || 0;
        selectedDetails.push(upgrade);
      }
    }

    // Check actor credits for validation
    const actorCredits = this.actor.system?.credits || 0;
    const canAfford = actorCredits >= totalCreditCost;

    // Calculate slot usage and validation
    const totalSlots = this.item.system?.upgradeSlots || 1;
    const currentUpgrades = this.item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = this.selectedUpgrades.length; // Simplified: assume 1 slot per upgrade
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
      tintColor: this.tintColor,
      allUpgrades: Object.entries(ARMOR_UPGRADES).map(([id, upgrade]) => ({
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
    root.querySelectorAll(".armor-upgrade-card").forEach(card => {
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

        // Re-render to update cost summary
        this.render();
      });
    });

    // Tint color selector (if applicable)
    root.querySelectorAll(".armor-tint-input").forEach(input => {
      input.addEventListener("change", (e) => {
        this.tintColor = e.target.value;
      });
    });

    // Apply button
    const applyBtn = root.querySelector(".armor-apply-button");
    applyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#applyModifications();
    });
  }

  async #applyModifications() {
    // VALIDATION 1: Check slots before proceeding
    const totalSlots = this.item.system?.upgradeSlots || 1;
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

    // VALIDATION 2: Check credits before proceeding
    const totalCost = this.#calculateTotalCost();
    const actorCredits = this.actor.system?.credits || 0;

    if (actorCredits < totalCost) {
      ui.notifications.warn(`Insufficient credits. Need ${totalCost}, have ${actorCredits}`);
      return;
    }

    try {
      // Build modification intent via builder
      const intent = ModificationIntentBuilder.buildArmorIntent(
        this.actor,
        this.item,
        this.selectedUpgrades,
        totalCost  // Credit cost, not token cost (for armor customization)
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

      // Add tint color to intent changes
      if (this.tintColor && this.tintColor !== "#888888") {
        intent.changes.push({
          path: "flags.swse.tintColor",
          value: this.tintColor
        });
      }

      // Execute through pipeline with cost validation
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

      ui.notifications.info("🛡️ Armor modified!");
      this.close();
    } catch (err) {
      SWSELogger.error("Armor modification failed:", err);
      ui.notifications.error("Unexpected error during modification.");
    }
  }

  #calculateTotalCost() {
    let total = 0;
    for (const upgradeId of this.selectedUpgrades) {
      const upgrade = ARMOR_UPGRADES[upgradeId];
      if (upgrade) {
        total += upgrade.costCredits || 0;
      }
    }
    return total;
  }

}
