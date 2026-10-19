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
 *   - Occupancy evidence is never discarded (WP2-C1). A malformed record or a natural/integrated-classified Item that still names appendages
 *     is fed to the SAME E3-A2 resolver as a non-certifying PROBE: it can only turn a positive result for another weapon into `indeterminate`
 *     (an uncertain collision), never into a certified one, and the probe's own row is never used to certify it. A claim that cannot even be read
 *     (a malformed record whose appendage list is unreadable) makes the actor's occupancy `incomplete`, and then no EQUIPPED/READIED is certified.
 *     Established collisions (two valid ordinary records) remain the resolver's `blocked`; this module re-implements no conflict rule.
 *   - A biological actor without authoritative species evidence (`deps.resolveSpeciesProfile`) never gets a positive posture from the resolver's
 *     provisional default arms (gate `species-evidence-unavailable`).
 *   - Unresolved coordinator transactions (the transaction journal) withhold every posture of the Items they cover until FINALIZED or
 *     NOT_APPLIED; an unreadable journal withholds all positive readiness. Absent weapon records carry no claim (they are `undeclared`).
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
import { readFireState, ownedConfigurationSelection } from '/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js';
import { readJournal, unresolvedItemIds, JOURNAL_STATUS } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js';

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
  if (deps.overlay !== undefined && !isPlain(deps.overlay)) throw new EquipmentStateInputError('INVALID_DEPS', 'deps.overlay must be an object keyed by item id');
  if (deps.evaluatePendingTransactions !== undefined && typeof deps.evaluatePendingTransactions !== 'boolean') throw new EquipmentStateInputError('INVALID_DEPS', 'deps.evaluatePendingTransactions must be a boolean');
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

const OCCUPANCY_PURPOSES = ['hold', 'wield'];

/** The system data the reader evaluates: the Item's own data, with an optional hypothetical overlay (planning only; never persisted). */
const systemOf = (item, overlay) => {
  const base = item.system ?? {};
  const o = overlay?.[item.id]?.system;
  return isPlain(o) ? { ...base, ...o } : base;
};

/**
 * What a record CLAIMS about appendages, read without trusting its validity. `readable: false` means the claim cannot be established at all.
 * Absent records claim nothing. Pure data inspection: no judgement about legality (that is the E3-A2 resolver's job).
 */
function claimOf(system) {
  const occ = system?.weaponOccupancy;
  if (!isPlain(occ) || !Array.isArray(occ.appendageIds)) return { readable: false, appendageIds: [], purpose: 'hold' };
  const ids = [];
  let readable = true;
  for (const id of occ.appendageIds) {
    if (typeof id === 'string' && id.trim().length > 0) { if (!ids.includes(id)) ids.push(id); } else readable = false;
  }
  return { readable, appendageIds: ids, purpose: OCCUPANCY_PURPOSES.includes(occ.purpose) ? occ.purpose : 'hold' };
}

/**
 * @param {object} actor an Actor (or Actor-like object: `{ id, type, system, items, flags }`); never mutated
 * @param {object} [deps] evidence adapters (all optional, all synchronous, all read-only):
 *   resolveSpeciesProfile(actor) -> the SELECTED effective species publication profile | undefined (see species-evidence-adapter.js)
 *   getFunctionalOverrides(actor) -> { [appendageId]: state } | undefined
 *   getInstalledComponents(actor) -> { components: [] } | undefined (droids)
 *   shapeOfWeapon(item) / readFireState(item) -> test seams; default to the canonical weapon runtime and FireStateStore
 *   overlay -> { [itemId]: { system?: {weaponPosture, weaponOccupancy}, fireState?: {...} } } hypothetical record/grip values (planning only)
 *   evaluatePendingTransactions -> default true; false only while PLANNING a hypothetical configuration
 * @returns {{actorId:string|null, actorType:string, wielderSize:string|null, anatomy:object, speciesPermissions:object, occupancy:object, grip:object,
 *   occupancyEvidence:object, transactions:object, weapons:object[], conflicts:object[], summary:object, issues:object[]}}
 *   deterministic, independently owned, deeply frozen
 * @throws {EquipmentStateInputError} for malformed API input; incomplete evidence is reported, never thrown
 */
