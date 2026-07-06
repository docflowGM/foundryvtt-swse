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

function specForFeat(item) {
  switch (compact(item?.name)) {
    case 'demoralizingstrike':
      return { rules: demoralizingStrikeRules(), executionModel: 'PASSIVE', subType: 'REACTION', mode: 'attack_of_opportunity_damage_rider', scope: 'aoo_damage_resolution_context' };
    case 'fleche':
      return { rules: flecheRules(), executionModel: 'ACTIVE', subType: 'ATTACK_OPTION', mode: 'charge_attack_rider', scope: 'charge_attack_resolution_context' };
    case 'grazingshot':
      return { rules: grazingShotRules(), executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'special_ranged_attack_action', scope: 'two_target_ranged_attack_context' };
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
