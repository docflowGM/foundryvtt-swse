// ============================================
// FILE: scripts/swse-item.js
// Item sheet
// ============================================

export class SWSEItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/items/item-sheet.hbs",
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Add listeners here
  }
}
