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

function droidcraftRule() {
  return {
    type: 'SKILL_USE_TIME_OVERRIDE',
    id: 'droidcraftRepairDroidTenMinutes',
    skill: 'mechanics',
    use: 'repairDroid',
    newDuration: { value: 10, unit: 'minute' },
    appliesTo: 'repairDroid',
    source: 'Droidcraft',
    label: 'Droidcraft: Repair Droid in 10 minutes'
  };
}

function expertDroidRepairRule() {
  return {
    type: 'SKILL_PROCEDURE_CAPACITY',
    id: 'expertDroidRepairMultiRepairDroidCapacity',
    skill: 'mechanics',
    use: 'repairDroid',
    capacityAbility: 'intelligence',
    minimumCapacity: 2,
    targetType: 'droid',
    simultaneous: true,
    separateChecksRequired: true,
    source: 'Expert Droid Repair',
    label: 'Expert Droid Repair: repair multiple droids simultaneously'
  };
}

function experiencedMedicRule() {
  return {
    type: 'SKILL_PROCEDURE_CAPACITY',
    id: 'experiencedMedicSurgeryCapacity',
    skill: 'treatInjury',
    use: 'surgery',
    capacityAbility: 'intelligence',
    minimumCapacity: 2,
    targetType: 'creature',
    simultaneous: true,
    separateChecksRequired: true,
    source: 'Experienced Medic',
    label: 'Experienced Medic: perform surgery on multiple creatures simultaneously'
  };
}

function coordinatedBarrageRule() {
  return {
    type: 'AID_ANOTHER_DAMAGE_RIDER',
    id: 'coordinatedBarrageMarginDamageDice',
    aidAnotherMode: 'attack',
    requiresAidingAllyAttack: true,
    damageDicePerMarginStep: 1,
    marginStep: 3,
    marginDefense: 'reflex',
    maximumDice: 5,
    capByAidingAlliesWithFeat: true,
    appliesToAllyAttack: true,
    source: 'Coordinated Barrage',
    label: 'Coordinated Barrage: Aid Another margin-based damage dice'
  };
}

function rulesForFeat(item) {
  switch (normalizeName(item?.name)) {
    case 'droidcraft':
      return { rules: [droidcraftRule()], mode: 'skill_use_time_override', scope: 'mechanics_repair_droid_context' };
    case 'expert droid repair':
      return { rules: [expertDroidRepairRule()], mode: 'skill_procedure_capacity', scope: 'mechanics_repair_droid_context' };
    case 'experienced medic':
      return { rules: [experiencedMedicRule()], mode: 'skill_procedure_capacity', scope: 'treat_injury_surgery_context' };
    case 'coordinated barrage':
      return { rules: [coordinatedBarrageRule()], mode: 'aid_another_damage_scaling', scope: 'aid_another_damage_scaling_context' };
    default:
      return null;
  }
}

async function normalizeSkillTeamworkFeat(item, options = {}) {
  if (options?.swseSkillTeamworkFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const spec = rulesForFeat(item);
  if (!spec) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, spec.rules.map(rule => rule.id));
  nextRules.push(...spec.rules);

  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'RULE',
    'system.abilityMeta.mechanicsMode': spec.mode,
    'system.abilityMeta.applicationScope': spec.scope,
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules
  };

  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'RULE'
    || item.system?.abilityMeta?.mechanicsMode !== spec.mode
    || item.system?.abilityMeta?.applicationScope !== spec.scope
    || item.system?.abilityMeta?.requiresRuntimeContext !== true;
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'SkillTeamworkFeatNormalization.normalize',
      swseSkillTeamworkFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[SkillTeamworkFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerSkillTeamworkFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeSkillTeamworkFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeSkillTeamworkFeat(item, options));
  SWSELogger.log('[SkillTeamworkFeatNormalization] Hooks registered');
}

export default registerSkillTeamworkFeatNormalizationHooks;
