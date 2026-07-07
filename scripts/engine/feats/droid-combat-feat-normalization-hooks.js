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

function getConfiguredChoice(item) {
  return item?.system?.choice?.value
    ?? item?.system?.choice?.selected
    ?? item?.system?.selectedChoice
    ?? item?.system?.abilityMeta?.choice
    ?? item?.system?.abilityMeta?.selectedDegree
    ?? item?.flags?.swse?.selectedDegree
    ?? null;
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

function pinpointAccuracyRules() {
  return [{
    type: 'AIMING_ACCURACY_DAMAGE_RIDER',
    id: 'pinpointAccuracyRecoverBlock',
    requiresDroid: true,
    requiresAimingAccuracy: true,
    requiresDamageDealt: true,
    targetCannotRecover: true,
    duration: 'untilEndOfTargetNextTurn',
    source: 'Pinpoint Accuracy',
    label: 'Pinpoint Accuracy: target damaged by Aiming Accuracy cannot Recover until end of its next turn'
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

function turnAndBurnRules() {
  return [{
    type: 'WITHDRAW_ACTION_RIDER',
    id: 'turnAndBurnWithdrawRider',
    requiresDroid: true,
    requiresLocomotion: ['hovering', 'flying', 'wheeled', 'tracked'],
    threatenedSquaresWithoutOpportunity: 2,
    movementLimit: 'speed',
    normalThreatenedSquaresWithoutOpportunity: 1,
    normalMovementLimit: 'halfSpeed',
    forcePointReaction: {
      trigger: 'enemyEndsMovementAdjacentToYou',
      action: 'withdraw',
      actionCost: 'reaction'
    },
    source: 'Turn and Burn',
    label: 'Turn and Burn: enhanced Withdraw and Force Point reaction Withdraw'
  }];
}

function shieldSurgeRules() {
  return [{
    type: 'VEHICLE_SHIELD_DAMAGE_REDUCTION_REACTION',
    id: 'shieldSurgeDirectLinkReaction',
    requiresDroidOrCyborgHybrid: true,
    requiresTrainedSkill: 'mechanics',
    requiresDirectDataLink: true,
    trigger: 'vehicleTakesDamageAboveShieldRating',
    timing: 'afterShieldRatingReduced',
    damageReductionLimit: 'remainingShieldRating',
    shieldRatingCostPerDamageReduced: 1,
    blockRechargeShieldsForRounds: 1,
    actionCost: 'reaction',
    source: 'Shield Surge',
    label: 'Shield Surge: spend remaining vehicle SR to reduce vehicle damage after SR is reduced'
  }];
}

function sensorLinkRules() {
  return [{
    type: 'SENSOR_LINK_ACTION',
    id: 'sensorLinkBroadcast',
    requiresDroidOrCyborgHybrid: true,
    actionCost: 'swift',
    rangeSquares: 24,
    targetTypes: ['droidAlly', 'comlink', 'communicationsSystem', 'holographicReceiver'],
    sharesAwareness: true,
    enablesAidAnotherPerceptionWithoutLineOfSight: true,
    mutualSensorLinkPerceptionBonus: 2,
    source: 'Sensor Link',
    label: 'Sensor Link: broadcast sensors and enable remote Perception Aid Another; mutual links grant +2 Perception'
  }];
}

function logicUpgradeSkillSwapRules() {
  return [{
    type: 'DROID_SKILL_SWAP_ACTION',
    id: 'logicUpgradeSkillSwapAction',
    requiresDroid: true,
    requiresProcessor: 'basic',
    actionCost: 'full-round',
    selectedSkill: null,
    excludesSkills: ['useTheForce'],
    swapOutRequiresTrainedSkill: true,
    swappedInCountsAsTrained: false,
    permitsUntrainedAttempt: true,
    suppressesOriginalTrainedSkillBenefitWhileSwapped: true,
    source: 'Logic Upgrade: Skill Swap',
    label: 'Logic Upgrade: Skill Swap: full-round temporary swap from a trained skill to selected untrained skill'
  }];
}

function ionShieldingRules() {
  return [{
    type: 'ION_DAMAGE_THRESHOLD_RIDER',
    id: 'ionShieldingReduceIonCT',
    requiresDroidOrCyborgHybrid: true,
    trigger: 'preHalvedIonDamageEqualsOrExceedsDamageThreshold',
    conditionTrackSteps: 1,
    replacesConditionTrackSteps: 2,
    source: 'Ion Shielding',
    label: 'Ion Shielding: ion damage threshold event moves only -1 CT step instead of -2'
  }];
}

function erraticTargetRules() {
  return [{
    type: 'MOBILITY_DODGE_TRADEOFF',
    id: 'erraticTargetSpeedForDodge',
    requiresDroid: true,
    requiresLocomotion: ['hovering', 'flying'],
    maxSpeedReductionSquares: 2,
    dodgeBonusPerSpeedSquare: 1,
    minimumSquaresMoved: 2,
    duration: 'untilStartOfSourceNextTurn',
    source: 'Erratic Target',
    label: 'Erratic Target: reduce speed by up to 2 to gain matching Dodge bonus after moving at least 2 squares'
  }];
}

function droidShieldMasteryRules() {
  return [{
    type: 'DROID_SHIELD_RECHARGE_RIDER',
    id: 'droidShieldMasteryFastRecharge',
    requiresDroid: true,
    requiresAccessory: 'shieldGenerator',
    autoSucceedEnduranceCheck: true,
    restoreShieldRating: 5,
    swiftActionsRequired: 2,
    normalSwiftActionsRequired: 3,
    normalEnduranceDC: 20,
    source: 'Droid Shield Mastery',
    label: 'Droid Shield Mastery: automatically restore 5 SR with two Swift Actions'
  }];
}

function leaderOfDroidsRules() {
  return [{
    type: 'DROID_MIND_AFFECTING_IMMUNITY_BRIDGE',
    id: 'leaderOfDroidsMindAffectingBridge',
    trigger: 'beneficialMindAffectingEffectProvidedToAllies',
    maxDroidsFormula: 'max(1, intelligenceModifier)',
    requiresWillingDroidAllies: true,
    immunityIgnoredForThisEffectOnly: true,
    source: 'Leader of Droids',
    label: 'Leader of Droids: willing droid allies can ignore Mind-Affecting immunity for your beneficial effect'
  }];
}

function droidFocusRules(item) {
  return [{
    type: 'DROID_FOCUS_CONTEXT_BONUS',
    id: 'droidFocusSelectedDegree',
    selectedDegree: getConfiguredChoice(item),
    allowedDegrees: ['1st-degree', '2nd-degree', '3rd-degree', '4th-degree', '5th-degree'],
    skillBonus: 1,
    skills: ['deception', 'mechanics', 'perception', 'persuasion', 'useComputer'],
    appliesWhenUsedOnOrAgainstSelectedDegree: true,
    defenseBonus: 1,
    defenses: ['reflex', 'fortitude', 'will'],
    appliesAgainstAttacksAndSkillChecksFromSelectedDegree: true,
    source: 'Droid Focus',
    label: 'Droid Focus: +1 selected skills on/against chosen droid degree and +1 defenses against that degree'
  }];
}

function distractingDroidRules() {
  return [{
    type: 'AREA_SKILL_ATTACK_ACTION',
    id: 'distractingDroidPersuasionPulse',
    actionKey: 'distracting-droid',
    actionName: 'Distracting Droid',
    requiresDroid: true,
    actionCost: 'standard',
    skill: 'persuasion',
    targetDefense: 'will',
    rangeSquares: 6,
    requiresTargetCanSeeOrHearSource: true,
    mindAffecting: true,
    onSuccess: { loseMoveActionNextTurn: true },
    onSuccessBy10: { flatFootedUntilStartOfSourceNextTurn: true },
    source: 'Distracting Droid',
    label: 'Distracting Droid: Persuasion vs Will in 6 squares; success costs target a Move Action, success by 10 also flat-foots'
  }];
}

function damageConversionRules() {
  return [{
    type: 'DAMAGE_THRESHOLD_REPLACEMENT_REACTION',
    id: 'damageConversionExtraDamageInsteadOfCT',
    requiresDroid: true,
    trigger: 'attackDamageEqualsOrExceedsDamageThreshold',
    excludesAreaAttack: true,
    excludesDamageTypes: ['ion', 'force'],
    baseExtraDamage: 10,
    additionalExtraDamagePerPriorEncounterUse: 5,
    replaceConditionTrackShift: true,
    source: 'Damage Conversion',
    label: 'Damage Conversion: take escalating extra damage instead of threshold CT movement'
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
    case 'pinpointaccuracy':
      return { rules: pinpointAccuracyRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'aiming_accuracy_hit_rider', scope: 'aiming_accuracy_damage_context' };
    case 'mechanicalmartialarts':
      return { rules: mechanicalMartialArtsRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'unarmed_hit_rider', scope: 'unarmed_damage_target_context' };
    case 'multitargeting':
      return { rules: multiTargetingRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'aim_action_rider', scope: 'aim_action_timing_context' };
    case 'turnandburn':
      return { rules: turnAndBurnRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'withdraw_action_rider', scope: 'movement_opportunity_context' };
    case 'shieldsurge':
      return { rules: shieldSurgeRules(), executionModel: 'REACTION', subType: 'VEHICLE', mode: 'vehicle_shield_damage_reduction', scope: 'vehicle_damage_resolution_context' };
    case 'sensorlink':
      return { rules: sensorLinkRules(), executionModel: 'ACTIVE', subType: 'UTILITY', mode: 'sensor_link_action', scope: 'sensor_perception_aid_context' };
    case 'logicupgradeskillswap':
      return { rules: logicUpgradeSkillSwapRules(), executionModel: 'ACTIVE', subType: 'SKILL', mode: 'droid_skill_swap_action', scope: 'skill_training_swap_context' };
    case 'ionshielding':
      return { rules: ionShieldingRules(), executionModel: 'PASSIVE', subType: 'DEFENSE', mode: 'ion_threshold_rider', scope: 'ion_damage_threshold_context' };
    case 'erratictarget':
      return { rules: erraticTargetRules(), executionModel: 'ACTIVE', subType: 'DEFENSE', mode: 'mobility_dodge_tradeoff', scope: 'movement_defense_context' };
    case 'droidshieldmastery':
      return { rules: droidShieldMasteryRules(), executionModel: 'ACTIVE', subType: 'SHIELD', mode: 'droid_shield_recharge_rider', scope: 'droid_shield_recharge_context' };
    case 'leaderofdroids':
      return { rules: leaderOfDroidsRules(), executionModel: 'PASSIVE', subType: 'SUPPORT', mode: 'droid_mind_affecting_bridge', scope: 'beneficial_mind_affecting_allied_context' };
    case 'droidfocus':
      return { rules: droidFocusRules(item), executionModel: 'PASSIVE', subType: 'SKILL', mode: 'droid_focus_context_bonus', scope: 'selected_droid_degree_context' };
    case 'distractingdroid':
      return { rules: distractingDroidRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'area_skill_attack_action', scope: 'persuasion_vs_will_area_context' };
    case 'damageconversion':
      return { rules: damageConversionRules(), executionModel: 'REACTION', subType: 'DEFENSE', mode: 'damage_threshold_replacement', scope: 'damage_threshold_resolution_context' };
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
