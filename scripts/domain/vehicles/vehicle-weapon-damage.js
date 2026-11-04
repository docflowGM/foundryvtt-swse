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
 *
 * Two provenance paths feed ONE combat runtime and ONE damage rule:
 *   - INSTALLED: a certified aftermarket installation (sealed ledger entry + certified weapon specification);
 *   - STOCK: a published factory weapon group of a digest-verified source record (strictly parsed, see
 *     vehicle-stock-weapon-groups.js). Stock weapons never pass through the ledger and are never turned into
 *     installations.
 * resolveVehicleWeaponAuthority() returns the same shape for both; everything downstream (provenance, preflight,
 * attack math, damage) reads that shape, never the Item.
 */
import { parseVehicleWeaponDamageSpec } from '../../engine/combat/vehicle-weapon-damage-parser.js';
import { getVerifiedPublishedRecord } from './vehicle-source-identity.js';
import { readCertifiedInstallations } from './vehicle-installation-ledger.js';
import { EFFECTS } from './vehicle-modification-effects.js';
import { assessStockWeaponGroups, stockItemName, stockMountKey } from './vehicle-stock-weapon-groups.js';
import { expandBatteryDamage, BATTERY_REASONS } from './vehicle-weapon-battery.js';
import { aftermarketFamily } from './vehicle-ammunition-ledger.js';

export const INSTALLED_WEAPON_FLAG = 'vehicleInstalledWeapon';
export const STOCK_WEAPON_FLAG = 'vehicleStockWeapon';

const text = v => (typeof v === 'string' ? v.trim() : '');
const sameLabel = (a, b) => text(a) !== '' && text(a).toLowerCase() === text(b).toLowerCase();
const rawOf = doc => (typeof doc?.toObject === 'function' ? doc.toObject() : doc);

/** An Item that claims to be a Shipyard-installed vehicle weapon (it names a ledger installation). */
export function isInstalledVehicleWeaponItem(weapon) {
  return weapon?.actor?.type === 'vehicle' && text(weapon?.system?.vehicleMount?.installId) !== '';
}

const flagOf = (weapon, name) => weapon?.flags?.swse?.[name] ?? weapon?.getFlag?.('swse', name) ?? null;

/** A Shipyard-managed (aftermarket) weapon Item: created by the installation service. */
export function isShipyardManagedWeaponItem(weapon) {
  return text(flagOf(weapon, INSTALLED_WEAPON_FLAG)?.installId) !== '';
}

/** A published stock (factory) weapon Item: created from a verified source firing group. */
export function isStockVehicleWeaponItem(weapon) {
  return weapon?.actor?.type === 'vehicle' && text(flagOf(weapon, STOCK_WEAPON_FLAG)?.groupKey) !== '';
}

/** Any weapon Item whose mechanics belong to a vehicle authority (aftermarket or stock). */
export const isVehicleManagedWeaponItem = weapon => isInstalledVehicleWeaponItem(weapon) || isStockVehicleWeaponItem(weapon);
/** Flagged as managed (either kind) regardless of owner; used by the edit guard. */
export const hasManagedWeaponFlag = weapon => isShipyardManagedWeaponItem(weapon) || text(flagOf(weapon, STOCK_WEAPON_FLAG)?.groupKey) !== '';

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
  // An OPTION sealed into the entry (WE-PD) must still be a certified option of THIS base weapon; what it does is read from the
  // certified specification, not from the entry's own words.
  let pointDefense = false;
  if (entry.option) {
    const ofx = EFFECTS[entry.option.catalogId];
    if (ofx?.kind !== 'weapon-option' || !ofx.eligibleBases.includes(entry.catalogId) || spec.ammunition) return { ok: false, reason: 'INSTALLED_WEAPON_OPTION_NOT_CERTIFIED' };
    pointDefense = ofx.pointDefense === true;
  }
  return { ok: true, entry, spec, mount: m, option: entry.option ?? null, pointDefense, rangeSlug: pointDefense ? EFFECTS[entry.option.catalogId].rangeSlug : spec.rangeSlug ?? null };
}

/**
 * Resolve a STOCK (published factory) weapon Item against its digest-verified source record.
 * @returns {null | {ok:true, origin:'stock', operator:string, group:object, record:object, spec:{damage:string}, arcState:string} | {ok:false, reason:string}}
 */
