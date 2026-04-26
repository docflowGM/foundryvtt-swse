// scripts/apps/customization/customization-workbench-setup.js
/**
 * Customization Workbench Setup
 * Registers the app and wires launch points from actor sheets and item sheets.
 */

import CustomizationWorkbenchApp from "/systems/foundryvtt-swse/scripts/apps/customization/customization-workbench-app.js";

export function setupCustomizationWorkbench() {
  // Register the application
  CONFIG.CustomizationWorkbench = CustomizationWorkbenchApp;

  // Add to window for quick access
  window.CustomizationWorkbench = CustomizationWorkbenchApp;

  // Log registration
  console.log('[SWSE] Customization Workbench registered');
}

/**
 * Add "Customize" button to item context menus and sheets.
 * Called during item sheet render lifecycle.
 */
export function injectCustomizeButton(event, html, data) {
  // Only for customizable items
  const item = data.item || data.document;
  if (!isCustomizableItem(item)) return;

  const customizableCategories = ['weapon', 'equipment', 'armor', 'bodysuit', 'droid'];
  if (!customizableCategories.includes(item.type)) return;

  // Add button to item sheet
  const buttons = html.querySelector('.item-sheet-buttons') ||
                  html.querySelector('.window-content .form-group:first-child');

  if (buttons) {
    const customizeBtn = document.createElement('button');
    customizeBtn.type = 'button';
    customizeBtn.className = 'btn btn-primary customization-sheet-button';
    customizeBtn.innerHTML = '<i class="fas fa-tools"></i> Customize';
    customizeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const actor = item.parent;
      if (!actor) {
        ui.notifications.warn('Item must be owned by an actor');
        return;
      }
      await CustomizationWorkbenchApp.createForItem(actor.uuid, item.uuid);
    });

    buttons.appendChild(customizeBtn);
  }
}

/**
 * Add "Open Workbench" buttons to actor equipment/inventory tabs.
 * Called during actor sheet render lifecycle.
 */
export function injectWorkbenchTabs(event, html, data) {
  const actor = data.actor || data.document;
  if (!actor.isOwner) return;

  // Find inventory section (varies by sheet layout)
  const inventorySections = html.querySelectorAll('[data-tab="inventory"]');

  inventorySections.forEach(section => {
    // Add filter buttons to category headers
    const categoryHeaders = section.querySelectorAll('.inventory-category-header, .category-label');

    categoryHeaders.forEach(header => {
      // Determine category from header or context
      const categoryRow = header.closest('[data-category]');
      if (!categoryRow) return;

      const category = categoryRow.dataset.category || 'gear';
      const workbenchBtn = document.createElement('button');
      workbenchBtn.type = 'button';
      workbenchBtn.className = 'btn btn-sm workbench-category-button';
      workbenchBtn.innerHTML = '<i class="fas fa-tools"></i> Open Workbench';
      workbenchBtn.title = `Open Customization Workbench for ${category}`;
      workbenchBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await CustomizationWorkbenchApp.createForCategory(actor.uuid, category);
      });

      header.appendChild(workbenchBtn);
    });
  });

  // Also add per-item "Customize" context buttons
  const itemRows = html.querySelectorAll('[data-item-id]');
  itemRows.forEach(row => {
    const itemId = row.dataset.itemId;
    const item = actor.items.get(itemId);
    if (!item || !isCustomizableItem(item)) return;

    const controlsContainer = row.querySelector('.item-controls') ||
                              row.querySelector('.controls') ||
                              row.appendChild(document.createElement('div'));

    const customizeControl = document.createElement('a');
    customizeControl.className = 'item-control customize-control';
    customizeControl.title = 'Customize Item';
    customizeControl.innerHTML = '<i class="fas fa-tools"></i>';
    customizeControl.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await CustomizationWorkbenchApp.createForItem(actor.uuid, item.uuid);
    });

    controlsContainer.appendChild(customizeControl);
  });
}

/**
 * Check if an item type is customizable.
 */
function isCustomizableItem(item) {
  if (!item) return false;

  const customizable = [
    'weapon',
    'equipment',
    'tool',
    'tech',
    'armor',
    'bodysuit',
    'droid'
  ];

  return customizable.includes(item.type) ||
         (item.type === 'weapon' && item.system?.weaponType === 'lightsaber');
}

/**
 * Register hooks for sheet rendering.
 * Called during system initialization.
 */
export function registerCustomizationHooks() {
  // Hook into various sheet render events
  Hooks.on('renderItemSheet', (app, html, data) => {
    injectCustomizeButton(null, html, { item: app.document });
  });

  Hooks.on('renderActorSheet', (app, html, data) => {
    injectWorkbenchTabs(null, html, { actor: app.document });
  });

  // Support for v2 application sheets
  Hooks.on('renderActorSheetV2', (app, html, data) => {
    injectWorkbenchTabs(null, html, { actor: app.actor || app.document });
  });

  console.log('[SWSE] Customization Workbench hooks registered');
}

/**
 * Helper to launch the workbench programmatically.
 */
export async function openCustomizationWorkbench(actorId, itemId = null, category = null) {
  try {
    const actor = await fromUuid(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found');
      return;
    }

    if (itemId) {
      await CustomizationWorkbenchApp.createForItem(actor.uuid, itemId);
    } else if (category) {
      await CustomizationWorkbenchApp.createForCategory(actor.uuid, category);
    } else {
      await CustomizationWorkbenchApp.createForCategory(actor.uuid, 'weapon');
    }
  } catch (error) {
    console.error('[CustomizationWorkbench]', error);
    ui.notifications.error(`Failed to open Customization Workbench: ${error.message}`);
  }
}

// Export for use in other modules
window.openCustomizationWorkbench = openCustomizationWorkbench;
