/**
 * Phase 2C: one installed-weapon provenance classifier. This does NOT certify
 * mod legality or make edited Actor data into published canonical evidence.
 * The only custom exemption is a matching weapon modification installed by
 * the shipyard's existing modification-data + shipyard bookkeeping.
 * Stock provenance is resolved separately from immutable source authority.
 */
function validKey(x) { return typeof x === 'string' && x.trim().length > 0; }
function sameWeaponLabel(a, b) {
  return validKey(a) && validKey(b) && a.trim().toLowerCase() === b.trim().toLowerCase();
}
function installedMod(vehicle, id) {
  const data = vehicle?.system?.modificationData?.modifications;
  const shipyard = vehicle?.system?.shipyard?.installedModifications;
  if (!validKey(id) || !Array.isArray(data) || !Array.isArray(shipyard)) return null;
  const match = data.find(m => m?.id === id);
  const alsoInstalled = shipyard.find(m => m?.id === id);
  if (!match || !alsoInstalled || !String(match.category ?? '').toLowerCase().startsWith('weapon') ||
      String(match.weaponType ?? '').toLowerCase() === 'enhancement' ||
      !sameWeaponLabel(match.name, alsoInstalled.name)) return null;
  return match;
}

/**
 * Derived from the **vehicle's actual persisted weapons** and applied shipyard
 * modifications, not from roll options, user-set evidence flags or ship names.
 * All other weapons, even on customized ships, are still stock candidates.
 */
export function classifyInstalledVehicleWeapon(vehicle, weapon) {
  if (!vehicle || vehicle.type !== 'vehicle' || !weapon || !validKey(weapon.id))
    return { kind:'UNRESOLVED', reason:'VEHICLE_OR_WEAPON_MISSING' };
  const matchedIndex = /^system-weapons-(\d+)$/.exec(weapon.id);
  if (matchedIndex) {
    const index = Number(matchedIndex[1]);
    const row = vehicle.system?.weapons?.[index];
    if (!row || !sameWeaponLabel(row.name, weapon.name))
      return { kind:'UNRESOLVED', reason:'SYSTEM_WEAPON_MISMATCH' };
    const mod = installedMod(vehicle, row.sourceModificationId);
    if (mod && sameWeaponLabel(mod.name, row.name))
      return { kind:'SHIPYARD_MODIFICATION', sourceModificationId:mod.id, weaponIndex:index };
    return { kind:'STOCK_CANDIDATE', weaponIndex:index };
  }
  const owned = vehicle.items?.get?.(weapon.id) ?? Array.from(vehicle.items ?? []).find(x => x?.id === weapon.id);
  if (owned !== weapon) return { kind:'UNRESOLVED', reason:'WEAPON_NOT_OWNED_BY_VEHICLE' };
  const id = weapon.system?.vehicleMount?.sourceModificationId ?? weapon.system?.sourceModificationId;
  const mod = installedMod(vehicle,id);
  if (mod && sameWeaponLabel(mod.name,weapon.name))
    return { kind:'SHIPYARD_MODIFICATION', sourceModificationId:mod.id, itemId:weapon.id };
  return { kind:'STOCK_CANDIDATE', itemId:weapon.id };
}