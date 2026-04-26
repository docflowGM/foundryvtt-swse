/**
 * MELEE WEAPON ADAPTER FOR UNIFIED CUSTOMIZATION WORKBENCH
 *
 * Handles melee weapon modifications (non-lightsaber)
 * Multi-select upgrades with slot and cost validation
 *
 * Reuses ModificationIntentBuilder and existing validation logic
 */

import { MELEE_UPGRADES, MELEE_ACCENT_COLORS, DEFAULT_MELEE_ACCENT } from "/systems/foundryvtt-swse/scripts/data/melee-upgrades.js";
import { ModificationIntentBuilder } from "/systems/foundryvtt-swse/scripts/engine/crafting/modification-intent-builder.js";

export class MeleeAdapter {
  constructor() {
    this.categoryId = "weapons";
    this.categoryName = "Weapons";
  }

  /**
   * Get available options for melee customization
   * Returns two option types: upgrades and accent color
   *
   * @returns {Object} { upgrades: [upgradeIds], accentColor: [colorIds] }
   */
  getOptions(item, actor) {
    return {
      upgrades: Object.keys(MELEE_UPGRADES),
      accentColor: Object.keys(MELEE_ACCENT_COLORS)
    };
  }

  /**
   * Load current selections from item flags
   *
   * @param {Item} item - The melee weapon
   * @param {Actor} actor - The owner
   * @returns {Object} { upgrades: [selectedUpgradeIds], accentColor: colorId }
   */
  getInitialSelections(item, actor) {
    return {
      upgrades: item.flags?.swse?.meleeUpgrades || [],
      accentColor: item.flags?.swse?.accentColor || DEFAULT_MELEE_ACCENT
    };
  }

  /**
   * Get metadata about available options (for UI display)
   *
   * @param {String} optionId - The upgrade or color identifier
   * @param {String} optionType - "upgrades" or "accentColor"
   * @returns {Object} { name, description, cost?, color?, icon? }
   */
  getOptionMetadata(optionId, optionType) {
    if (optionType === "upgrades") {
      const upgrade = MELEE_UPGRADES[optionId];
      return upgrade ? {
        id: optionId,
        name: upgrade.name,
        description: upgrade.description,
        effect: upgrade.effect,
        cost: upgrade.costCredits
      } : null;
    }

    if (optionType === "accentColor") {
      return {
        id: optionId,
        name: optionId.charAt(0).toUpperCase() + optionId.slice(1),
        description: `${optionId} accent color`,
        hexColor: MELEE_ACCENT_COLORS[optionId]
      };
    }

    return null;
  }

  /**
   * Calculate cost and slot usage of current selections
   * Melee weapons have upgrade slots and credit costs
   *
   * @param {Object} selections - { upgrades: [ids], accentColor: id }
   * @param {Item} item - The melee weapon
   * @param {Actor} actor - The owner
   * @returns {Object} Preview { costCredits, slotsUsed, creditsAfter, canAfford, errors[] }
   */
  getPreview(selections, item, actor) {
    const errors = [];
    const warnings = [];

    // Calculate cost
    let totalCost = 0;
    const selectedUpgrades = selections.upgrades || [];

    for (const upgradeId of selectedUpgrades) {
      const upgrade = MELEE_UPGRADES[upgradeId];
      if (upgrade) {
        totalCost += upgrade.costCredits || 0;
      }
    }

    // Check slot capacity
    const totalSlots = item.system?.upgradeSlots || 2;
    const currentUpgrades = item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = selectedUpgrades.length; // Simplified: 1 slot per upgrade
    const totalSlotUsage = currentSlotUsage + newSlotUsage;

    if (totalSlotUsage > totalSlots) {
      errors.push(`Slot limit exceeded: ${totalSlotUsage}/${totalSlots}`);
    }

    // Check credits
    const actorCredits = actor?.system?.credits || 0;
    const creditsAfter = actorCredits - totalCost;
    const canAfford = actorCredits >= totalCost;

    if (!canAfford) {
      errors.push(`Insufficient credits: need ${totalCost}, have ${actorCredits}`);
    }

    return {
      costCredits: totalCost,
      slotsUsed: newSlotUsage,
      slotsAvailable: totalSlots,
      currentSlotUsage,
      creditsAfter,
      canAfford,
      errors,
      warnings
    };
  }

  /**
   * Validate selections before applying
   *
   * @param {Object} selections - { upgrades: [ids], accentColor: id }
   * @param {Item} item - The melee weapon
   * @param {Actor} actor - The owner
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  canApply(selections, item, actor) {
    const preview = this.getPreview(selections, item, actor);
    return {
      valid: preview.errors.length === 0,
      errors: preview.errors
    };
  }

  /**
   * Apply selections through ModificationIntentBuilder
   *
   * @param {Object} selections - { upgrades: [ids], accentColor: id }
   * @param {Item} item - The melee weapon
   * @param {Actor} actor - The owner
   * @returns {Promise<Object>} { success: boolean, reason?: string }
   */
  async apply(selections, item, actor) {
    try {
      const selectedUpgrades = selections.upgrades || [];
      const selectedAccentColor = selections.accentColor || DEFAULT_MELEE_ACCENT;

      // Calculate cost for intent
      let totalCost = 0;
      for (const upgradeId of selectedUpgrades) {
        const upgrade = MELEE_UPGRADES[upgradeId];
        if (upgrade) {
          totalCost += upgrade.costCredits || 0;
        }
      }

      // Build modification intent
      const intent = ModificationIntentBuilder.buildGenericIntent(
        actor,
        item,
        [
          { path: "flags.swse.meleeUpgrades", value: selectedUpgrades },
          { path: "flags.swse.accentColor", value: selectedAccentColor }
        ],
        { type: "credits", amount: totalCost }
      );

      // Add validation metadata
      const preview = this.getPreview(selections, item, actor);
      intent.validation = {
        slots: {
          available: preview.slotsAvailable,
          needed: preview.slotsUsed,
          currentUsage: preview.currentSlotUsage,
          totalUsage: preview.currentSlotUsage + preview.slotsUsed,
          valid: preview.errors.length === 0
        },
        credits: {
          available: actor.system?.credits || 0,
          needed: totalCost,
          valid: preview.canAfford
        }
      };

      // Execute intent with cost validation
      const result = await ModificationIntentBuilder.executeIntentWithCost(
        actor,
        item,
        intent,
        totalCost
      );

      return {
        success: result.success,
        reason: result.reason
      };
    } catch (err) {
      console.error("[MeleeAdapter] Apply failed:", err);
      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Reset selections to defaults
   *
   * @param {Item} item - The melee weapon
   * @param {Actor} actor - The owner
   * @returns {Object} Default selections
   */
  getDefaults(item, actor) {
    return {
      upgrades: [],
      accentColor: DEFAULT_MELEE_ACCENT
    };
  }

  /**
   * Get metadata about this adapter
   *
   * @returns {Object} Category metadata
   */
  getMeta() {
    return {
      categoryId: "weapons",
      categoryName: "Weapons",
      icon: "fas fa-sword",
      description: "Customize melee weapon upgrades and appearance",
      allowMultiple: true,
      hasCost: true,
      hasSlots: true,
      canReset: true,
      supportsItemTypes: ["weapon"]
    };
  }

  /**
   * Check if this adapter handles the given item type
   *
   * @param {String} itemType - The item type to check
   * @returns {Boolean}
   */
  supports(itemType) {
    return ["weapon"].includes(itemType);
  }
}

export default MeleeAdapter;
