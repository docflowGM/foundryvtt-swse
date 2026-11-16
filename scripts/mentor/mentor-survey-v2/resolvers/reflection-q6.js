/**
 * The Mentor's Reflection (Q6), ONE shared component for the Multiclass and Prestige surveys. Pure.
 * Only the context differs: `surveyKind`, `classId`, the delivering Mentor (`mentorId`) and the milestone line. The reading, the
 * A-E response contract, the B/C targeted corrections, the D/E NOT then AM stages, the 297-archetype authority and the
 * correction persistence are the same code and the same libraries for both surveys (and for any later on-demand reassessment).
 * Original (multiclass): Composes the Pass A reading, then drives the SHARED reflection engine
 * (reflection.js) for the A-E calibration and the NOT / AM stages, using the Pass B libraries for the player-facing text.
 *
 * What the reading may say (design rules, Pass A):
 *  - Identity: the runtime has NO verified actor -> 297-archetype join, so the reading uses the "unresolved" form. It never
 *    names an archetype it cannot prove.
 *  - Evidence: up to three OWNED facts (talents, feats, trained skills) rendered from the finalized evidence projection.
 *  - Goal: quoted separately from a recorded declaration, or an honest "not recorded"; never inferred.
 *  - The only rejectable inference when identity is unresolved is `unresolved_reading_disagreement` (source rule).
 *  - Corrections never touch owned facts, goals or eligibility.
 */
import { hashString, EDITORIAL_STATUS } from '../contract.js';
import { createReading, beginCalibration, chooseCalibration, selectNot, selectAm, finishCalibration, inferenceClaims, NOT_CAPS, REQUIRES_AM } from '../reflection.js';
import { isRecordPlayable, toViewOption } from '../content-store.js';

const pick = (arr, seed) => arr[Number.parseInt(hashString(seed), 16) % arr.length];
const fill = (text, slots) => text.replace(/\{(\w+)\}/g, (_m, k) => (k in slots ? slots[k] : `{${k}}`));
const FACT_SENTENCE = {
  talent: (f) => `You have the ${f.label} talent.`,
  feat: (f) => `You have taken the ${f.label} feat.`,
  trained_skill: (f) => `You are trained in ${f.label}.`,
};
export const q6Available = (pack, surveyKind = 'multiclass') => Boolean(surveyKind === 'prestige' ? pack?.q6Content?.neutral : pack?.q6Content?.mentors);
const ID_PREFIX = { multiclass: 'mc', prestige: 'pr' };

/**
 * The survey-specific context of the one Q6: which class, which Mentor, which frame and clause set deliver it.
 * Prestige uses a class-specific Mentor script only when one has been imported (`q6Content.prestigeMentors[classId]`, the future
 * dialogue package); until then it uses the clearly identified NEUTRAL frame, which is attributed to no established Mentor.
 */
export function q6Profile({ surveyKind, pack, ctx, draft }) {
  const classId = ctx.destinationClassId;
  const q6 = pack.q6Content;
  if (surveyKind === 'prestige') {
    const specific = q6.prestigeMentors?.[classId] ?? null;
    const className = pack.classes?.[classId]?.className ?? classId;
    const sid = draft?.answers?.q1?.meta?.sourceId;
    const row = sid ? (pack.q1q3?.classes?.[classId]?.q1.answers || []).find((a) => a.sourceId === sid) : null;
    return { surveyKind, classId, mentorId: pack.classes?.[classId]?.mentorRegistryKey ?? null, idPrefix: 'pr', frame: specific?.frame ?? q6.neutral.frame, clauses: specific?.clauses ?? q6.neutral.clauses, neutralFrame: !specific,
      milestone: { ...q6.neutral.milestone, text: fill(q6.neutral.milestone.text, { class_name: className }) }, q1Text: row && row.kind !== 'neutral' ? row.text : null };
  }
  const origin = ctx.originClassId ?? draft?.answers?.q0?.meta?.originClassId;
  const m = draft?.answers?.q1?.meta;
  const q1Text = m?.kind === 'direction' && origin ? pack.q1[classId][origin].find((r) => r.id === draft.answers.q1.optionId)?.text ?? null : null;
  return { surveyKind, classId, mentorId: pack.mentors?.[classId]?.mentorRegistryKey ?? null, idPrefix: 'mc', frame: q6.mentors[classId], clauses: q6.clauses[classId], neutralFrame: false, milestone: null, q1Text };
}
const quote = (t) => `“${String(t).replace(/^[“"]|[”"]$/g, '')}”`;

/** Claims the reading actually displays (so they are the only things the player can later reject). */
export function readingClaims(identityResolved) {
  return identityResolved ? [] : [{ claimId: 'claim.unresolved_reading', claimKind: 'unresolved_reading_disagreement' }];
}

