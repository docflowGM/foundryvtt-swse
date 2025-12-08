/**
 * Attack and damage calculations for Vehicle Combat System
 */

import {
  getRangeModifier,
  getVehicleSizeModifier,
  getGunnerBAB,
  COLLISION_DAMAGE_DICE
} from './vehicle-shared.js';

/**
 * Calculate attack bonus for vehicle weapon
 * Formula: Gunner BAB + Vehicle INT mod + Range Modifier + Misc
 * @param {Actor} vehicle - The vehicle actor
 * @param {Object} weapon - The weapon being fired
 * @param {Actor} gunner - The gunner actor
 * @param {string} range - Range band (point-blank, short, medium, long)
 * @returns {Object} Attack bonus data
 */
export function calculateAttackBonus(vehicle, weapon, gunner, range) {
  // Gunner's Base Attack Bonus
  const gunnerBAB = getGunnerBAB(vehicle, gunner);

  // Vehicle's Intelligence modifier (for targeting computer)
  const vehicleInt = vehicle.system.attributes?.int?.mod || 0;

  // Range modifier
  const rangeModifier = getRangeModifier(range);

  // Weapon-specific bonuses
  const weaponBonus = weapon.bonus || 0;

  // Battery bonus if applicable
  const batteryBonus = weapon.batteryBonus || 0;

  // Area attack penalty
  const areaAttackPenalty = weapon.areaAttack ? -5 : 0;

  // Size modifier (for vehicle attacks)
  const sizeModifier = getVehicleSizeModifier(vehicle);

  const bonus = gunnerBAB + vehicleInt + rangeModifier + weaponBonus + batteryBonus + areaAttackPenalty + sizeModifier;

  return {
    bonus,
    breakdown: {
      gunnerBAB,
      vehicleInt,
      rangeModifier,
      weaponBonus,
      batteryBonus,
      areaAttackPenalty,
      sizeModifier
    }
  };
}

/**
 * Calculate damage for vehicle weapon
 * Formula: (Weapon Damage + ½ Pilot Heroic Level + Misc) × Damage Multiplier
 * @param {Actor} vehicle - The vehicle actor
 * @param {Object} weapon - The weapon being fired
 * @param {Actor} pilot - The pilot actor
 * @param {boolean} isCrit - Whether this is a critical hit
 * @returns {Object} Damage calculation data
 */
export function calculateDamage(vehicle, weapon, pilot, isCrit) {
  const baseDamage = weapon.damage || '1d10';

  // Half pilot heroic level
  const pilotLevel = pilot?.system?.heroicLevel || pilot?.system?.level || 1;
  const halfPilotLevel = Math.floor(pilotLevel / 2);

  // Miscellaneous bonuses
  const misc = weapon.damageBonus || 0;

  // Total modifier (before multiplier)
  const modifier = halfPilotLevel + misc;

  // Damage multiplier (usually ×2, some weapons ×3 or ×5)
  let multiplier = weapon.multiplier || 2;

  // Critical hits double the multiplier
  if (isCrit) {
    multiplier *= 2;
  }

  return {
    baseDamage,
    modifier,
    multiplier,
    breakdown: {
      baseDamage,
      halfPilotLevel,
      misc,
      multiplier,
      isCrit
    }
  };
}

/**
 * Calculate collision damage based on size
 * @param {Object} object - The object (vehicle/structure)
 * @param {string} size - Size category
 * @returns {number} Collision damage
 */
export function calculateCollisionDamage(object, size) {
  const sizeStr = (size || 'medium').toLowerCase();
  const strMod = object.system?.attributes?.str?.mod || 0;

  const dice = COLLISION_DAMAGE_DICE[sizeStr] || '1d6';
  const roll = globalThis.SWSE.RollEngine.safeRoll(`${dice} + ${strMod}`);
  roll.evaluate({async: false});

  return roll.total;
}
