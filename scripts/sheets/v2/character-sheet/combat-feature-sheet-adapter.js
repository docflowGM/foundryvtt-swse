import {
  COMBAT_FEATURE_ACTIONS,
  COMBAT_FEATURE_ACTION_GROUP_ORDER,
  COMBAT_FEATURE_ACTION_GROUPS,
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
import {
  buildUniversalCombatStateActions,
  getActiveCombatFeatureStates
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-active-state-service.js';

/**
 * CombatFeatureSheetAdapter
 *
 * Phase 7 adapter for the Combat Features reform. Source-item and effect
 * classification lives in `combat-feature-classifier.js`; this adapter assembles
 * the model, adds action-economy groupings, and exposes tracked active combat
 * states from the combat feature state service.
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

function removeAvailableAction(model, featureId) {
  model.availableActions = model.availableActions.filter(feature => feature.id !== featureId);
}

function addActiveEffects(model, actor) {
  for (const effect of activeCombatFeatureEffects(actor)) {
    const entry = classifyCombatFeatureEffect(effect);
    if (!entry?.feature?.id || entry.bucket !== COMBAT_FEATURE_BUCKETS.ACTIVE_STATES) continue;
    if (model.activeStates.some(state => state.id === entry.feature.id)) continue;
    pushUnique(model.activeStates, entry.feature);
  }
}

function addTrackedActiveStates(model, actor) {
  for (const feature of getActiveCombatFeatureStates(actor)) {
    pushUnique(model.activeStates, feature);
    removeAvailableAction(model, feature.id);
  }
}

function addUniversalCombatStateActions(model, actor) {
  for (const feature of buildUniversalCombatStateActions(actor)) {
    const hasAlready = [...model.availableActions, ...model.activeStates].some(entry => entry.id === feature.id);
    if (!hasAlready) pushUnique(model.availableActions, feature);
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

function availableActionGroupId(feature = {}) {
  const haystack = [feature.actionCost, feature.timing, ...(Array.isArray(feature.tags) ? feature.tags : [])]
    .join(' ')
    .toLowerCase();

  if (/attack[-\s]?option|melee attack option|ranged attack option|area attack option/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.ATTACK_OPTION;
  if (/full[-\s]?round|full attack|multiattack/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.FULL_ROUND;
  if (/reaction|response|attack of opportunity|triggered/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.REACTION;
  if (/swift/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.SWIFT;
  if (/move/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.MOVE;
  if (/standard/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.STANDARD;
  if (/free/.test(haystack)) return COMBAT_FEATURE_ACTION_GROUPS.FREE;
  return COMBAT_FEATURE_ACTION_GROUPS.OTHER;
}

function buildAvailableActionGroups(availableActions = []) {
  const groups = COMBAT_FEATURE_ACTION_GROUP_ORDER.map(definition => ({
    ...definition,
    count: 0,
    actions: []
  }));
  const byId = new Map(groups.map(group => [group.id, group]));

  for (const action of availableActions) {
    const groupId = availableActionGroupId(action);
    const group = byId.get(groupId) ?? byId.get(COMBAT_FEATURE_ACTION_GROUPS.OTHER);
    group.actions.push({
      ...action,
      actionGroupId: group.id,
      actionGroupLabel: group.label
    });
  }

  for (const group of groups) {
    sortFeatureList(group.actions);
    group.count = group.actions.length;
    group.hasActions = group.count > 0;
  }

  return groups.filter(group => group.hasActions);
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
    addTrackedActiveStates(model, actor);
    addUniversalCombatStateActions(model, actor);
    addSecondWindFallback(model, actor);

    for (const key of Object.values(COMBAT_FEATURE_BUCKETS)) sortFeatureList(model[key]);
    model.availableActionGroups = buildAvailableActionGroups(model.availableActions);

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
