/**
 * Generic survey controller: the whole survey lifecycle as plain, injectable logic (no Foundry globals), so skip,
 * cancel, back, dependent-answer invalidation, duplicate submission, retake and the commit record can be tested
 * offline. The progression step is a thin wrapper that renders view() and forwards actions here.
 *
 * Survey-specific behavior (which question is asked, how options are chosen, what an answer declares) lives in an
 * ADAPTER: l1-controller.js and multiclass-controller.js. Nothing in this file knows a particular survey.
 *
 * Adapter contract:
 *   kind                                   survey kind id ('l1' | 'multiclass' | ...)
 *   pagedQuestions                         question ids that offer "show me more" paging
 *   autoSkipReasons                        resolver reasons that mean "cannot be asked" (skipped, never invented)
 *   buildRecordIndex(pack)                 Map id -> selectable record
 *   normalize(rawCtx)                      -> { ctx, scopeKey, scopeId } | null  (null = no survey for this context)
 *   createFlow(ctx)                        -> flow for survey-session
 *   availability({pack, manifest, ctx, preview})
 *   resolveQuestion({pack, draft, qid, ctx, archetypeLookup, preview, pageIndex})
 *   selectionMeta(pack, qid, optionId, records)
 *   browseSeen(pack, draft, qid, nextPage, ctx, archetypeLookup)
 *   goals(pack, draft, ctx)                explicit affirmative declarations only
 *   typed(pack, draft, ctx)                typed, non-goal facts recorded on the completion event
 *
 * Persistence: this controller owns only the DRAFT, serialized into progressionSession.draftSelections.mentorSurvey.
 * Nothing reaches the actor until the progression finalizer calls buildSurveyLedgerPatch (finalization.js).
 */
import * as Session from './survey-session.js';
import { mapResponseToIntent, MAPPING_STATUS } from './tag-boundary.js';
import { EDITORIAL_STATUS } from './contract.js';

export class SurveyController {
  /**
   * @param {object} adapter survey-specific behavior
   * @param {object} deps { pack, manifest, archetypeLookup, preview?:boolean }
   * @param {object|null} stored value previously serialized into draftSelections.mentorSurvey
   */
  constructor(adapter, deps, stored = null) {
    this.adapter = adapter;
    this.pack = deps.pack;
    this.manifest = deps.manifest;
    this.lookup = deps.archetypeLookup;
    this.preview = deps.preview === true;
    this.index = adapter.buildRecordIndex(deps.pack);
    this._stored = stored;
    this.scopeKey = null;
    this.draft = null;
    this.committed = null;
    this.ctx = null;
    this.runtime = null; // live, non-persisted inputs (e.g. finalized evidence); only their revisions enter the draft context
    this.flow = null;
    this.availability = { available: false, reason: 'not_synced' };
  }

  /** Bind (or rebind) the live context. A changed input invalidates dependents without replacing them. */
  sync(rawCtx) {
    const n = this.adapter.normalize(rawCtx);
    if (!n) { this.flow = null; this.ctx = rawCtx; this.availability = { available: false, reason: 'not_applicable' }; return this; }
    const { ctx, scopeKey, scopeId } = n;
    this.runtime = n.runtime ?? null;
    this.scopeKey = scopeKey;
    this.availability = this.adapter.availability({ pack: this.pack, manifest: this.manifest, ctx, preview: this.preview });
    this.ctx = ctx;
    if (!this.availability.available) { this.flow = null; return this; }
    this.flow = this.adapter.createFlow(ctx);
    const stored = this._stored;
    if (this.draft === null && stored?.drafts?.[scopeKey]) { this.draft = stored.drafts[scopeKey]; this.committed = stored.committed?.[scopeKey] ?? null; }
    if (!this.draft || this.draft.scopeId !== scopeId || this.draft.definitionVersion !== this.flow.definitionVersion) {
      // A different scope (another class) is a different survey: start clean. No silent reuse of another scope's answers.
      this.draft = Session.createDraft(this.flow, ctx);
      this.committed = null;
    } else if (this.draft.status === Session.DRAFT_STATUS.IN_PROGRESS || this.draft.status === Session.DRAFT_STATUS.COMPLETED) {
      const r = Session.updateContext(this.flow, this.draft, ctx, this.draft.actionSeq + 1);
      if (r.applied) { this.draft = r.draft; if (this.committed) { this.committed = null; this.draft = reopened(this.draft); } }
    }
    return this;
  }

  get seq() { return (this.draft?.actionSeq ?? 0) + 1; }

  _resolve(qid, pageIndex) {
    return this.adapter.resolveQuestion({ pack: this.pack, draft: this.draft, qid, ctx: this.ctx, archetypeLookup: this.lookup, preview: this.preview, pageIndex, runtime: this.runtime });
  }

