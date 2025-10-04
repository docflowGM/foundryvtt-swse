// systems/swse/scripts/swse-item.js

export class SWSEItemSheet extends ItemSheet {
  /** Configure default options for the SWSE item sheet */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/item/item-sheet.hbs",
      width: 520,
      height: "auto",
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details" }
      ]
    });
  }

  /** Provide data to the template */
  getData(options) {
    const data = super.getData(options);

    // Ensure data.system is always available
    if (!data.system && this.item?.system) {
      data.system = this.item.system;
    }

    return data;
  }
}
