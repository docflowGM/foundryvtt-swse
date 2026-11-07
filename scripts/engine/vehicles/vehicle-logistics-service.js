/**
 * Ship logistics at runtime (SotG pp. 10 and 14): the ONE writer of a vehicle's fuel and consumables state, and the ONE place the sheet's logistics numbers are
 * derived. State lives in the guarded vehicle flag `shipLogistics` (written only here, through ActorEngine); fuel and consumables are separate resources; the
 * printed Consumables value is source data (the maximum) and the remaining supply is play state. Nothing here runs on a sheet render: consumption is an explicit
 * authorized event (idempotent per event id) or a GM operation, and initialization happens once.
 *
 *   view(vehicle)                      -> everything the Ship Logistics section shows, already derived (prices, capacities, percents, labels, reasons).
 *   quoteFuel / quoteSupplies          -> the priced plan of a purchase (no side effects).
 *   purchaseFuel / purchaseSupplies    -> personal credits: ONE TransactionEngine transaction (credits + resource), never past a capacity.
 *   deliverPurchased                   -> the resource side of a GM-approved Party Fund settlement (VehicleAmmunitionPurchaseService owns the request / fund side).
 *   consumeFuel                        -> GM: one authoritative fuel event.            initialize -> once, full consumables, no invented fuel.
 *   gmConfigureFuel / gmSetOccupants / gmSetConsumables -> GM configuration (never labeled published).
 * Docking and routine maintenance are GM-administered reference information only: no charging, no state.
 */
