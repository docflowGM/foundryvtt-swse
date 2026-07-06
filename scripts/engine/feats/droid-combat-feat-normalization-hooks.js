import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compact(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function disablerRules() {
  return [
    {
      type: 'WEAPON_TEMPLATE_MUTATION',
      id: 'disablerIonGrenadeBurstRadius',
      requiresWeaponText: ['ion-grenade', 'ion grenade'],
      requiresAttackType: 'ranged',
      requiresProficientWeapon: true,
      property: 'burstRadius',
      value: 3,
      source: 'Disabler',
      label: 'Disabler: Ion Grenade burst radius 3 squares'
    },
    {
      type: 'WEAPON_DAMAGE_DIE_SIZE_SET',
      id: 'disablerIonPistolDamageD8',
      requiresWeaponText: ['ion-pistol', 'ion pistol'],
      requiresAttackType: 'ranged',
      requiresProficientWeapon: true,
      fromDieSize: 6,
      toDieSize: 8,
      source: 'Disabler',
      label: 'Disabler: Ion Pistol damage dice increase from d6 to d8'
    },
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      id: 'disablerIonRifleAccurate',
      requiresWeaponText: ['ion-rifle', 'ion rifle'],
      requiresAttackType: 'ranged',
      requiresProficientWeapon: true,
      property: 'accurate',
      value: true,
      source: 'Disabler',
      label: 'Disabler: Ion Rifle counts as Accurate'
    }
  ];
}

function aimingAccuracyRules() {
  return [{
    type: 'AIM_ACTION_VARIANT',
    id: 'aimingAccuracyFullRoundAim',
    actionKey: 'aiming-accuracy',
    actionName: 'Aiming Accuracy',
    requiresDroid: true,
    actionCost: 'full-round',
    aimDuration: 'full-round-action',
    requiresProficientWeapon: true,
    requiresLineOfSight: true,
    effect: {
      attackBonus: 5,
      bonusType: 'untyped',
      appliesTo: 'nextAttackAgainstAimedTargetInFollowingRound',
      expires: 'afterNextQualifyingAttackOrIfLineOfSightLost'
    },
    source: 'Aiming Accuracy',
    label: 'Aiming Accuracy: full-round aim for +5 next attack against that target next round'
  }];
}

function mechanicalMartialArtsRules() {
  return [{
    type: 'UNARMED_HIT_RIDER',
    id: 'mechanicalMartialArtsOrganicMeleePenalty',
    requiresDroid: true,
    requiresUnarmedAttack: true,
    requiresDamageDealt: true,
    requiresOrganicTarget: true,
    targetPenalty: {
      meleeAttackPenalty: -5,
      meleeDamagePenalty: -5,
      duration: 'untilStartOfSourceNextTurn',
      attackOfOpportunityDuration: 'untilStartOfTargetNextTurn'
    },
    source: 'Mechanical Martial Arts',
    label: 'Mechanical Martial Arts: damaged organic target takes -5 melee attack and damage penalty'
  }];
}

function multiTargetingRules() {
  return [{
    type: 'AIM_ACTION_RIDER',
    id: 'multiTargetingAimAcrossRounds',
    requiresDroid: true,
    requiresProficientWeapon: true,
    permitsNonConsecutiveRoundAimSwifts: true,
    permitsOtherTargetAttacksBeforeAimComplete: true,
    losesAimIfTargetOutOfLineOfSight: true,
    source: 'Multi-Targeting',
    label: 'Multi-Targeting: Aim swift actions may be spent across more than one round'
  }];
}

function slammerRules() {
  return [{
    type: 'SPECIAL_UNARMED_ATTACK_ACTION',
    id: 'slammerAppendageCrushAttack',
    actionKey: 'slammer',
    actionName: 'Slammer',
    requiresDroid: true,
    requiresMinimumSize: 'small',
    requiresAppendages: 2,
    actionCost: 'standard',
    attackType: 'melee',
    virtualWeapon: {
      kind: 'unarmed',
      abilityDamageMultiplier: { ability: 'strength', multiplier: 2 },
      appendageBased: true
    },
    onExceedsDamageThreshold: {
      appliesPersistentCondition: true,
      removal: ['8 hours rest', 'DC 20 Treat Injury check']
    },
    crushFeatRider: {
      feat: 'Crush',
      unarmedExtraWeaponDice: 1
    },
    source: 'Slammer',
    label: 'Slammer: standard unarmed appendage crush attack'
  }];
}

function toolFrenzyRules() {
  return [{
    type: 'SPECIAL_UNARMED_ATTACK_ACTION',
    id: 'toolFrenzyAppendageAttack',
    actionKey: 'tool-frenzy',
    actionName: 'Tool Frenzy',
    requiresDroid: true,
    requiresMinimumSize: 'small',
    requiresToolAppendages: 2,
    excludesTrueWeapons: true,
    actionCost: 'standard',
    attackType: 'melee',
    attackBonus: 2,
    virtualWeapon: {
      kind: 'unarmed',
      damageDieSource: 'highestRatedToolAppendage',
      appendageBased: true
    },
    selfPenalty: {
      defense: 'reflex',
      defensePenalty: -2,
      duration: 'untilEndOfNextTurn'
    },
    source: 'Tool Frenzy',
    label: 'Tool Frenzy: standard unarmed tool-appendage attack with +2 attack and Reflex penalty'
  }];
}

function specForFeat(item) {
  switch (compact(item?.name)) {
    case 'disabler':
      return { rules: disablerRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'ion_weapon_mutator', scope: 'ion_weapon_attack_resolution' };
    case 'aimingaccuracy':
      return { rules: aimingAccuracyRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'aim_action_variant', scope: 'full_round_aim_context' };
    case 'mechanicalmartialarts':
      return { rules: mechanicalMartialArtsRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'unarmed_hit_rider', scope: 'unarmed_damage_target_context' };
    case 'multitargeting':
      return { rules: multiTargetingRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'aim_action_rider', scope: 'aim_action_timing_context' };
    case 'slammer':
      return { rules: slammerRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'special_unarmed_attack_action', scope: 'droid_appendage_attack_context' };
    case 'toolfrenzy':
      return { rules: toolFrenzyRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'special_unarmed_attack_action', scope: 'droid_tool_appendage_attack_context' };
    default:
      return null;
  }
}

async function normalizeDroidCombatFeat(item, options = {}) {
  if (options?.swseDroidCombatFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const spec = specForFeat(item);
  if (!spec) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, spec.rules.map(rule => rule.id));
  nextRules.push(...spec.rules);

  const patch = {
    'system.executionModel': spec.executionModel,
    'system.subType': spec.subType,
    'system.abilityMeta.mechanicsMode': spec.mode,
    'system.abilityMeta.applicationScope': spec.scope,
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules
  };

  const modelChanged = item.system?.executionModel !== spec.executionModel
    || item.system?.subType !== spec.subType
    || item.system?.abilityMeta?.mechanicsMode !== spec.mode
    || item.system?.abilityMeta?.applicationScope !== spec.scope
    || item.system?.abilityMeta?.requiresRuntimeContext !== true;
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'DroidCombatFeatNormalization.normalize',
      swseDroidCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[DroidCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerDroidCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeDroidCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeDroidCombatFeat(item, options));
  SWSELogger.log('[DroidCombatFeatNormalization] Hooks registered');
}

export default registerDroidCombatFeatNormalizationHooks;
