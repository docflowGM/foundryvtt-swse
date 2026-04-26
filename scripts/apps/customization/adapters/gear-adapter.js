/**
 * GEAR ADAPTER FOR UNIFIED CUSTOMIZATION WORKBENCH
 *
 * Handles gear modifications (type==='equipment' or type==='gear')
 * Multi-select mods with cost and compatibility validation
 */

import { GEAR_MODS, GEAR_VARIANTS, MAX_GEAR_MODS } from "/systems/foundryvtt-swse/scripts/data/gear-mods.js";
import { ModificationIntentBuilder } from "/systems/foundryvtt-swse/scripts/engine/crafting/modification-intent-builder.js";

export class GearAdapter {
  constructor() {
    this.categoryId = "gear";
    this.categoryName = "Gear";
  }

  getOptions(item, actor) {
    return { mods: Object.keys(GEAR_MODS) };
  }

  getInitialSelections(item, actor) {
    return { mods: item.flags?.swse?.gearMods || [] };
  }

  getOptionMetadata(optionId, optionType) {
    if (optionType === "mods") {
      const mod = GEAR_MODS[optionId];
      return mod ? { id: optionId, name: mod.name, description: mod.description, effect: mod.effect, cost: mod.costCredits } : null;
    }
    return null;
  }

  getPreview(selections, item, actor) {
    const errors = [];
    const warnings = [];
    let totalCost = 0;
    const selectedMods = selections.mods || [];

    for (const modId of selectedMods) {
      const mod = GEAR_MODS[modId];
      if (mod) totalCost += mod.costCredits || 0;
    }

    const maxMods = MAX_GEAR_MODS || 6;
    if (selectedMods.length > maxMods) {
      errors.push(`Too many mods: ${selectedMods.length}/${maxMods}`);
    }

    const actorCredits = actor?.system?.credits || 0;
    const creditsAfter = actorCredits - totalCost;
    const canAfford = actorCredits >= totalCost;

    if (!canAfford) {
      errors.push(`Insufficient credits: need ${totalCost}, have ${actorCredits}`);
    }

    return { costCredits: totalCost, creditsAfter, wallet: actorCredits, canAfford, errors, warnings };
  }

  canApply(selections, item, actor) {
    const preview = this.getPreview(selections, item, actor);
    return { valid: preview.errors.length === 0, errors: preview.errors };
  }

  async apply(selections, item, actor) {
    try {
      const selectedMods = selections.mods || [];
      let totalCost = 0;
      for (const modId of selectedMods) {
        const mod = GEAR_MODS[modId];
        if (mod) totalCost += mod.costCredits || 0;
      }

      const intent = ModificationIntentBuilder.buildGenericIntent(
        actor,
        item,
        [{ path: "flags.swse.gearMods", value: selectedMods }],
        { type: "credits", amount: totalCost }
      );

      const result = await ModificationIntentBuilder.executeIntentWithCost(actor, item, intent, totalCost);
      return { success: result.success, reason: result.reason };
    } catch (err) {
      console.error("[GearAdapter] Apply failed:", err);
      return { success: false, reason: err.message };
    }
  }

  getDefaults(item, actor) {
    return { mods: [] };
  }

  getMeta() {
    return {
      categoryId: "gear",
      categoryName: "Gear",
      icon: "fas fa-toolbox",
      description: "Customize gear modifications",
      allowMultiple: true,
      hasCost: true,
      hasSlots: false,
      canReset: true,
      supportsItemTypes: ["equipment", "gear"]
    };
  }

  supports(itemType) {
    return ["equipment", "gear"].includes(itemType);
  }
}

export default GearAdapter;
