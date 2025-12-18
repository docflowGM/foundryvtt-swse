import { ProgressionEngine } from "../../progression/engine/progression-engine.js";

/**
 * Droid-specific functionality handler
 * Modernized and FVTT v13+/v15-safe
 */
export class SWSEDroidHandler {

  // =========================================================================
  // APPLY CHASSIS
  // =========================================================================
  static async applyDroidChassis(actor, chassisItem) {
    if (!actor || !chassisItem) {
      console.error("SWSE | applyDroidChassis called without actor or chassisItem.");
      return;
    }

    const chassis = foundry.utils.deepClone(chassisItem.system ?? {});
    const flagScope = "foundryvtt-swse";

    // -----------------------------
    // Prepare safe updates structure
    // -----------------------------
    const abilityKeys = ["str", "dex", "con", "int", "wis", "cha"];
    const abilities = {};

    for (const key of abilityKeys) {
      abilities[key] = {
        base: Number(chassis[key]) || 10,
        racial: 0,
        temp: 0
      };
    }

    const updates = {
      "system.abilities": abilities,
      "system.size": chassis.size || "medium",
      "system.speed": Number(chassis.speed) || 6,
      "system.hp.max": Number(chassis.hp) || 10,
      "system.hp.value": Number(chassis.hp) || 10,
      "system.systemSlots.max": Number(chassis.systemSlots) || 0,
      "system.systemSlots.used": 0
    };

    // Apply the chassis stats
    await actor.update(updates);

    // -----------------------------
    // Clear incompatible items
    // -----------------------------
    const itemsToDelete = [];

    for (const item of actor.items) {
      const type = item.type?.toLowerCase() ?? "";
      const sys = item.system ?? {};

      // Force powers (various system definitions)
      if (type === "forcepower" || type === "power") {
        itemsToDelete.push(item.id);
      }

      // Organic-only equipment
      if (sys.organicOnly === true) {
        itemsToDelete.push(item.id);
      }
    }

    if (itemsToDelete.length) {
      await actor.deleteEmbeddedDocuments("Item", itemsToDelete);
      ui.notifications.info(`Removed ${itemsToDelete.length} incompatible item(s) from ${actor.name}.`);
    }

    // -----------------------------
    // Replace existing chassis item
    // -----------------------------
    const existing = actor.items.find(i => i.type === "chassis");

    if (existing) {
      await actor.deleteEmbeddedDocuments("Item", [existing.id]);
    }

    // Clone item safely
    const chassisData = chassisItem.toObject();
    chassisData._id = undefined;

    await actor.createEmbeddedDocuments("Item", [chassisData]);

    // -----------------------------
    // Chat message
    // -----------------------------
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse chassis-applied">
          <h3>Droid Chassis Applied</h3>
          <p><strong>${actor.name}</strong> is now using the <strong>${chassisItem.name}</strong> chassis.</p>
          <ul>
            <li>System Slots: ${chassis.systemSlots ?? 0}</li>
            <li>Size: ${chassis.size ?? "medium"}</li>
            <li>Speed: ${chassis.speed ?? 6} squares</li>
            <li>Hit Points: ${chassis.hp ?? 10}</li>
          </ul>
        </div>`
    });

    ui.notifications.info(`${actor.name} chassis set to ${chassisItem.name}`);
  }

  // =========================================================================
  // SLOT CHECK
  // =========================================================================
  static hasAvailableSlots(actor) {
    const slots = actor.system?.systemSlots;
    if (!slots) return false;
    return (slots.used ?? 0) < (slots.max ?? 0);
  }

  // =========================================================================
  // INSTALL SYSTEM
  // =========================================================================
  static async installSystem(actor, systemItem) {
    const slots = actor.system?.systemSlots ?? {};
    const used = Number(slots.used ?? 0);
    const max = Number(slots.max ?? 0);
    const cost = Number(systemItem.system?.slotsRequired ?? 1);

    if (used + cost > max) {
      ui.notifications.error(
        `Not enough system slots! Need ${cost}, available ${max - used}.`
      );
      return false;
    }

    const data = systemItem.toObject();
    data._id = undefined;

    await actor.createEmbeddedDocuments("Item", [data]);
    await actor.update({
      "system.systemSlots.used": used + cost
    });

    ui.notifications.info(`Installed ${systemItem.name} (uses ${cost} slot(s)).`);

    return true;
  }

  // =========================================================================
  // UNINSTALL SYSTEM
  // =========================================================================
  static async uninstallSystem(actor, systemItem) {
    const slots = actor.system?.systemSlots ?? {};
    const used = Number(slots.used ?? 0);
    const cost = Number(systemItem.system?.slotsRequired ?? 1);

    await actor.deleteEmbeddedDocuments("Item", [systemItem.id]);

    await actor.update({
      "system.systemSlots.used": Math.max(0, used - cost)
    });

    ui.notifications.info(`Uninstalled ${systemItem.name} (freed ${cost} slot(s)).`);

    return true;
  }
}
