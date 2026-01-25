import { SWSEUpgradeApp } from '../apps/upgrade-app.js';

export class SWSEItemSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item", "swse-app"],
      width: 520,
      height: 350,
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

    // Shield activation/deactivation
    html.find(".activate-shield").click(this._onActivateShield.bind(this));
    html.find(".deactivate-shield").click(this._onDeactivateShield.bind(this));
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
   * Handle shield activation
   */
  async _onActivateShield(event) {
    event.preventDefault();

    const currentCharges = this.item.system.charges?.current || 0;
    const shieldRating = this.item.system.shieldRating || 0;

    if (currentCharges <= 0) {
      ui.notifications.warn("No charges remaining to activate shield!");
      return;
    }

    if (shieldRating <= 0) {
      ui.notifications.warn("Shield has no rating to activate!");
      return;
    }

    // Use one charge, activate the shield, and set current SR to max
    await this.item.update({
      'system.charges.current': currentCharges - 1,
      'system.activated': true,
      'system.currentSR': shieldRating
    });

    ui.notifications.info(`${this.item.name} activated! SR: ${shieldRating}, Charges remaining: ${currentCharges - 1}`);
  }

  /**
   * Handle shield deactivation
   */
  async _onDeactivateShield(event) {
    event.preventDefault();

    await this.item.update({
      'system.activated': false
    });

    ui.notifications.info(`${this.item.name} deactivated!`);
  }

  /**
   * Custom update handler to process comma-separated arrays and handle shield auto-deactivation
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

    // Auto-deactivate shield when current SR reaches 0
    if (this.item.system.armorType === 'shield' && this.item.system.activated) {
      const newCurrentSR = formData['system.currentSR'] !== undefined ? formData['system.currentSR'] : this.item.system.currentSR;
      if (newCurrentSR <= 0) {
        formData['system.activated'] = false;
        ui.notifications.info(`${this.item.name} depleted and auto-deactivated!`);
      }
    }

    // Call parent to handle the actual update
    return super._updateObject(event, formData);
  }
}
