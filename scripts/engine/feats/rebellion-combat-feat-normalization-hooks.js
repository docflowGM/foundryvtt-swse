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

function zeroRangeRules() {
  return [{
    type: 'POINT_BLANK_RIDER_ATTACK_OPTION',
    id: 'zeroRangeAdjacentRangedAttackRider',
    label: 'Zero Range',
    requiresAttackType: 'ranged',
    requiresTargetWithinOrAdjacentToFightingSpace: true,
    excludesHeavyWeapons: true,
    excludesVehicleWeapons: true,
    excludesVehicleCombat: true,
    attackBonus: 1,
    damageExtraWeaponDice: 1,
    damageDoesNotStackWithOptions: ['burstFire', 'rapidShot'],
    source: 'Zero Range',
    summary: 'Ranged attack against a target within or adjacent to your fighting space gains +1 attack and +1 weapon die damage; extra damage does not stack with Burst Fire or Rapid Shot.'
  }];
}

function primeShotRules() {
  return [{
    type: 'POINT_BLANK_RIDER_ATTACK_OPTION',
    id: 'primeShotNoCloserAlliesAttackBonus',
    label: 'Prime Shot',
    control: 'toggle',
    requiresAttackType: 'ranged',
    requiresTargetAtShortRangeOrCloser: true,
    requiresNoAllyCloserToTarget: true,
    attackBonus: 1,
    bonusType: 'circumstance',
    selectable: true,
    source: 'Prime Shot',
    summary: 'If no ally is closer to the target and the target is at Short Range or closer, gain +1 circumstance on the ranged attack.'
  }];
}

function deftChargeRules() {
  return [{
    type: 'ACTION_ECONOMY_RIDER',
    id: 'deftChargePostChargeActionAllowance',
    actionKey: 'charge',
    trigger: 'afterChargeAttackResolved',
    removesTurnEndsAfterCharge: true,
    allowsAfterCharge: ['swift', 'reaction', 'free'],
    source: 'Deft Charge',
    label: 'Deft Charge: may take Swift, Reaction, and Free Actions after Charge'
  }];
}

function rebelTrainingRules() {
  return [{
    type: 'RUNNING_ATTACK_RIDER',
    id: 'rebelMilitaryTrainingRunningAttackReflexBonus',
    trigger: 'runningAttackMovedBeforeAndAfterAttack',
    requiresRunningAttack: true,
    defense: 'reflex',
    defenseBonus: 2,
    bonusType: 'dodge',
    duration: 'untilStartOfNextTurn',
    source: 'Rebel Military Training',
    label: 'Rebel Military Training: +2 dodge Reflex after hit-and-run Running Attack'
  }];
}

function followThroughRules() {
  return [{
    type: 'DROPS_TARGET_RIDER',
    id: 'followThroughMoveAfterMeleeDrop',
    trigger: 'meleeAttackReducesTargetToZeroHp',
    requiresAttackType: 'melee',
    movement: { distance: 'speed', timing: 'immediate', advisoryOnly: true },
    oncePer: 'turn',
    cleaveInteraction: {
      feat: 'Cleave',
      mayMoveBeforeCleaveAttack: true,
      movementDistance: 'speed'
    },
    source: 'Follow Through',
    label: 'Follow Through: move up to Speed after dropping a foe with melee attack'
  }];
}

function destructiveForceRules() {
  return [{
    type: 'DAMAGE_OUTCOME_RIDER',
    id: 'destructiveForceAdjacentSplashOnVehicleObjectDestroyed',
    trigger: 'objectOrVehicleDamageEqualsOrExceedsDtAndDropsToZeroHp',
    requiresTargetType: ['object', 'vehicle'],
    requiresDamageAtLeastDamageThreshold: true,
    requiresTargetReducedToZeroHp: true,
    adjacentTargetDamage: {
      dice: 1,
      dieSource: 'originalWeaponDamageDie',
      damageType: 'sameAsOriginalAttack',
      includesAllies: true,
      targets: 'allAdjacentToDestroyedObjectOrVehicle',
      advisoryOnly: true
    },
    source: 'Destructive Force',
    label: 'Destructive Force: adjacent targets take 1 same-type die when object/vehicle is destroyed'
  }];
}

function specForFeat(item) {
  switch (compact(item?.name)) {
    case 'zerorange':
      return { rules: zeroRangeRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'point_blank_rider_attack_option', scope: 'adjacent_ranged_attack_context' };
    case 'primeshot':
      return { rules: primeShotRules(), executionModel: 'ACTIVE', subType: 'ATTACK_OPTION', mode: 'point_blank_rider_attack_option', scope: 'short_range_no_closer_ally_context' };
    case 'deftcharge':
      return { rules: deftChargeRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'charge_action_economy_rider', scope: 'charge_action_resolution_context' };
    case 'rebelmilitarytraining':
      return { rules: rebelTrainingRules(), executionModel: 'PASSIVE', subType: 'STATE', mode: 'running_attack_defense_rider', scope: 'running_attack_after_attack_context' };
    case 'followthrough':
      return { rules: followThroughRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'drops_target_movement_rider', scope: 'melee_drop_target_context' };
    case 'destructiveforce':
      return { rules: destructiveForceRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'damage_outcome_adjacency_rider', scope: 'object_vehicle_destroyed_context' };
    default:
      return null;
  }
}

async function normalizeRebellionCombatFeat(item, options = {}) {
  if (options?.swseRebellionCombatFeatNormalization === true) return false;
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
      source: 'RebellionCombatFeatNormalization.normalize',
      swseRebellionCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[RebellionCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerRebellionCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeRebellionCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeRebellionCombatFeat(item, options));
  SWSELogger.log('[RebellionCombatFeatNormalization] Hooks registered');
}

export default registerRebellionCombatFeatNormalizationHooks;
