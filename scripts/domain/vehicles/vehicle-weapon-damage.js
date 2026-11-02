/**
 * Authority of a weapon installed on a vehicle through the sealed Shipyard ledger (P6B weapon slice).
 *
 * The owned weapon Item is only a REPRESENTATION. Everything executable comes from the sealed, digest-verified ledger
 * entry (installation identity, catalog id, mount key, arc, operator) and the certified weapon specification in the
 * effects registry (damage). The Item's own damage / mount / name fields are never an authority: an edited Item either
 * disagrees with the ledger (and is refused) or is ignored.
 *
 * Core Rulebook, Vehicles, Damage: "Damage dealt by a vehicle weapon is calculated as: Weapon damage x damage
 * multiplier. After rolling the weapon damage dice, multiply the result by the listed damage multiplier (6d10x2:
 * roll 6d10 and multiply the result by 2)." The printed "3d10x2" must therefore never reach the dice engine as-is
 * (Foundry reads "x2" as "explode on 2"). Nothing else (ability, half heroic level) is part of that formula.
 *
 * Damage type is taken only when the printed string states it ("(Ion)"); a name-based guess is never used.
 */
import { parseVehicleWeaponDamageSpec } from '../../engine/combat/vehicle-weapon-damage-parser.js';
import { getVerifiedPublishedRecord } from './vehicle-source-identity.js';
import { readCertifiedInstallations } from './vehicle-installation-ledger.js';
import { EFFECTS } from './vehicle-modification-effects.js';

export const INSTALLED_WEAPON_FLAG = 'vehicleInstalledWeapon';

const text = v => (typeof v === 'string' ? v.trim() : '');
const sameLabel = (a, b) => text(a) !== '' && text(a).toLowerCase() === text(b).toLowerCase();
const rawOf = doc => (typeof doc?.toObject === 'function' ? doc.toObject() : doc);

/** An Item that claims to be a Shipyard-installed vehicle weapon (it names a ledger installation). */
export function isInstalledVehicleWeaponItem(weapon) {
  return weapon?.actor?.type === 'vehicle' && text(weapon?.system?.vehicleMount?.installId) !== '';
}

/** A Shipyard-managed weapon Item (created by the installation service). */
export function isShipyardManagedWeaponItem(weapon) {
  return text(weapon?.flags?.swse?.[INSTALLED_WEAPON_FLAG]?.installId) !== '' || text(weapon?.getFlag?.('swse', INSTALLED_WEAPON_FLAG)?.installId) !== '';
}

/**
 * Resolve the certified identity of an installed vehicle weapon Item.
 * @returns {null | {ok:true, entry:object, spec:object, mount:object} | {ok:false, reason:string}}
 *   null = not an installed-vehicle-weapon Item at all (ordinary weapons keep their own path).
 */
export function resolveCertifiedInstalledWeapon(weapon) {
  if (!isInstalledVehicleWeaponItem(weapon)) return null;
  const vehicle = weapon.actor;
  const record = getVerifiedPublishedRecord(vehicle);
  if (!record) return { ok: false, reason: 'INSTALLED_WEAPON_VEHICLE_UNVERIFIED' };
  const key = record.identity?.sourceEntryKey;
  const entry = readCertifiedInstallations(rawOf(vehicle)?.flags, key).entries
    .find(e => e.installId === text(weapon.system.vehicleMount.installId));
  if (!entry) return { ok: false, reason: 'INSTALLED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION' };
  const spec = EFFECTS[entry.catalogId];
  if (spec?.kind !== 'weapon') return { ok: false, reason: 'INSTALLED_WEAPON_HAS_NO_CERTIFIED_SPECIFICATION' };
  if (entry.executable !== true || !/^weapon$/i.test(entry.category ?? '') || !entry.mount) return { ok: false, reason: 'INSTALLED_WEAPON_NOT_EXECUTABLE' };
  // The Item must still be the representation of THIS installation.
  const flag = weapon.flags?.swse?.[INSTALLED_WEAPON_FLAG] ?? weapon.getFlag?.('swse', INSTALLED_WEAPON_FLAG) ?? null;
  const vm = weapon.system.vehicleMount;
  const m = entry.mount;
  if (flag?.installId !== entry.installId || flag?.catalogId !== entry.catalogId || flag?.sourceEntryKey !== key)
    return { ok: false, reason: 'INSTALLED_WEAPON_ITEM_IDENTITY_MISMATCH' };
  if (vm.mountKey !== m.mountKey || vm.arc !== m.arc || vm.crewRole !== m.operatorRole)
    return { ok: false, reason: 'INSTALLED_WEAPON_ITEM_MOUNT_MISMATCH' };
  if (!sameLabel(entry.name, weapon.name)) return { ok: false, reason: 'INSTALLED_WEAPON_ITEM_NAME_MISMATCH' };
  if (text(weapon.system.damage) !== spec.damage) return { ok: false, reason: 'INSTALLED_WEAPON_ITEM_DAMAGE_DIVERGES_FROM_CERTIFIED_SPECIFICATION' };
  return { ok: true, entry, spec, mount: m };
}

/**
 * Executable damage of an installed vehicle weapon: the CERTIFIED specification of its sealed installation.
 * @returns {null|{ok:true, formula:string, multiplier:number, damageType:string|null, printed:string}|{ok:false, reason:string}}
 */
export function resolveInstalledVehicleWeaponDamage(weapon) {
  const id = resolveCertifiedInstalledWeapon(weapon);
  if (!id) return null;
  if (!id.ok) return id;
  // no weapon name passed: the parser's name-based type guess is never used for mechanics
  const p = parseVehicleWeaponDamageSpec(id.spec.damage);
  if (!p.formula || p.special || p.modifierOnly || p.byWeapon || p.noDamage)
    return { ok: false, reason: 'VEHICLE_WEAPON_DAMAGE_NOT_ORDINARY' };
  return { ok: true, formula: p.formula, multiplier: Number.isFinite(p.multiplier) && p.multiplier > 1 ? p.multiplier : 1,
    damageType: p.typeSource === 'explicit' ? p.type : null, printed: p.raw };
}
