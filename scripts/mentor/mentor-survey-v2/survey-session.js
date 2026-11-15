/**
 * Mentor Survey V2: pure draft state machine.
 *
 * Draft state lives ONLY in the progression session. Nothing here touches an actor, a flag or a document.
 * All functions are pure: they return a new draft and never mutate their input.
 *
 * Guarantees (see traceability SV-03, SV-11, SV-13, SV-29):
 *  - Navigation (back, paging, browsing, reading) never records an answer or intent.
 *  - Skipping a question or the survey records nothing.
 *  - Replayed or duplicate actions (actionSeq <= draft.actionSeq) are ignored.
 *  - When an upstream input or answer changes, dependent answers are moved to `invalidated` with their previous
 *    optionId. They are never silently replaced; the player may re-confirm the previous option if it is still offered.
 *  - Deterministic: the same inputs always produce the same revisions.
 */
import { deepClone, revisionOf } from './contract.js';

export const DRAFT_STATUS = Object.freeze({
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  CANCELED: 'canceled',
});

const pick = (obj, keys) => Object.fromEntries((keys || []).map((k) => [k, obj?.[k] ?? null]));

/**
 * @typedef {object} Flow
 * @property {string} surveyKind
 * @property {string} scopeId
 * @property {number} definitionVersion
 * @property {string[]} questions ordered question ids
 * @property {Record<string,{inputs?:string[],after?:string[]}>} deps
 *   `inputs`: context keys the question's option selection depends on; `after`: earlier questions whose answers it depends on.
 */

export function createDraft(flow, context = {}) {
  return {
    surveyKind: flow.surveyKind,
    scopeId: flow.scopeId,
    definitionVersion: flow.definitionVersion,
    status: DRAFT_STATUS.IN_PROGRESS,
    context: deepClone(context),
    answers: {},
    invalidated: {},
    skipped: {},
    browse: {},
    cursor: flow.questions[0],
    trail: [flow.questions[0]],
    revisit: false, // true while the player is looking at an already-resolved question
    actionSeq: 0,
  };
}

/** Revision of everything that selected a question's options (context inputs + upstream answers). */
export function questionRevision(flow, draft, qid) {
  const dep = flow.deps?.[qid] || {};
  return revisionOf({
    q: qid,
    inputs: pick(draft.context, dep.inputs),
    after: (dep.after || []).map((a) => draft.answers[a]?.optionId ?? null),
  });
}

const isOpen = (draft) => draft.status === DRAFT_STATUS.IN_PROGRESS;

function fresh(draft, seq) {
  if (!Number.isInteger(seq) || seq <= draft.actionSeq) return false;
  return true;
}

const unchanged = (draft) => ({ draft, applied: false });

function nextCursor(flow, draft, from) {
  const i = flow.questions.indexOf(from);
  for (let j = i + 1; j < flow.questions.length; j++) {
    const q = flow.questions[j];
    if (!draft.answers[q] && !draft.skipped[q]) return q;
  }
  return null; // nothing left to resolve
}

function enter(draft, qid) {
  draft.cursor = qid;
  if (qid && draft.trail[draft.trail.length - 1] !== qid) draft.trail.push(qid);
}

/** Select an option. `meta` carries resolver-supplied non-scoring facts (e.g. declared target ids). */
export function selectAnswer(flow, draft, qid, optionId, seq, meta = null) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  if (!flow.questions.includes(qid) || typeof optionId !== 'string' || !optionId) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.revisit = false;
  next.answers[qid] = { optionId, revision: questionRevision(flow, next, qid), ...(meta ? { meta: deepClone(meta) } : {}) };
  delete next.invalidated[qid];
  delete next.skipped[qid];
  // A changed answer can change downstream selection revisions: invalidate (do not replace) anything now stale.
  invalidateStale(flow, next);
  enter(next, nextCursor(flow, next, qid) ?? qid);
  return { draft: next, applied: true };
}

export function skipQuestion(flow, draft, qid, seq) {
  if (!isOpen(draft) || !fresh(draft, seq) || !flow.questions.includes(qid)) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.revisit = false;
  next.skipped[qid] = true;
  delete next.answers[qid]; // skipping after answering clears the answer; the previous option is not retained as intent
  invalidateStale(flow, next);
  enter(next, nextCursor(flow, next, qid) ?? qid);
  return { draft: next, applied: true };
}

/** Back navigation: moves the cursor only. Never alters answers. */
export function goBack(flow, draft, seq) {
  if (!isOpen(draft) || !fresh(draft, seq) || draft.trail.length < 2) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.trail.pop();
  next.cursor = next.trail[next.trail.length - 1];
  next.revisit = true;
  return { draft: next, applied: true };
}

