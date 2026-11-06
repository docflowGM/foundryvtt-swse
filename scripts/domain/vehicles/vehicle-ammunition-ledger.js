/**
 * Finite ammunition of a vehicle launcher: the pure model of the ledger (P6C-3D).
 *
 * Four quantities that are NEVER conflated (Core Rulebook, statblock "Payload"; Starships of the Galaxy pp. 45-46):
 *   payload   the vehicle's complement of this ammunition, as the source prints it ("Payload 6 proton torpedoes");
 *   capacity  the launcher's magazine, a separately printed figure (proton torpedo launcher 3, light/medium/heavy concussion 6/16/30);
 *   loaded    what the launcher(s) hold now;
 *   reserve   what the vehicle carries beyond that.
 * Conservation: payload = loaded + reserve + expended, always; ammunition is never created (a reload moves reserve to loaded,
 * a launch moves loaded to expended). A missing payload is NOT unlimited ammunition: without a source-certified payload the
 * weapon is not a complete family and is refused.
 *
 * PROJECT_INTERPRETATION (owner addendum 2026-11-04, V-P6C-06): for a verified SINGLE-launcher configuration with a printed
 * payload and a certified capacity the initial state is  loaded = min(payload, capacity), reserve = payload - loaded.  Where the
 * launcher count is not verified the allocation must be GM-certified before the weapon fires. Reload ACTION costs are not
 * inferred from personal launchers: a GM reload operation moves reserve to loaded without creating ammunition.
 *
 * One launch is one unit (fire-linked launchers spend one unit per linked launcher, SotG Fire-Linked Weapons); the follow-up
 * attack of the same guided projectile is NOT a launch and spends nothing. Spending is atomic and idempotent per attack id.
 * Pure of Foundry globals.
 */
import { LAUNCHER_CAPACITY } from './vehicle-launcher-capacity.js';

export const LEDGER_SCHEMA = 'swse.vehicle.ammunition.v1';
export const LEDGER_FLAG = 'vehicleAmmo';
const MAX_RECEIPTS = 40;

/**
 * Exact printed weapon designations that identify a launcher in the capacity catalog (PROJECT_INTERPRETATION: identity by the
 * statblock's own designation, an exact match -- never a substring or a guess). `guided` = a guided projectile weapon (Core,
 * Missiles and Torpedoes: "guided projectile weapons such as proton torpedoes or concussion missiles").
 */
export const LAUNCHER_DESIGNATIONS = Object.freeze({
  'light concussion missiles': { launcherId: 'concussion-missile-launcher-light', ammunition: 'concussion missile', guided: true },
  'medium concussion missiles': { launcherId: 'concussion-missile-launcher-medium', ammunition: 'concussion missile', guided: true },
  'heavy concussion missiles': { launcherId: 'concussion-missile-launcher-heavy', ammunition: 'concussion missile', guided: true },
  'proton torpedoes': { launcherId: 'proton-torpedo-launcher', ammunition: 'proton torpedo', guided: true },
  'shieldbuster torpedoes': { launcherId: 'shieldbuster-torpedo-launcher', ammunition: 'shieldbuster torpedo', guided: true }
});

export const AMMO_REASONS = Object.freeze({
  PAYLOAD_NOT_PRINTED: 'STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED',
  LAUNCHER_NOT_IDENTIFIED: 'STOCK_LAUNCHER_IDENTITY_NOT_ESTABLISHED',
  ALLOCATION_REQUIRED: 'STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED',
  LEDGER_MISSING: 'AMMO_LEDGER_MISSING_OR_ALLOCATION_REQUIRED',
  LEDGER_INVALID: 'AMMO_LEDGER_INVALID',
  EMPTY: 'AMMO_LAUNCHER_EMPTY',
  NOTHING_TO_RELOAD: 'AMMO_NOTHING_TO_RELOAD',
  GM_ONLY: 'AMMO_GM_OPERATION_ONLY',
  ALLOCATION_INVALID: 'AMMO_ALLOCATION_INVALID',
  NO_RECEIPT: 'AMMO_NO_SUCH_SPEND'
});

const isInt = n => Number.isInteger(n) && n >= 0;
const fail = reason => ({ ok: false, reason });

