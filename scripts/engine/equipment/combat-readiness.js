/**
 * Combat readiness -- the ONE interface combat, reaction, effect and selection code uses to ask "is this weapon ready?" (E4-C1 WP5).
 *
 * It owns no rule and no state. It composes the existing authorities per call:
 *   species evidence   resolveActorSpeciesProfile()   live, synchronous read of the SpeciesRegistry authority (fails closed when unavailable)
 *   equipment state    readActorEquipmentState()      persisted record + FireStateStore grip choice -> anatomy -> species permissions ->
 *                                                     physical occupancy -> canonical grip -> effective posture, plus the pending-transaction,
 *                                                     incomplete-occupancy and species-evidence gates
 *   activation         isItemActivated()              independent of posture
 *
 * Nothing is cached or prepared ahead: every call re-reads the live actor and registry, so a result can never outlive a change to equipment,
 * anatomy, grip or species. Synchronous callers therefore get the same answer as asynchronous ones, and there is no hidden fallback to a legacy
 * `equipped` flag, an `isOffhand` marker, an activation flag, a weapon name or a default anatomy.
 *
 * A weapon is READY (`ready: true`) only when ALL hold: it is an ordinary Item whose identity is not pending (natural and integrated weapons
 * stay pending until their identity is certified), its effective posture is READIED, and no gate withholds it (unresolved transaction,
 * incomplete or uncertain occupancy, unavailable species evidence). Whether an attack is then legal is decided by the applicable existing
 * combat rules, not here.
 */
import { readActorEquipmentState } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-reader.js';
import { resolveActorSpeciesProfile } from '/systems/foundryvtt-swse/scripts/engine/equipment/species-evidence-adapter.js';
import { isItemActivated } from '/systems/foundryvtt-swse/scripts/engine/inventory/item-activation-state.js';

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const itemList = (actor) => (Array.isArray(actor?.items) ? actor.items : actor?.items && typeof actor.items[Symbol.iterator] === 'function' ? Array.from(actor.items) : []);

/**
 * Live equipment readiness of an actor.
 * @param {object} actor Actor-like (read only)
 * @param {{resolveSpecies?:Function, reader?:object}} [deps] test seams; defaults are the production authorities
 * @returns {{actorId:string|null, speciesEvidence:{status:string, reason:string|null}, state:object}} deep-frozen by the reader
 */
export function readCombatReadiness(actor, deps = {}) {
  if (!actor || typeof actor !== 'object') return Object.freeze({ actorId: null, speciesEvidence: Object.freeze({ status: 'unavailable', reason: 'no-actor' }), state: null });
  const species = (deps.resolveSpecies ?? resolveActorSpeciesProfile)(actor);
  const state = readActorEquipmentState(actor, {
    ...(isPlain(deps.reader) ? deps.reader : {}),
    ...(species?.status === 'resolved' ? { resolveSpeciesProfile: () => species.profile } : {}),
  });
  return Object.freeze({ actorId: state.actorId, speciesEvidence: Object.freeze({ status: species?.status ?? 'unavailable', reason: species?.reason ?? null }), state });
}

/** The separate facts about one weapon (declared, verified, occupancy, grip, activation, identity, gates). `ready` is their conjunction. */
export function describeWeaponReadiness(readiness, itemId, item = null) {
  const entry = readiness?.state?.weapons?.find((w) => w.itemId === itemId) ?? null;
  if (!entry) return null;
  const assignment = readiness.state.occupancy.assignments.find((a) => a.itemId === itemId) ?? null;
  const gripAssessment = readiness.state.grip.assessments.find((a) => a.itemId === itemId) ?? null;
  const ready = entry.effectivePosture === 'READIED' && !entry.pending && entry.gates.length === 0;
  return Object.freeze({
    itemId,
    declaredPosture: entry.record.status === 'valid' ? entry.record.posture : null,
    recordStatus: entry.record.status,
    effectivePosture: entry.effectivePosture,
    status: entry.status,
    occupancy: assignment ? Object.freeze({ status: assignment.status, purpose: assignment.purpose, appendageIds: Object.freeze([...assignment.appendageIds]) }) : null,
    grip: gripAssessment ? Object.freeze({ status: gripAssessment.status, requiredHands: gripAssessment.requiredHands ?? null }) : null,
    activation: Object.freeze({ activated: item ? isItemActivated(item) === true : null, independentOfPosture: true }),
    pending: entry.pending,
    gates: Object.freeze(entry.gates.map((g) => g.code)),
    speciesEvidence: readiness.speciesEvidence.status,
    ready,
  });
}

