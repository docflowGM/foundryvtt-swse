/**
 * Ship logistics (Starships of the Galaxy, printed pp. 10 and 14): fuel, consumables, docking and routine maintenance. PURE: published constants, the pricing and
 * capacity formulas, and the planners for the two purchasable resources. Every number the vehicle sheet shows comes from here (through VehicleLogisticsService);
 * the sheet performs no arithmetic.
 *
 * PUBLISHED (SotG p. 14):
 *   fuel            50 cr per fuel-day for a Colossal or smaller starship; x100 for each larger size: Colossal (frigate) 5,000; (cruiser) 500,000; (station) 50,000,000.
 *                   One fuel-day is spent by: a day of realspace or hyperspace travel, an hour of atmospheric flight or combat, or one jump to lightspeed.
 *   consumables     restocking costs 10 cr x living creatures aboard x days (droids are not living creatures for this formula).
 *   docking         about 20 cr/day; long-term storage 200 cr/month.            (GM ADMINISTERED here: reference only)
 *   maintenance     every 20 hyperspace jumps, costing four fuel-days; skipped maintenance doubles the system-damage rolls.   (GM ADMINISTERED here: reference only)
 *   simplified      (p. 10) 2,000 cr/month covers all of the above for a Colossal-or-smaller ship -- an ALTERNATIVE accounting method, never charged in addition.
 *
 * OWNER INTERPRETATIONS / PROJECT CONVENTIONS (V-P6C-20): the printed Consumables value is the ship's MAXIMUM endurance (source data; the remaining supply is mutable
 * play state); calendar units convert with the existing project policy V-P6B-02 (a month = 30 days, a year = 365); fuel and consumables are separate resources;
 * a fuel-tank capacity is not published, so it exists only as an explicit GM configuration (never derived from consumables).
 */
export const FUEL_BASE_PRICE = 50;
const SIZE_STEP = 100;
export const FUEL_PRICE_BY_SIZE = Object.freeze({ 'colossal (frigate)': FUEL_BASE_PRICE * SIZE_STEP, 'colossal (cruiser)': FUEL_BASE_PRICE * SIZE_STEP ** 2, 'colossal (station)': FUEL_BASE_PRICE * SIZE_STEP ** 3 });
const SMALL_OR_COLOSSAL = new Set(['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal']);

/** Cost of one fuel-day at a ship size; null when the size is unknown (never guessed). */
export function fuelPricePerDay(size) {
  const s = String(size ?? '').trim().toLowerCase();
  if (FUEL_PRICE_BY_SIZE[s] !== undefined) return FUEL_PRICE_BY_SIZE[s];
  return SMALL_OR_COLOSSAL.has(s) ? FUEL_BASE_PRICE : null;
}

/** What spends fuel: every listed event is exactly one fuel-day per unit. */
export const FUEL_EVENTS = Object.freeze({
  'realspace-day': { label: 'A day of realspace travel', source: 'SotG p. 14' },
  'hyperspace-day': { label: 'A day of hyperspace travel', source: 'SotG p. 14' },
  'atmosphere-hour': { label: 'An hour of atmospheric flight', source: 'SotG p. 14' },
  'combat-hour': { label: 'An hour of combat', source: 'SotG p. 14' },
  'lightspeed-jump': { label: 'A jump to lightspeed', source: 'SotG p. 14' }
});
export const FUEL_DAYS_PER_EVENT = 1;

export const CONSUMABLES_CREDITS_PER_PERSON_DAY = 10;
export const DOCKING_REFERENCE = Object.freeze({ dockingPerDay: 20, storagePerMonth: 200, source: 'Starships of the Galaxy, printed p. 14', administration: 'GM_ADMINISTERED' });
export const MAINTENANCE_RULE = Object.freeze({ everyJumps: 20, fuelDays: 4, source: 'Starships of the Galaxy, printed p. 14', administration: 'GM_ADMINISTERED',
  consequence: 'Without maintenance, roll twice on the relevant table whenever system damage must be checked.' });
export const SIMPLIFIED_UPKEEP = Object.freeze({ perMonth: 2000, source: 'Starships of the Galaxy, printed p. 10', note: 'An alternative to the detailed expenses -- never charged in addition.' });

/** Reference maintenance cost (four fuel-days at the ship's rate); null when the size is unknown. */
export function maintenanceReferenceCost(size) { const p = fuelPricePerDay(size); return p === null ? null : MAINTENANCE_RULE.fuelDays * p; }

