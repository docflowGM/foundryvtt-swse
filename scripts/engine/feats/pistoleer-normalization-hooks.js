import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasPistoleerRule(item) {
  const rules = item?.system?.abilityMeta?.rules;
  if (!Array.isArray(rules)) return false;
  return rules.some(rule => String(rule?.source ?? '').toLowerCase() === 'pistoleer');
}

function pistoleerRules() {
  return [
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      property: 'accurate',
      value: true,
      requiresWeaponText: ['blaster-pistol'],
      excludesWeaponText: ['heavy-blaster-pistol', 'hold-out-blaster-pistol'],
      requiresAttackType: 'ranged',
      source: 'Pistoleer',
      label: 'Pistoleer: Blaster Pistol Accurate'
    },
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      property: 'inaccurate',
      value: false,
      requiresWeaponText: ['heavy-blaster-pistol'],
      requiresAttackType: 'ranged',
      source: 'Pistoleer',
      label: 'Pistoleer: Heavy Blaster Pistol Not Inaccurate'
    },
    {
      type: 'WEAPON_ATTACK_BONUS',
      requiresWeaponText: ['hold-out-blaster-pistol'],
      requiresAttackType: 'ranged',
      requiresContextFlags: ['targetNotActedInCombat'],
      value: 2,
      source: 'Pistoleer',
      label: 'Pistoleer: Hold-Out Blaster Opening Shot'
    }
  ];
}

async function normalizePistoleer(item, options = {}) {
  if (options?.swsePistoleerNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (normalizeName(item.name) !== 'pistoleer') return false;
  if (hasPistoleerRule(item)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'passive_rule',
      'system.abilityMeta.rules': pistoleerRules()
    }], {
      source: 'Pistoleer.normalization',
      swsePistoleerNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[PistoleerNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerPistoleerNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizePistoleer(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizePistoleer(item, options));
  SWSELogger.log('[PistoleerNormalization] Hooks registered');
}

export default registerPistoleerNormalizationHooks;
