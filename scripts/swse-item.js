// ============================================
// FILE: scripts/swse-item.js
// ============================================
export class SWSEItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/item/item-sheet.hbs",
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "data"}],
      resizable: true
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    context.labels = {
      sheetTitle: this.item.name
    };
    return context;
  }
}