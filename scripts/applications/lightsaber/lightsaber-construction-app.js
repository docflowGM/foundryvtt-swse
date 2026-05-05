/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * Lightsaber construction/editing has been folded into the shared V2
 * ItemCustomizationWorkbench. This facade preserves old imports and macros while
 * routing all launch requests through the single modern workbench path.
 *
 * @deprecated Use {@link openLightsaberWorkbench} directly instead.
 *            This class will be pruned once legacy macros/imports are migrated.
 * @see openLightsaberWorkbench
 */

import { openLightsaberWorkbench } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

/**
 * @deprecated Compatibility wrapper for legacy imports. Use openLightsaberWorkbench.
 */
export class LightsaberConstructionApp {
  constructor(actor, itemOrOptions = {}, options = {}) {
    const itemLike = itemOrOptions && typeof itemOrOptions === 'object' && ('system' in itemOrOptions || 'type' in itemOrOptions || 'documentName' in itemOrOptions);
    this.actor = actor;
    this.item = itemLike ? itemOrOptions : null;
    this.options = itemLike ? options : itemOrOptions || {};
    this._app = null;
  }

  static open(actor, item = null, options = {}) {
    return openLightsaberWorkbench(actor, item, {
      ...options,
      mode: options.mode || (item ? 'owned' : 'construct')
    });
  }

  render(force, options = {}) {
    this._app = LightsaberConstructionApp.open(this.actor, this.item, { ...this.options, ...options });
    return this._app;
  }

  close(options = {}) {
    return this._app?.close?.(options);
  }
}

export default LightsaberConstructionApp;
