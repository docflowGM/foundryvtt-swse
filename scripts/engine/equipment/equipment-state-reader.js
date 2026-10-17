/**
 * Equipment state reader (E4-C1 WP2) -- READ ONLY.
 *
 * The one document-reading layer for weapon equipment state. It turns an Actor and its owned weapon Items into plain evidence, feeds the
 * established E3 resolvers, and reports what is and is not established. It creates no rule and no second authority:
 *
 *   persisted record        validateWeaponRecord()                 (weapon-record-invariants.js: `weaponPosture` + `weaponOccupancy`)
 *   anatomy / permissions   resolveEffectiveAnatomy(), resolveSpeciesEquipmentPermissions()
 *   physical occupancy      resolvePhysicalOccupancy()             (cross-Item appendage conflicts are detected here, never re-implemented)
 *   weapon grip             resolveEquipmentGrips()                (canonical shape from the weapon runtime; grip choice from the FireStateStore record)
 *   effective posture       resolveEffectiveEquipmentPosture()     (declared posture is never verified readiness)
 *
 * Guarantees:
 *   - Reads only `weaponPosture`/`weaponOccupancy`, the FireStateStore record (`flags.swse.fireState`), `system.activated` (activation evidence,
 *     independent of posture) and canonical weapon identity. Legacy `equipped`, `dualWielded` and `wieldedTwoHanded` never establish posture or
 *     grip. No hand assignment is invented, chosen, repaired or defaulted; an absent record is `undeclared`, a malformed one `contradictory`.
 *   - Natural and integrated weapons have no certified Item identity yet (the binding verifier is a later work package, the droid refactor is
 *     deferred): they stay pending and are never established, whatever their flags say. Flags are used only to classify an Item as PENDING
 *     (more restrictive), never to grant anything.
 *   - A species profile, functional overrides and installed components are evidence the CALLER's adapter supplies through `deps`; when absent the
 *     anatomy resolver reports the incompleteness and nothing is certified. This module never recovers a species from a name.
 *   - Never mutates a document, writes a flag, spends an action or reads names/descriptions. The result is deterministic (Items ordered by
 *     id), independently owned and deeply frozen.
 */
import { validateWeaponRecord, WEAPON_RECORD_STATUS } from '/systems/foundryvtt-swse/scripts/engine/equipment/weapon-record-invariants.js';
import { resolveEffectiveAnatomy } from '/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js';
import { resolveSpeciesEquipmentPermissions } from '/systems/foundryvtt-swse/scripts/engine/equipment/species-equipment-permissions.js';
import { resolvePhysicalOccupancy } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-capability-resolver.js';
import { resolveEquipmentGrips } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-grip-resolver.js';
import { resolveEffectiveEquipmentPosture, EFFECTIVE_POSTURE_STATUS } from '/systems/foundryvtt-swse/scripts/engine/equipment/effective-equipment-posture.js';
import { shapeOfWeapon } from '/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js';
import { readFireState } from '/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js';

/** Codes: INVALID_ACTOR, INVALID_ITEMS, INVALID_ITEM, DUPLICATE_ITEM_ID, INVALID_DEPS. */
export class EquipmentStateInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'EquipmentStateInputError';
    this.code = code;
  }
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function readDeps(deps) {
  if (deps === undefined || deps === null) return {};
  if (!isPlain(deps)) throw new EquipmentStateInputError('INVALID_DEPS', 'deps must be an object');
  for (const key of ['resolveSpeciesProfile', 'getFunctionalOverrides', 'getInstalledComponents', 'shapeOfWeapon', 'readFireState']) {
    if (deps[key] !== undefined && typeof deps[key] !== 'function') throw new EquipmentStateInputError('INVALID_DEPS', `deps.${key} must be a function`);
  }
  return deps;
}

