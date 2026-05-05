/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * The old UnifiedCustomizationWorkbench was a separate modal stack. The single
 * visible V2 item customization surface is now ItemCustomizationWorkbench via
 * openItemCustomization(). This wrapper prevents legacy imports from reopening a
 * parallel UI while preserving old constructor/render call sites.
 */

import { openItemCustomization, openWorkbenchForCategory } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

export class UnifiedCustomizationWorkbench {
  constructor(actor, item = null, options = {}) {
    this.actor = actor;
    this.item = item;
    this.options = options || {};
    this._app = null;
  }

  static open(actor, item = null, options = {}) {
    if (item) return openItemCustomization(actor, item, options);
    return openWorkbenchForCategory(actor, options.activeCategory || options.category || 'weapons', options);
  }

  render(force, options = {}) {
    this._app = UnifiedCustomizationWorkbench.open(this.actor, this.item, { ...this.options, ...options });
    return this._app;
  }

  close(options = {}) {
    return this._app?.close?.(options);
  }
}

export default UnifiedCustomizationWorkbench;
