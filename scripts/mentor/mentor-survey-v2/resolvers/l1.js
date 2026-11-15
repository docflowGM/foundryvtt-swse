/**
 * Level 1 resolver (spec: docs/design/mentor-survey-v2/02-L1-SPEC.md). Pure: content pack + draft -> question view.
 *
 * Selection rules implemented (all from the locked v0.12 / v0.13 / v0.18 design):
 *  - Q1 keyed by class. Q2 pages five parents at a time, never repeating; A/B come from the class's anchors.
 *  - Q3 keyed by class + the exact Q1 answer. Q4 keyed by the exact Q2 parent ONLY (Q3 never changes it).
 *  - Q4 options: applicable children first, then method backfill, five per page, no repeats.
 *  - Q5 keyed by class.
 * Ordering where the design leaves ranking unapproved (MSV-RD-001/002) is canonical ID order with no relevance claim.
 */
import { EDITORIAL_STATUS } from '../contract.js';
import { isRecordPlayable, evaluateScopeRelease, toViewOption } from '../content-store.js';

export const L1_QUESTIONS = Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5']);
export const PAGE_SIZE = 5;

export function createL1Flow(classId) {
  return {
    surveyKind: 'l1',
    scopeId: classId,
    definitionVersion: 1,
    questions: [...L1_QUESTIONS],
    deps: {
      q1: { inputs: ['classId'] },
      q2: { inputs: ['classId'] },
      q3: { inputs: ['classId'], after: ['q1'] },
      q4: { inputs: ['speciesKeys'], after: ['q2'] }, // Q3 is deliberately absent: Q3 never changes Q4
      q5: { inputs: ['classId'] },
    },
  };
}

/** Is the L1 survey playable for this class? Withheld scopes (or any draft record without preview) fail closed. */
export function l1Availability({ pack, manifest, classId, preview = false }) {
  if (!pack?.mentors?.[classId]) return { available: false, reason: 'unknown_class' };
  const rel = evaluateScopeRelease(manifest, 'l1', classId, { preview });
  return rel.playable ? { available: true, reason: rel.reason } : { available: false, reason: rel.reason };
}

/* ------------------------------ Q2 ordering ------------------------------ */

/** Placeholder ordering (MSV-RD-001): anchors A/B in the printed anchor order, then every other parent by canonical id. */
export function q2Sequence(pack, classId) {
  const anchors = (pack.anchors[classId] || []).slice(0, 2);
  const rest = Object.keys(pack.q2.parents).filter((id) => !anchors.includes(id)).sort();
  return [...anchors, ...rest];
}

export function q2Page(pack, classId, pageIndex) {
  const seq = q2Sequence(pack, classId);
  const start = Math.max(0, pageIndex) * PAGE_SIZE;
  const ids = seq.slice(start, start + PAGE_SIZE);
  return { parentIds: ids, seenIds: seq.slice(0, start + ids.length), hasMore: start + ids.length < seq.length };
}

/* ------------------------------ Q4 ordering ------------------------------ */

/**
 * Child applicability: the only certified restriction is mechanics.species.required against the pending species.
 * FAIL CLOSED: a child whose canonical archetype record cannot be resolved (registry unavailable, unknown id) is
 * excluded, never assumed unrestricted. Use unresolvedChildren() to report what was excluded for that reason.
 */
export function applicableChildren(pack, parentId, speciesKeys, archetypeLookup) {
  const keys = new Set(speciesKeys || []);
  return pack.q4[parentId].children
    .filter((c) => {
      const rec = archetypeLookup?.(c.childId);
      if (!rec) return false;
      const required = rec.mechanics?.species?.required || [];
      return required.length === 0 || required.some((r) => keys.has(r)); // unknown species fails closed for restricted children
    })
    .sort((a, b) => a.childId.localeCompare(b.childId));
}

/** Child ids excluded because their canonical archetype record could not be resolved (reported, not hidden). */
export function unresolvedChildren(pack, parentId, archetypeLookup) {
  return pack.q4[parentId].children.filter((c) => !archetypeLookup?.(c.childId)).map((c) => c.childId);
}

export function q4Sequence(pack, parentId, speciesKeys, archetypeLookup) {
  return [...applicableChildren(pack, parentId, speciesKeys, archetypeLookup), ...pack.q4[parentId].methods];
}

export function q4Page(pack, parentId, speciesKeys, archetypeLookup, pageIndex) {
  const seq = q4Sequence(pack, parentId, speciesKeys, archetypeLookup);
  const start = Math.max(0, pageIndex) * PAGE_SIZE;
  const records = seq.slice(start, start + PAGE_SIZE);
  return { records, hasMore: start + records.length < seq.length };
}

/* ------------------------------ question resolution ------------------------------ */

const unavailable = (reason) => ({ available: false, reason, view: null, records: [] });

/**
 * @param {object} p
 * @param {object} p.pack l1 content pack
 * @param {object} p.flow
 * @param {object} p.draft
 * @param {string} p.qid
 * @param {{classId:string, speciesKeys?:string[]}} p.context
 * @param {(id:string)=>object|null} p.archetypeLookup
 * @param {boolean} [p.preview]
 */
