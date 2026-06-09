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


function settingEnabled(key, fallback = false) {
  try {
    return game?.settings?.get?.(game.system?.id ?? 'foundryvtt-swse', key) ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hasTruthyOption(options = {}, key = '') {
  return options?.[key] === true
    || options?.combatOptions?.[key] === true
    || options?.attackOptions?.[key] === true
    || options?.combatOptions?.[key] === 1
    || options?.attackOptions?.[key] === 1;
}

function weaponLooksRanged(weapon = null) {
  const system = weapon?.system ?? {};
  const fields = [
    system.meleeOrRanged,
    system.weaponRangeType,
    system.weaponType,
    system.weaponCategory,
    system.category,
    system.type,
    system.range,
    system.group,
    system.weaponGroup,
    weapon?.name
  ].map(normalizeKey).filter(Boolean);
  return fields.some(value => value.includes('ranged') || value.includes('pistol') || value.includes('rifle') || value.includes('blaster') || value.includes('bowcaster') || value.includes('slugthrower'));
}

function workflowTags(context = {}) {
  return new Set((Array.isArray(context?.contextTags) ? context.contextTags : []).map(normalizeKey));
}

export class AmmoSystem {
  /**
   * Whether the optional blaster/ammunition tracking house rule is enabled.
   * Kept here so combat callers use the ammunition SSOT rather than reading
   * settings independently.
   */
  static isTrackingEnabled() {
    return settingEnabled('trackBlasterCharges', false) === true;
  }

  /**
   * Return true when this weapon has a configured ammunition pool.
   */
  static weaponUsesAmmunition(weapon) {
    return asNumber(weapon?.system?.ammunition?.max, 0) > 0;
  }

  /**
   * Resolve how many shots a workflow should spend.
   * Priority: explicit workflow/action metadata → selected attack option →
   * inferred ranged basic attack cost.
   */
  static resolveAmmoCost({ weapon = null, workflowContext = null, options = {}, optionModifiers = {} } = {}) {
    const context = workflowContext ?? options?.combatContext ?? options?.workflowContext ?? {};
    const tags = workflowTags(context);
    const ruleData = context?.ruleData ?? options?.ruleData ?? {};
    const resources = context?.resources ?? {};

    const explicit = asNumber(
      options.ammoCost
      ?? resources.ammoCost
      ?? context.ammoCost
      ?? ruleData.ammoCost
      ?? optionModifiers.ammunitionCost,
      0
    );
    if (explicit > 0) return explicit;

    if (hasTruthyOption(options, 'burstFire') || tags.has('burstfire') || tags.has('burst-fire') || context?.attack?.isBurstFire === true) return 5;
    if (hasTruthyOption(options, 'autofire') || tags.has('autofire') || context?.attack?.isAutofire === true) return 10;

    if (this.weaponUsesAmmunition(weapon) && weaponLooksRanged(weapon)) return 1;
    return 0;
  }

  /**
   * Non-mutating ammo preflight used before action economy is spent.
   */
  static preflightAmmunition(actor, weapon, amount = 1, options = {}) {
    if (!this.isTrackingEnabled()) return { ok: true, tracked: false, skipped: true, reason: 'ammo-tracking-disabled', amount: 0 };
    const required = Math.max(0, Math.floor(asNumber(amount, 0)));
    if (!required) return { ok: true, tracked: false, skipped: true, reason: 'no-ammo-cost', amount: 0 };
    if (!actor || !weapon) return { ok: false, tracked: true, reason: 'missing-actor-or-weapon', amount: required, message: 'Missing actor or weapon for ammunition check.' };
    if (!this.weaponUsesAmmunition(weapon)) return { ok: true, tracked: false, skipped: true, reason: 'weapon-has-no-ammo-pool', amount: 0 };
    const status = this.canUseWeapon(weapon, required);
    return {
      ok: status.hasAmmo === true,
      tracked: true,
      amount: required,
      current: status.current,
      max: asNumber(weapon?.system?.ammunition?.max, 0),
      deficit: status.deficit,
      message: status.message,
      options
    };
  }

  /**
   * Mutating spend entry point for attack workflows. If a later part of the
   * workflow throws, callers can pass the returned object to rollbackSpend().
   */
  static async spendForWorkflow(actor, weapon, { workflowContext = null, options = {}, optionModifiers = {} } = {}) {
    const amount = this.resolveAmmoCost({ weapon, workflowContext, options, optionModifiers });
    const preflight = this.preflightAmmunition(actor, weapon, amount, options);
    if (!preflight.ok) return { success: false, ...preflight };
    if (preflight.skipped || preflight.tracked === false) return { success: true, spent: false, ...preflight };

    const result = await this.consumeAmmunition(actor, weapon, amount);
    return {
      success: result.success === true,
      spent: result.success === true,
      amount,
      actorId: actor?.id ?? null,
      weaponId: weapon?.id ?? weapon?._id ?? null,
      previousAmmo: result.previousAmmo,
      newAmmo: result.newAmmo,
      message: result.message,
      rollback: result.success === true
        ? { actorId: actor?.id ?? null, weaponId: weapon?.id ?? weapon?._id ?? null, amount, previousAmmo: result.previousAmmo, newAmmo: result.newAmmo }
        : null
    };
  }

  /**
   * Return ammunition after a failed attack workflow mutation. This caps at max
   * ammo so reloads or manual edits made after the spend are not overfilled.
   */
  static async rollbackSpend(actor, weapon, spendResult = {}) {
    if (!spendResult?.spent || !weapon) return { success: true, skipped: true };
    const current = asNumber(weapon.system?.ammunition?.current, 0);
    const max = asNumber(weapon.system?.ammunition?.max, 0);
    const restoreTo = Math.min(max || Number.POSITIVE_INFINITY, asNumber(spendResult.previousAmmo, current + asNumber(spendResult.amount, 0)));
    return this.setAmmunition(actor ?? weapon.actor, weapon, restoreTo);
  }

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
      // PHASE 2B: Update through ActorEngine if owned by any actor
      if (weapon.actor) {
        const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
        await ActorEngine.updateOwnedItems(weapon.actor, [{
          _id: weapon.id,
          'system.ammunition.current': newAmmo
        }]);
      } else {
        // Fallback for unowned weapons (compendium, etc)
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
      // PHASE 2B: Update through ActorEngine if owned by any actor
      if (weapon.actor) {
        const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
        await ActorEngine.updateOwnedItems(weapon.actor, [{
          _id: weapon.id,
          'system.ammunition.current': maxAmmo
        }]);
      } else {
        // Fallback for unowned weapons (compendium, etc)
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
      // PHASE 2B: Update through ActorEngine if owned by any actor
      if (weapon.actor) {
        const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
        await ActorEngine.updateOwnedItems(weapon.actor, [{
          _id: weapon.id,
          'system.ammunition.current': clamped
        }]);
      } else {
        // Fallback for unowned weapons (compendium, etc)
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
