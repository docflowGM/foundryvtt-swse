// systems/swse/scripts/swse-item.js

export class SWSEItemSheet extends ItemSheet {
  /** Configure default options for the SWSE item sheet */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/item/item-sheet.hbs",
      width: 520,
      height: "auto",
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "data" }
      ]
    });
  }

  /** Provide data to the template */
  getData() {
    const data = super.getData();
    // Alias for convenience in templates
    data.system = data.item.system;
    return data;
  }
}
