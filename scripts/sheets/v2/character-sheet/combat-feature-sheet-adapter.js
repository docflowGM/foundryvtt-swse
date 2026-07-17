import {
  COMBAT_FEATURE_ACTIONS,
  COMBAT_FEATURE_AUTOMATION_STATUS,
  COMBAT_FEATURE_BUCKETS,
  COMBAT_FEATURE_READINESS,
  emptyCombatFeaturesModel,
  withCombatFeatureBadges
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import {
  activeCombatFeatureEffects,
  classifyCombatFeatureEffect,
  classifyCombatFeatureItem,
  getCombatFeatureProfile
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

/**
 * CombatFeatureSheetAdapter
 *
 * Phase 2 adapter for the Combat Features reform. This class builds the display
 * model consumed by the future Combat Features panel. Source-item and effect
 * classification now lives in `combat-feature-classifier.js`.
 *
 * This adapter remains pure: no actor mutation, no roll math, no action
 * spending, and no effect creation.
 */

function pushUnique(bucket, feature) {
  if (!feature?.id) return;
  const existingIndex = bucket.findIndex(entry => entry.id === feature.id && entry.sourceItemId === feature.sourceItemId);
  if (existingIndex >= 0) bucket[existingIndex] = { ...bucket[existingIndex], ...feature };
  else bucket.push(feature);
}

function addActiveEffects(model, actor) {
  for (const effect of activeCombatFeatureEffects(actor)) {
    const entry = classifyCombatFeatureEffect(effect);
    if (!entry?.feature?.id || entry.bucket !== COMBAT_FEATURE_BUCKETS.ACTIVE_STATES) continue;
    if (model.activeStates.some(state => state.id === entry.feature.id)) continue;
    pushUnique(model.activeStates, entry.feature);
  }
}

function addSecondWindFallback(model, actor) {
  const hasAlready = [...model.availableActions, ...model.activeStates].some(feature => feature.id === 'second-wind');
  if (hasAlready || actor?.type !== 'character') return;

  const profile = getCombatFeatureProfile('second-wind') ?? {};
  pushUnique(model.availableActions, {
    id: 'second-wind',
    name: 'Second Wind',
    sourceName: 'Character Level',
    sourceType: profile.sourceType ?? 'Class Feature',
    sourceItemId: null,
    summary: profile.summary ?? 'Regain HP using the character-level Second Wind feature.',
    actionCost: profile.actionCost ?? 'Swift',
    timing: profile.timing ?? 'Encounter',
    remainingUses: null,
    maxUses: 1,
    readiness: COMBAT_FEATURE_READINESS.READY,
    buttonLabel: profile.buttonLabel ?? 'Use',
    canExecute: true,
    executeAction: profile.executeAction ?? COMBAT_FEATURE_ACTIONS.EXECUTE_RESOURCE,
    automationStatus: profile.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    tags: profile.tags ?? ['swift', 'encounter', 'partial']
  });
}

function sortFeatureList(list = []) {
  return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export class CombatFeatureSheetAdapter {
  static build(actor, _options = {}) {
    const model = emptyCombatFeaturesModel();
    if (!actor) return withCombatFeatureBadges(model);

    for (const item of actor.items ?? []) {
      const entry = classifyCombatFeatureItem(actor, item);
      if (!entry?.bucket || !model[entry.bucket]) continue;
      pushUnique(model[entry.bucket], entry.feature);
    }

    addActiveEffects(model, actor);
    addSecondWindFallback(model, actor);

    for (const key of Object.values(COMBAT_FEATURE_BUCKETS)) sortFeatureList(model[key]);

    const rageActive = model.activeStates.some(feature => feature.id === 'rage');
    return withCombatFeatureBadges({
      ...model,
      badges: {
        ...model.badges,
        hasRageActive: rageActive,
        rageLabel: rageActive ? 'Rage Active' : 'Rage Inactive'
      }
    });
  }
}

export default CombatFeatureSheetAdapter;