/** Readiness description of one weapon (an Item or an id), or `null` when the actor has no such weapon. */
export function getWeaponReadiness(actor, itemOrId, deps = {}) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  if (!id) return null;
  const item = itemList(actor).find((i) => i?.id === id) ?? null;
  return describeWeaponReadiness(readCombatReadiness(actor, deps), id, item);
}

/** True only for a weapon whose READIED posture is verified and ungated. EQUIPPED, activated, flagged or merely declared weapons are not ready. */
export function isWeaponReadied(actor, itemOrId, deps = {}) {
  return getWeaponReadiness(actor, itemOrId, deps)?.ready === true;
}

/**
 * True when the weapon is VERIFIED held (effective EQUIPPED or READIED, ungated). A held weapon is not necessarily ready; this answers the physical
 * question ("is it in hand?") for preconditions and visuals such as igniting a blade, while combat code asks isWeaponReadied().
 */
export function isWeaponHeld(actor, itemOrId, deps = {}) {
  const r = getWeaponReadiness(actor, itemOrId, deps);
  return !!r && !r.pending && r.gates.length === 0 && (r.effectivePosture === 'EQUIPPED' || r.effectivePosture === 'READIED');
}

/** The actor's READY weapon Items, in stable id order. Never ordered, filtered or guessed from legacy markers. */
export function getReadiedWeapons(actor, deps = {}) {
  const readiness = readCombatReadiness(actor, deps);
  if (!readiness.state) return [];
  const items = itemList(actor);
  return readiness.state.weapons
    .filter((w) => describeWeaponReadiness(readiness, w.itemId)?.ready === true)
    .map((w) => items.find((i) => i?.id === w.itemId))
    .filter(Boolean);
}

/** Readiness descriptions of every weapon the actor owns (for presentation layers). */
export function listWeaponReadiness(actor, deps = {}) {
  const readiness = readCombatReadiness(actor, deps);
  if (!readiness.state) return [];
  const items = itemList(actor);
  return readiness.state.weapons.map((w) => describeWeaponReadiness(readiness, w.itemId, items.find((i) => i?.id === w.itemId) ?? null));
}

/** Id of the virtual unarmed strike produced by the unarmed attack helper. */
export const VIRTUAL_UNARMED_ID = 'swse-virtual-unarmed';

/**
 * The owner-approved unarmed-strike exception. An unarmed strike is a VIRTUAL ATTACK SOURCE, not a weapon Item: it needs no posture, occupancy or
 * grip record. The exception is narrow and explicit: the object must carry the helper's virtual+unarmed markers AND must not be (or share an id
 * with) any Item the actor owns, so a persisted Item can never claim it by carrying flags. The source authorizes nothing else: damage, Martial Arts,
 * proficiency, reaction and style effects, and the prerequisites of every maneuver (grapple, trip, ...) keep their own rules.
 */
export function isVirtualUnarmedAttack(actor, weapon) {
  const f = weapon?.flags?.swse;
  if (!(f?.virtual === true && f?.unarmed === true)) return false;
  if (typeof weapon.id !== 'string' || !weapon.id) return false;
  return !itemList(actor).some((i) => i === weapon || i?.id === weapon.id);
}

/** Whether a weapon (an owned Item or the virtual unarmed strike) may act as a ready attack source. */
export function isCombatSourceReady(actor, weapon, deps = {}) {
  return isVirtualUnarmedAttack(actor, weapon) || isWeaponReadied(actor, weapon, deps);
}

export default { readCombatReadiness, describeWeaponReadiness, getWeaponReadiness, isWeaponReadied, isWeaponHeld, getReadiedWeapons, listWeaponReadiness, isVirtualUnarmedAttack, isCombatSourceReady, VIRTUAL_UNARMED_ID };
