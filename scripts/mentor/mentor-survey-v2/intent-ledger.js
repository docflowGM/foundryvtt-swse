/**
 * Mentor Survey V2: the single survey persistence owner.
 *
 * Committed state is one append-only event ledger at flags.foundryvtt-swse.mentorSurvey.events, written ONLY by the
 * progression finalizer, in the same atomic `set` map as the advancement itself (see buildLedgerSetPatch).
 * Everything else here is pure. History is immutable: later events supersede, they never edit or delete.
 */
import { EVENT_TYPES, LANES, LEDGER_FLAG_KEY, LEDGER_FLAG_SCOPE, LEDGER_SET_PATH, hashString, deepClone } from './contract.js';

export const GOAL_TARGET_TYPES = Object.freeze({
  ARCHETYPE_PARENT: 'archetype_parent',
  ARCHETYPE_SPECIALIZATION: 'archetype_specialization',
  CLASS: 'class',
  RESPONSE_ONLY: 'response_only', // declared ambition with no certified typed target (answer-to-tag boundary)
});

/** Deterministic event id: the same (survey, scope, transaction, type, ordinal) always yields the same id. */
export function eventIdOf({ surveyKind, scopeId, transactionId, type, ordinal = 0 }) {
  return `msv.${hashString([surveyKind, scopeId, transactionId, type, ordinal].join('|'))}.${ordinal}`;
}

export function readLedger(actor) {
  const raw = actor?.flags?.[LEDGER_FLAG_SCOPE]?.mentorSurvey?.events
    ?? actor?.getFlag?.(LEDGER_FLAG_SCOPE, LEDGER_FLAG_KEY);
  return Array.isArray(raw) ? raw : [];
}

/** Active (non-superseded) event ids, per the supersession chain. */
function supersededIds(events) {
  return new Set(events.map((e) => e.supersedes).filter(Boolean));
}

/** Latest non-superseded goal event per lane, ignoring preview events unless asked. */
export function reduceLedger(events, { includePreview = false } = {}) {
  const usable = (events || []).filter((e) => includePreview || !e.provenance?.preview);
  const superseded = supersededIds(usable);
  const goals = {};
  const latestSurvey = {};
  const reflections = {};
  for (const e of usable) {
    if ((e.type === EVENT_TYPES.GOAL_DECLARATION || e.type === EVENT_TYPES.GOAL_REVISION) && !superseded.has(e.eventId)) goals[e.goalLane] = e;
    if (e.type === EVENT_TYPES.SURVEY_COMPLETED && !superseded.has(e.eventId)) latestSurvey[`${e.surveyKind}:${e.scopeId}`] = e;
    if (e.type === EVENT_TYPES.REFLECTION_SNAPSHOT) reflections[e.eventId] = e;
  }
  return { goals, latestSurvey, reflections };
}

/**
 * Build the events a completed survey contributes. Pure.
 * @param {object} p
 * @param {object} p.payload  from survey-session.toCommitPayload
 * @param {string} p.transactionId  the progression transaction (finalization) id
 * @param {number} p.actorLevel
 * @param {string} p.completedAt ISO timestamp
 * @param {boolean} [p.preview]
 * @param {Array<{goalLane:string,target:{type:string,id:string|null},questionId:string,optionId:string,quote?:string}>} [p.goals]
 *   goal declarations the RESOLVER derived from explicit affirmative selections (never from browsing or defaults)
 * @param {object[]} [p.existingEvents]
 */
export function buildCompletionEvents({ payload, transactionId, actorLevel, completedAt, preview = false, goals = [], existingEvents = [], answerDetails = {}, tagEvidence = [] }) {
  if (!payload || !transactionId) return [];
  const base = {
    surveyKind: payload.surveyKind,
    scopeId: payload.scopeId,
    transactionId,
    surveyDefinitionVersion: payload.definitionVersion,
    contextRevision: payload.contextRevision,
    actorLevel: actorLevel ?? null,
    completedAt,
    provenance: { source: 'player_declared', ...(preview ? { preview: true } : {}) },
  };
  const events = [];
  let ordinal = 0;
  const mint = (type, extra) => {
    const e = { ...base, type, ordinal, ...extra };
    e.eventId = eventIdOf({ surveyKind: base.surveyKind, scopeId: base.scopeId, transactionId, type, ordinal });
    ordinal += 1;
    return e;
  };
  // Immutable record of exactly what the player saw and chose. Text and approval status are frozen at completion.
  const answers = deepClone(payload.answers);
  for (const [qid, a] of Object.entries(answers)) {
    const d = answerDetails[qid];
    if (d) Object.assign(a, { text: d.text, editorialStatus: d.editorialStatus, mechanicsStatus: d.mechanicsStatus });
  }
  // tagEvidence holds ONLY certified, ontology-validated entries supplied by the (future) certified mapping boundary.
  // It is never derived from text. Empty today: surveys contribute no tag evidence until mappings are certified.
  const completed = mint(EVENT_TYPES.SURVEY_COMPLETED, { lane: LANES.DECLARED_FUTURE_GOAL, evidenceChannel: 'completed_survey_development_preference', answers, tagEvidence: deepClone(tagEvidence) });
  // A retake of the same survey scope supersedes the previous completion; it never edits it.
  const prior = reduceLedger(existingEvents, { includePreview: preview }).latestSurvey[`${base.surveyKind}:${base.scopeId}`];
  if (prior) completed.supersedes = prior.eventId;
  events.push(completed);

  const activeGoals = reduceLedger([...existingEvents], { includePreview: preview }).goals;
  for (const g of goals) {
    if (!g?.goalLane || !g.target?.type) continue;
    const priorGoal = activeGoals[g.goalLane];
    const type = priorGoal ? EVENT_TYPES.GOAL_REVISION : EVENT_TYPES.GOAL_DECLARATION;
    const e = mint(type, { lane: LANES.DECLARED_FUTURE_GOAL, goalLane: g.goalLane, target: deepClone(g.target), questionId: g.questionId, optionId: g.optionId, ...(g.quote ? { quote: g.quote } : {}) });
    if (priorGoal) e.supersedes = priorGoal.eventId;
    events.push(e);
  }
  return events;
}

/** Append-only merge. Events whose id already exists are ignored (duplicate finalize is a no-op). */
export function mergeEvents(existing, incoming) {
  const out = [...(existing || [])];
  const seen = new Set(out.map((e) => e.eventId));
  const appended = [];
  const duplicates = [];
  for (const e of incoming || []) {
    if (seen.has(e.eventId)) { duplicates.push(e.eventId); continue; }
    seen.add(e.eventId);
    out.push(e);
    appended.push(e);
  }
  return { events: out, appended, duplicates };
}

/** Defensive check used by the finalizer and tests: `next` must be `prev` plus appended events, nothing edited. */
export function isAppendOnly(prev, next) {
  if (next.length < prev.length) return false;
  return prev.every((e, i) => JSON.stringify(e) === JSON.stringify(next[i]));
}

/**
 * The finalizer's only entry point. Returns a `set` patch for the atomic update map, or {} when there is nothing to
 * commit. Nothing is written until the finalizer runs, so cancel/fail leaves no ledger change.
 * @param {object} actor
 * @param {object[]} newEvents events already built by buildCompletionEvents / the reflection engine
 */
export function buildLedgerSetPatch(actor, newEvents) {
  const existing = readLedger(actor);
  const { events, appended } = mergeEvents(existing, newEvents);
  if (!appended.length) return {};
  if (!isAppendOnly(existing, events)) throw new Error('mentor survey ledger must be append-only');
  return { [LEDGER_SET_PATH]: events };
}
