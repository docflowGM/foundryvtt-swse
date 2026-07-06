import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasSportHunterRules(item) {
  const rules = item?.system?.abilityMeta?.rules;
  if (!Array.isArray(rules)) return false;
  const ids = new Set(rules.map(rule => String(rule?.id ?? rule?.key ?? '')));
  return ids.has('sportHunterSlugthrowerPistolPointBlankDie')
    && ids.has('sportHunterSlugthrowerRifleD8ToD12')
    && ids.has('sportHunterSportingBlasterPistolRerollOnes')
    && ids.has('sportHunterSportingBlasterRifleAimAttackBonus');
}

function sportHunterRules() {
  return [
    {
      type: 'SPORT_HUNTER_WEAPON_MUTATOR',
      id: 'sportHunterSlugthrowerPistolPointBlankDie',
      branch: 'slugthrowerPistol',
      requiresWeaponText: ['slugthrower-pistol', 'slugthrower pistol'],
      requiresAttackType: 'ranged',
      requiresRangeBand: ['point-blank', 'pointblank'],
      requiresProficientWeapon: true,
      damageExtraWeaponDice: 1,
      damageDiceStepBonus: 1,
      source: 'Sport Hunter',
      label: 'Sport Hunter: Slugthrower Pistol Point-Blank Damage Die'
    },
    {
      type: 'SPORT_HUNTER_WEAPON_MUTATOR',
      id: 'sportHunterSlugthrowerRifleD8ToD12',
      branch: 'slugthrowerRifle',
      requiresWeaponText: ['slugthrower-rifle', 'slugthrower rifle'],
      requiresAttackType: 'ranged',
      requiresProficientWeapon: true,
      damageDieStepIncreases: 2,
      source: 'Sport Hunter',
      label: 'Sport Hunter: Slugthrower Rifle d8 to d12'
    },
    {
      type: 'SPORT_HUNTER_WEAPON_MUTATOR',
      id: 'sportHunterSportingBlasterPistolRerollOnes',
      branch: 'sportingBlasterPistol',
      requiresWeaponText: ['sporting-blaster-pistol', 'sporting blaster pistol'],
      requiresAttackType: 'ranged',
      requiresProficientWeapon: true,
      damageDiceReroll: {
        dice: 'weapon',
        rerollResults: [1],
        untilDifferent: true,
        appliesTo: 'damageDiceOnly'
      },
      source: 'Sport Hunter',
      label: 'Sport Hunter: Sporting Blaster Pistol Reroll Damage 1s'
    },
    {
      type: 'SPORT_HUNTER_WEAPON_MUTATOR',
      id: 'sportHunterSportingBlasterRifleAimAttackBonus',
      branch: 'sportingBlasterRifle',
      requiresWeaponText: ['sporting-blaster-rifle', 'sporting blaster rifle'],
      requiresAttackType: 'ranged',
      requiresAim: true,
      requiresProficientWeapon: true,
      attackBonus: 1,
      source: 'Sport Hunter',
      label: 'Sport Hunter: Sporting Blaster Rifle Aim Attack Bonus'
    }
  ];
}

async function normalizeSportHunter(item, options = {}) {
  if (options?.swseSportHunterNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (normalizeName(item.name) !== 'sport hunter') return false;
  if (hasSportHunterRules(item)
    && item.system?.executionModel === 'PASSIVE'
    && item.system?.subType === 'RULE'
    && item.system?.abilityMeta?.mechanicsMode === 'weapon_family_mutator') return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'weapon_family_mutator',
      'system.abilityMeta.applicationScope': 'slugthrower_and_sporting_weapons',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': sportHunterRules()
    }], {
      source: 'SportHunter.normalization',
      swseSportHunterNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[SportHunterNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerSportHunterNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeSportHunter(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeSportHunter(item, options));
  SWSELogger.log('[SportHunterNormalization] Hooks registered');
}

export default registerSportHunterNormalizationHooks;
