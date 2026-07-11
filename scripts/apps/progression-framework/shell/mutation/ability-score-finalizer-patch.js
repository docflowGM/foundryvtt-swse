import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { AbilityScorePlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/ability-score-plan-builder.js';
import { ProgressionRules } from '/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js';

const PATCH_ID = 'progression-finalizer-ability-score-plan-builder-v1';
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_SET_KEY_RE = /^system\.attributes\.(str|dex|con|int|wis|cha)\.base$/;

function hasOwnKeys(value = {}) {
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

function abilitySelectionShouldCompile(sessionState = {}, attr = {}) {
  return sessionState?.mode === 'chargen' || hasOwnKeys(attr);
}

function removeInlineAbilitySetKeys(set = {}) {
  for (const key of Object.keys(set || {})) {
    if (ABILITY_SET_KEY_RE.test(key)) delete set[key];
  }
  delete set['system.progression.lastAbilityIncrease'];
  delete set['system.progression.abilityIncreaseHistory'];
}

function buildFullFinalizerAbilitySet(actor, sessionState = {}, plan = {}) {
  const selections = sessionState?.progressionSession?.draftSelections || {};
  const attr = selections.attributes || {};
  if (!abilitySelectionShouldCompile(sessionState, attr)) return null;

  const hasAttributeSelection = hasOwnKeys(selections.attributes || {});
  const attrValues = hasAttributeSelection || sessionState.mode === 'chargen'
    ? ProgressionFinalizer._normalizeAttributeValues(attr, actor)
    : {};

  return AbilityScorePlanBuilder.buildSet({
    mode: sessionState.mode,
    actor,
    // Chargen historically writes normalized base attrValues, not final species-adjusted totals.
    // Level-up needs the raw attr object because it carries the increase ledger.
    attr: sessionState.mode === 'levelup' ? attr : {},
    attrValues,
    manifest: plan?.set?.['flags.swse.levelUpEntitlementManifest'] || null,
    getAllocationMode: () => ProgressionRules.getAbilityIncreaseAllocationMode?.(),
    source: 'progression-finalizer',
  });
}

function assertNonEmptyAbilitySet(set = {}, message) {
  if (!ABILITY_KEYS.some(key => Object.prototype.hasOwnProperty.call(set, `system.attributes.${key}.base`))) {
    throw new Error(message);
  }
}

export function registerAbilityScoreFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseAbilityScorePlanBuilderPatch === PATCH_ID) return;

  const originalCompileMutationPlan = ProgressionFinalizer._compileMutationPlan;
  if (typeof originalCompileMutationPlan === 'function') {
    ProgressionFinalizer._compileMutationPlan = async function compileMutationPlanWithAbilityBuilder(sessionState, actor, options = {}) {
      const plan = await originalCompileMutationPlan.call(this, sessionState, actor, options);
      const abilitySet = buildFullFinalizerAbilitySet(actor, sessionState, plan);
      if (abilitySet && plan?.set) {
        removeInlineAbilitySetKeys(plan.set);
        Object.assign(plan.set, abilitySet);
      }
      return plan;
    };
  }

  ProgressionFinalizer._compileSingleStepAttributeSet = function compileSingleStepAttributeSetWithAbilityBuilder(actor, attr = {}, _options = {}) {
    const mode = attr?.mode === 'levelup-ability-increase' || attr?.increases ? 'levelup' : 'chargen';
    const set = AbilityScorePlanBuilder.buildSet({
      mode,
      actor,
      attr,
      attrValues: mode === 'chargen' ? {} : undefined,
      manifest: {
        characterLevel: Number(attr?.abilityIncreaseLevel || attr?.characterLevel || attr?.level || actor?.system?.level || actor?.system?.details?.level || 0) || null,
      },
      getAllocationMode: () => ProgressionRules.getAbilityIncreaseAllocationMode?.(),
      source: 'single-step-progression',
    });
    assertNonEmptyAbilitySet(set, mode === 'levelup'
      ? 'Choose at least one ability score increase before confirming.'
      : 'Choose ability scores before confirming.');
    return set;
  };

  ProgressionFinalizer.__swseAbilityScorePlanBuilderPatch = PATCH_ID;
}

registerAbilityScoreFinalizerPatch();

export default registerAbilityScoreFinalizerPatch;
