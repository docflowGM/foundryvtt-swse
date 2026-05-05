/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * Blaster bolt color, FX type, upgrades, previews, and persistence now live in
 * the shared ItemCustomizationWorkbench. Keep this facade for legacy imports;
 * it opens the V2 workbench instead of maintaining a second blaster UI.
 */

import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

export class BlasterCustomizationApp {
  constructor(actor, item, options = {}) {
    this.actor = actor;
    this.item = item;
    this.options = options;
    this._app = null;
  }

  static open(actor, item, options = {}) {
    return openItemCustomization(actor, item, {
      ...options,
      initialCategory: 'weapons'
    });
  }

  render(force, options = {}) {
    this._app = BlasterCustomizationApp.open(this.actor, this.item, { ...this.options, ...options });
    return this._app;
  }

  close(options = {}) {
    return this._app?.close?.(options);
  }
}

export default BlasterCustomizationApp;
