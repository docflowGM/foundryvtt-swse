/**
 * Autofire Bracing Mechanic (SWSE Core Rulebook)
 *
 * Autofire-only weapons (E-Web Repeating Blaster, etc) can be braced for improved accuracy.
 * Takes 2 Swift Actions before making the autofire attack.
 * When braced, autofire penalty is -2 instead of -5.
 */

import { SWSELogger } from "../utils/logger.js";

export class AutofireBracing {
  /**
   * Begin bracing an autofire-only weapon
   * Costs 2 Swift Actions, must be done immediately before autofire attack
   * @param {Actor} actor - The character bracing the weapon
   * @param {Item} weapon - The autofire-only weapon to brace
   * @returns {Promise<Object>} - { success: boolean, weapon: string, message: string }
   */
  static async braceWeapon(actor, weapon) {
    try {
      if (!actor || !weapon) {
        throw new Error("Missing actor or weapon");
      }

      // Check if weapon can be braced
      const canBraceCheck = this._canBraceWeapon(weapon);
      if (!canBraceCheck.canBrace) {
        return {
          success: false,
          message: canBraceCheck.reason,
          error: true,
          weaponName: weapon.name
        };
      }

      // Set bracing flag on actor tied to this weapon
      await actor.setFlag("foundryvtt-swse", "brace_weapon_" + weapon.id, {
        weaponId: weapon.id,
        weaponName: weapon.name,
        timestamp: new Date().toISOString(),
        active: true
      });

      // Also track braced weapons on actor for reference
      const bracedWeapons = actor.getFlag("foundryvtt-swse", "braced_weapons") || [];
      if (!bracedWeapons.includes(weapon.id)) {
        bracedWeapons.push(weapon.id);
        await actor.setFlag("foundryvtt-swse", "braced_weapons", bracedWeapons);
      }

      return {
        success: true,
        weapon: weapon.name,
        actor: actor.name,
        message: `${actor.name} braces ${weapon.name} (2 Swift Actions spent). Autofire penalty reduced to -2 on next attack.`
      };
    } catch (err) {
      SWSELogger.error("Failed to brace weapon", err);
      throw err;
    }
  }

  /**
   * Check if weapon can be braced
   * Must be Autofire-only weapon: Heavy Weapon, Rifle, or Pistol with Retractable Stock
   * @private
   */
  static _canBraceWeapon(weapon) {
    if (!weapon) {
      return { canBrace: false, reason: "No weapon provided" };
    }

    // Check if autofire-only
    const modes = weapon.system?.modes || weapon.system?.weaponModes || [];
    const isAutofireOnly = Array.isArray(modes)
      ? modes.length === 1 && modes[0].toLowerCase().includes("autofire")
      : Object.keys(modes).length === 1 && Object.keys(modes)[0].toLowerCase().includes("autofire");

    if (!isAutofireOnly) {
      return { canBrace: false, reason: `${weapon.name} must be an autofire-only weapon to be braced` };
    }

    // Check weapon category
    const category = (weapon.system?.category || weapon.system?.type || "").toLowerCase();
    const name = (weapon.name || "").toLowerCase();
    const hasRetractableStock = weapon.system?.retractableStock || name.includes("retractable stock");

    const validCategories = ["heavy", "rifle", "pistol"];
    const isValidCategory = validCategories.some(cat => category.includes(cat));

    if (!isValidCategory) {
      return { canBrace: false, reason: `${weapon.name} must be a Heavy Weapon or Rifle to be braced` };
    }

    if (category.includes("pistol") && !hasRetractableStock) {
      return { canBrace: false, reason: `${weapon.name} must have Retractable Stock to be braced` };
    }

    return { canBrace: true, reason: null };
  }

  /**
   * Check if weapon is currently braced
   * @param {Actor} actor - The character
   * @param {Item} weapon - The weapon to check
   * @returns {boolean} - True if weapon is braced
   */
  static isWeaponBraced(actor, weapon) {
    if (!actor || !weapon) return false;

    const braceFlag = actor.getFlag("foundryvtt-swse", "brace_weapon_" + weapon.id);
    return braceFlag?.active === true;
  }

  /**
   * Get all braced weapons for an actor
   * @param {Actor} actor - The character
   * @returns {Array<string>} - Array of weapon IDs that are braced
   */
  static getBracedWeapons(actor) {
    if (!actor) return [];

    return actor.getFlag("foundryvtt-swse", "braced_weapons") || [];
  }

  /**
   * Remove brace from weapon (called after autofire attack or when no longer needed)
   * @param {Actor} actor - The character
   * @param {Item} weapon - The weapon to unbrace
   */
  static async unbraceWeapon(actor, weapon) {
    if (!actor || !weapon) return;

    try {
      await actor.unsetFlag("foundryvtt-swse", "brace_weapon_" + weapon.id);

      // Remove from braced weapons list
      const bracedWeapons = actor.getFlag("foundryvtt-swse", "braced_weapons") || [];
      const filtered = bracedWeapons.filter(id => id !== weapon.id);

      if (filtered.length > 0) {
        await actor.setFlag("foundryvtt-swse", "braced_weapons", filtered);
      } else {
        await actor.unsetFlag("foundryvtt-swse", "braced_weapons");
      }

      SWSELogger.info(`${actor.name} removed brace from ${weapon.name}`);
    } catch (err) {
      SWSELogger.error("Failed to unbrace weapon", err);
    }
  }

  /**
   * Remove all braces (useful at end of turn or combat)
   * @param {Actor} actor - The character
   */
  static async unbraceAll(actor) {
    if (!actor) return;

    try {
      const bracedWeapons = actor.getFlag("foundryvtt-swse", "braced_weapons") || [];

      for (const weaponId of bracedWeapons) {
        await actor.unsetFlag("foundryvtt-swse", "brace_weapon_" + weaponId);
      }

      await actor.unsetFlag("foundryvtt-swse", "braced_weapons");

      SWSELogger.info(`${actor.name} removed all weapon braces`);
    } catch (err) {
      SWSELogger.error("Failed to remove all weapon braces", err);
    }
  }

  /**
   * Get the penalty reduction from bracing
   * Normal autofire is -5, braced is -2, so benefit is +3 to attack
   * @returns {number} - The penalty reduction (3)
   */
  static getPenaltyReduction() {
    return 3; // -5 becomes -2, so +3 benefit
  }
}
