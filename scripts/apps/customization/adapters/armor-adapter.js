/**
 * ARMOR ADAPTER FOR UNIFIED CUSTOMIZATION WORKBENCH
 *
 * Handles armor modifications (type==='armor' or type==='bodysuit')
 * Multi-select upgrades with cost validation
 */

import { ARMOR_UPGRADES, MAX_ARMOR_UPGRADES } from "/systems/foundryvtt-swse/scripts/data/armor-upgrades.js";
import { ModificationIntentBuilder } from "/systems/foundryvtt-swse/scripts/engine/crafting/modification-intent-builder.js";

export class ArmorAdapter {
  constructor() {
    this.categoryId = "armor";
    this.categoryName = "Armor";
  }

  getOptions(item, actor) {
    return { upgrades: Object.keys(ARMOR_UPGRADES) };
  }

  getInitialSelections(item, actor) {
    return { upgrades: item.flags?.swse?.armorUpgrades || [] };
  }

  getOptionMetadata(optionId, optionType) {
    if (optionType === "upgrades") {
      const upgrade = ARMOR_UPGRADES[optionId];
      return upgrade ? { id: optionId, name: upgrade.name, description: upgrade.description, effect: upgrade.effect, cost: upgrade.costCredits } : null;
    }
    return null;
  }

  getPreview(selections, item, actor) {
    const errors = [];
    const warnings = [];
    let totalCost = 0;
    const selectedUpgrades = selections.upgrades || [];

    for (const upgradeId of selectedUpgrades) {
      const upgrade = ARMOR_UPGRADES[upgradeId];
      if (upgrade) totalCost += upgrade.costCredits || 0;
    }

    const maxUpgrades = MAX_ARMOR_UPGRADES || 5;
    if (selectedUpgrades.length > maxUpgrades) {
      errors.push(`Too many upgrades: ${selectedUpgrades.length}/${maxUpgrades}`);
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
      const selectedUpgrades = selections.upgrades || [];
      let totalCost = 0;
      for (const upgradeId of selectedUpgrades) {
        const upgrade = ARMOR_UPGRADES[upgradeId];
        if (upgrade) totalCost += upgrade.costCredits || 0;
      }

      const intent = ModificationIntentBuilder.buildArmorIntent(actor, item, selectedUpgrades, totalCost);
      const result = await ModificationIntentBuilder.executeIntentWithCost(actor, item, intent, totalCost);
      return { success: result.success, reason: result.reason };
    } catch (err) {
      console.error("[ArmorAdapter] Apply failed:", err);
      return { success: false, reason: err.message };
    }
  }

  getDefaults(item, actor) {
    return { upgrades: [] };
  }

  getMeta() {
    return {
      categoryId: "armor",
      categoryName: "Armor",
      icon: "fas fa-shield-alt",
      description: "Customize armor upgrades",
      allowMultiple: true,
      hasCost: true,
      hasSlots: false,
      canReset: true,
      supportsItemTypes: ["armor", "bodysuit"]
    };
  }

  supports(itemType) {
    return ["armor", "bodysuit"].includes(itemType);
  }
}

export default ArmorAdapter;
