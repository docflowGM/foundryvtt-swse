import { SWSEUpgradeApp } from '../apps/upgrade-app.js';

export class SWSEItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  get template() {
    return "systems/swse/templates/items/base/item-sheet.hbs";
  }

  getData() {
    const context = super.getData();
    context.system = context.item.system;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Open upgrade app
    html.find(".open-upgrade-app").click(this._onOpenUpgradeApp.bind(this));
  }

  /**
   * Handle opening the upgrade application
   */
  _onOpenUpgradeApp(event) {
    event.preventDefault();
    const upgradeApp = new SWSEUpgradeApp(this.item);
    upgradeApp.render(true);
  }
}
