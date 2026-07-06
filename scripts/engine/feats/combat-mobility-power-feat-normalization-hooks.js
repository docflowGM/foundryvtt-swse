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

function acrobaticStrikeRule() {
  return {
    type: 'ATTACK_OPTION',
    id: 'acrobaticStrike',
    label: 'Acrobatic Strike',
    control: 'flag',
    requiresContextFlags: ['successfulTumbleAvoidedOpportunityAttack'],
    requiresSameTargetAs: 'tumbledPastFoe',
    expires: 'endOfCurrentTurn',
    attackModifier: 2,
    bonusType: 'competence',
    source: 'Acrobatic Strike',
    summary: 'After successfully Tumbling to avoid an attack of opportunity, gain +2 competence on the next attack against that foe before end of current turn.'
  };
}

function momentumStrikeRule() {
  return {
    type: 'ATTACK_OPTION',
    id: 'momentumStrike',
    label: 'Momentum Strike',
    control: 'flag',
    requiresAttackType: 'melee',
    requiresMountedOrSpeederBike: true,
    requiresMountOrVehicleMovedAtLeastSpeed: true,
    damageExtraWeaponDice: 1,
    source: 'Momentum Strike',
    summary: 'While riding a beast mount or speeder bike, add +1 weapon die to melee attacks if the mount/vehicle already moved at least its speed this turn.'
  };
}

function powerBlastRule() {
  return {
    type: 'ATTACK_OPTION',
    id: 'powerBlast',
    label: 'Power Blast',
    control: 'slider',
    min: 0,
    max: 99,
    resource: 'baseAttackBonus',
    requiresAttackType: 'ranged',
    excludesAreaAttackDamage: true,
    excludesObjectOrVehicleDamage: true,
    attackModifierFormula: '-value',
    damageModifierFormula: 'value',
    duration: 'untilStartOfNextTurn',
    activation: { type: 'swift', cost: 1, timing: 'beforeAttackRoll' },
    strengthPenalty: {
      minimumStrength: 13,
      penalty: -5,
      appliesToNonVehicleWeapons: true,
      appliesWhenSelected: true
    },
    source: 'Power Blast',
    summary: 'As a Swift Action before attacking, subtract up to BAB from ranged attacks and add the same to ranged damage until start of next turn; no bonus damage for Area Attacks, objects, or vehicles. Strength below 13 imposes -5 with non-vehicle weapons.'
  };
}

function specForFeat(item) {
  switch (normalizeName(item?.name)) {
    case 'acrobatic strike':
      return { rules: [acrobaticStrikeRule()], mode: 'conditional_attack_option', scope: 'post_tumble_attack_context', executionModel: 'PASSIVE', subType: 'STATE' };
    case 'momentum strike':
      return { rules: [momentumStrikeRule()], mode: 'conditional_attack_option', scope: 'mounted_or_speeder_momentum_attack_context', executionModel: 'PASSIVE', subType: 'STATE' };
    case 'power blast':
      return { rules: [powerBlastRule()], mode: 'selected_ranged_attack_option', scope: 'ranged_attack_option', executionModel: 'ACTIVE', subType: 'ATTACK_OPTION' };
    default:
      return null;
  }
}

async function normalizeCombatMobilityPowerFeat(item, options = {}) {
  if (options?.swseCombatMobilityPowerFeatNormalization === true) return false;
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
      source: 'CombatMobilityPowerFeatNormalization.normalize',
      swseCombatMobilityPowerFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[CombatMobilityPowerFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerCombatMobilityPowerFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeCombatMobilityPowerFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeCombatMobilityPowerFeat(item, options));
  SWSELogger.log('[CombatMobilityPowerFeatNormalization] Hooks registered');
}

export default registerCombatMobilityPowerFeatNormalizationHooks;
