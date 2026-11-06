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
import { LEDGER_FLAG, initialLedger, initialStockLedger, purchasedInitialLedger, validateLedger } from './vehicle-ammunition-ledger.js';

const groupKeyOf = item => item?.flags?.swse?.[STOCK_WEAPON_FLAG]?.groupKey ?? null;
const modeOf = item => item?.flags?.swse?.[STOCK_WEAPON_FLAG]?.fireMode ?? 'single';
/** Item key: a group is one Item per executable MODE ('single' for an ordinary weapon; 'full-battery' / 'independent-weapon' for a printed battery). */
const itemKey = (groupKey, mode) => `${groupKey}|${mode}`;

/** The vehicle flag that remembers which managed stock launchers have already been issued their initial ammunition (never re-issued). */
export const INITIAL_AMMO_ISSUED_FLAG = 'initialAmmunitionIssued';
/** Flag-safe form of an item key (a flag object key must not contain a dot). */
export const issuedKeyOf = k => String(k).replace(/\./g, '%2E');

export function buildStockWeaponItemData(record, group, mode = 'single', { included = true } = {}) {
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
    flags: { swse: { [STOCK_WEAPON_FLAG]: { sourceEntryKey: key, groupKey: group.groupKey, ...(mode !== 'single' ? { fireMode: mode } : {}) },
      // a complete launcher family starts with its ledger (loaded = min(payload, capacity), the rest in reserve): ammunition is finite from the first shot
      // (owner house rule initialVehicleAmmunitionIncluded: included = the published payload at no charge; otherwise empty, bought separately.
      // A GM-configured payload is the GM's deliberate allocation and does not depend on the rule.)
      ...(group.ammunition ? { [LEDGER_FLAG]: group.ammunition.gmConfigured ? initialLedger(group.ammunition, { launchers: group.ammunition.launchers, loaded: group.ammunition.initialLoaded, allocation: 'gm-configured' }) : initialStockLedger(group.ammunition, included) } : {}) } }
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
export function planStockWeaponItemSync({ items = [], record, gmAmmo = null, gmBattery = null, included = true, issued = null }) {
  const wanted = new Map();
  for (const g of assessStockWeaponGroups(record, { gmAmmo, gmBattery }).groups) for (const mode of executableModesOf(g)) wanted.set(itemKey(g.groupKey, mode), buildStockWeaponItemData(record, g, mode, { included }));
  const deleteIds = [], kept = new Set(), carried = new Map();
  const groups = new Map(assessStockWeaponGroups(record, { gmAmmo, gmBattery }).groups.map(g => [g.groupKey, g]));
  for (const item of items) {
    const groupKey = groupKeyOf(item);
    if (!groupKey) continue;
    const key = itemKey(groupKey, modeOf(item));
    const expected = wanted.get(key);
    if (!expected || kept.has(key) || !managedStockItemMatches(item, expected)) {
      deleteIds.push(item.id ?? item._id);
      // replacing an Item must not refill its launcher: a valid existing ledger is carried over to the replacement
      const family = groups.get(groupKey)?.ammunition, old = item?.flags?.swse?.[LEDGER_FLAG];
      if (family && old && validateLedger(old, family).ok && !carried.has(key)) carried.set(key, old);
      continue;
    }
    kept.add(key);
  }
  const create = [...wanted.entries()].filter(([k]) => !kept.has(k)).map(([k, d]) => {
    if (carried.has(k)) d.flags.swse[LEDGER_FLAG] = carried.get(k);
    // a launcher whose initial ammunition was already issued is never issued again (a deleted Item is not a refill): it comes back empty
    else if (issued?.has?.(issuedKeyOf(k)) && d.flags.swse[LEDGER_FLAG]) d.flags.swse[LEDGER_FLAG] = purchasedInitialLedger(groups.get(d.flags.swse[STOCK_WEAPON_FLAG].groupKey)?.ammunition);
    return d;
  });
  // every managed launcher present after this sync has now been issued its initial ammunition (recorded once, by the caller)
  return { create, deleteIds, issueKeys: [...wanted.keys()].filter(k => groups.get(k.split('|')[0])?.ammunition).map(issuedKeyOf) };
}
