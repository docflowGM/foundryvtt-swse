/**
 * Inventory Handlers — Character Sheet Inventory Interactions
 *
 * Manages event handlers for inventory cards (weapons, armor, items).
 * Integrates with configuration dialogs and item management.
 */

import { SWSELogger as swseLogger } from '../../utils/logger.js';
import WeaponConfigDialog from './weapon-config-dialog.js';

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
        await this._toggleWeaponEquipped(weapon);
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
        await this._toggleArmorEquipped(armor);
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
   * Toggle weapon equipped status
   * @private
   */
  static async _toggleWeaponEquipped(weapon) {
    try {
      await weapon.update({ 'system.equipped': !weapon.system.equipped });
      swseLogger.info(`[InventoryHandlers] Toggled equipped: ${weapon.name}`);
    } catch (err) {
      swseLogger.error(`[InventoryHandlers] Error toggling weapon equipped:`, err);
      ui.notifications.error(`Failed to equip weapon: ${err.message}`);
    }
  }

  /**
   * Toggle armor equipped status
   * @private
   */
  static async _toggleArmorEquipped(armor) {
    try {
      await armor.update({ 'system.equipped': !armor.system.equipped });
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
}

export default InventoryHandlers;
