/**
 * Battery Aid Another (Core Rulebook, Vehicle Combat, Standard Actions, printed p. 170).
 *
 * PUBLISHED_RULE: "As a standard action, you can aid an ally's next skill check, ability or attack roll... A gunner can grant a
 * +2 bonus on another character's attack roll by making an attack against a Reflex Defense of 10." For a battery assisting
 * another battery (rule text verified by the project owner) the bonus is +2 per complete pair of weapons in the ASSISTING
 * battery, the assisting weapons produce no margin hits, and the benefit is the ally's NEXT attack roll: it is consumed once and
 * has no end-of-round expiry. An incomplete pair gives nothing.
 *
 * Scope implemented: the ordinary single-assisting-battery case between FULL-BATTERY weapons (the assisting battery's weapon
 * count must be printed; the aided weapon is a full battery too). At most ONE pending aid per aided weapon: stacking several
 * assisting batteries is SOURCE_UNRESOLVED and is refused rather than assumed.
 *
 * Pure of Foundry globals. The pending aid is stored on the AIDED weapon's vehicle (flag below) through ActorEngine by the
 * service; this module only describes, validates and reads it.
 */
import { batteryAidsBattery, BATTERY_AID_DEFENSE } from './vehicle-weapon-battery.js';

export const BATTERY_AID_FLAG = 'batteryAid';

export const AID_REASONS = Object.freeze({
  ASSISTING_NOT_A_FULL_BATTERY: 'AID_ASSISTING_WEAPON_IS_NOT_A_FULL_BATTERY',
  AIDED_NOT_A_FULL_BATTERY: 'AID_AIDED_WEAPON_IS_NOT_A_FULL_BATTERY',
  SAME_BATTERY: 'AID_A_BATTERY_CANNOT_AID_ITSELF',
  NO_COMPLETE_PAIR: 'AID_ASSISTING_BATTERY_HAS_NO_COMPLETE_PAIR',
  ALREADY_PENDING: 'AID_ALREADY_PENDING_ON_THE_AIDED_BATTERY',
  NOT_AUTHORIZED: 'AID_USER_NOT_AUTHORIZED',
  ASSIGNED_CREW: 'BATTERY_ASSIGNED_CREW_ROSTER_UNMODELED',
  ACTION_UNAVAILABLE: 'AID_STANDARD_ACTION_UNAVAILABLE'
});

/**
 * Can this pair of weapons take part in a battery aid, and what would a success give? (No dice, no action: a refusal here costs
 * nothing.)
 * @param {{assisting:{itemId:string, battery:object|null}, aided:{itemId:string, battery:object|null}, pending?:object|null}} p
 */
export function planBatteryAid({ assisting, aided, pending = null } = {}) {
  if (!assisting?.battery) return { ok: false, reason: AID_REASONS.ASSISTING_NOT_A_FULL_BATTERY };
  if (!aided?.battery) return { ok: false, reason: AID_REASONS.AIDED_NOT_A_FULL_BATTERY };
  if (assisting.itemId === aided.itemId) return { ok: false, reason: AID_REASONS.SAME_BATTERY };
  if (pending && !pending.consumedAt) return { ok: false, reason: AID_REASONS.ALREADY_PENDING };
  const w = assisting.battery.participatingWeapons;
  const potential = 2 * Math.floor(w / 2);
  if (potential < 2) return { ok: false, reason: AID_REASONS.NO_COMPLETE_PAIR };
  return { ok: true, assistingWeapons: w, potentialBonus: potential, defense: BATTERY_AID_DEFENSE };
}

/** Resolve the aid attack: success against Reflex Defense 10 (a natural 1 always misses, a natural 20 always hits, as every attack). */
export function resolveBatteryAid({ attackTotal, assistingWeapons, hit }) {
  return batteryAidsBattery({ attackTotal, assistingWeapons, hit });
}

/** The record stored on the aided weapon's vehicle. */
export function buildAidRecord({ aidId, assisting, aided, bonus, attackTotal, combatId = null, now = Date.now() }) {
  return { aidId, kind: 'battery', assistingItemId: assisting.itemId, assistingVehicleId: assisting.vehicleId ?? null, aidedItemId: aided.itemId, aidedVehicleId: aided.vehicleId ?? null,
    bonus, attackTotal, defense: BATTERY_AID_DEFENSE, combatId, createdAt: now, consumedAt: null };
}

/** The unconsumed aid waiting for this weapon's next attack, or null. */
export function readPendingAid(vehicle, itemId) {
  const rec = vehicle?.flags?.swse?.[BATTERY_AID_FLAG]?.[itemId];
  return rec && typeof rec === 'object' && !rec.consumedAt && Number.isFinite(rec.bonus) && rec.bonus > 0 && rec.aidedItemId === itemId ? rec : null;
}

/** The attack-ledger entry the aid contributes to the aided weapon's next attack roll. */
export function aidLedgerEntry(record, { vehicleActor = null } = {}) {
  return { id: 'battery-aid', label: 'Battery Aid Another (next attack)', value: record.bonus, category: 'aid', applied: true,
    sourceId: record.aidId, sourceName: 'Aid Another (Core p. 170)', actorId: vehicleActor?.id ?? null,
    reason: `Aid Another: an allied battery's attack beat Reflex Defense ${record.defense}; +2 per complete pair of its weapons, on this battery's next attack roll, consumed once.` };
}
