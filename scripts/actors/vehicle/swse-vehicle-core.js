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
    const VALID_POSITIONS = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];

    if (!vehicle || !crewActor) {
      SWSELogger.warn('SWSE | Missing vehicle or crew actor');
      return false;
    }

    if (!VALID_POSITIONS.includes(slot)) {
      SWSELogger.warn(`SWSE | Invalid crew position: ${slot}`);
      return false;
    }

    const path = `system.crewPositions.${slot}`;

    try {
      await vehicle.update({
        [path]: {
          name: crewActor.name,
          uuid: crewActor.uuid
        }
      });

      ui.notifications.info(`${crewActor.name} assigned to ${slot}`);
      return true;
    } catch (error) {
      SWSELogger.error('SWSE | Error assigning crew:', error);
      ui.notifications.error('Failed to assign crew member');
      return false;
    }
  }

  /**
   * Remove crew from a vehicle position.
   */
  static async removeCrew(vehicle, slot) {
    const VALID_POSITIONS = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];

    if (!vehicle) {
      SWSELogger.warn('SWSE | Missing vehicle');
      return;
    }

    if (!VALID_POSITIONS.includes(slot)) {
      SWSELogger.warn(`SWSE | Invalid crew position: ${slot}`);
      return;
    }

    const crew = vehicle.system?.crewPositions?.[slot];
    if (!crew) return;

    const name = crew?.name ?? "Unknown Crew";

    try {
      await vehicle.update({
        [`system.crewPositions.${slot}`]: null
      });

      ui.notifications.info(`${name} removed from ${slot}`);
    } catch (error) {
      SWSELogger.error('SWSE | Error removing crew:', error);
      ui.notifications.error('Failed to remove crew member');
    }
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
   * @returns {Promise<boolean>} - True if migration succeeded
   */
  static async migrateLegacyWeapons(vehicle) {
    if (!vehicle) {
      SWSELogger.warn('SWSE | Missing vehicle for weapon migration');
      return false;
    }

    const old = vehicle.system?.weapons;

    if (!Array.isArray(old) || old.length === 0) return true;

    SWSELogger.log(`SWSE | Migrating ${old.length} legacy weapons → embedded items`);

    try {
      const newItems = [];

      for (const w of old) {
        if (!w) continue; // Skip null/undefined entries

        newItems.push({
          name: w.name || "Vehicle Weapon",
          type: "vehicle-weapon",
          system: {
            arc: w.arc ?? "Forward",
            attackBonus: w.attackBonus ?? "+0",
            damage: w.damage ?? "0d0",
            range: w.range ?? "Close"
          }
        });
      }

      if (newItems.length > 0) {
        await vehicle.createEmbeddedDocuments("Item", newItems);
      }

      await vehicle.update({ "system.weapons": [] });

      SWSELogger.log(`SWSE | Weapon migration complete`);
      return true;
    } catch (error) {
      SWSELogger.error('SWSE | Error migrating legacy weapons:', error);
      return false;
    }
  }

  /**
   * Adds a weapon item to a vehicle.
   */
  static async addWeapon(vehicle, weaponItem) {
    if (!vehicle) {
      SWSELogger.warn('SWSE | Missing vehicle for weapon addition');
      return false;
    }

    if (!weaponItem || typeof weaponItem.toObject !== 'function') {
      SWSELogger.warn('SWSE | Invalid weapon item');
      return false;
    }

    try {
      const data = weaponItem.toObject();
      data._id = undefined;
      data.type = "vehicle-weapon";

      await vehicle.createEmbeddedDocuments("Item", [data]);
      ui.notifications.info(`${weaponItem.name} added to vehicle weapons.`);
      return true;
    } catch (error) {
      SWSELogger.error('SWSE | Error adding weapon:', error);
      ui.notifications.error('Failed to add weapon');
      return false;
    }
  }

  /**
   * Removes a weapon item from a vehicle.
   */
  static async removeWeapon(vehicle, itemId) {
    if (!vehicle) {
      SWSELogger.warn('SWSE | Missing vehicle for weapon removal');
      return false;
    }

    if (!itemId) {
      SWSELogger.warn('SWSE | Missing item ID');
      return false;
    }

    try {
      await vehicle.deleteEmbeddedDocuments("Item", [itemId]);
      ui.notifications.info(`Weapon removed from vehicle.`);
      return true;
    } catch (error) {
      SWSELogger.error('SWSE | Error removing weapon:', error);
      ui.notifications.error('Failed to remove weapon');
      return false;
    }
  }

  /**
   * Rolls weapon attack and (optional) damage.
   */
  static async rollWeapon(vehicle, weaponItem) {
    if (!vehicle) {
      SWSELogger.warn('SWSE | Missing vehicle for weapon roll');
      return false;
    }

    if (!weaponItem || !weaponItem.system) {
      SWSELogger.warn('SWSE | Invalid weapon item');
      return false;
    }

    if (!game?.swse?.RollEngine?.safeRoll) {
      SWSELogger.error('SWSE | RollEngine not available');
      ui.notifications.error('Roll engine not available');
      return false;
    }

    try {
      const rollMode = game.settings?.get("core", "rollMode") ?? "public";
      const rollData = vehicle.getRollData();

      const bonus = weaponItem.system.attackBonus || "+0";
      const damage = weaponItem.system.damage || "0d0";

      // Attack roll
      const attack = await game.swse.RollEngine.safeRoll(`1d20${bonus}`, rollData);
      await attack.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: vehicle }),
        flavor: `<strong>${weaponItem.name}</strong> Attack Roll`,
        rollMode
      } , { create: true });

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
        } , { create: true });
      }

      return true;
    } catch (error) {
      SWSELogger.error('SWSE | Error rolling weapon:', error);
      ui.notifications.error('Failed to roll weapon');
      return false;
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
    const VALID_POSITIONS = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];

    if (!vehicle) {
      SWSELogger.warn('SWSE | Missing vehicle for crew skill roll');
      return false;
    }

    if (!VALID_POSITIONS.includes(position)) {
      SWSELogger.warn(`SWSE | Invalid crew position: ${position}`);
      return false;
    }

    const crew = vehicle.system?.crewPositions?.[position];
    if (!crew) {
      ui.notifications.warn(`No crew assigned to ${position}`);
      return false;
    }

    const uuid = crew.uuid || (typeof crew === 'string' ? crew : null);
    if (!uuid) {
      ui.notifications.warn(`Crew member data outdated — reassign crew.`);
      return false;
    }

    try {
      const actor = await fromUuid(uuid);
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
    } catch (error) {
      SWSELogger.error('SWSE | Error rolling crew skill:', error);
      ui.notifications.error('Failed to roll crew skill');
      return false;
    }
  }

}