  _pageIndex(qid) { return Session.getBrowse(this.flow, this.draft, qid)?.pageIndex ?? 0; }

  /** Questions that cannot be asked are skipped, never invented. */
  _autoSkip() {
    for (let guard = 0; guard < 10 && this.draft.status === Session.DRAFT_STATUS.IN_PROGRESS; guard++) {
      const qid = this.draft.cursor;
      if (!qid || this.draft.answers[qid] || this.draft.skipped[qid]) break;
      const r = this._resolve(qid, 0);
      if (r.available || !this.adapter.autoSkipReasons.includes(r.reason)) break;
      this.draft = Session.markUnaskable(this.draft, qid);
    }
  }

  /**
   * Skip every still-unresolved question that cannot be asked. A question that is BLOCKED AT THE SOURCE is skipped at any
   * time. A question that merely lacks an upstream answer (needs_q1, not_applicable, ...) is skipped only once every
   * earlier question is resolved: before that, the upstream answer may still arrive and make it askable.
   */
  _autoSkipAll() {
    const STABLE = ['blocked_source'];
    for (let pass = 0; pass < this.flow.questions.length; pass++) {
      let changed = false;
      for (const [i, qid] of this.flow.questions.entries()) {
        if (this.draft.answers[qid] || this.draft.skipped[qid] || this.draft.status !== Session.DRAFT_STATUS.IN_PROGRESS) continue;
        const r = this._resolve(qid, 0);
        if (r.available || !this.adapter.autoSkipReasons.includes(r.reason)) continue;
        const earlierResolved = this.flow.questions.slice(0, i).every((q) => this.draft.answers[q] || this.draft.skipped[q]);
        if (STABLE.includes(r.reason) || earlierResolved) { this.draft = Session.markUnaskable(this.draft, qid); changed = true; }
      }
      if (!changed) break;
    }
  }

  /** What the step renders. Contains only allow-listed player-visible fields plus the action token. */
  view() {
    if (!this.availability.available) return { phase: 'unavailable', reason: this.availability.reason };
    if (this.draft.status === Session.DRAFT_STATUS.SKIPPED || this.draft.status === Session.DRAFT_STATUS.CANCELED) return { phase: 'skipped', seq: this.seq };
    this._autoSkipAll();
    const total = this.flow.questions.length;
    const resolved = this.flow.questions.filter((q) => this.draft.answers[q] || this.draft.skipped[q]).length;
    const progress = { answered: Object.keys(this.draft.answers).length, resolved, total };
    if (this.draft.status === Session.DRAFT_STATUS.COMPLETED) return { phase: 'complete', seq: this.seq, progress, committed: Boolean(this.committed), preview: this.preview };
    const unresolved = this.flow.questions.filter((q) => !this.draft.answers[q] && !this.draft.skipped[q]);
    const revisiting = this.draft.revisit === true && this.flow.questions.includes(this.draft.cursor);
    if (!revisiting && !unresolved.length && !Object.keys(this.draft.invalidated).length) return { phase: 'ready', seq: this.seq, progress, preview: this.preview };
    const cursorOpen = this.draft.cursor && !this.draft.answers[this.draft.cursor] && !this.draft.skipped[this.draft.cursor];
    // A question whose answer was invalidated by an upstream change is surfaced first, so the player sees the notice and
    // the reconfirm option before moving on.
    const stale = this.flow.questions.find((q) => this.draft.invalidated[q]);
    const qid = revisiting ? this.draft.cursor : (stale || (cursorOpen ? this.draft.cursor : unresolved[0]));
    const r = this._resolve(qid, this._pageIndex(qid));
    if (!r.available) return { phase: 'unavailable', reason: r.reason };
    const prev = this.draft.invalidated[qid]?.previousOptionId ?? null;
    return {
      phase: 'question', seq: this.seq, progress, preview: this.preview, questionNumber: Number(String(qid).match(/\d/)[0]) || null, // q0 (the optional origin lens) carries no number
      view: r.view, canGoBack: this.draft.trail.length > 1, selectedOptionId: this.draft.answers[qid]?.optionId ?? null,
      reconfirm: prev && r.view.options.some((o) => o.optionId === prev) ? { optionId: prev } : null,
      staleNotice: prev ? 'An earlier choice changed, so this question needs a fresh answer.' : null,
    };
  }

  _apply(result) { if (result.applied) this.draft = result.draft; return result.applied; }

