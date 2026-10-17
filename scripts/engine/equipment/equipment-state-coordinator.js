/**
 * Equipment state coordinator -- GM-LOCAL EXECUTION FOUNDATION (E4-C1 WP3-A, NOT CONVERGED).
 *
 * The one writer of `system.weaponPosture`, `system.weaponOccupancy` and the posture-relevant grip choice (`flags.swse.fireState.wielded`).
 * Callers submit an INTENT (stow / equip / ready with EXPLICIT appendages and grip); they never submit field updates. The coordinator creates no
 * game rule: physical occupancy, grips, species permissions and effective posture come from the E3 resolvers through the equipment-state reader,
 * the draw/holster action cost from resolveActionCost(), the spend from ActionEconomyConsumption. It never stows, selects hands or reassigns a
 * weapon on its own; a conflict or a missing choice is reported and nothing is written.
 *
 * Execution authority (WP3-A): ONLY an explicitly authorized local GM execution context (GM_LOCAL_CONTEXT, with `game.user.isGM`). There is no
 * player request route, no socket handler and no fallback: without that context the outcome is NO_AUTHORITATIVE_EXECUTOR / REJECTED_NOT_GM. A
 * request carries no requester identity (unsupported fields are refused). Independent GM tabs and direct document edits remain possible sources
 * of races that this module can detect after the fact but cannot prevent; per-actor serialization is process-local.
 *
 * Pipeline (one actor at a time, FIFO): read -> resolve -> plan (hypothetical overlay through the SAME reader) -> require confirmation (the
 * caller echoes the plan digest) -> re-read and reject a changed plan (STALE_STATE) -> validate the exact field changes -> journal PREPARED ->
 * field-scoped Item update through ActorEngine -> verify persisted values -> journal APPLIED -> spend the action (existing authority, request id
 * in its metadata) -> journal FINALIZED. Readiness of the affected Items is withheld by the reader while the journal entry is unresolved, so a
 * write whose spend or finalization did not complete is never a free draw. Compensation is field-scoped, conditional (read-compare-restore, NOT an
 * atomic compare-and-swap) and never restores a path that no longer holds the planned value; ActionEconomyPersistence.undoLast() is never used.
 */
import { readActorEquipmentState } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-reader.js';
import { loadActorSpeciesProfile } from '/systems/foundryvtt-swse/scripts/engine/equipment/species-evidence-adapter.js';
import { fingerprintIntent, canonicalize } from '/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js';
import {
  readJournal, toStored, addPreparedEntry, transitionEntry, classifyTransaction, findEntry, isUnresolved, JournalError, JOURNAL_STATUS, TXN_PHASE,
} from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js';
import { validateWeaponRecord, validateWeaponRecordTransition, WEAPON_RECORD_STATUS, WEAPON_OCCUPANCY_SCHEMA_VERSION } from '/systems/foundryvtt-swse/scripts/engine/equipment/weapon-record-invariants.js';
import { EQUIPMENT_POSTURE } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-posture.js';
import { readFireState } from '/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js';

/** The explicit local GM execution context. A request is executed only when this exact object is supplied. */
export const GM_LOCAL_CONTEXT = Object.freeze({ kind: 'gm-local-execution', remote: false });
export const INTENT_TYPES = Object.freeze(['stow', 'equip', 'ready']);
export const GRIPS = Object.freeze(['one-handed', 'two-handed']);
/** Field paths the coordinator may write on a weapon Item. Nothing else is ever sent. */
export const OWNED_PATHS = Object.freeze(['system.weaponPosture', 'system.weaponOccupancy', 'flags.swse.fireState.wielded', 'flags.swse.fireState.v']);

export const OUTCOME = Object.freeze({
  COMMITTED: 'COMMITTED',
  DUPLICATE_REPLAYED: 'DUPLICATE_REPLAYED',
  DUPLICATE_UNRESOLVED: 'DUPLICATE_UNRESOLVED',
  REQUEST_ID_CONFLICT: 'REQUEST_ID_CONFLICT',
  PLANNED: 'PLANNED',
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  CHOICE_REQUIRED: 'CHOICE_REQUIRED',
  CONFLICT_UNRESOLVED: 'CONFLICT_UNRESOLVED',
  NOT_ESTABLISHED: 'NOT_ESTABLISHED',
  NO_CHANGE: 'NO_CHANGE',
  DEFERRED_RULES_REVIEW: 'DEFERRED_RULES_REVIEW',
  REJECTED_PRECONDITION: 'REJECTED_PRECONDITION',
  REJECTED_NOT_GM: 'REJECTED_NOT_GM',
  NO_AUTHORITATIVE_EXECUTOR: 'NO_AUTHORITATIVE_EXECUTOR',
  STALE_STATE: 'STALE_STATE',
  UNRESOLVED_TRANSACTION: 'UNRESOLVED_TRANSACTION',
  JOURNAL_WRITE_FAILED: 'JOURNAL_WRITE_FAILED',
  FAILED_NOT_APPLIED: 'FAILED_NOT_APPLIED',
  FAILED_COMPENSATED: 'FAILED_COMPENSATED',
  FAILED_PARTIAL: 'FAILED_PARTIAL',
  UNRESOLVED_JOURNAL: 'UNRESOLVED_JOURNAL',
  UNRESOLVED_FINALIZE: 'UNRESOLVED_FINALIZE',
  INDETERMINATE: 'INDETERMINATE',
});

