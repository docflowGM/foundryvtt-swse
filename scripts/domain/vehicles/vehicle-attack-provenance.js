/**
 * Phase 2C: one installed-weapon provenance classifier. This does NOT certify
 * mod legality or make edited Actor data into published canonical evidence.
 * The only custom exemption is a matching weapon modification installed by
 * the shipyard's existing modification-data + shipyard bookkeeping.
 * Stock provenance is resolved separately from immutable source authority.
 */
import { getVerifiedPublishedRecord } from './vehicle-published-derived.js';
import { readCertifiedInstallations } from './vehicle-installation-ledger.js';

function claimsSourceProvenance(vehicle) {
  const swse = vehicle?.flags?.swse;
  return Boolean(swse?.universalVehicleSource || swse?.canonicalPublication || vehicle?.system?.vehicleSourceEntryKey);
}

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
  // Source-backed vehicles: the legacy shipyard exemption below trusts actor-provided
  // fields (system.modificationData / system.shipyard / system.weapons rows) and is not
  // available. Only a sealed, executable P2 ledger installation backing a weapon Item
  // the vehicle actually owns can be fired; printed attack groups and forged rows never.
  // A vehicle that CLAIMS publication provenance but fails verification (edited record,
  // broken digest) stays on this path and is denied; it never downgrades to the legacy one.
  if (claimsSourceProvenance(vehicle)) return classifySourceBackedWeapon(vehicle, weapon);
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
function classifySourceBackedWeapon(vehicle, weapon) {
  if (/^system-weapons-\d+$/.test(weapon.id))
    return { kind:'UNRESOLVED', reason:'SOURCE_BACKED_SYSTEM_WEAPON_ROW_NOT_EXECUTABLE' };
  const owned = vehicle.items?.get?.(weapon.id) ?? Array.from(vehicle.items ?? []).find(x => x?.id === weapon.id);
  if (owned !== weapon) return { kind:'UNRESOLVED', reason:'WEAPON_NOT_OWNED_BY_VEHICLE' };
  const record = getVerifiedPublishedRecord(vehicle);
  if (!record) return { kind:'UNRESOLVED', reason:'SOURCE_BACKED_CLAIM_UNVERIFIED' };
  const key = record.identity?.sourceEntryKey;
  const installId = weapon.system?.vehicleMount?.installId;
  const entry = validKey(installId)
    ? readCertifiedInstallations(vehicle.flags, key).entries.find(e => e.installId === installId)
    : null;
  if (!entry) return { kind:'UNRESOLVED', reason:'SOURCE_BACKED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION' };
  const m = entry.mount;
  const mounted = entry.executable === true && /^weapon$/i.test(entry.category ?? '') && m &&
    validKey(m.mountKey) && validKey(m.arc) && validKey(m.operatorRole);
  if (!mounted) return { kind:'UNRESOLVED', reason:'CERTIFIED_INSTALLATION_NOT_EXECUTABLE' };
  if (!sameWeaponLabel(entry.name, weapon.name)) return { kind:'UNRESOLVED', reason:'INSTALLATION_WEAPON_NAME_MISMATCH' };
  if (weapon.system?.vehicleMount?.crewRole !== m.operatorRole)
    return { kind:'UNRESOLVED', reason:'INSTALLATION_OPERATOR_ROLE_MISMATCH' };
  return { kind:'CERTIFIED_INSTALLATION', installId, itemId:weapon.id, mount:m };
}
