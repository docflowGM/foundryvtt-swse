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
import { isEnergyShieldItem, isArmorItemEquipped, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
import { isItemActivated } from "/systems/foundryvtt-swse/scripts/engine/inventory/item-activation-state.js";
import { resolveActionCost } from "/systems/foundryvtt-swse/scripts/engine/feats/action-speed-runtime-patches.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { planEquipmentIntent, executeEquipmentIntent, GM_LOCAL_CONTEXT, OUTCOME as EQUIPMENT_OUTCOME, EquipmentIntentError } from "/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js";
import { readCombatReadiness, isWeaponHeld } from "/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js";

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

async function readWeaponEntry(actor, itemId, deps = {}) {
  const readiness = readCombatReadiness(actor, deps);
  const entry = readiness.state?.weapons.find((w) => w.itemId === itemId) ?? null;
  return entry ? { ...entry, speciesEvidence: readiness.speciesEvidence.status } : null;
}

function reasonOfStatus(status, plan, outcome) {
  if (status === EQUIPMENT_OUTCOME.REJECTED_PRECONDITION) return plan?.issues?.[0]?.code ?? "rejected";
  if (status === EQUIPMENT_OUTCOME.NOT_ESTABLISHED) return "target-posture-not-established";
  return String(status).toLowerCase().replace(/_/g, "-");
}

function messageOfStatus(status, plan, outcome) {
  switch (status) {
    case EQUIPMENT_OUTCOME.CHOICE_REQUIRED: return "Choose the appendages (and grip) to use; nothing is selected automatically.";
    case EQUIPMENT_OUTCOME.NO_AUTHORITATIVE_EXECUTOR: return "Equipment changes need an authorized GM execution context; nothing was changed.";
    case EQUIPMENT_OUTCOME.REJECTED_NOT_GM: return "Only a GM client can change equipment state right now; nothing was changed.";
    case EQUIPMENT_OUTCOME.DEFERRED_RULES_REVIEW: return "That change has no established rule yet (deferred for rules review); nothing was changed.";
    case EQUIPMENT_OUTCOME.CONFLICT_UNRESOLVED: return "That would collide with another weapon; stow or move it first. Nothing was changed.";
    case EQUIPMENT_OUTCOME.UNRESOLVED_TRANSACTION: return "An earlier equipment change for this weapon is unresolved.";
    case EQUIPMENT_OUTCOME.COMMITTED: return null;
    default: return (outcome?.issues ?? plan?.issues ?? [])[0]?.message ?? null;
  }
}


function isEnergyShield(item) {
  return isEnergyShieldItem(item);
}


export class InventoryEngine {
  /**
   * Toggle equip status for an item.
   * For armor: unequip all other armor first (single equipped rule).
   * Weapons are NOT handled here: their posture is owned by the equipment-state coordinator (see requestWeaponPosture).
   */
  static async toggleEquip(actor, itemId) {
    const item = actor?.items?.get(itemId);
    if (!actor || !item) return;

    // Weapons: posture is owned by the equipment-state coordinator (Draw/Stow cost, explicit appendages and grip); never a free toggle.
    if (isWeaponItem(item)) return this.toggleWeaponReadied(actor, itemId);

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
  static async setActivated(actor, itemId, activated, { free = false, deps = {} } = {}) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return { ok: false, reason: "missing-item" };
    const next = activated === true;
    if (isItemActivated(item) === next) return { ok: true, changed: false, activated: next };

    const update = { _id: itemId, "system.activated": next };
    // isItemActivated() also reads legacy system.active; mirror it so a deactivated item cannot still read as active.
    if (item.system?.active !== undefined) update["system.active"] = next;
    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor });
    const shield = isEnergyShield(item);

    if (next && visualProfile.isLightsaber && !(await this.isWeaponDrawn(actor, item, { deps }))) return { ok: false, reason: "draw-before-activating" };
    if (next && shield && !isArmorItemEquipped(item)) return { ok: false, reason: "equip-before-activating" };

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

  /**
   * Weapon posture: the ONLY entry point the inventory layer uses to change a weapon's posture. It builds nothing itself: the explicit intent goes
   * to the equipment-state coordinator (plan -> confirm -> journal -> field-scoped write -> verify -> spend -> finalize), which prices Draw/Stow and
   * Quick Draw through the existing action authority. No appendage or grip is ever chosen here; a missing choice comes back as
   * `{ ok:false, status:'CHOICE_REQUIRED', choices }`. Execution is GM-local only (the coordinator refuses otherwise and writes nothing).
   * @param {Actor} actor
   * @param {{type:'stow'|'equip'|'ready', itemId:string, appendageIds?:string[], purpose?:string, grip?:string}} intent
   * @param {{requestId?:string, deps?:object}} [options]
   * @returns {Promise<{ok:boolean, changed:boolean, status:string, reason:string, message:string|null, plan?:object, outcome?:object, choices?:object[]}>}
   */
  static async requestWeaponPosture(actor, intent, { requestId = null, deps = undefined } = {}) {
    let plan;
    try {
      plan = await planEquipmentIntent(actor, intent, deps);
    } catch (err) {
      if (!(err instanceof EquipmentIntentError)) throw err;
      return { ok: false, changed: false, status: "REJECTED_INVALID", reason: "invalid-intent", message: err.message };
    }
    const done = (status, extra = {}) => ({ changed: false, status, reason: reasonOfStatus(status, plan, extra.outcome), message: messageOfStatus(status, plan, extra.outcome), plan, ...extra });
    if (plan.status === EQUIPMENT_OUTCOME.NO_CHANGE) return { ok: true, ...done(plan.status) };
    if (plan.status !== EQUIPMENT_OUTCOME.PLANNED) return { ok: false, ...done(plan.status, { choices: plan.choices, conflicts: plan.conflicts }) };
    const id = requestId ?? globalThis.foundry?.utils?.randomID?.(24) ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const outcome = await executeEquipmentIntent(actor, { requestId: id, intent, planDigest: plan.planDigest }, { context: GM_LOCAL_CONTEXT }, deps);
    const ok = outcome.status === EQUIPMENT_OUTCOME.COMMITTED;
    return { ok, ...done(outcome.status, { outcome, changed: ok }) };
  }

  /** Whether a weapon is VERIFIED held (effective EQUIPPED or READIED) by the equipment-state reader. Declared posture alone is never enough. */
  static async isWeaponDrawn(actor, item, { deps = {} } = {}) {
    // the shared interface fails closed without authoritative species evidence, an unresolved transaction or uncertified identity
    return isWeaponHeld(actor, item, deps);
  }

  /**
   * Draw / stow a weapon. Stowing is a complete intent and goes to the coordinator. Drawing needs explicit appendages (and a grip for READIED) in
   * `options`; without them this returns CHOICE_REQUIRED and changes nothing. Move Action, Swift with Quick Draw: priced by the coordinator
   * through the existing action authority.
   */
  static async setWeaponReadied(actor, itemId, readied, options = {}) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return { ok: false, reason: "missing-item" };
    if (!isWeaponItem(item)) return { ok: false, reason: "not-weapon" };
    const requestOptions = { requestId: options.requestId ?? null, deps: options.deps };
    if (readied !== true) return this.requestWeaponPosture(actor, { type: "stow", itemId }, requestOptions);
    const entry = await readWeaponEntry(actor, itemId, options.deps ?? {});
    // READIED is success only when it is VERIFIED (effective). A stored EQUIPPED weapon is held, not ready; a declared READIED that the canonical
    // resolvers do not establish is not ready either. A held weapon that still needs the transition falls through to the coordinator, which
    // returns DEFERRED_RULES_REVIEW (EQ-001) without writing or spending; nothing is inferred here.
    if (entry?.effectivePosture === "READIED" && !entry.pending && !(entry.gates?.length)) return { ok: true, changed: false, status: "NO_CHANGE", reason: "no-change", readied: true };
    if (entry?.record?.status === "valid" && entry.record.posture === "READIED") {
      return { ok: false, changed: false, status: "READINESS_NOT_VERIFIED", reason: "declared-readied-not-verified", readied: false, message: "This weapon is recorded as ready, but its appendages, grip or evidence are not verified, so it is not treated as ready.", gates: entry.gates ?? [], issues: [...(entry.effective?.issues ?? []), ...(entry.issues ?? [])].filter((i) => i.severity !== "info").map((i) => i.code) };
    }
    const intent = { type: "ready", itemId, ...(options.appendageIds ? { appendageIds: options.appendageIds } : {}), ...(options.grip ? { grip: options.grip } : {}) };
    return this.requestWeaponPosture(actor, intent, requestOptions);
  }

  static async toggleWeaponReadied(actor, itemId, options = {}) {
    const item = actor?.items?.get?.(itemId);
    if (!item) return { ok: false, reason: "missing-item" };
    if (!isWeaponItem(item)) return { ok: false, reason: "not-weapon" };
    const entry = await readWeaponEntry(actor, itemId, options.deps ?? {});
    const held = entry?.record?.status === "valid" && entry.record.posture !== "STOWED";
    return this.setWeaponReadied(actor, itemId, !held, options);
  }

  /**
   * Draw AND ignite a lightsaber as ONE combined action (Quick Draw + Weapon Proficiency (Lightsabers), Swift). It is a single coordinator
   * `ready-ignite` intent: one plan, one journaled transaction covering the posture record, the grip and the activation fields, one spend (spend-last),
   * and usability only after FINALIZED. This layer chooses nothing: appendages and grip come from `options` (otherwise CHOICE_REQUIRED, nothing
   * written). Eligibility and cost come from the existing combined-feat authority through the coordinator.
   */
  static async drawAndActivateLightsaber(actor, itemId, options = {}) {
    const item = actor?.items?.get?.(itemId);
    if (!actor || !item) return { ok: false, reason: "missing-item" };
    if (!WeaponVisualProfileResolver.isLightsaber(item)) return { ok: false, reason: "not-lightsaber" };
    const intent = { type: "ready-ignite", itemId, ...(options.appendageIds ? { appendageIds: options.appendageIds } : {}), ...(options.grip ? { grip: options.grip } : {}) };
    const result = await this.requestWeaponPosture(actor, intent, { requestId: options.requestId ?? null, deps: options.deps });
    // light sync is a consumer of the finalized state; it never decides readiness
    if (result.ok && result.changed) await LightsaberLightSync.syncActorTokenLight(actor, item);
    return result;
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