export function resolveStockWeapon(weapon) {
  if (!isStockVehicleWeaponItem(weapon)) return null;
  const vehicle = weapon.actor;
  const record = getVerifiedPublishedRecord(vehicle);
  if (!record) return { ok: false, reason: 'STOCK_WEAPON_VEHICLE_UNVERIFIED' };
  const key = record.identity?.sourceEntryKey;
  const flag = flagOf(weapon, STOCK_WEAPON_FLAG);
  if (flag.sourceEntryKey !== key) return { ok: false, reason: 'STOCK_WEAPON_ITEM_SOURCE_MISMATCH' };
  const group = assessStockWeaponGroups(record).groups.find(g => g.groupKey === flag.groupKey);
  if (!group) return { ok: false, reason: 'STOCK_WEAPON_GROUP_NOT_IN_SOURCE' };
  if (!group.executable) return { ok: false, reason: `STOCK_WEAPON_GROUP_NOT_EXECUTABLE:${group.reasons[0]}` };
  // A printed battery runs in a declared MODE (Core p. 170): the Item flag names it and the SOURCE must still support it.
  const fireMode = text(flag.fireMode) || null;
  let modeInfo = null;
  if (group.modes) {
    if (fireMode !== 'full-battery' && fireMode !== 'independent-weapon') return { ok: false, reason: 'STOCK_WEAPON_ITEM_FIRE_MODE_MISMATCH' };
    modeInfo = group.modes[fireMode];
    if (!modeInfo?.executable) return { ok: false, reason: `STOCK_WEAPON_MODE_NOT_EXECUTABLE:${modeInfo?.reasons?.[0] ?? fireMode}` };
  } else if (fireMode) return { ok: false, reason: 'STOCK_WEAPON_ITEM_FIRE_MODE_MISMATCH' };
  const vm = weapon.system?.vehicleMount ?? {};
  if (text(vm.installId) !== '') return { ok: false, reason: 'STOCK_WEAPON_ITEM_CLAIMS_AN_INSTALLATION' };
  const mode = fireMode ?? 'single';
  if (!sameLabel(stockItemName(group, mode), weapon.name)) return { ok: false, reason: 'STOCK_WEAPON_ITEM_NAME_MISMATCH' };
  if (vm.stockGroupKey !== group.groupKey || vm.mountKey !== stockMountKey(group, mode) || vm.crewRole !== group.operator)
    return { ok: false, reason: 'STOCK_WEAPON_ITEM_MOUNT_MISMATCH' };
  if (text(weapon.system?.damage) !== group.damage.raw) return { ok: false, reason: 'STOCK_WEAPON_ITEM_DAMAGE_DIVERGES_FROM_SOURCE' };
  // arc evidence in the shape the attack preflight understands (V-P6C-01 hierarchy: see determineStockArc)
  const arcEvidence = group.arc.state === 'PUBLISHED' ? { state: 'PRINTED_VALUE', value: group.arc.value }
    : group.arc.state === 'UNSTATED' ? { state: 'SOURCE_SILENT_CONFIRMED' } : { state: 'NOT_REVIEWED' };
  // Only FULL-BATTERY mode carries battery rules (assistance already inside the printed total + margin hits); the independent
  // weapon is an ordinary single-weapon attack on the printed total with the assistance removed.
  const battery = fireMode === 'full-battery' ? group.battery : null;
  return { ok: true, origin: 'stock', operator: group.operator, group, record, fireMode: fireMode ?? undefined, attackBasis: modeInfo?.attackBasis ?? group.attackBasis,
    spec: { damage: group.damage.raw, ...(group.damage.type ? { type: group.damage.type } : {}) }, arcEvidence, battery, ammunition: group.ammunition ?? null };
}

/**
 * ONE authority shape for every Item-backed vehicle weapon, whichever provenance path produced it.
 * @returns {null | {ok:true, origin:'installed'|'stock', operator:string, damageRaw:string, damageType?:string, battery?:object, ammunition?:object, area?:object} | {ok:false, reason:string}}
 *   null = not a vehicle-managed weapon Item. `battery` is present only for a published weapon battery (stock, Core p. 170).
 */
