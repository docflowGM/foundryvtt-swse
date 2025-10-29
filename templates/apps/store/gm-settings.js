// system/templates/apps/store/gm-settings.js
export class SWSEGMSettings extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-gm-templates/apps/store-settings",
      title: "GM Store Settings",
      template: "systems/swse/system/templates/apps/store/gm-settings.html",
      width: 400
    });
  }

  getData() {
    return game.settings.get("swse", "templates/apps/templates/apps/storeSettings") || { buyMultiplier: 1, sellMultiplier: 0.5 };
  }

  async _updateObject(_, formData) {
    const updated = {
      buyMultiplier: parseFloat(formData.buyMultiplier),
      sellMultiplier: parseFloat(formData.sellMultiplier)
    };
    await game.settings.set("swse", "templates/apps/templates/apps/storeSettings", updated);
    ui.notifications.info("Store settings updated.");
  }
}