export const LOGISTICS_FLAG = 'shipLogistics';
export const LOGISTICS_SCHEMA = 'swse.vehicle.logistics.v1';
export const LOGISTICS_REASONS = Object.freeze({
  NOT_A_VEHICLE: 'LOGISTICS_NOT_A_VEHICLE', QUANTITY_INVALID: 'LOGISTICS_QUANTITY_INVALID', PRICE_UNRESOLVED: 'FUEL_PRICE_SIZE_UNRESOLVED', FUEL_CAPACITY_UNCONFIGURED: 'FUEL_CAPACITY_NOT_CONFIGURED',
  FUEL_CAPACITY_EXCEEDED: 'FUEL_PURCHASE_EXCEEDS_CAPACITY', FUEL_INSUFFICIENT: 'FUEL_INSUFFICIENT', CONSUMABLES_UNRESOLVED: 'CONSUMABLES_CAPACITY_NOT_ESTABLISHED', CONSUMABLES_UNINITIALIZED: 'CONSUMABLES_NOT_INITIALIZED',
  CONSUMABLES_AT_MAXIMUM: 'CONSUMABLES_AT_MAXIMUM', CONSUMABLES_CAPACITY_EXCEEDED: 'CONSUMABLES_PURCHASE_EXCEEDS_MAXIMUM', OCCUPANTS_NOT_ESTABLISHED: 'LIVING_OCCUPANTS_NOT_ESTABLISHED',
  EVENT_UNKNOWN: 'FUEL_EVENT_UNKNOWN', EVENT_DUPLICATE: 'FUEL_EVENT_ALREADY_PROCESSED', GM_ONLY: 'LOGISTICS_GM_OPERATION', REASON_REQUIRED: 'LOGISTICS_REASON_REQUIRED', STATE_INVALID: 'LOGISTICS_STATE_INVALID',
  ALREADY_INITIALIZED: 'LOGISTICS_ALREADY_INITIALIZED'
});

const isInt = n => Number.isInteger(n) && n >= 0;
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const MAX_EVENTS = 50;

/** A vehicle with no logistics state yet. */
export const emptyLogistics = () => ({ schema: LOGISTICS_SCHEMA, fuel: { current: 0, capacity: null }, consumables: { remainingDays: null, initialized: false }, passengers: null, occupantsOverride: null, events: [], log: [] });
export function validateLogistics(s) {
  if (!s || s.schema !== LOGISTICS_SCHEMA) return fail(LOGISTICS_REASONS.STATE_INVALID);
  if (!isInt(s.fuel?.current)) return fail(LOGISTICS_REASONS.STATE_INVALID);
  if (s.fuel.capacity !== null && !(isInt(s.fuel.capacity?.value) && s.fuel.capacity.value >= 1 && s.fuel.capacity.basis && s.fuel.current <= s.fuel.capacity.value)) return fail(LOGISTICS_REASONS.STATE_INVALID);
  if (s.consumables?.remainingDays !== null && !isInt(s.consumables?.remainingDays)) return fail(LOGISTICS_REASONS.STATE_INVALID);
  return { ok: true };
}

/** Maximum consumables endurance in days: printed value converted with the project policy, plus certified modifications (existing computation). */
export function consumablesMaxDays({ printedDays, effectiveDays = null }) {
  if (!Number.isInteger(printedDays) || printedDays < 1) return fail(LOGISTICS_REASONS.CONSUMABLES_UNRESOLVED);
  return { ok: true, days: Number.isInteger(effectiveDays) && effectiveDays >= printedDays ? effectiveDays : printedDays };
}

/** Living creatures aboard for the restocking formula: assigned living crew (droids excluded) + the GM-recorded living passengers, unless the GM overrides the total. */
export function livingOccupants({ crewActors = [], passengers = null, override = null }) {
  if (isInt(override)) return { count: override, basis: 'GM_OVERRIDE' };
  const crew = new Set(crewActors.filter(a => a && a.type !== 'vehicle' && a.type !== 'droid' && a.system?.isDroid !== true).map(a => a.id));
  const total = crew.size + (isInt(passengers) ? passengers : 0);
  return { count: total, basis: total > 0 ? 'ASSIGNED_CREW_AND_GM_PASSENGERS' : 'NOT_ESTABLISHED' };
}

