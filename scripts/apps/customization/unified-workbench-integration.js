/**
 * DEPRECATED UNIFIED WORKBENCH INTEGRATION SHIM
 *
 * The live SSOT launcher is openItemCustomization(). This file remains so older
 * initialization code can import it without silently restoring the pre-refactor
 * Blaster/Armor/Melee/Gear modal split.
 */

import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

export function integrateUnifiedCustomizationWorkbench(characterSheetClass) {
  const originalActivateCustomizeUI = characterSheetClass?.prototype?._activateCustomizeUI;
  if (!characterSheetClass?.prototype || characterSheetClass.prototype._swseWorkbenchShimInstalled) return;
  characterSheetClass.prototype._swseWorkbenchShimInstalled = true;
  characterSheetClass.prototype._activateCustomizeUI = function(html, { signal } = {}) {
    originalActivateCustomizeUI?.call(this, html, { signal });
    html.querySelectorAll('[data-action="customize-item"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        const item = itemId ? this.actor?.items?.get(itemId) : null;
        if (item) openItemCustomization(this.actor, item);
      }, { signal });
    });
  };
}

export function registerWorkbenchHelpers() {
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('gt', (a, b) => a > b);
  Handlebars.registerHelper('lt', (a, b) => a < b);
  Handlebars.registerHelper('sub', (a, b) => a - b);
  Handlebars.registerHelper('titleCase', (str) => {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  });
}

export function initializeUnifiedCustomizationWorkbench() {
  registerWorkbenchHelpers();
  console.log('[SWSE] Customization workbench compatibility shims initialized');
}

export default {
  integrateUnifiedCustomizationWorkbench,
  registerWorkbenchHelpers,
  initializeUnifiedCustomizationWorkbench
};