export function resolveL1Question({ pack, draft, qid, context, archetypeLookup, preview = false, pageIndex = 0 }) {
  const cls = context.classId;
  const mentor = pack.mentors[cls];
  if (!mentor) return unavailable('unknown_class');
  const intro = mentor.intros[qid];
  let prompt = null; let situation = null; let records = []; let page = null;

  if (qid === 'q1') {
    prompt = pack.q1[cls].prompt;
    records = pack.q1[cls].options;
  } else if (qid === 'q2') {
    const pg = q2Page(pack, cls, pageIndex);
    records = pg.parentIds.map((id) => pack.q2.parents[id].byClass[cls]);
    page = { index: pageIndex, hasMore: pg.hasMore, moreText: pg.hasMore ? pack.navigation.q2OtherPossibilities.text : null, moreRecord: pg.hasMore ? pack.navigation.q2OtherPossibilities : null };
  } else if (qid === 'q3') {
    const q1 = draft?.answers?.q1?.optionId;
    const scenarioId = q1 ? pack.q3[cls].byQ1Option[q1] : null;
    if (!scenarioId) return unavailable('needs_q1'); // fail closed: never invent a Q1 preference for a skipped Q1 (MSV-RD-007)
    const scenario = Object.values(pack.q3[cls].scenarios).find((s) => s.scenarioId === scenarioId);
    situation = scenario.situation;
    records = scenario.replies;
  } else if (qid === 'q4') {
    const parentId = draft?.answers?.q2?.meta?.parentId;
    if (!parentId || !pack.q4[parentId]) return unavailable('needs_q2'); // no career selected: Q4 invents none (spec 12.4)
    situation = pack.q4[parentId].situation;
    const pg = q4Page(pack, parentId, context.speciesKeys, archetypeLookup, pageIndex);
    records = pg.records;
    page = { index: pageIndex, hasMore: pg.hasMore, moreText: pg.hasMore ? pack.navigation.q4OtherApproaches.text : null, moreRecord: pg.hasMore ? pack.navigation.q4OtherApproaches : null };
  } else if (qid === 'q5') {
    records = pack.q5[cls].options;
  } else {
    return unavailable('unknown_question');
  }

  // Every record actually presented must be playable (approved text, or editorial preview). No partial draft surveys.
  const shown = [intro, prompt, situation, ...records, page?.moreRecord].filter(Boolean);
  if (!shown.every((r) => (r.editorialStatus === EDITORIAL_STATUS.APPROVED) || preview)) return unavailable('unapproved_content');
  if (!records.every((r) => isRecordPlayable(r, { preview }))) return unavailable('unplayable_record');

  const view = {
    surveyKind: 'l1',
    questionId: qid,
    mentorIntro: intro?.text ?? null,
    prompt: qid === 'q3' || qid === 'q4' ? 'What would you do?' : (prompt?.text ?? null),
    situation: situation?.text ?? null,
    options: records.map((r) => toViewOption(r)),
    page: page ? { index: page.index, hasMore: page.hasMore, moreText: page.moreText } : null,
    canSkip: true,
    canGoBack: true,
  };
  return { available: true, reason: 'ok', view, records, preview };
}

/** Non-scoring facts recorded alongside a selection, derived from the stable option record (never from display text). */
export function l1SelectionMeta(pack, qid, optionId, records) {
  const rec = records.find((r) => r.id === optionId);
  if (!rec) return null;
  if (qid === 'q2') return { parentId: optionId.split('.')[2] };
  if (qid === 'q4') return rec.kind === 'child' ? { kind: 'child', childId: rec.childId } : { kind: 'method' };
  return null;
}

/** Goals are declared ONLY by an explicit affirmative selection recorded in the draft. Navigation never declares one. */
export function l1GoalDeclarations(pack, draft, classId) {
  const out = [];
  const q2 = draft.answers.q2;
  if (q2?.meta?.parentId) {
    const text = pack.q2.parents[q2.meta.parentId]?.byClass?.[classId]?.text;
    out.push({ goalLane: 'l1.career', target: { type: 'archetype_parent', id: q2.meta.parentId }, questionId: 'q2', optionId: q2.optionId, ...(text ? { quote: text } : {}) });
  }
  const q4 = draft.answers.q4;
  if (q4?.meta?.kind === 'child') {
    const rec = pack.q4[q2?.meta?.parentId]?.children?.find((c) => c.childId === q4.meta.childId);
    out.push({ goalLane: 'l1.specialization', target: { type: 'archetype_specialization', id: q4.meta.childId }, questionId: 'q4', optionId: q4.optionId, ...(rec ? { quote: rec.text } : {}) });
  }
  const q5 = draft.answers.q5;
  if (q5) {
    const rec = pack.q5[classId]?.options?.find((o) => o.id === q5.optionId);
    out.push({ goalLane: 'l1.long_term_ambition', target: { type: 'response_only', id: null }, questionId: 'q5', optionId: q5.optionId, ...(rec ? { quote: rec.text } : {}) });
  }
  return out;
}
