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

function hasDamageThresholdRule(item, source) {
  const wanted = normalizeName(source);
  return getAttackOptionRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function attackComboRule({ id, label, source, sequenceType, requiredAttackTypes, trigger, sequenceNote, exactBenefit = false }) {
  return {
    type: 'ATTACK_COMBO_SEQUENCE',
    id,
    label,
    source,
    comboFamily: 'attackCombo',
    sequenceType,
    trigger,
    requiresAttackType: requiredAttackTypes,
    requiresWorkflowValidation: true,
    sequence: {
      requiredHits: 2,
      consecutiveHits: true,
      sameTarget: true,
      sameTurn: true,
      note: sequenceNote
    },
    benefit: exactBenefit ? {
      type: 'EXTRA_DAMAGE_DIE_ON_FOLLOWUP_ATTACKS',
      extraDamageDice: 1,
      appliesUntil: 'endOfNextTurn',
      includesAttacksOfOpportunity: true,
      includesReactionAttacks: true,
      stacksWithOtherExtraDamage: true,
      requiresWorkflowValidation: true
    } : {
      type: 'ATTACK_COMBO_BENEFIT_ADVISORY',
      requiresSourceTextBeforeMutation: true,
      requiresWorkflowValidation: true
    },
    summary: exactBenefit
      ? `${label}: after two consecutive qualifying hits against one target during the same turn, additional qualifying attacks until the end of the actor's next turn deal +1 die of damage on a hit.`
      : `Stores ${label} sequence metadata. No attack or damage modifier is applied until a dedicated combo workflow confirms the sequence and exact source benefit.`
  };
}

function payloadForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'advantageous attack') {
    return {
      attackOptionRules: [{
        type: 'CONDITIONAL_DAMAGE_RIDER',
        id: 'advantageousAttack',
        label: 'Advantageous Attack',
        source: 'Advantageous Attack',
        trigger: 'targetHasNotActedInCombat',
        requiresWorkflowValidation: true,
        damageMutation: {
          type: 'HEROIC_LEVEL_DAMAGE_REPLACEMENT',
          normalContribution: 'halfHeroicLevel',
          replacementContribution: 'fullHeroicLevel',
          netBonusFormula: 'ceil(heroicLevel / 2)',
          appliesTo: 'damage.roll',
          requiresSuccessfulAttack: true,
          requiresTargetNotYetActedInCombat: true,
          note: 'On a successful attack against a target who has not yet acted in combat, use full Heroic Level for damage instead of the usual half Heroic Level contribution.'
        },
        summary: 'When a successful attack hits an enemy who has not yet acted in combat, add full Heroic Level to damage rolls instead of one-half Heroic Level.'
      }]
    };
  }

  if (normalized === 'attack combo ranged') {
    return {
      attackOptionRules: [attackComboRule({
        id: 'attackComboRanged',
        label: 'Attack Combo (Ranged)',
        source: 'Attack Combo (Ranged)',
        sequenceType: 'ranged',
        requiredAttackTypes: ['ranged'],
        trigger: 'rangedAttackComboSequence',
        exactBenefit: true,
        sequenceNote: 'Track two consecutive ranged hits against the same target during the same turn.'
      })]
    };
  }

  if (normalized === 'attack combo melee') {
    return {
      attackOptionRules: [attackComboRule({
        id: 'attackComboMelee',
        label: 'Attack Combo (Melee)',
        source: 'Attack Combo (Melee)',
        sequenceType: 'melee',
        requiredAttackTypes: ['melee', 'unarmed'],
        trigger: 'meleeAttackComboSequence',
        exactBenefit: true,
        sequenceNote: 'Track two consecutive melee and/or unarmed hits against the same target during the same turn.'
      })]
    };
  }

  if (normalized === 'attack combo fire and strike') {
    return {
      attackOptionRules: [attackComboRule({
        id: 'attackComboFireAndStrike',
        label: 'Attack Combo (Fire and Strike)',
        source: 'Attack Combo (Fire and Strike)',
        sequenceType: 'mixed_ranged_melee',
        requiredAttackTypes: ['ranged', 'melee'],
        trigger: 'fireAndStrikeAttackComboSequence',
        sequenceNote: 'Exact combo timing and benefit require the attack-combo workflow to track a qualifying ranged hit and melee hit sequence against the same target.'
      })]
    };
  }

  return null;
}

async function normalizeDamageThresholdFeat(item, options = {}) {
  if (options?.swseDamageThresholdFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const payload = payloadForFeat(item.name);
  if (!payload) return false;
  if (hasDamageThresholdRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'damage_threshold_metadata',
      'system.abilityMeta.applicationScope': 'damage_or_attack_combo_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.attackOptionRules': [
        ...getAttackOptionRules(item),
        ...asArray(payload.attackOptionRules)
      ]
    }], {
      source: 'DamageThresholdFeatNormalization.normalize',
      swseDamageThresholdFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[DamageThresholdFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerDamageThresholdFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeDamageThresholdFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeDamageThresholdFeat(item, options));
  SWSELogger.log('[DamageThresholdFeatNormalization] Hooks registered');
}

export default registerDamageThresholdFeatNormalizationHooks;