import { payerAuditRecord } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-asset-owner.js';
import { verifyStoredPaths } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-postcondition.js';
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { authorizeFlagWrite, clearLedgerWrite } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { getEffectiveVehicleSource, getEffectiveVehicleDerived } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-published-derived.js";
import { consumablesToDays } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-modification-rules.js";
import * as L from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-logistics.js";
import { VehicleInstallationService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js";

const { LOGISTICS_FLAG, LOGISTICS_REASONS: R } = L;
const refuse = (reason, extra = {}) => ({ success: false, ok: false, reason, reasons: [reason], ...extra });
const isGM = u => u?.isGM === true;
const busy = new Set();
/** The persisted record that authorizes a paid delivery (the GM approval queue entry). Replaceable in tests; the purchase service points it at its own queue. */
export const settlementAuthority = { find: id => (globalThis.game?.settings?.get?.('foundryvtt-swse', 'pendingCustomPurchases') ?? []).find?.(a => a?.id === id) ?? null };
const FRESH_VEHICLE_MS = 120000;
const exclusive = async (vehicle, work) => {
  const id = vehicle?.id;
  if (!id) return refuse('VEHICLE_ID_MISSING');
  if (busy.has(id)) return refuse('LOGISTICS_IN_PROGRESS');
  busy.add(id);
  try { return await work(); } finally { busy.delete(id); }
};

export const readLogistics = vehicle => vehicle?.flags?.swse?.[LOGISTICS_FLAG] ?? vehicle?.getFlag?.('swse', LOGISTICS_FLAG) ?? null;
const stateOf = vehicle => { const s = readLogistics(vehicle); return s && L.validateLogistics(s).ok ? s : null; };
async function write(vehicle, next) {
  authorizeFlagWrite(vehicle.id, LOGISTICS_FLAG, next);
  try { await ActorEngine.updateActor(vehicle, { [`flags.swse.==${LOGISTICS_FLAG}`]: next }); } finally { clearLedgerWrite(vehicle.id); }
}

/** The assigned crew ACTORS of a vehicle (synchronous lookup of the recorded crew assignments). */
function crewActorsOf(vehicle) {
  const out = [];
  for (const entry of Object.values(vehicle?.system?.crewPositions ?? {})) {
    if (!entry) continue;
    const id = typeof entry === 'string' ? entry.replace(/^Actor\./, '') : (entry.actorId ?? entry.id ?? String(entry.uuid ?? '').replace(/^Actor\./, ''));
    const a = id ? globalThis.game?.actors?.get?.(id) : null;
    if (a) out.push(a);
  }
  return out;
}

/** Source maximum (days) + provenance: the printed Consumables converted with the project policy, plus certified modifications (existing computation). */
function consumablesMax(vehicle) {
  const src = getEffectiveVehicleSource(vehicle);
  const printed = src?.record?.capacity?.consumables ?? null;
  const conv = consumablesToDays(printed);
  if (!conv.ok) return { ok: false, reason: R.CONSUMABLES_UNRESOLVED, printed: printed?.raw ?? null };
  let effective = null;
  try { effective = getEffectiveVehicleDerived(vehicle)?.consumables?.effectiveDays ?? null; } catch (_e) { effective = null; }
  const max = L.consumablesMaxDays({ printedDays: conv.days, effectiveDays: effective });
  return { ...max, printedDays: conv.days, printed: conv.printed, basis: conv.basis, effectiveDays: max.days };
}

const occupantsOf = (vehicle, state) => L.livingOccupants({ crewActors: crewActorsOf(vehicle), passengers: state?.passengers ?? null, override: state?.occupantsOverride ?? null });

export class VehicleLogisticsService {
  /** The sheet's projection: all values derived here. */
  static view(vehicle) {
    const state = stateOf(vehicle);
    const size = vehicle?.system?.size ?? null;
    const price = L.fuelPricePerDay(size);
    const cap = state?.fuel?.capacity ?? null;
    const fuelPlanProbe = state && price !== null && cap ? L.planFuelPurchase(state, { size, days: 1 }) : null;
    const max = consumablesMax(vehicle);
    const occ = occupantsOf(vehicle, state);
    const sPlanProbe = state && max.ok ? L.planSuppliesPurchase(state, { maxDays: max.days, occupants: occ.count, days: 1 }) : null;
    const maint = L.maintenanceReferenceCost(size);
    const pricePerDay = occ.count > 0 ? L.consumablesCost(occ.count, 1) : null;
    const pct = (a, b) => (Number.isInteger(a) && Number.isInteger(b) && b > 0 ? Math.round((a / b) * 100) : null);
    const fuelDisabled = price === null ? R.PRICE_UNRESOLVED : !cap ? R.FUEL_CAPACITY_UNCONFIGURED : (fuelPlanProbe && !fuelPlanProbe.ok ? fuelPlanProbe.reason : null);
    const suppliesDisabled = !max.ok ? R.CONSUMABLES_UNRESOLVED : !state?.consumables?.initialized ? R.CONSUMABLES_UNINITIALIZED : (sPlanProbe && !sPlanProbe.ok ? sPlanProbe.reason : null);
    return {
      initialized: !!state,
      fuel: { current: state?.fuel?.current ?? 0, capacity: cap?.value ?? null, capacityBasis: cap ? 'GM_CONFIGURED' : null, state: cap ? 'CONFIGURED' : 'UNRESOLVED',
        unit: 'fuel-day', pricePerDay: price, priceLabel: price === null ? 'Price not resolved' : `${price.toLocaleString()} cr per fuel-day`, percent: pct(state?.fuel?.current, cap?.value),
        label: cap ? `${state.fuel.current} / ${cap.value} fuel-days` : 'Fuel capacity not configured (GM)', canBuy: fuelDisabled === null, disabledReason: fuelDisabled,
        consumption: Object.values(L.FUEL_EVENTS).map(e => e.label), source: 'Starships of the Galaxy, printed p. 14' },
      consumables: { printed: max.printed ?? null, maxDays: max.ok ? max.days : null, maxBasis: max.basis ?? null, remainingDays: state?.consumables?.remainingDays ?? null, initialized: state?.consumables?.initialized === true,
        percent: max.ok ? pct(state?.consumables?.remainingDays, max.days) : null, pricePerDay, occupants: occ.count, occupantsBasis: occ.basis, perPersonDay: L.CONSUMABLES_CREDITS_PER_PERSON_DAY,
        rateLabel: `${L.CONSUMABLES_CREDITS_PER_PERSON_DAY} cr per living occupant per day (droids excluded)`,
        label: max.ok ? `${state?.consumables?.remainingDays ?? '?'} / ${max.days} days` : 'Consumables not established', canBuy: suppliesDisabled === null, disabledReason: suppliesDisabled, source: 'Starships of the Galaxy, printed p. 14' },
      docking: { ...L.DOCKING_REFERENCE, label: `Docking about ${L.DOCKING_REFERENCE.dockingPerDay} cr/day; long-term storage ${L.DOCKING_REFERENCE.storagePerMonth} cr/month` },
      maintenance: { ...L.MAINTENANCE_RULE, referenceCost: maint, label: `Routine maintenance every ${L.MAINTENANCE_RULE.everyJumps} hyperspace jumps, ${L.MAINTENANCE_RULE.fuelDays} fuel-days${maint === null ? '' : ` (${maint.toLocaleString()} cr)`}` },
      simplified: { ...L.SIMPLIFIED_UPKEEP }
    };
  }

  static quoteFuel(vehicle, days) {
    const state = stateOf(vehicle);
    if (!state) return refuse(R.STATE_INVALID);
    const plan = L.planFuelPurchase(state, { size: vehicle?.system?.size, days });
    return plan.ok ? { success: true, ...plan } : refuse(plan.reason, plan);
  }
  static quoteSupplies(vehicle, days) {
    const state = stateOf(vehicle);
    if (!state) return refuse(R.STATE_INVALID);
    const max = consumablesMax(vehicle);
    const plan = L.planSuppliesPurchase(state, { maxDays: max.ok ? max.days : null, occupants: occupantsOf(vehicle, state).count, days });
    return plan.ok ? { success: true, ...plan } : refuse(plan.reason, plan);
  }

  /** Personal credits: credits + resource in ONE transaction; a failed write rolls both back. */
  static async purchaseFuel({ ownerActor, vehicle, days }) { return this.#purchase({ ownerActor, vehicle, days, resource: 'fuel' }); }
  static async purchaseSupplies({ ownerActor, vehicle, days }) { return this.#purchase({ ownerActor, vehicle, days, resource: 'supplies' }); }
  static async #purchase({ ownerActor, vehicle, days, resource }) {
    const auth = VehicleInstallationService.authorizePurchaser({ ownerActor, vehicle });
    if (!auth.ok) return refuse(auth.reason);
    return exclusive(vehicle, async () => {
      const q = resource === 'fuel' ? this.quoteFuel(vehicle, days) : this.quoteSupplies(vehicle, days);
      if (!q.success) return q;
      const state = stateOf(vehicle);
      const next = resource === 'fuel' ? L.applyFuel(state, q, { by: globalThis.game?.user?.id ?? null }) : L.applySupplies(state, q, { by: globalThis.game?.user?.id ?? null });
      authorizeFlagWrite(vehicle.id, LOGISTICS_FLAG, next);
      let tx;
      try {
        tx = await TransactionEngine.executeAssetCustomizationTransaction({
          actor: ownerActor, assetActor: vehicle, cost: q.cost, resaleCredit: 0, assetMutationPlan: { set: { [`flags.swse.${LOGISTICS_FLAG}`]: next } },
          verifyAsset: verifyStoredPaths({ [`flags.swse.${LOGISTICS_FLAG}`]: next }),
          reason: `Buy ${q.days} ${resource === 'fuel' ? 'fuel-day(s)' : 'day(s) of consumables'} for ${vehicle.name}`,
          audit: { kind: `vehicle-${resource}-purchase`, days: q.days, unitPrice: q.unitPrice, occupants: q.occupants ?? null, payerAuthorization: payerAuditRecord(vehicle, ownerActor) }
        });
      } finally { clearLedgerWrite(vehicle.id); }
      if (!tx.success) return refuse(/insufficient credits/i.test(tx.error ?? '') ? 'INSUFFICIENT_CREDITS' : 'TRANSACTION_FAILED', { error: tx.error });
      return { success: true, transactionId: tx.transactionId, days: q.days, cost: q.cost, resulting: q.resulting };
    });
  }

  /**
   * Resource side of a GM-approved Party Fund settlement. It is NOT a free-delivery door: it requires a GM caller AND the persisted approval record of THIS settlement
   * (the queue entry the settlement core has just claimed: state `settling`, same vehicle, resource, days and price). Without that proof -- or after the settlement
   * finished and its record is gone -- nothing is delivered. The plan is then re-run against the CURRENT state at the recorded price and written by the one writer.
   */
  static async deliverPurchased({ vehicle, resource, days, unitPrice, requestId = null, user = globalThis.game?.user ?? null }) {
    if (!isGM(user)) return refuse(R.GM_ONLY);
    const rec = requestId ? settlementAuthority.find(requestId) : null;
    const kindOk = rec?.approvalKind === 'vehicle-logistics-party-fund' && rec.state === 'settling' && rec.vehicleId === vehicle?.id
      && rec.resource === resource && rec.days === days && rec.unitPrice === unitPrice;
    if (!kindOk) return refuse(R.SETTLEMENT_NOT_AUTHORIZED);
    return exclusive(vehicle, async () => {
      const state = stateOf(vehicle);
      if (!state) return refuse(R.STATE_INVALID);
      // at most once per settlement, INCLUDING repeated calls while the request is still `settling`: the id is recorded in the same write as the delivery
      const once = L.deliveryAllowed(state, requestId, rec.requestedAt);
      if (!once.ok) return refuse(once.reason);
      const q = resource === 'fuel' ? this.quoteFuel(vehicle, days) : this.quoteSupplies(vehicle, days);
      if (!q.success) return q;
      if (q.unitPrice !== unitPrice) return refuse('LOGISTICS_PRICE_CHANGED');
      const applied = resource === 'fuel' ? L.applyFuel(state, q, { by: `party-fund:${requestId}` }) : L.applySupplies(state, q, { by: `party-fund:${requestId}` });
      const next = L.markDelivered(applied, requestId, rec.requestedAt);
      await write(vehicle, next);
      return { success: true, days: q.days, cost: q.cost, resulting: q.resulting };
    });
  }

  /** A fresh, unique id for one authoritative fuel event (the sheet asks the service; it never invents one). */
  static newFuelEventId(vehicle = null) { return L.newFuelEventId(L.nextEventTime(vehicle ? stateOf(vehicle) : null)); }

  /** GM: once per vehicle, full printed consumables (the explicit project default); fuel is NOT invented. Nobody else can initialize an existing vehicle. */
  static async initialize(vehicle, { user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(R.GM_ONLY);
    return this.#initialize(vehicle);
  }

  /**
   * The creation hook's route: valid only for the user who CREATED the vehicle, only within moments of its creation, and only once. An owner of an older vehicle
   * cannot call it into a refill; there is no flag that bypasses this.
   */
  static async initializeOnCreate(vehicle, creatorUserId) {
    const created = Number(vehicle?._stats?.createdTime);
    if (!creatorUserId || creatorUserId !== globalThis.game?.user?.id) return refuse(R.CREATION_ONLY);
    if (!Number.isFinite(created) || Math.abs(Date.now() - created) > FRESH_VEHICLE_MS) return refuse(R.CREATION_ONLY);
    return this.#initialize(vehicle);
  }

  static async #initialize(vehicle) {
    return exclusive(vehicle, async () => {
      const existing = readLogistics(vehicle);
      if (existing?.consumables?.initialized) return refuse(R.ALREADY_INITIALIZED);
      const max = consumablesMax(vehicle);
      const base = existing && L.validateLogistics(existing).ok ? existing : L.emptyLogistics();
      const next = { ...base, consumables: { remainingDays: max.ok ? max.days : null, initialized: max.ok, policy: 'PROJECT_DEFAULT_FULL_INITIAL_CONSUMABLES' } };
      await write(vehicle, next);
      return { success: true, remainingDays: next.consumables.remainingDays };
    });
  }

  /** GM: establish the fuel tank (an explicit GM configuration, never labeled published, never derived from Consumables). */
  static async gmConfigureFuel(vehicle, { capacity, current = null, reason = '', user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(R.GM_ONLY);
    if (!String(reason).trim()) return refuse(R.REASON_REQUIRED);
    if (!Number.isInteger(capacity) || capacity < 1) return refuse(R.QUANTITY_INVALID);
    return exclusive(vehicle, async () => {
      const base = stateOf(vehicle) ?? L.emptyLogistics();
      const cur = current === null ? Math.min(base.fuel.current, capacity) : current;
      if (!Number.isInteger(cur) || cur < 0 || cur > capacity) return refuse(R.QUANTITY_INVALID);
      const next = { ...base, fuel: { current: cur, capacity: { value: capacity, basis: 'GM_CONFIGURED', by: user.id ?? null, reason: String(reason).trim() } }, log: [...base.log, { op: 'gm-configure-fuel', capacity, current: cur, reason: String(reason).trim(), by: user.id ?? null, at: Date.now() }].slice(-50) };
      await write(vehicle, next);
      return { success: true, capacity, current: cur };
    });
  }

  static async gmSetOccupants(vehicle, { passengers = undefined, override = undefined, reason = '', user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(R.GM_ONLY);
    if (!String(reason).trim()) return refuse(R.REASON_REQUIRED);
    for (const v of [passengers, override]) if (v !== undefined && v !== null && !(Number.isInteger(v) && v >= 0)) return refuse(R.QUANTITY_INVALID);
    return exclusive(vehicle, async () => {
      const base = stateOf(vehicle) ?? L.emptyLogistics();
      const next = { ...base, ...(passengers !== undefined ? { passengers } : {}), ...(override !== undefined ? { occupantsOverride: override } : {}), log: [...base.log, { op: 'gm-set-occupants', passengers, override, reason: String(reason).trim(), by: user.id ?? null, at: Date.now() }].slice(-50) };
      await write(vehicle, next);
      return { success: true };
    });
  }

  /** GM adjustment of the remaining supply (depletion by campaign time is a GM decision when no dependable clock exists). 0 .. maximum. */
  static async gmSetConsumables(vehicle, { remainingDays, reason = '', user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(R.GM_ONLY);
    if (!String(reason).trim()) return refuse(R.REASON_REQUIRED);
    const max = consumablesMax(vehicle);
    if (!max.ok) return refuse(R.CONSUMABLES_UNRESOLVED);
    if (!Number.isInteger(remainingDays) || remainingDays < 0 || remainingDays > max.days) return refuse(R.QUANTITY_INVALID);
    return exclusive(vehicle, async () => {
      const base = stateOf(vehicle) ?? L.emptyLogistics();
      const next = { ...base, consumables: { ...base.consumables, remainingDays, initialized: true }, log: [...base.log, { op: 'gm-set-consumables', remainingDays, reason: String(reason).trim(), by: user.id ?? null, at: Date.now() }].slice(-50) };
      await write(vehicle, next);
      return { success: true, remainingDays };
    });
  }

  /** GM: one authoritative fuel event. Idempotent per event id; refused (nothing spent) when the fuel is not there. */
  static async consumeFuel(vehicle, { event, quantity = 1, eventId, user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(R.GM_ONLY);
    return exclusive(vehicle, async () => {
      const state = stateOf(vehicle);
      if (!state) return refuse(R.FUEL_CAPACITY_UNCONFIGURED);
      const plan = L.planFuelConsumption(state, { event, quantity, eventId, by: user.id ?? null });
      if (!plan.ok) return refuse(plan.reason, plan);
      await write(vehicle, plan.next);
      return { success: true, spent: plan.spend, remaining: plan.next.fuel.current };
    });
  }
}
