/** Prestige adapter for the generic SurveyController. Question selection lives in resolvers/prestige.js. */
import { SurveyController } from './survey-controller.js';
import { revisionOf } from './contract.js';
import { createPrestigeFlow, prestigeAvailability, resolvePrestigeQuestion, prestigeSelectionMeta, prestigeTyped, prestigeTrigger, q1Split, Q1_PAGE_SIZE, composeQ2Text } from './resolvers/prestige.js';

export function buildRecordIndex(pack) {
  const idx = new Map();
  const add = (r) => idx.set(r.id, r);
  pack.q4Depth.forEach(add);
  Object.values(pack.q5).forEach((c) => { c.options.forEach(add); add(c.decline); });
  for (const [cid, c] of Object.entries(pack.q2Content?.classes || {})) {
    [c.alternative, c.undecided].forEach(add);
    for (const k of pack.q2Content.keys) add({ id: `pr.${cid}.q2.${k.toLowerCase()}`, kind: 'integration', biasKey: k, text: composeQ2Text(pack, cid, k), editorialStatus: 'draft_text', mechanicsStatus: 'none' });
  }
  for (const c of Object.values(pack.q1q3?.classes || {})) { c.q1.answers.forEach(add); c.q3.scenes.forEach((s) => s.answers.forEach(add)); }
  return idx;
}

export function createPrestigeAdapter(knownClassIds) {
  return Object.freeze({
    kind: 'prestige',
    pagedQuestions: ['q1'],
    autoSkipReasons: ['blocked_source', 'not_applicable'],
    buildRecordIndex,
    /** rawCtx: { selectedClassId, classLevels (finalized) }. Null when it is not a newly acquired prestige class. */
    normalize({ selectedClassId, classLevels, observedBias = {}, observedProvenance = null, canonicalBiasKeys = [] }) {
      const t = prestigeTrigger({ selectedClassId, classLevels, knownClassIds });
      if (!t.applicable) return null;
      return { ctx: { destinationClassId: t.destinationClassId, tense: 'pending', observedRevision: revisionOf(Object.entries(observedBias || {}).filter(([k, v]) => v > 0 && (!canonicalBiasKeys.length || canonicalBiasKeys.includes(k))).sort().concat(Object.entries(observedProvenance?.items || {}).sort(), Object.keys(observedProvenance?.skills || {}).sort())) }, runtime: { observedBias, observedProvenance }, scopeKey: `prestige:${t.destinationClassId}`, scopeId: t.destinationClassId };
    },
    createFlow: (ctx) => createPrestigeFlow(ctx.destinationClassId),
    availability: prestigeAvailability,
    resolveQuestion: ({ pack, draft, qid, ctx, preview, pageIndex, runtime }) => resolvePrestigeQuestion({ pack, draft, qid, ctx, preview, pageIndex, runtime }),
    selectionMeta: prestigeSelectionMeta,
    browseSeen: (pack, draft, qid, nextPage, ctx) => q1Split(pack, ctx.destinationClassId).substantive.slice(0, (nextPage + 1) * Q1_PAGE_SIZE).map((a) => a.id),
    goals: () => [], // no prestige answer declares a goal; a goal needs the explicit Discover/Explore/Affirm confirmation (MSV-RD-010)
    typed: prestigeTyped,
  });
}

export class PrestigeSurveyController extends SurveyController {
  constructor(deps, stored = null) { super(createPrestigeAdapter(Object.keys(deps.pack.classes)), deps, stored); }
}
