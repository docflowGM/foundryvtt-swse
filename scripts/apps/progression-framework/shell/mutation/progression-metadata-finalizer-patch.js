import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { ProgressionMetadataPlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/progression-metadata-plan-builder.js';

const PATCH_ID = 'progression-finalizer-metadata-plan-builder-v1';

function removeMetadataKeys(set = {}, mode = 'chargen') {
  delete set['flags.swse.levelUpEntitlementManifest'];
  delete set['flags.swse.levelUpFinalizationReceipt'];
  delete set[`flags.foundryvtt-swse.progression.${mode}.completed`];
  delete set['system.progression.lastCompletedMode'];
  delete set['system.progression.completedSessionId'];
  delete set['system.progression.completedAt'];
  delete set['system.progression.chargenComplete'];
  delete set['flags.foundryvtt-swse.progression.chargen.completedAt'];
}

export function registerProgressionMetadataFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseMetadataPlanBuilderPatch === PATCH_ID) return;

  const originalCompileMutationPlan = ProgressionFinalizer._compileMutationPlan;
  if (typeof originalCompileMutationPlan === 'function') {
    ProgressionFinalizer._compileMutationPlan = async function compileMutationPlanWithMetadataBuilder(sessionState, actor, options = {}) {
      const plan = await originalCompileMutationPlan.call(this, sessionState, actor, options);
      if (!plan?.set) return plan;

      const fragment = ProgressionMetadataPlanBuilder.buildSet({
        actor,
        sessionState,
        levelUpManifest: plan.set['flags.swse.levelUpEntitlementManifest'] || null,
      });

      removeMetadataKeys(plan.set, sessionState.mode);
      Object.assign(plan.set, fragment);
      return plan;
    };
  }

  ProgressionFinalizer.__swseMetadataPlanBuilderPatch = PATCH_ID;
}

registerProgressionMetadataFinalizerPatch();

export default registerProgressionMetadataFinalizerPatch;