/**
 * The exact launcher designation a PRINTED label names, read with only grammatical normalization (case, singular / plural, a trailing "launcher(s)"):
 * "medium concussion missile", "Proton torpedo launchers" and "proton torpedoes" all name the table's designation. A label with no size ("concussion
 * missile launcher") or any other wording names none -- it is never guessed. @returns {{key:string, designation:object, viaLauncherWord:boolean}|null}
 */
export function launcherDesignationOf(label) {
  let t = String(label ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const viaLauncherWord = /\blaunchers?$/.test(t);
  t = t.replace(/\s+launchers?$/, '');
  const cands = [t, t.replace(/\s+missile$/, ' missiles'), t.replace(/\s+torpedo$/, ' torpedoes'), t.replace(/\s+torpedoes?$/, ' torpedoes')];
  const key = cands.find(k => LAUNCHER_DESIGNATIONS[k]);
  return key ? { key, designation: LAUNCHER_DESIGNATIONS[key], viaLauncherWord } : null;
}

const squash = s => String(s ?? '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '');
/**
 * The payload a statblock PRINTS ("Payload 12 medium concussion missiles", recorded in armament.carriedPayloads) for this group's exact ammunition: one
 * single-item entry whose unit IS the designation's ammunition (same words, size included), claimed by exactly one group of the vehicle. A composite entry
 * ("3 ion bombs; 2 torpedoes"), an unsized or qualified one ("concussion missiles (Belbullab-24 only)"), or a payload that two groups could share, is not used.
 * @returns {{value:number, raw:string}|null}
 */
export function matchPrintedPayload(label, payloads, siblingLabels = []) {
  const d = launcherDesignationOf(label);
  if (!d || !Array.isArray(payloads)) return null;
  const want = squash(d.key);
  const claimants = siblingLabels.filter(l => launcherDesignationOf(l)?.key === d.key).length;
  if (claimants !== 1) return null;
  const hits = payloads.filter(p => p && !/[;,]/.test(String(p.unit)) && !/\d/.test(String(p.unit)) && !/\(/.test(String(p.unit)) && squash(p.unit) === want && Number.isInteger(p.value) && p.value >= 1);
  return hits.length === 1 ? { value: hits[0].value, raw: hits[0].raw ?? `${hits[0].value} ${hits[0].unit}` } : null;
}

/**
 * What the source establishes about a launcher group, and whether the family is complete.
 * @param {{label:string, evidence:object, battery?:object|null}} group a parsed stock group
 * @returns {{status:'complete'|'allocation-required'|'incomplete', reasons:string[], family:object|null}}
 */
export function resolveLauncherFamily(group) {
  const reasons = [];
  const payload = group?.evidence?.payloadCount;
  if (!isInt(payload) || payload < 1) reasons.push(AMMO_REASONS.PAYLOAD_NOT_PRINTED);
  const named = launcherDesignationOf(group?.label);
  const designation = named?.designation;
  const cap = designation ? LAUNCHER_CAPACITY[designation.launcherId] : null;
  if (!designation || !cap) reasons.push(AMMO_REASONS.LAUNCHER_NOT_IDENTIFIED);
  if (reasons.length) return { status: 'incomplete', reasons, family: null };
  const family = { payload, launcherId: designation.launcherId, ammunition: designation.ammunition, guided: designation.guided === true,
    capacity: cap.standard, capacitySource: cap.source, launchers: null, allocation: null };
  // a verified single launcher: the printed launcher count is exactly 1 and the group is not a battery of launchers
  const hw = group?.evidence?.hardwareCount;
  if (hw === 1 && !group?.battery) { family.launchers = 1; family.allocation = 'single-launcher-verified'; return { status: 'complete', reasons: [], family }; }
  // a launcher count the statblock PRINTS for a group named as a launcher ("2 proton torpedo launchers"): the count is source data, not an inference
  if (Number.isInteger(hw) && hw > 1 && !group?.battery && named?.viaLauncherWord) { family.launchers = hw; family.allocation = 'printed-launcher-count'; return { status: 'complete', reasons: [], family }; }
  return { status: 'allocation-required', reasons: [AMMO_REASONS.ALLOCATION_REQUIRED], family };
}

/** The initial ledger of a complete (single-launcher-verified) family, or of a GM-certified allocation. */
export function initialLedger(family, { launchers = family.launchers, loaded = null, allocation = family.allocation } = {}) {
  if (!family || !isInt(launchers) || launchers < 1) return null;
  const max = Math.min(family.payload, family.capacity * launchers);
  const load = loaded === null ? max : loaded;                       // single-launcher convention: loaded = min(payload, capacity)
  if (!isInt(load) || load > max) return null;
  return { schema: LEDGER_SCHEMA, launcherId: family.launcherId, ammunition: family.ammunition, guided: family.guided, payload: family.payload, capacity: family.capacity,
    launchers, allocation, loaded: load, reserve: family.payload - load, expended: 0, receipts: {}, log: [] };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// INITIAL VEHICLE AMMUNITION (owner-approved project house rule `initialVehicleAmmunitionIncluded`, default on). A stock launcher is created ONCE
// per managed Item: with the published payload at no charge (included), or empty so its initial ammunition is bought separately at the published
// per-round price (purchased). Neither policy ever changes a ledger that exists; the GM may deliberately grant up to the published payload (an NPC
// vehicle needs no credit transaction) and later purchases are priced from the certified launcher specification.
// ---------------------------------------------------------------------------------------------------------------------------------
export const INITIAL_AMMUNITION = Object.freeze({ INCLUDED: 'included', PURCHASED: 'purchased' });
const stockLedgerBase = (ledger, family) => (ledger.initial === INITIAL_AMMUNITION.PURCHASED ? 0 : family.payload);

/** A stock launcher that starts with NO ammunition (the house rule is off): everything it will hold is granted by the GM or bought. */
export function purchasedInitialLedger(family) {
  if (!family || !isInt(family.launchers) || family.launchers < 1) return null;
  return { schema: LEDGER_SCHEMA, launcherId: family.launcherId, ammunition: family.ammunition, guided: family.guided, payload: 0, capacity: family.capacity,
    launchers: family.launchers, allocation: family.allocation, initial: INITIAL_AMMUNITION.PURCHASED, granted: 0, bought: 0, loaded: 0, reserve: 0, expended: 0, receipts: {}, log: [] };
}
/** The ledger a NEW stock launcher Item is created with under the house rule's current state. */
export const initialStockLedger = (family, included) => (included === false ? purchasedInitialLedger(family) : initialLedger(family));

/** Buy `units` at `unitPrice`: payload and reserve rise together; nothing is loaded (the GM reload operation loads). */
export function planStockPurchase(ledger, family, { units, unitPrice, by = null, now = Date.now() } = {}) {
  if (!isInt(units) || units < 1) return fail('AMMO_PURCHASE_QUANTITY_INVALID');
  if (!isInt(unitPrice) || unitPrice < 1) return fail('AMMO_UNIT_PRICE_NOT_PUBLISHED');
  const v = validateLedger(ledger, family);
  if (!v.ok) return v;
  const cost = units * unitPrice;
  return { ok: true, units, cost, ledger: { ...ledger, payload: ledger.payload + units, reserve: ledger.reserve + units, bought: (ledger.bought ?? 0) + units,
    log: [...(ledger.log ?? []), { op: 'purchase', units, unitPrice, cost, by, at: now }].slice(-MAX_RECEIPTS) } };
}

/**
 * GM operation: grant starting ammunition WITHOUT a credit transaction, only up to the published payload and only to a launcher that started
 * without it. Defaults to the whole missing published payload. Never invents a quantity the source does not print.
 */
export function planGmGrant(ledger, family, { units = null, by = null, now = Date.now() } = {}) {
  const v = validateLedger(ledger, family);
  if (!v.ok) return v;
  if (ledger.initial !== INITIAL_AMMUNITION.PURCHASED) return fail(AMMO_REASONS.ALLOCATION_INVALID);
  const room = family.payload - (ledger.granted ?? 0);
  const n = units === null ? room : units;
  if (!isInt(n) || n < 1 || n > room) return fail(AMMO_REASONS.ALLOCATION_INVALID);
  return { ok: true, units: n, ledger: { ...ledger, payload: ledger.payload + n, reserve: ledger.reserve + n, granted: (ledger.granted ?? 0) + n,
    log: [...(ledger.log ?? []), { op: 'gm-grant', units: n, by, at: now }].slice(-MAX_RECEIPTS) } };
}

/** Is a stored ledger internally consistent AND the one the source family calls for? (Detects hand-edited ammunition.) */
export function validateLedger(ledger, family) {
  if (!ledger || ledger.schema !== LEDGER_SCHEMA || !family) return fail(AMMO_REASONS.LEDGER_MISSING);
  for (const k of ['payload', 'capacity', 'launchers', 'loaded', 'reserve', 'expended']) if (!isInt(ledger[k])) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.capacity !== family.capacity || ledger.launcherId !== family.launcherId) return fail(AMMO_REASONS.LEDGER_INVALID);
  // the units that exist are the published payload (unless the vehicle started without it: house rule) plus what was granted by the GM or bought
  if (ledger.payload !== stockLedgerBase(ledger, family) + (ledger.granted ?? 0) + (ledger.bought ?? 0)) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (!isInt(ledger.granted ?? 0) || !isInt(ledger.bought ?? 0)) return fail(AMMO_REASONS.LEDGER_INVALID);
  if ((ledger.granted ?? 0) > family.payload) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.launchers < 1 || ledger.loaded > ledger.capacity * ledger.launchers) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.loaded + ledger.reserve + ledger.expended !== ledger.payload) return fail(AMMO_REASONS.LEDGER_INVALID);       // conservation
  if (family.allocation === 'single-launcher-verified' && ledger.launchers !== 1) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (family.allocation === 'printed-launcher-count' && ledger.launchers !== family.launchers) return fail(AMMO_REASONS.LEDGER_INVALID);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// AFTERMARKET launchers (WE-L1). The installation itself is sealed in the installation ledger; its ammunition ledger is kept on the
// VEHICLE under a guarded flag keyed by installId (flags.swse.vehicleAmmunition), so it outlives the owned Item, can be written in the
// same transaction as the credits that paid for it, and cannot be refilled by deleting the Item. Nothing printed in a source gives a
// payload for an aftermarket launcher: its payload is exactly what was BOUGHT (the sum of paid purchases), and ammunition bought
// arrives in RESERVE; moving it into the launcher is the GM reload operation (V-P6C-06: no reload action cost is invented).
// ---------------------------------------------------------------------------------------------------------------------------------
export const AFTERMARKET_AMMO_FLAG = 'vehicleAmmunition';

/** The static family of an aftermarket launcher installation (what the certified specification and the sealed entry establish). */
export function aftermarketFamily(spec, entry) {
  const a = spec?.ammunition;
  if (!a || !isInt(a.capacity) || a.capacity < 1 || !isInt(a.price) || !entry?.catalogId || !entry?.installId) return null;
  return { origin: 'aftermarket', installId: entry.installId, payload: null, launcherId: entry.catalogId, ammunition: a.id, guided: spec.guided === true,
    capacity: a.capacity, capacitySource: 'Starships of the Galaxy pp. 45-46', launchers: 1, allocation: 'single-launcher-verified', unitPrice: a.price };
}

/** A launcher with nothing bought yet. */
export function emptyAftermarketLedger(family) {
  if (family?.origin !== 'aftermarket') return null;
  return { schema: LEDGER_SCHEMA, launcherId: family.launcherId, ammunition: family.ammunition, guided: family.guided, payload: 0, capacity: family.capacity,
    launchers: 1, allocation: 'aftermarket', loaded: 0, reserve: 0, expended: 0, receipts: {}, log: [] };
}

/** Internal consistency of an aftermarket ledger against the certified launcher (there is no printed payload to compare with). */
export function validateAftermarketLedger(ledger, family) {
  if (!ledger || ledger.schema !== LEDGER_SCHEMA || family?.origin !== 'aftermarket') return fail(AMMO_REASONS.LEDGER_MISSING);
  for (const k of ['payload', 'capacity', 'launchers', 'loaded', 'reserve', 'expended']) if (!isInt(ledger[k])) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.capacity !== family.capacity || ledger.launcherId !== family.launcherId || ledger.ammunition !== family.ammunition || ledger.launchers !== 1) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.loaded > ledger.capacity) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.loaded + ledger.reserve + ledger.expended !== ledger.payload) return fail(AMMO_REASONS.LEDGER_INVALID);       // conservation
  return { ok: true };
}

