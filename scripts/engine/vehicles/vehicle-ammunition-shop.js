/**
 * What ammunition a vehicle can BUY (the vehicle-sheet Buy Ammunition shortcuts and the store's vehicle-ammunition context both read this one list).
 * A row exists only for a weapon whose finite-ammunition resource the weapon authority establishes -- never for an unlimited weapon -- and carries
 * ONLY that launcher's own ammunition, so nothing unrelated is offered as compatible. The unit price is the certified launcher specification's
 * published price (aftermarket: the sealed installation's family; stock: the same specification of the launcher the source group identifies); a
 * price that is not published leaves the row disabled and is never invented. Pure read: it initializes nothing and writes nothing.
 */
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { EFFECTS } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-modification-effects.js";
import { LEDGER_FLAG, validateLedger, validateAftermarketLedger } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-ammunition-ledger.js";
import { readAftermarketLedgers } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";

export const SHOP_REASONS = Object.freeze({ PRICE_NOT_PUBLISHED: 'AMMO_UNIT_PRICE_NOT_PUBLISHED', LEDGER_UNAVAILABLE: 'AMMO_LEDGER_MISSING_OR_ALLOCATION_REQUIRED', LEDGER_INVALID: 'AMMO_LEDGER_INVALID' });

const titleCase = s => String(s ?? '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
/** The published per-unit price of a stock launcher's ammunition (the certified specification of the identified launcher). */
export const stockUnitPrice = family => { const p = EFFECTS[family?.launcherId]?.ammunition?.price; return Number.isInteger(p) && p > 0 ? p : null; };

/** The stable identity of a purchasable launcher: an aftermarket installation id, or a stock launcher's Item id. */
export const launcherKeyOf = row => (row.origin === 'aftermarket' ? `installed:${row.installId}` : `stock:${row.itemId}`);

/** @returns {object[]} one row per finite-ammunition weapon: identity, ammunition, price, loaded / reserve and why it cannot be bought (if it cannot) */
export function ammunitionOffers(vehicle) {
  const items = vehicle?.items?.contents ?? (vehicle?.items ? [...vehicle.items] : []);
  const rows = [];
  for (const item of items) {
    if (item?.type !== 'weapon') continue;
    const a = resolveVehicleWeaponAuthority(item);
    const family = a?.ok ? a.ammunition : null;
    if (!family) continue;                                              // unlimited ammunition (or no resolved resource): no shortcut
    const aftermarket = family.origin === 'aftermarket';
    const ledger = aftermarket ? (readAftermarketLedgers(vehicle)[family.installId] ?? null) : (item?.flags?.swse?.[LEDGER_FLAG] ?? item?.getFlag?.('swse', LEDGER_FLAG) ?? null);
    const unitPrice = aftermarket ? (Number.isInteger(family.unitPrice) && family.unitPrice > 0 ? family.unitPrice : null) : stockUnitPrice(family);
    let reason = null;
    if (unitPrice === null) reason = SHOP_REASONS.PRICE_NOT_PUBLISHED;
    else if (aftermarket) { if (ledger && !validateAftermarketLedger(ledger, family).ok) reason = SHOP_REASONS.LEDGER_INVALID; }       // nothing bought yet is a valid empty launcher
    else if (!ledger) reason = SHOP_REASONS.LEDGER_UNAVAILABLE;
    else if (!validateLedger(ledger, family).ok) reason = SHOP_REASONS.LEDGER_INVALID;
    rows.push({
      origin: aftermarket ? 'aftermarket' : 'stock', itemId: item.id, installId: aftermarket ? family.installId : null, launcherName: item.name,
      launcherId: family.launcherId, ammunitionId: family.ammunition, ammunitionLabel: titleCase(family.ammunition), unitPrice,
      loaded: ledger?.loaded ?? 0, reserve: ledger?.reserve ?? 0, capacity: family.capacity * (family.launchers ?? 1), canBuy: reason === null, disabledReason: reason
    });
    rows[rows.length - 1].launcherKey = launcherKeyOf(rows[rows.length - 1]);
  }
  return rows;
}

/** One launcher's row by its stable key (null when it is not a finite-ammunition weapon of this vehicle). */
export const offerFor = (vehicle, launcherKey) => ammunitionOffers(vehicle).find(r => r.launcherKey === launcherKey) ?? null;
