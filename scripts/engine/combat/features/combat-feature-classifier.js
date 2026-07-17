import {
  COMBAT_FEATURE_ACTIONS,
  COMBAT_FEATURE_AUTOMATION_STATUS,
  COMBAT_FEATURE_BUCKETS,
  COMBAT_FEATURE_READINESS,
  normalizeCombatFeatureId
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';

/**
 * Combat Feature Classifier
 *
 * Phase 2 of the Combat Features reform. This module owns source-item/effect
 * classification and display-shape enrichment. It is deliberately pure: no
 * actor mutation, no action spending, no roll execution, and no combat math.
 */

export const SOURCE_TYPE_LABELS = Object.freeze({
  feat: 'Feat',
  talent: 'Talent',
  'species-trait': 'Species Trait',
  species: 'Species Trait',
  'class-feature': 'Class Feature',
  classFeature: 'Class Feature',
  equipment: 'Equipment',
  armor: 'Equipment',
  weapon: 'Weapon',
  trait: 'Trait'
});

export const FEATURE_PROFILES = Object.freeze({
  rage: {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Species Trait',
    actionCost: 'Swift',
    timing: 'Encounter',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    buttonLabel: 'View Rage',
    executeAction: COMBAT_FEATURE_ACTIONS.VIEW,
    summary: 'Enter or track a rage state. Bonuses and penalties are shown for table handling until full automation is wired.',
    deltas: [
      { label: 'Melee Atk +2', v: 2, tone: 'pos' },
      { label: 'Melee Dmg +2', v: 2, tone: 'pos' },
      { label: 'Reflex -2', v: -2, tone: 'neg' },
      { label: 'Will -2', v: -2, tone: 'neg' }
    ],
    tags: ['swift', 'encounter', 'manual']
  },
  braced: {
    bucket: COMBAT_FEATURE_BUCKETS.ACTIVE_STATES,
    sourceType: 'Stance',
    actionCost: 'Swift',
    timing: 'Stance',
    durationLabel: 'Until you move',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    canDeactivate: true,
    deactivateAction: COMBAT_FEATURE_ACTIONS.DEACTIVATE,
    summary: 'Weapon braced against cover or a bipod. Used as a tracked combat stance.',
    deltas: [{ label: 'Autofire penalty reduced or ignored', tone: 'pos' }],
    tags: ['swift', 'stance', 'active', 'manual']
  },
  'second-wind': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Class Feature',
    actionCost: 'Swift',
    timing: 'Encounter',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Use',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_RESOURCE,
    summary: 'Regain HP equal to damage threshold or one-quarter maximum HP, whichever is higher.',
    tags: ['swift', 'encounter', 'partial']
  },
  'power-attack': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Attack',
    timing: 'Melee attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Trade up to your BAB from melee attack rolls for bonus melee damage.',
    deltas: [{ label: 'Atk -X / Dmg +X', tone: 'neg' }],
    tags: ['attack-option', 'melee', 'partial']
  },
  flurry: {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Attack',
    timing: 'Melee attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Make a more aggressive melee attack option through the normal attack roller.',
    tags: ['attack-option', 'melee', 'partial']
  },
  'rapid-strike': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Attack',
    timing: 'Melee attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Apply Rapid Strike through the normal attack roller.',
    tags: ['attack-option', 'melee', 'partial']
  },
  'power-blast': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Swift + Attack',
    timing: 'Ranged attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Trade up to your BAB from ranged attack rolls for bonus ranged damage.',
    deltas: [{ label: 'Ranged Atk -X / Dmg +X', tone: 'neg' }],
    tags: ['attack-option', 'ranged', 'partial']
  },
  'burst-fire': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Attack',
    timing: 'Ranged attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Use Burst Fire through the normal ranged attack roller.',
    tags: ['attack-option', 'ranged', 'partial']
  },
  'rapid-shot': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Attack',
    timing: 'Ranged attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Use Rapid Shot through the normal ranged attack roller.',
    tags: ['attack-option', 'ranged', 'partial']
  },
  autofire: {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Weapon Mode',
    actionCost: 'Full-Round',
    timing: 'Area attack option',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION,
    summary: 'Use Autofire through the normal attack roller with area/autofire context.',
    tags: ['attack-option', 'ranged', 'area', 'partial']
  },
  'double-attack': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Full-Round',
    timing: 'Multiattack',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack x2',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_MULTIATTACK,
    summary: 'Make two separate attacks through the normal attack roller, applying the package penalty to each attack.',
    tags: ['multiattack', 'full-round', 'partial']
  },
  'triple-attack': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Feat',
    actionCost: 'Full-Round',
    timing: 'Multiattack',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    buttonLabel: 'Attack x3',
    executeAction: COMBAT_FEATURE_ACTIONS.EXECUTE_MULTIATTACK,
    summary: 'Make three separate attacks through the normal attack roller, applying the package penalty to each attack.',
    tags: ['multiattack', 'full-round', 'partial']
  },
  deflect: {
    bucket: COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES,
    sourceType: 'Talent',
    trigger: 'When you are hit by a ranged attack while wielding a lightsaber.',
    result: 'Make a Use the Force check against the attack roll to negate the hit.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    tags: ['reaction', 'triggered', 'partial']
  },
  block: {
    bucket: COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES,
    sourceType: 'Talent',
    trigger: 'When you are hit by a melee attack while wielding a lightsaber.',
    result: 'Make a Use the Force check against the attack roll to negate the hit.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    tags: ['reaction', 'triggered', 'partial']
  },
  trip: {
    bucket: COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES,
    sourceType: 'Feat',
    trigger: 'When you hit a target with a melee attack.',
    result: 'Attempt to knock the target prone in place of dealing normal damage where the rule allows.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    tags: ['triggered', 'manual']
  },
  crush: {
    bucket: COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES,
    sourceType: 'Talent',
    trigger: 'When you deal damage to a target you are grappling.',
    result: 'Add the feature rider or resolve the grapple damage bonus manually until automation is mapped.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    tags: ['triggered', 'grapple', 'manual']
  },
  'combat-reflexes': {
    bucket: COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES,
    sourceType: 'Feat',
    trigger: 'When an attack of opportunity trigger occurs.',
    result: 'Allows attacks of opportunity while flat-footed and extra reactions per round where supported.',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    tags: ['reaction', 'triggered', 'partial']
  },
  pin: {
    bucket: COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS,
    sourceType: 'Feat',
    appliesTo: 'Grapple',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    summary: 'A foe you are grappling takes a penalty to grapple checks to escape.',
    tags: ['grapple', 'manual']
  },
  'weapon-focus': {
    bucket: COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS,
    sourceType: 'Feat',
    appliesTo: 'Attack',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED,
    summary: 'Bonus to attack rolls with the selected weapon group.',
    tags: ['attack', 'automated']
  },
  'point-blank-shot': {
    bucket: COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS,
    sourceType: 'Feat',
    appliesTo: 'Attack - Damage',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    summary: 'Bonus to attack and damage against close targets when context applies.',
    tags: ['attack', 'damage', 'conditional', 'partial']
  },
  'improved-damage-threshold': {
    bucket: COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS,
    sourceType: 'Feat',
    appliesTo: 'Threshold',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.AUTOMATED,
    summary: 'Increase Damage Threshold against condition track movement.',
    tags: ['threshold', 'automated']
  },
  'running-attack': {
    bucket: COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS,
    sourceType: 'Feat',
    appliesTo: 'Movement',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    summary: 'Move both before and after making a single attack action.',
    tags: ['movement', 'manual']
  },
  'melee-defense': {
    bucket: COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS,
    sourceType: 'Feat',
    appliesTo: 'Reflex',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
    summary: 'Trade melee attack bonus for Reflex Defense through an attack/stance context.',
    tags: ['defense', 'partial']
  },
  'shield-surge': {
    bucket: COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS,
    sourceType: 'Equipment',
    actionCost: 'Standard',
    timing: 'Encounter',
    automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    readiness: COMBAT_FEATURE_READINESS.MISSING,
    readinessNote: 'Requires a powered personal shield context.',
    buttonLabel: 'View',
    executeAction: COMBAT_FEATURE_ACTIONS.VIEW,
    summary: 'Overcharge a personal shield when the equipment and trigger are available.',
    deltas: [{ label: 'Shield SR +5', tone: 'pos' }],
    tags: ['equipment', 'manual', 'missing-trigger']
  }
});

