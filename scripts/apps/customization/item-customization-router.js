import { ItemCustomizationWorkbench } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js";

function resolveCategory(item, fallback = null) {
  if (fallback) return fallback;
  if (!item) return null;
  const subtype = String(item.system?.subtype || item.system?.weaponCategory || '').toLowerCase();
  if (item.type === 'lightsaber' || subtype === 'lightsaber') return 'lightsaber';
  if (item.type === 'blaster' || item.type === 'weapon') return 'weapons';
  if (item.type === 'armor' || item.type === 'bodysuit') return 'armor';
  if (item.type === 'gear' || item.type === 'equipment') return 'gear';
  return null;
}

/**
 * Open the one true first-wave item workbench.
 *
 * All character sheet, store, and shell launchers should route here. Specialized
 * engines still remain SSOT under the hood; this router only chooses the live
 * workbench shell/category/mode.
 *
 * @param {Actor} actor
 * @param {Item|Object|null} item
 * @param {Object} options
 * @returns {ApplicationV2|null}
 */
export function openItemCustomization(actor, item = null, options = {}) {
  if (!actor) return null;

  try {
    const sourceItem = options.sourceItem || item || null;
    const category = resolveCategory(sourceItem, options.initialCategory || options.category);
    const itemId = sourceItem?.id || sourceItem?._id || options.itemId || null;

    if (sourceItem && !ItemCustomizationWorkbench.supportsItem(sourceItem)) {
      ui?.notifications?.warn?.(`No customization available for ${sourceItem.type}`);
      return null;
    }

    return new ItemCustomizationWorkbench(actor, {
      itemId,
      category: category || 'weapons',
      mode: options.mode || options.inventoryMode || 'owned',
      sourceItem,
      applyMode: options.applyMode,
      onStage: options.onStage
    }).render(true);
  } catch (error) {
    console.error('[CustomizationRouter] Failed to open customization UI', error);
    ui?.notifications?.error?.('Failed to open customization interface');
    return null;
  }
}

export function openLightsaberWorkbench(actor, item = null, options = {}) {
  return openItemCustomization(actor, item, { ...options, initialCategory: 'lightsaber' });
}
