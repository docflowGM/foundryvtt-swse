import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function gunnerySpecialistRules() {
  return [
    {
      type: 'VEHICLE_ROLE_PROFICIENCY_OVERRIDE',
      id: 'gunnerySpecialistVehicleWeaponProficiencyAsGunner',
      requiresVehicleRole: 'gunner',
      grantsProficiency: 'vehicleWeapons',
      weaponCategory: 'vehicleWeapon',
      appliesOnlyWhileInRole: true,
      source: 'Gunnery Specialist',
      label: 'Gunnery Specialist: vehicle weapon proficiency while gunner'
    },
    {
      type: 'ATTACK_REROLL_RESOURCE',
      id: 'gunnerySpecialistVehicleWeaponReroll',
      requiresVehicleRole: 'gunner',
      requiresVehicleWeapon: true,
      timing: 'afterAttackResultBeforeDamage',
      oncePer: 'encounter',
      keep: 'second',
      canDeclareAfterResult: true,
      mustUseBeforeDamageResolved: true,
      featureKey: 'gunnery-specialist-vehicle-weapon-reroll',
      source: 'Gunnery Specialist',
      label: 'Gunnery Specialist: once per encounter vehicle weapon attack reroll'
    }
  ];
}

async function normalizeStarshipVehicleFeat(item, options = {}) {
  if (options?.swseStarshipVehicleFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (normalizeName(item.name) !== 'gunnery specialist') return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, [
    'gunnerySpecialistVehicleWeaponProficiencyAsGunner',
    'gunnerySpecialistVehicleWeaponReroll'
  ]);
  nextRules.push(...gunnerySpecialistRules());

  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'RULE',
    'system.abilityMeta.mechanicsMode': 'vehicle_role_weapon_rule',
    'system.abilityMeta.applicationScope': 'vehicle_gunner_weapon_context',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules
  };

  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'RULE'
    || item.system?.abilityMeta?.mechanicsMode !== 'vehicle_role_weapon_rule'
    || item.system?.abilityMeta?.applicationScope !== 'vehicle_gunner_weapon_context'
    || item.system?.abilityMeta?.requiresRuntimeContext !== true;
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'StarshipVehicleFeatNormalization.normalize',
      swseStarshipVehicleFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[StarshipVehicleFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerStarshipVehicleFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeStarshipVehicleFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeStarshipVehicleFeat(item, options));
  SWSELogger.log('[StarshipVehicleFeatNormalization] Hooks registered');
}

export default registerStarshipVehicleFeatNormalizationHooks;
