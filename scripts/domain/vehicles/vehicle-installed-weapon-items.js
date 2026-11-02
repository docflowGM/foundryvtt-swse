/**
 * P6B weapon slice: the owned weapon Item of a certified, executable ledger installation.
 *
 * The attack provenance classifier only fires a weapon Item the vehicle actually owns whose
 * system.vehicleMount.installId names a sealed, executable ledger entry (vehicle-attack-provenance.js). This module
 * plans the Items that should exist for the current ledger: one per executable weapon entry, and removal of any
 * Shipyard-created weapon Item whose installation is gone (uninstall revokes the weapon even before this runs,
 * because the provenance check needs the ledger entry). Damage comes from the CERTIFIED weapon specification, not
 * from an editable catalog row. Pure; no Foundry globals.
 */
import { EFFECTS } from './vehicle-modification-effects.js';

export const INSTALLED_WEAPON_FLAG = 'vehicleInstalledWeapon';
const installIdOf = item => item?.flags?.swse?.[INSTALLED_WEAPON_FLAG]?.installId ?? null;

export function buildInstalledWeaponItemData(entry) {
  const fx = EFFECTS[entry.catalogId];
  if (fx?.kind !== 'weapon' || entry.executable !== true || !entry.mount) return null;
  const m = entry.mount;
  return {
    name: entry.name, type: 'weapon',
    system: {
      damage: fx.damage, meleeOrRanged: 'ranged', weaponCategory: 'ranged', mounted: true, arc: m.arc,
      vehicleMount: {
        installId: entry.installId, mountKey: m.mountKey, mountLabel: entry.name, arc: m.arc, crewRole: m.operatorRole,
        attackAbilityAuthority: 'vehicle-int', importSource: 'shipyard-certified-installation', parseConfidence: 'structured',
        mountBasis: m.basis ?? null
      }
    },
    flags: { swse: { [INSTALLED_WEAPON_FLAG]: { installId: entry.installId, catalogId: entry.catalogId, sourceEntryKey: entry.sourceEntryKey } } }
  };
}

/**
 * @param {{items: object[], entries: object[]}} p items = the vehicle's current Items; entries = verified ledger entries
 * @returns {{create: object[], deleteIds: string[]}}
 */
export function planInstalledWeaponItemSync({ items = [], entries = [] }) {
  const wanted = new Map(entries.map(e => [e.installId, buildInstalledWeaponItemData(e)]).filter(([, d]) => d));
  const owned = items.filter(i => installIdOf(i));
  const deleteIds = owned.filter(i => !wanted.has(installIdOf(i))).map(i => i.id ?? i._id);
  const have = new Set(owned.filter(i => wanted.has(installIdOf(i))).map(installIdOf));
  const create = [...wanted.entries()].filter(([id]) => !have.has(id)).map(([, d]) => d);
  return { create, deleteIds };
}
