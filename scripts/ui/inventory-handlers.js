/**
 * Inventory Handlers — Character Sheet Inventory Interactions
 *
 * Manages event handlers for inventory cards (weapons, armor, items).
 * Integrates with configuration dialogs and item management.
 */

import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import WeaponConfigDialog from "/systems/foundryvtt-swse/scripts/ui/weapon-config-dialog.js";

export class InventoryHandlers {
  /**
   * Initialize inventory event handlers on character sheet
   * @param {Actor} actor - Character actor
   * @param {HTMLElement} container - Container with inventory cards
   */
  static initInventory(actor, container) {
    if (!container) return;

    // Weapon card handlers
    const weaponCards = container.querySelectorAll('.inventory-weapon-card');
    weaponCards.forEach(card => {
      this._setupWeaponCardHandlers(actor, card);
    });

    // Armor card handlers
    const armorCards = container.querySelectorAll('.inventory-armor-card');
    armorCards.forEach(card => {
      this._setupArmorCardHandlers(actor, card);
    });

    // Equipment card handlers
    const equipmentCards = container.querySelectorAll('.inventory-equipment-card');
    equipmentCards.forEach(card => {
      this._setupEquipmentCardHandlers(actor, card);
    });

    swseLogger.debug(`[InventoryHandlers] Initialized handlers for inventory`);
  }

