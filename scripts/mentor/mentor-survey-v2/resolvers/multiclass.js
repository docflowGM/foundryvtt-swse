/**
 * Multiclass resolver (spec: docs/design/mentor-survey-v2/03-MULTICLASS-SPEC.md). Pure: content pack + draft -> view.
 *
 * Questions: Q1 Class Discovery, Q2 Build Integration, Q3 Commitment, Q4 Applied Scenario, Q5 Next Milestone, Q6 Reflection.
 * Q2 and Q6 are BLOCKED AT THE SOURCE (see pack.blocked): they are reported unavailable and skipped, never invented.
 */
import { hashString, EDITORIAL_STATUS, DEPTH_IDS } from '../contract.js';
import { evaluateScopeRelease, isRecordPlayable, toViewOption } from '../content-store.js';

export const FOUNDATION_CLASSES = Object.freeze(['jedi', 'noble', 'scoundrel', 'scout', 'soldier']);
export const MC_QUESTIONS = Object.freeze(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']);

/**
 * Trigger: the survey applies on the FIRST acquisition of a new foundation class, never when an already-held foundation
 * class gains a level. `classLevels` is FINALIZED actor state (class key -> level), never pending selections.
 * With exactly one other foundation class held, that class is the origin. With two or more, the design does not say which
 * origin keys Q1/Q5, so the origin is left unset and the survey is withheld (MSV-RD-004). No origin is invented.
 */
export function multiclassTrigger({ selectedClassId, classLevels = {} }) {
  const dest = String(selectedClassId || '').toLowerCase();
  if (!FOUNDATION_CLASSES.includes(dest)) return { applicable: false, reason: 'not_a_foundation_class' };
  if (Number(classLevels[dest]) > 0) return { applicable: false, reason: 'class_already_held' }; // a further level is not a new class
  const held = FOUNDATION_CLASSES.filter((c) => c !== dest && Number(classLevels[c]) > 0);
  if (held.length === 0) return { applicable: false, reason: 'no_prior_foundation_class' };
  if (held.length > 1) return { applicable: true, destinationClassId: dest, originClassId: null, originClassIds: held, reason: 'multiple_origin_unruled' };
  return { applicable: true, destinationClassId: dest, originClassId: held[0], originClassIds: held, reason: 'ok' };
}

export function createMulticlassFlow(dest) {
  return {
    surveyKind: 'multiclass', scopeId: dest, definitionVersion: 1, questions: [...MC_QUESTIONS],
    deps: {
      q1: { inputs: ['destinationClassId', 'originClassId'] },
      q2: { inputs: ['destinationClassId', 'originClassId'], after: ['q1'] },
      q3: { inputs: ['destinationClassId'] }, // depth is independent of Q1/Q2 by design
      q4: { inputs: ['destinationClassId', 'originClassId', 'seed'], after: ['q1'] }, // Q3 never changes the scene
      q5: { inputs: ['destinationClassId', 'originClassId'], after: ['q1'] },
      q6: { inputs: ['destinationClassId'], after: ['q1', 'q3', 'q4', 'q5'] },
    },
  };
}

export function multiclassAvailability({ pack, manifest, ctx, preview = false }) {
  if (!pack?.mentors?.[ctx.destinationClassId]) return { available: false, reason: 'unknown_class' };
  if (!ctx.originClassId) return { available: false, reason: ctx.originReason || 'no_origin' };
  const rel = evaluateScopeRelease(manifest, 'multiclass', ctx.destinationClassId, { preview });
  return { available: rel.playable, reason: rel.reason };
}

const unavailable = (reason) => ({ available: false, reason, view: null, records: [] });

/** Q4 scene: family from the exact Q1 answer, then a stable seeded pick among that family's authored scenarios. */
export function q4Scenario(pack, ctx, q1Answer) {
  const rec = q1Answer?.meta;
  if (!rec || rec.kind !== 'direction') return null; // neutral or absent Q1: no route (MSV-RD-008)
  const family = pack.q4Routes[ctx.destinationClassId]?.[ctx.originClassId]?.[rec.position - 1];
  const pool = pack.q4ByFamily[ctx.destinationClassId]?.[family];
  if (!pool?.length) return null;
  const pick = pool[Number.parseInt(hashString(`${ctx.seed}|${ctx.destinationClassId}|${ctx.originClassId}|${q1Answer.optionId}`), 16) % pool.length];
  return pack.q4[pick];
}

export function resolveMulticlassQuestion({ pack, draft, qid, ctx, preview = false }) {
  const dest = ctx.destinationClassId; const origin = ctx.originClassId;
  const mentor = pack.mentors[dest];
  let intro = null; let situation = null; let prompt = null; let records = [];
  if (qid === 'q2' || qid === 'q6') return unavailable('blocked_source');
  if (qid === 'q1') {
    intro = mentor.q1Intros[origin]; records = pack.q1[dest][origin];
  } else if (qid === 'q3') {
    intro = mentor.intros.q3; records = pack.q3;
  } else if (qid === 'q4') {
    const sc = q4Scenario(pack, ctx, draft?.answers?.q1);
    if (!sc) return unavailable('needs_q1_route');
    intro = mentor.intros.q4; situation = sc.situation; records = [...sc.methods, sc.neutral];
  } else if (qid === 'q5') {
    const a = draft?.answers?.q1?.meta;
    if (!a || a.kind !== 'direction') return unavailable('needs_q1_route');
    intro = mentor.intros.q5;
    const bank = pack.q5[dest]?.[origin]?.[String(a.position).padStart(2, '0')];
    if (!bank) return unavailable('needs_q1_route');
    // career_continuity needs a certified goal phrase for {declared_goal}; none exists, so it is withheld (MSV-RD-009).
    records = [...bank.filter((r) => !r.needsGoalSlot), pack.q5Undecided];
  } else return unavailable('unknown_question');

  const shown = [intro, situation, ...records].filter(Boolean);
  if (!shown.every((r) => r.editorialStatus === EDITORIAL_STATUS.APPROVED || preview)) return unavailable('unapproved_content');
  if (!records.every((r) => isRecordPlayable(r, { preview }))) return unavailable('unplayable_record');
  return {
    available: true, reason: 'ok', records, preview,
    view: { surveyKind: 'multiclass', questionId: qid, mentorIntro: intro?.text ?? null, prompt, situation: situation?.text ?? null,
      options: records.map((r) => toViewOption(r)), page: null, canSkip: true, canGoBack: true },
  };
}

export function multiclassSelectionMeta(pack, qid, optionId, records) {
  const r = records.find((x) => x.id === optionId);
  if (!r) return null;
  if (qid === 'q1') return { kind: r.kind, origin: r.origin, position: r.position };
  if (qid === 'q3') return { kind: 'depth', depth: r.depth };
  if (qid === 'q4') return { kind: r.kind };
  if (qid === 'q5') return { kind: r.kind };
  return null;
}

/** Depth is a typed self-report, not a goal. `undecided` records no depth. Bridge is never a depth. */
export function multiclassTyped(pack, draft, ctx) {
  const d = draft.answers.q3?.meta?.depth;
  return {
    destinationClassId: ctx.destinationClassId, originClassId: ctx.originClassId,
    declaredClassInvestmentDepth: DEPTH_IDS.includes(d) && d !== 'undecided' ? d : null,
  };
}
