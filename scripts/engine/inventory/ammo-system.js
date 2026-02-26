/**
 * Ammo System — Ammunition Management & Consumption
 *
 * Handles ammunition tracking, magazine/clip management, and consumption.
 * Integrates with weapon items and actor inventory.
 *
 * SWSE Rules:
 * - Weapons with ammunition must track current/max ammo
 * - Reload is typically a swift action (can be reduced by talents)
 * - Burst Fire consumes 5 rounds
 * - Autofire consumes 10 rounds
 * - Different ammo types available (power packs, slugs, etc.)
 *
 * Integration:
 * - Tracks ammo in weapon.system.ammunition
 * - Registers modifiers for ammo types (if applicable)
 * - Routes updates through ActorEngine for owned items
 */

import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class AmmoSystem {
  /**
   * Consume ammunition from a weapon
   * @param {Actor} actor - Actor using the weapon
   * @param {Item} weapon - Weapon with ammunition
   * @param {number} amount - Amount of ammunition to consume
   * @returns {Promise<Object>} { success, newAmmo, previousAmmo, message }
   */
  static async consumeAmmunition(actor, weapon, amount = 1) {
    if (!actor || !weapon) {
      return { success: false, message: 'Invalid actor or weapon' };
    }

    const currentAmmo = weapon.system?.ammunition?.current ?? 0;

    // Check if sufficient ammo available
    if (currentAmmo < amount) {
      return {
        success: false,
        message: `${weapon.name} requires ${amount} shots but only has ${currentAmmo}`,
        previousAmmo: currentAmmo,
        newAmmo: currentAmmo
      };
    }

    const newAmmo = currentAmmo - amount;

    try {
      // Update through ActorEngine if owned by actor
      if (weapon.actor && weapon.actor.id === actor.id) {
        const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
        await ActorEngine.updateOwnedItems(actor, [{
          _id: weapon.id,
          'system.ammunition.current': newAmmo
        }]);
      } else {
        // Direct update for non-owned weapons
        await weapon.update({ 'system.ammunition.current': newAmmo });
      }

      return {
        success: true,
        message: `${weapon.name}: ${currentAmmo} → ${newAmmo} (${amount} shots)`,
        previousAmmo: currentAmmo,
        newAmmo: newAmmo,
        ammoConsumed: amount
      };
    } catch (err) {
      swseLogger.error(`Failed to consume ammunition for ${weapon.name}:`, err);
      return {
        success: false,
        message: `Failed to consume ammunition: ${err.message}`,
        previousAmmo: currentAmmo,
        newAmmo: currentAmmo
      };
    }
  }

  /**
   * Reload weapon to full ammunition
   * @param {Actor} actor - Actor reloading
   * @param {Item} weapon - Weapon to reload
   * @returns {Promise<Object>} { success, message, reloadAmount }
   */
  static async reloadWeapon(actor, weapon) {
    if (!actor || !weapon) {
      return { success: false, message: 'Invalid actor or weapon' };
    }

    const maxAmmo = weapon.system?.ammunition?.max ?? 0;
    const currentAmmo = weapon.system?.ammunition?.current ?? 0;

    if (maxAmmo === 0) {
      return { success: false, message: `${weapon.name} does not use ammunition` };
    }

    if (currentAmmo === maxAmmo) {
      return {
        success: true,
        message: `${weapon.name} is already fully loaded`,
        reloadAmount: 0
      };
    }

    const reloadAmount = maxAmmo - currentAmmo;

    try {
      // Update through ActorEngine if owned
      if (weapon.actor && weapon.actor.id === actor.id) {
        const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
        await ActorEngine.updateOwnedItems(actor, [{
          _id: weapon.id,
          'system.ammunition.current': maxAmmo
        }]);
      } else {
        // Direct update
        await weapon.update({ 'system.ammunition.current': maxAmmo });
      }

      return {
        success: true,
        message: `${weapon.name} reloaded: +${reloadAmount} rounds (${currentAmmo} → ${maxAmmo})`,
        reloadAmount: reloadAmount
      };
    } catch (err) {
      swseLogger.error(`Failed to reload ${weapon.name}:`, err);
      return {
        success: false,
        message: `Failed to reload: ${err.message}`
      };
    }
  }

  /**
   * Check if weapon has sufficient ammunition for an action
   * @param {Item} weapon - Weapon to check
   * @param {number} required - Amount required
   * @returns {Object} { hasAmmo, current, required, deficit }
   */
  static canUseWeapon(weapon, required = 1) {
    const current = weapon?.system?.ammunition?.current ?? 0;
    const hasAmmo = current >= required;
    const deficit = Math.max(0, required - current);

    return {
      hasAmmo,
      current,
      required,
      deficit,
      message: hasAmmo
        ? `${weapon.name} has sufficient ammo (${current}/${weapon.system.ammunition.max})`
        : `${weapon.name} needs ${deficit} more rounds (${current}/${required})`
    };
  }

  /**
   * Get ammunition status for a weapon
   * @param {Item} weapon - Weapon to check
   * @returns {Object} Ammo status details
   */
  static getAmmoStatus(weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      return null;
    }

    const ammo = weapon.system?.ammunition;
    if (!ammo || ammo.max === 0) {
      return null; // Weapon doesn't use ammunition
    }

    const current = ammo.current ?? 0;
    const max = ammo.max ?? 0;
    const type = ammo.type || 'Standard Ammunition';
    const percentFull = max > 0 ? Math.round((current / max) * 100) : 0;

    return {
      type,
      current,
      max,
      percentFull,
      isEmpty: current === 0,
      isFull: current === max,
      isDepleted: current === 0,
      status: current === 0 ? 'Empty' : current === max ? 'Full' : `${current}/${max}`,
      label: `${current}/${max} (${percentFull}%)`
    };
  }

  /**
   * Get ammo consumption for specific attack type
   * @param {string} attackType - Type of attack (normal, burstFire, autofire)
   * @returns {number} Ammo required
   */
  static getAmmoRequired(attackType = 'normal') {
    const costs = {
      'normal': 1,
      'rapidShot': 1,
      'pointBlankShot': 1,
      'burstFire': 5,
      'autofire': 10
    };
    return costs[attackType] || 1;
  }

  /**
   * Set ammunition for weapon (for manual management)
   * @param {Actor} actor - Actor owning weapon
   * @param {Item} weapon - Weapon to update
   * @param {number} amount - New ammo count
   * @returns {Promise<Object>} Update result
   */
  static async setAmmunition(actor, weapon, amount = 0) {
    if (!actor || !weapon) {
      return { success: false, message: 'Invalid actor or weapon' };
    }

    const max = weapon.system?.ammunition?.max ?? 0;
    if (max === 0) {
      return { success: false, message: `${weapon.name} does not use ammunition` };
    }

    // Clamp amount to valid range [0, max]
    const clamped = Math.max(0, Math.min(amount, max));

    try {
      if (weapon.actor && weapon.actor.id === actor.id) {
        const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
        await ActorEngine.updateOwnedItems(actor, [{
          _id: weapon.id,
          'system.ammunition.current': clamped
        }]);
      } else {
        await weapon.update({ 'system.ammunition.current': clamped });
      }

      return {
        success: true,
        message: `${weapon.name} ammunition set to ${clamped}/${max}`,
        current: clamped,
        max: max
      };
    } catch (err) {
      swseLogger.error(`Failed to set ammunition for ${weapon.name}:`, err);
      return {
        success: false,
        message: `Failed to set ammunition: ${err.message}`
      };
    }
  }

  /**
   * Get all weapons with ammunition for an actor
   * @param {Actor} actor - Actor to query
   * @returns {Item[]} Weapons with ammunition
   */
  static getAmmoWeapons(actor) {
    if (!actor || !actor.items) {
      return [];
    }

    return actor.items.filter(item =>
      item.type === 'weapon' &&
      item.system?.ammunition?.max > 0
    );
  }

  /**
   * Generate ammo status report for actor
   * @param {Actor} actor - Actor to check
   * @returns {Object[]} Array of ammo statuses for all weapons
   */
  static getAmmoInventory(actor) {
    const weapons = this.getAmmoWeapons(actor);
    return weapons
      .map(weapon => ({
        weaponId: weapon.id,
        weaponName: weapon.name,
        ...this.getAmmoStatus(weapon)
      }))
      .filter(w => w !== null);
  }

  /**
   * Validate ammo configuration (ensure max is set for ranged weapons)
   * @param {Item} weapon - Weapon to validate
   * @returns {Object} { valid, issues }
   */
  static validateAmmoConfig(weapon) {
    const issues = [];

    if (weapon.type !== 'weapon') {
      return { valid: true, issues }; // Not a weapon
    }

    // Check if ranged weapon
    const isRanged = weapon.system?.meleeOrRanged === 'ranged' ||
                     weapon.system?.range !== 'Melee';

    if (isRanged && (!weapon.system?.ammunition?.max || weapon.system.ammunition.max === 0)) {
      issues.push('Ranged weapon has no ammunition configured (max = 0)');
    }

    // Check if current > max
    if (weapon.system?.ammunition?.current > weapon.system?.ammunition?.max) {
      issues.push(`Current ammo (${weapon.system.ammunition.current}) exceeds max (${weapon.system.ammunition.max})`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default AmmoSystem;