  /**
   * Setup weapon card event handlers
   * @private
   */
  static _setupWeaponCardHandlers(actor, card) {
    const itemId = card.dataset.itemId;
    const weapon = actor.items.get(itemId);

    if (!weapon) return;

    // Equip button
    const equipBtn = card.querySelector('button[data-action="equip"]');
    if (equipBtn) {
      equipBtn.addEventListener('click', async () => {
        await this._toggleWeaponEquipped(actor, weapon);
      });
    }

    // Configure button
    const configBtn = card.querySelector('button[data-action="configure"]');
    if (configBtn) {
      configBtn.addEventListener('click', async () => {
        await WeaponConfigDialog.open(weapon);
      });
    }

    // Edit button (opens item sheet)
    const editBtn = card.querySelector('button[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        weapon.sheet.render(true);
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('button[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await this._deleteWeapon(weapon);
      });
    }
  }

  /**
   * Setup armor card event handlers
   * @private
   */
  static _setupArmorCardHandlers(actor, card) {
    const itemId = card.dataset.itemId;
    const armor = actor.items.get(itemId);

    if (!armor) return;

    // Equip button
    const equipBtn = card.querySelector('button[data-action="equip"]');
    if (equipBtn) {
      equipBtn.addEventListener('click', async () => {
        await this._toggleArmorEquipped(actor, armor);
      });
    }

    // Edit button (opens item sheet)
    const editBtn = card.querySelector('button[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        armor.sheet.render(true);
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('button[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await this._deleteArmor(armor);
      });
    }
  }

  /**
   * Setup equipment card event handlers
   * @private
   */
  static _setupEquipmentCardHandlers(actor, card) {
    const itemId = card.dataset.itemId;
    const equipment = actor.items.get(itemId);

    if (!equipment) return;

    // Equip button
    const equipBtn = card.querySelector('button[data-action="equip"]');
    if (equipBtn) {
      equipBtn.addEventListener('click', async () => {
        await this._toggleEquipmentEquipped(actor, equipment);
      });
    }

    // Edit button (opens item sheet)
    const editBtn = card.querySelector('button[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        equipment.sheet.render(true);
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('button[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await this._deleteEquipment(equipment);
      });
    }
  }

  /**
   * Toggle weapon equipped status
   *
   * ⚠️ GOVERNANCE: Routes through actor's updateOwnedItem to ensure:
   * - MutationInterceptor authorization checking
   * - Proper actor recomputation on equipment change
   * - Integrity validation after equipment state change
   *
   * @private
   * @param {Actor} actor - Parent actor
   * @param {Item} weapon - Weapon to toggle
   */
  static async _toggleWeaponEquipped(actor, weapon) {
    try {
      // PHASE 5: Route through ActorEngine via updateOwnedItem
      await actor.updateOwnedItem(weapon, { 'system.equipped': !weapon.system.equipped });
      swseLogger.info(`[InventoryHandlers] Toggled equipped: ${weapon.name}`);
    } catch (err) {
      swseLogger.error(`[InventoryHandlers] Error toggling weapon equipped:`, err);
      ui.notifications.error(`Failed to equip weapon: ${err.message}`);
    }
  }

  /**
   * Toggle armor equipped status
   *
   * ⚠️ GOVERNANCE: Routes through actor's updateOwnedItem to ensure:
   * - MutationInterceptor authorization checking
   * - Proper actor recomputation on equipment change
   * - Integrity validation after equipment state change
   *
   * @private
   * @param {Actor} actor - Parent actor
   * @param {Item} armor - Armor to toggle
   */
  static async _toggleArmorEquipped(actor, armor) {
    try {
      // PHASE 5: Route through ActorEngine via updateOwnedItem
      await actor.updateOwnedItem(armor, { 'system.equipped': !armor.system.equipped });
      swseLogger.info(`[InventoryHandlers] Toggled equipped: ${armor.name}`);
    } catch (err) {
      swseLogger.error(`[InventoryHandlers] Error toggling armor equipped:`, err);
      ui.notifications.error(`Failed to equip armor: ${err.message}`);
    }
  }

  /**
   * Delete weapon from inventory
   * @private
   */
  static async _deleteWeapon(weapon) {
    const confirmed = await Dialog.confirm({
      title: 'Delete Weapon',
      content: `<p>Are you sure you want to delete <strong>${weapon.name}</strong>?</p>`,
      yes: async () => {
        try {
          await weapon.delete();
          swseLogger.info(`[InventoryHandlers] Deleted weapon: ${weapon.name}`);
          ui.notifications.info(`Deleted "${weapon.name}"`);
        } catch (err) {
          swseLogger.error(`[InventoryHandlers] Error deleting weapon:`, err);
          ui.notifications.error(`Failed to delete weapon: ${err.message}`);
        }
      },
      no: () => {}
    });
  }

  /**
   * Delete armor from inventory
   * @private
   */
  static async _deleteArmor(armor) {
    const confirmed = await Dialog.confirm({
      title: 'Delete Armor',
      content: `<p>Are you sure you want to delete <strong>${armor.name}</strong>?</p>`,
      yes: async () => {
        try {
          await armor.delete();
          swseLogger.info(`[InventoryHandlers] Deleted armor: ${armor.name}`);
          ui.notifications.info(`Deleted "${armor.name}"`);
        } catch (err) {
          swseLogger.error(`[InventoryHandlers] Error deleting armor:`, err);
          ui.notifications.error(`Failed to delete armor: ${err.message}`);
        }
      },
      no: () => {}
    });
  }

  /**
   * Toggle equipment equipped status
   *
   * ⚠️ GOVERNANCE: Routes through actor's updateOwnedItem to ensure:
   * - MutationInterceptor authorization checking
   * - Proper actor recomputation on equipment change
   * - Integrity validation after equipment state change
   *
   * @private
   * @param {Actor} actor - Parent actor
   * @param {Item} equipment - Equipment to toggle
   */
  static async _toggleEquipmentEquipped(actor, equipment) {
    try {
      // PHASE 5: Route through ActorEngine via updateOwnedItem
      await actor.updateOwnedItem(equipment, { 'system.equipped': !equipment.system.equipped });
      swseLogger.info(`[InventoryHandlers] Toggled equipped: ${equipment.name}`);
    } catch (err) {
      swseLogger.error(`[InventoryHandlers] Error toggling equipment equipped:`, err);
      ui.notifications.error(`Failed to equip equipment: ${err.message}`);
    }
  }

  /**
   * Delete equipment from inventory
   * @private
   */
  static async _deleteEquipment(equipment) {
    const confirmed = await Dialog.confirm({
      title: 'Delete Equipment',
      content: `<p>Are you sure you want to delete <strong>${equipment.name}</strong>?</p>`,
      yes: async () => {
        try {
          await equipment.delete();
          swseLogger.info(`[InventoryHandlers] Deleted equipment: ${equipment.name}`);
          ui.notifications.info(`Deleted "${equipment.name}"`);
        } catch (err) {
          swseLogger.error(`[InventoryHandlers] Error deleting equipment:`, err);
          ui.notifications.error(`Failed to delete equipment: ${err.message}`);
        }
      },
      no: () => {}
    });
  }
}

export default InventoryHandlers;
