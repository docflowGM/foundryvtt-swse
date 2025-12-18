/**
 * ============================================================
 *  SWSE VEHICLE SYSTEM UPGRADE 2.0
 *  - Embedded Weapon Items (vehicle-weapon)
 *  - Crew Management 2.0 (UUID-based, drag/drop safe)
 *  - Rolls & Automation Integration
 *  - FVTT v13/v14/v15 Safe
 * ============================================================
 */

import { SWSELogger } from "../../utils/logger.js";

export class SWSEVehicleCore {

  // ============================================================
  // CREW MANAGEMENT SYSTEM 2.0
  // ============================================================

  /**
   * Assign a crew member to a vehicle slot.
   * @param {Actor} vehicle
   * @param {string} slot
   * @param {Actor} crewActor
   */
  static async assignCrew(vehicle, slot, crewActor) {
    if (!vehicle || !crewActor) return false;

    const path = `system.crewPositions.${slot}`;

    await vehicle.update({
      [path]: {
        name: crewActor.name,
        uuid: crewActor.uuid
      }
    });

    ui.notifications.info(`${crewActor.name} assigned to ${slot}`);
    return true;
  }

  /**
   * Remove crew from a vehicle position.
   */
  static async removeCrew(vehicle, slot) {
    const crew = vehicle.system?.crewPositions?.[slot];
    if (!crew) return;

    const name = crew?.name ?? "Unknown Crew";

    await vehicle.update({
      [`system.crewPositions.${slot}`]: null
    });

    ui.notifications.info(`${name} removed from ${slot}`);
  }

  /**
   * Validate crew schema
   * - Converts legacy string format → object format
   * - Ensures all slots exist
   */
  static normalizeCrewSchema(systemData) {
    if (!systemData.crewPositions) {
      systemData.crewPositions = {
        pilot: null,
        copilot: null,
        gunner: null,
        engineer: null,
        shields: null,
        commander: null
      };
      return;
    }

    for (const key of Object.keys(systemData.crewPositions)) {
      const v = systemData.crewPositions[key];
      if (typeof v === "string") {
        systemData.crewPositions[key] = { name: v, uuid: null };
      }
    }
  }

  // ============================================================
  // WEAPON SYSTEM 2.0 — EMBEDDED VEHICLE-WEAPON ITEMS
  // ============================================================

  /**
   * Converts legacy JSON weapons → embedded Item type: "vehicle-weapon"
   */
  static async migrateLegacyWeapons(vehicle) {
    const old = vehicle.system?.weapons;

    if (!Array.isArray(old) || old.length === 0) return;

    SWSELogger.log(`SWSE | Migrating ${old.length} legacy weapons → embedded items`);

    const newItems = [];

    for (const w of old) {
      newItems.push({
        name: w.name || "Vehicle Weapon",
        type: "vehicle-weapon",
        system: {
          arc: w.arc ?? "Forward",
          attackBonus: w.bonus ?? "+0",
          damage: w.damage ?? "0d0",
          range: w.range ?? "Close"
        }
      });
    }

    await vehicle.createEmbeddedDocuments("Item", newItems);
    await vehicle.update({ "system.weapons": [] });

    SWSELogger.log(`SWSE | Weapon migration complete`);
  }

  /**
   * Adds a weapon item to a vehicle.
   */
  static async addWeapon(vehicle, weaponItem) {
    const data = weaponItem.toObject();
    data._id = undefined;
    data.type = "vehicle-weapon";

    await vehicle.createEmbeddedDocuments("Item", [data]);
    ui.notifications.info(`${weaponItem.name} added to vehicle weapons.`);
  }

  /**
   * Removes a weapon item from a vehicle.
   */
  static async removeWeapon(vehicle, itemId) {
    await vehicle.deleteEmbeddedDocuments("Item", [itemId]);
    ui.notifications.info(`Weapon removed from vehicle.`);
  }

  /**
   * Rolls weapon attack and (optional) damage.
   */
  static async rollWeapon(vehicle, weaponItem) {
    const rollMode = game.settings.get("core", "rollMode");
    const rollData = vehicle.getRollData();

    const bonus = weaponItem.system.attackBonus || "+0";
    const damage = weaponItem.system.damage || "0d0";

    // Attack roll
    const attack = await game.swse.RollEngine.safeRoll(`1d20${bonus}`, rollData);
    await attack.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: vehicle }),
      flavor: `<strong>${weaponItem.name}</strong> Attack Roll`,
      rollMode
    });

    // Confirm → damage
    const hit = await Dialog.confirm({
      title: "Roll Damage?",
      content: "<p>Did the attack hit?</p>"
    });

    if (hit) {
      const dmg = await game.swse.RollEngine.safeRoll(damage, rollData);
      await dmg.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: vehicle }),
        flavor: `<strong>${weaponItem.name}</strong> Damage`,
        rollMode
      });
    }
  }

  // ============================================================
  // CREW SKILL ROLLS
  // ============================================================

  static _mapSkillName(skill) {
    const map = {
      "Pilot": "pilot",
      "Mechanics": "mechanics",
      "Use Computer": "use_computer",
      "Perception": "perception",
      "Persuasion": "persuasion",
      "Knowledge (Tactics)": "knowledge_tactics"
    };
    return map[skill] || skill.toLowerCase().replace(/\s+/g, "_");
  }

  static async rollCrewSkill(vehicle, position, skillName, config = {}) {
    const crew = vehicle.system?.crewPositions?.[position];
    if (!crew) {
      ui.notifications.warn(`No crew assigned to ${position}`);
      return false;
    }

    if (!crew.uuid) {
      ui.notifications.warn(`Crew member data outdated — reassign crew.`);
      return false;
    }

    const actor = await fromUuid(crew.uuid);
    if (!actor) {
      ui.notifications.error(`Crew actor not found.`);
      return false;
    }

    const skillKey = this._mapSkillName(skillName);

    const { SWSERoll } = await import("../../combat/rolls/enhanced-rolls.js");

    await SWSERoll.rollSkillCheck(actor, skillKey, {
      ...config,
      vehicleName: vehicle.name,
      crewPosition: position
    });

    return true;
  }

}
