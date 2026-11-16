/**
 * Prestige resolver (spec: docs/design/mentor-survey-v2/04-PRESTIGE-SPEC.md). Pure: content pack + draft -> view.
 *
 * A prestige class is an EARNED MILESTONE, possibly the player's final identity. Nothing here forces another class goal.
 * Imported and playable-when-approved: Q4 (depth in THIS class) and Q5 (future purpose, one primary + one optional second).
 * Q1 (class-discovery browse) and Q3 (responsibility scene keyed to the exact Q1 route) come from the q1q3 companion pack.
 * Source-blocked (reported unavailable and skipped, never invented): Q2 and Q6 (see pack.blocked).
 *
 * Tense: the level-up survey runs BEFORE the class is finalized, so the PENDING Mentor introductions are used. The
 * finalized-acquisition introductions are kept in the pack for a later on-demand reflection.
 */
import { DEPTH_IDS, EDITORIAL_STATUS } from '../contract.js';
import { evaluateScopeRelease, isRecordPlayable, toViewOption } from '../content-store.js';

export const PRESTIGE_QUESTIONS = Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5', 'q5b', 'q6']);
const BLOCKED = ['q2', 'q6'];
export const Q1_PAGE_SIZE = 8;
const UI_MORE = 'Show more answers'; // interface control label, not Mentor dialogue; the browse order is the source order and claims no relevance

/** Trigger: a prestige class not yet held (finalized levels). Each acquisition is its own scope; earlier ones are untouched. */
export function prestigeTrigger({ selectedClassId, classLevels = {}, knownClassIds = [] }) {
  const id = String(selectedClassId || '').toLowerCase();
  if (!knownClassIds.includes(id)) return { applicable: false, reason: 'not_a_prestige_class' };
  if (Number(classLevels[id]) > 0) return { applicable: false, reason: 'class_already_held' };
  return { applicable: true, destinationClassId: id, reason: 'ok' };
}

export function createPrestigeFlow(classId) {
  return {
    surveyKind: 'prestige', scopeId: classId, definitionVersion: 1, questions: [...PRESTIGE_QUESTIONS],
    deps: {
      q1: { inputs: ['destinationClassId'] }, q2: { inputs: ['destinationClassId'] }, q3: { inputs: ['destinationClassId'], after: ['q1'] },
      q4: { inputs: ['destinationClassId'] }, // depth in this class is independent of the other questions
      q5: { inputs: ['destinationClassId'] },
      q5b: { inputs: ['destinationClassId'], after: ['q5'] },
      q6: { inputs: ['destinationClassId'], after: ['q4', 'q5'] },
    },
  };
}

export function prestigeAvailability({ pack, manifest, ctx, preview = false }) {
  if (!pack?.classes?.[ctx.destinationClassId]) return { available: false, reason: 'unknown_class' }; // unknown class: no substitute Mentor
  const rel = evaluateScopeRelease(manifest, 'prestige', ctx.destinationClassId, { preview });
  return { available: rel.playable, reason: rel.reason };
}

const unavailable = (reason) => ({ available: false, reason, view: null, records: [] });

export function resolvePrestigeQuestion({ pack, draft, qid, ctx, preview = false, pageIndex = 0 }) {
  const id = ctx.destinationClassId;
  if (BLOCKED.includes(qid)) return unavailable('blocked_source');
  let intro = null; let prompt = null; let records = []; let page = null; let situation = null;
  if (qid === 'q1') {
    if (!pack.q1q3?.classes?.[id]) return unavailable('blocked_source');
    const cls = pack.q1q3.classes[id].q1;
    const i = pickCandidate(cls.introCandidates, preview); const q = pickCandidate(cls.questionCandidates, preview);
    if (!q) return unavailable('needs_owner_selection');
    const all = q1Offerable(pack, id);
    if (!all.length) return unavailable('blocked_source');
    const start = Math.max(0, Number(pageIndex) || 0) * Q1_PAGE_SIZE;
    records = all.slice(start, start + Q1_PAGE_SIZE);
    if (!records.length) return unavailable('unknown_page');
    intro = pseudo(`pr.${id}.q1.intro`, i?.text, i); prompt = pseudo(`pr.${id}.q1.question`, q.text, q);
    page = { index: Math.max(0, Number(pageIndex) || 0), hasMore: start + records.length < all.length, moreText: start + records.length < all.length ? UI_MORE : null };
  } else if (qid === 'q3') {
    if (!pack.q1q3?.classes?.[id]) return unavailable('blocked_source');
    const q1 = draft?.answers?.q1;
    if (!q1?.meta?.sourceId) return unavailable('not_applicable'); // Q3 is keyed by the exact Q1 route; without one nothing is guessed
    const scene = q3SceneFor(pack, id, q1.meta.sourceId);
    if (!scene) return unavailable('not_applicable');
    records = scene.answers.filter((a) => !a.editorialIssue);
    if (records.length !== 5) return unavailable('blocked_source');
    intro = pseudo(`pr.${id}.q3.${scene.sceneId.toLowerCase()}.intro`, scene.mentor?.text, scene); prompt = pseudo(`pr.${id}.q3.${scene.sceneId.toLowerCase()}.question`, scene.question, scene);
    situation = scene.situation;
  } else if (qid === 'q4') {
    const c = pack.q4[id];
    intro = c.pendingIntro; prompt = c.question;
    records = pack.q4Depth.map((d) => ({ ...d, detail: c.rails[d.depth].text, _rail: c.rails[d.depth] }));
  } else if (qid === 'q5') {
    const c = pack.q5[id];
    intro = c.pendingIntro; prompt = c.question; records = c.options;
  } else if (qid === 'q5b') {
    const primary = draft?.answers?.q5?.meta?.purpose;
    if (!primary) return unavailable('not_applicable');
    if (primary === 'undecided') return unavailable('not_applicable'); // an undecided primary has no second purpose
    const c = pack.q5[id];
    intro = c.secondPrompt; records = [...c.options.filter((o) => o.purpose !== primary && o.purpose !== 'undecided'), c.decline];
  } else return unavailable('unknown_question');

  const shown = [intro, prompt, ...records, ...records.map((r) => r._rail)].filter(Boolean);
  if (!shown.every((r) => r.editorialStatus === EDITORIAL_STATUS.APPROVED || preview)) return unavailable('unapproved_content');
  if (!records.every((r) => isRecordPlayable(r, { preview }))) return unavailable('unplayable_record');
  return {
    available: true, reason: 'ok', records, preview,
    view: { surveyKind: 'prestige', questionId: qid, mentorIntro: intro?.text ?? null, prompt: prompt?.text ?? null, situation,
      options: records.map((r) => toViewOption(r)), page, canSkip: true, canGoBack: true },
  };
}

