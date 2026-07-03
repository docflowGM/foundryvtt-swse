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
      attackOptionRules: [{
        type: 'ATTACK_COMBO_SEQUENCE',
        id: 'attackComboRanged',
        label: 'Attack Combo (Ranged)',
        source: 'Attack Combo (Ranged)',
        comboFamily: 'attackCombo',
        sequenceType: 'ranged',
        trigger: 'rangedAttackComboSequence',
        requiresAttackType: 'ranged',
        requiresWorkflowValidation: true,
        sequence: {
          requiredHits: 2,
          sameTarget: true,
          sameEncounterOrTurnContext: true,
          note: 'Exact combo timing and benefit require the attack-combo workflow to track qualifying ranged hits.'
        },
        summary: 'Stores ranged attack-combo sequence metadata. No attack or damage modifier is applied until a dedicated combo workflow confirms the sequence.'
      }]
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
