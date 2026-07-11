import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { ForcePlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/force-plan-builder.js';

const PATCH_ID = 'progression-finalizer-force-plan-builder-v1';
const FORCE_KEYS = ['forcePowers', 'forceRegimens', 'forceTechniques', 'forceSecrets'];

function hasForceSelections(selections = {}) {
  return FORCE_KEYS.some((key) => Array.isArray(selections[key]) && selections[key].length > 0);
}

function stripForceSelections(selections = {}) {
  return {
    ...selections,
    forcePowers: [],
    forceRegimens: [],
    forceTechniques: [],
    forceSecrets: [],
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mergePostApply(base = {}, force = {}) {
  return {
    ...force,
    ...base,
    starshipManeuverNames: [
      ...asArray(force.starshipManeuverNames),
      ...asArray(base.starshipManeuverNames),
    ],
    starshipManeuverRemoveItemIds: [
      ...asArray(force.starshipManeuverRemoveItemIds),
      ...asArray(base.starshipManeuverRemoveItemIds),
    ],
    forceTechniqueEntries: [
      ...asArray(force.forceTechniqueEntries),
      ...asArray(base.forceTechniqueEntries),
    ],
    forceSecretEntries: [
      ...asArray(force.forceSecretEntries),
      ...asArray(base.forceSecretEntries),
    ],
  };
}

function mergeCompiledAbilityItems(base = {}, force = {}) {
  return {
    items: [
      ...asArray(force.items),
      ...asArray(base.items),
    ],
    deleteItems: [
      ...asArray(force.deleteItems),
      ...asArray(base.deleteItems),
    ],
    postApply: mergePostApply(base.postApply || {}, force.postApply || {}),
  };
}

export function registerForceFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseForcePlanBuilderPatch === PATCH_ID) return;

  const originalCompileProgressionAbilityItems = ProgressionFinalizer._compileProgressionAbilityItems;
  if (typeof originalCompileProgressionAbilityItems !== 'function') return;

  ProgressionFinalizer._compileProgressionAbilityItems = async function compileProgressionAbilityItemsWithForceBuilder(actor, selections = {}, sessionState = {}) {
    if (!hasForceSelections(selections)) {
      return originalCompileProgressionAbilityItems.call(this, actor, selections, sessionState);
    }

    const forceCompiled = await ForcePlanBuilder.build({ actor, selections, sessionState });
    const remainingCompiled = await originalCompileProgressionAbilityItems.call(
      this,
      actor,
      stripForceSelections(selections),
      sessionState
    );

    return mergeCompiledAbilityItems(remainingCompiled, forceCompiled);
  };

  ProgressionFinalizer._getForcePowerMasteryChoice = function getForcePowerMasteryChoiceViaBuilder(entry = {}) {
    return ForcePlanBuilder.getForcePowerMasteryChoice(entry);
  };
  ProgressionFinalizer._getForcePowerMasteryDisplayName = function getForcePowerMasteryDisplayNameViaBuilder(baseName, choice) {
    return ForcePlanBuilder.getForcePowerMasteryDisplayName(baseName, choice);
  };
  ProgressionFinalizer._collectOwnedForcePowerItemIds = function collectOwnedForcePowerItemIdsViaBuilder(actor, rawEntry, removeCount = 0) {
    return ForcePlanBuilder.collectOwnedForcePowerItemIds(actor, rawEntry, removeCount);
  };

  ProgressionFinalizer.__swseForcePlanBuilderPatch = PATCH_ID;
}

registerForceFinalizerPatch();

export default registerForceFinalizerPatch;