/** Decision register id for the unspecified EQUIPPED <-> READIED action cost (docs/audits/swse-rules-decisions-pending.md). */
export const DEFERRED_DECISION_ID = 'EQ-001';

/** Codes: INVALID_REQUEST, INVALID_INTENT, UNSUPPORTED_FIELD, INVALID_ACTOR, INVALID_DEPS. */
export class EquipmentIntentError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'EquipmentIntentError';
    this.code = code;
  }
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const sameValue = (a, b) => (a === undefined || b === undefined) ? a === b : canonicalize(a) === canonicalize(b);
const HEX64 = /^[0-9a-f]{64}$/;

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function getPath(obj, path) {
  let node = obj;
  for (const part of path.split('.')) {
    if (node === null || node === undefined || (typeof node !== 'object' && typeof node !== 'function')) return undefined;
    node = node[part];
  }
  return node;
}
const deletionPath = (path) => { const i = path.lastIndexOf('.'); return `${path.slice(0, i)}.-=${path.slice(i + 1)}`; };

// ------------------------------------------------------------------------------------------------------------------ intent validation
const INTENT_KEYS = { stow: ['type', 'itemId'], equip: ['type', 'itemId', 'purpose', 'appendageIds'], ready: ['type', 'itemId', 'appendageIds', 'grip'] };

