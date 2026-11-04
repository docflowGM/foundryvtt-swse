/**
 * The finite-ammunition ledger of a vehicle launcher, kept on the OWNED launcher Item (flags.swse.vehicleAmmo) and changed only here,
 * through ActorEngine. It does not depend on the optional `trackBlasterCharges` house rule (AmmoSystem tracks only when that is on, which
 * would make a finite vehicle supply unlimited); the model and its invariants are in scripts/domain/vehicles/vehicle-ammunition-ledger.js.
 *
 * Integrity: a stored ledger is validated against the SOURCE family at every use (payload and capacity come from the verified record,
 * conservation payload = loaded + reserve + expended must hold), so a hand-edited ledger is refused, not trusted.
 * Spending is atomic and idempotent per attack id; a refund undoes exactly one spend. Reloading and allocating are GM operations.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { LEDGER_FLAG, AFTERMARKET_AMMO_FLAG, AMMO_REASONS, validateLedger, validateAftermarketLedger, emptyAftermarketLedger, initialLedger, planLaunch, planRefund, planGmReload, planGmAllocation, launchUnits } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-ammunition-ledger.js";
import { authorizeFlagWrite, clearLedgerWrite } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";

const flagOf = weapon => weapon?.flags?.swse?.[LEDGER_FLAG] ?? weapon?.getFlag?.('swse', LEDGER_FLAG) ?? null;
const stockWrite = (vehicle, weapon, ledger) => ActorEngine.updateOwnedItems(vehicle, [{ _id: weapon.id, [`flags.swse.==${LEDGER_FLAG}`]: ledger }]);

/**
 * Two storages, one model. A STOCK launcher keeps its ledger on its managed Item (the source family is the integrity check). An
 * AFTERMARKET launcher (WE-L1) keeps it on the VEHICLE, keyed by installation id, under a guarded flag: it belongs to the sealed
 * installation, survives the Item being deleted and re-created, and is written in the same transaction as the credits that paid
 * for it. The guard (isLedgerUpdateAllowed) refuses any write this service did not authorize.
 */
