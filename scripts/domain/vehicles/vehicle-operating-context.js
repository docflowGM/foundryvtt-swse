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
/**
 * Equipment bonuses a certified installation (or the hull's printed equipment) grants to ONE kind of check:
 * { skill, use?, purpose?, allOutMovement? } -> { total, sources }. Same-check equipment bonuses do not stack (the
 * effective-statistics resolver already keeps the highest). Not a Pilot/Dex calculation: those stay in vehiclePilotCheck.
 */
export function vehicleSkillEquipmentBonus(vehicle, { skill, use = null, purpose = null, allOutMovement = false } = {}) {
  const eff = getEffectiveVehicleDerived(vehicle);
  const out = { total: 0, sources: [] };
  for (const b of eff?.skillBonuses ?? []) {
    if (b.skill !== skill) continue;
    if (b.use && b.use !== use) continue;
    if (b.purpose && b.purpose !== purpose) continue;
    const value = allOutMovement && finite(b.allOutValue) ? b.allOutValue : b.value;
    out.total += value; out.sources.push({ name: b.sources?.map(x => x.name).join(', '), value });
  }
  return out;
}

export function vehiclePilotCheck(vehicle, { pilotActor = null, purpose = null, allOutMovement = false } = {}) {
  const base = basePilotCheck(vehicle, { pilotActor });
  if (!base.ok || purpose === null) return base;
  // SLAM: +5 on Pilot checks to increase speed (+10 for all-out movement)
  const eq = vehicleSkillEquipmentBonus(vehicle, { skill: 'pilot', purpose, allOutMovement });
  if (!eq.total) return base;
  return { ...base, modifier: base.modifier + eq.total, breakdown: [...base.breakdown, ...eq.sources.map(x => ({ label: `Equipment: ${x.name}`, value: x.value, purpose }))] };
}

function basePilotCheck(vehicle, { pilotActor = null } = {}) {
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

/**
 * The pilot station assignment, distinguishing "nobody assigned" from "assigned but unresolvable".
 * @returns {{assigned:false}|{assigned:true, uuid:string|null}}
 */
export function assignedPilotEntry(vehicle) {
  const e = raw(vehicle)?.system?.crewPositions?.pilot;
  if (e === undefined || e === null || e === '' || (typeof e === 'object' && !Object.keys(e).length)) return { assigned: false };
  const uuid = typeof e === 'string' ? e : (e.uuid ?? null);
  return { assigned: true, uuid: typeof uuid === 'string' && uuid.trim() ? uuid.trim() : null };
}

const isActorDocument = d => d && (d.documentName === 'Actor' || (d.system !== undefined && d.items !== undefined && typeof d.type === 'string'));
const canRoll = (doc, user) => user?.isGM === true || doc?.isOwner === true || (typeof doc?.testUserPermission === 'function' && doc.testUserPermission(user, 'OWNER') === true);

/**
 * Decide who rolls a vehicle Pilot check. Pure: the caller resolves the UUID.
 *   - assigned pilot -> must resolve to a character-type Actor (never the vehicle itself) the user may roll for,
 *     otherwise ASSIGNED_PILOT_UNAVAILABLE / PILOT_ROLL_NOT_AUTHORIZED. There is NO fallback to generic crew.
 *   - nobody assigned -> generic crew, which the vehicle's owner (or a GM) may roll.
 * @param {{vehicle:object, resolved:object|null, user:object, explicitPilot?:object|null}} p
 */
export function decidePilotRoller({ vehicle, resolved = null, user, explicitPilot = null }) {
  const entry = assignedPilotEntry(vehicle);
  const candidate = explicitPilot ?? (entry.assigned ? resolved : null);
  if (explicitPilot || entry.assigned) {
    if (!explicitPilot && !entry.uuid) return { ok: false, reasons: ['ASSIGNED_PILOT_UNAVAILABLE'], detail: 'assignment has no UUID' };
    if (!isActorDocument(candidate) || candidate.type === 'vehicle' || (vehicle?.id && candidate.id === vehicle.id)) return { ok: false, reasons: ['ASSIGNED_PILOT_UNAVAILABLE'], detail: 'assignment did not resolve to a character Actor' };
    if (!canRoll(candidate, user)) return { ok: false, reasons: ['PILOT_ROLL_NOT_AUTHORIZED'] };
    return { ok: true, mode: 'CREW_ACTOR', pilotActor: candidate };
  }
  if (!canRoll(vehicle, user)) return { ok: false, reasons: ['GENERIC_CREW_ROLL_NOT_AUTHORIZED'] };
  return { ok: true, mode: 'GENERIC_CREW', pilotActor: null };
}