/** Buy `units` of the launcher's ammunition at the certified unit price: payload and reserve rise together; nothing is loaded. */
export function planPurchase(ledger, family, { units, by = null, now = Date.now() } = {}) {
  if (!isInt(units) || units < 1) return fail('AMMO_PURCHASE_QUANTITY_INVALID');
  const v = validateAftermarketLedger(ledger, family);
  if (!v.ok) return v;
  const cost = units * family.unitPrice;
  return { ok: true, units, cost, ledger: { ...ledger, payload: ledger.payload + units, reserve: ledger.reserve + units,
    log: [...(ledger.log ?? []), { op: 'purchase', units, unitPrice: family.unitPrice, cost, by, at: now }].slice(-MAX_RECEIPTS) } };
}

const trimReceipts = receipts => Object.fromEntries(Object.entries(receipts).sort((a, b) => (a[1].at ?? 0) - (b[1].at ?? 0)).slice(-MAX_RECEIPTS));

/** Spend `units` launched by attack `attackId`. Idempotent: the same attack id spends once. @returns {{ok:true, replay:boolean, ledger:object}|{ok:false, reason}} */
export function planLaunch(ledger, { attackId, units = 1, now = Date.now() } = {}) {
  if (!attackId) return fail(AMMO_REASONS.LEDGER_INVALID);
  const prior = ledger.receipts?.[attackId];
  if (prior) return { ok: true, replay: true, ledger };
  if (!isInt(units) || units < 1) return fail(AMMO_REASONS.LEDGER_INVALID);
  if (ledger.loaded < units) return fail(AMMO_REASONS.EMPTY);
  return { ok: true, replay: false, ledger: { ...ledger, loaded: ledger.loaded - units, expended: ledger.expended + units,
    receipts: trimReceipts({ ...ledger.receipts, [attackId]: { units, at: now, refunded: false } }) } };
}

