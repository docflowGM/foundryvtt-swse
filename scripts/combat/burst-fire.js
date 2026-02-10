/**
 * Burst Fire Mechanic (SWSE Core Rulebook)
 *
 * The Burst Fire feat allows using an autofire weapon against a single target
 * instead of an area. Takes -5 penalty, deals +2 dice damage.
 * Uses only 5 shots instead of 10.
 * NOT an area attack, so Evasion cannot reduce damage.
 */

import { SWSELogger } from '../utils/logger.js';

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
export class BurstFire {
  /**
   * Execute a burst fire attack
   * Requires Burst Fire feat
   * @param {Actor} attacker - The character making the burst fire attack
   * @param {Actor} targetActor - The single target
   * @param {Item} weapon - The autofire weapon being used for burst fire
   * @returns {Promise<Object>} - { success: boolean, roll: Roll, hit: boolean }
   */
  static async executeBurstFire(attacker, targetActor, weapon) {
    try {
      if (!attacker || !targetActor || !weapon) {
        throw new Error('Missing attacker, target, or weapon');
      }

      // Check if attacker has Burst Fire feat
      if (!this._hasBurstFireFeat(attacker)) {
        return {
          success: false,
          message: `${attacker.name} does not have the Burst Fire feat`,
          error: true
        };
      }

      // Check if weapon has autofire capability
      if (!this._hasAutofireMode(weapon)) {
        return {
          success: false,
          message: `${weapon.name} does not have an Autofire mode`,
          error: true
        };
      }

      // Check ammunition (needs 5 shots for burst fire)
      const ammoCheck = this._checkAmmunition(weapon, 5);
      if (!ammoCheck.sufficient) {
        return {
          success: false,
          message: `${weapon.name} has insufficient ammunition (needs 5, has ${ammoCheck.current})`,
          error: true,
          currentAmmo: ammoCheck.current
        };
      }

      // Calculate attack bonus with burst fire penalty
      const abilityMod = attacker.system?.attributes[weapon?.system?.attackAttribute || 'dex']?.mod || 0;
      const bab = attacker.system?.bab || 0;
      const lvl = attacker.system?.level || 1;
      const halfLvl = getEffectiveHalfLevel(actor);
      const weaponBonus = weapon?.system?.attackBonus || 0;
      const burstFirePenalty = -5;

      const totalBonus = bab + halfLvl + abilityMod + weaponBonus + burstFirePenalty;

      // Roll the attack
      const rollFormula = `1d20 + ${totalBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const attackRoll = roll.total;
      const targetReflex = targetActor.system?.defenses?.reflex?.total || 10;
      const isHit = attackRoll >= targetReflex;

      // Consume ammunition (only 5 shots for burst fire)
      await this._consumeAmmunition(weapon, 5);

      return {
        success: true,
        roll: attackRoll,
        isHit,
        penalty: burstFirePenalty,
        weapon: weapon.name,
        target: targetActor.name,
        targetReflex,
        damageBonusDice: 2,
        damageNote: '+2 dice damage on hit',
        notAreaAttack: true,
        evasionBlocked: 'Evasion talent cannot reduce burst fire damage',
        message: isHit
          ? `${attacker.name} hits ${targetActor.name} with Burst Fire! Deal +2 dice damage.`
          : `${attacker.name}'s Burst Fire misses ${targetActor.name}.`
      };
    } catch (err) {
      SWSELogger.error('Burst fire attack failed', err);
      throw err;
    }
  }

  /**
   * Check if attacker has Burst Fire feat
   * @private
   */
  static _hasBurstFireFeat(actor) {
    if (!actor) {return false;}

    const feat = actor.items?.find(item => {
      if (item.type !== 'feat') {return false;}
      const name = (item.name || '').toLowerCase();
      return name.includes('burst fire') || name.includes('burst-fire');
    });

    return !!feat;
  }

  /**
   * Check if weapon has autofire capability
   * @private
   */
  static _hasAutofireMode(weapon) {
    if (!weapon) {return false;}

    const modes = weapon.system?.modes || weapon.system?.weaponModes || [];
    const name = (weapon.name || '').toLowerCase();

    if (Array.isArray(modes)) {
      return modes.some(m => m.toLowerCase().includes('autofire'));
    }

    return Object.keys(modes).some(k => k.toLowerCase().includes('autofire')) ||
           name.includes('autofire') ||
           name.includes('auto-fire');
  }

  /**
   * Check ammunition availability
   * @private
   */
  static _checkAmmunition(weapon, required = 5) {
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
  static async _consumeAmmunition(weapon, amount = 5) {
    if (!weapon) {return;}

    try {
      const current = weapon.system?.ammunition || weapon.system?.ammo || 0;
      const remaining = Math.max(0, current - amount);

      const updatePath = weapon.system?.ammunition !== undefined
        ? 'system.ammunition'
        : 'system.ammo';

      await weapon.update({ [updatePath]: remaining });
    } catch (err) {
      SWSELogger.error('Failed to consume ammunition', err);
    }
  }

  /**
   * Get damage bonus for burst fire
   * @returns {number} - Number of extra dice (2)
   */
  static getDamageBonusDice() {
    return 2; // +2 dice of weapon damage
  }

  /**
   * Check if burst fire damage can be reduced by Evasion
   * @returns {boolean} - False (burst fire is not area attack, Evasion doesn't apply)
   */
  static canEvasionReduce() {
    return false; // Burst fire is NOT an area attack
  }

  /**
   * Get ammunition efficiency vs normal autofire
   * @returns {Object} - Comparison of shots and damage
   */
  static getAmmunitionEfficiency() {
    return {
      normalAutofire: {
        shots: 10,
        damageType: 'full/half area'
      },
      burstFire: {
        shots: 5,
        damageType: '+2 dice single target',
        efficiency: '50% ammo for enhanced single-target damage'
      }
    };
  }
}