/** Validate and normalize an intent. Requester identity is NOT part of an intent: any unsupported field is refused. */
export function validateIntent(intent) {
  if (!isPlain(intent)) throw new EquipmentIntentError('INVALID_INTENT', 'intent must be an object');
  if (!INTENT_TYPES.includes(intent.type)) throw new EquipmentIntentError('INVALID_INTENT', `intent.type must be one of ${INTENT_TYPES.join(', ')}`);
  const extra = Object.keys(intent).filter((k) => !INTENT_KEYS[intent.type].includes(k));
  if (extra.length) throw new EquipmentIntentError('UNSUPPORTED_FIELD', `unsupported intent field(s): ${extra.sort().join(', ')} (no requester identity, field updates or hand selection rules are accepted)`);
  if (!nonEmpty(intent.itemId)) throw new EquipmentIntentError('INVALID_INTENT', 'intent.itemId must be a non-empty string');
  const out = { type: intent.type, itemId: intent.itemId };
  if (has(intent, 'appendageIds') && intent.appendageIds !== undefined) {
    if (!Array.isArray(intent.appendageIds) || !intent.appendageIds.length || !intent.appendageIds.every((id) => nonEmpty(id) && id.trim() === id) || new Set(intent.appendageIds).size !== intent.appendageIds.length) {
      throw new EquipmentIntentError('INVALID_INTENT', 'intent.appendageIds must be a non-empty array of distinct, non-empty strings');
    }
    out.appendageIds = [...intent.appendageIds];
  }
  if (intent.type === 'equip' && has(intent, 'purpose') && intent.purpose !== undefined) {
    if (!['hold', 'wield'].includes(intent.purpose)) throw new EquipmentIntentError('INVALID_INTENT', "intent.purpose must be 'hold' or 'wield'");
    out.purpose = intent.purpose;
  }
  if (intent.type === 'ready' && has(intent, 'grip') && intent.grip !== undefined) {
    if (!GRIPS.includes(intent.grip)) throw new EquipmentIntentError('INVALID_INTENT', `intent.grip must be one of ${GRIPS.join(', ')}`);
    out.grip = intent.grip;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------------ dependencies
async function defaultWriteItems(actor, updates) {
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  return ActorEngine.updateOwnedItems(actor, updates, { meta: { guardKey: 'EquipmentStateCoordinator.items' } });
}
async function defaultWriteJournal(actor, stored) {
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  return ActorEngine.updateActor(actor, { 'flags.swse.equipmentTxn': stored }, { meta: { guardKey: 'EquipmentStateCoordinator.journal' } });
}
async function defaultResolveActionCost(actor, item, direction) {
  const { resolveActionCost } = await import('/systems/foundryvtt-swse/scripts/engine/feats/action-speed-runtime-patches.js');
  const mutation = resolveActionCost(actor, 'drawOrHolsterWeapon', { workflowValidated: true, weaponId: item.id, direction });
  return mutation?.mutatedActionCost ?? mutation?.baseActionCost ?? null;
}
async function defaultSpendAction(actor, actionType, metadata) {
  const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
  return ActionEconomyConsumption.spend(actor, actionType, metadata, { notify: true });
}
async function defaultSpendMarkerPresent(actor, requestId) {
  const combatId = globalThis.game?.combat?.id ?? null;
  if (!combatId) return false; // out of combat the existing authority records nothing
  const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');
  const history = ActionEconomyPersistence.getTurnState(actor, combatId)?.history;
  return Array.isArray(history) && history.some((h) => h?.metadata?.requestId === requestId);
}
async function defaultIsLightsaber(item) {
  const { WeaponVisualProfileResolver } = await import('/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js');
  return WeaponVisualProfileResolver.isLightsaber(item) === true;
}

function readDeps(deps) {
  if (deps === undefined || deps === null) return {};
  if (!isPlain(deps)) throw new EquipmentIntentError('INVALID_DEPS', 'deps must be an object');
  for (const k of ['writeItems', 'writeJournal', 'resolveActionCost', 'spendAction', 'spendMarkerPresent', 'isLightsaber', 'isGm', 'loadSpecies', 'readOwnedPaths', 'now']) {
    if (deps[k] !== undefined && typeof deps[k] !== 'function') throw new EquipmentIntentError('INVALID_DEPS', `deps.${k} must be a function`);
  }
  if (deps.ledger !== undefined && !(deps.ledger instanceof Map)) throw new EquipmentIntentError('INVALID_DEPS', 'deps.ledger must be a Map');
  if (deps.reader !== undefined && !isPlain(deps.reader)) throw new EquipmentIntentError('INVALID_DEPS', 'deps.reader must be an object of reader deps');
  return deps;
}

const itemOf = (actor, id) => {
  if (typeof actor.items?.get === 'function') { const hit = actor.items.get(id); if (hit) return hit; }
  return Array.from(actor.items ?? []).find((i) => i?.id === id) ?? null;
};

// ------------------------------------------------------------------------------------------------------------------ evidence + planning
async function gather(actor, deps, readerExtra = {}) {
  const species = await (deps.loadSpecies ?? loadActorSpeciesProfile)(actor);
  const state = readActorEquipmentState(actor, {
    ...(deps.reader ?? {}),
    ...(species?.status === 'resolved' ? { resolveSpeciesProfile: () => species.profile } : {}),
    ...readerExtra,
  });
  return { species, state };
}

function basisOf(actor, state, species) {
  return fingerprintIntent(clone({
    weapons: state.weapons.map((w) => {
      const item = itemOf(actor, w.itemId);
      const fs = item ? readFireState(item) : null;
      return { id: w.itemId, record: w.record.status, posture: w.record.posture ?? null, occupancy: w.record.occupancy ?? null, wielded: fs?.wielded ?? null, activated: item?.system?.activated ?? null, gates: w.gates.map((g) => g.code) };
    }),
    anatomy: { status: state.anatomy.status, kind: state.anatomy.anatomyKind, appendages: state.anatomy.appendages.map((a) => ({ id: a.id, state: a.functionalState, caps: a.capabilities })) },
    species: { status: species?.status ?? 'unavailable', name: species?.evidence?.speciesName ?? null, variantId: species?.evidence?.variantId ?? null },
    journal: state.transactions,
  }));
}

const planResult = (status, extra = {}) => deepFreeze({ status, intentDigest: null, basisDigest: null, planDigest: null, itemWrites: [], action: null, choices: [], conflicts: [], issues: [], hypothetical: null, ...extra });

async function buildPlan(actor, intent, deps, requestIntentDigest) {
  const { species, state } = await gather(actor, deps);
  const intentDigest = requestIntentDigest;
  const basisDigest = basisOf(actor, state, species);
  const base = { intentDigest, basisDigest };
  const reject = (code, message, details = {}) => planResult(OUTCOME.REJECTED_PRECONDITION, { ...base, issues: [issue(code, 'blocking', message, { itemId: intent.itemId, ...details })] });

  const entry = state.weapons.find((w) => w.itemId === intent.itemId);
  const item = itemOf(actor, intent.itemId);
  if (!entry || !item) return reject('not-a-weapon-of-this-actor', 'The intent names no weapon Item of this actor.');
  if (entry.pending) return reject('weapon-identity-uncertified', 'Natural and integrated weapons have no certified Item identity; the coordinator does not manage their posture.', { kind: entry.pending.kind });
  if (state.transactions.journalStatus === JOURNAL_STATUS.INVALID) return reject('equipment-journal-unreadable', 'The equipment transaction journal is malformed; no new transaction may start.');
  if (entry.gates.some((g) => g.code === 'unresolved-equipment-transaction')) return planResult(OUTCOME.UNRESOLVED_TRANSACTION, { ...base, issues: [issue('unresolved-equipment-transaction', 'blocking', 'An earlier transaction covering this weapon is unresolved; it must be reconciled before another change.', { itemId: intent.itemId, transactions: entry.gates.find((g) => g.code === 'unresolved-equipment-transaction').details.transactions })] });
  if (entry.record.status === WEAPON_RECORD_STATUS.INVALID) return reject('weapon-record-invalid', 'The weapon record is malformed. It is never silently replaced; an explicit repair is a separate, unauthorized operation.');

  const currentPosture = entry.record.status === WEAPON_RECORD_STATUS.VALID ? entry.record.posture : null;
  const targetPosture = intent.type === 'stow' ? EQUIPMENT_POSTURE.STOWED : intent.type === 'equip' ? EQUIPMENT_POSTURE.EQUIPPED : EQUIPMENT_POSTURE.READIED;
  if (currentPosture === null && targetPosture !== EQUIPMENT_POSTURE.STOWED) return reject('weapon-record-absent', 'The weapon has no record. It must first be initialized explicitly with a stow intent; no posture is assumed.');
  if (currentPosture && currentPosture !== EQUIPMENT_POSTURE.STOWED && targetPosture !== EQUIPMENT_POSTURE.STOWED) {
    return planResult(OUTCOME.DEFERRED_RULES_REVIEW, { ...base, issues: [issue('equipped-readied-transition-cost-unspecified', 'blocking', `Changing a drawn weapon between EQUIPPED, READIED or other appendages has no established action cost. Decision ${DEFERRED_DECISION_ID} is deferred for rules review; nothing is written.`, { decisionId: DEFERRED_DECISION_ID, from: currentPosture, to: targetPosture })] });
  }

  // explicit target record (no hand is chosen here: the caller names the appendages)
  const choices = [];
  let targetRecord;
  let grip = null;
  if (targetPosture === EQUIPMENT_POSTURE.STOWED) targetRecord = { weaponPosture: 'STOWED', weaponOccupancy: { schemaVersion: WEAPON_OCCUPANCY_SCHEMA_VERSION, purpose: null, appendageIds: [] } };
  else {
    const purpose = intent.type === 'ready' ? 'wield' : intent.purpose;
    if (!purpose) choices.push({ id: 'purpose', options: ['hold', 'wield'] });
    if (!intent.appendageIds) choices.push({ id: 'appendageIds', options: state.anatomy.appendages.map((a) => ({ id: a.id, functionalState: a.functionalState })) });
    if (intent.type === 'ready') { grip = intent.grip ?? null; if (!grip) choices.push({ id: 'grip', options: [...GRIPS] }); }
    if (choices.length) return planResult(OUTCOME.CHOICE_REQUIRED, { ...base, choices, issues: [issue('explicit-choice-required', 'info', 'The coordinator never selects appendages, a purpose or a grip; the caller must supply them.', { itemId: intent.itemId })] });
    targetRecord = { weaponPosture: targetPosture, weaponOccupancy: { schemaVersion: WEAPON_OCCUPANCY_SCHEMA_VERSION, purpose, appendageIds: [...intent.appendageIds] } };
  }

  const currentRecord = { weaponPosture: item.system?.weaponPosture, weaponOccupancy: clone(item.system?.weaponOccupancy) };
  const transition = validateWeaponRecordTransition(currentRecord, targetRecord);
  if (!transition.allowed) return planResult(OUTCOME.REJECTED_PRECONDITION, { ...base, issues: transition.issues });
  if (currentPosture === targetPosture && !transition.changed && (!grip || readFireState(item)?.wielded === grip)) return planResult(OUTCOME.NO_CHANGE, { ...base, issues: [issue('no-change', 'info', 'The weapon already holds the requested record.', { itemId: intent.itemId })] });

  // preserved activation rule: a lit lightsaber is not stowed (existing InventoryEngine behavior); detection stays with the visual-profile authority
  const direction = currentPosture === EQUIPMENT_POSTURE.STOWED && targetPosture !== EQUIPMENT_POSTURE.STOWED ? 'draw' : currentPosture && currentPosture !== EQUIPMENT_POSTURE.STOWED && targetPosture === EQUIPMENT_POSTURE.STOWED ? 'holster' : null;
  if (direction === 'holster' && item.system?.activated === true && await (deps.isLightsaber ?? defaultIsLightsaber)(item)) return reject('deactivate-before-stowing', 'An activated lightsaber must be deactivated before it is stowed.');
  let action = { required: false, actionType: null, direction: null };
  if (direction) {
    const actionType = await (deps.resolveActionCost ?? defaultResolveActionCost)(actor, item, direction);
    if (!nonEmpty(actionType)) return reject('action-cost-unavailable', 'The existing action-cost authority returned no cost; none is assumed.', { direction });
    action = { required: true, actionType, direction };
  }

  // hypothetical evaluation through the SAME reader, with the proposed record/grip overlaid (planning only; nothing persisted)
  const overlay = { [intent.itemId]: { system: targetRecord, ...(grip ? { fireState: { wielded: grip } } : {}) } };
  const hyp = (await gather(actor, deps, { overlay, evaluatePendingTransactions: false })).state;
  const hypEntry = hyp.weapons.find((w) => w.itemId === intent.itemId);
  const hypothetical = { status: hypEntry.status, effectivePosture: hypEntry.effectivePosture, gates: hypEntry.gates.map((g) => g.code) };
  const issues = [...transition.issues];
  const otherChanged = state.weapons.filter((w) => w.itemId !== intent.itemId && w.effectivePosture && hyp.weapons.find((x) => x.itemId === w.itemId)?.effectivePosture !== w.effectivePosture).map((w) => w.itemId);
  const newConflicts = hyp.conflicts.filter((c) => !state.conflicts.some((o) => canonicalize(o) === canonicalize(c)));
  const targetEstablished = hypEntry.status === 'established' && hypEntry.effectivePosture === targetPosture;
  if (newConflicts.length || (targetEstablished && otherChanged.length) || hyp.occupancyEvidence.uncertainCollisions.some((c) => c.itemId === intent.itemId)) {
    return planResult(OUTCOME.CONFLICT_UNRESOLVED, { ...base, conflicts: [...newConflicts, ...hyp.occupancyEvidence.uncertainCollisions.filter((c) => c.itemId === intent.itemId).map((c) => ({ kind: 'uncertain', ...c }))], hypothetical, issues: [issue('conflict-requires-explicit-resolution', 'blocking', 'The change would collide with another weapon\'s appendages or change another weapon\'s state. Nothing is stowed, moved or reassigned automatically; the caller must submit explicit intents.', { itemId: intent.itemId, affectedItemIds: otherChanged })] });
  }
  if (hypEntry.status !== 'established' || hypEntry.effectivePosture !== targetPosture) {
    const reasons = [...(hypEntry.effective?.issues ?? []), ...hypEntry.issues].filter((i) => i.severity !== 'info').map((i) => i.code);
    if (species.status !== 'resolved' && targetPosture !== EQUIPMENT_POSTURE.STOWED) reasons.push(`species-evidence-unavailable:${species.reason}`);
    return planResult(OUTCOME.NOT_ESTABLISHED, { ...base, hypothetical, issues: [issue('target-posture-not-established', 'blocking', 'The canonical resolvers do not establish the requested posture for this explicit configuration; nothing is written.', { itemId: intent.itemId, reasons: [...new Set(reasons)].sort() })] });
  }

  // exact owned-field changes with their current values (journal before-values)
  const set = { 'system.weaponPosture': targetRecord.weaponPosture, 'system.weaponOccupancy': targetRecord.weaponOccupancy };
  if (grip) {
    set['flags.swse.fireState.wielded'] = grip;
    if (!isPlain(readFireState(item))) set['flags.swse.fireState.v'] = 1;
  }
  const before = {}; const beforeAbsent = [];
  for (const p of Object.keys(set)) { const v = getPath(item, p); if (v === undefined) beforeAbsent.push(p); else before[p] = clone(v); }
  const itemWrites = [{ id: intent.itemId, set: clone(set), before, beforeAbsent }];
  const planDigest = fingerprintIntent(clone({ intentDigest, basisDigest, itemWrites, action }));
  return planResult(OUTCOME.PLANNED, { ...base, planDigest, itemWrites, action, hypothetical, issues });
}

/**
 * Read-only plan for an intent. The returned `planDigest` is what a caller echoes back as its confirmation. Never writes, never spends.
 * @returns {Promise<object>} frozen plan: { status, intentDigest, basisDigest, planDigest, itemWrites, action, choices, conflicts, issues, hypothetical }
 */
export async function planEquipmentIntent(actor, intent, deps) {
  if (!actor || typeof actor !== 'object') throw new EquipmentIntentError('INVALID_ACTOR', 'actor must be an Actor-like object');
  const d = readDeps(deps);
  const normalized = validateIntent(intent);
  return buildPlan(actor, normalized, d, fingerprintIntent({ schema: 1, actorId: actor.id ?? null, intent: normalized }));
}

// ------------------------------------------------------------------------------------------------------------------ execution
const queues = new Map();
function enqueue(actorId, task) {
  const key = String(actorId ?? '');
  const tail = queues.get(key) ?? Promise.resolve();
  const run = tail.catch(() => {}).then(task);
  const guard = run.catch(() => {});
  queues.set(key, guard);
  guard.then(() => { if (queues.get(key) === guard) queues.delete(key); });
  return run;
}

const defaultLedger = new Map();
const LEDGER_MAX = 256;
function remember(ledger, requestId, intentDigest, outcome) {
  ledger.set(requestId, { intentDigest, outcome });
  while (ledger.size > LEDGER_MAX) ledger.delete(ledger.keys().next().value);
}

const outcomeOf = (status, ctx, extra = {}) => deepFreeze({ status, requestId: ctx.requestId, intentDigest: ctx.intentDigest, planDigest: ctx.planDigest ?? null, phase: ctx.phase ?? null, verified: false, finalized: false, issues: [], ...extra });

async function observe(actor, entry, deps) {
  const reader = deps.readOwnedPaths ?? ((a, id, paths) => { const it = itemOf(a, id); return it ? Object.fromEntries(paths.map((p) => [p, getPath(it, p)])) : null; });
  const observed = {};
  for (const it of entry.items) observed[it.id] = await reader(actor, it.id, Object.keys(it.target)) ?? undefined;
  return observed;
}

async function markerPresent(actor, requestId, deps) {
  try { return !!(await (deps.spendMarkerPresent ?? defaultSpendMarkerPresent)(actor, requestId)); } catch { return null; }
}

/** Conditional, field-scoped compensation: restore a path only if it still holds the planned value. NOT an atomic compare-and-swap. */
async function compensate(actor, entry, deps) {
  const restore = []; const skippedConcurrentPaths = []; const unrestoredPaths = []; const restoredPaths = [];
  const observed = await observe(actor, entry, deps);
  for (const it of entry.items) {
    const obs = observed[it.id];
    for (const p of Object.keys(it.target)) {
      const cur = obs?.[p];
      const wasAbsent = !has(it.before, p);
      const beforeVal = wasAbsent ? undefined : it.before[p];
      if (!obs) { unrestoredPaths.push(`${it.id}:${p}`); continue; }
      if (sameValue(cur, it.target[p])) restore.push({ id: it.id, p, beforeVal, wasAbsent });
      else if (sameValue(cur, beforeVal)) restoredPaths.push(`${it.id}:${p}`);
      else skippedConcurrentPaths.push(`${it.id}:${p}`);
    }
  }
  if (restore.length) {
    const byItem = new Map();
    for (const r of restore) { const u = byItem.get(r.id) ?? { _id: r.id }; if (r.wasAbsent) u[deletionPath(r.p)] = null; else u[r.p] = clone(r.beforeVal); byItem.set(r.id, u); }
    try { await (deps.writeItems ?? defaultWriteItems)(actor, [...byItem.values()]); } catch { /* verified below */ }
    const after = await observe(actor, entry, deps);
    for (const r of restore) {
      if (sameValue(after[r.id]?.[r.p], r.beforeVal)) restoredPaths.push(`${r.id}:${r.p}`);
      else unrestoredPaths.push(`${r.id}:${r.p}`);
    }
  }
  return { restoredPaths: restoredPaths.sort(), skippedConcurrentPaths: skippedConcurrentPaths.sort(), unrestoredPaths: unrestoredPaths.sort(), clean: !skippedConcurrentPaths.length && !unrestoredPaths.length };
}

/**
 * Execute one confirmed intent in the explicit GM-local context.
 * @param {object} actor
 * @param {{requestId:string, intent:object, planDigest?:string}} request `planDigest` echoes a plan the caller received (the confirmation)
 * @param {{context?:object}} [options] `context` must be GM_LOCAL_CONTEXT
 * @param {object} [deps]
 * @returns {Promise<object>} frozen outcome { status, requestId, intentDigest, planDigest, phase, verified, finalized, issues, ... }
 * @throws {EquipmentIntentError} for malformed API input
 */
export async function executeEquipmentIntent(actor, request, options = {}, deps) {
  if (!actor || typeof actor !== 'object') throw new EquipmentIntentError('INVALID_ACTOR', 'actor must be an Actor-like object');
  if (!isPlain(request)) throw new EquipmentIntentError('INVALID_REQUEST', 'request must be { requestId, intent, planDigest? }');
  const extra = Object.keys(request).filter((k) => !['requestId', 'intent', 'planDigest'].includes(k));
  if (extra.length) throw new EquipmentIntentError('UNSUPPORTED_FIELD', `unsupported request field(s): ${extra.sort().join(', ')} (requester identity is never accepted from a payload)`);
  if (!nonEmpty(request.requestId) || request.requestId.length > 128) throw new EquipmentIntentError('INVALID_REQUEST', 'requestId must be a non-empty string of at most 128 characters');
  if (request.planDigest !== undefined && !(typeof request.planDigest === 'string' && HEX64.test(request.planDigest))) throw new EquipmentIntentError('INVALID_REQUEST', 'planDigest must be a sha-256 hex digest');
  if (!isPlain(options)) throw new EquipmentIntentError('INVALID_REQUEST', 'options must be an object');
  const d = readDeps(deps);
  const intent = validateIntent(request.intent);
  const intentDigest = fingerprintIntent({ schema: 1, actorId: actor.id ?? null, intent });
  const ctx = { requestId: request.requestId, intentDigest };

  // authority: explicit local GM context only; no player route, no fallback
  if (options.context !== GM_LOCAL_CONTEXT) return outcomeOf(OUTCOME.NO_AUTHORITATIVE_EXECUTOR, ctx, { issues: [issue('no-authoritative-executor', 'blocking', 'Equipment-state changes run only in an explicitly authorized local GM execution context. There is no player-originated route and no owner fallback.')] });
  const isGm = d.isGm ? d.isGm() : globalThis.game?.user?.isGM === true;
  if (!isGm) return outcomeOf(OUTCOME.REJECTED_NOT_GM, ctx, { issues: [issue('not-a-gm', 'blocking', 'The local user is not a GM; nothing is executed.')] });

  const ledger = d.ledger ?? defaultLedger;
  return enqueue(actor.id, () => runExecution(actor, request, intent, ctx, ledger, d));
}

async function runExecution(actor, request, intent, ctx, ledger, deps) {
  // ---- duplicate / identity binding: durable journal first, then the local ledger. A duplicate is never executed again. ----
  const journal = readJournal(actor.flags?.swse?.equipmentTxn);
  const journaled = journal.status === JOURNAL_STATUS.VALID ? findEntry(journal.entries, ctx.requestId) : null;
  if (journaled) {
    if (journaled.intentDigest !== ctx.intentDigest) return outcomeOf(OUTCOME.REQUEST_ID_CONFLICT, ctx, { issues: [issue('request-id-reused-with-different-intent', 'blocking', 'This request id is already journaled for a different intent.')] });
    if (journaled.phase === TXN_PHASE.FINALIZED) return outcomeOf(OUTCOME.DUPLICATE_REPLAYED, ctx, { planDigest: journaled.planDigest, phase: journaled.phase, verified: true, finalized: true, replayedFrom: 'journal' });
    const classification = classifyTransaction(journaled, await observe(actor, journaled, deps), { spendMarkerPresent: await markerPresent(actor, ctx.requestId, deps) });
    return outcomeOf(OUTCOME.DUPLICATE_UNRESOLVED, ctx, { planDigest: journaled.planDigest, phase: journaled.phase, classification: classification.classification, spend: classification.spend, reasons: [...classification.reasons], issues: [issue('duplicate-request-unresolved', 'blocking', 'This request id is journaled and not finalized. It is never replayed automatically.', { phase: journaled.phase })] });
  }
  const seen = ledger.get(ctx.requestId);
  if (seen) {
    if (seen.intentDigest !== ctx.intentDigest) return outcomeOf(OUTCOME.REQUEST_ID_CONFLICT, ctx, { issues: [issue('request-id-reused-with-different-intent', 'blocking', 'This request id was already used for a different intent.')] });
    return outcomeOf(OUTCOME.DUPLICATE_REPLAYED, ctx, { planDigest: seen.outcome.planDigest, replayedStatus: seen.outcome.status, verified: seen.outcome.verified, finalized: seen.outcome.finalized, replayedFrom: 'ledger' });
  }

  const finish = (outcome) => { remember(ledger, ctx.requestId, ctx.intentDigest, outcome); return outcome; };

  // ---- read, resolve, plan, confirm, re-plan under serialization ----
  const plan = await buildPlan(actor, intent, deps, ctx.intentDigest);
  ctx.planDigest = plan.planDigest;
  if (plan.status !== OUTCOME.PLANNED) return finish(outcomeOf(plan.status, ctx, { planDigest: plan.planDigest, choices: plan.choices, conflicts: plan.conflicts, issues: [...plan.issues] }));
  if (!request.planDigest) return outcomeOf(OUTCOME.CONFIRMATION_REQUIRED, ctx, { planDigest: plan.planDigest, plan, issues: [issue('confirmation-required', 'info', 'Echo the plan digest to confirm exactly this change.')] });
  if (request.planDigest !== plan.planDigest) return finish(outcomeOf(OUTCOME.STALE_STATE, ctx, { planDigest: plan.planDigest, issues: [issue('plan-changed-since-confirmation', 'blocking', 'The confirmed plan no longer matches the freshly read state; nothing was written.')] }));

  // ---- validate exact field changes ----
  const write = plan.itemWrites[0];
  const badPaths = Object.keys(write.set).filter((p) => !OWNED_PATHS.includes(p));
  if (badPaths.length) return finish(outcomeOf(OUTCOME.REJECTED_PRECONDITION, ctx, { issues: [issue('field-not-coordinator-owned', 'blocking', 'A planned field is not coordinator-owned.', { paths: badPaths })] }));

  // ---- journal PREPARED (before any Item is modified) ----
  const spendRequired = plan.action.required;
  let entries = journal.status === JOURNAL_STATUS.VALID ? clone(journal.entries) : [];
  if (journal.status === JOURNAL_STATUS.INVALID) return finish(outcomeOf(OUTCOME.REJECTED_PRECONDITION, ctx, { issues: [issue('equipment-journal-unreadable', 'blocking', 'The equipment transaction journal is malformed.')] }));
  const at = d_now(deps);
  const journalEntry = { requestId: ctx.requestId, intentDigest: ctx.intentDigest, planDigest: plan.planDigest, at, items: [{ id: write.id, before: write.before, target: write.set, beforeAbsent: write.beforeAbsent }], spend: { state: spendRequired ? 'pending' : 'not-required', actionType: plan.action.actionType } };
  const persist = async (next) => { await (deps.writeJournal ?? defaultWriteJournal)(actor, toStored(next)); entries = next; };
  try { await persist(addPreparedEntry(entries, journalEntry)); } catch (err) {
    return finish(outcomeOf(OUTCOME.JOURNAL_WRITE_FAILED, ctx, { phase: null, issues: [issue(err instanceof JournalError ? err.code : 'journal-write-failed', 'blocking', 'The PREPARED journal entry could not be written; no Item was modified.')] }));
  }
  ctx.phase = TXN_PHASE.PREPARED;
  const phaseTo = async (phase, patch) => { try { await persist(transitionEntry(entries, ctx.requestId, phase, patch)); ctx.phase = phase; return true; } catch { return false; } };
  const current = () => findEntry(entries, ctx.requestId);

  // ---- field-scoped Item update, then verify persisted values ----
  let writeError = null;
  try { await (deps.writeItems ?? defaultWriteItems)(actor, [{ _id: write.id, ...write.set }]); } catch (err) { writeError = err; }
  const classified = classifyTransaction(current(), await observe(actor, current(), deps), { spendMarkerPresent: null });
  if (classified.classification === 'NOT_APPLIED') {
    const ok = await phaseTo(TXN_PHASE.NOT_APPLIED, { notes: ['item write did not take effect'] });
    return finish(outcomeOf(OUTCOME.FAILED_NOT_APPLIED, ctx, { issues: [issue('item-write-not-applied', 'blocking', writeError ? 'The Item write failed and nothing was changed.' : 'The Item write reported success but the persisted values are unchanged.', { error: writeError?.message ?? null }), ...(ok ? [] : [issue('journal-not-closed', 'blocking', 'The journal could not be closed; readiness stays withheld.')])] }));
  }
  if (classified.classification === 'INDETERMINATE') {
    await phaseTo(TXN_PHASE.INDETERMINATE, { notes: classified.reasons });
    return finish(outcomeOf(OUTCOME.INDETERMINATE, ctx, { reasons: [...classified.reasons], issues: [issue('item-state-indeterminate', 'blocking', 'The persisted Item values are neither the before- nor the planned values; the evidence is preserved and nothing is restored.')] }));
  }
  if (classified.classification === 'PARTIAL' || writeError) {
    return finish(await failWithCompensation(actor, ctx, current(), deps, phaseTo, 'item-write-partial', writeError));
  }

  // ---- APPLIED (verified), then the action spend, then FINALIZED ----
  if (!(await phaseTo(TXN_PHASE.APPLIED, {}))) {
    return finish(outcomeOf(OUTCOME.UNRESOLVED_JOURNAL, ctx, { verified: true, issues: [issue('journal-applied-not-recorded', 'blocking', 'The Items are verified but the journal still reads PREPARED; readiness stays withheld and the transaction is unresolved.')] }));
  }
  let spendState = 'not-required';
  if (spendRequired) {
    let spendOk = false; let ambiguous = false; let spendError = null;
    try {
      if (await (deps.spendMarkerPresent ?? defaultSpendMarkerPresent)(actor, ctx.requestId)) { spendOk = true; spendState = 'committed'; }
      else {
        const result = await (deps.spendAction ?? defaultSpendAction)(actor, plan.action.actionType, { source: 'equipment-coordinator', requestId: ctx.requestId, itemId: write.id, direction: plan.action.direction });
        if (result?.allowed === false || result?.permitted === false) spendOk = false;
        else { spendOk = true; spendState = result?.committed === true ? 'committed' : 'not-required'; }
      }
    } catch (err) {
      spendError = err;
      const marker = await markerPresent(actor, ctx.requestId, deps);
      if (marker === true) { spendOk = true; spendState = 'committed'; } else if (marker === null) ambiguous = true;
    }
    if (ambiguous) {
      await phaseTo(TXN_PHASE.INDETERMINATE, { spend: { state: 'unknown', actionType: plan.action.actionType }, notes: ['the action spend could not be established'] });
      return finish(outcomeOf(OUTCOME.INDETERMINATE, ctx, { verified: true, issues: [issue('action-spend-indeterminate', 'blocking', 'The action spend threw and its marker could not be read. The Items stay applied but unfinalized; readiness is withheld and nothing is replayed.', { error: spendError?.message ?? null })] }));
    }
    if (!spendOk) return finish(await failWithCompensation(actor, ctx, current(), deps, phaseTo, 'action-spend-failed', spendError));
  }
  const finalized = await phaseTo(TXN_PHASE.FINALIZED, { spend: { state: spendState, actionType: plan.action.actionType }, outcome: { status: OUTCOME.COMMITTED } });
  if (!finalized) {
    return finish(outcomeOf(OUTCOME.UNRESOLVED_FINALIZE, ctx, { verified: true, phase: TXN_PHASE.APPLIED, spend: spendState, issues: [issue('journal-finalize-failed', 'blocking', 'The Items are verified and the action is settled, but the journal could not be finalized. The transaction stays unresolved and readiness stays withheld.')] }));
  }
  return finish(outcomeOf(OUTCOME.COMMITTED, ctx, { verified: true, finalized: true, spend: spendState, action: plan.action }));
}

const d_now = (deps) => { try { const v = deps.now ? deps.now() : null; return typeof v === 'number' ? v : null; } catch { return null; } };

async function failWithCompensation(actor, ctx, entry, deps, phaseTo, code, error) {
  const result = await compensate(actor, entry, deps);
  const report = { restoredPaths: result.restoredPaths, skippedConcurrentPaths: result.skippedConcurrentPaths, unrestoredPaths: result.unrestoredPaths };
  const issues = [issue(code, 'blocking', code === 'action-spend-failed' ? 'The action could not be paid; the Item change is being undone field by field.' : 'The Item write was incomplete; the owned fields are being restored field by field.', { error: error?.message ?? null })];
  if (result.clean) {
    const closed = await phaseTo(TXN_PHASE.NOT_APPLIED, { notes: [code] });
    return outcomeOf(closed ? OUTCOME.FAILED_COMPENSATED : OUTCOME.UNRESOLVED_JOURNAL, ctx, { ...report, issues: closed ? issues : [...issues, issue('journal-not-closed', 'blocking', 'The Items are restored but the journal could not be closed; readiness stays withheld.')] });
  }
  await phaseTo(TXN_PHASE.PARTIAL, { notes: [code, ...result.skippedConcurrentPaths.map((p) => `concurrent:${p}`)] });
  return outcomeOf(OUTCOME.FAILED_PARTIAL, ctx, { ...report, issues: [...issues, issue('compensation-incomplete', 'blocking', 'Some fields could not be restored or were changed by someone else; they were left untouched and the evidence is preserved. Compensation is conditional, not atomic.')] });
}

/**
 * Read-only classification of a journaled request (never mutates, never replays, no GM requirement).
 * @returns {Promise<object>} { found, phase, classification, spend, reasons }
 */
export async function inspectEquipmentTransaction(actor, requestId, deps) {
  if (!actor || typeof actor !== 'object') throw new EquipmentIntentError('INVALID_ACTOR', 'actor must be an Actor-like object');
  if (!nonEmpty(requestId)) throw new EquipmentIntentError('INVALID_REQUEST', 'requestId must be a non-empty string');
  const d = readDeps(deps);
  const journal = readJournal(actor.flags?.swse?.equipmentTxn);
  if (journal.status === JOURNAL_STATUS.INVALID) return deepFreeze({ found: false, journalStatus: journal.status, issues: journal.issues });
  const entry = findEntry(journal.entries, requestId);
  if (!entry) return deepFreeze({ found: false, journalStatus: journal.status, issues: [] });
  const c = classifyTransaction(entry, await observe(actor, entry, d), { spendMarkerPresent: await markerPresent(actor, requestId, d) });
  return deepFreeze({ found: true, journalStatus: journal.status, phase: entry.phase, unresolved: isUnresolved(entry), classification: c.classification, spend: c.spend, reasons: [...c.reasons], perItem: c.perItem.map((p) => ({ ...p })) });
}

export default { planEquipmentIntent, executeEquipmentIntent, inspectEquipmentTransaction, validateIntent, GM_LOCAL_CONTEXT, OUTCOME, OWNED_PATHS, INTENT_TYPES, GRIPS, EquipmentIntentError, DEFERRED_DECISION_ID };
