/** Pure gunner-position counting (no Foundry imports): the single source for the sheet, the assignment service and combat station evidence. */
const VEHICLE_WEAPON_ITEM_TYPES = new Set(['weapon', 'vehicle-weapon', 'vehicleWeapon', 'vehicleWeaponRange']);
const asArray = (v) => Array.isArray(v) ? v : (v && typeof v[Symbol.iterator] === 'function') ? Array.from(v) : (Array.isArray(v?.contents) ? v.contents : []);

/**
 * Count only the GUNNER-role vehicle weapons — the number crew-resolver.js's
 * weaponStations() uses to decide how many gunner stations (gunner,
 * gunner-2, gunner-3, ...) a vehicle has. Both the crew-assignment panel and
 * the weapon-mount panel must derive this the same way, or the two panels
 * could disagree on how many gunner stations exist (e.g. a vehicle with one
 * pilot-operated weapon and two gunner-operated weapons has 2 gunner
 * stations, not 3 — counting ALL vehicle weapon items regardless of role
 * would be wrong).
 *
 * @param {Actor} actor
 * @returns {number}
 */
export function countGunnerRoleWeapons(actor) {
  const items = asArray(actor?.items);
  let count = 0;
  for (const item of items) {
    if (!VEHICLE_WEAPON_ITEM_TYPES.has(item?.type)) continue;
    const role = item?.system?.vehicleMount?.crewRole || 'gunner';
    if (role === 'gunner') count += 1;
  }
  const systemWeapons = asArray(actor?.system?.weapons);
  for (const weapon of systemWeapons) {
    if (!weapon?.name) continue;
    const role = weapon.crewRole || 'gunner';
    if (role === 'gunner') count += 1;
  }
  return count;
}
