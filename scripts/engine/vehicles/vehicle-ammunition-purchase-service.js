/**
 * Vehicle purchasing (ammunition, fuel, consumables) -- the ONE workflow behind the vehicle sheet's two Buy Ammunition buttons and the store's vehicle-ammunition
 * context. It adds no store, wallet, ledger or approval system:
 *
 *   Personal Credits  VehicleInstallationService.purchaseLauncherAmmunition (TransactionEngine: credits + ledger in one transaction).
 *   Party Fund        a REQUEST in the existing GM approval queue (world setting pendingCustomPurchases, approvalKind below). Nothing is deducted
 *                     and nothing is delivered until a GM approves and the settlement succeeds. The fund is the existing Holonet Party Fund
 *                     (PartyFundAccess: holonetPartyFundBalance / holonetPartyFundLedger, enabled by holonetPartyFundEnabled); delivery is the
 *                     one ammunition ledger writer (VehicleAmmunitionService.deliverPurchased), into the RESERVE -- the launcher is never loaded here.
 *
 * Settlement (GM client): revalidate -> claim (pending -> settling, persisted) -> debit the fund + ledger entry -> deliver -> approved. A failed
 * delivery restores the fund snapshot; if the restore cannot be PROVEN the request is preserved as `indeterminate` for GM reconciliation and is
 * never retried. A request settles at most once: every transition starts from the persisted state, and a concurrent settlement is refused.
 */
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { VehicleInstallationService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js";
import { VehicleAmmunitionService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";
import { VehicleLogisticsService, settlementAuthority } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-logistics-service.js";
import { ammunitionOffers, offerFor } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-shop.js";

export const AMMO_REQUEST_KIND = 'vehicle-ammunition-party-fund';
export const LOGISTICS_REQUEST_KIND = 'vehicle-logistics-party-fund';
export const REQUESTS_FLAG = 'ammunitionPurchaseRequests';
const OUR_KINDS = new Set([AMMO_REQUEST_KIND, LOGISTICS_REQUEST_KIND]);
export const REQUEST_STATES = Object.freeze({ PENDING: 'pending', SETTLING: 'settling', APPROVED: 'approved', REJECTED: 'rejected', FAILED: 'failed', INDETERMINATE: 'indeterminate' });
export const REQUEST_REASONS = Object.freeze({
  PARTY_FUND_DISABLED: 'PARTY_FUND_DISABLED', NOT_AUTHORIZED: 'AMMO_PURCHASE_NOT_AUTHORIZED', GM_ONLY: 'AMMO_REQUEST_GM_ONLY', NOT_FOUND: 'AMMO_REQUEST_NOT_FOUND',
  NOT_PENDING: 'AMMO_REQUEST_NOT_PENDING', IN_PROGRESS: 'AMMO_REQUEST_SETTLEMENT_IN_PROGRESS', INSUFFICIENT_FUND: 'PARTY_FUND_INSUFFICIENT', VEHICLE_GONE: 'AMMO_REQUEST_VEHICLE_UNAVAILABLE',
  OWNER_CHANGED: 'AMMO_REQUEST_REQUESTER_NO_LONGER_AUTHORIZED', LAUNCHER_CHANGED: 'AMMO_REQUEST_LAUNCHER_CHANGED', PRICE_CHANGED: 'AMMO_REQUEST_PRICE_CHANGED',
  QUANTITY_INVALID: 'AMMO_PURCHASE_QUANTITY_INVALID', ROLLBACK_UNPROVEN: 'AMMO_REQUEST_ROLLBACK_NOT_PROVEN', DELIVERY_FAILED: 'AMMO_REQUEST_DELIVERY_FAILED'
});

const refuse = (reason, extra = {}) => ({ success: false, reasons: [reason], reason, ...extra });
const money = n => Number(n).toLocaleString();

/** Collaborators (replaceable in tests): the Party Fund access, the approval queue store, and the requester notification. */
export const deps = {
  fund: async () => (await import("/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js")).PartyFundAccess,
  queue: { read: () => SettingsHelper.getArray('pendingCustomPurchases', []), write: list => SettingsHelper.set('pendingCustomPurchases', list) },
  notify: async (request, message, { gm = false } = {}) => {
    try { globalThis.ui?.notifications?.[gm ? 'warn' : 'info']?.(message); } catch (_e) { /* ignore */ }
    try { if (request?.ownerPlayerId && globalThis.ChatMessage?.create) await globalThis.ChatMessage.create({ content: message, whisper: [request.ownerPlayerId] }); } catch (_e) { /* a missed notification never changes a settlement */ }
  }
};

// the logistics service authorizes a paid delivery only against THIS queue's persisted settlement record
settlementAuthority.find = id => deps.queue.read().find(a => a?.id === id) ?? null;
let queueChain = Promise.resolve();                       // serializes this client's queue read-modify-write
const withQueue = fn => { const run = queueChain.then(fn); queueChain = run.then(() => {}, () => {}); return run; };
const inFlight = new Set();

const requestsOf = () => deps.queue.read().filter(a => OUR_KINDS.has(a?.approvalKind));
const findRequest = id => deps.queue.read().find(a => OUR_KINDS.has(a?.approvalKind) && a.id === id) ?? null;
async function patchRequest(id, patch) {
  return withQueue(async () => {
    const list = deps.queue.read();
    const i = list.findIndex(a => OUR_KINDS.has(a?.approvalKind) && a.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch };
    await deps.queue.write(list);
    return list[i];
  });
}
const removeRequest = id => withQueue(async () => { await deps.queue.write(deps.queue.read().filter(a => !(OUR_KINDS.has(a?.approvalKind) && a.id === id))); });
/** The persistent record of a request's state on the vehicle (survives the queue entry; best-effort mirror for display and audit). */
async function mirror(vehicle, request, state, extra = {}) {
  if (!vehicle) return;
  try {
    await ActorEngine.updateActor(vehicle, { [`flags.swse.${REQUESTS_FLAG}.${request.id}`]: { id: request.id, state, kind: request.approvalKind, launcherKey: request.launcherKey ?? null, resource: request.resource ?? 'ammunition', ammunition: request.ammunitionId ?? null, units: request.units ?? request.days ?? null,
      unitPrice: request.unitPrice, cost: request.costCredits, paymentSource: 'party-fund', requesterActorId: request.ownerActorId, requestedAt: request.requestedAt, decidedAt: Date.now(), ...extra } });
  } catch (_e) { /* the queue record is authoritative while it exists */ }
}

/** What differs between the purchase kinds: how a request is revalidated against the CURRENT vehicle and how the resource is delivered. The fund / claim / rollback core is shared. */
const ADAPTERS = {
  [AMMO_REQUEST_KIND]: {
    revalidate(vehicle, req) {
      const offer = offerFor(vehicle, req.launcherKey);
      if (!offer || offer.launcherId !== req.launcherId || offer.ammunitionId !== req.ammunitionId || !offer.canBuy) return { ok: false, reason: REQUEST_REASONS.LAUNCHER_CHANGED, message: 'the launcher or its ammunition changed' };
      if (offer.unitPrice !== req.unitPrice) return { ok: false, reason: REQUEST_REASONS.PRICE_CHANGED, message: `the published price changed (${money(req.unitPrice)} -> ${money(offer.unitPrice)} cr). Submit a new request` };
      const cost = req.units * offer.unitPrice;
      return cost === req.costCredits ? { ok: true, cost, offer } : { ok: false, reason: REQUEST_REASONS.PRICE_CHANGED, message: 'the total no longer matches' };
    },
    async deliver(vehicle, req, requestId, check) {
      const weapon = Array.from(vehicle.items ?? []).find(i => i?.id === check.offer.itemId);
      return weapon ? VehicleAmmunitionService.deliverPurchased(vehicle, weapon, { units: req.units, unitPrice: req.unitPrice, source: `party-fund:${requestId}` }) : { ok: false, reason: 'WEAPON_ITEM_MISSING' };
    },
    success: (req, cost) => `${req.units} x ${req.ammunitionLabel} (${money(cost)} cr) are in ${req.launcherName}'s reserve. They are not loaded yet.`
  },
  [LOGISTICS_REQUEST_KIND]: {
    revalidate(vehicle, req) {
      const q = req.resource === 'fuel' ? VehicleLogisticsService.quoteFuel(vehicle, req.days) : VehicleLogisticsService.quoteSupplies(vehicle, req.days);
      if (!q.success) return { ok: false, reason: q.reason, message: `the purchase no longer fits (${q.reason})` };
      if (q.unitPrice !== req.unitPrice || q.cost !== req.costCredits) return { ok: false, reason: REQUEST_REASONS.PRICE_CHANGED, message: 'the price or the living-occupant basis changed. Submit a new request' };
      return { ok: true, cost: q.cost };
    },
    deliver: (vehicle, req, requestId) => VehicleLogisticsService.deliverPurchased({ vehicle, resource: req.resource, days: req.days, unitPrice: req.unitPrice, requestId }),
    success: (req, cost) => `${req.days} ${req.resource === 'fuel' ? 'fuel-day(s)' : 'day(s) of consumables'} (${money(cost)} cr) were added to ${req.vehicleName}.`
  }
};

export class VehicleAmmunitionPurchaseService {
  // ---- generic basket lines: an ammunition launcher key, or a logistics resource key ('resource:fuel' | 'resource:supplies'); the store context uses only these ----
  static quoteLine({ vehicle, key, units }) {
    if (key === 'resource:fuel') { const q = VehicleLogisticsService.quoteFuel(vehicle, units); return q.success ? { success: true, units, unitPrice: q.unitPrice, total: q.cost, resulting: q.resulting } : q; }
    if (key === 'resource:supplies') { const q = VehicleLogisticsService.quoteSupplies(vehicle, units); return q.success ? { success: true, units, unitPrice: q.unitPrice, total: q.cost, resulting: q.resulting } : q; }
    return this.quote({ vehicle, launcherKey: key, units });
  }
  /** The basket total of the lines (the store context displays it; it adds nothing itself). */
  static basketTotal({ vehicle, lines }) {
    const quotes = lines.map(l => this.quoteLine({ vehicle, key: l.launcherKey ?? l.key, units: l.units }));
    return { quotes, ok: quotes.every(q => q.success), total: quotes.reduce((sum, q) => sum + (q.success ? q.total : 0), 0) };
  }
  static async buyLine({ vehicle, ownerActor, key, units }) {
    if (key === 'resource:fuel') return VehicleLogisticsService.purchaseFuel({ ownerActor, vehicle, days: units });
    if (key === 'resource:supplies') return VehicleLogisticsService.purchaseSupplies({ ownerActor, vehicle, days: units });
    return this.buyWithCredits({ vehicle, ownerActor, launcherKey: key, units });
  }
  static async requestLine({ vehicle, requesterActor, key, units, user }) {
    if (key === 'resource:fuel' || key === 'resource:supplies') return this.requestResourcePartyFund({ vehicle, requesterActor, resource: key.slice('resource:'.length), days: units, user });
    return this.requestPartyFund({ vehicle, requesterActor, launcherKey: key, units, user });
  }

  /** What can be bought, and which payment sources are offered to this user for this vehicle. */
  static async options({ vehicle, requesterActor = null, user = globalThis.game?.user ?? null } = {}) {
    const auth = requesterActor ? VehicleInstallationService.authorizePurchaser({ ownerActor: requesterActor, vehicle }) : { ok: false, reason: 'NO_PAYER' };
    const fund = await deps.fund();
    const enabled = fund.isEnabled() === true;
    return {
      offers: ammunitionOffers(vehicle),
      personal: { available: auth.ok, payerActorId: requesterActor?.id ?? null, reason: auth.ok ? null : auth.reason },
      // the Party Fund is shown ONLY when its world setting is on; its balance only to someone allowed to spend for this vehicle
      partyFund: { enabled, available: enabled && auth.ok, balance: enabled && (auth.ok || user?.isGM === true) ? fund.balance() : null, approvalRequired: true }
    };
  }

  /** The price quote for a basket line (published unit price x units). Never invents a price. */
  static quote({ vehicle, launcherKey, units }) {
    const offer = offerFor(vehicle, launcherKey);
    if (!offer) return refuse(REQUEST_REASONS.LAUNCHER_CHANGED);
    if (!offer.canBuy) return refuse(offer.disabledReason, { offer });
    if (!Number.isInteger(units) || units < 1) return refuse(REQUEST_REASONS.QUANTITY_INVALID, { offer });
    return { success: true, offer, units, unitPrice: offer.unitPrice, total: offer.unitPrice * units };
  }

  /** Personal Credits: the existing transaction path, immediately. */
  static async buyWithCredits({ vehicle, ownerActor, launcherKey, units }) {
    return VehicleInstallationService.purchaseLauncherAmmunition({ ownerActor, vehicle, launcherKey, units });
  }

  /** Party Fund: submit a request to the GM approval queue. No credits move and no ammunition is delivered. */
  static async requestPartyFund({ vehicle, requesterActor, launcherKey, units, user = globalThis.game?.user ?? null }) {
    const fund = await deps.fund();
    if (fund.isEnabled() !== true) return refuse(REQUEST_REASONS.PARTY_FUND_DISABLED);      // rejected at the service layer whatever the client showed
    const auth = VehicleInstallationService.authorizePurchaser({ ownerActor: requesterActor, vehicle });
    if (!auth.ok) return refuse(REQUEST_REASONS.NOT_AUTHORIZED);
    const q = this.quote({ vehicle, launcherKey, units });
    if (!q.success) return q;
    const id = `pending_vehicle_ammo_${globalThis.foundry?.utils?.randomID?.() ?? Date.now().toString(36)}`;
    const o = q.offer;
    const request = {
      id, type: 'vehicle-ammunition', approvalKind: AMMO_REQUEST_KIND, state: REQUEST_STATES.PENDING, paymentSource: 'party-fund',
      ownerPlayerId: user?.id ?? null, ownerActorId: requesterActor.id, ownerActorName: requesterActor.name ?? null,
      vehicleId: vehicle.id, vehicleName: vehicle.name ?? null, launcherKey: o.launcherKey, launcherId: o.launcherId, launcherName: o.launcherName,
      ammunitionId: o.ammunitionId, ammunitionLabel: o.ammunitionLabel, units: q.units, unitPrice: q.unitPrice, costCredits: q.total, requestedAt: Date.now(),
      draftData: { name: `${q.units} x ${o.ammunitionLabel} for ${o.launcherName}`, type: 'vehicle-ammunition', cost: q.total,
        details: `${q.units} x ${o.ammunitionLabel} at ${money(q.unitPrice)} cr = ${money(q.total)} cr (Party Fund) for ${vehicle.name ?? 'vehicle'} / ${o.launcherName}`, description: 'Party Fund ammunition purchase: GM approval required' }
    };
    await withQueue(async () => { const list = deps.queue.read(); list.push(request); await deps.queue.write(list); });
    await mirror(vehicle, request, REQUEST_STATES.PENDING);
    globalThis.Hooks?.callAll?.('swseStoreApprovalRequested', { approval: request, actor: requesterActor });
    return { success: true, requestId: id, request, message: 'Purchase request submitted to GM. No credits have been deducted and no ammunition has been delivered.' };
  }

  /** Party Fund request for FUEL or CONSUMABLES (same queue, same GM approval, same settlement core). */
  static async requestResourcePartyFund({ vehicle, requesterActor, resource, days, user = globalThis.game?.user ?? null }) {
    const fund = await deps.fund();
    if (fund.isEnabled() !== true) return refuse(REQUEST_REASONS.PARTY_FUND_DISABLED);
    const auth = VehicleInstallationService.authorizePurchaser({ ownerActor: requesterActor, vehicle });
    if (!auth.ok) return refuse(REQUEST_REASONS.NOT_AUTHORIZED);
    if (!['fuel', 'supplies'].includes(resource)) return refuse(REQUEST_REASONS.LAUNCHER_CHANGED);
    const q = resource === 'fuel' ? VehicleLogisticsService.quoteFuel(vehicle, days) : VehicleLogisticsService.quoteSupplies(vehicle, days);
    if (!q.success) return q;
    const id = `pending_vehicle_logistics_${globalThis.foundry?.utils?.randomID?.() ?? Date.now().toString(36)}`;
    const label = resource === 'fuel' ? 'fuel-day(s)' : 'day(s) of consumables';
    const request = {
      id, type: 'vehicle-logistics', approvalKind: LOGISTICS_REQUEST_KIND, state: REQUEST_STATES.PENDING, paymentSource: 'party-fund', resource,
      ownerPlayerId: user?.id ?? null, ownerActorId: requesterActor.id, ownerActorName: requesterActor.name ?? null, vehicleId: vehicle.id, vehicleName: vehicle.name ?? null,
      days: q.days, unitPrice: q.unitPrice, costCredits: q.cost, occupants: q.occupants ?? null, requestedAt: Date.now(),
      draftData: { name: `${q.days} ${label} for ${vehicle.name ?? 'vehicle'}`, type: 'vehicle-logistics', cost: q.cost,
        details: `${q.days} ${label} at ${money(q.unitPrice)} cr = ${money(q.cost)} cr (Party Fund)`, description: 'Party Fund logistics purchase: GM approval required' }
    };
    await withQueue(async () => { const list = deps.queue.read(); list.push(request); await deps.queue.write(list); });
    await mirror(vehicle, request, REQUEST_STATES.PENDING);
    globalThis.Hooks?.callAll?.('swseStoreApprovalRequested', { approval: request, actor: requesterActor });
    return { success: true, requestId: id, request, message: 'Purchase request submitted to GM. No credits have been deducted and nothing has been delivered.' };
  }

  /** GM: reject. No credits move, nothing is delivered; the requester is told. */
  static async reject({ requestId, reason = '', user = globalThis.game?.user ?? null }) {
    if (user?.isGM !== true) return refuse(REQUEST_REASONS.GM_ONLY);
    if (inFlight.has(requestId)) return refuse(REQUEST_REASONS.IN_PROGRESS);
    const req = findRequest(requestId);
    if (!req) return refuse(REQUEST_REASONS.NOT_FOUND);
    if (req.state !== REQUEST_STATES.PENDING) return refuse(REQUEST_REASONS.NOT_PENDING, { state: req.state });
    inFlight.add(requestId);
    try {
      await mirror(globalThis.game?.actors?.get?.(req.vehicleId) ?? null, req, REQUEST_STATES.REJECTED, { reason, decidedBy: user?.id ?? null });
      await removeRequest(requestId);
      await deps.notify(req, `GM rejected your Party Fund ammunition request (${req.draftData?.name}).${reason ? ` ${reason}` : ''} No credits were deducted and no ammunition was delivered.`);
      return { success: true, state: REQUEST_STATES.REJECTED };
    } finally { inFlight.delete(requestId); }
  }

  /**
   * GM: approve and settle. One governed settlement; see the file comment. Returns the final state; never throws for an expected refusal.
   */
  static async approve({ requestId, user = globalThis.game?.user ?? null }) {
    if (user?.isGM !== true) return refuse(REQUEST_REASONS.GM_ONLY);                          // an owner can request, never approve
    if (inFlight.has(requestId)) return refuse(REQUEST_REASONS.IN_PROGRESS);                 // concurrent approval on this client
    inFlight.add(requestId);
    try { return await this.#settle(requestId, user); } finally { inFlight.delete(requestId); }
  }

  static async #fail(req, vehicle, state, reason, message) {
    await mirror(vehicle, req, state, { reason });
    await removeRequest(req.id);
    await deps.notify(req, message);
    return { success: false, state, reason, reasons: [reason] };
  }

  static async #settle(requestId, user) {
    let req = findRequest(requestId);
    if (!req) return refuse(REQUEST_REASONS.NOT_FOUND);
    if (req.state === REQUEST_STATES.SETTLING) return refuse(REQUEST_REASONS.IN_PROGRESS, { state: req.state });          // another approval (or a crash) holds it: never retry blindly
    if (req.state !== REQUEST_STATES.PENDING) return refuse(REQUEST_REASONS.NOT_PENDING, { state: req.state });
    const fund = await deps.fund();
    if (fund.isEnabled() !== true) return refuse(REQUEST_REASONS.PARTY_FUND_DISABLED);       // stays pending: the GM can re-enable the fund or reject
    const vehicle = globalThis.game?.actors?.get?.(req.vehicleId) ?? null;
    const requester = globalThis.game?.actors?.get?.(req.ownerActorId) ?? null;
    if (!vehicle) return this.#fail(req, null, REQUEST_STATES.FAILED, REQUEST_REASONS.VEHICLE_GONE, `Your Party Fund ammunition request failed: the vehicle is no longer available. Nothing was deducted or delivered.`);
    // the requester must STILL be a recorded owner (the approving GM's own authority does not stand in for it)
    if (!requester || !VehicleInstallationService.isRecordedOwner(requester, vehicle)) return this.#fail(req, vehicle, REQUEST_STATES.FAILED, REQUEST_REASONS.OWNER_CHANGED, `Your Party Fund ammunition request failed: you are no longer recorded as an owner of ${vehicle.name}. Nothing was deducted or delivered.`);
    const adapter = ADAPTERS[req.approvalKind];
    const check = adapter.revalidate(vehicle, req);
    if (!check.ok) return this.#fail(req, vehicle, REQUEST_STATES.FAILED, check.reason, `Your Party Fund request failed: ${check.message}. Nothing was deducted or delivered.`);
    const cost = check.cost;
    if (fund.balance() < cost) { await deps.notify(req, `The Party Fund has ${money(fund.balance())} credits; ${money(cost)} are needed. The request stays pending.`, { gm: true }); return refuse(REQUEST_REASONS.INSUFFICIENT_FUND, { balance: fund.balance(), cost }); }

    // claim: pending -> settling, persisted BEFORE any money moves (a second approval, on any client, now sees it)
    req = await patchRequest(requestId, { state: REQUEST_STATES.SETTLING, settlingBy: user?.id ?? null, settlingAt: Date.now() });
    if (!req) return refuse(REQUEST_REASONS.NOT_FOUND);
    const snapshot = { balance: fund.balance(), ledger: fund.ledger() };
    let debited = false;
    try {
      await fund.setBalance(snapshot.balance - cost);
      await fund.appendLedger({ type: 'vehicle-ammunition', amount: -cost, requestId, vehicleId: vehicle.id, launcherKey: req.launcherKey, ammunition: req.ammunitionId, units: req.units, unitPrice: req.unitPrice, requesterActorId: req.ownerActorId, approvedBy: user?.id ?? null });
      debited = true;
      const d = await adapter.deliver(vehicle, req, requestId, check);
      if (!d.ok && !d.success) throw new Error(d.reason ?? REQUEST_REASONS.DELIVERY_FAILED);
    } catch (err) {
      let proven = false;
      try {
        await fund.setBalance(snapshot.balance); await fund.setLedger(snapshot.ledger);
        proven = fund.balance() === snapshot.balance;                                         // the restore is verified, not assumed
      } catch (_restore) { proven = false; }
      if (proven) return this.#fail(req, vehicle, REQUEST_STATES.FAILED, REQUEST_REASONS.DELIVERY_FAILED, `Your Party Fund ammunition request failed (${err?.message ?? 'delivery failed'}); the Party Fund was restored. Nothing was deducted or delivered.`);
      await patchRequest(requestId, { state: REQUEST_STATES.INDETERMINATE, indeterminateReason: err?.message ?? 'unknown', debited });
      await mirror(vehicle, req, REQUEST_STATES.INDETERMINATE, { reason: REQUEST_REASONS.ROLLBACK_UNPROVEN });
      await deps.notify(req, `Party Fund ammunition request ${requestId} is INDETERMINATE: the rollback could not be proven. It is preserved for GM reconciliation and will not be retried.`, { gm: true });
      return { success: false, state: REQUEST_STATES.INDETERMINATE, reason: REQUEST_REASONS.ROLLBACK_UNPROVEN, reasons: [REQUEST_REASONS.ROLLBACK_UNPROVEN] };
    }
    await patchRequest(requestId, { state: REQUEST_STATES.APPROVED, approvedBy: user?.id ?? null, approvedAt: Date.now() });
    await mirror(vehicle, req, REQUEST_STATES.APPROVED, { approvedBy: user?.id ?? null });
    await removeRequest(requestId);
    await deps.notify(req, `GM approved your Party Fund request: ${adapter.success(req, cost)}`);
    return { success: true, state: REQUEST_STATES.APPROVED, units: req.units, cost, balance: fund.balance() };
  }

  /** Pending requests (all, or for one vehicle) -- survives reloads because the queue is a world setting. */
  static pendingRequests({ vehicleId = null } = {}) { return requestsOf().filter(r => !vehicleId || r.vehicleId === vehicleId); }
}
