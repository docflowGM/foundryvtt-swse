export class SWSEItemSheet extends ItemSheet {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  get template() {
    return "systems/swse/templates/actors/item-sheet.hbs";
  }

  getData() {
    const context = super.getData();
    context.system = context.item.system;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
  }
}
