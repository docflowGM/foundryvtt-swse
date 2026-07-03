import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasSniperRule(item) {
  const rules = item?.system?.abilityMeta?.rules;
  if (!Array.isArray(rules)) return false;
  return rules.some(rule => String(rule?.source ?? '').toLowerCase() === 'sniper');
}

function sniperRules() {
  return [
    {
      type: 'IGNORE_SOFT_COVER',
      requiresAttackType: 'ranged',
      coverTypes: ['soft', 'creature', 'droid', 'character'],
      source: 'Sniper',
      label: 'Sniper: Ignore Soft Cover'
    }
  ];
}

async function normalizeSniper(item, options = {}) {
  if (options?.swseSniperNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (normalizeName(item.name) !== 'sniper') return false;
  if (hasSniperRule(item)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'passive_rule',
      'system.abilityMeta.rules': sniperRules()
    }], {
      source: 'Sniper.normalization',
      swseSniperNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[SniperNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerSniperNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeSniper(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeSniper(item, options));
  SWSELogger.log('[SniperNormalization] Hooks registered');
}

export default registerSniperNormalizationHooks;