/** Candidate AM statements, in a fixed order: identities the player declared in their own goals, then the free-standing set. */
export function amCandidatesFor(q6, reading) {
  const out = [];
  const declaredTarget = reading.goal?.target;
  if (declaredTarget && ['archetype_parent', 'archetype_specialization'].includes(declaredTarget.type)) {
    const row = q6.identityChoices.find((r) => r.archetypeId === declaredTarget.id);
    if (row) out.push({ candidateId: row.am.id, canonicalRef: { id: row.archetypeId, kind: row.kind }, text: row.am });
  }
  for (const f of q6.freeStanding) out.push({ candidateId: f.id, free: true, text: f });
  return out;
}

/** Pass A composition: identity -> evidence -> goal -> exact Q1 quote -> relation. Missing parts are omitted, never padded. */
export function composeParagraphs({ profile, reading }) {
  const { paragraphs } = composeReading({ profile, reading });
  return paragraphs;
}

/** Composition that also returns every clause RECORD it selected, so the release gate can check each one (a draft clause must never ride in on approved buttons). */
export function composeReading({ profile, reading }) {
  const c = profile.clauses; const q1Text = profile.q1Text;
  const seed = `${reading.readingId}|${profile.classId}`;
  const paras = []; const used = [];
  const take = (list, key) => { const r = pick(list, `${seed}|${key}`); used.push(r); return r; };
  if (profile.milestone) { paras.push(profile.milestone.text); used.push(profile.milestone); } // prestige: the earned or pending milestone, with no owned ability claimed
  paras.push(take(c.unresolved.all, 'unresolved').text); // no verified identity source: the unresolved reading
  const facts = reading.evidence.filter((f) => FACT_SENTENCE[f.kind]).slice(0, 3);
  if (facts.length) {
    const key = ['one', 'two', 'three'][facts.length - 1];
    paras.push(fill(take(c.evidence[key], `evidence${key}`).text, { evidence_text: facts.map((f) => FACT_SENTENCE[f.kind](f)).join(' ') }));
  }
  const goalQuote = reading.goal?.quote ?? null;
  if (reading.goalDeclared && goalQuote) paras.push(fill(take(c.goal.declared, 'goal').text, { quoted_goal: quote(goalQuote) }));
  else if (!reading.goalDeclared) paras.push(take(c.goal.unrecorded, 'nogoal').text);
  if (q1Text) paras.push(fill(take(c.q1quote.all, 'q1').text, { quoted_q1: quote(q1Text) }));
  if (reading.goalDeclared && goalQuote) paras.push(take(c.relation.unknown, 'relation').text); // identity unresolved => relation unknown
  return { paragraphs: paras, used };
}

/** Everything the three Q6 questions need, computed once from the same inputs (so it is stable across renders). */
export function q6Context({ surveyKind = 'multiclass', pack, draft, ctx, runtime, archetypeLookup }) {
  const profile = q6Profile({ surveyKind, pack, ctx, draft });
  const claims = readingClaims(false);
  const base = { surveyKind, scopeId: profile.classId, projection: runtime.evidence, events: runtime.events, archetypeLookup, actorRevision: ctx.evidenceRevision };
  const cands = amCandidatesFor(pack.q6Content, createReading({ ...base, claims: [] }));
  const reading = createReading({ ...base, claims, amCandidates: cands.map(({ candidateId, canonicalRef, free }) => ({ candidateId, canonicalRef, free })) });
  const { paragraphs, used } = composeReading({ profile, reading });
  return { reading, paragraphs, candidates: cands, profile, clausesUsed: used };
}

const unavailable = (reason) => ({ available: false, reason, view: null, records: [] });
const gate = (shown, records, preview, templates = [], renderedText = []) => {
  // A record the importer flagged (e.g. not first person) is never shown to players, even if its text were approved.
  if (!preview && records.some((r) => r.editorialIssue)) return 'editorial_issue';
  // a template slot must never reach a player: clause templates are slot-bearing by design, so their RENDERED text is what is checked
  if ([...shown.filter((r) => !templates.includes(r)), ...records].some((r) => /\{\w+\}/.test(r.text)) || renderedText.some((t) => /\{\w+\}/.test(t))) return 'unfilled_slot';
  if (!shown.every((r) => r.editorialStatus === EDITORIAL_STATUS.APPROVED || preview)) return 'unapproved_content';
  if (!records.every((r) => isRecordPlayable(r, { preview }))) return 'unplayable_record';
  return null;
};

