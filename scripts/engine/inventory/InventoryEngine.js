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
    const item = actor?.items?.get(itemId);
    if (!actor || !item) return;

    const currentEquipped = item.system?.equipped === true;
    const newValue = !currentEquipped;

    const updates = [];

    // Shields are modeled as armor items with armorType === "shield".
    const itemArmorType = String(item.system?.armorType ?? "").toLowerCase();
    const isShield = item.type === "armor" && itemArmorType === "shield";
    const isBodyArmor = item.type === "armor" && itemArmorType !== "shield";

    // If equipping BODY armor, unequip other equipped BODY armor first.
    // Do NOT unequip shields.
    if (newValue === true && isBodyArmor) {
      const otherBodyArmor = actor.items.filter(i => {
        if (i.id === itemId) return false;
        if (i.type !== "armor") return false;
        if (i.system?.equipped !== true) return false;

        const otherArmorType = String(i.system?.armorType ?? "").toLowerCase();
        return otherArmorType !== "shield";
      });

      for (const armorItem of otherBodyArmor) {
        updates.push({
          _id: armorItem.id,
          "system.equipped": false
        });
      }
    }

    // If equipping a shield, allow body armor to remain equipped.
    // Just toggle the shield itself.

    updates.push({
      _id: itemId,
      "system.equipped": newValue
    });

    await ActorEngine.updateOwnedItems(actor, updates, {
      source: "InventoryEngine.toggleEquip"
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

    await ActorEngine.updateActor(actor, {
      [`items.${itemId}.system.quantity`]: current + 1
    }, { source: "InventoryEngine.incrementQuantity" });
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
      await this.removeItem(actor, itemId);
    } else {
      // Decrement
      await ActorEngine.updateActor(actor, {
        [`items.${itemId}.system.quantity`]: current - 1
      }, { source: "InventoryEngine.decrementQuantity" });
    }
  }

  /**
   * Remove an embedded item through ActorEngine authority.
   */
  static async removeItem(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return;

    await ActorEngine.deleteEmbeddedDocuments(actor, "Item", [itemId], {
      source: "InventoryEngine.removeItem"
    });
  }
}
