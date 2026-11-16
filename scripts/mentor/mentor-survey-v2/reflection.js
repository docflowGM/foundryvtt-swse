/**
 * Mentor Survey V2: shared Mentor Reflection / correction engine (Multiclass Q6, Prestige Q6, later Talk to Mentor).
 *
 * Pure and Mentor-agnostic: it holds no dialogue. Mentor voice (openings, closings, clause text, first-person A to E
 * and correction statements) is supplied by content keyed to stable ids.
 *
 * Contract (docs/design/mentor-survey-v2/01-SHARED-ARCHITECTURE-CONTRACT.md section 10):
 *  - The reading is FROZEN: current identity (exact canonical ids or "unresolved"), up to three real observations,
 *    the previously declared goal quoted separately (or honest absence), optional grounded relationship, and goal
 *    fulfillment only if a typed class goal equals finalized class state.
 *  - Calibration A to E. A is a no-op. B and C are targeted. D and E require BOTH a NOT stage and an AM stage.
 *  - NOT may only reject INFERENCES shown in the frozen reading. Owned facts and declared goals are not rejectable.
 *  - A correction amends the inference record only. It cannot change owned mechanics, goals or legality, and it carries
 *    no negative weight.
 */
import { CALIBRATION_IDS, EVENT_TYPES, LANES, hashString, revisionOf, stableStringify } from './contract.js';
import { selectObservations, allFactsGrounded } from './actor-evidence.js';
import { GOAL_TARGET_TYPES, reduceLedger, eventIdOf } from './intent-ledger.js';

/** The ten inference claim kinds of the Pass B correction library (the only things a player may reject). */
export const CLAIM_KINDS = Object.freeze([
  'archetype_parent', 'archetype_specialization', 'role_inference', 'method_preference', 'mechanical_theme_identity',
  'past_to_present_trend', 'goal_relationship', 'motivation_inference', 'unresolved_reading_disagreement', 'overconfidence',
]);

/** Max interpretations SHOWN in the NOT stage per calibration answer (design: B 1-2, C 1-3, D 3-5, E 5-7). Caps only. */
export const NOT_CAPS = Object.freeze({ A: 0, B: 2, C: 3, D: 5, E: 7 });
export const REQUIRES_AM = Object.freeze({ A: false, B: false, C: false, D: true, E: true });
export const MAX_OBSERVATIONS = 3;
/** Which declared goal a reading quotes when several are active (the long-term ambition outranks the career aspiration). */
export const GOAL_LANE_PRIORITY = Object.freeze(['prestige.goal', 'l1.long_term_ambition', 'l1.career', 'l1.specialization']);

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); }
  return o;
};

/** The single goal a survey shows or quotes when several are active: fixed lane priority, then lane name. Superseded goals are already gone from `goals`. */
export function pickActiveGoal(goals) {
  const active = Object.values(goals || {}).sort((a, b) => (GOAL_LANE_PRIORITY.indexOf(a.goalLane) + 1 || 99) - (GOAL_LANE_PRIORITY.indexOf(b.goalLane) + 1 || 99) || a.goalLane.localeCompare(b.goalLane));
  return active.length ? active[0] : null;
}

/**
 * Typed, provenance-backed display of an ACTIVE declared goal: a canonical label when the typed target resolves exactly in the
 * authoritative registry, else the player's exact affirmed words (quoted), else null. Never inflected, never generated, never
 * written back as a goal. `source` says which it was so tests and the ledger can see.
 */
