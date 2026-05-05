// scripts/apps/customization/customization-workbench-setup.js
/**
 * DEPRECATED CUSTOMIZATION WORKBENCH SETUP SHIM
 *
 * This module used to register and inject an older standalone workbench app.
 * Phase 4 keeps the public functions alive for legacy imports, but every launch
 * now routes to item-customization-router.js / openItemCustomization().
 */

import {
  installCustomizationLauncherGlobals,
  isCustomizableItem,
  normalizeCategory,
  openCustomizationWorkbench,
  openItemCustomization,
  openItemCustomizationByReference,
  openWorkbenchForCategory
} from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { ItemCustomizationWorkbench } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js";

export function setupCustomizationWorkbench() {
  installCustomizationLauncherGlobals();
  CONFIG.CustomizationWorkbench = ItemCustomizationWorkbench;
  window.CustomizationWorkbench = ItemCustomizationWorkbench;
  console.log('[SWSE] Customization Workbench launcher registered');
}

function getHtmlRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

/**
 * Add "Customize" button to item sheets. Legacy render hook support only; V2
 * sheets should prefer template data-action="customize-item" bindings.
 */
export function injectCustomizeButton(event, html, data) {
  const root = getHtmlRoot(html);
  const item = data?.item || data?.document;
  if (!root || !isCustomizableItem(item)) return;

  const buttons = root.querySelector('.item-sheet-buttons') ||
                  root.querySelector('.window-content .form-group:first-child');
  if (!buttons || buttons.querySelector('.customization-sheet-button')) return;

  const customizeBtn = document.createElement('button');
  customizeBtn.type = 'button';
  customizeBtn.className = 'btn btn-primary customization-sheet-button';
  customizeBtn.innerHTML = '<i class="fas fa-tools"></i> Customize';
  customizeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const actor = item.parent || item.actor;
    if (!actor) {
      ui.notifications.warn('Item must be owned by an actor');
      return;
    }
    await openItemCustomization(actor, item);
  });

  buttons.appendChild(customizeBtn);
}

/**
 * Add legacy actor-sheet workbench launchers. This remains intentionally thin:
 * the modern workbench owns UI state and engines own mutation authority.
 */
export function injectWorkbenchTabs(event, html, data) {
  const root = getHtmlRoot(html);
  const actor = data?.actor || data?.document;
  if (!root || !actor?.isOwner) return;

  const inventorySections = root.querySelectorAll('[data-tab="inventory"]');
  inventorySections.forEach(section => {
    const categoryHeaders = section.querySelectorAll('.inventory-category-header, .category-label');

    categoryHeaders.forEach(header => {
      const categoryRow = header.closest('[data-category]');
      if (!categoryRow || header.querySelector('.workbench-category-button')) return;

      const category = normalizeCategory(categoryRow.dataset.category || 'gear') || 'gear';
      const workbenchBtn = document.createElement('button');
      workbenchBtn.type = 'button';
      workbenchBtn.className = 'btn btn-sm workbench-category-button';
      workbenchBtn.innerHTML = '<i class="fas fa-tools"></i> Open Workbench';
      workbenchBtn.title = `Open Customization Workbench for ${category}`;
      workbenchBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await openWorkbenchForCategory(actor, category);
      });

      header.appendChild(workbenchBtn);
    });
  });

  const itemRows = root.querySelectorAll('[data-item-id]');
  itemRows.forEach(row => {
    if (row.querySelector('.customize-control')) return;
    const itemId = row.dataset.itemId;
    const item = actor.items?.get?.(itemId);
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
      await openItemCustomization(actor, item);
    });

    controlsContainer.appendChild(customizeControl);
  });
}

/**
 * Register compatibility hooks for older sheet render paths.
 */
export function registerCustomizationHooks() {
  Hooks.on('renderItemSheet', (app, html, data) => {
    injectCustomizeButton(null, html, { item: app.document || data?.document });
  });

  Hooks.on('renderActorSheet', (app, html, data) => {
    injectWorkbenchTabs(null, html, { actor: app.document || data?.actor });
  });

  Hooks.on('renderActorSheetV2', (app, html, data) => {
    injectWorkbenchTabs(null, html, { actor: app.actor || app.document || data?.actor });
  });

  console.log('[SWSE] Customization Workbench compatibility hooks registered');
}

export { openCustomizationWorkbench, openItemCustomization, openItemCustomizationByReference };

// Legacy global is intentionally kept, but it now points at the modern router.
window.openCustomizationWorkbench = openCustomizationWorkbench;
