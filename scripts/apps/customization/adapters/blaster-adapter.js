/**
 * BLASTER ADAPTER FOR UNIFIED CUSTOMIZATION WORKBENCH
 *
 * Thin wrapper that bridges the unified shell to BlasterCustomizationEngine
 * Implements the standard adapter interface for category-agnostic workbench
 *
 * Reuses existing engine, data sources, and validation logic.
 */

import { BlasterCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/blaster-customization-engine.js";
import { BLASTER_BOLT_COLORS } from "/systems/foundryvtt-swse/scripts/data/blaster-config.js";

export class BlasterAdapter {
  constructor() {
    this.categoryId = "weapon";
    this.categoryName = "Weapons";
  }

  /**
   * Get available options for this category
   * Returns all possible selections the user can make
   *
   * @returns {Object} Map of option groups to available choices
   */
  getOptions(item, actor) {
    return {
      boltColor: Object.keys(BLASTER_BOLT_COLORS),
      fxType: ["standard", "heavy", "ion"]
    };
  }

  /**
   * Get current selections from item flags
   * Initialize form with existing customization state
   *
   * @param {Item} item - The blaster weapon
   * @param {Actor} actor - The owner (for context if needed)
   * @returns {Object} Current selections { boltColor, fxType }
   */
  getInitialSelections(item, actor) {
    return {
      boltColor: item.flags?.swse?.boltColor || "red",
      fxType: item.flags?.swse?.fxType || "standard"
    };
  }

  /**
   * Get metadata about available options (for UI display)
   *
   * @param {String} optionKey - The option identifier
   * @returns {Object} { name, description, cost?, color?, effect? }
   */
  getOptionMetadata(optionKey, optionType) {
    if (optionType === "boltColor") {
      return {
        id: optionKey,
        name: optionKey.charAt(0).toUpperCase() + optionKey.slice(1),
        description: `${optionKey.toUpperCase()} bolt`,
        hexColor: BLASTER_BOLT_COLORS[optionKey],
        cost: 0
      };
    }

    if (optionType === "fxType") {
      const descriptions = {
        standard: "Normal bolt velocity and dispersal",
        heavy: "Increased bolt size and impact energy",
        ion: "Electromagnetic discharge, anti-shield"
      };

      return {
        id: optionKey,
        name: optionKey.charAt(0).toUpperCase() + optionKey.slice(1),
        description: descriptions[optionKey] || "",
        cost: 0
      };
    }

    return null;
  }

  /**
   * Calculate cost and validation status of current selections
   *
   * @param {Object} selections - { boltColor, fxType }
   * @param {Item} item - The blaster weapon
   * @param {Actor} actor - The owner
   * @returns {Object} Preview { costCredits, slotsUsed, canAfford, errors[] }
   */
  getPreview(selections, item, actor) {
    // Blaster customization is cosmetic, no cost
    return {
      costCredits: 0,
      slotsUsed: 0,
      creditsAfter: actor?.system?.credits || 0,
      canAfford: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Validate selections before applying
   *
   * @param {Object} selections - Current selections
   * @param {Item} item - The blaster
   * @param {Actor} actor - The owner
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  canApply(selections, item, actor) {
    const errors = [];

    if (!selections.boltColor) {
      errors.push("Must select a bolt color");
    }

    if (!selections.fxType) {
      errors.push("Must select an FX type");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply selections through canonical engine
   * Routes through ActorEngine.applyMutationPlan()
   *
   * @param {Object} selections - { boltColor, fxType }
   * @param {Item} item - The blaster
   * @param {Actor} actor - The owner
   * @returns {Promise<Object>} { success: boolean, reason?: string }
   */
  async apply(selections, item, actor) {
    return await BlasterCustomizationEngine.apply(actor, item, {
      boltColor: selections.boltColor,
      fxType: selections.fxType
    });
  }

  /**
   * Reset selections to defaults
   *
   * @param {Item} item - The blaster
   * @param {Actor} actor - The owner
   * @returns {Object} Default selections { boltColor, fxType }
   */
  getDefaults(item, actor) {
    return {
      boltColor: "red",
      fxType: "standard"
    };
  }

  /**
   * Get metadata about this category adapter
   *
   * @returns {Object} Category metadata
   */
  getMeta() {
    return {
      categoryId: "weapon",
      categoryName: "Weapons",
      icon: "fas fa-gun",
      description: "Customize weapon appearance and behavior",
      allowMultiple: true,
      hasCost: false,
      hasSlots: false,
      canReset: true,
      supportsItemTypes: ["weapon", "blaster"]
    };
  }

  /**
   * Check if this adapter handles the given item type
   *
   * @param {String} itemType - The item type to check
   * @returns {Boolean}
   */
  supports(itemType) {
    return ["weapon", "blaster"].includes(itemType);
  }
}

export default BlasterAdapter;
