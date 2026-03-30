/**
 * GEAR MODIFICATION APPLICATION
 *
 * Customization for gear items with:
 * - Structured modification options (NOT free-form editing)
 * - Variant selection (civilian vs military)
 * - Multi-select upgrades with compatibility checking
 * - Accent color customization
 * - Complete modification pipeline integration
 * - SLOT ENFORCEMENT via UpgradeRulesEngine
 *
 * CRITICAL CONSTRAINT: All options are predefined and structured
 * NO arbitrary editing or free text input allowed
 *
 * Routes ALL mutations through ModificationIntentBuilder
 * NO direct item.update() calls
 *
 * Extends ModificationModalShell for unified layout and lifecycle management
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { ModificationIntentBuilder } from "/systems/foundryvtt-swse/scripts/engine/crafting/modification-intent-builder.js";
import { UpgradeRulesEngine } from "/systems/foundryvtt-swse/scripts/apps/upgrade-rules-engine.js";
import { GEAR_MODS, GEAR_VARIANTS, DEFAULT_GEAR_VARIANT, DEFAULT_GEAR_ACCENT, MAX_GEAR_MODS } from "/systems/foundryvtt-swse/scripts/data/gear-mods.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class GearModificationApp extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;
    // Start with current configuration
    this.selectedMods = item.flags?.swse?.gearMods || [];
    this.variant = item.flags?.swse?.variant || DEFAULT_GEAR_VARIANT;
    this.accentColor = item.flags?.swse?.accentColor || DEFAULT_GEAR_ACCENT;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "swse-gear-modification",
    classes: ["swse", "gear-modification", "swse-theme-holo"],
    window: {
      icon: "fas fa-backpack",
      title: "Gear Configuration",
      resizable: true
    },
    position: { width: 850, height: 650 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/gear/gear-modification.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Calculate total cost
    let totalCreditCost = 0;
    const selectedDetails = [];

    for (const modId of this.selectedMods) {
      const mod = GEAR_MODS[modId];
      if (mod) {
        // Check compatibility with current variant
        if (mod.compatible.includes(this.variant)) {
          totalCreditCost += mod.costCredits || 0;
          selectedDetails.push(mod);
        }
      }
    }

    // Check actor credits
    const actorCredits = this.actor.system?.credits || 0;
    const canAfford = actorCredits >= totalCreditCost;

    // Calculate slot usage and validation
    const totalSlots = this.item.system?.upgradeSlots || MAX_GEAR_MODS;
    const currentUpgrades = this.item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = this.selectedMods.length;
    const totalSlotUsage = currentSlotUsage + newSlotUsage;
    const canFitSlots = totalSlotUsage <= totalSlots;
    const slotsRemaining = Math.max(0, totalSlots - currentSlotUsage);

    // Prepare available mods filtered by variant compatibility
    const availableMods = Object.entries(GEAR_MODS)
      .filter(([_, mod]) => mod.compatible.includes(this.variant))
      .map(([id, mod]) => ({
        id,
        ...mod,
        selected: this.selectedMods.includes(id),
        disabled: this.selectedMods.length >= MAX_GEAR_MODS && !this.selectedMods.includes(id)
      }));

    return {
      ...context,
      actor: this.actor,
      item: this.item,
      itemName: this.item.name,
      selectedMods: this.selectedMods,
      selectedDetails,
      variant: this.variant,
      variants: Object.entries(GEAR_VARIANTS).map(([key, data]) => ({
        id: key,
        ...data,
        selected: key === this.variant
      })),
      accentColor: this.accentColor,
      availableMods,
      totalCreditCost,
      actorCredits,
      canAfford,
      affordabilityClass: canAfford ? "can-afford" : "cannot-afford",
      maxModsReached: this.selectedMods.length >= MAX_GEAR_MODS,
      modCountRemaining: Math.max(0, MAX_GEAR_MODS - this.selectedMods.length),
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
    // Variant selection (exclusive - single choice)
    root.querySelectorAll(".gear-variant-btn").forEach(btn => {
      const variantId = btn.dataset.variant;
      const isSelected = variantId === this.variant;

      if (isSelected) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove previous selection
        root.querySelectorAll(".gear-variant-btn").forEach(b => b.classList.remove("selected"));

        // Set new selection
        btn.classList.add("selected");
        this.variant = variantId;

        // Re-render to update mod compatibility and costs
        this.render();
      });
    });

    // Mod selection (multi-select with max limit)
    root.querySelectorAll(".gear-mod-card").forEach(card => {
      const modId = card.dataset.mod;
      const isSelected = this.selectedMods.includes(modId);
      const isDisabled = card.classList.contains("disabled");

      if (isSelected) {
        card.classList.add("selected");
      }

      card.addEventListener("click", (e) => {
        e.preventDefault();

        if (isDisabled && !isSelected) {
          return; // Cannot add more mods
        }

        if (this.selectedMods.includes(modId)) {
          // Deselect
          this.selectedMods = this.selectedMods.filter(id => id !== modId);
          card.classList.remove("selected");
        } else {
          // Select (only if under limit)
          if (this.selectedMods.length < MAX_GEAR_MODS) {
            this.selectedMods.push(modId);
            card.classList.add("selected");
          }
        }

        // Re-render to update cost and mod availability
        this.render();
      });
    });

    // Accent color selector
    root.querySelectorAll(".gear-accent-input").forEach(input => {
      input.addEventListener("change", (e) => {
        this.accentColor = e.target.value;
      });
    });

    // Apply button
    const applyBtn = root.querySelector(".gear-apply-button");
    applyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#applyModifications();
    });
  }

  async #applyModifications() {
    // VALIDATION 1: Check slots before proceeding
    const totalSlots = this.item.system?.upgradeSlots || MAX_GEAR_MODS;
    const currentUpgrades = this.item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = this.selectedMods.length;
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
      const changes = [
        { path: "flags.swse.gearMods", value: this.selectedMods },
        { path: "flags.swse.variant", value: this.variant },
        { path: "flags.swse.accentColor", value: this.accentColor }
      ];

      const intent = ModificationIntentBuilder.buildGenericIntent(
        this.actor,
        this.item,
        changes,
        totalCost > 0 ? { type: "credits", amount: totalCost } : null
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
      const result = totalCost > 0
        ? await ModificationIntentBuilder.executeIntentWithCost(this.actor, this.item, intent, totalCost)
        : await ModificationIntentBuilder.executeIntent(this.actor, this.item, intent);

      if (!result.success) {
        ui.notifications.warn(`Modification failed: ${result.reason}`);
        return;
      }

      ui.notifications.info("🎒 Gear configured!");
      this.close();
    } catch (err) {
      SWSELogger.error("Gear modification failed:", err);
      ui.notifications.error("Unexpected error during modification.");
    }
  }

  #calculateTotalCost() {
    let total = 0;
    for (const modId of this.selectedMods) {
      const mod = GEAR_MODS[modId];
      if (mod && mod.compatible.includes(this.variant)) {
        total += mod.costCredits || 0;
      }
    }
    return total;
  }

}
