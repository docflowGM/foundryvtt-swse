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
        trigger: 'ATTACK_OF_OPPORTUNITY',
        action: 'reaction',
        requiresAttackType: ['ranged'],
        requiresWorkflowValidation: true,
        effect: {
          type: 'ATTACK_BONUS',
          target: 'attack.roll',
          value: 2,
          bonusType: 'feat',
          appliesTo: 'attacksOfOpportunity',
          requiresRangedWeapon: true
        },
        summary: 'Gain a +2 feat bonus on attacks of opportunity made with ranged weapons.'
      }],
      attackOptionRules: [{
        type: 'CONDITIONAL_ATTACK_BONUS',
        id: 'opportunisticShooter',
        label: 'Opportunistic Shooter',
        source: 'Opportunistic Shooter',
        value: 2,
        bonusType: 'feat',
        appliesTo: 'attacksOfOpportunity',
        requiresAttackType: 'ranged',
        requiresWeaponCategory: ['ranged'],
        requiresWorkflowValidation: true,
        summary: 'Adds +2 to attacks of opportunity with ranged weapons when the workflow confirms ranged AoO context.'
      }]
    };
  }

  if (normalized === 'mighty throw') {
    return {
      attackOptionRules: [{
        type: 'THROWN_WEAPON_ATTACK_MODIFIER',
        id: 'mightyThrow',
        label: 'Mighty Throw',
        source: 'Mighty Throw',
        trigger: 'thrownWeaponAttack',
        requiresAttackType: 'ranged',
        requiresWeaponCategory: ['thrown', 'grenade', 'grenadelike', 'improvisedThrown'],
        requiresWorkflowValidation: true,
        attackBonus: {
          type: 'ABILITY_MODIFIER_ADDITION',
          ability: 'strength',
          stacksWithExistingAbilityModifier: true,
          note: 'Add Strength modifier in addition to Dexterity modifier on ranged attack rolls with thrown weapons.'
        },
        rangeMutation: {
          type: 'RANGE_CATEGORY_EXTENSION',
          valueAbility: 'strength',
          unit: 'squares',
          appliesToEachRangeCategory: true,
          note: 'Increase the length of each range category by squares equal to the actor Strength modifier.'
        },
        summary: 'For thrown weapons, including grenades and grenadelike weapons, add Strength modifier to ranged attack bonus in addition to Dexterity and extend each range category by Strength modifier squares.'
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
