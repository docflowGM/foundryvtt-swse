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

function overwhelmingAttackRule() {
  return {
    type: 'ATTACK_OPTION',
    id: 'overwhelmingAttack',
    label: 'Overwhelming Attack',
    control: 'toggle',
    requiresSwiftActions: 2,
    swiftActionsRequired: 2,
    sameRoundOnly: true,
    expiresOn: ['attackResolved', 'endOfRound'],
    attackNegationPenalty: {
      value: -5,
      penaltyType: 'untyped',
      appliesTo: ['attackRoll', 'skillCheck'],
      appliesAgainst: ['Block', 'Deflect', 'Vehicular Combat', 'attackNegationAbility'],
      targetScoped: true,
      thisAttackOnly: true,
      note: 'Target takes -5 on attack rolls or skill checks made to negate this attack.'
    },
    targetEffectsOnAttack: [{
      type: 'attack-negation-penalty',
      sourceName: 'Overwhelming Attack',
      value: -5,
      penaltyType: 'untyped',
      appliesTo: ['attackRoll', 'skillCheck'],
      appliesAgainst: ['Block', 'Deflect', 'Vehicular Combat', 'attackNegationAbility'],
      targetScoped: true,
      thisAttackOnly: true,
      manualResolution: false
    }],
    source: 'Overwhelming Attack',
    summary: 'Spend two Swift Actions in the same round. The target takes -5 on rolls/checks to negate your next attack before the end of that round.'
  };
}

async function normalizeAttackNegationFeat(item, options = {}) {
  if (options?.swseAttackNegationFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (normalizeName(item.name) !== 'overwhelming attack') return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, ['overwhelmingAttack']);
  nextRules.push(overwhelmingAttackRule());

  const patch = {
    'system.executionModel': 'ACTIVE',
    'system.subType': 'ATTACK_OPTION',
    'system.abilityMeta.mechanicsMode': 'selected_attack_negation_penalty',
    'system.abilityMeta.applicationScope': 'next_attack_before_end_of_round',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules
  };

  const modelChanged = item.system?.executionModel !== 'ACTIVE'
    || item.system?.subType !== 'ATTACK_OPTION'
    || item.system?.abilityMeta?.mechanicsMode !== 'selected_attack_negation_penalty'
    || item.system?.abilityMeta?.applicationScope !== 'next_attack_before_end_of_round'
    || item.system?.abilityMeta?.requiresRuntimeContext !== true;
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'AttackNegationFeatNormalization.normalize',
      swseAttackNegationFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[AttackNegationFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerAttackNegationFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeAttackNegationFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeAttackNegationFeat(item, options));
  SWSELogger.log('[AttackNegationFeatNormalization] Hooks registered');
}

export default registerAttackNegationFeatNormalizationHooks;