export function goalDisplay(goal, archetypeLookup) {
  if (!goal) return null;
  const t = goal.target || {};
  if ((t.type === GOAL_TARGET_TYPES.ARCHETYPE_PARENT || t.type === GOAL_TARGET_TYPES.ARCHETYPE_SPECIALIZATION) && t.id) {
    const rec = archetypeLookup?.(t.id);
    const kind = t.type === GOAL_TARGET_TYPES.ARCHETYPE_PARENT ? 'parent' : 'specialization';
    if (rec && rec.kind === kind && typeof rec.name === 'string' && rec.name.trim()) return { source: 'canonical', text: rec.name.trim(), eventId: goal.eventId, goalLane: goal.goalLane };
  }
  const quote = typeof goal.quote === 'string' ? goal.quote.trim() : '';
  if (quote) return { source: 'quote', text: `\u201c${quote}\u201d`, eventId: goal.eventId, goalLane: goal.goalLane };
  return null; // an unresolvable identity with no affirmed words is not displayed
}

/* ---------------------------------------------------------------------------------------------- */
/* Goal fulfillment                                                                                */
/* ---------------------------------------------------------------------------------------------- */

/** A goal is fulfilled only when its typed class target is among FINALIZED class ownership. Never inferred. */
export function verifyGoalFulfillment(goalEvent, classLevels) {
  if (goalEvent?.target?.type !== GOAL_TARGET_TYPES.CLASS || !goalEvent.target.id) return { fulfilled: false, reason: 'goal_not_a_typed_class' };
  const owned = Number(classLevels?.[goalEvent.target.id]) > 0;
  return owned ? { fulfilled: true, reason: 'class_owned', classId: goalEvent.target.id } : { fulfilled: false, reason: 'class_not_owned' };
}

/* ---------------------------------------------------------------------------------------------- */
/* Reading                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

/**
 * @param {object} p
 * @param {string} p.surveyKind 'multiclass' | 'prestige' | 'talk'
 * @param {string} p.scopeId
 * @param {object} p.projection  actor-evidence projection of FINALIZED state
 * @param {object[]} p.events    committed ledger events (read-only; used to quote the declared goal)
 * @param {Array<{claimId:string,claimKind:string,canonicalRef?:{id:string,kind:'parent'|'specialization',parentId?:string},groundedBy?:string[]}>} p.claims
 *   inferences supplied by the existing identity authority. Validated here.
 * @param {Array<{candidateId:string,canonicalRef:{id:string,kind:string}}>} [p.amCandidates]
 * @param {(id:string)=>object|null} p.archetypeLookup  ArchetypeRegistry.getArchetype
 * @param {string} p.actorRevision revision key of the finalized actor state
 */
export function createReading({ surveyKind, scopeId, projection, events = [], claims = [], amCandidates = [], archetypeLookup, actorRevision }) {
  const problems = [];
  const accepted = [];
  for (const c of claims) {
    if (!CLAIM_KINDS.includes(c.claimKind)) { problems.push(`${c.claimId}: unknown claimKind`); continue; }
    if (c.canonicalRef) {
      const rec = archetypeLookup?.(c.canonicalRef.id);
      const kindOk = rec && rec.kind === c.canonicalRef.kind;
      const parentOk = c.canonicalRef.kind !== 'specialization' || rec?.parentId === c.canonicalRef.parentId;
      if (!kindOk || !parentOk) { problems.push(`${c.claimId}: canonicalRef does not resolve exactly`); continue; }
    }
    if (c.groundedBy && !allFactsGrounded(projection, c.groundedBy)) { problems.push(`${c.claimId}: cites a fact the actor does not have`); continue; }
    accepted.push({ claimId: c.claimId, claimKind: c.claimKind, inference: true, ...(c.canonicalRef ? { canonicalRef: { ...c.canonicalRef } } : {}), groundedBy: [...(c.groundedBy || [])] });
  }
  const identity = accepted.find((c) => c.claimKind === 'archetype_specialization') || accepted.find((c) => c.claimKind === 'archetype_parent') || null;

  const evidence = selectObservations(projection, { max: MAX_OBSERVATIONS });
  const { goals } = reduceLedger(events);
  // Deterministic goal choice: fixed lane priority, then lane name. The goal is quoted separately, never merged with identity.
  const goal = pickActiveGoal(goals);
  const fulfillment = goal ? verifyGoalFulfillment(goal, projection.classLevels) : { fulfilled: false, reason: 'no_declared_goal' };

  const am = [];
  for (const a of amCandidates) {
    if (a.free === true && !a.canonicalRef) { am.push({ candidateId: a.candidateId, free: true }); continue; } // plain-language self-description, no archetype claimed
    const rec = archetypeLookup?.(a.canonicalRef?.id);
    if (rec && rec.kind === a.canonicalRef.kind) am.push({ candidateId: a.candidateId, canonicalRef: { ...a.canonicalRef } });
    else problems.push(`${a.candidateId}: AM candidate does not resolve exactly`);
  }

  const body = {
    surveyKind, scopeId, actorRevision,
    identity: identity ? { claimId: identity.claimId, canonicalRef: identity.canonicalRef } : { status: 'unresolved' },
    claims: accepted,
    evidence: evidence.map((f) => ({ factId: f.factId, kind: f.kind, canonicalId: f.canonicalId, label: f.label, source: f.source })),
    evidenceState: evidence.length === 0 ? 'none' : evidence.length < MAX_OBSERVATIONS ? 'thin' : 'full',
    goal: goal ? { eventId: goal.eventId, goalLane: goal.goalLane, target: goal.target, quote: goal.quote ?? null } : null,
    goalDeclared: Boolean(goal),
    fulfillment,
    amCandidates: am,
  };
  const reading = { readingId: `reading.${hashString(stableStringify(body))}`, ...body, rejected: problems };
  return deepFreeze(reading);
}

