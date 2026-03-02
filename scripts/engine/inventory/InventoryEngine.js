/**
 * InventoryEngine
 *
 * Handles all inventory mutations through ActorEngine.
 * Enforces:
 *   - Single equipped armor rule
 *   - Stackable vs unique item types
 *   - No direct item.update() or item.delete()
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const STACKABLE_TYPES = ["consumable", "equipment", "misc", "ammo"];
const NON_STACKABLE_TYPES = ["weapon", "armor", "shield"];

export class InventoryEngine {
  /**
   * Toggle equip status for an item.
   * For armor: unequip all other armor first (single equipped rule).
   */
  static async toggleEquip(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return;

    const newValue = !item.system.equipped;

    // If equipping armor, unequip all other armor first
    if (item.type === "armor" && newValue === true) {
      const otherArmor = actor.items.filter(
        i => i.type === "armor" && i.id !== itemId && i.system.equipped
      );

      for (const armorItem of otherArmor) {
        await ActorEngine.updateActor(actor.id, {
          [`items.${armorItem.id}.system.equipped`]: false
        });
      }
    }

    // Now set the target item
    await ActorEngine.updateActor(actor.id, {
      [`items.${itemId}.system.equipped`]: newValue
    });
  }

  /**
   * Increment quantity for stackable items.
   * Weapons and armor cannot be incremented (unique instances).
   */
  static async incrementQuantity(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return;

    // Only stackable types can increment
    if (!STACKABLE_TYPES.includes(item.type)) {
      return;
    }

    const current = item.system.quantity ?? 1;

    await ActorEngine.updateActor(actor.id, {
      [`items.${itemId}.system.quantity`]: current + 1
    });
  }

  /**
   * Decrement quantity for stackable items.
   * If quantity reaches 0, item is removed.
   */
  static async decrementQuantity(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return;

    // Only stackable types can decrement
    if (!STACKABLE_TYPES.includes(item.type)) {
      return;
    }

    const current = item.system.quantity ?? 1;

    if (current <= 1) {
      // Remove item if no quantity left
      await ActorEngine.updateActor(actor.id, {
        [`items.${itemId}`]: null
      });
    } else {
      // Decrement
      await ActorEngine.updateActor(actor.id, {
        [`items.${itemId}.system.quantity`]: current - 1
      });
    }
  }
}
