/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * The raw customization workbench was an intermediate UI over the customization
 * workflow. The shared V2 ItemCustomizationWorkbench is now the only visible item
 * customization route. This wrapper keeps imports alive and routes callers to the
 * modern launcher without duplicating UI or mutation paths.
 */

import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

export class RawCustomizationWorkbenchApp {
  constructor(actor, item, options = {}) {
    this.actor = actor;
    this.item = item;
    this.options = options;
    this._app = null;
  }

  static open(actor, item, options = {}) {
    return openItemCustomization(actor, item, options);
  }

  render(force, options = {}) {
    this._app = RawCustomizationWorkbenchApp.open(this.actor, this.item, { ...this.options, ...options });
    return this._app;
  }

  close(options = {}) {
    return this._app?.close?.(options);
  }
}

export default RawCustomizationWorkbenchApp;
