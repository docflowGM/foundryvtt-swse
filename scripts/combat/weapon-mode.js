/**
 * Weapon Mode Switching Mechanic (SWSE Core Rulebook)
 *
 * Some weapons have multiple modes (lethal/stun, single-shot/autofire, etc).
 * Switching to another weapon mode takes a Swift Action.
 */

import { SWSELogger } from "../utils/logger.js";

export class WeaponMode {
  /**
   * Switch a weapon's mode
   * @param {Actor} actor - The character switching weapon mode
   * @param {Item} weapon - The weapon to switch
   * @param {string} newMode - The new mode name
   * @returns {Promise<Object>} - { success: boolean, weapon: string, oldMode: string, newMode: string }
   */
  static async switchWeaponMode(actor, weapon, newMode) {
    try {
      if (!actor || !weapon) {
        throw new Error("Missing actor or weapon");
      }

      // Check if weapon has modes
      const modes = weapon.system?.modes || weapon.system?.weaponModes || [];
      if (!modes || modes.length === 0) {
        return {
          success: false,
          message: `${weapon.name} does not have multiple firing modes`,
          error: true,
          weaponName: weapon.name
        };
      }

      // Check if new mode is valid
      const validModes = Array.isArray(modes) ? modes : Object.keys(modes);
      if (!validModes.includes(newMode)) {
        return {
          success: false,
          message: `Invalid mode "${newMode}" for ${weapon.name}. Valid modes: ${validModes.join(", ")}`,
          error: true,
          weaponName: weapon.name,
          validModes
        };
      }

      // Get current mode
      const currentMode = weapon.system?.currentMode || (Array.isArray(modes) ? modes[0] : Object.keys(modes)[0]);

      if (currentMode === newMode) {
        return {
          success: false,
          message: `${weapon.name} is already in ${newMode} mode`,
          weaponName: weapon.name,
          currentMode
        };
      }

      // Update weapon mode
      await weapon.update({ "system.currentMode": newMode });

      // Store mode change in flags
      await this._logModeChange(actor, weapon, currentMode, newMode);

      return {
        success: true,
        weaponName: weapon.name,
        oldMode: currentMode,
        newMode,
        actorName: actor.name,
        message: `${actor.name} switches ${weapon.name} from ${currentMode} mode to ${newMode} mode`
      };
    } catch (err) {
      SWSELogger.error("Weapon mode switch failed", err);
      throw err;
    }
  }

  /**
   * Get all available modes for a weapon
   * @param {Item} weapon - The weapon to check
   * @returns {Array<string>} - Array of available mode names
   */
  static getWeaponModes(weapon) {
    if (!weapon) return [];

    const modes = weapon.system?.modes || weapon.system?.weaponModes || [];
    return Array.isArray(modes) ? modes : Object.keys(modes);
  }

  /**
   * Get current mode of a weapon
   * @param {Item} weapon - The weapon to check
   * @returns {string} - Current mode name
   */
  static getCurrentMode(weapon) {
    if (!weapon) return null;

    const modes = this.getWeaponModes(weapon);
    return weapon.system?.currentMode || modes[0] || null;
  }

  /**
   * Get mode properties/details
   * @param {Item} weapon - The weapon
   * @param {string} mode - The mode to get details for
   * @returns {Object|null} - Mode details if available
   */
  static getModeDetails(weapon, mode) {
    if (!weapon) return null;

    const modes = weapon.system?.modes || weapon.system?.weaponModes || {};
    if (Array.isArray(modes)) {
      return { name: mode, available: modes.includes(mode) };
    }

    return modes[mode] || null;
  }

  /**
   * Log mode change in actor flags for reference
   * @private
   */
  static async _logModeChange(actor, weapon, oldMode, newMode) {
    if (!actor) return;

    try {
      const modeChanges = actor.getFlag("foundryvtt-swse", "weaponModeChanges") || {};
      if (!modeChanges[weapon.id]) {
        modeChanges[weapon.id] = [];
      }

      modeChanges[weapon.id].push({
        weaponName: weapon.name,
        fromMode: oldMode,
        toMode: newMode,
        timestamp: new Date().toISOString()
      });

      await actor.setFlag("foundryvtt-swse", "weaponModeChanges", modeChanges);
    } catch (err) {
      SWSELogger.error("Failed to log mode change", err);
    }
  }

  /**
   * Get mode history for a weapon
   * @param {Actor} actor - The character
   * @param {Item} weapon - The weapon
   * @returns {Array} - Array of mode change history
   */
  static getModeHistory(actor, weapon) {
    if (!actor || !weapon) return [];

    const modeChanges = actor.getFlag("foundryvtt-swse", "weaponModeChanges") || {};
    return modeChanges[weapon.id] || [];
  }

  /**
   * Common weapon modes (for reference/validation)
   */
  static COMMON_MODES = {
    BLASTER_PISTOL: ["Lethal", "Stun"],
    BLASTER_CARBINE: ["Single-shot", "Autofire"],
    BLASTER_RIFLE: ["Single-shot", "Autofire"],
    LIGHTSABER: ["Active", "Inactive"],
    VIBROBLADE: ["Normal", "Pulse"],
    ELECTROSTAFF: ["Normal", "High Power"]
  };

  /**
   * Check if weapon matches a known type with modes
   * @param {Item} weapon - The weapon to check
   * @returns {string|null} - The weapon type key or null
   */
  static identifyWeaponType(weapon) {
    if (!weapon) return null;

    const name = (weapon.name || "").toLowerCase();

    for (const [type, _modes] of Object.entries(this.COMMON_MODES)) {
      if (name.includes(type.toLowerCase().replace(/_/g, " "))) {
        return type;
      }
    }

    return null;
  }
}