export const inferenceClaims = (reading) => reading.claims.filter((c) => c.inference === true);

/* ---------------------------------------------------------------------------------------------- */
/* Calibration state machine (pure)                                                                */
/* ---------------------------------------------------------------------------------------------- */

export function beginCalibration(reading) {
  return { readingId: reading.readingId, stage: 'choose', choice: null, notShown: [], amShown: [], notSelected: [], amSelected: [], ok: true };
}

const bad = (state, reason) => ({ ...state, ok: false, error: reason });

export function chooseCalibration(reading, state, choice) {
  if (state.readingId !== reading.readingId || state.stage !== 'choose') return bad(state, 'wrong_stage');
  if (!CALIBRATION_IDS.includes(choice)) return bad(state, 'unknown_choice');
  if (choice === 'A') return { ...state, ok: true, choice, stage: 'done' };
  // Counts are caps: sparse evidence shows fewer real interpretations, never fabricated ones.
  const shown = inferenceClaims(reading).slice(0, NOT_CAPS[choice]).map((c) => c.claimId);
  return { ...state, ok: true, choice, stage: 'not', notShown: shown };
}

export function selectNot(reading, state, claimIds) {
  if (state.readingId !== reading.readingId || state.stage !== 'not') return bad(state, 'wrong_stage');
  const picked = [...new Set(claimIds || [])];
  // NOT may only reject inferences that were shown. Facts, goals and anything not shown are not rejectable.
  if (!picked.every((id) => state.notShown.includes(id))) return bad(state, 'not_a_shown_inference');
  if (REQUIRES_AM[state.choice]) {
    return { ...state, ok: true, notSelected: picked, stage: 'am', amShown: reading.amCandidates.map((a) => a.candidateId) };
  }
  return { ...state, ok: true, notSelected: picked, stage: 'done' };
}

export function selectAm(reading, state, candidateIds) {
  if (state.readingId !== reading.readingId || state.stage !== 'am') return bad(state, 'wrong_stage');
  const picked = [...new Set(candidateIds || [])];
  if (!picked.every((id) => state.amShown.includes(id))) return bad(state, 'not_a_shown_candidate');
  // The same canonical interpretation may not be rejected and affirmed in one pass without explicit reconciliation.
  const rejectedRefs = new Set(inferenceClaims(reading).filter((c) => state.notSelected.includes(c.claimId) && c.canonicalRef).map((c) => c.canonicalRef.id));
  const affirmedRefs = reading.amCandidates.filter((a) => picked.includes(a.candidateId) && a.canonicalRef).map((a) => a.canonicalRef.id);
  if (affirmedRefs.some((id) => rejectedRefs.has(id))) return bad(state, 'contradiction_needs_reconciliation');
  return { ...state, ok: true, amSelected: picked, stage: 'done' };
}

