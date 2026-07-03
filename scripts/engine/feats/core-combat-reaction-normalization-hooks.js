import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasReactionRule(item, key) {
  const rules = item?.system?.abilityMeta?.reactionRules;
  const normalizedKey = String(key ?? '').toLowerCase();
  if (Array.isArray(rules)) {
    return rules.some(rule => String(rule?.key ?? rule?.id ?? rule?.reactionKey ?? '').toLowerCase() === normalizedKey);
  }
  if (rules && typeof rules === 'object') {
    return Object.keys(rules).some(ruleKey => String(ruleKey).toLowerCase() === normalizedKey)
      || Object.values(rules).flat().some(rule => String(rule?.key ?? rule?.id ?? rule?.reactionKey ?? '').toLowerCase() === normalizedKey);
  }
  return false;
}

function hasRuleType(item, type) {
  const wanted = String(type ?? '').toUpperCase();
  return asArray(item?.system?.abilityMeta?.rules).some(rule => String(rule?.type ?? '').toUpperCase() === wanted);
}

function cleaveReactionRule() {
  return {
    key: 'cleaveExtraAttack',
    label: 'Cleave: Extra Melee Attack',
    trigger: 'ON_TARGET_DROPPED',
    description: 'Once per round, when you reduce an opponent to 0 hit points with a melee attack, you may make an immediate extra melee attack against another opponent within reach using the same weapon and attack bonus.',
    oncePer: 'round',
    maxUses: 1,
    action: 'free',
    requiresAttackType: ['melee'],
    manualResolution: true,
    effect: {
      type: 'EXTRA_ATTACK_ON_DROP',
      sameWeapon: true,
      sameAttackBonus: true,
      targetMustBeDifferent: true,
      targetMustBeWithinReach: true
    }
  };
}

function combatReflexesCapacityRule() {
  return {
    type: 'REACTION_CAPACITY_OVERRIDE',
    label: 'Combat Reflexes: Additional Reactions',
    source: 'Combat Reflexes',
    reactionBasis: 'attacksOfOpportunity',
    baseReactions: 1,
    addAbilityModifier: 'dexterity',
    minimum: 1,
    allowOpportunityAttackWhileFlatFooted: true,
    oneAttackPerOpportunityTrigger: true
  };
}

function patchForFeat(item) {
  const normalized = normalizeName(item?.name);
  if (normalized === 'cleave') {
    const rule = cleaveReactionRule();
    if (hasReactionRule(item, rule.key)) return null;
    return {
      'system.abilityMeta.mechanicsMode': 'reaction_rule',
      'system.abilityMeta.reactionRules': [
        ...asArray(item.system?.abilityMeta?.reactionRules),
        rule
      ]
    };
  }

  if (normalized === 'combat reflexes') {
    if (hasRuleType(item, 'REACTION_CAPACITY_OVERRIDE')) return null;
    return {
      'system.abilityMeta.mechanicsMode': 'reaction_capacity_rule',
      'system.abilityMeta.rules': [
        ...asArray(item.system?.abilityMeta?.rules),
        combatReflexesCapacityRule()
      ]
    };
  }

  return null;
}

async function normalizeCoreCombatReactionFeat(item, options = {}) {
  if (options?.swseCoreCombatReactionNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const featPatch = patchForFeat(item);
  if (!featPatch) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      ...featPatch
    }], {
      source: 'CoreCombatReactionFeats.normalization',
      swseCoreCombatReactionNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[CoreCombatReactionFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerCoreCombatReactionNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeCoreCombatReactionFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeCoreCombatReactionFeat(item, options));
  SWSELogger.log('[CoreCombatReactionFeats] Normalization hooks registered');
}

export default registerCoreCombatReactionNormalizationHooks;