export function resolveQ6({ surveyKind = 'multiclass', pack, draft, qid, ctx, runtime, archetypeLookup, preview }) {
  if (!q6Available(pack, surveyKind) || !runtime?.evidence) return unavailable('blocked_source');
  const q6 = q6Context({ surveyKind, pack, draft, ctx, runtime, archetypeLookup });
  const frame = q6.profile.frame; const pfx = q6.profile.idPrefix;
  const meta = { surveyKind, mentorId: q6.profile.mentorId, neutralFrame: q6.profile.neutralFrame };
  const choice = draft?.answers?.q6?.meta?.calibration;

  if (qid === 'q6') {
    const records = pack.q6Content.playerChoices;
    const why = gate([frame.opening, frame.closing, ...q6.clausesUsed, ...records], records, preview, q6.clausesUsed, q6.paragraphs); if (why) return unavailable(why);
    return { available: true, reason: 'ok', records, preview, view: { surveyKind, ...meta, questionId: 'q6', mentorIntro: frame.opening.text, situation: q6.paragraphs.join('\n\n'), prompt: frame.closing.text, options: records.map((r) => toViewOption(r)), page: null, canSkip: true, canGoBack: true } };
  }
  if (!choice || choice === 'A') return unavailable('not_applicable');
  let state = chooseCalibration(q6.reading, beginCalibration(q6.reading), choice);
  if (qid === 'q6n') {
    if (!state.notShown.length) return unavailable('not_applicable'); // nothing was shown that could be rejected
    const records = state.notShown.map((claimId) => {
      const claim = q6.reading.claims.find((c) => c.claimId === claimId);
      const src = pick(pack.q6Content.negatives[claim.claimKind], `${q6.reading.readingId}|${claimId}`);
      return { ...src, id: `${pfx}.q6n.${claimId}`, claimId, kind: 'negative' };
    });
    const intro = frame.reactions[choice === 'D' ? 'D1' : choice === 'E' ? 'E1' : choice];
    const why = gate([intro, ...records], records, preview); if (why) return unavailable(why);
    return { available: true, reason: 'ok', records, preview, view: { surveyKind, ...meta, questionId: 'q6n', mentorIntro: intro.text, situation: null, prompt: null, options: records.map((r) => toViewOption(r)), multiSelect: true, page: null, canSkip: true, canGoBack: true } };
  }
  if (qid === 'q6a') {
    if (!REQUIRES_AM[choice]) return unavailable('not_applicable');
    // Mandatory order: the NOT stage is answered (or had nothing to show) before the AM stage.
    if (state.notShown.length && !draft.answers.q6n) return unavailable('not_applicable');
    const records = q6.candidates.map((c) => ({ ...c.text, id: c.candidateId, kind: 'affirmative' }));
    const intro = frame.reactions[`${choice}2`];
    const why = gate([intro, ...records], records, preview); if (why) return unavailable(why);
    return { available: true, reason: 'ok', records, preview, view: { surveyKind, ...meta, questionId: 'q6a', mentorIntro: intro.text, situation: null, prompt: null, options: records.map((r) => toViewOption(r)), multiSelect: true, page: null, canSkip: true, canGoBack: true } };
  }
  return unavailable('unknown_question');
}

/** Run the engine over the stored answers; returns { reading, result } or null when Q6 was not answered. */
export function q6Reflection({ surveyKind = 'multiclass', pack, draft, ctx, runtime, archetypeLookup }) {
  const a = draft.answers.q6;
  if (!a?.meta?.calibration || !q6Available(pack, surveyKind) || !runtime?.evidence) return null;
  const { reading } = q6Context({ surveyKind, pack, draft, ctx, runtime, archetypeLookup });
  let st = chooseCalibration(reading, beginCalibration(reading), a.meta.calibration);
  if (st.stage === 'not') st = selectNot(reading, st, draft.answers.q6n?.meta?.ids ?? []);
  if (st.stage === 'am') st = selectAm(reading, st, draft.answers.q6a?.meta?.ids ?? []);
  const result = finishCalibration(reading, st);
  return result.ok ? { reading: JSON.parse(JSON.stringify(reading)), result } : null;
}

/** Meta recorded for a multi-select answer. Returns null when any id is not currently offered or the engine refuses it. */
export function q6SelectionMetaMany({ surveyKind = 'multiclass', pack, draft, qid, ids, records, ctx, runtime, archetypeLookup }) {
  const offered = new Set(records.map((r) => r.id));
  if (!ids.every((id) => offered.has(id))) return null;
  const { reading, profile } = q6Context({ surveyKind, pack, draft, ctx, runtime, archetypeLookup });
  const choice = draft.answers.q6.meta.calibration;
  let st = chooseCalibration(reading, beginCalibration(reading), choice);
  const texts = ids.map((id) => records.find((r) => r.id === id).text);
  if (qid === 'q6n') {
    const claimIds = ids.map((id) => id.replace(`${profile.idPrefix}.q6n.`, ''));
    st = selectNot(reading, st, claimIds); if (!st.ok) return null;
    return { kind: 'not', ids: claimIds, texts };
  }
  const notIds = draft.answers.q6n?.meta?.ids ?? [];
  if (st.stage === 'not') st = selectNot(reading, st, notIds);
  st = selectAm(reading, st, ids); if (!st.ok) return null;
  return { kind: 'am', ids, texts };
}

export { NOT_CAPS, inferenceClaims };
