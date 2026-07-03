import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasRuleType(item, types = []) {
  const wanted = new Set((Array.isArray(types) ? types : [types]).map(String));
  const rules = item?.system?.abilityMeta?.rules;
  if (!Array.isArray(rules)) return false;
  return rules.some(rule => wanted.has(String(rule?.type ?? '')) && String(rule?.source ?? '').toLowerCase() === 'riflemaster');
}

function riflemasterRules() {
  return [
    {
      type: 'BRACE_AUTOFIRE_ALLOWED',
      requiresWeaponText: ['blaster-carbine'],
      requiresAttackType: 'ranged',
      source: 'Riflemaster',
      label: 'Riflemaster: Blaster Carbine Autofire Brace'
    },
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      property: 'accurate',
      value: true,
      requiresWeaponText: ['blaster-rifle'],
      requiresAttackType: 'ranged',
      source: 'Riflemaster',
      label: 'Riflemaster: Blaster Rifle Accurate'
    },
    {
      type: 'WEAPON_DAMAGE_DIE_SIZE_STEP',
      requiresWeaponText: ['heavy-blaster-rifle'],
      requiresAttackType: 'ranged',
      value: 1,
      source: 'Riflemaster',
      label: 'Riflemaster: Heavy Blaster Rifle d10 to d12'
    },
    {
      type: 'EFFECTIVE_WEAPON_SIZE',
      requiresWeaponText: ['light-repeating-blaster'],
      requiresAttackType: 'ranged',
      size: 'medium',
      source: 'Riflemaster',
      label: 'Riflemaster: Light Repeating Blaster Medium Size'
    }
  ];
}

async function normalizeRiflemaster(item, options = {}) {
  if (options?.swseRiflemasterNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (normalizeName(item.name) !== 'riflemaster') return false;
  if (hasRuleType(item, ['BRACE_AUTOFIRE_ALLOWED', 'WEAPON_PROPERTY_OVERRIDE', 'WEAPON_DAMAGE_DIE_SIZE_STEP', 'EFFECTIVE_WEAPON_SIZE'])) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'passive_rule',
      'system.abilityMeta.rules': riflemasterRules()
    }], {
      source: 'Riflemaster.normalization',
      swseRiflemasterNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[RiflemasterNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerRiflemasterNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeRiflemaster(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeRiflemaster(item, options));
  SWSELogger.log('[RiflemasterNormalization] Hooks registered');
}

export default registerRiflemasterNormalizationHooks;
