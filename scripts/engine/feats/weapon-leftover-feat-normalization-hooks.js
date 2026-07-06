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

function compact(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function selectedChoiceFromItem(item) {
  const system = item?.system ?? {};
  const meta = system.abilityMeta ?? {};
  const choiceMeta = system.choiceMeta ?? {};
  const raw = system.selectedChoice ?? system.selectedChoices ?? choiceMeta.selectedChoice ?? choiceMeta.choice ?? meta.selectedChoice ?? meta.selectedChoices;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (entry && typeof entry === 'object') {
    const value = entry.value ?? entry.id ?? entry.group ?? entry.weapon ?? entry.weaponGroup ?? entry.label ?? entry.name;
    if (String(value ?? '').trim()) return String(value).trim();
  }
  const paren = String(item?.name ?? '').match(/\(([^)]+)\)/);
  return paren?.[1]?.trim() ?? '';
}

function selectedChoicePatch(item) {
  const choice = selectedChoiceFromItem(item);
  if (!choice) return {};
  return {
    'system.selectedChoice': choice,
    'system.choiceMeta.selectedChoice': choice,
    'system.abilityMeta.selectedChoice': choice,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function longHaftStrikeRules() {
  return [
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      id: 'longHaftStrikeTreatAsDoubleWeapon',
      requiresWeaponText: ['lightsaber-pike', 'lightsaberpike', 'long-handle-lightsaber', 'longhandle-lightsaber'],
      property: 'doubleWeapon',
      value: true,
      source: 'Long Haft Strike',
      label: 'Long Haft Strike: treat qualifying hafted lightsaber as a double weapon'
    },
    {
      type: 'WEAPON_PROPERTY_OVERRIDE',
      id: 'longHaftStrikeDualWieldEligible',
      requiresWeaponText: ['lightsaber-pike', 'lightsaberpike', 'long-handle-lightsaber', 'longhandle-lightsaber'],
      property: 'dualWieldEligibleAsDoubleWeapon',
      value: true,
      source: 'Long Haft Strike',
      label: 'Long Haft Strike: qualifying hafted lightsaber is eligible for double-weapon handling'
    }
  ];
}

function returningBugRules() {
  return [{
    type: 'MISS_RIDER',
    id: 'returningBugReturnToHandOnMiss',
    requiresWeaponText: ['razor-bug', 'razorbug', 'thud-bug', 'thudbug'],
    targetEffectsOnMiss: [{
      type: 'return-thrown-weapon-to-hand',
      sourceName: 'Returning Bug',
      weaponFamilies: ['razor-bug', 'thud-bug'],
      manualResolution: false
    }],
    source: 'Returning Bug',
    label: 'Returning Bug: missed razor bug or thud bug returns to hand'
  }];
}

function tripleCritRules(item, sourceName, id) {
  const choice = selectedChoiceFromItem(item);
  return [{
    type: 'WEAPON_CRITICAL_MULTIPLIER_MIN',
    id,
    selectedChoice: Boolean(choice),
    value: 3,
    multiplier: 3,
    minimum: 3,
    source: sourceName,
    label: `${sourceName}: critical multiplier minimum x3`
  }];
}

function rulesForFeat(item) {
  const name = compact(item?.name);
  if (name === 'longhaftstrike') return longHaftStrikeRules();
  if (name === 'returningbug') return returningBugRules();
  if (name === 'triplecrit' || name.startsWith('triplecrit(')) return tripleCritRules(item, 'Triple Crit', 'tripleCritCriticalMultiplierMinimum');
  if (name === 'triplecritspecialist' || name.startsWith('triplecritspecialist(')) return tripleCritRules(item, 'Triple Crit Specialist', 'tripleCritSpecialistCriticalMultiplierMinimum');
  return [];
}

function normalizedRuleIdsForFeat(item) {
  const name = compact(item?.name);
  if (name === 'longhaftstrike') return ['longHaftStrikeTreatAsDoubleWeapon', 'longHaftStrikeDualWieldEligible'];
  if (name === 'returningbug') return ['returningBugReturnToHandOnMiss'];
  if (name === 'triplecrit' || name.startsWith('triplecrit(')) return ['tripleCritCriticalMultiplierMinimum'];
  if (name === 'triplecritspecialist' || name.startsWith('triplecritspecialist(')) return ['tripleCritSpecialistCriticalMultiplierMinimum'];
  return [];
}

function mechanicsModeForFeat(item) {
  const name = compact(item?.name);
  if (name === 'longhaftstrike') return 'weapon_property_override';
  if (name === 'returningbug') return 'weapon_miss_rider';
  if (name.startsWith('triplecrit')) return 'weapon_critical_multiplier_minimum';
  return 'weapon_rule_metadata';
}

async function normalizeWeaponLeftoverFeat(item, options = {}) {
  if (options?.swseWeaponLeftoverNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rulesToAdd = rulesForFeat(item);
  if (!rulesToAdd.length) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, normalizedRuleIdsForFeat(item));
  nextRules.push(...rulesToAdd);

  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'STATE',
    'system.abilityMeta.mechanicsMode': mechanicsModeForFeat(item),
    'system.abilityMeta.applicationScope': 'weapon_attack_resolution',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.rules': nextRules,
    ...selectedChoicePatch(item)
  };

  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'STATE'
    || item.system?.abilityMeta?.mechanicsMode !== mechanicsModeForFeat(item)
    || item.system?.abilityMeta?.applicationScope !== 'weapon_attack_resolution'
    || item.system?.abilityMeta?.staticSheetPolicy !== 'include';
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'WeaponLeftover.normalization',
      swseWeaponLeftoverNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[WeaponLeftoverNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerWeaponLeftoverFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeWeaponLeftoverFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeWeaponLeftoverFeat(item, options));
  SWSELogger.log('[WeaponLeftoverNormalization] Hooks registered');
}

export default registerWeaponLeftoverFeatNormalizationHooks;
