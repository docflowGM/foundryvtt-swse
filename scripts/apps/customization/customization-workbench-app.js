// scripts/apps/customization/customization-workbench-app.js
/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * The live V2 item customization UI is ItemCustomizationWorkbench, launched via
 * item-customization-router.js / openItemCustomization(). This class remains so
 * older imports and macros do not resurrect the pre-refactor workbench app.
 */

import {
  openItemCustomizationByReference,
  openWorkbenchForCategory,
  normalizeCategory
} from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

export default class CustomizationWorkbenchApp {
  constructor(options = {}) {
    this.options = options || {};
    this.actorId = this.options.actorId || this.options.actor || null;
    this.itemId = this.options.itemId || this.options.item || null;
    this.activeCategory = normalizeCategory(this.options.activeCategory || this.options.category || 'weapons');
    this._app = null;
  }

  static async createForItem(actorId, itemId, options = {}) {
    return openItemCustomizationByReference(actorId, itemId, options);
  }

  static async createForCategory(actorId, category = 'weapons', options = {}) {
    const actor = typeof actorId === 'string' && actorId.includes('.') ? await fromUuid(actorId) : game.actors?.get?.(actorId) || actorId;
    return openWorkbenchForCategory(actor, category, options);
  }

  async render(force, options = {}) {
    if (this.itemId) {
      this._app = await openItemCustomizationByReference(this.actorId, this.itemId, { ...this.options, ...options });
    } else {
      this._app = await CustomizationWorkbenchApp.createForCategory(this.actorId, this.activeCategory, { ...this.options, ...options });
    }
    return this._app;
  }

  async close(options = {}) {
    return this._app?.close?.(options);
  }
}