/** Undo ONE spend (the attack failed after paying). Only a receipt that exists and has not been refunded. */
export function planRefund(ledger, attackId) {
  const r = ledger.receipts?.[attackId];
  if (!r || r.refunded) return fail(AMMO_REASONS.NO_RECEIPT);
  return { ok: true, ledger: { ...ledger, loaded: ledger.loaded + r.units, expended: ledger.expended - r.units, receipts: { ...ledger.receipts, [attackId]: { ...r, refunded: true } } } };
}

/** GM reload: moves reserve to loaded, up to the launchers' capacity; never creates ammunition and costs no action here. */
export function planGmReload(ledger, { amount = Infinity, by = null, now = Date.now() } = {}) {
  const room = ledger.capacity * ledger.launchers - ledger.loaded;
  const moved = Math.min(amount, ledger.reserve, room);
  if (!(moved >= 1)) return fail(AMMO_REASONS.NOTHING_TO_RELOAD);
  return { ok: true, moved, ledger: { ...ledger, loaded: ledger.loaded + moved, reserve: ledger.reserve - moved, log: [...(ledger.log ?? []), { op: 'gm-reload', moved, by, at: now }].slice(-MAX_RECEIPTS) } };
}

/** GM allocation for a family whose launcher count the source does not verify: launchers and what is loaded now. */
export function planGmAllocation(family, { launchers, loaded, by = null, now = Date.now() } = {}) {
  if (!family || family.allocation === 'single-launcher-verified' || family.allocation === 'printed-launcher-count') return fail(AMMO_REASONS.ALLOCATION_INVALID);
  const ledger = initialLedger(family, { launchers, loaded, allocation: 'gm-certified' });
  if (!ledger) return fail(AMMO_REASONS.ALLOCATION_INVALID);
  return { ok: true, ledger: { ...ledger, log: [{ op: 'gm-allocation', launchers, loaded, by, at: now }] } };
}

/** Units one launch spends: one per launcher that fires (fire-linked launchers fire together). */
export const launchUnits = ({ firedLaunchers = 1 } = {}) => (isInt(firedLaunchers) && firedLaunchers >= 1 ? firedLaunchers : 1);
