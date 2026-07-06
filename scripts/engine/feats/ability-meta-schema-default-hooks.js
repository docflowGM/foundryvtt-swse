import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function isFeatOrTalent(item) {
  return item?.type === 'feat' || item?.type === 'talent';
}

function needsAbilityMetaDefaults(item) {
  if (!isFeatOrTalent(item)) return false;
  const meta = item?.system?.abilityMeta;
  return !meta
    || !Array.isArray(meta.rules)
    || !Array.isArray(meta.modifiers)
    || !Array.isArray(meta.unarmedStyleRules)
    || !Array.isArray(meta.talentSynergySlots);
}

function abilityMetaDefaultPatch(item) {
  const meta = item?.system?.abilityMeta ?? {};
  return {
    'system.abilityMeta': {
      ...meta,
      rules: Array.isArray(meta.rules) ? meta.rules : [],
      modifiers: Array.isArray(meta.modifiers) ? meta.modifiers : [],
      unarmedStyleRules: Array.isArray(meta.unarmedStyleRules) ? meta.unarmedStyleRules : [],
      talentSynergySlots: Array.isArray(meta.talentSynergySlots) ? meta.talentSynergySlots : [],
      mechanicsMode: meta.mechanicsMode ?? '',
      applicationScope: meta.applicationScope ?? '',
      staticSheetPolicy: meta.staticSheetPolicy ?? '',
      requiresRuntimeContext: meta.requiresRuntimeContext ?? false,
      requiresSelectedChoice: meta.requiresSelectedChoice ?? false,
      predicateRequirements: Array.isArray(meta.predicateRequirements) ? meta.predicateRequirements : []
    }
  };
}

function needsWeaponUnarmedStyleDefaults(item) {
  if (item?.type !== 'weapon') return false;
  const system = item?.system ?? {};
  return system.unarmedStyle === undefined || system.attackOptions === undefined;
}

function weaponDefaultPatch(item) {
  const system = item?.system ?? {};
  const attackOptions = system.attackOptions && typeof system.attackOptions === 'object' ? system.attackOptions : {};
  return {
    'system.attackOptions': {
      ...attackOptions,
      noProvokeOpportunity: attackOptions.noProvokeOpportunity ?? false,
      unarmedStyle: attackOptions.unarmedStyle ?? {
        damageAbilityMultipliers: [],
        conditionalDamageDice: [],
        onDamageRiders: [],
        onHitRiders: [],
        onHitMutators: [],
        missRiders: [],
        reactionAttacks: [],
        actionAttacks: [],
        actionMarks: [],
        grappleMutators: [],
        criticalDamageSteps: [],
        alternateDefenseAttacks: [],
        talentSynergies: [],
        all: []
      }
    },
    'system.unarmedStyle': system.unarmedStyle ?? {
      damageAbilityMultipliers: [],
      conditionalDamageDice: [],
      onDamageRiders: [],
      onHitRiders: [],
      onHitMutators: [],
      missRiders: [],
      reactionAttacks: [],
      actionAttacks: [],
      actionMarks: [],
      grappleMutators: [],
      criticalDamageSteps: [],
      alternateDefenseAttacks: [],
      talentSynergies: [],
      all: []
    }
  };
}

async function applyDefaults(item, options = {}) {
  if (options?.swseAbilityMetaSchemaDefaults === true) return false;
  if (!item?.system) return false;

  const patch = {};
  if (needsAbilityMetaDefaults(item)) Object.assign(patch, abilityMetaDefaultPatch(item));
  if (needsWeaponUnarmedStyleDefaults(item)) Object.assign(patch, weaponDefaultPatch(item));
  if (!Object.keys(patch).length) return false;

  try {
    if (item.actor) {
      await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
        source: 'AbilityMetaSchemaDefaults',
        swseAbilityMetaSchemaDefaults: true,
        render: false
      });
    } else {
      await item.update(patch, {
        swseAbilityMetaSchemaDefaults: true,
        render: false
      });
    }
    return true;
  } catch (err) {
    SWSELogger.warn('[AbilityMetaSchemaDefaults] Failed to apply item schema defaults', { itemName: item?.name, itemType: item?.type, error: err });
    return false;
  }
}

export function registerAbilityMetaSchemaDefaultHooks() {
  Hooks.on('createItem', async (item, options) => applyDefaults(item, options));
  Hooks.on('updateItem', async (item, _data, options) => applyDefaults(item, options));
  SWSELogger.log('[AbilityMetaSchemaDefaults] Hooks registered');
}

export default registerAbilityMetaSchemaDefaultHooks;
