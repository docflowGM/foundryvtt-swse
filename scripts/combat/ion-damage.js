/**
 * Ion Damage Mechanic (SWSE Core Rulebook)
 *
 * Ion Pistols and Ion Rifles emit electrostatic energy that can disable
 * Droids, Vehicles, electrical devices, and cybernetically enhanced creatures.
 *
 * On successful attack:
 * - Subtract HALF of ion damage from target's HP
 * - Non-cybernetic creatures: take half damage, no other effects
 * - Droids/Vehicles/Electronics/Cyborgs: additional effects based on damage
 */

import { SWSELogger } from "../utils/logger.js";

export class IonDamage {
  /**
   * Apply ion damage to a target
   * @param {Actor} attacker - The character using ion weapon
   * @param {Actor} target - The target being hit
   * @param {Item} weapon - The ion weapon (Ion Pistol, Ion Rifle, etc)
   * @param {number} baseDamage - The base ion damage rolled
   * @returns {Promise<Object>} - { success: boolean, damage: number, effects: Array }
   */
  static async applyIonDamage(attacker, target, weapon, baseDamage) {
    try {
      if (!attacker || !target || !weapon) {
        throw new Error("Missing attacker, target, or weapon");
      }

      // Verify weapon deals ion damage
      if (!this._isIonWeapon(weapon)) {
        return {
          success: false,
          message: `${weapon.name} does not deal Ion Damage`,
          error: true
        };
      }

      const results = {
        weapon: weapon.name,
        target: target.name,
        baseDamage,
        halfDamage: Math.floor(baseDamage / 2),
        targetType: this._getTargetType(target),
        effects: [],
        success: true
      };

      // Apply half damage to HP
      const currentHP = target.system?.hp?.value || 0;
      const halfDamage = Math.floor(baseDamage / 2);
      const newHP = Math.max(0, currentHP - halfDamage);

      // Store the half damage for later HP update
      results.hpDamage = halfDamage;
      results.previousHP = currentHP;
      results.newHP = newHP;

      // Check if target is eligible for ion effects (droid, vehicle, cyborg, etc)
      const isEligibleForIonEffects = this._isEligibleForIonEffects(target);

      if (!isEligibleForIonEffects) {
        // Non-cybernetic creatures just take half damage with no effects
        results.message = `${target.name} takes ${halfDamage} ion damage (half of ${baseDamage}) and is singed but unaffected.`;
        return results;
      }

      // Droid/Vehicle/Cyborg - check for condition track effects
      const threshold = target.system?.damageThreshold || 0;

      // Check if full (not halved) damage reduces target to 0 HP
      if (halfDamage >= (currentHP) && halfDamage > 0) {
        // This will reduce target to 0 HP - apply -5 CT penalty
        results.effects.push({
          type: "condition_track_penalty",
          amount: -5,
          reason: "Ion damage reduced to 0 HP",
          result: "Disabled or Knocked Unconscious"
        });
      }

      // Check if full (not halved) damage equals or exceeds threshold
      if (baseDamage >= threshold && threshold > 0) {
        results.effects.push({
          type: "condition_track_penalty",
          amount: -2,
          reason: `Ion damage (${baseDamage}) >= Damage Threshold (${threshold})`,
          result: "Condition Track worsens"
        });
      }

      // Apply condition track penalties
      if (results.effects.length > 0) {
        await this._applyConditionTrackPenalties(target, results.effects);
      }

      // Set ion damage flag on target for tracking
      await this._setIonDamageFlag(target, {
        damageAmount: baseDamage,
        halfDamage,
        source: attacker.name,
        weapon: weapon.name,
        timestamp: new Date().toISOString()
      });

      const effectsText = results.effects.length > 0
        ? ` ${results.effects.map(e => e.reason).join("; ")}.`
        : "";

      results.message = `${target.name} takes ${halfDamage} ion damage (half of ${baseDamage}).${effectsText}`;

      return results;
    } catch (err) {
      SWSELogger.error("Ion damage application failed", err);
      throw err;
    }
  }

  /**
   * Check if weapon deals ion damage
   * @private
   */
  static _isIonWeapon(weapon) {
    if (!weapon) return false;

    const name = (weapon.name || "").toLowerCase();
    const damageType = (weapon.system?.damageType || "").toLowerCase();

    return name.includes("ion") || damageType.includes("ion");
  }

