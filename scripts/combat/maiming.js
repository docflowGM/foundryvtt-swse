/**
 * Maiming Foes Mechanic (SWSE Web Enhancements)
 *
 * A character can attempt to cripple an opponent instead of killing them
 * by making an attack at -5 penalty dealing half damage.
 * If the attack reduces the target to 0 HP, they are maimed but alive.
 */

import { SWSELogger } from '../utils/logger.js';

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
export class MaimingMechanic {
  /**
   * Execute a maiming attack
   * @param {Actor} attacker - The character making the maiming attack
   * @param {Actor} target - The target to maim
   * @param {Item} weapon - The weapon being used
   * @param {Roll} damageRoll - The rolled damage
   * @returns {Promise<Object>} - { success: boolean, roll: Roll, damage: number, targetMaimed: boolean }
   */
  static async attemptMaim(attacker, target, weapon, damageRoll) {
    try {
      if (!attacker || !target || !weapon) {
        throw new Error('Missing attacker, target, or weapon');
      }

      // Calculate maiming attack bonus (BAB + modifiers - 5 penalty)
      const abilityMod = attacker.system?.attributes[weapon?.system?.attackAttribute || 'str']?.mod || 0;
      const bab = attacker.system?.bab || 0;
      const lvl = attacker.system?.level || 1;
      const halfLvl = getEffectiveHalfLevel(actor);
      const weaponBonus = weapon?.system?.attackBonus || 0;
      const maimPenalty = -5;

      const totalBonus = bab + halfLvl + abilityMod + weaponBonus + maimPenalty;

      // Roll the maiming attack
      const rollFormula = `1d20 + ${totalBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const success = roll.total >= (target.system?.defenses?.reflex?.total || 10);

      if (!success) {
        return {
          success: false,
          roll,
          damage: 0,
          targetMaimed: false,
          message: `${attacker.name} attempts to maim ${target.name} but misses!`
        };
      }

      // On successful hit, deal half damage
      const halfDamage = Math.floor(damageRoll.total / 2);

      // Check if target would be reduced to 0 HP
      const targetCurrentHP = target.system?.hp?.value || 0;
      const targetThreshold = target.system?.damageThreshold || 0;
      const targetMaimed = halfDamage >= targetThreshold && (targetCurrentHP - halfDamage) <= 0;

      return {
        success: true,
        roll,
        damage: halfDamage,
        targetMaimed,
        targetName: target.name,
        weaponName: weapon.name,
        message: targetMaimed
          ? `${attacker.name} maims ${target.name} with ${weapon.name}! (${halfDamage} damage - target incapacitated but alive)`
          : `${attacker.name} wounds ${target.name} with ${weapon.name}! (${halfDamage} damage)`
      };
    } catch (err) {
      SWSELogger.error('Maiming attack failed', err);
      throw err;
    }
  }

  /**
   * Apply maiming condition to target
   * Marks the target as maimed but alive
   * @param {Actor} target - The maimed character
   * @param {string} maimType - Type of maiming (e.g., "severed_arm", "crippled_leg", "blinded")
   */
  static async applyMaimingCondition(target, maimType = 'maimed') {
    if (!target) {return;}

    try {
      // Set flag indicating character is maimed
      await target.setFlag('foundryvtt-swse', 'isMaimed', true);
      await target.setFlag('foundryvtt-swse', 'maimType', maimType);

      // Could apply status effect here if needed
      SWSELogger.info(`${target.name} has been maimed: ${maimType}`);
    } catch (err) {
      SWSELogger.error('Failed to apply maiming condition', err);
    }
  }

  /**
   * Check if a character is maimed
   * @param {Actor} actor - The character to check
   * @returns {boolean|string} - False if not maimed, string describing maim type if maimed
   */
  static isMaimed(actor) {
    if (!actor) {return false;}
    return actor.getFlag('foundryvtt-swse', 'isMaimed') ? actor.getFlag('foundryvtt-swse', 'maimType') : false;
  }

  /**
   * Restore a maimed character (heals the maiming)
   * @param {Actor} actor - The character to restore
   */
  static async restoreMaimedCharacter(actor) {
    if (!actor) {return;}

    try {
      await actor.unsetFlag('foundryvtt-swse', 'isMaimed');
      await actor.unsetFlag('foundryvtt-swse', 'maimType');
      SWSELogger.info(`${actor.name} has been restored from maiming`);
    } catch (err) {
      SWSELogger.error('Failed to restore maimed character', err);
    }
  }
}