/** Restocking cost: 10 cr x living creatures x days. */
export const consumablesCost = (occupants, days) => CONSUMABLES_CREDITS_PER_PERSON_DAY * occupants * days;

/** Plan buying `days` of fuel. Never exceeds an established capacity; fails closed without one. */
export function planFuelPurchase(state, { size, days }) {
  if (!isInt(days) || days < 1) return fail(LOGISTICS_REASONS.QUANTITY_INVALID);
  const unitPrice = fuelPricePerDay(size);
  if (unitPrice === null) return fail(LOGISTICS_REASONS.PRICE_UNRESOLVED);
  const cap = state?.fuel?.capacity?.value;
  if (!isInt(cap)) return fail(LOGISTICS_REASONS.FUEL_CAPACITY_UNCONFIGURED);
  const resulting = state.fuel.current + days;
  if (resulting > cap) return fail(LOGISTICS_REASONS.FUEL_CAPACITY_EXCEEDED, { room: cap - state.fuel.current });
  return { ok: true, days, unitPrice, cost: unitPrice * days, resulting, capacity: cap };
}

/** Plan buying `days` of consumables. Never exceeds the maximum; a full ship cannot buy more. */
export function planSuppliesPurchase(state, { maxDays, occupants, days }) {
  if (!isInt(days) || days < 1) return fail(LOGISTICS_REASONS.QUANTITY_INVALID);
  if (!isInt(maxDays)) return fail(LOGISTICS_REASONS.CONSUMABLES_UNRESOLVED);
  if (!state?.consumables?.initialized || !isInt(state.consumables.remainingDays)) return fail(LOGISTICS_REASONS.CONSUMABLES_UNINITIALIZED);
  if (!isInt(occupants) || occupants < 1) return fail(LOGISTICS_REASONS.OCCUPANTS_NOT_ESTABLISHED);
  const room = maxDays - state.consumables.remainingDays;
  if (room <= 0) return fail(LOGISTICS_REASONS.CONSUMABLES_AT_MAXIMUM);
  if (days > room) return fail(LOGISTICS_REASONS.CONSUMABLES_CAPACITY_EXCEEDED, { room });
  return { ok: true, days, occupants, unitPrice: CONSUMABLES_CREDITS_PER_PERSON_DAY * occupants, cost: consumablesCost(occupants, days), resulting: state.consumables.remainingDays + days, capacity: maxDays };
}

const log = (state, entry) => [...(state.log ?? []), entry].slice(-MAX_EVENTS);

/** Apply a planned purchase (delivery). Pure: returns the next state. */
export function applyFuel(state, plan, { by = null, now = Date.now() } = {}) { return { ...state, fuel: { ...state.fuel, current: plan.resulting }, log: log(state, { op: 'fuel-purchase', days: plan.days, unitPrice: plan.unitPrice, cost: plan.cost, by, at: now }) }; }
export function applySupplies(state, plan, { by = null, now = Date.now() } = {}) { return { ...state, consumables: { ...state.consumables, remainingDays: plan.resulting }, log: log(state, { op: 'supplies-purchase', days: plan.days, occupants: plan.occupants, cost: plan.cost, by, at: now }) }; }

/** Spend fuel for one authoritative event. Idempotent per event id; never below zero (a ship without fuel cannot move: the event is refused, nothing is half-spent). */
export function planFuelConsumption(state, { event, quantity = 1, eventId, now = Date.now(), by = null }) {
  if (!FUEL_EVENTS[event]) return fail(LOGISTICS_REASONS.EVENT_UNKNOWN);
  if (!eventId || typeof eventId !== 'string') return fail(LOGISTICS_REASONS.EVENT_UNKNOWN);
  if (!isInt(quantity) || quantity < 1) return fail(LOGISTICS_REASONS.QUANTITY_INVALID);
  if ((state.events ?? []).includes(eventId)) return fail(LOGISTICS_REASONS.EVENT_DUPLICATE);
  const spend = FUEL_DAYS_PER_EVENT * quantity;
  if (state.fuel.current < spend) return fail(LOGISTICS_REASONS.FUEL_INSUFFICIENT, { have: state.fuel.current, need: spend });
  return { ok: true, spend, next: { ...state, fuel: { ...state.fuel, current: state.fuel.current - spend }, events: [...(state.events ?? []), eventId].slice(-MAX_EVENTS), log: log(state, { op: 'fuel-use', event, quantity, spend, eventId, by, at: now }) } };
}
