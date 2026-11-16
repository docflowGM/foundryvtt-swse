/**
 * Prestige resolver (spec: docs/design/mentor-survey-v2/04-PRESTIGE-SPEC.md). Pure: content pack + draft -> view.
 *
 * A prestige class is an EARNED MILESTONE, possibly the player's final identity. Nothing here forces another class goal.
 * Imported and playable-when-approved: Q4 (depth in THIS class) and Q5 (future purpose, one primary + one optional second).
 * Source-blocked (reported unavailable and skipped, never invented): Q1, Q2, Q3 and Q6 (see pack.blocked).
 *
 * Tense: the level-up survey runs BEFORE the class is finalized, so the PENDING Mentor introductions are used. The
 * finalized-acquisition introductions are kept in the pack for a later on-demand reflection.
 */
import { DEPTH_IDS, EDITORIAL_STATUS } from '../contract.js';
import { evaluateScopeRelease, isRecordPlayable, toViewOption } from '../content-store.js';

export const PRESTIGE_QUESTIONS = Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5', 'q5b', 'q6']);
const BLOCKED = ['q1', 'q2', 'q3', 'q6'];

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

export function resolvePrestigeQuestion({ pack, draft, qid, ctx, preview = false }) {
  const id = ctx.destinationClassId;
  if (BLOCKED.includes(qid)) return unavailable('blocked_source');
  let intro = null; let prompt = null; let records = [];
  if (qid === 'q4') {
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
    view: { surveyKind: 'prestige', questionId: qid, mentorIntro: intro?.text ?? null, prompt: prompt?.text ?? null, situation: null,
      options: records.map((r) => toViewOption(r)), page: null, canSkip: true, canGoBack: true },
  };
}

export function prestigeSelectionMeta(pack, qid, optionId, records) {
  const r = records.find((x) => x.id === optionId);
  if (!r) return null;
  if (qid === 'q4') return { kind: 'depth', depth: r.depth };
  if (qid === 'q5') return { kind: 'purpose', purpose: r.purpose };
  if (qid === 'q5b') return r.kind === 'decline' ? { kind: 'decline' } : { kind: 'secondary', purpose: r.purpose };
  return null;
}

/**
 * Typed self-reports (none is a goal, an acquisition or a weight). `undecided` depth records null. The secondary purpose
 * is recorded without any weight. "Another career" records a PURPOSE only: the Discover/Explore/Affirm conversation that
 * could declare a typed goal is not authored for 31 classes (MSV-RD-010), so no prestige answer declares a goal here.
 */
export function prestigeTyped(pack, draft, ctx) {
  const d = draft.answers.q4?.meta?.depth;
  return {
    prestigeClassId: ctx.destinationClassId,
    declaredPrestigeDepth: DEPTH_IDS.includes(d) && d !== 'undecided' ? d : null,
    primaryPurpose: draft.answers.q5?.meta?.purpose ?? null,
    secondaryPurpose: draft.answers.q5b?.meta?.kind === 'secondary' ? draft.answers.q5b.meta.purpose : null,
  };
}
