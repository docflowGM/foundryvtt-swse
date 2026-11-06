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
import { EFFECTS, effectiveWeaponDamage } from './vehicle-modification-effects.js';
import { INSTALLED_WEAPON_FLAG } from './vehicle-weapon-damage.js';

export { INSTALLED_WEAPON_FLAG };
const installIdOf = item => item?.flags?.swse?.[INSTALLED_WEAPON_FLAG]?.installId ?? null;

export function buildInstalledWeaponItemData(entry) {
  const fx = EFFECTS[entry.catalogId];
  if (fx?.kind !== 'weapon' || entry.executable !== true || !entry.mount) return null;
  const m = entry.mount;
  return {
    name: entry.name, type: 'weapon',
    system: {
      damage: effectiveWeaponDamage(fx, entry), meleeOrRanged: 'ranged', weaponCategory: 'ranged', mounted: true, arc: m.arc,
      vehicleMount: {
        installId: entry.installId, mountKey: m.mountKey, mountLabel: entry.name, arc: m.arc, crewRole: m.operatorRole,
        attackAbilityAuthority: 'vehicle-int', importSource: 'shipyard-certified-installation', parseConfidence: 'structured',
        mountBasis: m.basis ?? null
      }
    },
    flags: { swse: { [INSTALLED_WEAPON_FLAG]: { installId: entry.installId, catalogId: entry.catalogId, sourceEntryKey: entry.sourceEntryKey } } }
  };
}

/** Does a managed Item still equal the representation the sealed entry calls for? (damage, name, mount, identity) */
export function managedItemMatches(item, expected) {
  const vm = item?.system?.vehicleMount ?? {}, ev = expected.system.vehicleMount;
  const flag = item?.flags?.swse?.[INSTALLED_WEAPON_FLAG] ?? {}, ef = expected.flags.swse[INSTALLED_WEAPON_FLAG];
  return item?.name === expected.name && item?.system?.damage === expected.system.damage && item?.system?.arc === expected.system.arc
    && vm.installId === ev.installId && vm.mountKey === ev.mountKey && vm.arc === ev.arc && vm.crewRole === ev.crewRole
    && flag.installId === ef.installId && flag.catalogId === ef.catalogId && flag.sourceEntryKey === ef.sourceEntryKey;
}

/**
 * Plan the Items that should exist for the verified ledger. Idempotent: a consistent set yields an empty plan.
 *  - one Item per executable weapon entry;
 *  - a managed Item that no longer matches its entry (edited, renamed, wrong identity) is replaced, never trusted;
 *  - duplicate managed Items for one installation are removed (the first consistent one is kept);
 *  - managed Items without an entry are removed.
 * Items that are not Shipyard-managed (no installation flag) are never touched.
 * @param {{items: object[], entries: object[]}} p items = the vehicle's current Items; entries = verified ledger entries
 * @returns {{create: object[], deleteIds: string[]}}
 */
export function planInstalledWeaponItemSync({ items = [], entries = [] }) {
  const wanted = new Map(entries.map(e => [e.installId, buildInstalledWeaponItemData(e)]).filter(([, d]) => d));
  const deleteIds = [], kept = new Set();
  for (const item of items) {
    const id = installIdOf(item);
    if (!id) continue;
    const expected = wanted.get(id);
    if (!expected || kept.has(id) || !managedItemMatches(item, expected)) { deleteIds.push(item.id ?? item._id); continue; }
    kept.add(id);
  }
  const create = [...wanted.entries()].filter(([id]) => !kept.has(id)).map(([, d]) => d);
  return { create, deleteIds };
}