function readWeapons(actor) {
  const rawItems = actor.items;
  if (rawItems === undefined || rawItems === null) return [];
  const list = Array.isArray(rawItems) ? rawItems : typeof rawItems[Symbol.iterator] === 'function' ? Array.from(rawItems) : null;
  if (!list) throw new EquipmentStateInputError('INVALID_ITEMS', 'actor.items must be an array or an iterable collection');
  const seen = new Set();
  const weapons = [];
  list.forEach((item, i) => {
    if (!isPlain(item) && !(item && typeof item === 'object')) throw new EquipmentStateInputError('INVALID_ITEM', `actor.items[${i}] must be an Item-like object`);
    if (item.type !== 'weapon') return;
    if (!nonEmpty(item.id)) throw new EquipmentStateInputError('INVALID_ITEM', `weapon actor.items[${i}] has no id`);
    if (seen.has(item.id)) throw new EquipmentStateInputError('DUPLICATE_ITEM_ID', `weapon id "${item.id}" appears twice`);
    seen.add(item.id);
    weapons.push(item);
  });
  return weapons.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Pending classification can only RESTRICT: it withholds readiness from Items whose certified identity does not exist yet. */
function pendingKindOf(item) {
  const sys = item.system ?? {};
  const swse = item.flags?.swse ?? {};
  if (sys.integrated === true) return 'integrated-droid-weapon';
  if (swse.isNaturalWeapon === true || swse.alwaysArmed === true || sys.source === 'species-natural-weapon') return 'natural-weapon';
  return null;
}

const activationOf = (item) => {
  const v = item.system?.activated;
  if (v === true) return { state: 'activated' };
  if (v === false) return { state: 'inactive' };
  return undefined;
};

/**
 * @param {object} actor an Actor (or Actor-like object: `{ id, type, system, items }`); never mutated
 * @param {object} [deps] evidence adapters (all optional, all synchronous, all read-only):
 *   resolveSpeciesProfile(actor) -> the SELECTED effective species publication profile | undefined
 *   getFunctionalOverrides(actor) -> { [appendageId]: state } | undefined
 *   getInstalledComponents(actor) -> { components: [] } | undefined (droids)
 *   shapeOfWeapon(item) / readFireState(item) -> test seams; default to the canonical weapon runtime and FireStateStore
 * @returns {{actorId:string|null, actorType:string, wielderSize:string|null, anatomy:object, speciesPermissions:object, occupancy:object, grip:object,
 *   weapons:object[], conflicts:object[], summary:object, issues:object[]}} deterministic, independently owned, deeply frozen
 * @throws {EquipmentStateInputError} for malformed API input; incomplete evidence is reported, never thrown
 */
export function readActorEquipmentState(actor, deps) {
  if (!actor || typeof actor !== 'object') throw new EquipmentStateInputError('INVALID_ACTOR', 'actor must be an Actor-like object');
  const d = readDeps(deps);
  const shapeFor = d.shapeOfWeapon ?? ((item) => shapeOfWeapon(item, {}));
  const fireStateOf = d.readFireState ?? readFireState;
  const weaponItems = readWeapons(actor);
  const issues = [];

  const speciesProfile = d.resolveSpeciesProfile ? d.resolveSpeciesProfile(actor) : undefined;
  const anatomy = resolveEffectiveAnatomy({
    actorType: typeof actor.type === 'string' ? actor.type : undefined,
    ...(speciesProfile ? { speciesProfile } : {}),
    ...(d.getInstalledComponents ? (() => { const ic = d.getInstalledComponents(actor); return ic ? { installedComponents: ic } : {}; })() : {}),
    ...(d.getFunctionalOverrides ? (() => { const fo = d.getFunctionalOverrides(actor); return fo ? { functionalOverrides: fo } : {}; })() : {}),
  });
  const speciesPermissions = resolveSpeciesEquipmentPermissions(speciesProfile ?? {});

  // ---- per-Item record, pending classification and the assignments that may enter the occupancy resolver ----
  const rows = weaponItems.map((item) => {
    const record = validateWeaponRecord(item.system ?? {});
    const pending = pendingKindOf(item);
    return { item, record, pending };
  });
  const assignments = [];
  for (const r of rows) {
    if (r.record.status !== WEAPON_RECORD_STATUS.VALID || r.record.occupancy.purpose === null) continue;
    if (r.pending) { r.pendingHeldRecord = true; continue; } // invariant 7: natural/integrated weapons carry no ordinary occupancy
    assignments.push({ itemId: r.item.id, purpose: r.record.occupancy.purpose, appendageIds: [...r.record.occupancy.appendageIds] });
  }

  const occupancy = resolvePhysicalOccupancy({ anatomy, speciesPermissions, assignments });

  const assigned = new Map(assignments.map((a) => [a.itemId, a]));
  const gripFacts = [];
  for (const r of rows) {
    if (!assigned.has(r.item.id)) continue;
    const shape = shapeFor(r.item);
    if (!isPlain(shape) || !isPlain(shape.wielding)) continue; // legacy/unmapped/error shape: the grip resolver reports weapon-facts-missing
    const owned = fireStateOf(r.item);
    gripFacts.push({ itemId: r.item.id, shape, ...(isPlain(owned) ? { ownedState: clone(owned) } : {}) });
  }
  const wielderSize = typeof actor.system?.size === 'string' ? actor.system.size : typeof actor.system?.details?.size === 'string' ? actor.system.details.size : null;
  const grip = resolveEquipmentGrips({ occupancy, wielderSize, speciesPermissions, weapons: gripFacts });

  // ---- effective posture per weapon ----
  const weapons = rows.map((r) => {
    const itemId = r.item.id;
    const base = { itemId, record: { status: r.record.status, posture: r.record.posture, occupancy: r.record.occupancy, issues: r.record.issues }, pending: null };
    if (r.pending) {
      const itemIssues = [];
      if (r.pendingHeldRecord) itemIssues.push(issue('pending-identity-item-has-occupancy-record', 'warning', 'A natural or integrated weapon carries an ordinary occupancy record; it is not used (these weapons hold no ordinary appendage).', { itemId }));
      if (r.pending === 'integrated-droid-weapon') {
        const effective = resolveEffectiveEquipmentPosture({ itemId, occupancy, grip, exception: { claim: 'integrated-droid-weapon' } });
        return { ...base, pending: { kind: r.pending, reason: 'droid-installation-identity-not-certified' }, effective, status: effective.status, effectivePosture: null, issues: [...itemIssues] };
      }
      itemIssues.push(issue('natural-weapon-identity-uncertified', 'warning', 'No certified Item-to-species-record binding exists yet, so this Item is not established as a natural weapon and no readiness is granted.', { itemId }));
      return { ...base, pending: { kind: r.pending, reason: 'natural-weapon-item-binding-not-certified' }, effective: null, status: EFFECTIVE_POSTURE_STATUS.INDETERMINATE, effectivePosture: null, issues: itemIssues };
    }
    if (r.record.status === WEAPON_RECORD_STATUS.INVALID) {
      return { ...base, effective: null, status: EFFECTIVE_POSTURE_STATUS.CONTRADICTORY, effectivePosture: null, issues: [issue('weapon-record-invalid', 'blocking', 'The persisted weapon record is malformed; it is neither repaired nor defaulted, and no posture is established.', { itemId })] };
    }
    const effective = resolveEffectiveEquipmentPosture({
      itemId,
      ...(r.record.status === WEAPON_RECORD_STATUS.VALID ? { declaration: { posture: r.record.posture } } : {}),
      occupancy,
      grip,
      ...(activationOf(r.item) ? { activation: activationOf(r.item) } : {}),
    });
    return { ...base, effective, status: effective.status, effectivePosture: effective.effectivePosture, issues: [] };
  });

  const count = (s) => weapons.filter((w) => w.status === s).length;
  const summary = {
    weaponCount: weapons.length,
    established: count(EFFECTIVE_POSTURE_STATUS.ESTABLISHED),
    blocked: count(EFFECTIVE_POSTURE_STATUS.BLOCKED),
    indeterminate: count(EFFECTIVE_POSTURE_STATUS.INDETERMINATE),
    contradictory: count(EFFECTIVE_POSTURE_STATUS.CONTRADICTORY),
    undeclared: count(EFFECTIVE_POSTURE_STATUS.UNDECLARED),
    readied: weapons.filter((w) => w.effectivePosture === 'READIED').map((w) => w.itemId),
    equipped: weapons.filter((w) => w.effectivePosture === 'EQUIPPED').map((w) => w.itemId),
    stowed: weapons.filter((w) => w.effectivePosture === 'STOWED').map((w) => w.itemId),
  };
  if (!speciesProfile) issues.push(issue('species-profile-not-supplied', 'warning', 'No effective species profile adapter result was supplied; anatomy and species permissions are evaluated without it and nothing is certified beyond that evidence.'));
  if (occupancy.conflicts.length) issues.push(issue('cross-item-appendage-conflicts', 'blocking', 'Several weapons claim the same appendage or physical slot; nothing is displaced or reassigned.', { appendageIds: occupancy.conflicts.map((c) => c.appendageId).sort() }));

  return deepFreeze(clone({
    actorId: nonEmpty(actor.id) ? actor.id : null,
    actorType: typeof actor.type === 'string' ? actor.type : '',
    wielderSize,
    anatomy,
    speciesPermissions,
    occupancy,
    grip,
    weapons,
    conflicts: occupancy.conflicts,
    summary,
    issues,
  }));
}

/** Effective posture entry for one weapon of an actor. Unknown ids yield `null`; nothing is inferred for them. */
export function readWeaponEffectivePosture(actor, itemId, deps) {
  return readActorEquipmentState(actor, deps).weapons.find((w) => w.itemId === itemId) ?? null;
}

export default { readActorEquipmentState, readWeaponEffectivePosture, EquipmentStateInputError };
