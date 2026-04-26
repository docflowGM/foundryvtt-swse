import { ItemCustomizationWorkbench } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js";
import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { ArmorModificationApp } from "/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js";
import { MeleeWeaponModificationApp } from "/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js";
import { GearModificationApp } from "/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js";

export function openItemCustomization(actor, item) {
  if (!actor || !item) return null;

  try {
    if (ItemCustomizationWorkbench.supportsItem(item)) {
      const category = item.type === 'blaster' || item.type === 'weapon' ? 'weapons' : (item.type === 'armor' || item.type === 'bodysuit' ? 'armor' : 'gear');
      return new ItemCustomizationWorkbench(actor, {
        itemId: item.id,
        category
      }).render(true);
    }

    switch (item.type) {
      case 'lightsaber':
        return new LightsaberConstructionApp(actor).render(true);
      case 'blaster':
        return new BlasterCustomizationApp(actor, item).render(true);
      case 'armor':
      case 'bodysuit':
        return new ArmorModificationApp(actor, item).render(true);
      case 'weapon':
        return new MeleeWeaponModificationApp(actor, item).render(true);
      case 'gear':
      case 'equipment':
        return new GearModificationApp(actor, item).render(true);
      default:
        ui?.notifications?.warn?.(`No customization available for ${item.type}`);
        return null;
    }
  } catch (error) {
    console.error('[CustomizationRouter] Failed to open customization UI', error);
    ui?.notifications?.error?.('Failed to open customization interface');
    return null;
  }
}
