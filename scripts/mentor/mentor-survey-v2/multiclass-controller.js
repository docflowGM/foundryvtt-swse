/** Multiclass adapter for the generic SurveyController. Question selection lives in resolvers/multiclass.js. */
import { SurveyController } from './survey-controller.js';
import { createMulticlassFlow, multiclassAvailability, resolveMulticlassQuestion, multiclassSelectionMeta, multiclassTyped, multiclassTrigger, q6Reflection, q6SelectionMetaMany } from './resolvers/multiclass.js';
import { reduceLedger } from './intent-ledger.js';
import { revisionOf } from './contract.js';

export function buildRecordIndex(pack) {
  const idx = new Map();
  const add = (r) => idx.set(r.id, r);
  Object.values(pack.origin?.options || {}).forEach(add);
  Object.values(pack.q1).forEach((o) => Object.values(o).forEach((bank) => bank.forEach(add)));
  pack.q3.forEach(add);
  (pack.q6Content?.playerChoices || []).forEach(add);
  Object.values(pack.q2Content?.destinations || {}).forEach((rows) => Object.values(rows).forEach(add));
  Object.values(pack.q2Content?.alternatives || {}).forEach(add);
  Object.values(pack.q4).forEach((s) => { s.methods.forEach(add); add(s.neutral); });
  Object.values(pack.q5).forEach((o) => Object.values(o).forEach((r) => Object.values(r).forEach((bank) => bank.forEach(add))));
  add(pack.q5Undecided);
  Object.values(pack.q5Fallback || {}).forEach((bank) => bank.forEach(add));
  Object.values(pack.q5NoGoal || {}).forEach(add);
  if (pack.q5GoalReference) add({ ...pack.q5GoalReference, id: 'mc.q5.goalref.template' }); // the shown text is frozen per answer in meta.shownText
  return idx;
}

export const MULTICLASS_ADAPTER = Object.freeze({
  kind: 'multiclass',
  pagedQuestions: [],
  autoSkipReasons: ['blocked_source', 'needs_origin', 'needs_q1_route', 'needs_q1_focus', 'insufficient_observed_evidence', 'not_applicable'],
  buildRecordIndex,
  /** rawCtx: { selectedClassId, classLevels (finalized), seed } -> trigger decides everything; null when it does not apply. */
  normalize({ selectedClassId, classLevels, seed = 'seed', evidence = null, events = [], observedBias = {}, observedProvenance = null, canonicalBiasKeys = [] }) {
    const t = multiclassTrigger({ selectedClassId, classLevels });
    if (!t.applicable) return null;
    // Heavy live inputs (finalized evidence, committed ledger) travel in `runtime`; only their revisions enter the draft context.
    const goals = Object.values(reduceLedger(events).goals).map((g) => [g.goalLane, g.target, g.quote ?? null]);
    return {
      ctx: { destinationClassId: t.destinationClassId, originClassId: t.originClassId, originClassIds: t.originClassIds, originReason: t.reason, seed: String(seed), evidenceRevision: revisionOf(evidence?.facts?.map((f) => f.factId + f.canonicalId) ?? []), goalRevision: revisionOf(goals), observedRevision: revisionOf(Object.entries(observedBias || {}).filter(([k, v]) => v > 0 && (!canonicalBiasKeys.length || canonicalBiasKeys.includes(k))).sort().concat(Object.entries(observedProvenance?.items || {}).sort(), Object.keys(observedProvenance?.skills || {}).sort())) },
      runtime: { evidence, events, observedBias, observedProvenance }, scopeKey: `multiclass:${t.destinationClassId}`, scopeId: t.destinationClassId,
    };
  },
  createFlow: (ctx) => createMulticlassFlow(ctx.destinationClassId, !ctx.originClassId && ctx.originClassIds?.length > 1),
  availability: multiclassAvailability,
  resolveQuestion: ({ pack, draft, qid, ctx, preview, runtime, archetypeLookup }) => resolveMulticlassQuestion({ pack, draft, qid, ctx, preview, runtime, archetypeLookup }),
  selectionMeta: multiclassSelectionMeta,
  /** Multi-select stages (Q6 NOT / AM). Returns null when the selection is not currently legal. */
  selectionMetaMany: ({ pack, draft, qid, ids, records, ctx, runtime, archetypeLookup }) => q6SelectionMetaMany({ surveyKind: 'multiclass', pack, draft, qid, ids, records, ctx, runtime, archetypeLookup }),
  multiSelectQuestions: ['q6n', 'q6a'],
  /** The Q6 reflection result the finalizer turns into snapshot/correction events. */
  reflection: ({ pack, draft, ctx, runtime, archetypeLookup }) => q6Reflection({ surveyKind: 'multiclass', pack, draft, ctx, runtime, archetypeLookup }),
  browseSeen: () => [],
  goals: () => [], // no multiclass answer declares a career goal; a change of direction needs its own explicit confirmation
  typed: multiclassTyped,
});

export class MulticlassSurveyController extends SurveyController {
  constructor(deps, stored = null) { super(MULTICLASS_ADAPTER, deps, stored); }
}
