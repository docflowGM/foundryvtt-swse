/**
 * The SWSE Store's vehicle-ammunition context (opened by the vehicle sheet's two Buy Ammunition buttons). It is a VIEW of the existing store, not a second
 * store: the compatible-ammunition list, prices and payment sources come from the one purchase workflow (VehicleAmmunitionPurchaseService), the
 * wallet is the store's own actor, and completing a purchase calls that workflow (TransactionEngine for personal credits; a GM approval request for the
 * Party Fund). Purchased ammunition goes to the launcher's RESERVE; nothing is loaded. Only the vehicle's own launchers' ammunition is ever listed.
 */
import { VehicleAmmunitionPurchaseService as P } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-purchase-service.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";

const inFlight = new Set();
const warn = m => globalThis.ui?.notifications?.warn?.(m);
const info = m => globalThis.ui?.notifications?.info?.(m);

/** Called from the store constructor: a store opened with `vehicleAmmunition: { vehicleId, launcherKey? }` starts in this context. */
export function initVehicleAmmunitionContext(store, options = {}) {
  const ctx = options.vehicleAmmunition;
  if (!ctx?.vehicleId) { store.vehicleAmmo = null; return; }
  store.vehicleAmmo = { vehicleId: ctx.vehicleId, launcherKey: ctx.launcherKey ?? null, quantities: {}, payment: 'credits', busy: false };
  // the weapon-level shortcut selects the correct ammunition immediately (still no purchase without confirmation)
  if (ctx.launcherKey) store.vehicleAmmo.quantities[ctx.launcherKey] = 1;
  store.currentView = 'vehicle-ammunition';
}

/** The view model of the context: every compatible ammunition line, quantities, totals and the payment sources actually available. */
export async function buildVehicleAmmunitionView(store) {
  const st = store.vehicleAmmo;
  if (!st) return null;
  const vehicle = globalThis.game?.actors?.get?.(st.vehicleId) ?? null;
  if (!vehicle) return { unavailable: true, message: 'This vehicle is no longer available.' };
  const opts = await P.options({ vehicle, requesterActor: store.actor });
  if (st.payment === 'party-fund' && !opts.partyFund.available) st.payment = 'credits';     // a disabled / unavailable fund is never left selected
  const rows = opts.offers.map(o => {
    const quantity = Math.max(0, Math.floor(Number(st.quantities[o.launcherKey]) || 0));
    return { ...o, quantity, lineTotal: o.canBuy ? quantity * o.unitPrice : 0, selected: o.launcherKey === st.launcherKey,
      priceLabel: o.unitPrice === null ? 'Price not published' : `${o.unitPrice.toLocaleString()} credits each`, stockLabel: `${o.loaded} / ${o.capacity} loaded · ${o.reserve} in reserve` };
  });
  const total = rows.reduce((s, r) => s + r.lineTotal, 0);
  const credits = LedgerService.getCurrentCredits(store.actor);
  const credit = { id: 'credits', label: 'Personal Credits — Purchase Now', available: opts.personal.available, selected: st.payment === 'credits', note: opts.personal.available ? `You have ${credits.toLocaleString()} credits` : 'This character is not recorded as an owner of the vehicle.' };
  const fund = opts.partyFund.enabled ? { id: 'party-fund', label: 'Party Fund — Request GM Approval', available: opts.partyFund.available, selected: st.payment === 'party-fund',
    note: opts.partyFund.balance === null ? 'GM approval required' : `Party Fund: ${opts.partyFund.balance.toLocaleString()} credits · GM approval required` } : null;
  const chosen = st.payment === 'party-fund' ? fund : credit;
  return {
    vehicleId: vehicle.id, vehicleName: vehicle.name, payerName: store.actor?.name ?? '', rows, hasRows: rows.length > 0, total, credits,
    payments: fund ? [credit, fund] : [credit], showPaymentChoice: !!fund, payment: st.payment,
    canConfirm: total > 0 && !st.busy && chosen?.available === true && (st.payment !== 'credits' || credits >= total),
    confirmLabel: st.payment === 'party-fund' ? 'Submit Request to GM' : 'Purchase Now', insufficient: st.payment === 'credits' && total > credits,
    notice: st.payment === 'party-fund' ? 'No credits are deducted and no ammunition is delivered until the GM approves.' : 'Ammunition is delivered to the launcher\'s reserve; loading remains a separate step.'
  };
}

