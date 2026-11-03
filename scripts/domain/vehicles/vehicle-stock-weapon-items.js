/**
 * Owned weapon Items for the published (factory) weapon groups of a source-backed vehicle.
 *
 * A stock weapon Item is only a REPRESENTATION of one executable printed group (vehicle-stock-weapon-groups.js); its
 * damage, operator and identity are re-derived from the digest-verified source record at every use
 * (vehicle-weapon-damage.js), so editing the Item grants nothing. Stock Items are NOT installations: they never touch
 * the Shipyard ledger, EP or credits. This module plans which Items should exist; the service writes them through
 * ActorEngine. Pure; no Foundry globals.
 */
import { STOCK_WEAPON_FLAG } from './vehicle-weapon-damage.js';
import { assessStockWeaponGroups, stockItemName, stockMountKey } from './vehicle-stock-weapon-groups.js';

const groupKeyOf = item => item?.flags?.swse?.[STOCK_WEAPON_FLAG]?.groupKey ?? null;
const modeOf = item => item?.flags?.swse?.[STOCK_WEAPON_FLAG]?.fireMode ?? 'single';
/** Item key: a group is one Item per executable MODE ('single' for an ordinary weapon; 'full-battery' / 'independent-weapon' for a printed battery). */
const itemKey = (groupKey, mode) => `${groupKey}|${mode}`;

export function buildStockWeaponItemData(record, group, mode = 'single') {
  const key = record.identity.sourceEntryKey;
  return {
    name: stockItemName(group, mode), type: 'weapon',
    system: {
      damage: group.damage.raw, meleeOrRanged: 'ranged', weaponCategory: 'ranged', mounted: true, arc: group.arc?.value ?? 'unknown',
      vehicleMount: {
        stockGroupKey: group.groupKey, mountKey: stockMountKey(group, mode), mountLabel: stockItemName(group, mode), arc: group.arc?.value ?? 'unknown', crewRole: group.operator,
        attackAbilityAuthority: 'vehicle-int', importSource: 'published-stock-group', parseConfidence: 'structured'
      }
    },
    flags: { swse: { [STOCK_WEAPON_FLAG]: { sourceEntryKey: key, groupKey: group.groupKey, ...(mode !== 'single' ? { fireMode: mode } : {}) } } }
  };
}

/** Does a managed stock Item still equal the representation the source group calls for? */
export function managedStockItemMatches(item, expected) {
  const vm = item?.system?.vehicleMount ?? {}, ev = expected.system.vehicleMount;
  const flag = item?.flags?.swse?.[STOCK_WEAPON_FLAG] ?? {}, ef = expected.flags.swse[STOCK_WEAPON_FLAG];
  return item?.name === expected.name && item?.system?.damage === expected.system.damage && item?.system?.arc === expected.system.arc
    && vm.stockGroupKey === ev.stockGroupKey && vm.mountKey === ev.mountKey && vm.arc === ev.arc && vm.crewRole === ev.crewRole && !vm.installId
    && flag.groupKey === ef.groupKey && flag.sourceEntryKey === ef.sourceEntryKey && (flag.fireMode ?? null) === (ef.fireMode ?? null);
}

/** The executable MODES of an assessed group: ['single'] for an ordinary weapon, the executable battery modes for a printed battery. */
export function executableModesOf(group) {
  if (!group.executable) return [];
  if (!group.modes) return ['single'];
  return Object.entries(group.modes).filter(([, m]) => m.executable).map(([k]) => k);
}

/**
 * Idempotent plan: one Item per EXECUTABLE group MODE; edited / renamed / duplicate / stale managed stock Items are replaced
 * or removed; Items that are not stock-managed (no stock flag) are never touched.
 * @returns {{create: object[], deleteIds: string[]}}
 */
export function planStockWeaponItemSync({ items = [], record }) {
  const wanted = new Map();
  for (const g of assessStockWeaponGroups(record).groups) for (const mode of executableModesOf(g)) wanted.set(itemKey(g.groupKey, mode), buildStockWeaponItemData(record, g, mode));
  const deleteIds = [], kept = new Set();
  for (const item of items) {
    const groupKey = groupKeyOf(item);
    if (!groupKey) continue;
    const key = itemKey(groupKey, modeOf(item));
    const expected = wanted.get(key);
    if (!expected || kept.has(key) || !managedStockItemMatches(item, expected)) { deleteIds.push(item.id ?? item._id); continue; }
    kept.add(key);
  }
  return { create: [...wanted.entries()].filter(([k]) => !kept.has(k)).map(([, d]) => d), deleteIds };
}
