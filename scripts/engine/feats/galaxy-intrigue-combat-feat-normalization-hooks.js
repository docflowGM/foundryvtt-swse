import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function demoralizingStrikeRules() {
  return [{
    type: 'ATTACK_OF_OPPORTUNITY_DAMAGE_RIDER',
    id: 'demoralizingStrikeFreeIntimidateOnAooDamage',
    trigger: 'attackOfOpportunityDealsDamage',
    requiresAttackOfOpportunity: true,
    requiresDamageDealt: true,
    freeAction: {
      skill: 'persuasion',
      extraUse: 'intimidate',
      actionCost: 'free',
      target: 'damagedOpponent',
      timing: 'immediate'
    },
    source: 'Demoralizing Strike',
    label: 'Demoralizing Strike: Free Intimidate after damaging AoO'
  }];
}

function flecheRules() {
  return [{
    type: 'CHARGE_ATTACK_RIDER',
    id: 'flecheChargeCriticalThreat17',
    trigger: 'chargeAttackRoll',
    requiresCharge: true,
    oncePer: 'encounter',
    criticalThreatNaturalMin: 17,
    criticalThreatNaturalMax: 20,
    selectedOption: 'fleche',
    source: 'Flèche',
    label: 'Flèche: once/encounter charge attack crits on natural 17+'
  }];
}

function grazingShotRules() {
  return [{
    type: 'SPECIAL_RANGED_ATTACK_ACTION',
    id: 'grazingShotTwoTargetSplitDamageAttack',
    actionKey: 'grazing-shot',
    actionName: 'Grazing Shot',
    actionCost: 'standard',
    requiresAttackType: 'ranged',
    requiresSingleTargetPrimaryAttack: true,
    requiresPointBlankShot: true,
    secondAttack: {
      target: 'additionalTarget',
      requiresDirectLineOfSight: true,
      maxSquaresFromOriginalTarget: 6,
      usesSameWeapon: true,
      usesSameAttackContext: true
    },
    damageResolution: {
      rollDamageOnce: true,
      splitDamageEquallyBetweenTargets: true,
      noDamageIfSecondAttackMisses: true,
      allOrNothing: true
    },
    source: 'Grazing Shot',
    label: 'Grazing Shot: two attack rolls, all-or-nothing split damage'
  }];
}

function indomitablePersonalityRules() {
  return [{
    type: 'DEFENSE_REACTION_RESOURCE',
    id: 'indomitablePersonalityCharismaToWill',
    trigger: 'willDefenseAssault',
    defense: 'will',
    actionType: 'reaction',
    oncePer: 'encounter',
    bonusAbility: 'charisma',
    bonusType: 'untyped',
    duration: 'untilEndOfNextTurn',
    source: 'Indomitable Personality',
    label: 'Indomitable Personality: Reaction adds Charisma modifier to Will Defense'
  }];
}

function meatShieldRules() {
  return [{
    type: 'ADVISORY_COVER_RIDER',
    id: 'meatShieldCoverFromSoftCoverAttacker',
    trigger: 'opponentAttacksYouWhileInCoverProvidedByCreature',
    requiresAttackerInCoverProvidedByCharacterCreatureOrDroid: true,
    grantsCoverAgainstTriggeringOpponent: true,
    advisoryOnly: true,
    source: 'Meat Shield',
    label: 'Meat Shield: you are treated as in Cover from an attacker using another creature as Cover'
  }];
}

function sadisticStrikeRules() {
  return [{
    type: 'COUP_DE_GRACE_RIDER',
    id: 'sadisticStrikeConditionTrackFear',
    trigger: 'coupDeGraceDeliveredToHelplessCreature',
    targetCondition: 'helpless',
    affectedTargets: 'allOpponentsWithinLineOfSight',
    conditionTrackSteps: 1,
    duration: 'untilEndOfEncounter',
    source: 'Sadistic Strike',
    label: 'Sadistic Strike: opponents in line of sight move -1 CT after Coup de Grace'
  }];
}

function standTallRules() {
  return [{
    type: 'ALLY_REACTION_RIDER',
    id: 'standTallAlliesReactWhenYouTakeDamage',
    trigger: 'sourceTakesDamage',
    oncePer: 'encounter',
    advisoryOnly: true,
    allies: {
      withinSquares: 6,
      requiresLineOfSight: true,
      reaction: {
        type: 'singleAttack',
        target: 'damagingSource'
      }
    },
    source: 'Stand Tall',
    label: 'Stand Tall: allies within 6 squares and line of sight may react with one attack'
  }];
}

function wookieeGripRules() {
  return [{
    type: 'ADVISORY_WEAPON_HANDLING_RIDER',
    id: 'wookieeGripOneHandTwoHandedWeapon',
    requiresProficientWeapon: true,
    requiresNormallyTwoHandedWeapon: true,
    permitsOneHandedUse: true,
    attackPenalty: -2,
    appliesToAttackTypes: ['melee', 'ranged'],
    advisoryOnly: true,
    source: 'Wookiee Grip',
    label: 'Wookiee Grip: one-hand a normally two-handed proficient weapon at -2 attack'
  }];
}

function specForFeat(item) {
  switch (compact(item?.name)) {
    case 'demoralizingstrike':
      return { rules: demoralizingStrikeRules(), executionModel: 'PASSIVE', subType: 'REACTION', mode: 'attack_of_opportunity_damage_rider', scope: 'aoo_damage_resolution_context' };
    case 'fleche':
      return { rules: flecheRules(), executionModel: 'ACTIVE', subType: 'ATTACK_OPTION', mode: 'charge_attack_rider', scope: 'charge_attack_resolution_context' };
    case 'grazingshot':
      return { rules: grazingShotRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'special_ranged_attack_action', scope: 'two_target_ranged_attack_context' };
    case 'indomitablepersonality':
      return { rules: indomitablePersonalityRules(), executionModel: 'PASSIVE', subType: 'REACTION', mode: 'defense_reaction_resource', scope: 'will_defense_assault_context' };
    case 'meatshield':
      return { rules: meatShieldRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'advisory_cover_rider', scope: 'incoming_attack_cover_context' };
    case 'sadisticstrike':
      return { rules: sadisticStrikeRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'coup_de_grace_rider', scope: 'coup_de_grace_resolution_context' };
    case 'standtall':
      return { rules: standTallRules(), executionModel: 'PASSIVE', subType: 'REACTION', mode: 'ally_reaction_rider', scope: 'source_takes_damage_context' };
    case 'wookieegrip':
      return { rules: wookieeGripRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'advisory_weapon_handling_rider', scope: 'two_handed_weapon_one_hand_context' };
    default:
      return null;
  }
}

async function normalizeGalaxyIntrigueCombatFeat(item, options = {}) {
  if (options?.swseGalaxyIntrigueCombatFeatNormalization === true) return false;
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
      source: 'GalaxyIntrigueCombatFeatNormalization.normalize',
      swseGalaxyIntrigueCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[GalaxyIntrigueCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerGalaxyIntrigueCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeGalaxyIntrigueCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeGalaxyIntrigueCombatFeat(item, options));
  SWSELogger.log('[GalaxyIntrigueCombatFeatNormalization] Hooks registered');
}

export default registerGalaxyIntrigueCombatFeatNormalizationHooks;
