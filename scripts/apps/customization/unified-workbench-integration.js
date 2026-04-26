/**
 * UNIFIED CUSTOMIZATION WORKBENCH INTEGRATION
 *
 * Patches character sheet routing to use the new unified workbench
 * while maintaining fallback to existing apps during migration.
 *
 * Migration status:
 * - Phase 1 (Weapons): Routes to unified workbench (fallback to old apps if needed)
 * - Phase 2 (Armor, Gear): TODO
 * - Phase 3 (Lightsaber, Droids): TODO
 */

import UnifiedCustomizationWorkbench from "/systems/foundryvtt-swse/scripts/apps/customization/unified-customization-workbench.js";

// Import existing apps as fallback
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { MeleeWeaponModificationApp } from "/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js";
import { ArmorModificationApp } from "/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js";
import { GearModificationApp } from "/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js";
import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";

/**
 * Replace character sheet customization routing.
 *
 * This function should be called during character sheet initialization.
 * It patches the existing "customize-item" handler to use the new unified workbench.
 */
export function integrateUnifiedCustomizationWorkbench(characterSheetClass) {
  const originalActivateCustomizeUI = characterSheetClass.prototype._activateCustomizeUI;

  characterSheetClass.prototype._activateCustomizeUI = function(html, { signal } = {}) {
    // Call original to set up base handlers
    originalActivateCustomizeUI?.call(this, html, { signal });

    // OVERRIDE: Customize item handler
    html.querySelectorAll('[data-action="customize-item"]').forEach(button => {
      button.removeEventListener('click', null); // Clear old listeners
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        // Route to unified workbench
        // Phase 1: Try unified workbench for weapons
        const unifiedCategories = ['weapon', 'blaster'];
        if (unifiedCategories.includes(item.type)) {
          new UnifiedCustomizationWorkbench(this.actor, item).render(true);
          return;
        }

        // Fallback: Use existing apps for other categories (Phase 2, 3)
        try {
          switch (item.type) {
            case "lightsaber":
              new LightsaberConstructionApp(this.actor).render(true);
              break;
            case "armor":
            case "bodysuit":
              new ArmorModificationApp(this.actor, item).render(true);
              break;
            case "equipment":
            case "gear":
              new GearModificationApp(this.actor, item).render(true);
              break;
            case "droid":
              // TODO: Add droid customization when available
              ui.notifications.warn("Droid customization not yet available");
              break;
            default:
              ui.notifications.warn(`No customization available for ${item.type}`);
          }
        } catch (err) {
          console.error("[UnifiedCustomizationWorkbench] Routing failed:", err);
          ui.notifications.error("Failed to open customization interface");
        }
      }, { signal });
    });
  };
}

/**
 * Register Handlebars helpers needed by the unified workbench.
 */
export function registerWorkbenchHelpers() {
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('gt', (a, b) => a > b);
  Handlebars.registerHelper('lt', (a, b) => a < b);
  Handlebars.registerHelper('sub', (a, b) => a - b);
  Handlebars.registerHelper('titleCase', (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
}

/**
 * Initialize the unified customization workbench.
 * Call this once during system init.
 */
export function initializeUnifiedCustomizationWorkbench() {
  console.log('[SWSE] Unified Customization Workbench initialized');

  // Register helpers
  registerWorkbenchHelpers();

  // Patch character sheet if it's available
  if (CONFIG.Actor?.sheetClasses?.['character']) {
    // The sheet will be patched when it's instantiated
    // (or manually patch specific sheets as needed)
  }
}

export default {
  integrateUnifiedCustomizationWorkbench,
  registerWorkbenchHelpers,
  initializeUnifiedCustomizationWorkbench
};
