// system/store/gm-settings.js
export class SWSEGMSettings extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-gm-store-settings",
      title: "GM Store Settings",
      template: "systems/swse/system/store/gm-settings.html",
      width: 400
    });
  }

  getData() {
    return game.settings.get("swse", "storeSettings") || { buyMultiplier: 1, sellMultiplier: 0.5 };
  }

  async _updateObject(_, formData) {
    const updated = {
      buyMultiplier: parseFloat(formData.buyMultiplier),
      sellMultiplier: parseFloat(formData.sellMultiplier)
    };
    await game.settings.set("swse", "storeSettings", updated);
    ui.notifications.info("Store settings updated.");
  }
}
