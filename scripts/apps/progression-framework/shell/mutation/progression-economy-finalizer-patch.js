import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { ProgressionEconomyPlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js';
import { isDroidProgressionActor } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js';

const PATCH_ID = 'progression-finalizer-economy-plan-builder-v1';

const ECONOMY_SET_KEYS = new Set([
  'system.hp.value',
  'system.hp.max',
  'system.credits',
  'flags.swse.progressionHistory',
  'system.forcePoints.max',
  'system.forcePoints.value',
  'system.progression.lastForcePointRefresh',
  'system.progression.lastHpGain',
  'system.progression.lastCreditDelta',
]);

function shouldCompileEconomy(sessionState = {}) {
  return sessionState.mode === 'chargen' || sessionState.mode === 'levelup';
}

function removeInlineEconomyKeys(set = {}) {
  for (const key of Object.keys(set || {})) {
    if (ECONOMY_SET_KEYS.has(key)) delete set[key];
  }
}

export function registerProgressionEconomyFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseEconomyPlanBuilderPatch === PATCH_ID) return;

  const originalCompileMutationPlan = ProgressionFinalizer._compileMutationPlan;
  if (typeof originalCompileMutationPlan === 'function') {
    ProgressionFinalizer._compileMutationPlan = async function compileMutationPlanWithEconomyBuilder(sessionState, actor, options = {}) {
      const plan = await originalCompileMutationPlan.call(this, sessionState, actor, options);
      if (!plan?.set || !shouldCompileEconomy(sessionState)) return plan;

      const selections = sessionState?.progressionSession?.draftSelections || {};
      const isDroidProgression = isDroidProgressionActor(actor, {
        subtype: sessionState.progressionSession?.subtype,
        droidContext: sessionState.progressionSession?.droidContext,
        droid: selections.droid,
      });
      const fragment = ProgressionEconomyPlanBuilder.buildSet({
        actor,
        selections,
        sessionState,
        planSet: plan.set,
        isDroidProgression,
      });

      removeInlineEconomyKeys(plan.set);
      Object.assign(plan.set, fragment);
      return plan;
    };
  }

  ProgressionFinalizer.__swseEconomyPlanBuilderPatch = PATCH_ID;
}

registerProgressionEconomyFinalizerPatch();

export default registerProgressionEconomyFinalizerPatch;
