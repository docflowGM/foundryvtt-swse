/** Prestige adapter for the generic SurveyController. Question selection lives in resolvers/prestige.js. */
import { SurveyController } from './survey-controller.js';
import { createPrestigeFlow, prestigeAvailability, resolvePrestigeQuestion, prestigeSelectionMeta, prestigeTyped, prestigeTrigger } from './resolvers/prestige.js';

export function buildRecordIndex(pack) {
  const idx = new Map();
  const add = (r) => idx.set(r.id, r);
  pack.q4Depth.forEach(add);
  Object.values(pack.q5).forEach((c) => { c.options.forEach(add); add(c.decline); });
  return idx;
}

export function createPrestigeAdapter(knownClassIds) {
  return Object.freeze({
    kind: 'prestige',
    pagedQuestions: [],
    autoSkipReasons: ['blocked_source', 'not_applicable'],
    buildRecordIndex,
    /** rawCtx: { selectedClassId, classLevels (finalized) }. Null when it is not a newly acquired prestige class. */
    normalize({ selectedClassId, classLevels }) {
      const t = prestigeTrigger({ selectedClassId, classLevels, knownClassIds });
      if (!t.applicable) return null;
      return { ctx: { destinationClassId: t.destinationClassId, tense: 'pending' }, scopeKey: `prestige:${t.destinationClassId}`, scopeId: t.destinationClassId };
    },
    createFlow: (ctx) => createPrestigeFlow(ctx.destinationClassId),
    availability: prestigeAvailability,
    resolveQuestion: ({ pack, draft, qid, ctx, preview }) => resolvePrestigeQuestion({ pack, draft, qid, ctx, preview }),
    selectionMeta: prestigeSelectionMeta,
    browseSeen: () => [],
    goals: () => [], // no prestige answer declares a goal; a goal needs the explicit Discover/Explore/Affirm confirmation (MSV-RD-010)
    typed: prestigeTyped,
  });
}

export class PrestigeSurveyController extends SurveyController {
  constructor(deps, stored = null) { super(createPrestigeAdapter(Object.keys(deps.pack.classes)), deps, stored); }
}