const isAftermarket = family => family?.origin === 'aftermarket';
/** The aftermarket ammunition map of a vehicle (installId -> ledger). */
export const readAftermarketLedgers = vehicle => vehicle?.flags?.swse?.[AFTERMARKET_AMMO_FLAG] ?? vehicle?.getFlag?.('swse', AFTERMARKET_AMMO_FLAG) ?? {};
const read = (vehicle, weapon, family) => (isAftermarket(family) ? readAftermarketLedgers(vehicle)[family.installId] ?? null : flagOf(weapon));
async function write(vehicle, weapon, ledger, family) {
  if (!isAftermarket(family)) return stockWrite(vehicle, weapon, ledger);
  const next = { ...readAftermarketLedgers(vehicle), [family.installId]: ledger };
  authorizeFlagWrite(vehicle.id, AFTERMARKET_AMMO_FLAG, next);
  try { return await ActorEngine.updateActor(vehicle, { [`flags.swse.==${AFTERMARKET_AMMO_FLAG}`]: next }); }
  finally { clearLedgerWrite(vehicle.id); }
}
const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export class VehicleAmmunitionService {
  /** The source family of a launcher Item (null for every other weapon). */
  static familyOf(weapon) {
    const a = resolveVehicleWeaponAuthority(weapon);
    return a?.ok && a.ammunition ? a.ammunition : null;
  }

  /**
   * The valid ledger of this launcher, initializing a verified single-launcher family on first use (migration-safe: an existing Item
   * without a ledger starts full by the project convention). A family whose allocation is not certified has none.
   */
  static async ensureLedger(vehicle, weapon) {
    const family = this.familyOf(weapon);
    if (!family) return refuse('AMMO_NOT_A_LAUNCHER');
    let ledger = read(vehicle, weapon, family);
    if (isAftermarket(family)) {
      // nothing bought yet: the launcher exists with an empty magazine (no ammunition is created by looking at it)
      if (!ledger) return refuse(AMMO_REASONS.EMPTY);
      const va = validateAftermarketLedger(ledger, family);
      return va.ok ? { ok: true, ledger, family } : refuse(va.reason);
    }
    if (!ledger && family.allocation === 'single-launcher-verified') { ledger = initialLedger(family); await write(vehicle, weapon, ledger, family); }
    if (!ledger) return refuse(AMMO_REASONS.LEDGER_MISSING);
    const v = validateLedger(ledger, family);
    return v.ok ? { ok: true, ledger, family } : refuse(v.reason);
  }

  /** Can this launcher launch now? A pure read: used before any cost is paid. */
  static async canLaunch(vehicle, weapon, { units = 1 } = {}) {
    const r = await this.ensureLedger(vehicle, weapon);
    if (!r.ok) return r;
    return r.ledger.loaded >= units ? { ok: true, ledger: r.ledger, family: r.family } : refuse(AMMO_REASONS.EMPTY);
  }

  /** Spend a launch (idempotent per attack id). @returns {Promise<{ok:true, spent:boolean, replay:boolean, attackId:string, vehicle, weapon}|{ok:false, reason}>} */
  static async spendLaunch(vehicle, weapon, { attackId, firedLaunchers = 1 } = {}) {
    const r = await this.ensureLedger(vehicle, weapon);
    if (!r.ok) return r;
    const plan = planLaunch(r.ledger, { attackId, units: launchUnits({ firedLaunchers }) });
    if (!plan.ok) return plan;
    if (!plan.replay) await write(vehicle, weapon, plan.ledger, r.family);
    return { ok: true, spent: !plan.replay, replay: plan.replay, attackId, vehicle, weapon };
  }

  /** Undo one spend (the attack failed after paying). Safe to call twice. */
  static async refundLaunch(spend) {
    if (!spend?.ok || !spend.spent) return { ok: true, skipped: true };
    const r = await this.ensureLedger(spend.vehicle, spend.weapon);
    if (!r.ok) return r;
    const plan = planRefund(r.ledger, spend.attackId);
    if (!plan.ok) return plan;
    await write(spend.vehicle, spend.weapon, plan.ledger, r.family);
    return { ok: true };
  }

  /** GM operation: move reserve to loaded (no ammunition is created and no action cost is invented). */
  static async gmReload(vehicle, weapon, { amount = Infinity, user = globalThis.game?.user ?? null } = {}) {
    if (user?.isGM !== true) return refuse(AMMO_REASONS.GM_ONLY);
    const r = await this.ensureLedger(vehicle, weapon);
    if (!r.ok) return r;
    const plan = planGmReload(r.ledger, { amount, by: user?.id ?? null });
    if (!plan.ok) return plan;
    await write(vehicle, weapon, plan.ledger, r.family);
    return { ok: true, moved: plan.moved, ledger: plan.ledger };
  }

  /** GM operation: certify the launcher count and what is loaded for a family the source does not allocate. */
  static async gmCertifyAllocation(vehicle, weapon, { launchers, loaded, user = globalThis.game?.user ?? null } = {}) {
    if (user?.isGM !== true) return refuse(AMMO_REASONS.GM_ONLY);
    const family = this.familyOf(weapon);
    if (!family) return refuse('AMMO_NOT_A_LAUNCHER');
    if (isAftermarket(family)) return refuse(AMMO_REASONS.ALLOCATION_INVALID, { detail: 'an aftermarket launcher is allocated by its installation' });
    if (flagOf(weapon)) return refuse(AMMO_REASONS.ALLOCATION_INVALID, { detail: 'an allocation is already recorded' });
    const plan = planGmAllocation(family, { launchers, loaded, by: user?.id ?? null });
    if (!plan.ok) return plan;
    await write(vehicle, weapon, plan.ledger, family);
    return { ok: true, ledger: plan.ledger };
  }
}
