/**
 * Equipment transaction journal (E4-C1 WP3-A) -- PURE.
 *
 * Operational TRANSACTION EVIDENCE for the equipment-state coordinator. It is NOT a second posture authority: posture and occupancy live only in
 * `system.weaponPosture` / `system.weaponOccupancy`. The journal records that a coordinator transaction was started, what it intended and how far
 * it is known to have progressed, so that an interrupted transaction can never be mistaken for a finished one.
 *
 * Stored in one actor flag (`flags.swse.equipmentTxn`, owned solely by the coordinator): { schemaVersion: 1, entries: Entry[] } (bounded).
 *
 * Phases
 *   PREPARED       written BEFORE any Item is modified; the affected Items' readiness is withheld from this point
 *   APPLIED        the Item fields were written AND verified; the action spend (if any) is not yet finalized -- still withheld
 *   FINALIZED      Items verified, action spend settled, journal closed: the ONLY phase that releases the withholding for a successful change
 *   NOT_APPLIED    verified that the Items hold their before-values again (nothing remains of the attempt)
 *   PARTIAL        some owned fields hold target values and some do not, or compensation could not restore everything
 *   INDETERMINATE  the Items hold values that are neither the before- nor the target-values, or completion could not be established
 * Unresolved (readiness withheld): PREPARED, APPLIED, PARTIAL, INDETERMINATE. Resolved: FINALIZED, NOT_APPLIED.
 *
 * A matching request id alone never proves success (`lastRequestId` style inference is rejected): success is the FINALIZED phase, written only
 * after verification and the action spend. Classification of an interrupted entry compares observed Item fields with the recorded before/target
 * values and is read-only; nothing is replayed automatically.
 */
import { canonicalize } from '/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js';

export const JOURNAL_SCHEMA_VERSION = 1;
export const JOURNAL_MAX_ENTRIES = 20;
export const TXN_PHASE = Object.freeze({
  PREPARED: 'PREPARED', APPLIED: 'APPLIED', FINALIZED: 'FINALIZED', NOT_APPLIED: 'NOT_APPLIED', PARTIAL: 'PARTIAL', INDETERMINATE: 'INDETERMINATE',
});
export const RESOLVED_PHASES = Object.freeze([TXN_PHASE.FINALIZED, TXN_PHASE.NOT_APPLIED]);
export const JOURNAL_STATUS = Object.freeze({ VALID: 'valid', ABSENT: 'absent', INVALID: 'invalid' });

const TRANSITIONS = Object.freeze({
  PREPARED: ['APPLIED', 'NOT_APPLIED', 'PARTIAL', 'INDETERMINATE'],
  APPLIED: ['FINALIZED', 'NOT_APPLIED', 'PARTIAL', 'INDETERMINATE'],
  PARTIAL: ['NOT_APPLIED', 'INDETERMINATE'],
  INDETERMINATE: ['NOT_APPLIED', 'PARTIAL'],
  FINALIZED: [],
  NOT_APPLIED: [],
});

