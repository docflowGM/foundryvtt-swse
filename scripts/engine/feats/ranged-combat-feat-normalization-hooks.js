import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getAttackOptionRules(item) {
  return asArray(item?.system?.abilityMeta?.attackOptionRules);
}

function getReactionRules(item) {
  return asArray(item?.system?.abilityMeta?.reactionRules);
}

function hasRangedCombatRule(item, source) {
  const wanted = normalizeName(source);
  return getAttackOptionRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted)
    || getReactionRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function payloadForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'opportunistic shooter') {
    return {
      reactionRules: [{
        key: 'opportunisticShooter',
        label: 'Opportunistic Shooter',
        source: 'Opportunistic Shooter',
        trigger: 'RANGED_OPPORTUNITY_CONTEXT',
        action: 'reaction',
        requiresAttackType: ['ranged'],
        manualResolution: true,
        requiresWorkflowValidation: true,
        effect: {
          type: 'RANGED_OPPORTUNITY_ATTACK_ADVISORY',
          rangedAttack: true,
          triggerContextRequired: true,
          note: 'Allows a ranged opportunity/reaction attack only when the reaction workflow confirms the triggering condition, target legality, and line of sight/effect.'
        },
        summary: 'Stores ranged opportunity-shot reaction metadata. Exact trigger and target legality are supplied by the combat/reaction workflow.'
      }],
      attackOptionRules: [{
        type: 'RANGED_REACTION_ATTACK_ADVISORY',
        id: 'opportunisticShooter',
        label: 'Opportunistic Shooter',
        source: 'Opportunistic Shooter',
        trigger: 'rangedOpportunityContext',
        requiresAttackType: 'ranged',
        requiresWorkflowValidation: true,
        summary: 'Ranged reaction attack metadata for workflows that expose opportunity-shot triggers.'
      }]
    };
  }

  if (normalized === 'mighty throw') {
    return {
      attackOptionRules: [{
        type: 'THROWN_WEAPON_ATTACK_ADVISORY',
        id: 'mightyThrow',
        label: 'Mighty Throw',
        source: 'Mighty Throw',
        trigger: 'thrownWeaponAttack',
        requiresAttackType: 'ranged',
        requiresWeaponCategory: ['thrown', 'grenade', 'improvisedThrown'],
        requiresWorkflowValidation: true,
        abilityContext: {
          thrownWeapon: true,
          strengthRelevant: true,
          note: 'Marks thrown-weapon attack context for later workflow math. Do not broadly replace ranged ability math without a confirmed thrown-weapon attack packet.'
        },
        summary: 'Stores thrown-weapon ranged attack metadata. Exact attack/damage math mutation waits for a workflow-confirmed thrown-weapon context.'
      }]
    };
  }

  return null;
}

async function normalizeRangedCombatFeat(item, options = {}) {
  if (options?.swseRangedCombatFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const payload = payloadForFeat(item.name);
  if (!payload) return false;
  if (hasRangedCombatRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'ranged_combat_metadata',
      'system.abilityMeta.applicationScope': 'ranged_reaction_or_thrown_weapon_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.attackOptionRules': [
        ...getAttackOptionRules(item),
        ...asArray(payload.attackOptionRules)
      ],
      'system.abilityMeta.reactionRules': [
        ...getReactionRules(item),
        ...asArray(payload.reactionRules)
      ]
    }], {
      source: 'RangedCombatFeatNormalization.normalize',
      swseRangedCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[RangedCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerRangedCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeRangedCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeRangedCombatFeat(item, options));
  SWSELogger.log('[RangedCombatFeatNormalization] Hooks registered');
}

export default registerRangedCombatFeatNormalizationHooks;