  choose(qid, optionId, seq) {
    if (!this.flow || this.draft.status !== Session.DRAFT_STATUS.IN_PROGRESS) return false;
    const r = this._resolve(qid, this._pageIndex(qid));
    if (!r.available || !r.records.some((x) => x.id === optionId)) return false; // only an offered option can be chosen
    return this._apply(Session.selectAnswer(this.flow, this.draft, qid, optionId, seq, this.adapter.selectionMeta(this.pack, qid, optionId, r.records)));
  }

  /**
   * Multi-select stages (e.g. Q6 NOT/AM): choose zero or more of the OFFERED options. The adapter re-validates the whole
   * selection (including the shared reflection engine's caps and contradiction rules) and supplies trusted meta.
   */
  chooseMany(qid, ids, seq) {
    if (!this.flow || this.draft.status !== Session.DRAFT_STATUS.IN_PROGRESS || !this.adapter.multiSelectQuestions?.includes(qid)) return false;
    const r = this._resolve(qid, 0);
    if (!r.available || !Array.isArray(ids)) return false;
    const picked = [...new Set(ids)].sort();
    const meta = this.adapter.selectionMetaMany({ pack: this.pack, draft: this.draft, qid, ids: picked, records: r.records, ctx: this.ctx, runtime: this.runtime, archetypeLookup: this.lookup });
    if (!meta) return false;
    return this._apply(Session.selectAnswer(this.flow, this.draft, qid, `multi:${picked.join('|') || 'none'}`, seq, meta));
  }

  /** "Other possibilities / other approaches": navigation only. Records no answer and no intent. */
  more(qid, seq) {
    if (!this.flow || !this.adapter.pagedQuestions.includes(qid)) return false;
    const next = this._pageIndex(qid) + 1;
    const r = this._resolve(qid, next - 1);
    if (!r.available || !r.view.page?.hasMore) return false;
    const seen = this.adapter.browseSeen(this.pack, this.draft, qid, next, this.ctx, this.lookup);
    return this._apply(Session.recordBrowse(this.flow, this.draft, qid, { seenIds: seen, pageIndex: next }, seq));
  }

  /** Browse back to the previous page of a paged question. Navigation only; records no answer and no intent. */
  previous(qid, seq) {
    if (!this.flow || !this.adapter.pagedQuestions.includes(qid)) return false;
    const prev = this._pageIndex(qid) - 1;
    if (prev < 0 || !this._resolve(qid, prev).available) return false;
    const seen = this.adapter.browseSeen(this.pack, this.draft, qid, prev, this.ctx, this.lookup);
    return this._apply(Session.recordBrowse(this.flow, this.draft, qid, { seenIds: seen, pageIndex: prev }, seq));
  }

  skipQuestion(qid, seq) { return this.flow ? this._apply(Session.skipQuestion(this.flow, this.draft, qid, seq)) : false; }

  /** Revisit an earlier question (e.g. from the review screen). Cursor only; no answer changes. */
  goTo(qid, seq) { return this.flow ? this._apply(Session.goTo(this.flow, this.draft, qid, seq)) : false; }
  back(seq) { return this.flow ? this._apply(Session.goBack(this.flow, this.draft, seq)) : false; }

  reconfirm(qid, seq) {
    const v = this.view();
    if (v.phase !== 'question' || v.view.questionId !== qid || !v.reconfirm) return false;
    const r = this._resolve(qid, this._pageIndex(qid));
    const offered = r.records.map((rec) => ({ optionId: rec.id, meta: this.adapter.selectionMeta(this.pack, qid, rec.id, r.records) }));
    return this._apply(Session.reconfirmInvalidated(this.flow, this.draft, qid, offered, seq));
  }

  /** Skip the whole survey: no answers, no commit. */
  skipSurvey(seq) {
    if (!this.flow) return false;
    this.committed = null;
    return this._apply(Session.skipSurvey(this.flow, this.draft, seq));
  }

  /** Cancel: the draft becomes inert and nothing can be committed from it. */
  cancel(seq) {
    if (!this.flow) return false;
    this.committed = null;
    return this._apply(Session.cancel(this.flow, this.draft, seq));
  }

