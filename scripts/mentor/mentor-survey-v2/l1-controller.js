/**
 * Level 1 survey controller: the whole survey lifecycle as plain, injectable logic (no Foundry globals), so skip,
 * cancel, back, dependent-answer invalidation, duplicate submission, retake and the commit record can be tested
 * offline. The progression step is a thin wrapper that renders view() and forwards actions here.
 *
 * Persistence: this controller owns only the DRAFT, serialized into progressionSession.draftSelections.mentorSurvey.
 * Nothing reaches the actor until the progression finalizer calls buildSurveyLedgerPatch (finalization.js).
 */
import * as Session from './survey-session.js';
import { createL1Flow, l1Availability, resolveL1Question, l1SelectionMeta, l1GoalDeclarations, q2Page, q4Page } from './resolvers/l1.js';
import { mapResponseToIntent, MAPPING_STATUS } from './tag-boundary.js';
import { EDITORIAL_STATUS } from './contract.js';

export const L1_SCOPE_KEY = 'l1';

/** id -> record for every selectable L1 answer (reference data and navigation controls are not indexed). */
export function buildRecordIndex(pack) {
  const idx = new Map();
  const add = (r) => idx.set(r.id, r);
  Object.values(pack.q1).forEach((c) => c.options.forEach(add));
  Object.values(pack.q2.parents).forEach((p) => Object.values(p.byClass).forEach(add));
  Object.values(pack.q3).forEach((c) => Object.values(c.scenarios).forEach((s) => s.replies.forEach(add)));
  Object.values(pack.q4).forEach((p) => [...p.children, ...p.methods].forEach(add));
  Object.values(pack.q5).forEach((c) => c.options.forEach(add));
  return idx;
}

export class L1SurveyController {
  /**
   * @param {object} deps { pack, manifest, archetypeLookup, preview?:boolean }
   * @param {object|null} stored value previously serialized into draftSelections.mentorSurvey
   */
  constructor(deps, stored = null) {
    this.pack = deps.pack;
    this.manifest = deps.manifest;
    this.lookup = deps.archetypeLookup;
    this.preview = deps.preview === true;
    this.index = buildRecordIndex(deps.pack);
    this.draft = stored?.drafts?.[L1_SCOPE_KEY] ?? null;
    this.committed = stored?.committed?.[L1_SCOPE_KEY] ?? null;
    this.ctx = null;
    this.flow = null;
    this.availability = { available: false, reason: 'not_synced' };
  }

  /** Bind (or rebind) the live chargen context. A changed class/species invalidates dependents without replacing them. */
  sync({ classId, speciesKeys = [] }) {
    const cls = String(classId || '').toLowerCase();
    this.availability = l1Availability({ pack: this.pack, manifest: this.manifest, classId: cls, preview: this.preview });
    if (!this.availability.available) { this.flow = null; this.ctx = { classId: cls, speciesKeys }; return this; }
    this.flow = createL1Flow(cls);
    const ctx = { classId: cls, speciesKeys: [...speciesKeys].sort() };
    if (!this.draft || this.draft.scopeId !== cls || this.draft.definitionVersion !== this.flow.definitionVersion) {
      // A different class is a different survey: start clean. (No silent reuse of another class's answers.)
      this.draft = Session.createDraft(this.flow, ctx);
      this.committed = null;
    } else if (this.draft.status === Session.DRAFT_STATUS.IN_PROGRESS || this.draft.status === Session.DRAFT_STATUS.COMPLETED) {
      const r = Session.updateContext(this.flow, this.draft, ctx, this.draft.actionSeq + 1);
      if (r.applied) { this.draft = r.draft; if (this.committed) { this.committed = null; this.draft = reopened(this.draft); } }
    }
    this.ctx = ctx;
    return this;
  }

  get seq() { return (this.draft?.actionSeq ?? 0) + 1; }

  _resolve(qid, pageIndex) {
    return resolveL1Question({ pack: this.pack, draft: this.draft, qid, context: this.ctx, archetypeLookup: this.lookup, preview: this.preview, pageIndex });
  }

  _pageIndex(qid) { return Session.getBrowse(this.flow, this.draft, qid)?.pageIndex ?? 0; }

  /** Questions that cannot be asked because their upstream answer is absent are skipped, never invented. */
  _autoSkip() {
    for (let guard = 0; guard < 8 && this.draft.status === Session.DRAFT_STATUS.IN_PROGRESS; guard++) {
      const qid = this.draft.cursor;
      if (!qid || this.draft.answers[qid] || this.draft.skipped[qid]) break;
      const r = this._resolve(qid, 0);
      if (r.available || !['needs_q1', 'needs_q2'].includes(r.reason)) break;
      this.draft = Session.skipQuestion(this.flow, this.draft, qid, this.seq).draft;
    }
  }