/** Codes: INVALID_JOURNAL, INVALID_ENTRY, DUPLICATE_REQUEST, UNKNOWN_REQUEST, ILLEGAL_TRANSITION, JOURNAL_FULL. */
export class JournalError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'JournalError';
    this.code = code;
  }
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const same = (a, b) => canonicalize(a === undefined ? null : a) === canonicalize(b === undefined ? null : b) && (a === undefined) === (b === undefined);
const HEX64 = /^[0-9a-f]{64}$/;

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function checkEntry(e, where) {
  if (!isPlain(e)) throw new JournalError('INVALID_ENTRY', `${where} must be an object`);
  if (!nonEmpty(e.requestId)) throw new JournalError('INVALID_ENTRY', `${where}.requestId must be a non-empty string`);
  for (const k of ['intentDigest', 'planDigest']) if (typeof e[k] !== 'string' || !HEX64.test(e[k])) throw new JournalError('INVALID_ENTRY', `${where}.${k} must be a sha-256 hex digest`);
  if (!Object.values(TXN_PHASE).includes(e.phase)) throw new JournalError('INVALID_ENTRY', `${where}.phase is not a journal phase`);
  if (!Number.isInteger(e.sequence) || e.sequence < 1) throw new JournalError('INVALID_ENTRY', `${where}.sequence must be a positive integer`);
  if (!Array.isArray(e.items) || !e.items.length) throw new JournalError('INVALID_ENTRY', `${where}.items must be a non-empty array`);
  const seen = new Set();
  e.items.forEach((it, i) => {
    if (!isPlain(it) || !nonEmpty(it.id) || !isPlain(it.before) || !isPlain(it.target) || !Object.keys(it.target).length) throw new JournalError('INVALID_ENTRY', `${where}.items[${i}] must be { id, before, target }`);
    if (seen.has(it.id)) throw new JournalError('INVALID_ENTRY', `${where}.items repeats item "${it.id}"`);
    seen.add(it.id);
    for (const p of Object.keys(it.target)) if (!has(it.before, p) && !(it.beforeAbsent ?? []).includes(p)) throw new JournalError('INVALID_ENTRY', `${where}.items[${i}] records no before-value for "${p}"`);
  });
  if (!isPlain(e.spend) || !['not-required', 'pending', 'committed', 'failed', 'unknown'].includes(e.spend.state)) throw new JournalError('INVALID_ENTRY', `${where}.spend.state is invalid`);
  return e;
}

/**
 * @returns {{status:'valid'|'absent'|'invalid', entries:object[], issues:object[]}} deep-frozen; a malformed journal is `invalid`, never repaired
 */
export function readJournal(raw) {
  if (raw === undefined || raw === null) return deepFreeze({ status: JOURNAL_STATUS.ABSENT, entries: [], issues: [] });
  try {
    if (!isPlain(raw) || raw.schemaVersion !== JOURNAL_SCHEMA_VERSION || !Array.isArray(raw.entries)) throw new JournalError('INVALID_JOURNAL', 'journal must be { schemaVersion: 1, entries: [] }');
    const ids = new Set();
    const entries = raw.entries.map((e, i) => {
      checkEntry(e, `entries[${i}]`);
      if (ids.has(e.requestId)) throw new JournalError('INVALID_JOURNAL', `request "${e.requestId}" appears twice`);
      ids.add(e.requestId);
      return clone(e);
    });
    return deepFreeze({ status: JOURNAL_STATUS.VALID, entries, issues: [] });
  } catch (err) {
    if (!(err instanceof JournalError)) throw err;
    return deepFreeze({ status: JOURNAL_STATUS.INVALID, entries: [], issues: [{ code: err.code, message: err.message }] });
  }
}

export const toStored = (entries) => ({ schemaVersion: JOURNAL_SCHEMA_VERSION, entries: clone(entries) });
export const isUnresolved = (entry) => !RESOLVED_PHASES.includes(entry.phase);
export const findEntry = (entries, requestId) => entries.find((e) => e.requestId === requestId) ?? null;

/** Item ids whose readiness is withheld because an unresolved transaction covers them. */
export function unresolvedItemIds(entries) {
  const out = new Map();
  for (const e of entries.filter(isUnresolved)) for (const it of e.items) { const l = out.get(it.id) ?? []; l.push({ requestId: e.requestId, phase: e.phase }); out.set(it.id, l); }
  return out;
}

/**
 * Add a PREPARED entry. Unresolved entries are never evicted; only the oldest RESOLVED entries are dropped to respect the bound.
 * @returns {object[]} the new entries (plain, mutable copy)
 */
