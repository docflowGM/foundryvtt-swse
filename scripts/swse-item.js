// systems/swse/scripts/swse-item.js

export class SWSEItemSheet extends foundry.appv1?.sheets.foundry?.sheet?.sheets.foundry?.sheet?.sheets.foundry?.sheet?.sheets.ItemSheet {
  /** Configure default options for the SWSE item sheet */
  static get defaultOptions() {
    return foundry.utils.foundry.utils.foundry.utils.foundry.utils.foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/item/item-sheet.hbs",
      width: 520,
      height: "auto", // Can leave as "auto" if you want scroll-flexing
      tabs: [
        { navSelector: "?.sheet-tabs", contentSelector: "?.sheet-body", initial: "data" }
      ]
    });
  }

  /** Provide data to the template */
  getData(options) {
    const data = super.getData(options);

    // Foundry v10+ already provides `data.system`, but in case older helpers expect it:
    if (!data.system && data.item?.system) {
      data.system = data.item.system;
    }

    return data;
  }
}
