import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { normalizeCombatFeatureId } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';

/**
 * Combat Feature Preferences Service
 *
 * Phase 10 UX preference layer. Stores favorite/compact preferences under the
 * system flag namespace and annotates the display model. No combat math lives
 * here.
 */

const PREFERENCES_PATH = 'flags.foundryvtt-swse.combatFeatures.preferences';

function rawPreferences(actor) {
  const prefs = actor?.flags?.['foundryvtt-swse']?.combatFeatures?.preferences ?? {};
  return prefs && typeof prefs === 'object' ? prefs : {};
}

export function getCombatFeaturePreferences(actor) {
  const prefs = rawPreferences(actor);
  const favorites = prefs.favorites && typeof prefs.favorites === 'object' ? prefs.favorites : {};
  return {
    compactMode: prefs.compactMode === true,
    favorites: Object.fromEntries(Object.entries(favorites).filter(([, value]) => value === true))
  };
}

function featureIdentity(feature = {}) {
  return normalizeCombatFeatureId(feature.id ?? feature.name ?? feature.sourceName ?? '');
}

function annotateFeature(feature, preferences) {
  const id = featureIdentity(feature);
  if (!id) return feature;
  return {
    ...feature,
    id,
    isFavorite: preferences.favorites[id] === true,
    favoriteAction: 'toggle-combat-feature-favorite',
    detailAction: 'view-combat-feature-details'
  };
}

function annotateList(list, preferences) {
  if (!Array.isArray(list)) return [];
  return list.map(feature => annotateFeature(feature, preferences));
}

function annotateActionGroups(groups, preferences) {
  if (!Array.isArray(groups)) return [];
  return groups.map(group => ({
    ...group,
    actions: annotateList(group.actions, preferences)
  }));
}

function annotateTriggerGroups(groups, preferences) {
  if (!Array.isArray(groups)) return [];
  return groups.map(group => ({
    ...group,
    features: annotateList(group.features, preferences)
  }));
}

function annotatePassiveGroups(groups, preferences) {
  if (!Array.isArray(groups)) return [];
  return groups.map(group => ({
    ...group,
    riders: annotateList(group.riders, preferences)
  }));
}

function buildFavoriteFeatures(model, preferences) {
  const all = [
    ...annotateList(model.activeStates, preferences).map(feature => ({ ...feature, favoriteSection: 'Active' })),
    ...annotateList(model.availableActions, preferences).map(feature => ({ ...feature, favoriteSection: 'Action' })),
    ...annotateList(model.triggeredFeatures, preferences).map(feature => ({ ...feature, favoriteSection: 'Trigger' })),
    ...annotateList(model.passiveRiders, preferences).map(feature => ({ ...feature, favoriteSection: 'Passive' }))
  ];
  const seen = new Set();
  return all
    .filter(feature => feature.isFavorite)
    .filter(feature => {
      const key = `${feature.id}:${feature.sourceItemId ?? ''}:${feature.favoriteSection ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export function applyCombatFeaturePreferences(model, actor) {
  const preferences = getCombatFeaturePreferences(actor);
  const next = {
    ...model,
    preferences,
    activeStates: annotateList(model.activeStates, preferences),
    availableActions: annotateList(model.availableActions, preferences),
    triggeredFeatures: annotateList(model.triggeredFeatures, preferences),
    passiveRiders: annotateList(model.passiveRiders, preferences),
    availableActionGroups: annotateActionGroups(model.availableActionGroups, preferences),
    triggeredFeatureGroups: annotateTriggerGroups(model.triggeredFeatureGroups, preferences),
    passiveRiderGroups: annotatePassiveGroups(model.passiveRiderGroups, preferences)
  };
  return {
    ...next,
    favoriteFeatures: buildFavoriteFeatures(next, preferences)
  };
}

export async function toggleCombatFeatureFavorite(actor, featureId) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not control this actor.');
    return { success: false, reason: 'not-owner' };
  }
  const id = normalizeCombatFeatureId(featureId);
  if (!id) return { success: false, reason: 'missing-feature' };

  const preferences = getCombatFeaturePreferences(actor);
  const favorites = { ...preferences.favorites };
  const nextValue = favorites[id] !== true;
  if (nextValue) favorites[id] = true;
  else delete favorites[id];

  await ActorEngine.updateActor(actor, {
    [`${PREFERENCES_PATH}.favorites`]: favorites
  }, {
    meta: { guardKey: `combat-feature-favorite-${id}` },
    source: 'combat-feature-preferences-service'
  });

  ui?.notifications?.info?.(nextValue ? 'Combat feature added to favorites.' : 'Combat feature removed from favorites.');
  return { success: true, isFavorite: nextValue };
}

export async function toggleCombatFeaturesCompactMode(actor) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not control this actor.');
    return { success: false, reason: 'not-owner' };
  }
  const preferences = getCombatFeaturePreferences(actor);
  const compactMode = preferences.compactMode !== true;

  await ActorEngine.updateActor(actor, {
    [`${PREFERENCES_PATH}.compactMode`]: compactMode
  }, {
    meta: { guardKey: 'combat-feature-compact-mode' },
    source: 'combat-feature-preferences-service'
  });

  ui?.notifications?.info?.(compactMode ? 'Combat Features compact mode enabled.' : 'Combat Features expanded mode enabled.');
  return { success: true, compactMode };
}