/** Jump to an earlier question (revisit). Cursor only. */
export function goTo(flow, draft, qid, seq) {
  if (!isOpen(draft) || !fresh(draft, seq) || !flow.questions.includes(qid)) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.cursor = qid;
  next.revisit = true;
  const at = next.trail.lastIndexOf(qid);
  next.trail = at >= 0 ? next.trail.slice(0, at + 1) : [...next.trail, qid];
  return { draft: next, applied: true };
}

/**
 * Record paging/browsing state (seen ids, page index). Navigation only: records no answer and no intent.
 * The browse snapshot is keyed to the question revision so a context change rebuilds it.
 */
export function recordBrowse(flow, draft, qid, state, seq) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.browse[qid] = { revision: questionRevision(flow, next, qid), seenIds: [...new Set(state?.seenIds || [])], pageIndex: Math.max(0, state?.pageIndex | 0) };
  return { draft: next, applied: true };
}

/** Current browse state for a question, or null if it belongs to a stale revision. */
export function getBrowse(flow, draft, qid) {
  const b = draft.browse[qid];
  return b && b.revision === questionRevision(flow, draft, qid) ? b : null;
}

/** Replace context inputs. Dependent answers become `invalidated`; nothing is silently replaced. */
export function updateContext(flow, draft, patch, seq) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  const next = deepClone(draft);
  next.context = { ...next.context, ...deepClone(patch) };
  if (revisionOf(next.context) === revisionOf(draft.context)) return unchanged(draft);
  next.actionSeq = seq;
  invalidateStale(flow, next);
  return { draft: next, applied: true };
}

/** Walk questions in order so invalidation cascades (an invalidated upstream answer changes downstream revisions). */
function invalidateStale(flow, draft) {
  for (const qid of flow.questions) {
    const a = draft.answers[qid];
    if (a && a.revision !== questionRevision(flow, draft, qid)) {
      draft.invalidated[qid] = { reason: 'upstream_changed', previousOptionId: a.optionId };
      delete draft.answers[qid];
    }
    const b = draft.browse[qid];
    if (b && b.revision !== questionRevision(flow, draft, qid)) delete draft.browse[qid];
  }
}

/**
 * Re-confirm a previously invalidated answer. Allowed only if the caller states the option is still offered
 * (by stable optionId) in the new context. This is the only way an invalidated answer returns.
 */
export function reconfirmInvalidated(flow, draft, qid, stillOfferedOptionIds, seq) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  const prev = draft.invalidated[qid];
  if (!prev || !(stillOfferedOptionIds || []).includes(prev.previousOptionId)) return unchanged(draft);
  return selectAnswer(flow, draft, qid, prev.previousOptionId, seq);
}

export function isComplete(flow, draft) {
  return flow.questions.every((q) => draft.answers[q] || draft.skipped[q]);
}

/** Mark completed. Invalidated answers block completion: they must be re-answered, re-confirmed or skipped. */
export function complete(flow, draft, seq) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  if (Object.keys(draft.invalidated).length) return unchanged(draft);
  if (!isComplete(flow, draft)) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.status = DRAFT_STATUS.COMPLETED;
  return { draft: next, applied: true };
}

/** Skip the whole survey. Records nothing: a skipped draft produces no commit payload. */
export function skipSurvey(flow, draft, seq) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.status = DRAFT_STATUS.SKIPPED;
  next.answers = {};
  next.invalidated = {};
  return { draft: next, applied: true };
}

/** Cancel: the draft becomes inert. */
export function cancel(flow, draft, seq) {
  if (!isOpen(draft) || !fresh(draft, seq)) return unchanged(draft);
  const next = deepClone(draft);
  next.actionSeq = seq;
  next.status = DRAFT_STATUS.CANCELED;
  next.answers = {};
  next.invalidated = {};
  return { draft: next, applied: true };
}

/**
 * The only thing the finalizer may persist from a draft. Non-completed drafts (in progress, skipped, canceled)
 * return null: they have no durable effect.
 */
export function toCommitPayload(flow, draft) {
  if (!draft || draft.status !== DRAFT_STATUS.COMPLETED) return null;
  return {
    surveyKind: draft.surveyKind,
    scopeId: draft.scopeId,
    definitionVersion: draft.definitionVersion,
    contextRevision: revisionOf(draft.context),
    answers: Object.fromEntries(
      flow.questions.filter((q) => draft.answers[q]).map((q) => [q, { optionId: draft.answers[q].optionId, ...(draft.answers[q].meta ? { meta: draft.answers[q].meta } : {}) }]),
    ),
  };
}
