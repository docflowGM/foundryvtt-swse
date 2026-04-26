import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
/**
 * Inventory UI event listener registration
 *
 * Handles all inventory-related interactions:
 * - Item equip/unequip toggles
 * - Item editing and deletion
 * - Quantity management
 * - Item selling
 * - Gear tab interactions
 */

import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { initiateItemSale } from "/systems/foundryvtt-swse/scripts/apps/item-selling-system.js";

/**
 * Activate inventory UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateInventoryUI(sheet, html, { signal } = {}) {
  if (!sheet || !html) return;

  // Equip / Unequip toggle
  html.querySelectorAll(".item-equip").forEach(button => {
    button.addEventListener("click", async (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row?.dataset.itemId;
      if (itemId) await InventoryEngine.toggleEquip(sheet.actor, itemId);
    }, { signal });
  });

  // Edit item
  html.querySelectorAll(".item-edit").forEach(button => {
    button.addEventListener("click", (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row?.dataset.itemId;
      if (itemId) sheet.actor.items.get(itemId)?.sheet.render(true);
    }, { signal });
  });

  // Add/increment quantity
  html.querySelectorAll(".item-add").forEach(button => {
    button.addEventListener("click", async (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row?.dataset.itemId;
      if (itemId) await InventoryEngine.incrementQuantity(sheet.actor, itemId);
    }, { signal });
  });

  // Sell item
  html.querySelectorAll(".item-sell").forEach(button => {
    button.addEventListener("click", async (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row?.dataset.itemId;
      if (itemId) {
        const item = sheet.actor.items.get(itemId);
        if (item) {
          await initiateItemSale(item, sheet.actor);
        }
      }
    }, { signal });
  });

  // Delete/Remove item
  html.querySelectorAll('[data-action="delete"], [data-action="equip"], [data-action="edit"], [data-action="configure"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const action = button.dataset.action;
      const itemId = button.dataset.itemId || event.currentTarget.closest("[data-item-id]")?.dataset.itemId;

      if (!itemId) return;
      const item = sheet.actor.items.get(itemId);
      if (!item) return;

      switch (action) {
        case "delete":
          await InventoryEngine.removeItem(sheet.actor, itemId);
          break;
        case "equip":
          await InventoryEngine.toggleEquip(sheet.actor, itemId);
          break;
        case "edit":
          item.sheet.render(true);
          break;
        case "configure":
          openItemCustomization(sheet.actor, item);
          break;
      }
    }, { signal });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GEAR TAB HANDLERS (V2 sheet)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Open item sheet
  html.querySelectorAll('[data-action="open-item"]').forEach(button => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (itemId) {
        const item = sheet.actor.items.get(itemId);
        if (item) item.sheet.render(true);
      }
    }, { signal });
  });

  // Equip item
  html.querySelectorAll('[data-action="equip-item"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (itemId) await InventoryEngine.toggleEquip(sheet.actor, itemId);
    }, { signal });
  });

  // Edit item
  html.querySelectorAll('[data-action="edit-item"]').forEach(button => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (itemId) {
        const item = sheet.actor.items.get(itemId);
        if (item) item.sheet.render(true);
      }
    }, { signal });
  });

  // Delete item
  html.querySelectorAll('[data-action="delete-item"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (itemId) await InventoryEngine.removeItem(sheet.actor, itemId);
    }, { signal });
  });
}
