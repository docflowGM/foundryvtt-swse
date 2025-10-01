// systems/swse/scripts/swse-item.js

/**
 * SWSE Item Sheet
 * Custom sheet for SWSE items (weapons, armor, feats, talents, etc.)
 */
export class SWSEItemSheet extends ItemSheet {
  /** Configure default options for the SWSE item sheet */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/item/item-sheet.hbs",
      width: 520,
      height: "auto", // Allows scroll-flexing
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "data" }
      ]
    });
  }

  /** Provide data to the template */
  getData(options = {}) {
    const data = super.getData(options);

    // Foundry v10+ already provides `data.system`,
    // but in case older helpers expect it:
    if (!data.system && data.item?.system) {
      data.system = data.item.system;
    }

    return data;
  }
}

/**
 * Register SWSE item sheets
 */
Hooks.once("init", function() {
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("swse", SWSEItemSheet, { makeDefault: true });
});
