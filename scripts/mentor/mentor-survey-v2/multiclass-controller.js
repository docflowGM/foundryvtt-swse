/** Multiclass adapter for the generic SurveyController. Question selection lives in resolvers/multiclass.js. */
import { SurveyController } from './survey-controller.js';
import { createMulticlassFlow, multiclassAvailability, resolveMulticlassQuestion, multiclassSelectionMeta, multiclassTyped, multiclassTrigger } from './resolvers/multiclass.js';

export function buildRecordIndex(pack) {
  const idx = new Map();
  const add = (r) => idx.set(r.id, r);
  Object.values(pack.q1).forEach((o) => Object.values(o).forEach((bank) => bank.forEach(add)));
  pack.q3.forEach(add);
  Object.values(pack.q4).forEach((s) => { s.methods.forEach(add); add(s.neutral); });
  Object.values(pack.q5).forEach((o) => Object.values(o).forEach((r) => Object.values(r).forEach((bank) => bank.forEach(add))));
  add(pack.q5Undecided);
  return idx;
}

export const MULTICLASS_ADAPTER = Object.freeze({
  kind: 'multiclass',
  pagedQuestions: [],
  autoSkipReasons: ['blocked_source', 'needs_q1_route'],
  buildRecordIndex,
  /** rawCtx: { selectedClassId, classLevels (finalized), seed } -> trigger decides everything; null when it does not apply. */
  normalize({ selectedClassId, classLevels, seed = 'seed' }) {
    const t = multiclassTrigger({ selectedClassId, classLevels });
    if (!t.applicable) return null;
    return { ctx: { destinationClassId: t.destinationClassId, originClassId: t.originClassId, originReason: t.reason, seed: String(seed) }, scopeKey: `multiclass:${t.destinationClassId}`, scopeId: t.destinationClassId };
  },
  createFlow: (ctx) => createMulticlassFlow(ctx.destinationClassId),
  availability: multiclassAvailability,
  resolveQuestion: ({ pack, draft, qid, ctx, preview }) => resolveMulticlassQuestion({ pack, draft, qid, ctx, preview }),
  selectionMeta: multiclassSelectionMeta,
  browseSeen: () => [],
  goals: () => [], // no multiclass answer declares a career goal; a change of direction needs its own explicit confirmation
  typed: multiclassTyped,
});

export class MulticlassSurveyController extends SurveyController {
  constructor(deps, stored = null) { super(MULTICLASS_ADAPTER, deps, stored); }
}
