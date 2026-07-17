/**
 * Combat Feature Contract
 *
 * Phase 0 scaffold for the Combat Features reform.
 *
 * This module intentionally contains only data-shape constants and pure helpers.
 * It must not roll dice, mutate actors, spend actions, create effects, or compute
 * combat math. Sheet adapters and routers can import this to agree on the stable
 * display/action contract while the old combat action hotfix remains a temporary
 * compatibility bridge.
 */

export const COMBAT_FEATURE_BUCKETS = Object.freeze({
  ACTIVE_STATES: 'activeStates',
  AVAILABLE_ACTIONS: 'availableActions',
  TRIGGERED_FEATURES: 'triggeredFeatures',
  PASSIVE_RIDERS: 'passiveRiders'
});

export const COMBAT_FEATURE_ACTION_GROUPS = Object.freeze({
  SWIFT: 'swift',
  MOVE: 'move',
  STANDARD: 'standard',
  FULL_ROUND: 'full-round',
  REACTION: 'reaction',
  FREE: 'free',
  ATTACK_OPTION: 'attack-option',
  OTHER: 'other'
});

export const COMBAT_FEATURE_ACTION_GROUP_ORDER = Object.freeze([
  { id: COMBAT_FEATURE_ACTION_GROUPS.SWIFT, label: 'Swift Actions', hint: 'Fast tactical toggles and once-per-turn choices.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.MOVE, label: 'Move Actions', hint: 'Movement or repositioning actions.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.STANDARD, label: 'Standard Actions', hint: 'Primary single-action combat options.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.FULL_ROUND, label: 'Full-Round Actions', hint: 'Consumes the full round or full attack sequence.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.REACTION, label: 'Reactions', hint: 'Responses outside the actor\'s normal turn.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.FREE, label: 'Free Actions', hint: 'Free or incidental combat choices.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.ATTACK_OPTION, label: 'Attack Options', hint: 'Options applied through the normal attack roller.' },
  { id: COMBAT_FEATURE_ACTION_GROUPS.OTHER, label: 'Other Actions', hint: 'Combat features without a mapped economy lane yet.' }
]);

export const COMBAT_FEATURE_AUTOMATION_STATUS = Object.freeze({
  AUTOMATED: 'automated',
  PARTIAL: 'partial',
  MANUAL: 'manual'
});

export const COMBAT_FEATURE_READINESS = Object.freeze({
  READY: 'Ready',
  USED: 'Used',
  MISSING: 'Missing',
  GM: 'GM',
  PASSIVE: 'Passive',
  ACTIVE: 'Active'
});

export const COMBAT_FEATURE_ACTIONS = Object.freeze({
  VIEW: 'view-combat-feature',
  ACTIVATE: 'activate-combat-feature',
  DEACTIVATE: 'deactivate-combat-feature',
  EXECUTE_ATTACK_OPTION: 'execute-combat-feature-attack-option',
  EXECUTE_MULTIATTACK: 'execute-combat-feature-multiattack',
  EXECUTE_RESOURCE: 'execute-combat-feature-resource'
});

export function normalizeCombatFeatureId(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function emptyCombatFeaturesModel() {
  return {
    [COMBAT_FEATURE_BUCKETS.ACTIVE_STATES]: [],
    [COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS]: [],
    availableActionGroups: [],
    [COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES]: [],
    [COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS]: [],
    badges: {
      hasRageActive: false,
      rageLabel: 'Rage Inactive',
      activeStateCount: 0,
      readyActionCount: 0,
      availableActionGroupCount: 0,
      passiveRiderCount: 0,
      manualFeatureCount: 0
    }
  };
}

export function combatFeatureSummaryCounts(model = emptyCombatFeaturesModel()) {
  const activeStates = Array.isArray(model.activeStates) ? model.activeStates : [];
  const availableActions = Array.isArray(model.availableActions) ? model.availableActions : [];
  const availableActionGroups = Array.isArray(model.availableActionGroups) ? model.availableActionGroups : [];
  const triggeredFeatures = Array.isArray(model.triggeredFeatures) ? model.triggeredFeatures : [];
  const passiveRiders = Array.isArray(model.passiveRiders) ? model.passiveRiders : [];
  const manualFeatureCount = [...activeStates, ...availableActions, ...triggeredFeatures, ...passiveRiders]
    .filter(feature => feature?.automationStatus === COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL)
    .length;

  return {
    activeStateCount: activeStates.length,
    readyActionCount: availableActions.filter(feature => feature?.readiness !== COMBAT_FEATURE_READINESS.USED).length,
    availableActionGroupCount: availableActionGroups.filter(group => Array.isArray(group.actions) && group.actions.length).length,
    passiveRiderCount: passiveRiders.length,
    manualFeatureCount
  };
}

export function withCombatFeatureBadges(model = emptyCombatFeaturesModel()) {
  const counts = combatFeatureSummaryCounts(model);
  return {
    ...model,
    badges: {
      ...emptyCombatFeaturesModel().badges,
      ...(model.badges || {}),
      ...counts
    }
  };
}
