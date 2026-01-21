import { SWSEUpgradeApp } from '../apps/upgrade-app.js';

export class SWSEItemSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item", "swse-app"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  get template() {
    return "systems/foundryvtt-swse/templates/items/base/item-sheet.hbs";
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

  /**
   * Custom update handler to process comma-separated arrays
   */
  async _updateObject(event, formData) {
    // Convert comma-separated strings to arrays for specific fields
    if (formData['system.properties'] !== undefined && typeof formData['system.properties'] === 'string') {
      formData['system.properties'] = formData['system.properties']
        .split(',')
        .map(p => p.trim())
        .filter(p => p);
    }

    if (formData['system.tags'] !== undefined && typeof formData['system.tags'] === 'string') {
      formData['system.tags'] = formData['system.tags']
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    }

    if (formData['system.bonusFeatFor'] !== undefined && typeof formData['system.bonusFeatFor'] === 'string') {
      formData['system.bonusFeatFor'] = formData['system.bonusFeatFor']
        .split(',')
        .map(c => c.trim())
        .filter(c => c);
    }

    // Call parent to handle the actual update
    return super._updateObject(event, formData);
  }
}