  /** Finish the survey and stage its commit record in the session (still nothing on the actor). */
  finish(seq) {
    if (!this.flow || !(Number.isInteger(seq) && seq > this.draft.actionSeq)) return null; // stale or replayed token: ignored
    this._autoSkipAll(); // internal bookkeeping advances the counter; the caller's token was validated above
    if (!this._apply(Session.complete(this.flow, this.draft, this.draft.actionSeq + 1))) return null;
    const payload = Session.toCommitPayload(this.flow, this.draft);
    const answerDetails = {}; const tagEvidence = [];
    for (const [qid, a] of Object.entries(payload.answers)) {
      if (String(a.optionId).startsWith('multi:')) { // multi-select stage: freeze the exact statements the player saw and chose
        answerDetails[qid] = { text: (a.meta?.texts || []).join(' | '), texts: a.meta?.texts || [], editorialStatus: 'draft_text', mechanicsStatus: 'none' };
        continue;
      }
      const rec = this.index.get(a.optionId);
      if (!rec && typeof a.meta?.shownText === 'string') { // an answer whose text was composed from the player's own recorded goal: freeze exactly what was shown
        answerDetails[qid] = { text: a.meta.shownText, editorialStatus: 'draft_text', mechanicsStatus: 'none' };
        continue;
      }
      if (!rec) continue;
      answerDetails[qid] = { text: rec.text, editorialStatus: rec.editorialStatus, mechanicsStatus: rec.mechanicsStatus };
      // Certified mapping boundary: inert today, so this adds nothing. Only an explicit "mapped" result can add evidence.
      const m = mapResponseToIntent(rec, { surveyKind: this.adapter.kind, questionId: qid });
      if (m.status === MAPPING_STATUS.MAPPED) for (const e of m.intent?.tagEvidence || []) tagEvidence.push({ ...e, questionId: qid });
    }
    const coverage = this._coverage(payload);
    const draftContent = Object.values(answerDetails).some((d) => d.editorialStatus !== EDITORIAL_STATUS.APPROVED);
    this.committed = {
      surveyKind: this.adapter.kind, scopeId: this.draft.scopeId, scopeKey: this.scopeKey, classId: this.ctx.classId ?? this.ctx.destinationClassId ?? null,
      payload, answerDetails, tagEvidence, coverage,
      goals: this.adapter.goals(this.pack, this.draft, this.ctx),
      typed: this.adapter.typed(this.pack, this.draft, this.ctx),
      reflection: this.adapter.reflection?.({ pack: this.pack, draft: this.draft, ctx: this.ctx, runtime: this.runtime, archetypeLookup: this.lookup }) ?? null,
      preview: this.preview || draftContent, // any unapproved content makes the event a preview event
    };
    return this.committed;
  }

  /**
   * Honest completeness: a question skipped by the SYSTEM because its source is missing or unapproved is not "answered".
   * `not_applicable` is a designed branch (e.g. no second purpose for an undecided primary) and does not make a survey incomplete.
   */
  _coverage(payload) {
    const questions = {}; const unavailable = [];
    for (const qid of this.flow.questions) {
      if (payload.answers[qid]) { questions[qid] = 'answered'; continue; }
      const r = this._resolve(qid, 0);
      if (!r.available && this.adapter.autoSkipReasons.includes(r.reason)) {
        questions[qid] = `unavailable:${r.reason}`;
        if (r.reason !== 'not_applicable' && !unavailable.some((u) => u.questionId.match(/\d/)[0] === qid.match(/\d/)[0])) unavailable.push({ questionId: qid, reason: r.reason }); // inner stages (q6n, q6a) report under their question
      } else questions[qid] = 'skipped_by_player';
    }
    return { complete: unavailable.length === 0, questions, unavailable };
  }

  /** Change answers after finishing: reopens the draft and withdraws the staged commit. */
  reopen() {
    if (!this.draft || this.draft.status !== Session.DRAFT_STATUS.COMPLETED) return false;
    this.committed = null; this.draft = reopened(this.draft); return true;
  }

  /** Start over. Prior COMMITTED events stay in the ledger (retakes supersede them at finalization). */
  retake() {
    if (!this.flow) return false;
    this.committed = null;
    this.draft = Session.createDraft(this.flow, this.ctx);
    return true;
  }

  /** This controller's single entry (scope key, draft, staged commit). The step merges it into the shared session value. */
  entry() {
    if (!this.draft || !this.scopeKey) return null;
    return { scopeKey: this.scopeKey, draft: this.draft, committed: this.committed };
  }

  /** The session value containing only this controller's entry ({drafts, committed} keyed by scope). */
  serialize() {
    const e = this.entry();
    return e ? mergeIntoSessionValue(null, e) : null;
  }
}

function reopened(draft) { return { ...draft, status: Session.DRAFT_STATUS.IN_PROGRESS, actionSeq: draft.actionSeq + 1 }; }

/** Merge one controller's entry into the shared session value without touching other surveys' entries. */
export function mergeIntoSessionValue(current, entry) {
  const next = { drafts: { ...(current?.drafts || {}) }, committed: { ...(current?.committed || {}) } };
  if (!entry) return next;
  next.drafts[entry.scopeKey] = entry.draft;
  if (entry.committed) next.committed[entry.scopeKey] = entry.committed; else delete next.committed[entry.scopeKey];
  return next;
}
