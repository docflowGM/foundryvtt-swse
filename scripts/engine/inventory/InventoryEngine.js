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
import { isItemEquipped } from "/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js";
import { isItemActivated } from "/systems/foundryvtt-swse/scripts/engine/inventory/item-activation-state.js";
import { resolveActionCost } from "/systems/foundryvtt-swse/scripts/engine/feats/action-speed-runtime-patches.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";

const STACKABLE_TYPES = ["consumable", "equipment", "misc", "ammo"];
const NON_STACKABLE_TYPES = ["weapon", "armor", "shield", "lightsaber"];

function isTruthyState(value) {
  if (value === true || Number(value) === 1) return true;
  if (value && typeof value === "object") {
    return isTruthyState(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
  }
  return ["true", "1", "yes", "equipped", "worn", "held", "readied", "ready", "on", "active"].includes(String(value || "").toLowerCase());
}

async function spendItemAction(actor, actionType, item, reason) {
  const result = await ActionEconomyConsumption.spend(actor, actionType, { source: "inventory-item-state", actionName: `${item?.name ?? "Item"}: ${reason}`, itemId: item?.id ?? null }, { notify: true });
  if (result?.allowed === false || result?.permitted === false) return { ok: false, result, rollback: async () => {} };
  return { ok: true, result, rollback: result?.rollback ?? (async () => {}) };
}

const isWeaponItem = (item) => ["weapon", "lightsaber"].includes(String(item?.type ?? "").toLowerCase());

function equipMirrors(item, update, next) {
  update["system.equipped"] = next;
  if (item.system?.isEquipped !== undefined) update["system.isEquipped"] = next;
  if (item.system?.equippable && typeof item.system.equippable === "object") update["system.equippable.equipped"] = next;
  if (item.flags?.swse?.equipped !== undefined) update["flags.swse.equipped"] = next;
  return update;
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

    const itemUpdate = {
      _id: itemId,
      "system.equipped": newValue
    };

    // Some generated items mirror equip state in legacy/nested fields. Keep
    // those mirrors in sync so starter lightsabers and other carried weapons
    // can actually be unequipped instead of being re-read as equipped.
    if (item.system?.isEquipped !== undefined) itemUpdate["system.isEquipped"] = newValue;
    if (item.system?.equippable && typeof item.system.equippable === "object") {
      itemUpdate["system.equippable.equipped"] = newValue;
    }
    if (item.flags?.swse?.equipped !== undefined) itemUpdate["flags.swse.equipped"] = newValue;

    updates.push(itemUpdate);

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
  static async toggleActivated(actor, itemId, options = {}) {
    const item = actor?.items?.get?.(itemId);
    if (!item) return { ok: false, reason: "missing-item" };
    return this.setActivated(actor, itemId, !isItemActivated(item), options);
  }

  /**
   * Set an item's active state. A player-requested change is a Swift Action through the existing action economy;
   * `free: true` is for future automatic state changes. A failed spend mutates nothing.
   */
  static async setActivated(actor, itemId, activated, { free = false } = {}) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return { ok: false, reason: "missing-item" };
    const next = activated === true;
    if (isItemActivated(item) === next) return { ok: true, changed: false, activated: next };

    const update = { _id: itemId, "system.activated": next };
    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor });
    const shield = isEnergyShield(item);

    if (next && visualProfile.isLightsaber && !isItemEquipped(item, actor)) return { ok: false, reason: "draw-before-activating" };
    if (next && shield && !isItemEquipped(item, actor)) return { ok: false, reason: "equip-before-activating" };

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
          return { ok: false, reason: "no-shield-rating" };
        }
        if (currentCharges <= 0) {
          ui?.notifications?.warn?.(`${item.name} has no charges remaining.`);
          return { ok: false, reason: "no-charges" };
        }
        update["system.currentSR"] = shieldRating;
        update["system.charges.current"] = Math.max(0, currentCharges - 1);
      } else {
        update["system.currentSR"] = 0;
      }
    }

    let spend = { ok: true, rollback: async () => {} };
    if (!free && (visualProfile.isLightsaber || shield)) {
      spend = await spendItemAction(actor, "swift", item, next ? "Activate" : "Deactivate");
      if (!spend.ok) return { ok: false, reason: "action-unavailable", actionType: "swift" };
    }

    try {
      await ActorEngine.updateOwnedItems(actor, [update], { source: "InventoryEngine.toggleActivated" });
    } catch (err) {
      await spend.rollback?.();
      throw err;
    }

    if (visualProfile.isLightsaber) await LightsaberLightSync.syncActorTokenLight(actor, item);
    return { ok: true, changed: true, activated: next };
  }

  /** Draw / stow a weapon (the owned Item's equipped state is the drawn state). Move Action, Swift with Quick Draw (existing feat metadata). */
  static async setWeaponReadied(actor, itemId, readied) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return { ok: false, reason: "missing-item" };
    if (!isWeaponItem(item)) return { ok: false, reason: "not-weapon" };
    const next = readied === true;
    const current = isItemEquipped(item, actor);
    if (current === next) return { ok: true, changed: false, readied: current };

    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor });
    if (!next && visualProfile?.isLightsaber === true && isItemActivated(item)) return { ok: false, reason: "deactivate-before-stowing" };

    const mutation = resolveActionCost(actor, "drawOrHolsterWeapon", { workflowValidated: true, weaponId: item.id, direction: next ? "draw" : "holster" });
    const actionType = mutation?.mutatedActionCost ?? mutation?.baseActionCost ?? "move";
    const spend = await spendItemAction(actor, actionType, item, next ? "Draw" : "Stow");
    if (!spend.ok) return { ok: false, reason: "action-unavailable", actionType };

    try {
      await ActorEngine.updateOwnedItems(actor, [equipMirrors(item, { _id: item.id }, next)], { source: "InventoryEngine.setWeaponReadied" });
    } catch (err) {
      await spend.rollback?.();
      throw err;
    }
    if (visualProfile?.isLightsaber === true) await LightsaberLightSync.syncActorTokenLight(actor, item);
    return { ok: true, changed: true, readied: next, actionType };
  }

  static async toggleWeaponReadied(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!item) return { ok: false, reason: "missing-item" };
    return this.setWeaponReadied(actor, itemId, !isItemEquipped(item, actor));
  }

  /** Quick Draw + Weapon Proficiency (Lightsabers): draw AND ignite as ONE Swift Action, only when the existing feat resolver exposes the combined effect. */
  static async drawAndActivateLightsaber(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return { ok: false, reason: "missing-item" };
    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor });
    if (!visualProfile?.isLightsaber) return { ok: false, reason: "not-lightsaber" };
    if (isItemEquipped(item, actor) || isItemActivated(item)) return { ok: false, reason: "not-stowed-and-inactive" };
    const mutation = resolveActionCost(actor, "drawOrHolsterWeapon", { workflowValidated: true, weaponId: item.id, direction: "draw" });
    const combined = mutation?.combinedEffects?.find((effect) => effect?.actionId === "drawAndIgniteLightsaber");
    if (!combined) return { ok: false, reason: "combined-action-unavailable" };
    const actionType = combined.actionCost ?? "swift";
    const spend = await spendItemAction(actor, actionType, item, "Draw & Ignite");
    if (!spend.ok) return { ok: false, reason: "action-unavailable", actionType };
    const update = equipMirrors(item, { _id: item.id, "system.activated": true, "flags.foundryvtt-swse.emitLight": true, "flags.foundryvtt-swse.bladeColor": visualProfile.bladeColor }, true);
    try {
      await ActorEngine.updateOwnedItems(actor, [update], { source: "InventoryEngine.drawAndActivateLightsaber" });
    } catch (err) {
      await spend.rollback?.();
      throw err;
    }
    await LightsaberLightSync.syncActorTokenLight(actor, item);
    return { ok: true, changed: true, readied: true, activated: true, actionType };
  }


  /**
   * Toggle whether an equipment item explicitly counts as a Saga implant.
   * This is intentionally explicit so generic cybernetics/prostheses are not
   * swept into KOTOR-style implant drawbacks by name alone.
   */
  static async toggleImplantTag(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item || item.type !== "equipment") return;

    const current = item.system?.implantRules?.countAsImplant === true;
    const next = !current;

    const update = {
      _id: itemId,
      "system.implantRules.countAsImplant": next
    };

    if (!next) {
      update["system.installed"] = false;
      update["system.active"] = false;
      update["system.implantRules.activeByOwnership"] = false;
    }

    await ActorEngine.updateOwnedItems(actor, [update], {
      source: "InventoryEngine.toggleImplantTag"
    });
  }

  /**
   * Toggle implant installed state. Installed implies the item is a tagged
   * implant, but does not force the active state.
   */
  static async toggleImplantInstalled(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item || item.type !== "equipment") return;

    const current = item.system?.installed === true || item.system?.usage?.installed === true;
    const next = !current;

    const update = {
      _id: itemId,
      "system.implantRules.countAsImplant": true,
      "system.installed": next
    };

    if (!next) update["system.active"] = false;

    await ActorEngine.updateOwnedItems(actor, [update], {
      source: "InventoryEngine.toggleImplantInstalled"
    });
  }

  /**
   * Toggle implant active state. Active implies tagged + installed, because
   * only active/installed implants trigger penalties.
   */
  static async toggleImplantActive(actor, itemId) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item || item.type !== "equipment") return;

    const current = item.system?.active === true || item.system?.activated === true;
    const next = !current;

    const update = {
      _id: itemId,
      "system.implantRules.countAsImplant": true,
      "system.installed": next ? true : (item.system?.installed === true),
      "system.active": next
    };

    await ActorEngine.updateOwnedItems(actor, [update], {
      source: "InventoryEngine.toggleImplantActive"
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