/** D and E cannot finish without passing through BOTH stages. */
export function finishCalibration(reading, state) {
  if (state.readingId !== reading.readingId || state.stage !== 'done' || !state.choice) return { ok: false, error: 'not_finished' };
  const noop = state.notSelected.length === 0 && state.amSelected.length === 0;
  return { ok: true, noop, choice: state.choice, rejectedClaimIds: [...state.notSelected], affirmedCandidateIds: [...state.amSelected] };
}

/* ---------------------------------------------------------------------------------------------- */
/* Events                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Build the ledger events for a finished reflection. A snapshot is always recorded (the exact frozen claims and the
 * player's A to E choice). A correction event is recorded only if the player rejected or affirmed something.
 * Both are INFERRED-IDENTITY lane events: they never touch goals, acquisitions or eligibility, and carry no weight.
 */
export function buildReflectionEvents({ reading, result, transactionId, actorLevel, completedAt, preview = false, existingEvents = [] }) {
  if (!result?.ok) return [];
  const base = {
    surveyKind: reading.surveyKind, scopeId: reading.scopeId, transactionId, actorLevel: actorLevel ?? null, completedAt,
    contextRevision: reading.actorRevision, lane: LANES.INFERRED_CURRENT_IDENTITY,
    provenance: { source: 'mentor_reflection', ...(preview ? { preview: true } : {}) },
  };
  let ordinal = 100; // distinct ordinal space from completion events in the same transaction
  const mint = (type, extra) => {
    const e = { ...base, type, ordinal, ...extra };
    e.eventId = eventIdOf({ surveyKind: base.surveyKind, scopeId: base.scopeId, transactionId, type, ordinal });
    ordinal += 1;
    return e;
  };
  const priorSnapshots = Object.values(reduceLedger(existingEvents, { includePreview: preview }).reflections)
    .filter((e) => e.surveyKind === base.surveyKind && e.scopeId === base.scopeId);
  const snapshot = mint(EVENT_TYPES.REFLECTION_SNAPSHOT, {
    readingId: reading.readingId, calibration: result.choice,
    reading: { identity: reading.identity, claims: reading.claims, evidence: reading.evidence, goal: reading.goal, fulfillment: reading.fulfillment, evidenceState: reading.evidenceState },
    semantics: 'interpretation_snapshot_only',
  });
  if (priorSnapshots.length) snapshot.supersedes = priorSnapshots[priorSnapshots.length - 1].eventId;
  const events = [snapshot];
  if (!result.noop) {
    events.push(mint(EVENT_TYPES.REFLECTION_CORRECTION, {
      readingId: reading.readingId, calibration: result.choice,
      rejectedClaimIds: result.rejectedClaimIds, affirmedCandidateIds: result.affirmedCandidateIds,
      // Explicit non-effects, asserted by tests and readers:
      semantics: 'interpretation_feedback_only', negativeWeight: false, mutatesMechanics: false, mutatesGoals: false, mutatesEligibility: false,
    }));
  }
  return events;
}

/** The only view of corrections a reader gets: ids, never weights. */
export function correctionsFor(events, surveyKind, scopeId) {
  return (events || []).filter((e) => e.type === EVENT_TYPES.REFLECTION_CORRECTION && e.surveyKind === surveyKind && e.scopeId === scopeId && !e.provenance?.preview)
    .map((e) => ({ readingId: e.readingId, rejectedClaimIds: e.rejectedClaimIds, affirmedCandidateIds: e.affirmedCandidateIds }));
}

export { revisionOf };
