/**
 * P6B-0 vehicle operating context: the authoritative environment state and the vehicle side of a Pilot check.
 *
 * Environment: 'atmosphere' | 'space' | 'unknown'. Only an explicit, GM-set flag counts; scene art, scene or ship
 * names and vehicle categories are never used. Unknown never activates an atmosphere-only effect.
 *
 * Pilot check (Core Rulebook, Vehicles: "The pilot adds the vehicle's size modifier and Dexterity modifier on all
 * Initiative and Pilot checks"; size modifiers Table 10-1):
 *   - a crew Actor piloting: that Actor's own Pilot check (the existing skill roll authority) + the vehicle's size
 *     modifier + the vehicle's EFFECTIVE Dexterity modifier (published Dex + certified installed effects). The generic
 *     crew quality is NOT added: it describes the statblock's anonymous crew, whom the Actor replaces.
 *   - no crew Actor (generic crew): the published statblock Pilot modifier, which already contains crew quality, size
 *     and Dexterity, plus only the Dexterity-modifier change made by certified installations.
 * Missing values stay unknown (no 0 is invented). Pure; no Foundry globals.
 */
import { getEffectiveVehicleDerived, getVerifiedPublishedRecord } from './vehicle-published-derived.js';

export const VEHICLE_ENVIRONMENT = Object.freeze({ ATMOSPHERE: 'atmosphere', SPACE: 'space', UNKNOWN: 'unknown' });
export const VEHICLE_ENVIRONMENT_FLAG_PATH = 'flags.swse.vehicleEnvironment';
const STATES = new Set([VEHICLE_ENVIRONMENT.ATMOSPHERE, VEHICLE_ENVIRONMENT.SPACE]);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const raw = actor => (typeof actor?.toObject === 'function' ? actor.toObject() : actor);

export function readVehicleEnvironment(actor) {
  const s = raw(actor)?.flags?.swse?.vehicleEnvironment?.state;
  return STATES.has(s) ? s : VEHICLE_ENVIRONMENT.UNKNOWN;
}

/** GM-only environment change with an audit trail. Returns { ok, update } or { ok:false, reasons }. */
export function planEnvironmentChange(actor, { state, user, reason = '', at = null } = {}) {
  if (user?.isGM !== true) return { ok: false, reasons: ['GM_REQUIRED'] };
  if (!STATES.has(state) && state !== VEHICLE_ENVIRONMENT.UNKNOWN) return { ok: false, reasons: ['ENVIRONMENT_STATE_INVALID'] };
  const prior = raw(actor)?.flags?.swse?.vehicleEnvironment ?? {};
  const entry = { state, setBy: user.id ?? null, reason: String(reason ?? ''), at };
  return { ok: true, update: { [VEHICLE_ENVIRONMENT_FLAG_PATH]: { state, setBy: entry.setBy, at, history: [...(prior.history ?? []), entry].slice(-20) } } };
}

/** Core Table 10-1 size modifier (Colossal and its subtypes -10). Unknown size -> null. */
export function vehicleSizeModifier(size) {
  const s = String(size ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('colossal')) return -10;
  const table = { gargantuan: -5, huge: -2, large: -1, medium: 0, small: 0, tiny: 0, diminutive: 0, fine: 0 };
  return Object.prototype.hasOwnProperty.call(table, s) ? table[s] : null;
}

const abilityMod = score => Math.floor((score - 10) / 2);

function vehicleDexterity(actor) {
  const record = getVerifiedPublishedRecord(actor);
  if (record) {
    const eff = getEffectiveVehicleDerived(actor);
    return finite(record.abilities?.dex) ? { modifier: abilityMod(record.abilities.dex) + (eff?.pilotDexModifierDelta ?? 0), installedDelta: eff?.pilotDexModifierDelta ?? 0, basis: 'PUBLISHED_PLUS_CERTIFIED' } : null;
  }
  const d = raw(actor)?.system?.attributes?.dex;
  const score = finite(d?.base) ? d.base + (finite(d.racial) ? d.racial : 0) + (finite(d.temp) ? d.temp : 0) : null;
  return finite(score) ? { modifier: abilityMod(score), installedDelta: 0, basis: 'ACTOR_ATTRIBUTES' } : null;
}

/**
 * The vehicle side of a Pilot check.
 * @returns {{ok:boolean, mode:'CREW_ACTOR'|'GENERIC_CREW', modifier:number|null, breakdown:object[], reasons:string[]}}
 */
export function vehiclePilotCheck(vehicle, { pilotActor = null } = {}) {
  const r = raw(vehicle);
  const record = getVerifiedPublishedRecord(vehicle);
  const reasons = [], breakdown = [];
  if (pilotActor) {
    const size = vehicleSizeModifier(record?.classification?.printedSize ?? r?.system?.size);
    const dex = vehicleDexterity(vehicle);
    if (size === null) reasons.push('VEHICLE_SIZE_UNKNOWN'); else breakdown.push({ label: 'Vehicle size modifier', value: size, source: 'Core Table 10-1' });
    if (!dex) reasons.push('VEHICLE_DEXTERITY_UNKNOWN'); else breakdown.push({ label: 'Vehicle Dexterity modifier', value: dex.modifier, basis: dex.basis, installedDelta: dex.installedDelta });
    return { ok: reasons.length === 0, mode: 'CREW_ACTOR', modifier: reasons.length ? null : size + dex.modifier, breakdown, reasons };
  }
  const printed = (record?.abilities?.skills ?? []).find(s => /^pilot$/i.test(String(s.name ?? '')))?.printedModifier;
  if (!finite(printed)) return { ok: false, mode: 'GENERIC_CREW', modifier: null, breakdown, reasons: ['PRINTED_PILOT_MODIFIER_UNKNOWN'] };
  const delta = getEffectiveVehicleDerived(vehicle)?.pilotDexModifierDelta ?? 0;
  breakdown.push({ label: 'Printed Pilot (generic crew)', value: printed, source: `${record.publication.book} p. ${record.publication.page}` });
  if (delta) breakdown.push({ label: 'Certified installations (Dexterity modifier)', value: delta });
  return { ok: true, mode: 'GENERIC_CREW', modifier: printed + delta, breakdown, reasons };
}
