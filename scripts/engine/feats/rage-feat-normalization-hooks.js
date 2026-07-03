import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getExistingRules(item) {
  return asArray(item?.system?.abilityMeta?.rules);
}

function hasRageRule(item, source) {
  const wanted = normalizeName(source);
  return getExistingRules(item).some(rule => String(rule?.type ?? '').startsWith('RAGE_') && normalizeName(rule?.source ?? '') === wanted);
}

function rageRulesForFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'extra rage') {
    return [{
      type: 'RAGE_USES_BONUS',
      value: 1,
      source: 'Extra Rage',
      label: 'Extra Rage: +1 Rage use per day'
    }];
  }

  if (normalized === 'dreadful rage') {
    return [{
      type: 'RAGE_ATTACK_DAMAGE_BONUS_OVERRIDE',
      value: 5,
      attackBonus: 5,
      damageBonus: 5,
      source: 'Dreadful Rage',
      label: 'Dreadful Rage: +5 Rage attack and damage bonus'
    }];
  }

  if (normalized === 'controlled rage') {
    return [{
      type: 'RAGE_ACTION_MODE',
      activation: 'swift',
      canEndAtWill: true,
      source: 'Controlled Rage',
      label: 'Controlled Rage: Rage can be ended at will'
    }];
  }

  return null;
}

async function normalizeRageFeat(item, options = {}) {
  if (options?.swseRageFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rageRulesForFeat(item.name);
  if (!rules) return false;
  if (hasRageRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'passive_rule',
      'system.abilityMeta.applicationScope': 'rage_engine',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': [
        ...getExistingRules(item),
        ...rules
      ]
    }], {
      source: 'RageFeatNormalization.normalize',
      swseRageFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[RageFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerRageFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeRageFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeRageFeat(item, options));
  SWSELogger.log('[RageFeatNormalization] Hooks registered');
}

export default registerRageFeatNormalizationHooks;