  /**
   * Get target type for ion damage purposes
   * @private
   */
  static _getTargetType(actor) {
    if (!actor) return "unknown";
    if (actor.type === "droid") return "droid";
    if (actor.type === "vehicle") return "vehicle";

    // Check if character/NPC has cybernetic prosthetics
    const hasCyberware = actor.items?.some(item => {
      const name = (item.name || "").toLowerCase();
      return name.includes("cybernetic") || name.includes("prosthetic") || name.includes("implant");
    });

    if (hasCyberware) return "cyborg";

    return "organic";
  }

  /**
   * Check if target is eligible for ion damage special effects
   * @private
   */
  static _isEligibleForIonEffects(actor) {
    if (!actor) return false;

    const type = this._getTargetType(actor);
    return ["droid", "vehicle", "cyborg"].includes(type);
  }

  /**
   * Apply condition track penalties from ion damage
   * @private
   */
  static async _applyConditionTrackPenalties(actor, effects) {
    if (!actor || !effects || effects.length === 0) return;

    try {
      // Calculate total condition track movement
      const totalCTPenalty = effects.reduce((sum, effect) => {
        return sum + (effect.amount || 0);
      }, 0);

      // Apply condition track penalty
      if (totalCTPenalty !== 0) {
        const currentCT = actor.system?.conditionTrack?.current || 0;
        const newCT = currentCT + totalCTPenalty;

        // Update actor's condition track
        await actor.update({
          "system.conditionTrack.current": newCT
        });

        SWSELogger.info(`${actor.name} condition track moved ${totalCTPenalty} steps (to ${newCT})`);
      }
    } catch (err) {
      SWSELogger.error("Failed to apply condition track penalty", err);
    }
  }

  /**
   * Set ion damage tracking flag on target
   * @private
   */
  static async _setIonDamageFlag(actor, ionData) {
    if (!actor) return;

    try {
      const ionDamageHistory = actor.getFlag("foundryvtt-swse", "ionDamageHistory") || [];
      ionDamageHistory.push(ionData);

      await actor.setFlag("foundryvtt-swse", "ionDamageHistory", ionDamageHistory);
      await actor.setFlag("foundryvtt-swse", "lastIonDamage", ionData);
    } catch (err) {
      SWSELogger.error("Failed to set ion damage flag", err);
    }
  }

  /**
   * Get ion damage history for a target
   * @param {Actor} actor - The target actor
   * @returns {Array} - Array of previous ion damage events
   */
  static getIonDamageHistory(actor) {
    if (!actor) return [];

    return actor.getFlag("foundryvtt-swse", "ionDamageHistory") || [];
  }

  /**
   * Get last ion damage received
   * @param {Actor} actor - The target actor
   * @returns {Object|null} - Last ion damage data or null
   */
  static getLastIonDamage(actor) {
    if (!actor) return null;

    return actor.getFlag("foundryvtt-swse", "lastIonDamage") || null;
  }

  /**
   * Check if weapon is an ion weapon
   * @param {Item} weapon - Weapon to check
   * @returns {boolean} - True if weapon deals ion damage
   */
  static isIonWeapon(weapon) {
    return this._isIonWeapon(weapon);
  }

  /**
   * Get ion damage summary for display
   * @param {Object} ionDamageResult - Result from applyIonDamage
   * @returns {string} - Formatted summary of ion damage effects
   */
  static getSummary(ionDamageResult) {
    if (!ionDamageResult) return "";

    let summary = `Ion Damage: ${ionDamageResult.halfDamage} HP damage (${ionDamageResult.baseDamage} → half)`;

    if (ionDamageResult.effects && ionDamageResult.effects.length > 0) {
      summary += "\n Effects:\n";
      for (const effect of ionDamageResult.effects) {
        summary += `  • ${effect.reason}: ${effect.result}\n`;
      }
    }

    return summary;
  }

  /**
   * Common ion weapons reference
   */
  static ION_WEAPONS = {
    PISTOL: {
      name: "Ion Pistol",
      baseDamage: "3d6",
      range: "6 squares",
      targetType: "Single"
    },
    RIFLE: {
      name: "Ion Rifle",
      baseDamage: "4d6",
      range: "15 squares",
      targetType: "Single"
    },
    CANNON: {
      name: "Ion Cannon",
      baseDamage: "6d6",
      range: "500 squares",
      targetType: "Single vehicle/structure"
    }
  };
}
