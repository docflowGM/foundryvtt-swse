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

function attackComboRule({ id, label, source, sequenceType, requiredAttackTypes, trigger, sequenceNote }) {
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
      sameTarget: true,
      sameEncounterOrTurnContext: true,
      note: sequenceNote
    },
    summary: `Stores ${label} sequence metadata. No attack or damage modifier is applied until a dedicated combo workflow confirms the sequence.`
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
        trigger: 'advantageousAttackContext',
        requiresWorkflowValidation: true,
        damageMutation: {
          type: 'DAMAGE_BONUS_ADVISORY',
          contextRequired: true,
          note: 'Damage mutation requires the attack workflow to confirm the Advantageous Attack trigger and target eligibility before applying any bonus.'
        },
        summary: 'Stores Advantageous Attack damage-rider metadata. Exact damage mutation waits for workflow-confirmed trigger context.'
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
        sequenceNote: 'Exact combo timing and benefit require the attack-combo workflow to track qualifying ranged hits.'
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
        requiredAttackTypes: ['melee'],
        trigger: 'meleeAttackComboSequence',
        sequenceNote: 'Exact combo timing and benefit require the attack-combo workflow to track qualifying melee hits.'
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
