/**
 * Autofire Mechanic (SWSE Core Rulebook)
 *
 * Ranged weapons with Autofire setting can be set to Autofire as a Swift Action.
 * Autofire is treated as an Area Attack targeting a 2x2-square area.
 */

import { SWSELogger } from "../utils/logger.js";

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
export class Autofire {
  /**
   * Execute an autofire attack
   * @param {Actor} attacker - The character making the autofire attack
   * @param {Item} weapon - The weapon in autofire mode
   * @param {Array<Actor>} targetActors - All potential targets in the 2x2 area
   * @returns {Promise<Object>} - { success: boolean, roll: Roll, hits: Array, misses: Array }
   */
  static async executeAutofire(attacker, weapon, targetActors = []) {
    try {
      if (!attacker || !weapon) {
        throw new Error("Missing attacker or weapon");
      }

      // Check if weapon has autofire capability
      if (!this._hasAutofireMode(weapon)) {
        return {
          success: false,
          message: `${weapon.name} does not have an Autofire mode`,
          error: true
        };
      }

      // Check ammunition
      const ammoCheck = this._checkAmmunition(weapon, 10);
      if (!ammoCheck.sufficient) {
        return {
          success: false,
          message: `${weapon.name} has insufficient ammunition (needs 10, has ${ammoCheck.current})`,
          error: true,
          currentAmmo: ammoCheck.current
        };
      }

      // Check if weapon is braced (get penalty bonus)
      const isBraced = attacker.getFlag("foundryvtt-swse", "brace_weapon_" + weapon.id);
      const basePenalty = isBraced ? -2 : -5;

      // Calculate attack bonus with autofire penalty
      const abilityMod = attacker.system?.attributes[weapon?.system?.attackAttribute || "dex"]?.mod || 0;
      const bab = attacker.system?.bab || 0;
      const lvl = attacker.system?.level || 1;
      const halfLvl = getEffectiveHalfLevel(actor);
      const weaponBonus = weapon?.system?.attackBonus || 0;

      const totalBonus = bab + halfLvl + abilityMod + weaponBonus + basePenalty;

      // Roll the attack
      const rollFormula = `1d20 + ${totalBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const attackRoll = roll.total;

      // Process each target in the area
      const hits = [];
      const misses = [];

      if (targetActors && targetActors.length > 0) {
        for (const target of targetActors) {
          const reflexDefense = target.system?.defenses?.reflex?.total || 10;
          const isHit = attackRoll >= reflexDefense;

          if (isHit) {
            hits.push({
              id: target.id,
              name: target.name,
              defense: reflexDefense,
              damage: "full"
            });
          } else {
            misses.push({
              id: target.id,
              name: target.name,
              defense: reflexDefense,
              damage: "half"
            });
          }
        }
      }

      // Consume ammunition
      await this._consumeAmmunition(weapon, 10);

      // Clear brace status if it was used
      if (isBraced) {
        await attacker.unsetFlag("foundryvtt-swse", "brace_weapon_" + weapon.id);
      }

      return {
        success: true,
        roll: attackRoll,
        penalty: basePenalty,
        isBraced,
        weapon: weapon.name,
        hits,
        misses,
        totalTargets: hits.length + misses.length,
        message: `${attacker.name} fires ${weapon.name} on Autofire! Hits ${hits.length} target(s), ${misses.length} take half damage.`
      };
    } catch (err) {
      SWSELogger.error("Autofire attack failed", err);
      throw err;
    }
  }

  /**
   * Check if weapon has autofire capability
   * @private
   */
  static _hasAutofireMode(weapon) {
    if (!weapon) return false;

    const modes = weapon.system?.modes || weapon.system?.weaponModes || [];
    const name = (weapon.name || "").toLowerCase();

    if (Array.isArray(modes)) {
      return modes.some(m => m.toLowerCase().includes("autofire"));
    }

    return Object.keys(modes).some(k => k.toLowerCase().includes("autofire")) ||
           name.includes("autofire") ||
           name.includes("auto-fire");
  }

  /**
   * Check ammunition availability
   * @private
   */
  static _checkAmmunition(weapon, required = 10) {
    const current = weapon.system?.ammunition || weapon.system?.ammo || 0;
    return {
      sufficient: current >= required,
      current,
      required
    };
  }

  /**
   * Consume ammunition from weapon
   * @private
   */
  static async _consumeAmmunition(weapon, amount = 10) {
    if (!weapon) return;

    try {
      const current = weapon.system?.ammunition || weapon.system?.ammo || 0;
      const remaining = Math.max(0, current - amount);

      const updatePath = weapon.system?.ammunition !== undefined
        ? "system.ammunition"
        : "system.ammo";

      await weapon.update({ [updatePath]: remaining });
    } catch (err) {
      SWSELogger.error("Failed to consume ammunition", err);
    }
  }

  /**
   * Set weapon to autofire mode
   * @param {Item} weapon - The weapon to set to autofire
   * @returns {Promise<Object>} - Success/failure result
   */
  static async setAutofireMode(weapon) {
    try {
      if (!this._hasAutofireMode(weapon)) {
        return {
          success: false,
          message: `${weapon.name} does not have Autofire capability`,
          error: true
        };
      }

      // Update weapon current mode
      await weapon.update({ "system.currentMode": "Autofire" });

      return {
        success: true,
        weapon: weapon.name,
        message: `${weapon.name} is now set to Autofire mode`
      };
    } catch (err) {
      SWSELogger.error("Failed to set autofire mode", err);
      throw err;
    }
  }

  /**
   * Determine if autofire-only weapon
   * @param {Item} weapon - The weapon to check
   * @returns {boolean} - True if weapon only has autofire mode
   */
  static isAutofireOnly(weapon) {
    if (!weapon) return false;

    const modes = weapon.system?.modes || weapon.system?.weaponModes || [];
    const name = (weapon.name || "").toLowerCase();

    if (Array.isArray(modes)) {
      return modes.length === 1 && modes[0].toLowerCase().includes("autofire");
    }

    return Object.keys(modes).length === 1 && Object.keys(modes)[0].toLowerCase().includes("autofire");
  }

  /**
   * Check if weapon is eligible for bracing (Autofire-only weapons)
   * @param {Item} weapon - The weapon to check
   * @returns {Object} - { canBrace: boolean, reason: string }
   */
  static canBrace(weapon) {
    if (!weapon) {
      return { canBrace: false, reason: "No weapon provided" };
    }

    // Must be autofire-only
    if (!this.isAutofireOnly(weapon)) {
      return { canBrace: false, reason: `${weapon.name} is not an autofire-only weapon` };
    }

    // Must be Heavy Weapon, Rifle, or Pistol with Retractable Stock
    const category = (weapon.system?.category || weapon.system?.type || "").toLowerCase();
    const name = (weapon.name || "").toLowerCase();
    const hasRetractableStock = weapon.system?.retractableStock || name.includes("retractable stock");

    const validCategories = ["heavy", "rifle", "pistol"];
    const isValidCategory = validCategories.some(cat => category.includes(cat));

    if (!isValidCategory) {
      return { canBrace: false, reason: `${weapon.name} must be a Heavy Weapon, Rifle, or Pistol with Retractable Stock` };
    }

    if (category.includes("pistol") && !hasRetractableStock) {
      return { canBrace: false, reason: `${weapon.name} (Pistol) must have Retractable Stock to be braced` };
    }

    return { canBrace: true, reason: null };
  }
}
