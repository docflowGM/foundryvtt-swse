/**
 * The vehicle sheet's two ammunition shortcuts -- the Combat tab's Buy Ammunition button and a Buy Ammo button on every finite-ammunition weapon card --
 * both open the SAME existing SWSE Store in its vehicle-ammunition context. The global button lists everything this vehicle's launchers use; the weapon button
 * opens it with that launcher's ammunition already selected (the player still confirms the quantity, total and payment source). Weapons with unlimited ammunition
 * get no button; an unresolved price is a disabled state, never an invented one.
 */
import { ammunitionOffers } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-shop.js";
import { VehicleInstallationService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js";
import { resolveOwnerActor } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js";

/** Annotate the weapon-mount panel: `ammoOffer` on each finite-ammunition mount, and the panel-level flag that shows the global button. */
export function attachAmmunitionShortcuts(panel, actor) {
  if (!panel?.mounts) return panel;
  const offers = ammunitionOffers(actor);
  for (const mount of panel.mounts) {
    const o = offers.find(r => r.itemId && r.itemId === mount.weaponId);
    mount.ammoOffer = o ? { launcherKey: o.launcherKey, canBuy: o.canBuy, disabledReason: o.disabledReason, stockLabel: `${o.loaded} / ${o.capacity} loaded · ${o.reserve} reserve`,
      priceLabel: o.unitPrice === null ? 'Price not published' : `${o.ammunitionLabel} · ${o.unitPrice.toLocaleString()} credits each` } : null;
  }
  panel.hasAmmoOffers = offers.length > 0;
  return panel;
}

/** The purchasing character: the vehicle's recorded owner, else the user's own character -- never an arbitrary one (the purchase re-checks ownership). */
export function resolvePayerActor(vehicle, game = globalThis.game) {
  const direct = resolveOwnerActor(vehicle, game);
  if (direct) return direct;
  return null;
}

/** Open the store for this vehicle (optionally preselecting a launcher). @returns {Promise<object|null>} the store app, or null with a notice */
export async function openVehicleAmmunitionStore(vehicle, { launcherKey = null, game = globalThis.game, notify = globalThis.ui?.notifications, store = null, choosePayer = null } = {}) {
  let payer = resolvePayerActor(vehicle, game);
  if (!payer && game?.user?.isGM === true) {
    // a GM with no resolved owner picks among the vehicle's RECORDED owners explicitly; nobody is debited by default
    const owners = (game.actors?.contents ?? []).filter(a => a?.type !== 'vehicle' && VehicleInstallationService.isRecordedOwner(a, vehicle));
    payer = owners.length === 1 ? owners[0] : (owners.length > 1 && choosePayer ? await choosePayer(owners) : null);
  }
  if (!payer) { notify?.warn?.('No purchasing character is resolved for this vehicle: record an owner for it (or ask the GM).'); return null; }
  const Store = store ?? (await import("/systems/foundryvtt-swse/scripts/apps/store/store-main.js")).SWSEStore;
  return Store.open(payer, { entryOrigin: 'vehicle-sheet-ammunition', vehicleAmmunition: { vehicleId: vehicle.id, launcherKey }, closeAfterCheckout: false, onCheckoutComplete: () => { try { vehicle.sheet?.render?.(); } catch (_e) { /* ignore */ } } });
}