/** Q1 answers offered for a class, in source order. Quarantined (mechanically uncertain) or ill-formed rows are never offered. */
export function q1Offerable(pack, classId) {
  return (pack.q1q3?.classes?.[classId]?.q1?.answers || []).filter((a) => !a.quarantine && a.presentsMechanic !== true && !a.editorialIssue);
}

/**
 * Opening / question: the source holds several authored candidates and the owner has not chosen. A candidate marked
 * `owner_selected` is used when present; otherwise the GM-only editorial preview shows the first candidate in source order
 * (a preview convenience, recorded in the register); players get nothing, so the question is unavailable.
 */
export function pickCandidate(list = [], preview = false) {
  const chosen = list.find((c) => c.selection === 'owner_selected');
  if (chosen) return chosen;
  return preview ? (list[0] ?? null) : null;
}

/** The Q3 scene whose exact Q1 route list contains the chosen Q1 answer (class-scoped). */
export function q3SceneFor(pack, classId, q1SourceId) {
  const scenes = pack.q1q3?.classes?.[classId]?.q3?.scenes || [];
  const hit = scenes.filter((s) => s.routeSourceIds.includes(q1SourceId));
  return hit.length === 1 ? hit[0] : null; // zero or ambiguous: no scene is guessed
}

const pseudo = (id, text, src) => (text ? { id, text, editorialStatus: src?.editorialStatus ?? 'draft_text', mechanicsStatus: 'none' } : null);

export function prestigeSelectionMeta(pack, qid, optionId, records) {
  const r = records.find((x) => x.id === optionId);
  if (!r) return null;
  if (qid === 'q1') return { kind: 'class_discovery', sourceId: r.sourceId, q3SceneId: r.q3SceneId ?? null };
  if (qid === 'q3') return { kind: 'responsibility', sceneId: r.sceneId ?? null, letter: r.letter };
  if (qid === 'q4') return { kind: 'depth', depth: r.depth };
  if (qid === 'q5') return { kind: 'purpose', purpose: r.purpose };
  if (qid === 'q5b') return r.kind === 'decline' ? { kind: 'decline' } : { kind: 'secondary', purpose: r.purpose };
  return null;
}

/**
 * Typed self-reports (Q1/Q3 source ids are self-reports of interest and responsibility: no tag, goal or acquisition; none is a goal, an acquisition or a weight). `undecided` depth records null. The secondary purpose
 * is recorded without any weight. "Another career" records a PURPOSE only: the Discover/Explore/Affirm conversation that
 * could declare a typed goal is not authored for 31 classes (MSV-RD-010), so no prestige answer declares a goal here.
 */
export function prestigeTyped(pack, draft, ctx) {
  const d = draft.answers.q4?.meta?.depth;
  return {
    prestigeClassId: ctx.destinationClassId,
    classDiscoverySourceId: draft.answers.q1?.meta?.sourceId ?? null,
    responsibilityScene: draft.answers.q3?.meta?.sceneId ?? null,
    responsibilityLetter: draft.answers.q3?.meta?.letter ?? null,
    declaredPrestigeDepth: DEPTH_IDS.includes(d) && d !== 'undecided' ? d : null,
    primaryPurpose: draft.answers.q5?.meta?.purpose ?? null,
    secondaryPurpose: draft.answers.q5b?.meta?.kind === 'secondary' ? draft.answers.q5b.meta.purpose : null,
  };
}
