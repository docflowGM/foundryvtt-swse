/**
 * Abilities, feats, and talents panel UI activation for SWSEV2CharacterSheet
 *
 * Handles opening ability sheets, adding feats/talents, and item creation
 */

import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { openForceAlchemyWorkbench } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-workbench-app.js";

/**
 * Activate abilities panel UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateAbilitiesUI(sheet, html, { signal } = {}) {
  // Open ability/feat/talent sheet
  html.querySelectorAll('[data-action="open-ability"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      const item = sheet.actor.items.get(itemId);
      if (item) {
        item.sheet.render(true);
      }
    }, { signal });
  });



  html.querySelectorAll('[data-action="open-force-alchemy-workbench"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openForceAlchemyWorkbench(sheet.actor, {
        launchSource: 'talents-tab',
        riteId: button.dataset.riteId || null,
        activeCategory: button.dataset.category || null
      });
    }, { signal });
  });

  // Add feat button
  html.querySelectorAll('[data-action="add-feat"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await sheet._createAndOpenBlankItem?.('feat');
    }, { signal });
  });

  // Delete feat button
  html.querySelectorAll('[data-action="delete-feat"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      await InventoryEngine.removeItem(sheet.actor, itemId);
    }, { signal });
  });

  // Add talent button
  html.querySelectorAll('[data-action="add-talent"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await sheet._createAndOpenBlankItem?.('talent');
    }, { signal });
  });
}
