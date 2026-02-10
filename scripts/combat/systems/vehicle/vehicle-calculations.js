/**
 * SWSE Vehicle Combat Calculations
 *
 * This module provides:
 *  - Vehicle attack bonus calculations
 *  - Vehicle defensive values (Reflex, Handling, CT penalties)
 *  - Vehicle damage preparation
 *  - Range band evaluation
 *  - Utilities used by vehicle combat workflows
 *
 * Integrated with:
 *  - combat-utils.js
 *  - vehicle-shared.js
 *  - SWSERoll / DamageSystem via SWSEVehicleCombat
 */

import { getVehicleCTPenalty, measureDistance, measureSquares } from './vehicle-shared.js';
import { computeAttackBonus } from '../../utils/combat-utils.js';

/**
 * Determine which modifier is used for vehicle weapons.
 * RAW:
 *  - Starship weapons: Use Pilot instead of BAB
 *  - Vehicle-mounted personal weapons: Use normal attack routine
 *  - Vehicular combat feat can alter targeting
 */
export function computeVehicleAttackBonus(attacker, weapon, vehicleActor) {
  const system = vehicleActor.system;

  // Determine if weapon is a "true vehicle weapon" (starship turrets, batteries, etc.)
  const isVehicleWeapon =
    weapon.system?.isVehicleWeapon ||
    weapon.system?.weaponType === 'vehicle' ||
    weapon.system?.weaponType === 'starship';

  // Pilot modifier for true vehicle weapons
  let pilotMod = 0;
  if (isVehicleWeapon) {
    const pilotSkill = attacker.system.skills?.pilot;
    if (pilotSkill) {pilotMod = pilotSkill.total ?? 0;}
  }

  // Normal weapon (mounted personal arms)
  const normalBonus = computeAttackBonus(attacker, weapon);

  // Final bonus (vehicle weapons override personal attack bonus)
  const bonus = isVehicleWeapon ? pilotMod : normalBonus;

  return {
    bonus,
    isVehicleWeapon,
    breakdown: {
      pilotMod,
      normalBonus
    }
  };
}

/**
 * RAW Vehicle Reflex Defense Calculation:
 *
 * Reflex Defense =
 *   10 +
 *   pilot skill (as Dex substitute) +
 *   size modifier +
 *   handling modifier +
 *   vehicle CT penalty +
 *   cover/concealment handled separately
 */
export function computeVehicleReflexDefense(vehicleActor) {
  const system = vehicleActor.system;

  const base = 10;

  const pilotSkill = system.skills?.pilot?.total ?? 0;

  const sizeMod = {
    fine: +8,
    diminutive: +4,
    tiny: +2,
    small: +1,
    medium: 0,
    large: -1,
    huge: -2,
    gargantuan: -4,
    colossal: -8,
    colossal2: -10
  }[system.size?.toLowerCase()] ?? 0;

  const handling = system.vehicle?.handling ?? 0;

  const ctPenalty = getVehicleCTPenalty(system.conditionTrack?.current ?? 0);

  const reflex = base + pilotSkill + sizeMod + handling + ctPenalty;

  return {
    reflex,
    components: { base, pilotSkill, sizeMod, handling, ctPenalty }
  };
}

/**
 * Compute damage modifiers for a vehicle-based weapon attack.
 * Vehicle weapons often deal massive dice, but still obey DR/SR logic.
 */
export function computeVehicleDamage(attacker, weapon, options = {}) {
  const baseDamage = weapon.system?.damage ?? '1d10';
  const bonus = weapon.system?.damageBonus ?? 0;

  const multiplier = options.isCrit ? (weapon.system?.critMultiplier || 2) : 1;

  const formula =
    multiplier === 1
      ? `${baseDamage} + ${bonus}`
      : `(${baseDamage} + ${bonus}) * ${multiplier}`;

  return {
    formula,
    baseDamage,
    bonus,
    multiplier
  };
}

/**
 * Compute vehicle SR (shield rating) and DR (damage reduction).
 * Used by SWSEVehicleCombat → DamageSystem.
 */
export function computeVehicleDefensiveStats(vehicleActor) {
  const system = vehicleActor.system;

  const sr = system.shields?.rating ?? 0;
  const dr = system.damageReduction ?? 0;
  const threshold = system.damageThreshold ?? 10;

  return { sr, dr, threshold };
}

/**
 * Evaluate range bands for vehicle weapons.
 * RAW: starship ranges are in squares but far greater than personal weapons.
 */
export function computeVehicleRangeBand(attackerToken, targetToken, weapon, actor) {
  const dist = measureSquares(attackerToken, targetToken);
  const ranges = weapon.system?.ranges;

  if (!ranges) {
    return { band: 'unknown', distance: dist, penalty: 0 };
  }

  let band = 'out-of-range';
  let penalty = -20;

  const { pointBlank, short, medium, long } = ranges;

  if (dist <= pointBlank) {band = 'pointBlank', penalty = 0;} else if (dist <= short) {band = 'short', penalty = -2;} else if (dist <= medium) {band = 'medium', penalty = -5;} else if (dist <= long) {band = 'long', penalty = -10;}

  return { band, distance: dist, penalty };
}

/**
 * Compute dogfighting situational modifiers:
 *  - Facing toward target
 *  - Tail position
 *  - Maneuvering bonuses (from feats)
 */
export function computeDogfightingModifier(attacker, target, attackerToken, targetToken) {
  let bonus = 0;

  const facing = attackerToken?.document.rotation ?? 0;
  const angleToTarget = Math.atan2(
    targetToken.center.y - attackerToken.center.y,
    targetToken.center.x - attackerToken.center.x
  );

  const facingRad = facing * (Math.PI / 180);
  const diff = Math.abs((facingRad - angleToTarget + Math.PI * 2) % (Math.PI * 2));

  if (diff < Math.PI / 6) {bonus += 2;} // Attacking within forward arc

  const hasVehicularCombat = attacker.items.some(i =>
    i.type === 'feat' && i.name.toLowerCase().includes('vehicular combat')
  );

  if (hasVehicularCombat) {bonus += 2;}

  return bonus;
}