export function resolveVehicleWeaponAuthority(weapon) {
  if (isStockVehicleWeaponItem(weapon)) {
    if (isInstalledVehicleWeaponItem(weapon)) return { ok: false, reason: 'WEAPON_CLAIMS_BOTH_STOCK_AND_INSTALLED_PROVENANCE' };
    const s = resolveStockWeapon(weapon);
    return s.ok ? { ok: true, origin: 'stock', operator: s.operator, rangeSlug: s.group.rangeSlug ?? null, ...(s.group.area ? { area: s.group.area } : {}), damageRaw: s.spec.damage, ...(s.spec.type ? { damageType: s.spec.type } : {}), ...(s.battery ? { battery: s.battery } : {}), ...(s.ammunition ? { ammunition: s.ammunition } : {}), stock: s } : s;
  }
  const i = resolveCertifiedInstalledWeapon(weapon);
  if (!i) return null;
  if (!i.ok) return i;
  // An aftermarket LAUNCHER (WE-L1) is a finite-ammunition guided weapon: it carries its ammunition family and the printed splash,
  // derived from the certified specification and the sealed entry (never from the Item).
  const family = aftermarketFamily(i.spec, i.entry);
  return { ok: true, origin: 'installed', operator: i.mount.operatorRole, rangeSlug: i.rangeSlug ?? null, damageRaw: i.spec.damage, installed: i,
    ...(family ? { ammunition: family } : {}), ...(i.spec.area ? { area: i.spec.area } : {}) };
}

/**
 * Executable damage of a vehicle-managed weapon: the CERTIFIED specification (installed) or the PUBLISHED source group
 * (stock), never the Item's own damage field.
 *
 * A published weapon battery (Core p. 170) hits with extra weapons when the attack beats the target's Reflex by 3 or more
 * per weapon; each extra hit adds one weapon die BEFORE the multiplier. `batteryExtraHits` is the attack-time outcome carried
 * on the attack card; it is validated here against the weapons actually participating (it can never exceed them) and is
 * refused for any weapon that is not an established battery.
 * @returns {null|{ok:true, formula:string, multiplier:number, damageType:string|null, printed:string, battery?:object}|{ok:false, reason:string}}
 */
export function resolveVehicleWeaponDamage(weapon, { batteryExtraHits = 0 } = {}) {
  const a = resolveVehicleWeaponAuthority(weapon);
  if (!a) return null;
  if (!a.ok) return a;
  // no weapon name passed: the parser's name-based type guess is never used for mechanics
  const p = parseVehicleWeaponDamageSpec(a.damageRaw);
  if (!p.formula || p.special || p.modifierOnly || p.byWeapon || p.noDamage)
    return { ok: false, reason: 'VEHICLE_WEAPON_DAMAGE_NOT_ORDINARY' };
  const multiplier = Number.isFinite(p.multiplier) && p.multiplier > 1 ? p.multiplier : 1;
  // The damage TYPE: a type the published group states (ion, Core pp. 159-160) or one the certified specification prints
  // explicitly; never a guess from the weapon's name.
  const damageType = a.damageType ?? (p.typeSource === 'explicit' ? p.type : null);
  const extraHits = batteryExtraHits === undefined || batteryExtraHits === null ? 0 : batteryExtraHits;
  if (!a.battery) {
    if (extraHits !== 0) return { ok: false, reason: BATTERY_REASONS.EXTRA_HITS_ON_A_NON_BATTERY };
    return { ok: true, formula: p.formula, multiplier, damageType, printed: p.raw };
  }
  const dice = /^(\d+)d(\d+)$/.exec(p.formula);
  if (!dice) return { ok: false, reason: 'VEHICLE_WEAPON_DAMAGE_NOT_ORDINARY' };
  const x = expandBatteryDamage({ dice: Number(dice[1]), die: Number(dice[2]), multiplier }, extraHits, a.battery.participatingWeapons);
  if (!x.ok) return { ok: false, reason: x.reason };
  return { ok: true, formula: x.formula, multiplier, damageType, printed: p.raw,
    battery: { gunners: a.battery.gunners, participatingWeapons: a.battery.participatingWeapons, extraHits, extraDice: x.extraDice, baseFormula: p.formula } };
}
