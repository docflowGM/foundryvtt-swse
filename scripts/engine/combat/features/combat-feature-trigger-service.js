import {
  COMBAT_FEATURE_AUTOMATION_STATUS,
  COMBAT_FEATURE_READINESS,
  COMBAT_FEATURE_TRIGGER_GROUP_ORDER,
  COMBAT_FEATURE_TRIGGER_GROUPS,
  normalizeCombatFeatureId
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import { canonicalCombatFeatureKey } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

/**
 * Combat Feature Trigger Service
 *
 * Phase 8 trigger-window registry. This module is display/state plumbing only:
 * it does not listen to chat cards yet, roll dice, spend actions, or mutate
 * actors. Future chat-card prompting should write/read pending trigger context
 * through this service boundary.
 */

export const COMBAT_FEATURE_TRIGGER_DESCRIPTORS = Object.freeze({
  deflect: {
    triggerId: 'hit-by-ranged-attack',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.DEFENSIVE_REACTION,
    triggerLabel: 'Hit by ranged attack',
    responseWindow: 'Reaction',
    trigger: 'When you are hit by a ranged attack while wielding a lightsaber.',
    result: 'Make a Use the Force check against the attack roll to negate the hit.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL
  },
  block: {
    triggerId: 'hit-by-melee-attack',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.DEFENSIVE_REACTION,
    triggerLabel: 'Hit by melee attack',
    responseWindow: 'Reaction',
    trigger: 'When you are hit by a melee attack while wielding a lightsaber.',
    result: 'Make a Use the Force check against the attack roll to negate the hit.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL
  },
  trip: {
    triggerId: 'melee-hit-control',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.GRAPPLE_CONTROL,
    triggerLabel: 'Melee hit control',
    responseWindow: 'On hit',
    trigger: 'When you hit with a melee attack and the target is eligible for a trip/control resolution.',
    result: 'Resolve the trip attempt manually until the combat maneuver pipeline is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  },
  throw: {
    triggerId: 'melee-hit-throw',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.GRAPPLE_CONTROL,
    triggerLabel: 'Throw control',
    responseWindow: 'On hit / grapple',
    trigger: 'When a melee, grapple, or control window allows throwing the target.',
    result: 'Resolve the throw manually until the combat maneuver pipeline is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  },
  pin: {
    triggerId: 'grapple-pin-window',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.GRAPPLE_CONTROL,
    triggerLabel: 'Grapple pin window',
    responseWindow: 'Grapple',
    trigger: 'When you are resolving a grapple/control action that can pin the target.',
    result: 'Apply the pin/control rule manually until grapple automation is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  },
  crush: {
    triggerId: 'damage-grappled-target',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.ON_HIT_RIDER,
    triggerLabel: 'Damage grappled target',
    responseWindow: 'On damage',
    trigger: 'When you deal damage to a target you are grappling.',
    result: 'Apply the extra crush rider manually until grapple damage automation is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  },
  'crush-pinned-opponent': {
    triggerId: 'damage-pinned-target',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.ON_HIT_RIDER,
    triggerLabel: 'Damage pinned target',
    responseWindow: 'On damage',
    trigger: 'When you damage a pinned or controlled opponent and this rider applies.',
    result: 'Apply the rider manually until pinned-target damage automation is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  },
  'combat-reflexes': {
    triggerId: 'attack-of-opportunity',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.OPPORTUNITY,
    triggerLabel: 'Attack of opportunity window',
    responseWindow: 'Reaction',
    trigger: 'When an attack of opportunity trigger occurs.',
    result: 'Use this reminder to resolve attacks of opportunity and extra reaction capacity where supported.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL
  },
  'erratic-target': {
    triggerId: 'targeted-while-moving',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.DEFENSIVE_REACTION,
    triggerLabel: 'Targeted while moving',
    responseWindow: 'Conditional defense',
    trigger: 'When this droid/target is attacked while the feature context applies.',
    result: 'Apply the defensive rider manually until the targeting pipeline is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  },
  'droid-shield-mastery': {
    triggerId: 'shield-defense-window',
    groupId: COMBAT_FEATURE_TRIGGER_GROUPS.DEFENSIVE_REACTION,
    triggerLabel: 'Shield defense window',
    responseWindow: 'Conditional defense',
    trigger: 'When shield defense or shield damage mitigation is relevant.',
    result: 'Apply the shield rider manually until shield automation is wired.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL
  }
});

function pendingTriggerRoot(actor) {
  return actor?.flags?.['foundryvtt-swse']?.combatFeatures?.pendingTriggers ?? {};
}

export function getCombatFeatureTriggerDescriptor(featureId) {
  const key = canonicalCombatFeatureKey(featureId);
  return COMBAT_FEATURE_TRIGGER_DESCRIPTORS[key] ?? COMBAT_FEATURE_TRIGGER_DESCRIPTORS[normalizeCombatFeatureId(featureId)] ?? null;
}

export function isTriggeredCombatFeature(featureId) {
  return !!getCombatFeatureTriggerDescriptor(featureId);
}

export function getPendingCombatFeatureTrigger(actor, triggerId) {
  const id = normalizeCombatFeatureId(triggerId);
  const pending = pendingTriggerRoot(actor)?.[id];
  return pending && typeof pending === 'object' && pending.active !== false ? pending : null;
}

export function enrichTriggeredCombatFeature(actor, feature = {}) {
  const descriptor = getCombatFeatureTriggerDescriptor(feature.id);
  if (!descriptor) return feature;
  const pending = getPendingCombatFeatureTrigger(actor, descriptor.triggerId);
  const readiness = pending ? COMBAT_FEATURE_READINESS.PENDING : COMBAT_FEATURE_READINESS.WATCHING;

  return {
    ...feature,
    triggerId: descriptor.triggerId,
    triggerGroupId: descriptor.groupId,
    triggerGroupLabel: COMBAT_FEATURE_TRIGGER_GROUP_ORDER.find(group => group.id === descriptor.groupId)?.label ?? 'Other Triggers',
    triggerLabel: descriptor.triggerLabel,
    trigger: descriptor.trigger ?? feature.trigger ?? 'Conditional combat trigger.',
    result: descriptor.result ?? feature.result ?? feature.summary ?? 'Resolve this feature when its trigger occurs.',
    responseWindow: descriptor.responseWindow ?? feature.responseWindow ?? null,
    pendingContext: pending,
    readiness,
    automationStatus: descriptor.automationStatus ?? feature.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    tags: Array.from(new Set([...(Array.isArray(feature.tags) ? feature.tags : []), 'triggered', descriptor.groupId, readiness.toLowerCase()]))
  };
}

export function buildTriggeredFeatureGroups(actor, triggeredFeatures = []) {
  const groups = COMBAT_FEATURE_TRIGGER_GROUP_ORDER.map(definition => ({
    ...definition,
    count: 0,
    features: []
  }));
  const byId = new Map(groups.map(group => [group.id, group]));

  for (const rawFeature of triggeredFeatures) {
    const feature = enrichTriggeredCombatFeature(actor, rawFeature);
    const group = byId.get(feature.triggerGroupId) ?? byId.get(COMBAT_FEATURE_TRIGGER_GROUPS.OTHER);
    group.features.push(feature);
  }

  for (const group of groups) {
    group.features.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    group.count = group.features.length;
    group.hasFeatures = group.count > 0;
  }

  return groups.filter(group => group.hasFeatures);
}
