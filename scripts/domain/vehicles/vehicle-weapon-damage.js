/**
 * Damage of a weapon installed on a vehicle through the sealed Shipyard ledger (P6B weapon slice).
 *
 * Core Rulebook, Vehicles, Damage: "Damage dealt by a vehicle weapon is calculated as: Weapon damage x damage
 * multiplier. After rolling the weapon damage dice, multiply the result by the listed damage multiplier (6d10x2:
 * roll 6d10 and multiply the result by 2)." The printed "3d10x2" string must therefore never reach the dice engine
 * as-is (Foundry reads "x2" as "explode on 2"). Nothing else (ability, half heroic level) is part of that formula.
 *
 * Only an Item the vehicle owns and that names a ledger installId qualifies; everything else keeps its own path.
 * Damage type is taken only when the printed string states it ("(Ion)"); a name-based guess is never used.
 */
import { parseVehicleWeaponDamageSpec } from '../../engine/combat/vehicle-weapon-damage-parser.js';

export function isInstalledVehicleWeaponItem(weapon) {
  const installId = weapon?.system?.vehicleMount?.installId;
  return weapon?.actor?.type === 'vehicle' && typeof installId === 'string' && installId.trim().length > 0;
}

/** @returns {null|{ok:true, formula:string, multiplier:number, damageType:string|null, printed:string}|{ok:false, reason:string}} */
export function resolveInstalledVehicleWeaponDamage(weapon) {
  if (!isInstalledVehicleWeaponItem(weapon)) return null;
  // no weapon name passed: the parser's name-based type guess is never used for mechanics
  const p = parseVehicleWeaponDamageSpec(weapon.system?.damage);
  if (!p.formula || p.special || p.modifierOnly || p.byWeapon || p.noDamage)
    return { ok: false, reason: 'VEHICLE_WEAPON_DAMAGE_NOT_ORDINARY' };
  return { ok: true, formula: p.formula, multiplier: Number.isFinite(p.multiplier) && p.multiplier > 1 ? p.multiplier : 1,
    damageType: p.typeSource === 'explicit' ? p.type : null, printed: p.raw };
}