export function readActorEquipmentState(actor, deps) {
  if (!actor || typeof actor !== 'object') throw new EquipmentStateInputError('INVALID_ACTOR', 'actor must be an Actor-like object');
  const d = readDeps(deps);
  const overlay = d.overlay;
  // the shape is the weapon's CURRENT owned configuration (it can change the required hands), so a configuration change is re-verified on every read
  const shapeFor = d.shapeOfWeapon ?? ((item) => shapeOfWeapon(item, ownedConfigurationSelection(item)));
  const baseFireState = d.readFireState ?? readFireState;
  const fireStateOf = (item) => {
    const own = baseFireState(item);
    const o = overlay?.[item.id]?.fireState;
    return isPlain(o) ? { ...(isPlain(own) ? own : {}), ...o } : own;
  };
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

  // ---- per-Item record, pending classification, ordinary assignments and non-certifying probes ----
  const rows = weaponItems.map((item) => {
    const system = systemOf(item, overlay);
    return { item, system, record: validateWeaponRecord(system), pending: pendingKindOf(item) };
  });
  const assignments = [];
  const probes = [];
  const unreadableClaims = [];
  for (const r of rows) {
    const valid = r.record.status === WEAPON_RECORD_STATUS.VALID;
    if (r.record.status === WEAPON_RECORD_STATUS.ABSENT) continue; // no record = no claim (the weapon is `undeclared`)
    if (valid && r.record.occupancy.purpose === null) continue; // an explicit STOWED record claims nothing
    if (valid && !r.pending) {
      assignments.push({ itemId: r.item.id, purpose: r.record.occupancy.purpose, appendageIds: [...r.record.occupancy.appendageIds] });
      continue;
    }
    const claim = claimOf(r.system);
    if (!claim.readable) unreadableClaims.push(r.item.id);
    if (claim.appendageIds.length) probes.push({ itemId: r.item.id, source: r.pending ? 'pending-identity' : 'invalid-record', purposeProbe: claim.purpose, appendageIds: claim.appendageIds });
  }

  const occupancy = resolvePhysicalOccupancy({ anatomy, speciesPermissions, assignments });

  // uncertain collisions: the SAME E3-A2 resolver, run with the probes added; only conflicts that involve a probe are read from it
  const uncertainCollisions = [];
  if (probes.length) {
    const probeIds = new Set(probes.map((p) => p.itemId));
    const withProbes = resolvePhysicalOccupancy({ anatomy, speciesPermissions, assignments: [...assignments, ...probes.map((p) => ({ itemId: p.itemId, purpose: p.purposeProbe, appendageIds: p.appendageIds }))] });
    for (const c of withProbes.conflicts) {
      const [a, b] = c.itemIds;
      if (probeIds.has(a) === probeIds.has(b)) continue;
      uncertainCollisions.push({ itemId: probeIds.has(a) ? b : a, probeItemId: probeIds.has(a) ? a : b, appendageId: c.appendageId });
    }
  }
  const occupancyEvidence = {
    completeness: unreadableClaims.length ? 'incomplete' : 'complete',
    unreadableClaims: [...unreadableClaims].sort(),
    probes: probes.map((p) => ({ itemId: p.itemId, source: p.source, purposeProbe: p.purposeProbe, appendageIds: [...p.appendageIds] })),
    uncertainCollisions,
  };

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

  // ---- transaction journal (operational evidence, not a posture source) ----
  const evaluateTxn = d.evaluatePendingTransactions !== false;
  const journal = readJournal(actor.flags?.swse?.equipmentTxn);
  const withheld = evaluateTxn && journal.status === JOURNAL_STATUS.VALID ? unresolvedItemIds(journal.entries) : new Map();
  const transactions = {
    journalStatus: journal.status,
    evaluated: evaluateTxn,
    unresolved: [...withheld.entries()].map(([itemId, list]) => ({ itemId, transactions: list })).sort((x, y) => (x.itemId < y.itemId ? -1 : 1)),
  };

  // ---- effective posture per weapon ----
  const weapons = rows.map((r) => {
    const itemId = r.item.id;
    const base = { itemId, record: { status: r.record.status, posture: r.record.posture, occupancy: r.record.occupancy, issues: r.record.issues }, pending: null, gates: [] };
    if (r.pending) {
      const itemIssues = [];
      if (probes.some((p) => p.itemId === itemId)) itemIssues.push(issue('pending-identity-item-has-occupancy-record', 'warning', 'A natural or integrated weapon carries an occupancy claim. It is not used to certify it, and it is not treated as zero-hand occupancy: the claim is kept as a probe that can only withhold readiness from other weapons.', { itemId }));
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

  // a biological actor with no authoritative species evidence has no certified anatomy: the resolver's provisional default arms must never
  // establish a held or ready posture. (Droid anatomy comes from installed components, which are certified separately and stay deferred.)
  const speciesEvidenceMissing = !speciesProfile && actor.type !== 'droid';

  // ---- fail-closed gates: an unresolved transaction withholds every posture; incomplete or uncertain occupancy withholds positive readiness ----
  for (const w of weapons) {
    const positive = w.effectivePosture === 'EQUIPPED' || w.effectivePosture === 'READIED';
    const gates = [];
    const txns = withheld.get(w.itemId);
    if (txns) gates.push({ code: 'unresolved-equipment-transaction', details: { transactions: txns } });
    if (evaluateTxn && journal.status === JOURNAL_STATUS.INVALID && positive) gates.push({ code: 'equipment-journal-unreadable', details: { issues: journal.issues } });
    if (positive && occupancyEvidence.completeness === 'incomplete') gates.push({ code: 'occupancy-completeness-unestablished', details: { unreadableClaims: occupancyEvidence.unreadableClaims } });
    if (positive && speciesEvidenceMissing) gates.push({ code: 'species-evidence-unavailable', details: { actorType: typeof actor.type === 'string' ? actor.type : '' } });
    const collisions = uncertainCollisions.filter((c) => c.itemId === w.itemId);
    if (positive && collisions.length) gates.push({ code: 'uncertain-occupancy-collision', details: { collisions } });
    if (!gates.length) continue;
    w.gates = gates;
    w.status = EFFECTIVE_POSTURE_STATUS.INDETERMINATE;
    w.effectivePosture = null;
    w.issues = [...w.issues, ...gates.map((g) => issue(g.code, 'warning', 'Readiness is withheld: the evidence needed to certify this weapon is unresolved, so it fails closed.', { itemId: w.itemId, ...g.details }))];
  }

  const count = (st) => weapons.filter((w) => w.status === st).length;
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
    withheld: weapons.filter((w) => w.gates.length).map((w) => w.itemId),
  };
  if (!speciesProfile) issues.push(issue('species-profile-not-supplied', 'warning', 'No effective species profile adapter result was supplied; anatomy and species permissions are evaluated without it and nothing is certified beyond that evidence.'));
  if (occupancy.conflicts.length) issues.push(issue('cross-item-appendage-conflicts', 'blocking', 'Several weapons claim the same appendage or physical slot; nothing is displaced or reassigned.', { appendageIds: occupancy.conflicts.map((c) => c.appendageId).sort() }));
  if (occupancyEvidence.completeness === 'incomplete') issues.push(issue('occupancy-completeness-unestablished', 'blocking', 'At least one weapon record claims appendages in a way that cannot be read; occupancy is incomplete, so no EQUIPPED or READIED posture is certified.', { itemIds: occupancyEvidence.unreadableClaims }));
  if (uncertainCollisions.length) issues.push(issue('uncertain-occupancy-collisions', 'warning', 'A malformed or identity-uncertified weapon still claims an appendage that another weapon uses; the claim is kept as evidence and withholds that weapon\'s readiness.', { collisions: uncertainCollisions }));
  if (evaluateTxn && journal.status === JOURNAL_STATUS.INVALID) issues.push(issue('equipment-journal-unreadable', 'blocking', 'The equipment transaction journal is malformed; positive readiness is withheld.', { issues: journal.issues }));

  return deepFreeze(clone({
    actorId: nonEmpty(actor.id) ? actor.id : null,
    actorType: typeof actor.type === 'string' ? actor.type : '',
    wielderSize,
    anatomy,
    speciesPermissions,
    occupancy,
    grip,
    occupancyEvidence,
    transactions,
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
