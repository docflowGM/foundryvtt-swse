/**
 * Level 1 adapter for the generic SurveyController. See survey-controller.js for the lifecycle and resolvers/l1.js
 * for question selection.
 */
import { SurveyController } from './survey-controller.js';
import { createL1Flow, l1Availability, resolveL1Question, l1SelectionMeta, l1GoalDeclarations, q2Page, q4Page } from './resolvers/l1.js';

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

export const L1_ADAPTER = Object.freeze({
  kind: 'l1',
  pagedQuestions: ['q2', 'q4'],
  autoSkipReasons: ['needs_q1', 'needs_q2'],
  buildRecordIndex,
  normalize({ classId, speciesKeys = [] }) {
    const cls = String(classId || '').toLowerCase();
    if (!cls) return null;
    return { ctx: { classId: cls, speciesKeys: [...speciesKeys].sort() }, scopeKey: L1_SCOPE_KEY, scopeId: cls };
  },
  createFlow: (ctx) => createL1Flow(ctx.classId),
  availability: ({ pack, manifest, ctx, preview }) => l1Availability({ pack, manifest, classId: ctx.classId, preview }),
  resolveQuestion: ({ pack, draft, qid, ctx, archetypeLookup, preview, pageIndex }) => resolveL1Question({ pack, draft, qid, context: ctx, archetypeLookup, preview, pageIndex }),
  selectionMeta: (pack, qid, optionId, records) => l1SelectionMeta(pack, qid, optionId, records),
  browseSeen: (pack, draft, qid, next, ctx, lookup) => (qid === 'q2'
    ? q2Page(pack, ctx.classId, next).seenIds
    : q4Page(pack, draft.answers.q2.meta.parentId, ctx.speciesKeys, lookup, next).records.map((x) => x.id)),
  goals: (pack, draft, ctx) => l1GoalDeclarations(pack, draft, ctx.classId),
  typed: () => ({}),
});

export class L1SurveyController extends SurveyController {
  constructor(deps, stored = null) { super(L1_ADAPTER, deps, stored); }
}
