/**
 * Abilities, feats, and talents panel UI activation for SWSEV2CharacterSheet
 *
 * Handles opening ability sheets, adding feats/talents, and item creation
 */

import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";

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

  // === INVENTORY: ADD ITEM BUTTONS (Gear tab) ===
  html.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="add-item"]');
    if (!button) return;

    event.preventDefault();
    const itemType = button.dataset.itemType;
    if (!itemType) return;

    try {
      const createData = itemType === "shield"
        ? {
            name: "New Shield",
            type: "armor",
            system: {
              armorType: "shield",
              shieldRating: 0,
              currentSR: 0,
              charges: { current: 0, max: 0 },
              activated: false
            }
          }
        : {
            name: `New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
            type: itemType,
            system: {}
          };

      await sheet.actor.createEmbeddedDocuments("Item", [createData]);

      ui.notifications.info(`Created new ${itemType}`);
    } catch (err) {
      // console.error(`[GEAR] Failed to create ${itemType}:`, err);
      ui.notifications.error(`Failed to create item: ${err.message}`);
    }
  });

  // Add feat button
  html.querySelectorAll('[data-action="add-feat"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      sheet._showItemSelectionModal('feat');
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
      sheet._showItemSelectionModal('talent');
    }, { signal });
  });
}