/** Pure + GM/owner action: buy (personal) or request (Party Fund) every line with a quantity. One workflow for both buttons. */
export async function confirmVehicleAmmunition(store) {
  const st = store.vehicleAmmo;
  if (!st || st.busy) return { success: false, reason: 'BUSY' };
  const key = `${store.actor?.id}:${st.vehicleId}`;
  if (inFlight.has(key)) { warn('A purchase is already in progress.'); return { success: false, reason: 'PURCHASE_IN_PROGRESS' }; }
  const vehicle = globalThis.game?.actors?.get?.(st.vehicleId);
  if (!vehicle) { warn('This vehicle is no longer available.'); return { success: false, reason: 'VEHICLE_UNAVAILABLE' }; }
  const lines = Object.entries(st.quantities).map(([launcherKey, q]) => ({ launcherKey, units: Math.floor(Number(q) || 0) })).filter(l => l.units > 0);
  if (!lines.length) return { success: false, reason: 'NOTHING_SELECTED' };
  inFlight.add(key); st.busy = true;
  const results = [];
  try {
    const quotes = lines.map(l => P.quote({ vehicle, ...l }));
    const bad = quotes.find(q => !q.success);
    if (bad) { warn(`Cannot buy: ${bad.reason}`); return { success: false, reason: bad.reason }; }
    const total = quotes.reduce((s, q) => s + q.total, 0);
    if (st.payment === 'credits' && LedgerService.getCurrentCredits(store.actor) < total) { warn('Not enough credits for this basket.'); return { success: false, reason: 'INSUFFICIENT_CREDITS' }; }
    for (const l of lines) {
      const r = st.payment === 'party-fund'
        ? await P.requestPartyFund({ vehicle, requesterActor: store.actor, ...l })
        : await P.buyWithCredits({ vehicle, ownerActor: store.actor, ...l });
      results.push({ ...l, ...r });
      if (r.success) delete st.quantities[l.launcherKey]; else { warn(`${l.launcherKey}: ${(r.reasons ?? [r.reason]).join(', ')}`); break; }       // each line is atomic; stop at the first refusal
    }
    const done = results.filter(r => r.success);
    if (done.length) {
      info(st.payment === 'party-fund' ? 'Purchase request submitted to GM. No credits have been deducted and no ammunition has been delivered.' : `Purchased ammunition for ${vehicle.name}: it is in the launcher reserve.`);
      try { vehicle.sheet?.render?.(); } catch (_e) { /* the sheet refreshes on its next render */ }
      try { store._onCheckoutComplete?.({ vehicleAmmunition: true, results }); } catch (_e) { /* ignore */ }
    }
    return { success: done.length === lines.length, results };
  } finally { st.busy = false; inFlight.delete(key); store.render?.(); }
}

/** Wire the context's controls (quantities, payment source, confirm, cancel). */
export function bindVehicleAmmunition(store, root, signal) {
  const st = store.vehicleAmmo;
  if (!st) return;
  root.querySelectorAll('[data-vehicle-ammo-qty]').forEach(input => input.addEventListener('change', () => {
    st.quantities[input.dataset.vehicleAmmoQty] = Math.max(0, Math.floor(Number(input.value) || 0));
    store.render?.();
  }, { signal }));
  root.querySelectorAll('[data-vehicle-ammo-payment]').forEach(input => input.addEventListener('change', () => { st.payment = input.dataset.vehicleAmmoPayment; store.render?.(); }, { signal }));
  root.querySelectorAll('[data-action="vehicle-ammo-confirm"]').forEach(btn => btn.addEventListener('click', ev => { ev.preventDefault(); void confirmVehicleAmmunition(store); }, { signal }));
  root.querySelectorAll('[data-action="vehicle-ammo-cancel"]').forEach(btn => btn.addEventListener('click', ev => { ev.preventDefault(); void store.close?.(); }, { signal }));
}
