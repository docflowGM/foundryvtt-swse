import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

function combatReflexesReactionRule() {
  return {
    key: 'combatReflexesOpportunityAttack',
    label: 'Combat Reflexes: Additional Attack of Opportunity',
    trigger: 'ON_OPPORTUNITY_ATTACK_AVAILABLE',
    description: 'You may make additional attacks of opportunity equal to your Dexterity modifier and may make attacks of opportunity while flat-footed. You can still only make one attack for each triggered opportunity.',
    action: 'reaction',
    manualResolution: true,
    effect: {
      type: 'ATTACK_OF_OPPORTUNITY_CAP_OVERRIDE',
      extraUsesAbility: 'dexterity',
      allowWhileFlatFooted: true,
      oneAttackPerTrigger: true
    }
  };
}

function ruleForFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'cleave') return cleaveReactionRule();
  if (normalized === 'combat reflexes') return combatReflexesReactionRule();
  return null;
}

async function normalizeCoreCombatReactionFeat(item, options = {}) {
  if (options?.swseCoreCombatReactionNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rule = ruleForFeat(item.name);
  if (!rule || hasReactionRule(item, rule.key)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'reaction_rule',
      'system.abilityMeta.reactionRules': [
        ...(Array.isArray(item.system?.abilityMeta?.reactionRules) ? item.system.abilityMeta.reactionRules : []),
        rule
      ]
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
