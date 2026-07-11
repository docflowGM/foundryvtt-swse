import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { FeatTalentPlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/feat-talent-plan-builder.js';

const PATCH_ID = 'progression-finalizer-feat-talent-plan-builder-v1';

function hasFeatTalentSelections(selections = {}) {
  return (Array.isArray(selections.feats) && selections.feats.length > 0)
    || (Array.isArray(selections.talents) && selections.talents.length > 0);
}

function stripFeatTalentSelections(selections = {}) {
  return {
    ...selections,
    feats: [],
    talents: [],
  };
}

function mergeCompiledAbilityItems(base = {}, featTalent = {}) {
  return {
    items: [
      ...(Array.isArray(featTalent.items) ? featTalent.items : []),
      ...(Array.isArray(base.items) ? base.items : []),
    ],
    deleteItems: [
      ...(Array.isArray(featTalent.deleteItems) ? featTalent.deleteItems : []),
      ...(Array.isArray(base.deleteItems) ? base.deleteItems : []),
    ],
    postApply: {
      ...(featTalent.postApply || {}),
      ...(base.postApply || {}),
      starshipManeuverNames: [
        ...((featTalent.postApply || {}).starshipManeuverNames || []),
        ...((base.postApply || {}).starshipManeuverNames || []),
      ],
      starshipManeuverRemoveItemIds: [
        ...((featTalent.postApply || {}).starshipManeuverRemoveItemIds || []),
        ...((base.postApply || {}).starshipManeuverRemoveItemIds || []),
      ],
      forceTechniqueEntries: [
        ...((featTalent.postApply || {}).forceTechniqueEntries || []),
        ...((base.postApply || {}).forceTechniqueEntries || []),
      ],
      forceSecretEntries: [
        ...((featTalent.postApply || {}).forceSecretEntries || []),
        ...((base.postApply || {}).forceSecretEntries || []),
      ],
    },
  };
}

export function registerFeatTalentFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseFeatTalentPlanBuilderPatch === PATCH_ID) return;

  const originalCompileProgressionAbilityItems = ProgressionFinalizer._compileProgressionAbilityItems;
  if (typeof originalCompileProgressionAbilityItems !== 'function') return;

  ProgressionFinalizer._compileProgressionAbilityItems = async function compileProgressionAbilityItemsWithFeatTalentBuilder(actor, selections = {}, sessionState = {}) {
    if (!hasFeatTalentSelections(selections)) {
      return originalCompileProgressionAbilityItems.call(this, actor, selections, sessionState);
    }

    const featTalentCompiled = await FeatTalentPlanBuilder.build({ actor, selections, sessionState });
    const remainingCompiled = await originalCompileProgressionAbilityItems.call(
      this,
      actor,
      stripFeatTalentSelections(selections),
      sessionState
    );

    return mergeCompiledAbilityItems(remainingCompiled, featTalentCompiled);
  };

  // Keep legacy helper methods available, but route their implementation through
  // the extracted builder so any external call sites see the same behavior.
  ProgressionFinalizer._expandCombinedTalentGrantEntries = function expandCombinedTalentGrantEntriesViaBuilder(entry) {
    return FeatTalentPlanBuilder.expandCombinedTalentGrantEntries(entry);
  };
  ProgressionFinalizer._isRepeatableTalentEntry = function isRepeatableTalentEntryViaBuilder(entry = {}, resolvedData = null) {
    return FeatTalentPlanBuilder.isRepeatableTalentEntry(entry, resolvedData);
  };

  ProgressionFinalizer.__swseFeatTalentPlanBuilderPatch = PATCH_ID;
}

registerFeatTalentFinalizerPatch();

export default registerFeatTalentFinalizerPatch;
