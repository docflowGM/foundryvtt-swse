/**
 * CUSTOMIZATION ROUTING HELPER
 *
 * Centralized router for all customization requests.
 * Routes based on item type and opt-in unified workbench setting.
 *
 * Single source of truth for:
 * - Which items go to unified shell
 * - Which items fall back to old apps
 * - Opt-in gating for new features
 */

import { UnifiedCustomizationWorkbench } from "/systems/foundryvtt-swse/scripts/apps/customization/unified-customization-workbench.js";
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { MeleeWeaponModificationApp } from "/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js";
import { ArmorModificationApp } from "/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js";
import { GearModificationApp } from "/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js";
import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";

/**
 * Route a customization request to the appropriate modal.
 *
 * Phase 1+2A+2B+2C (Blaster, Melee, Armor, Gear, opt-in):
 * - If unified workbench opt-in enabled:
 *   - blaster → unified shell
 *   - melee weapon → unified shell
 *   - armor → unified shell
 *   - gear → unified shell
 * - Otherwise: all → old apps
 *
 * Phase 3 (Lightsaber, Droid):
 * - lightsaber → old app (not yet migrated)
 * - droid → old app (not yet migrated)
 *
 * @param {Actor} actor - The character customizing the item
 * @param {Item} item - The item to customize
 * @returns {void}
 */
export function routeCustomization(actor, item) {
  if (!actor || !item) return;

  try {
    // Check if unified workbench opt-in is enabled
    const useUnified = game.settings.get('foundryvtt-swse', 'useUnifiedCustomizationWorkbench');

    // Phase 1: Blaster (conditional routing)
    if (item.type === 'blaster') {
      if (useUnified) {
        new UnifiedCustomizationWorkbench(actor, item).render(true);
      } else {
        new BlasterCustomizationApp(actor, item).render(true);
      }
      return;
    }

    // Phase 2A: Melee weapons (conditional routing)
    if (item.type === 'weapon' && item.system?.weaponType !== 'lightsaber') {
      if (useUnified) {
        new UnifiedCustomizationWorkbench(actor, item).render(true);
      } else {
        new MeleeWeaponModificationApp(actor, item).render(true);
      }
      return;
    }

    // Phase 2B: Armor (conditional routing)
    if (item.type === 'armor' || item.type === 'bodysuit') {
      if (useUnified) {
        new UnifiedCustomizationWorkbench(actor, item).render(true);
      } else {
        new ArmorModificationApp(actor, item).render(true);
      }
      return;
    }

    // Phase 2C: Gear (conditional routing)
    if (item.type === 'equipment' || item.type === 'gear') {
      if (useUnified) {
        new UnifiedCustomizationWorkbench(actor, item).render(true);
      } else {
        new GearModificationApp(actor, item).render(true);
      }
      return;
    }

    // Phase 3: Other items (lightsaber, droid, etc.)
    switch (item.type) {
      case 'weapon':
        // Lightsaber (weaponType==='lightsaber')
        new LightsaberConstructionApp(actor).render(true);
        break;

      default:
        ui?.notifications?.warn?.(`No customization available for ${item.type}`);
    }
  } catch (err) {
    console.error('[CustomizationRouter] Routing failed:', err);
    ui?.notifications?.error?.('Failed to open customization modal');
  }
}

export default {
  routeCustomization
};
