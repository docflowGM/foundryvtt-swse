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

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function anointedHunterRule() {
  return {
    type: 'ADVISORY_ATTACK_MODIFIER',
    id: 'anointedHunterThrownAfterMove',
    requiresWeaponGroup: ['thrown', 'thrownWeapons'],
    requiresMovedAtLeastSquaresFromStart: 2,
    attackBonus: 1,
    bonusType: 'competence',
    duration: 'untilEndOfCurrentTurn',
    advisoryOnly: true,
    source: 'Anointed Hunter',
    label: 'Anointed Hunter: +1 competence with thrown weapons after moving at least 2 squares'
  };
}

function droidHunterRule() {
  return {
    type: 'ADVISORY_DAMAGE_MODIFIER',
    id: 'droidHunterDroidDamageBonus',
    requiresProficientWeapon: true,
    requiresTargetActorType: ['droid'],
    damageBonus: 2,
    ionDamageBonus: 4,
    bonusType: 'untyped',
    advisoryOnly: true,
    source: 'Droid Hunter',
    label: 'Droid Hunter: +2 damage vs droids, or +4 with ion damage'
  };
}

function separatistTrainingRule() {
  return {
    type: 'ADVISORY_ATTACK_MODIFIER',
    id: 'separatistMilitaryTrainingAdjacentAllyAttackBonus',
    requiresAdjacentAlly: true,
    oncePerTurn: true,
    attackBonus: 1,
    bonusType: 'circumstance',
    advisoryOnly: true,
    source: 'Separatist Military Training',
    label: 'Separatist Military Training: +1 circumstance on one attack while adjacent to an ally'
  };
}

function brinkOfDeathRule() {
  return {
    type: 'DAMAGE_OUTCOME_CHOICE',
    id: 'brinkOfDeathLeaveUnconsciousAlive',
    trigger: 'attackWouldKillTarget',
    choice: 'reduceToZeroHpUnconsciousAlive',
    advisoryOnly: true,
    source: 'Brink of Death',
    label: 'Brink of Death: leave killed target at 0 HP unconscious but alive'
  };
}

function fatalHitRules() {
  return [
    {
      type: 'DAMAGE_OUTCOME_CHOICE',
      id: 'fatalHitKillTargetDroppedToZero',
      trigger: 'attackDropsTargetToZeroHp',
      choice: 'automaticallyKillTarget',
      bypassesDamageThresholdKillRequirement: true,
      advisoryOnly: true,
      source: 'Fatal Hit',
      label: 'Fatal Hit: kill target dropped to 0 HP even if damage does not exceed DT'
    },
    {
      type: 'ACTION_ECONOMY_OVERRIDE',
      id: 'fatalHitCoupDeGraceStandardAction',
      actionKey: 'coup-de-grace',
      actionName: 'Coup de Grace',
      fromActionCost: 'full-round',
      toActionCost: 'standard',
      source: 'Fatal Hit',
      label: 'Fatal Hit: Coup de Grace is a Standard Action'
    }
  ];
}

function galacticAllianceTrainingRule() {
  return {
    type: 'CONDITION_TRACK_INTERRUPT_RESOURCE',
    id: 'galacticAllianceTrainingIgnoreFirstDtConditionStep',
    trigger: 'attackExceedsDamageThreshold',
    ignoreConditionTrackMovement: true,
    firstTimePer: 'encounter',
    source: 'Galactic Alliance Military Training',
    label: 'Galactic Alliance Military Training: ignore first condition-track move from exceeded DT each encounter'
  };
}

function specForFeat(item) {
  switch (normalizeName(item?.name)) {
    case 'anointed hunter':
      return { rules: [anointedHunterRule()], executionModel: 'PASSIVE', subType: 'STATE', mode: 'advisory_attack_modifier', scope: 'thrown_weapon_after_movement_context' };
    case 'droid hunter':
      return { rules: [droidHunterRule()], executionModel: 'PASSIVE', subType: 'STATE', mode: 'advisory_damage_modifier', scope: 'droid_target_damage_context' };
    case 'separatist military training':
      return { rules: [separatistTrainingRule()], executionModel: 'PASSIVE', subType: 'STATE', mode: 'advisory_attack_modifier', scope: 'adjacent_ally_attack_context' };
    case 'brink of death':
      return { rules: [brinkOfDeathRule()], executionModel: 'PASSIVE', subType: 'RULE', mode: 'damage_outcome_choice', scope: 'attack_would_kill_context' };
    case 'fatal hit':
      return { rules: fatalHitRules(), executionModel: 'PASSIVE', subType: 'RULE', mode: 'damage_outcome_and_action_economy_choice', scope: 'zero_hp_or_coup_de_grace_context' };
    case 'galactic alliance military training':
      return { rules: [galacticAllianceTrainingRule()], executionModel: 'PASSIVE', subType: 'RULE', mode: 'condition_track_interrupt_resource', scope: 'damage_threshold_condition_track_context' };
    default:
      return null;
  }
}

async function normalizeLegacyCloneCombatFeat(item, options = {}) {
  if (options?.swseLegacyCloneCombatFeatNormalization === true) return false;
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
      source: 'LegacyCloneCombatFeatNormalization.normalize',
      swseLegacyCloneCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[LegacyCloneCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerLegacyCloneCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeLegacyCloneCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeLegacyCloneCombatFeat(item, options));
  SWSELogger.log('[LegacyCloneCombatFeatNormalization] Hooks registered');
}

export default registerLegacyCloneCombatFeatNormalizationHooks;