export function addPreparedEntry(entries, { requestId, intentDigest, planDigest, items, spend, at = null }) {
  if (findEntry(entries, requestId)) throw new JournalError('DUPLICATE_REQUEST', `request "${requestId}" is already journaled`);
  const sequence = entries.reduce((m, e) => Math.max(m, e.sequence), 0) + 1;
  const entry = { requestId, intentDigest, planDigest, phase: TXN_PHASE.PREPARED, sequence, at, items: clone(items), spend: clone(spend), outcome: null, notes: [] };
  checkEntry(entry, 'entry');
  let next = [...clone(entries), entry];
  while (next.length > JOURNAL_MAX_ENTRIES) {
    const idx = next.findIndex((e) => !isUnresolved(e));
    if (idx < 0 || next[idx].requestId === requestId) throw new JournalError('JOURNAL_FULL', 'every journal entry is unresolved; no new transaction may start');
    next = next.filter((_, i) => i !== idx);
  }
  return next;
}

/** Move an entry to a new phase (legal transitions only). */
export function transitionEntry(entries, requestId, phase, patch = {}) {
  const entry = findEntry(entries, requestId);
  if (!entry) throw new JournalError('UNKNOWN_REQUEST', `request "${requestId}" is not journaled`);
  if (!TRANSITIONS[entry.phase]?.includes(phase)) throw new JournalError('ILLEGAL_TRANSITION', `${entry.phase} -> ${phase} is not allowed`);
  const next = clone(entries).map((e) => (e.requestId === requestId ? { ...e, ...clone(patch), phase, requestId: e.requestId, intentDigest: e.intentDigest, planDigest: e.planDigest, items: e.items, sequence: e.sequence } : e));
  checkEntry(next.find((e) => e.requestId === requestId), 'entry');
  return next;
}

/**
 * Read-only classification of an entry from OBSERVED Item fields. `observed` = { [itemId]: { [path]: value } } (a missing Item or path = undefined).
 * Never mutates and never decides a replay.
 * @returns {{classification:'APPLIED'|'NOT_APPLIED'|'PARTIAL'|'INDETERMINATE', perItem:object[], spend:string, reasons:string[]}} deep-frozen
 */
export function classifyTransaction(entry, observed, { spendMarkerPresent = null } = {}) {
  checkEntry(entry, 'entry');
  const reasons = [];
  const perItem = entry.items.map((it) => {
    const obs = observed?.[it.id];
    if (!isPlain(obs)) { reasons.push(`item "${it.id}" could not be observed`); return { id: it.id, state: 'unobserved' }; }
    const paths = Object.keys(it.target);
    const atTarget = paths.every((p) => same(obs[p], it.target[p]));
    const atBefore = paths.every((p) => same(obs[p], it.before[p]));
    const state = atTarget && atBefore ? 'unchanged' : atTarget ? 'target' : atBefore ? 'before' : 'other';
    if (state === 'other') reasons.push(`item "${it.id}" holds values that are neither the recorded before- nor target-values`);
    return { id: it.id, state };
  });
  const states = perItem.map((p) => p.state);
  let classification;
  if (states.includes('unobserved') || states.includes('other')) classification = 'INDETERMINATE';
  else if (states.every((s) => s === 'target' || s === 'unchanged') && states.includes('target')) classification = 'APPLIED';
  else if (states.every((s) => s === 'before' || s === 'unchanged')) classification = 'NOT_APPLIED';
  else if (states.every((s) => s === 'unchanged')) classification = 'NOT_APPLIED';
  else classification = 'PARTIAL';
  const spend = spendMarkerPresent === null ? 'unknown' : spendMarkerPresent ? 'present' : 'absent';
  if (entry.spend.state !== 'not-required' && spend === 'unknown') reasons.push('the action spend could not be established');
  if (classification === 'APPLIED' && entry.spend.state !== 'not-required' && spend === 'absent') reasons.push('the Items are applied but no action spend is recorded');
  if (classification === 'NOT_APPLIED' && spend === 'present') reasons.push('the Items are not applied but an action spend is recorded');
  return deepFreeze({ classification, perItem, spend, reasons });
}

export default { readJournal, toStored, addPreparedEntry, transitionEntry, classifyTransaction, unresolvedItemIds, findEntry, isUnresolved, JournalError, TXN_PHASE, RESOLVED_PHASES, JOURNAL_STATUS, JOURNAL_SCHEMA_VERSION, JOURNAL_MAX_ENTRIES };