  /** What the step renders. Contains only allow-listed player-visible fields plus the action token. */
  view() {
    if (!this.availability.available) return { phase: 'unavailable', reason: this.availability.reason };
    if (this.draft.status === Session.DRAFT_STATUS.SKIPPED || this.draft.status === Session.DRAFT_STATUS.CANCELED) return { phase: 'skipped', seq: this.seq };
    this._autoSkip();
    const total = this.flow.questions.length;
    const resolved = this.flow.questions.filter((q) => this.draft.answers[q] || this.draft.skipped[q]).length;
    const progress = { answered: Object.keys(this.draft.answers).length, resolved, total };
    if (this.draft.status === Session.DRAFT_STATUS.COMPLETED) return { phase: 'complete', seq: this.seq, progress, committed: Boolean(this.committed), preview: this.preview };
    const unresolved = this.flow.questions.filter((q) => !this.draft.answers[q] && !this.draft.skipped[q]);
    const revisiting = this.draft.revisit === true && this.flow.questions.includes(this.draft.cursor);
    if (!revisiting && !unresolved.length && !Object.keys(this.draft.invalidated).length) return { phase: 'ready', seq: this.seq, progress, preview: this.preview };
    const cursorOpen = this.draft.cursor && !this.draft.answers[this.draft.cursor] && !this.draft.skipped[this.draft.cursor];
    const qid = revisiting || cursorOpen ? this.draft.cursor : unresolved[0];
    const r = this._resolve(qid, this._pageIndex(qid));
    if (!r.available) return { phase: 'unavailable', reason: r.reason };
    const prev = this.draft.invalidated[qid]?.previousOptionId ?? null;
    return {
      phase: 'question', seq: this.seq, progress, preview: this.preview, questionNumber: this.flow.questions.indexOf(qid) + 1,
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
    return this._apply(Session.selectAnswer(this.flow, this.draft, qid, optionId, seq, l1SelectionMeta(this.pack, qid, optionId, r.records)));
  }

  /** "Other possibilities / other approaches": navigation only. Records no answer and no intent. */
  more(qid, seq) {
    if (!this.flow || !['q2', 'q4'].includes(qid)) return false;
    const next = this._pageIndex(qid) + 1;
    const r = this._resolve(qid, next - 1);
    if (!r.available || !r.view.page?.hasMore) return false;
    const seen = qid === 'q2'
      ? q2Page(this.pack, this.ctx.classId, next).seenIds
      : q4Page(this.pack, this.draft.answers.q2.meta.parentId, this.ctx.speciesKeys, this.lookup, next).records.map((x) => x.id);
    return this._apply(Session.recordBrowse(this.flow, this.draft, qid, { seenIds: seen, pageIndex: next }, seq));
  }

  skipQuestion(qid, seq) { return this.flow ? this._apply(Session.skipQuestion(this.flow, this.draft, qid, seq)) : false; }
  /** Revisit an earlier question (e.g. from the review screen). Cursor only; no answer changes. */
  goTo(qid, seq) { return this.flow ? this._apply(Session.goTo(this.flow, this.draft, qid, seq)) : false; }
  back(seq) { return this.flow ? this._apply(Session.goBack(this.flow, this.draft, seq)) : false; }

  reconfirm(qid, seq) {
    const v = this.view();
    if (v.phase !== 'question' || v.view.questionId !== qid || !v.reconfirm) return false;
    const r = this._resolve(qid, this._pageIndex(qid));
    return this._apply(Session.reconfirmInvalidated(this.flow, this.draft, qid, r.view.options.map((o) => o.optionId), seq));
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
    if (!this.flow || !this._apply(Session.complete(this.flow, this.draft, seq))) return null;
    const payload = Session.toCommitPayload(this.flow, this.draft);
    const answerDetails = {}; const tagEvidence = [];
    for (const [qid, a] of Object.entries(payload.answers)) {
      const rec = this.index.get(a.optionId);
      if (!rec) continue;
      answerDetails[qid] = { text: rec.text, editorialStatus: rec.editorialStatus, mechanicsStatus: rec.mechanicsStatus };
      // Certified mapping boundary: inert today, so this adds nothing. Only an explicit "mapped" result can add evidence.
      const m = mapResponseToIntent(rec, { surveyKind: 'l1', questionId: qid });
      if (m.status === MAPPING_STATUS.MAPPED) for (const e of m.intent?.tagEvidence || []) tagEvidence.push({ ...e, questionId: qid });
    }
    const draftContent = Object.values(answerDetails).some((d) => d.editorialStatus !== EDITORIAL_STATUS.APPROVED);
    this.committed = {
      surveyKind: 'l1', scopeId: L1_SCOPE_KEY, classId: this.ctx.classId, payload, answerDetails, tagEvidence,
      goals: l1GoalDeclarations(this.pack, this.draft, this.ctx.classId),
      preview: this.preview || draftContent, // any unapproved content makes the event a preview event
    };
    return this.committed;
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

  serialize() {
    if (!this.draft) return null;
    return { drafts: { [L1_SCOPE_KEY]: this.draft }, committed: this.committed ? { [L1_SCOPE_KEY]: this.committed } : {} };
  }
}

function reopened(draft) { return { ...draft, status: Session.DRAFT_STATUS.IN_PROGRESS, actionSeq: draft.actionSeq + 1 }; }
