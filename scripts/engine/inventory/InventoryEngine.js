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
import { LightsaberLightSync } from "/systems/foundryvtt-swse/scripts/utils/lightsaber-light-sync.js";
import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";
import { isEnergyShieldItem, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

const STACKABLE_TYPES = ["consumable", "equipment", "misc", "ammo"];
const NON_STACKABLE_TYPES = ["weapon", "armor", "shield", "lightsaber"];

function isTruthyState(value) {
  if (value === true || Number(value) === 1) return true;
  if (value && typeof value === "object") {
    return isTruthyState(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
  }
  return ["true", "1", "yes", "equipped", "worn", "held", "readied", "ready", "on", "active"].includes(String(value || "").toLowerCase());
}

function isEnergyShield(item) {
  return isEnergyShieldItem(item);
}


export class InventoryEngine {
  /**
   * Toggle equip status for an item.
   * For armor: unequip all other armor first (single equipped rule).
   */
  static async toggleEquip(actor, itemId) {
    const item = actor?.items?.get(itemId);
    if (!actor || !item) return;

    const currentEquipped = isTruthyState(item.system?.equipped)
      || isTruthyState(item.system?.isEquipped)
      || isTruthyState(item.system?.equippable?.equipped);
    const newValue = !currentEquipped;
    const isLightsaber = WeaponVisualProfileResolver.isLightsaber(item);

    const updates = [];

    // Shields are modeled as armor items and resolved through the armor SSOT.
    const itemArmor = item.type === "armor" ? resolveArmorData(item) : null;
    const isShield = itemArmor?.isEnergyShield === true;
    const isBodyArmor = item.type === "armor" && !isShield;

    // If equipping BODY armor, unequip other equipped BODY armor first.
    // Do NOT unequip shields.
    if (newValue === true && isBodyArmor) {
      const otherBodyArmor = actor.items.filter(i => {
        if (i.id === itemId) return false;
        if (i.type !== "armor") return false;
        if (i.system?.equipped !== true) return false;

        return !isEnergyShield(i);
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

    if (isLightsaber) {
      await LightsaberLightSync.syncActorTokenLight(actor, item);
    }
  }


  /**
   * Toggle an item's active state through the inventory engine.
   *
   * V2 contract: sheets may request the toggle, but this engine owns the
   * mutation. Lightsaber token light remains a visual consumer of item state,
   * not a sheet-side effect.
   */
  static async toggleActivated(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return;

    const current = item.system?.activated === true || item.system?.active === true;
    const next = !current;
    const update = {
      _id: itemId,
      "system.activated": next
    };

    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor });
    const shield = isEnergyShield(item);

    if (visualProfile.isLightsaber && next) {
      update["flags.foundryvtt-swse.emitLight"] = true;
      update["flags.foundryvtt-swse.bladeColor"] = visualProfile.bladeColor;
    }

    if (shield) {
      const armorStats = resolveArmorData(item);
      const shieldRating = Number(armorStats.shieldRating ?? 0) || 0;
      const currentCharges = Number(armorStats.chargesCurrent ?? 0) || 0;
      if (next) {
        if (shieldRating <= 0) {
          ui?.notifications?.warn?.(`${item.name} has no Shield Rating to activate.`);
          return;
        }
        if (currentCharges <= 0) {
          ui?.notifications?.warn?.(`${item.name} has no charges remaining.`);
          return;
        }
        update["system.currentSR"] = shieldRating;
        update["system.charges.current"] = Math.max(0, currentCharges - 1);
      } else {
        update["system.currentSR"] = 0;
      }
    }

    await ActorEngine.updateOwnedItems(actor, [update], {
      source: "InventoryEngine.toggleActivated"
    });

    if (visualProfile.isLightsaber) {
      await LightsaberLightSync.syncActorTokenLight(actor, item);
    }
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