const NAME_ALIASES = Object.freeze({
  'rapid strike': 'rapid-strike',
  'power attack': 'power-attack',
  'power blast': 'power-blast',
  'burst fire': 'burst-fire',
  'rapid shot': 'rapid-shot',
  'double attack': 'double-attack',
  'triple attack': 'triple-attack',
  'point blank shot': 'point-blank-shot',
  'improved damage threshold': 'improved-damage-threshold',
  'running attack': 'running-attack',
  'melee defense': 'melee-defense',
  'shield surge': 'shield-surge',
  'weapon focus': 'weapon-focus',
  'combat reflexes': 'combat-reflexes'
});

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function cleanCombatFeatureText(value = '') {
  if (value && typeof value === 'object') value = value.value ?? value.description ?? value.text ?? value.label ?? '';
  const text = String(value ?? '');
  if (!text) return '';
  const div = globalThis.document?.createElement?.('div');
  if (!div) return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  div.innerHTML = text;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

export function combatFeatureRules(item) {
  return asArray(item?.system?.abilityMeta?.rules);
}

function ruleIds(item) {
  return combatFeatureRules(item).map(rule => normalizeCombatFeatureId(rule?.id ?? rule?.key ?? rule?.label ?? rule?.source ?? '')).filter(Boolean);
}

export function canonicalCombatFeatureKey(name = '') {
  const normalized = normalizeCombatFeatureId(name).replace(/-/g, ' ');
  return NAME_ALIASES[normalized] ?? normalizeCombatFeatureId(name);
}

export function combatFeatureKeyForItem(item) {
  const byRule = ruleIds(item).find(id => FEATURE_PROFILES[id]);
  if (byRule) return byRule;

  const direct = canonicalCombatFeatureKey(item?.name);
  if (FEATURE_PROFILES[direct]) return direct;

  for (const [key] of Object.entries(FEATURE_PROFILES)) {
    const nameKey = normalizeCombatFeatureId(item?.name);
    if (nameKey === key || nameKey.startsWith(`${key}-`)) return key;
  }

  return direct;
}

export function sourceTypeForCombatFeatureItem(item) {
  return SOURCE_TYPE_LABELS[item?.type] ?? SOURCE_TYPE_LABELS[item?.system?.sourceType] ?? item?.system?.sourceType ?? 'Feature';
}

export function combatFeatureItemSummary(item, fallback = '') {
  const system = item?.system ?? {};
  return cleanCombatFeatureText(system.summary ?? system.effect ?? system.descriptionText ?? system.description ?? item?.description ?? fallback);
}

export function activeCombatFeatureEffects(actor) {
  try {
    return Array.from(actor?.effects ?? []).filter(effect => effect && effect.disabled !== true);
  } catch (_err) {
    return [];
  }
}

export function combatFeatureIdForEffect(effect) {
  return canonicalCombatFeatureKey(effect?.name ?? effect?.label ?? effect?.flags?.swse?.featureId ?? effect?.flags?.['foundryvtt-swse']?.featureId ?? '');
}

export function isActiveCombatFeatureState(actor, featureId) {
  const flags = actor?.flags ?? {};
  const stateSources = [
    flags?.['foundryvtt-swse']?.combatFeatures?.activeStates?.[featureId],
    flags?.swse?.combatFeatures?.activeStates?.[featureId],
    flags?.['foundryvtt-swse']?.[featureId]?.active,
    flags?.swse?.[featureId]?.active,
    actor?.system?.combatFeatures?.activeStates?.[featureId],
    actor?.system?.states?.[featureId]?.active
  ];
  if (stateSources.some(Boolean)) return true;
  if (featureId === 'rage') {
    return actor?.system?.rage?.active === true
      || actor?.system?.species?.rage?.active === true
      || flags?.swse?.rage?.active === true
      || flags?.['foundryvtt-swse']?.rage?.active === true;
  }
  return false;
}

function useStateForFeature(actor, featureId, profile) {
  return isActiveCombatFeatureState(actor, featureId)
    || (profile?.bucket === COMBAT_FEATURE_BUCKETS.ACTIVE_STATES && activeCombatFeatureEffects(actor).some(effect => combatFeatureIdForEffect(effect) === featureId));
}

function sourceTags(profile = {}, item = null) {
  const tags = new Set(asArray(profile.tags));
  const system = item?.system ?? {};
  for (const value of asArray(system.tags)) tags.add(String(value).toLowerCase());
  for (const rule of combatFeatureRules(item)) {
    if (rule?.type) tags.add(String(rule.type).toLowerCase().replace(/_/g, '-'));
    if (rule?.control) tags.add(String(rule.control).toLowerCase());
  }
  return Array.from(tags).filter(Boolean);
}

function usesForItem(item) {
  const system = item?.system ?? {};
  const maxUses = Number(system.uses?.max ?? system.maxUses ?? system.usage?.max ?? NaN);
  const remainingUses = Number(system.uses?.value ?? system.uses?.remaining ?? system.remainingUses ?? system.usage?.value ?? NaN);
  return {
    maxUses: Number.isFinite(maxUses) ? maxUses : null,
    remainingUses: Number.isFinite(remainingUses) ? remainingUses : null
  };
}

function readinessFor(item, profile = {}, actor = null, featureId = '') {
  if (profile.readiness) return profile.readiness;
  if (useStateForFeature(actor, featureId, profile)) return COMBAT_FEATURE_READINESS.ACTIVE;
  const uses = usesForItem(item);
  if (uses.maxUses != null && uses.remainingUses != null && uses.remainingUses <= 0) return COMBAT_FEATURE_READINESS.USED;
  return COMBAT_FEATURE_READINESS.READY;
}

function baseFeatureFromItem(actor, item, featureId, profile = {}) {
  const uses = usesForItem(item);
  const sourceType = profile.sourceType ?? sourceTypeForCombatFeatureItem(item);
  return {
    id: featureId,
    name: profile.name ?? item?.name ?? featureId,
    sourceName: item?.name ?? profile.sourceName ?? profile.name ?? featureId,
    sourceType,
    sourceItemId: item?.id ?? item?._id ?? null,
    summary: combatFeatureItemSummary(item, profile.summary ?? ''),
    actionCost: profile.actionCost ?? item?.system?.actionCost ?? item?.system?.activation?.type ?? null,
    timing: profile.timing ?? item?.system?.timing ?? item?.system?.frequency ?? null,
    durationLabel: profile.durationLabel ?? item?.system?.durationLabel ?? item?.system?.duration ?? null,
    remainingUses: uses.remainingUses,
    maxUses: uses.maxUses,
    readiness: readinessFor(item, profile, actor, featureId),
    readinessNote: profile.readinessNote ?? null,
    buttonLabel: profile.buttonLabel ?? 'View',
    canExecute: profile.executeAction && profile.executeAction !== COMBAT_FEATURE_ACTIONS.VIEW,
    executeAction: profile.executeAction ?? COMBAT_FEATURE_ACTIONS.VIEW,
    canDeactivate: profile.canDeactivate === true,
    deactivateAction: profile.deactivateAction ?? null,
    automationStatus: profile.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    deltas: asArray(profile.deltas),
    tags: sourceTags(profile, item)
  };
}

export function classifyCombatFeatureEffect(effect) {
  const featureId = combatFeatureIdForEffect(effect);
  if (!featureId) return null;
  return {
    bucket: COMBAT_FEATURE_BUCKETS.ACTIVE_STATES,
    feature: {
      id: featureId,
      name: effect?.name ?? effect?.label ?? featureId,
      sourceName: effect?.origin ?? effect?.name ?? featureId,
      sourceType: 'Active Effect',
      sourceItemId: null,
      summary: cleanCombatFeatureText(effect?.description ?? effect?.flags?.swse?.summary ?? effect?.flags?.['foundryvtt-swse']?.summary ?? ''),
      actionCost: null,
      timing: 'Active',
      durationLabel: effect?.duration?.rounds ? `${effect.duration.rounds} rounds` : null,
      remainingUses: null,
      maxUses: null,
      deltas: [],
      isActive: true,
      readiness: COMBAT_FEATURE_READINESS.ACTIVE,
      canDeactivate: true,
      deactivateAction: COMBAT_FEATURE_ACTIONS.DEACTIVATE,
      automationStatus: COMBAT_FEATURE_AUTOMATION_STATUS.PARTIAL,
      tags: ['active-effect', 'active']
    }
  };
}

export function isCombatFeatureCandidate(item) {
  if (!item) return false;
  const type = String(item.type ?? '').toLowerCase();
  if (['feat', 'talent', 'species-trait', 'class-feature', 'equipment', 'armor', 'weapon'].includes(type)) return true;
  const system = item.system ?? {};
  const text = [item.name, system.executionModel, system.subType, system.abilityMeta?.mechanicsMode, system.abilityMeta?.applicationScope, ...ruleIds(item)].join(' ').toLowerCase();
  return /combat|attack|damage|defense|reflex|grapple|melee|ranged|reaction|encounter|stance|rage|shield/.test(text);
}

export function inferCombatFeatureBucket(item, featureId, profile = {}) {
  if (profile.bucket) return profile.bucket;
  const system = item?.system ?? {};
  const subType = String(system.subType ?? '').toUpperCase();
  const execution = String(system.executionModel ?? '').toUpperCase();
  const mode = String(system.abilityMeta?.mechanicsMode ?? '').toLowerCase();
  const scope = String(system.abilityMeta?.applicationScope ?? '').toLowerCase();
  const rulesText = combatFeatureRules(item).map(rule => `${rule?.type ?? ''} ${rule?.control ?? ''} ${rule?.trigger ?? ''}`).join(' ').toLowerCase();

  if (subType === 'ATTACK_OPTION' || mode.includes('attack_option') || rulesText.includes('attack_option')) return COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS;
  if (execution === 'ACTIVE') return COMBAT_FEATURE_BUCKETS.AVAILABLE_ACTIONS;
  if (/reaction|trigger|when /.test(`${mode} ${scope} ${rulesText}`)) return COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES;
  return COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS;
}

export function classifyCombatFeatureItem(actor, item) {
  if (!isCombatFeatureCandidate(item)) return null;
  const featureId = combatFeatureKeyForItem(item);
  const profile = FEATURE_PROFILES[featureId] ?? {};
  const bucket = inferCombatFeatureBucket(item, featureId, profile);
  const feature = baseFeatureFromItem(actor, item, featureId, profile);

  if (bucket === COMBAT_FEATURE_BUCKETS.ACTIVE_STATES || useStateForFeature(actor, featureId, profile)) {
    return {
      bucket: COMBAT_FEATURE_BUCKETS.ACTIVE_STATES,
      feature: {
        ...feature,
        isActive: true,
        readiness: COMBAT_FEATURE_READINESS.ACTIVE,
        canDeactivate: feature.canDeactivate || profile.canDeactivate === true,
        deactivateAction: feature.deactivateAction ?? COMBAT_FEATURE_ACTIONS.DEACTIVATE,
        tags: Array.from(new Set([...(feature.tags || []), 'active']))
      }
    };
  }

  if (bucket === COMBAT_FEATURE_BUCKETS.TRIGGERED_FEATURES) {
    return {
      bucket,
      feature: {
        id: feature.id,
        name: feature.name,
        sourceName: feature.sourceName,
        sourceType: feature.sourceType,
        sourceItemId: feature.sourceItemId,
        trigger: profile.trigger ?? item?.system?.trigger ?? 'Conditional combat trigger.',
        result: profile.result ?? feature.summary ?? 'Resolve this feature when its trigger occurs.',
        automationStatus: feature.automationStatus,
        tags: feature.tags
      }
    };
  }

  if (bucket === COMBAT_FEATURE_BUCKETS.PASSIVE_RIDERS) {
    return {
      bucket,
      feature: {
        id: feature.id,
        name: feature.name,
        sourceName: feature.sourceName,
        sourceType: feature.sourceType,
        sourceItemId: feature.sourceItemId,
        appliesTo: profile.appliesTo ?? item?.system?.appliesTo ?? 'Combat',
        summary: feature.summary || profile.summary || 'Combat rider detected from actor feature metadata.',
        automationStatus: feature.automationStatus,
        tags: feature.tags
      }
    };
  }

  return { bucket, feature };
}

export function getCombatFeatureProfile(featureId) {
  return FEATURE_PROFILES[featureId] ?? FEATURE_PROFILES[canonicalCombatFeatureKey(featureId)] ?? null;
}
